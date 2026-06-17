const db = require('../db');

async function findByEmail(email) {
  const { rows } = await db.query(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
    [email]
  );
  return rows[0] ?? null;
}

async function findById(id) {
  const { rows } = await db.query(
    'SELECT id, name, email, password_hash, role, refresh_token FROM users WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

async function insert({ name, email, passwordHash, role }) {
  const { rows } = await db.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
    [name, email, passwordHash, role]
  );
  return rows[0];
}

async function updateRefreshToken(id, refreshToken) {
  await db.query(
    'UPDATE users SET refresh_token = $1 WHERE id = $2',
    [refreshToken, id]
  );
}

async function findAll({ role } = {}) {
  const conditions = ["role != 'admin'"];
  const params     = [];
  if (role) { conditions.push(`role = $${params.length + 1}`); params.push(role); }
  const { rows } = await db.query(
    `SELECT id, name, email, role, created_at FROM users WHERE ${conditions.join(' AND ')} ORDER BY role, name`,
    params
  );
  return rows;
}

async function update(id, { name, email, role }) {
  const fields = [];
  const params = [];
  if (name  != null) { fields.push(`name  = $${params.length + 1}`); params.push(name); }
  if (email != null) { fields.push(`email = $${params.length + 1}`); params.push(email); }
  if (role  != null) { fields.push(`role  = $${params.length + 1}`); params.push(role); }
  if (!fields.length) return null;
  params.push(id);
  const { rows } = await db.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING id, name, email, role, created_at`,
    params
  );
  return rows[0] ?? null;
}

async function remove(id) {
  const { rows } = await db.query(
    'DELETE FROM users WHERE id = $1 RETURNING id, name, email, role',
    [id]
  );
  return rows[0] ?? null;
}

module.exports = { findByEmail, findById, findAll, insert, update, remove, updateRefreshToken };
