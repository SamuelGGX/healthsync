const audit = require('../repositories/audit.repository');

async function getAll(req, res) {
  try {
    const { action, table_name, user_id, from, to, limit, offset } = req.query;
    const result = await audit.findAll({
      action:     action     || undefined,
      table_name: table_name || undefined,
      user_id:    user_id ? Number(user_id) : undefined,
      from:       from || undefined,
      to:         to   || undefined,
      limit:      limit  ? Math.min(Number(limit), 200) : 50,
      offset:     offset ? Math.max(Number(offset), 0)  : 0,
    });
    res.json(result);
  } catch (err) {
    console.error('[AuditController] getAll:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { getAll };
