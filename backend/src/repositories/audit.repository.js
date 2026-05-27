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

// Lista de auditoría con filtros opcionales y paginación.
async function findAll({ action, table_name, user_id, from, to, limit = 50, offset = 0 } = {}) {
  const conditions = [];
  const params     = [];
  let i = 1;

  if (action)     { conditions.push(`a.action = $${i++}`);       params.push(action); }
  if (table_name) { conditions.push(`a.table_name = $${i++}`);   params.push(table_name); }
  if (user_id)    { conditions.push(`a.user_id = $${i++}`);      params.push(user_id); }
  if (from)       { conditions.push(`a.occurred_at >= $${i++}`); params.push(from); }
  if (to)         { conditions.push(`a.occurred_at <= $${i++}`); params.push(to); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT a.id, a.user_id, u.name AS user_name, u.email AS user_email, u.role AS user_role,
            a.action, a.table_name, a.record_id, a.old_value, a.new_value, a.occurred_at
     FROM audit_log a
     LEFT JOIN users u ON u.id = a.user_id
     ${where}
     ORDER BY a.occurred_at DESC
     LIMIT $${i++} OFFSET $${i++}`,
    [...params, limit, offset]
  );

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*)::int AS total FROM audit_log a ${where}`,
    params
  );

  return { rows, total: countRows[0].total };
}

module.exports = { log, findAll };
