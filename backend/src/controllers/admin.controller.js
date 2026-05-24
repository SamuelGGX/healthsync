const adminRepository = require('../repositories/admin.repository');

async function getSlowQueries(req, res) {
  try {
    const rows = await adminRepository.getSlowQueries();
    res.json(rows);
  } catch (err) {
    console.error('[AdminController] getSlowQueries:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function resetStats(req, res) {
  try {
    await adminRepository.resetStats();
    res.json({ ok: true });
  } catch (err) {
    console.error('[AdminController] resetStats:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getSlowQueries, resetStats };
