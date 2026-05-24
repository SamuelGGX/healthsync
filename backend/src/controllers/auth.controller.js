const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const users  = require('../repositories/users.repository');

async function login(req, res) {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  try {
    const user = await users.findByEmail(String(email).toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const match = await bcrypt.compare(String(password), user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('[AuthController] login:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { login };
