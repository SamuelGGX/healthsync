const pool = require('../db');
const sensorLogs = require('../repositories/sensor_logs.repository');

const CHECK_INTERVAL_MS    = 2000;
const STALE_THRESHOLD_MS   = 10000;
const RECONNECT_GRACE_MS   = 15000;
const DB_RECOVERY_GRACE_MS = 30000;

const recentlyReconnected = new Map();

function notifyReconnect(bedId) {
  recentlyReconnected.set(bedId, Date.now());
}

function startStaleMonitor(io) {
  let intervalId    = null;
  let running       = false;
  let lastFailureAt = null;

  async function checkStaleBeds() {
    if (running) return;
    running = true;

    try {
      const { rows } = await pool.query(`
        SELECT b.id, b.status, b.auto_simulate, MAX(v.recorded_at) AS last_reading
        FROM beds b
        LEFT JOIN vitals v ON v.bed_id = b.id
        GROUP BY b.id, b.status, b.auto_simulate
      `);

      if (lastFailureAt !== null && Date.now() - lastFailureAt < DB_RECOVERY_GRACE_MS) {
        console.log('[stale-monitor] BD recovery grace: skip transitions');
        return;
      }
      lastFailureAt = null;

      const now = Date.now();

      for (const r of rows) {
        const bedId        = r.id;
        const dbStatus     = r.status;
        const autoSimulate = r.auto_simulate;
        const last         = r.last_reading ? new Date(r.last_reading).getTime() : null;
        const isStale      = !last || (now - last > STALE_THRESHOLD_MS);

        const recReconnectAt = recentlyReconnected.get(bedId);
        if (recReconnectAt) {
          if (now - recReconnectAt < RECONNECT_GRACE_MS) continue;
          recentlyReconnected.delete(bedId);
        }

        if (isStale) {
          if (dbStatus !== 'active') continue;

          const newStatus = autoSimulate ? 'disconnected' : 'inactive';

          await pool.query('UPDATE beds SET status=$1 WHERE id=$2', [newStatus, bedId]);

          if (autoSimulate) {
            console.log(`[stale-monitor] bed ${bedId} marked DISCONNECTED (last: ${r.last_reading ?? 'never'})`);
            await sensorLogs.insert({
              bed_id: bedId,
              event:  'disconnected',
              detail: `no data since ${r.last_reading ?? 'never'}`,
            });
          } else {
            console.log(`[stale-monitor] bed ${bedId} marked INACTIVE`);
          }

          io.emit('bed_status', { bed_id: bedId, status: newStatus });
        } else {
          // Auto-reconnect: si la cama está desconectada pero auto_simulate=TRUE
          // y le está llegando data fresca, vuelve a 'active' sola.
          // Para Desconectar manual: el botón también pone auto_simulate=FALSE,
          // así que esas camas no se auto-reconectan.
          // Para 'inactive': no auto-reconectamos (es un apagado explícito).
          if (dbStatus === 'disconnected' && autoSimulate) {
            console.log(`[stale-monitor] bed ${bedId} auto-reconnected (data flowing)`);
            await pool.query('UPDATE beds SET status=$1 WHERE id=$2', ['active', bedId]);
            io.emit('bed_status', { bed_id: bedId, status: 'active' });
          }
        }
      }
    } catch (err) {
      lastFailureAt = Date.now();
      console.error('[stale-beds-monitor] check error:', err.message);
    } finally {
      running = false;
    }
  }

  intervalId = setInterval(checkStaleBeds, CHECK_INTERVAL_MS);
  checkStaleBeds().catch(err => console.error(err));

  return {
    stop: () => {
      if (intervalId) clearInterval(intervalId);
    },
  };
}

module.exports = { startStaleMonitor, notifyReconnect };
