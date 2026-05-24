const bedsRepository       = require('../repositories/beds.repository');
const sensorLogsRepository = require('../repositories/sensor_logs.repository');
const pool                 = require('../db');
const { notifyReconnect } = require('../services/stale-beds-monitor');

async function getAll(req, res) {
  try {
    const beds = await bedsRepository.findAllWithLastVital();
    res.json(beds);
  } catch (err) {
    console.error('[BedsController] getAll:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function setSimulate(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'invalid id' });
  }
  const { enabled } = req.body ?? {};
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled must be a boolean' });
  }
  try {
    const result = await bedsRepository.setSimulate(id, enabled);
    if (!result) return res.status(404).json({ error: 'bed not found' });

    // Si activamos la cama, damos gracia al stale-monitor para que no la
    // marque 'disconnected' antes de que el simulator empiece a mandar.
    if (enabled) notifyReconnect(id);

    const io = req.app.get('io');
    if (io) io.emit('bed_status', { bed_id: id, status: result.status });

    res.json(result);
  } catch (err) {
    console.error('[BedsController] setSimulate:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Pausa o reactiva el simulator SIN tocar el status (ej: durante un stream
// manual de 30s desde /sender). Así el dashboard sigue viendo la cama activa.
async function pauseSimulator(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'invalid id' });
  }
  const { paused } = req.body ?? {};
  if (typeof paused !== 'boolean') {
    return res.status(400).json({ error: 'paused must be a boolean' });
  }
  try {
    // paused=true  -> auto_simulate=false (simulator no manda)
    // paused=false -> auto_simulate=true  (simulator vuelve)
    const result = await bedsRepository.setAutoSimulateOnly(id, !paused);
    if (!result) return res.status(404).json({ error: 'bed not found' });

    res.json(result);
  } catch (err) {
    console.error('[BedsController] pauseSimulator:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function setSimulateAll(req, res) {
  const { enabled } = req.body ?? {};
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled must be a boolean' });
  }
  try {
    const updated = await bedsRepository.setSimulateAll(enabled);

    const io = req.app.get('io');
    if (io) io.emit('bed_status_bulk', { status: enabled ? 'active' : 'inactive' });

    res.json({ updated });
  } catch (err) {
    console.error('[BedsController] setSimulateAll:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Simula una FALLA DE SENSOR (algo le pasó al sensor, no es un apagado intencional).
// El bed sigue habilitado (auto_simulate NO cambia), pero el simulator dejará de mandar
// porque también filtra por status='active'.
async function disconnect(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'invalid id' });
  }
  try {
    // Desconectar manual = simular falla. También apagamos auto_simulate
    // para que el simulator deje de mandar (si no, el monitor auto-reconectaría
    // la cama en cuanto llegara el siguiente vital).
    const { rows } = await pool.query(
      `UPDATE beds SET status='disconnected', auto_simulate=FALSE WHERE id=$1
       RETURNING id, code, status, auto_simulate`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'bed not found' });

    await sensorLogsRepository.insert({
      bed_id: id,
      event:  'disconnected',
      detail: 'manually triggered from /sender (simulated sensor failure)',
    });

    const io = req.app.get('io');
    if (io) io.emit('bed_status', { bed_id: id, status: 'disconnected' });

    res.json(rows[0]);
  } catch (err) {
    console.error('[BedsController] disconnect:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Restaura la operación normal: status='active'. auto_simulate también se sube a TRUE
// por comodidad (lo más probable es que el usuario quiera que vuelva a recibir datos).
async function reconnect(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'invalid id' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE beds SET status='active', auto_simulate=TRUE WHERE id=$1
       RETURNING id, code, status, auto_simulate`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'bed not found' });

    await sensorLogsRepository.insert({
      bed_id: id,
      event:  'connected',
      detail: 'manually reconnected from /sender',
    });

    // Pedir al stale-monitor que ignore esta cama unos segundos para que no la
    // marque otra vez como disconnected antes de que llegue el primer vital.
    notifyReconnect(id);

    const io = req.app.get('io');
    if (io) io.emit('bed_status', { bed_id: id, status: 'active' });

    res.json(rows[0]);
  } catch (err) {
    console.error('[BedsController] reconnect:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, setSimulate, setSimulateAll, pauseSimulator, disconnect, reconnect };
