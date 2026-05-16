const bedsRepository = require('../repositories/beds.repository');
const pool = require('../db');
const sensorLogsRepository = require('../repositories/sensor_logs.repository');

async function getAll(req, res) {
  try {
    const beds = await bedsRepository.findAllWithLastVital();
    res.json(beds);
  } catch (err) {
    console.error('[BedsController] getAll:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, disconnect, reconnect };

async function disconnect(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid id' });
  try {
    await pool.query('UPDATE beds SET status=$1, manual_override=true WHERE id=$2', ['disconnected', id]);
    await sensorLogsRepository.insert({ bed_id: id, event: 'disconnected', detail: 'manually disconnected via sender' });
    const io = req.app.get('io');
    if (io) io.emit('bed_status', { bed_id: id, status: 'disconnected' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[BedsController] disconnect:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function reconnect(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid id' });
  try {
    await pool.query('UPDATE beds SET status=$1, manual_override=false WHERE id=$2', ['active', id]);
    await sensorLogsRepository.insert({ bed_id: id, event: 'connected', detail: 'manually reconnected via sender' });
    const io = req.app.get('io');
    if (io) io.emit('bed_status', { bed_id: id, status: 'active' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[BedsController] reconnect:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}
