const pool = require('../db');

async function findAllWithLastVital() {
  const { rows } = await pool.query(`
    SELECT
      b.id,
      b.code,
      b.status,
      b.manual_override,
      p.full_name   AS patient_name,
      p.blood_type  AS patient_blood_type,
      v.bpm,
      v.spo2,
      v.temperature,
      v.recorded_at AS last_reading
    FROM beds b
    LEFT JOIN LATERAL (
      SELECT patient_id
      FROM bed_assignments
      WHERE bed_id = b.id AND ended_at IS NULL
      ORDER BY assigned_at DESC
      LIMIT 1
    ) ba ON true
    LEFT JOIN patients p ON p.id = ba.patient_id
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
