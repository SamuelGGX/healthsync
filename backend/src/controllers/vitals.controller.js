const vitalsRepository = require('../repositories/vitals.repository');

async function create(req, res) {
  const { bed_id, bpm, spo2, temperature } = req.body;

  if (!bed_id) {
    return res.status(400).json({ error: 'bed_id is required' });
  }

  try {
    const vital = await vitalsRepository.insert({ bed_id, bpm, spo2, temperature });
    res.status(201).json(vital);
  } catch (err) {
    console.error('[VitalsController] create:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { create };
