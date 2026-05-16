const vitalsRepository     = require('../repositories/vitals.repository');
const alertsRepository     = require('../repositories/alerts.repository');
const sensorLogsRepository = require('../repositories/sensor_logs.repository');
const pool                = require('../db');
const { validatePhysicalRange, detectAnomalies } = require('../services/anomaly');

function parseNumeric(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return NaN;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

async function create(req, res) {
  const { bed_id, bpm, spo2, temperature } = req.body ?? {};

  const bedIdNum = parseNumeric(bed_id);
  if (!Number.isInteger(bedIdNum) || bedIdNum <= 0) {
    return res.status(400).json({ error: 'bed_id is required and must be a positive integer' });
  }

  const parsedBpm  = parseNumeric(bpm);
  const parsedSpo2 = parseNumeric(spo2);
  const parsedTemp = parseNumeric(temperature);

  if (Number.isNaN(parsedBpm) || Number.isNaN(parsedSpo2) || Number.isNaN(parsedTemp)) {
    return res.status(400).json({ error: 'bpm, spo2 and temperature must be numbers' });
  }

  const vital = {
    bed_id:      bedIdNum,
    bpm:         parsedBpm,
    spo2:        parsedSpo2,
    temperature: parsedTemp,
  };

  const rangeCheck = validatePhysicalRange(vital);
  if (!rangeCheck.valid) {
    try {
      await sensorLogsRepository.insert({
        bed_id: bedIdNum,
        event:  'invalid_value',
        detail: rangeCheck.reason,
      });
    } catch (logErr) {
      console.error('[VitalsController] sensor_log insert failed:', logErr.message);
    }
    return res.status(422).json({
      error:  'Vital out of physical range',
      detail: rangeCheck.reason,
    });
  }

  const io = req.app.get('io');

  try {
    // if the bed was manually disconnected, ignore emitting updates for it
    const { rows: bedRows } = await pool.query('SELECT manual_override FROM beds WHERE id = $1', [bedIdNum]);
    const manualOverride = bedRows[0]?.manual_override ?? false;

    const inserted  = await vitalsRepository.insert(vital);

    if (manualOverride) {
      try {
        await sensorLogsRepository.insert({ bed_id: bedIdNum, event: 'timeout', detail: 'vital ignored due to manual override' });
      } catch (logErr) {
        console.error('[VitalsController] sensor_log insert failed (override):', logErr.message);
      }
      // do not emit websocket events or create alerts while manual override is enabled
      return res.status(201).json({ vital: inserted, ignored: true, reason: 'manual_override' });
    }
    const anomalies = detectAnomalies(vital);

    io.emit('vital', {
      bed_id:      bedIdNum,
      bpm:         parsedBpm,
      spo2:        parsedSpo2,
      temperature: parsedTemp,
      recorded_at: inserted.recorded_at,
      is_anomaly:  anomalies.length > 0,
    });

    const createdAlerts = [];
    for (const anomaly of anomalies) {
      try {
        const alert = await alertsRepository.insert({
          bed_id:  bedIdNum,
          type:    anomaly.type,
          message: anomaly.message,
          value:   anomaly.value,
        });
        createdAlerts.push(alert);
        io.emit('alert', {
          id:           alert.id,
          bed_id:       alert.bed_id,
          type:         alert.type,
          message:      alert.message,
          value:        alert.value,
          status:       alert.status,
          triggered_at: alert.triggered_at,
        });
      } catch (alertErr) {
        console.error('[VitalsController] alert insert failed:', alertErr.message);
      }
    }

    return res.status(201).json({ vital: inserted, alerts: createdAlerts });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'bed_id does not exist' });
    }
    console.error('[VitalsController] create:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { create };
