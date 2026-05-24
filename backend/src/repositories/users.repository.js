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
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
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

module.exports = { findByEmail, findById, insert, updateRefreshToken };
