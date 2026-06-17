const bcrypt = require('bcryptjs');
const users  = require('../repositories/users.repository');
const audit  = require('../repositories/audit.repository');

const VALID_ROLES = ['admin', 'medico', 'enfermero'];
const COST        = 10;

async function createUser(req, res) {
  const { name, email, password, role } = req.body ?? {};

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  try {
    const passwordHash = await bcrypt.hash(String(password), COST);
    const user = await users.insert({
      name:  String(name).trim(),
      email: String(email).toLowerCase().trim(),
      passwordHash,
      role,
    });
    await audit.log({
      user_id:    req.user.id,
      action:     'CREATE',
      table_name: 'users',
      record_id:  user.id,
      new_value:  { name: user.name, email: user.email, role: user.role },
    });
    return res.status(201).json(user);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    console.error('[UsersController] createUser:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function getAll(req, res) {
  const { role } = req.query;
  if (role && !['medico', 'enfermero'].includes(role)) {
    return res.status(400).json({ error: 'role debe ser medico o enfermero' });
  }
  try {
    const rows = await users.findAll({ role });
    res.json(rows);
  } catch (err) {
    console.error('[UsersController] getAll:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function updateUser(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id inválido' });
  }
  const { name, email, role } = req.body ?? {};
  if (role && !['medico', 'enfermero'].includes(role)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }
  try {
    const old = await users.findById(id);
    if (!old) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (old.role === 'admin') return res.status(403).json({ error: 'No se puede editar un admin' });

    const updated = await users.update(id, {
      name:  name  ? String(name).trim()               : undefined,
      email: email ? String(email).toLowerCase().trim() : undefined,
      role,
    });
    await audit.log({
      user_id:    req.user.id,
      action:     'UPDATE',
      table_name: 'users',
      record_id:  id,
      old_value:  { name: old.name, email: old.email, role: old.role },
      new_value:  { name: updated.name, email: updated.email, role: updated.role },
    });
    res.json(updated);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    console.error('[UsersController] updateUser:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function removeUser(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id inválido' });
  }
  try {
    const existing = await users.findById(id);
    if (!existing) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (existing.role === 'admin') return res.status(403).json({ error: 'No se puede eliminar un admin' });

    await users.remove(id);
    await audit.log({
      user_id:    req.user.id,
      action:     'DELETE',
      table_name: 'users',
      record_id:  id,
      old_value:  { name: existing.name, email: existing.email, role: existing.role },
    });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'No se puede eliminar: el usuario tiene registros asociados' });
    }
    console.error('[UsersController] removeUser:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { createUser, getAll, updateUser, removeUser };
