const bcrypt = require('bcryptjs');
const users  = require('../repositories/users.repository');

module.exports = async function verifyPassword(req, res, next) {
  const { password } = req.body ?? {};
  if (!password) {
    return res.status(400).json({ error: 'Contraseña requerida' });
  }
  try {
    const user = await users.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });

    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) return res.status(403).json({ error: 'Contraseña incorrecta' });

    next();
  } catch (err) {
    console.error('[verifyPassword]', err.message);
    return res.status(500).json({ error: 'Error interno' });
  }
};
