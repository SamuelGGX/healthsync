const pool = require('../db');

async function findAllWithLastVital() {
  const { rows } = await pool.query(`
    SELECT
      b.id,
      b.code,
      b.status,
      v.bpm,
      v.spo2,
      v.temperature,
      v.recorded_at AS last_reading
    FROM beds b
    LEFT JOIN LATERAL (
      SELECT bpm, spo2, temperature, recorded_at
      FROM vitals
      WHERE bed_id = b.id
      ORDER BY recorded_at DESC
      LIMIT 1
    ) v ON true
    ORDER BY b.id
  `);
  return rows;
}

module.exports = { findAllWithLastVital };
