const vitalsRepository = require('../repositories/vitals.repository');
const alertsRepository = require('../repositories/alerts.repository');
const sensorLogsRepo   = require('../repositories/sensor_logs.repository');
const anomaly          = require('../services/anomaly');
const { getIO }        = require('../io');

async function create(req, res) {
  const { bed_id, bpm, spo2, temperature } = req.body;

  if (!bed_id) {
    return res.status(400).json({ error: 'bed_id is required' });
  }

  if (anomaly.isInvalidTemperature(temperature)) {
    sensorLogsRepo.insert({ bed_id, event: 'invalid_value', detail: `temperature: ${temperature}` }).catch(() => {});
    return res.status(422).json({ error: 'Temperature value is physically impossible' });
  }

  try {
    const vital = await vitalsRepository.insert({ bed_id, bpm, spo2, temperature });
    const io    = getIO();

    const detected = anomaly.detect(vital);
    if (detected) {
      alertsRepository.insert({ bed_id, ...detected }).catch(() => {});
      if (io) io.emit('alert', { ...vital, alert_type: detected.type, message: detected.message });
    } else {
      if (io) io.emit('vital', vital);
    }

    res.status(201).json(vital);
  } catch (err) {
    console.error('[VitalsController] create:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { create };
