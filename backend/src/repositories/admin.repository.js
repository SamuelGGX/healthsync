const pool = require('../db');

async function getSlowQueries() {
  const { rows } = await pool.query(`
    SELECT
      query,
      calls,
      round(mean_exec_time::numeric, 2)  AS mean_ms,
      round(max_exec_time::numeric,  2)  AS max_ms,
      round(total_exec_time::numeric, 2) AS total_ms,
      rows
    FROM pg_stat_statements
    ORDER BY mean_exec_time DESC
    LIMIT 20
  `);
  return rows;
}

async function resetStats() {
  await pool.query('SELECT pg_stat_statements_reset()');
}

module.exports = { getSlowQueries, resetStats };
