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
      v.recorded_at         AS last_reading,
      p.full_name           AS patient_name,
      p.blood_type          AS patient_blood_type,
      p.document_id         AS patient_document
    FROM beds b
    LEFT JOIN LATERAL (
      SELECT bpm, spo2, temperature, recorded_at
      FROM vitals
      WHERE bed_id = b.id
      ORDER BY recorded_at DESC
      LIMIT 1
    ) v ON true
    LEFT JOIN bed_assignments ba ON ba.bed_id = b.id AND ba.ended_at IS NULL
    LEFT JOIN patients p ON p.id = ba.patient_id
    ORDER BY b.id
  `);
  return rows;
}

module.exports = { findAllWithLastVital };
