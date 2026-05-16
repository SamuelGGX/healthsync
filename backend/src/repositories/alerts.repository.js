const pool = require('../db');

async function insert({ bed_id, type, message, value }) {
  const { rows } = await pool.query(
    `INSERT INTO alerts (bed_id, type, message, value)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [bed_id, type, message ?? null, value ?? null]
  );
  return rows[0];
}

module.exports = { insert };
