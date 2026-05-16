require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const http         = require('http');
const { Server }   = require('socket.io');
const pool         = require('./db');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || '*' },
});

const PORT = process.env.BACKEND_PORT || 3000;

app.use(cors());
app.use(express.json());

app.set('io', io);

app.use('/beds',   require('./routes/beds'));
app.use('/vitals', require('./routes/vitals'));

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

server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
