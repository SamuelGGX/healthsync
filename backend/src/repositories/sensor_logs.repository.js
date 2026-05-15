const pool = require('../db');

async function insert({ bed_id, event, detail }) {
  const { rows } = await pool.query(
    `INSERT INTO sensor_logs (bed_id, event, detail)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [bed_id, event, detail ?? null]
  );
  return rows[0];
}

module.exports = { insert };
