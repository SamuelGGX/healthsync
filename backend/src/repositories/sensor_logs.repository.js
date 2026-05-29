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

// Lista de logs de sensores con filtros opcionales, búsqueda y paginación.
async function findAll({ event, bed_id, from, to, search, limit = 50, offset = 0 } = {}) {
  const conditions = [];
  const params     = [];
  let i = 1;

  if (event)  { conditions.push(`s.event = $${i++}`);        params.push(event); }
  if (bed_id) { conditions.push(`s.bed_id = $${i++}`);       params.push(bed_id); }
  if (from)   { conditions.push(`s.occurred_at >= $${i++}`); params.push(from); }
  if (to)     { conditions.push(`s.occurred_at <= $${i++}`); params.push(to); }
  if (search) {
    conditions.push(`(b.code ILIKE $${i} OR s.detail ILIKE $${i})`);
    params.push(`%${search}%`);
    i++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT s.id, s.bed_id, b.code AS bed_code, s.event, s.detail, s.occurred_at
     FROM sensor_logs s
     LEFT JOIN beds b ON b.id = s.bed_id
     ${where}
     ORDER BY s.occurred_at DESC
     LIMIT $${i++} OFFSET $${i++}`,
    [...params, limit, offset]
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM sensor_logs s
     LEFT JOIN beds b ON b.id = s.bed_id
     ${where}`,
    params
  );

  return { rows, total: countRows[0].total };
}

module.exports = { insert, findAll };
