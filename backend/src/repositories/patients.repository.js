const db = require('../db');

async function findAll({ unassigned = false } = {}) {
  if (unassigned) {
    const { rows } = await db.query(`
      SELECT p.*
      FROM patients p
      WHERE p.discharged_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM bed_assignments ba
          WHERE ba.patient_id = p.id AND ba.ended_at IS NULL
        )
      ORDER BY p.full_name
    `);
    return rows;
  }
  const { rows } = await db.query(`
    SELECT p.*, ba.bed_id, b.code AS bed_code
    FROM patients p
    LEFT JOIN bed_assignments ba ON ba.patient_id = p.id AND ba.ended_at IS NULL
    LEFT JOIN beds b ON b.id = ba.bed_id
    ORDER BY p.full_name
  `);
  return rows;
}

async function findById(id) {
  const { rows } = await db.query(`
    SELECT p.*, ba.bed_id, b.code AS bed_code, ba.assigned_at
    FROM patients p
    LEFT JOIN bed_assignments ba ON ba.patient_id = p.id AND ba.ended_at IS NULL
    LEFT JOIN beds b ON b.id = ba.bed_id
    WHERE p.id = $1
  `, [id]);
  return rows[0] ?? null;
}

async function insert({ full_name, document_id, birth_date, blood_type }) {
  const { rows } = await db.query(
    `INSERT INTO patients (full_name, document_id, birth_date, blood_type)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [full_name, document_id, birth_date, blood_type ?? null]
  );
  return rows[0];
}

async function update(id, { full_name, document_id, birth_date, blood_type }) {
  const { rows } = await db.query(`
    UPDATE patients
    SET full_name   = COALESCE($1, full_name),
        document_id = COALESCE($2, document_id),
        birth_date  = COALESCE($3, birth_date),
        blood_type  = COALESCE($4, blood_type)
    WHERE id = $5
    RETURNING *
  `, [full_name ?? null, document_id ?? null, birth_date ?? null, blood_type ?? null, id]);
  return rows[0] ?? null;
}

async function discharge(id) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE patients SET discharged_at = NOW()
       WHERE id = $1 AND discharged_at IS NULL
       RETURNING *`,
      [id]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    // Cerrar la asignación activa y saber qué cama(s) quedan libres
    const { rows: freed } = await client.query(
      `UPDATE bed_assignments SET ended_at = NOW()
       WHERE patient_id = $1 AND ended_at IS NULL
       RETURNING bed_id`,
      [id]
    );
    // Apagar el monitoreo de las camas liberadas (ya no hay paciente)
    for (const a of freed) {
      await client.query(
        `UPDATE beds SET auto_simulate = FALSE, status = 'inactive' WHERE id = $1`,
        [a.bed_id]
      );
    }
    await client.query('COMMIT');
    return { patient: rows[0], freedBedIds: freed.map(a => a.bed_id) };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { findAll, findById, insert, update, discharge };
