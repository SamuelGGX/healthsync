const db = require('../db');

// Registro de auditoría. Es best-effort: si falla, lo logueamos pero NO
// rompemos la acción principal (no queremos que un fallo de auditoría
// impida asignar una cama o dar de alta a un paciente).
async function log({ user_id, action, table_name, record_id = null, old_value = null, new_value = null }) {
  try {
    await db.query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user_id,
        action,
        table_name,
        record_id != null ? String(record_id) : null,
        old_value  != null ? JSON.stringify(old_value) : null,
        new_value  != null ? JSON.stringify(new_value) : null,
      ]
    );
  } catch (err) {
    console.error('[audit] log failed:', err.message);
  }
}

module.exports = { log };
