const bcrypt = require('bcryptjs');
const users  = require('../repositories/users.repository');

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
    return res.status(201).json(user);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    console.error('[UsersController] createUser:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { createUser };
