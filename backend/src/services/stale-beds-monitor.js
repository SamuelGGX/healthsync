const pool = require('../db');
const sensorLogs = require('../repositories/sensor_logs.repository');

const CHECK_INTERVAL_MS = 2000;   // revisar cada 2s
const STALE_THRESHOLD_MS = 10000; // sin datos en 10s -> caído

function startStaleMonitor(io) {
  let intervalId = null;

  async function checkStaleBeds() {
    try {
      const { rows } = await pool.query(`
        SELECT b.id, b.status, MAX(v.recorded_at) AS last_reading
        FROM beds b
        LEFT JOIN vitals v ON v.bed_id = b.id
        GROUP BY b.id, b.status
      `);

      const now = Date.now();
      for (const r of rows) {
        const bedId = r.id;
        const dbStatus = r.status;
        const last = r.last_reading ? new Date(r.last_reading).getTime() : null;

        // marcar desconectado solo si hubo al menos una lectura antes
        if (last && now - last > STALE_THRESHOLD_MS) {
          if (dbStatus !== 'disconnected') {
            console.log(`[stale-monitor] bed ${bedId} marked disconnected (last: ${r.last_reading})`);
            await pool.query('UPDATE beds SET status=$1 WHERE id=$2', ['disconnected', bedId]);
            await sensorLogs.insert({ bed_id: bedId, event: 'disconnected', detail: `no data since ${r.last_reading}` });
            io.emit('bed_status', { bed_id: bedId, status: 'disconnected' });
          } else {
            // already disconnected; skip
          }
        } else if (dbStatus === 'disconnected' && last && now - last <= STALE_THRESHOLD_MS) {
          // reconexión: marcar active en la BD y notificar
          console.log(`[stale-monitor] bed ${bedId} reconnected (last: ${r.last_reading})`);
          await pool.query('UPDATE beds SET status=$1 WHERE id=$2', ['active', bedId]);
          io.emit('bed_status', { bed_id: bedId, status: 'active' });
        }
      }
    } catch (err) {
      console.error('[stale-beds-monitor] check error', err);
    }
  }

  // arrancar
  intervalId = setInterval(checkStaleBeds, CHECK_INTERVAL_MS);
  // ejecutar inmediatamente la primera vez
  checkStaleBeds().catch(err => console.error(err));

  return {
    stop: () => {
      if (intervalId) clearInterval(intervalId);
    }
  };
}

module.exports = { startStaleMonitor };
