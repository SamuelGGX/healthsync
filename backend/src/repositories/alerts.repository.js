const pool = require('../db');

async function insert({ bed_id, type, message, value }) {
  const { rows } = await pool.query(
    `INSERT INTO alerts (bed_id, type, message, value) VALUES ($1, $2, $3, $4) RETURNING *`,
    [bed_id, type, message, value ?? null]
  );
  return rows[0];
}

async function findAll({ limit = 100 } = {}) {
  const { rows } = await pool.query(
    `SELECT a.id, a.type, a.message, a.value, a.status, a.triggered_at,
            b.code AS bed_code
     FROM alerts a
     JOIN beds b ON b.id = a.bed_id
     ORDER BY a.triggered_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

module.exports = { insert, findAll };
