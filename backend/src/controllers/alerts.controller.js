const alertsRepository = require('../repositories/alerts.repository');

async function getAll(req, res) {
  try {
    const alerts = await alertsRepository.findAll({ limit: 200 });
    res.json(alerts);
  } catch (err) {
    console.error('[AlertsController] getAll:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll };
