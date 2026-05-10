const bedsRepository = require('../repositories/beds.repository');

async function getAll(req, res) {
  try {
    const beds = await bedsRepository.findAllWithLastVital();
    res.json(beds);
  } catch (err) {
    console.error('[BedsController] getAll:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll };
