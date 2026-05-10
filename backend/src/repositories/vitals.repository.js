const pool = require('../db');

async function insert({ bed_id, bpm, spo2, temperature }) {
  const { rows } = await pool.query(
    `INSERT INTO vitals (bed_id, bpm, spo2, temperature)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [bed_id, bpm ?? null, spo2 ?? null, temperature ?? null]
  );
  return rows[0];
}

module.exports = { insert };
