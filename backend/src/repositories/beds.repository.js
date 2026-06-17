const pool = require('../db');

async function findAllWithLastVital() {
  const { rows } = await pool.query(`
    SELECT
      b.id,
      b.code,
      b.status,
      b.auto_simulate,
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

// Activar/desactivar simulator para UNA cama. También actualiza status:
//   enabled=true  -> status='active'   (el monitor lo refinará según los vitals que lleguen)
//   enabled=false -> status='inactive' (cama apagada intencionalmente)
async function setSimulate(id, enabled) {
  const newStatus = enabled ? 'active' : 'inactive';
  const { rows } = await pool.query(
    `UPDATE beds SET auto_simulate = $1, status = $2 WHERE id = $3
     RETURNING id, code, status, auto_simulate`,
    [enabled, newStatus, id]
  );
  return rows[0] ?? null;
}

async function setSimulateAll(enabled) {
  const newStatus = enabled ? 'active' : 'inactive';
  const { rowCount } = await pool.query(
    `UPDATE beds SET auto_simulate = $1, status = $2`,
    [enabled, newStatus]
  );
  return rowCount;
}

// Pausa o reactiva el simulator SIN cambiar el status de la cama.
// Útil cuando se quiere "detener temporalmente" la generación automática
// (ej: durante un stream manual de 30s) pero la cama sigue conceptualmente
// activa y debe seguir reflejándose como tal en el dashboard.
async function setAutoSimulateOnly(id, enabled) {
  const { rows } = await pool.query(
    `UPDATE beds SET auto_simulate = $1 WHERE id = $2
     RETURNING id, code, status, auto_simulate`,
    [enabled, id]
  );
  return rows[0] ?? null;
}

module.exports = { findAllWithLastVital, setSimulate, setSimulateAll, setAutoSimulateOnly };
