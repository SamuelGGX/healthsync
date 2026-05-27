const adminRepository = require('../repositories/admin.repository');
const audit           = require('../repositories/audit.repository');

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

async function getPingdomChecks(req, res) {
  const apiKey = process.env.PINGDOM_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'PINGDOM_API_KEY not configured' });
  }
  try {
    const start    = Date.now();
    const response = await fetch('https://api.pingdom.com/api/3.1/checks', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data     = await response.json();
    const latency  = Date.now() - start;

    if (!response.ok) {
      const msg = data?.error?.errormessage || 'Pingdom API error';
      return res.status(response.status).json({ error: msg });
    }
    res.json({ checks: data.checks || [], latency_ms: latency });
  } catch (err) {
    console.error('[AdminController] getPingdomChecks:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function getPingdomUptime(req, res) {
  const apiKey = process.env.PINGDOM_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'PINGDOM_API_KEY not configured' });
  const { checkId } = req.params;
  const from = Math.floor(Date.now() / 1000) - 30 * 24 * 3600; // últimos 30 días
  try {
    const response = await fetch(
      `https://api.pingdom.com/api/3.1/summary.average/${checkId}?from=${from}&includeuptime=true`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.errormessage || 'Pingdom API error');

    const status      = data.summary?.status || {};
    const totalup     = status.totalup     || 0;
    const totaldown   = status.totaldown   || 0;
    const totalunknown= status.totalunknown|| 0;
    const total       = totalup + totaldown + totalunknown;
    const uptime_pct  = total > 0 ? ((totalup / total) * 100).toFixed(3) : null;

    res.json({
      uptime_pct,
      avg_response_ms: data.summary?.responsetime?.avgresponse ?? null,
      totalup,
      totaldown,
    });
  } catch (err) {
    console.error('[AdminController] getPingdomUptime:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function getPingdomOutages(req, res) {
  const apiKey = process.env.PINGDOM_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'PINGDOM_API_KEY not configured' });
  const { checkId } = req.params;
  try {
    const response = await fetch(
      `https://api.pingdom.com/api/3.1/summary.outage/${checkId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.errormessage || 'Pingdom API error');

    const outages = (data.summary?.states || [])
      .filter(s => s.status === 'down' || s.status === 'unknown')
      .sort((a, b) => b.timefrom - a.timefrom)
      .slice(0, 20);

    res.json({ outages });
  } catch (err) {
    console.error('[AdminController] getPingdomOutages:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function getAuditLogs(req, res) {
  const { action, table_name, user_id, from, to, limit = 50, offset = 0 } = req.query;
  try {
    const result = await audit.findAll({
      action,
      table_name,
      user_id: user_id ? Number(user_id) : undefined,
      from,
      to,
      limit:  Math.min(Number(limit)  || 50, 200),
      offset: Number(offset) || 0,
    });
    res.json(result);
  } catch (err) {
    console.error('[AdminController] getAuditLogs:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getSlowQueries,
  resetStats,
  getPingdomChecks,
  getPingdomUptime,
  getPingdomOutages,
  getAuditLogs,
};
