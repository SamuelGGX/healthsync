const db = require('../db');

async function findActiveBed(bed_id) {
  const { rows } = await db.query(
    `SELECT 1 FROM bed_assignments WHERE bed_id = $1 AND ended_at IS NULL LIMIT 1`,
    [bed_id]
  );
  return rows.length > 0;
}

async function insert({ bed_id, patient_id, assigned_user_id }) {
  const { rows } = await db.query(
    `INSERT INTO bed_assignments (bed_id, patient_id, assigned_user_id)
     VALUES ($1, $2, $3) RETURNING *`,
    [bed_id, patient_id, assigned_user_id]
  );

  await db.query(
    `UPDATE beds SET auto_simulate = TRUE, status = 'active' WHERE id = $1`,
    [bed_id]
  );
  return rows[0];
}

async function end(id) {
  const { rows } = await db.query(
    `UPDATE bed_assignments SET ended_at = NOW()
     WHERE id = $1 AND ended_at IS NULL
     RETURNING *`,
    [id]
  );
  if (rows[0]) {
    // Cama liberada -> apagar monitoreo
    await db.query(
      `UPDATE beds SET auto_simulate = FALSE, status = 'inactive' WHERE id = $1`,
      [rows[0].bed_id]
    );
  }
  return rows[0] ?? null;
}

module.exports = { findActiveBed, insert, end };
