require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const http         = require('http');
const jwt          = require('jsonwebtoken');
const { Server }   = require('socket.io');
const pool         = require('./db');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || '*' },
});
let staleMonitor = null;

const PORT = process.env.BACKEND_PORT || 3000;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.set('io', io);


io.use((socket, next) => {
  const apiKey = socket.handshake.auth?.apiKey || socket.handshake.headers['x-api-key'];
  if (apiKey && apiKey === process.env.SIMULATOR_API_KEY) {
    socket.data.user = { role: 'simulator' };
    return next();
  }

  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No autorizado'));
  try {
    socket.data.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Token inválido o expirado'));
  }
});

const auth = require('./middleware/auth');

app.use('/auth',            require('./routes/auth'));
app.use('/users',           require('./routes/users'));
app.use('/beds',            auth, require('./routes/beds'));
app.use('/vitals',          auth, require('./routes/vitals'));
app.use('/admin',           auth, require('./routes/admin'));
app.use('/patients',        auth, require('./routes/patients'));
app.use('/bed-assignments', auth, require('./routes/bed-assignments'));
app.use('/audit',           auth, require('./routes/audit'));

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', db: err.message });
  }
});

io.on('connection', (socket) => {
  console.log(`[WS] client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[WS] client disconnected: ${socket.id}`);
  });
});

const { startStaleMonitor } = require('./services/stale-beds-monitor');
const db = require('./db');

async function startServer() {
  try {
    await db.waitForConnection(12, 2000);
  } catch (err) {
    console.error('[startup] DB not available:', err.message);
    // continuar arrancando, las rutas ya manejan errores de BD
  }

  // arrancar el monitor de camas desconectadas
  staleMonitor = startStaleMonitor(io);

  server.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
  });

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();

function shutdown() {
  console.log('Shutdown received, stopping stale monitor...');
  try {
    staleMonitor?.stop();
  } catch (e) {
    // ignore
  }
  process.exit(0);
}
