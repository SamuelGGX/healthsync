require('dotenv').config();
const http   = require('http');
const express = require('express');
const cors    = require('cors');
const pool    = require('./db');
const { init: initIO } = require('./io');

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.BACKEND_PORT || 3000;

initIO(server);

app.use(cors());
app.use(express.json());

app.use('/beds',   require('./routes/beds'));
app.use('/vitals', require('./routes/vitals'));
app.use('/alerts', require('./routes/alerts'));

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', db: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
