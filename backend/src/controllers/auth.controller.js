const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const users  = require('../repositories/users.repository');

const ACCESS_TOKEN_EXPIRY  = '30m';
const REFRESH_TOKEN_EXPIRY = '12h';

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

async function login(req, res) {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  try {
    const user = await users.findByEmail(String(email).toLowerCase().trim());
    if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const match = await bcrypt.compare(String(password), user.password_hash);
    if (!match) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // Guardar el refresh en la BD para poder revocarlo en /logout
    await users.updateRefreshToken(user.id, refreshToken);

    return res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('[AuthController] login:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function refresh(req, res) {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token requerido' });
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Refresh token inválido o expirado' });
  }

  if (payload.type !== 'refresh') {
    return res.status(401).json({ error: 'Token no es de refresh' });
  }

  try {
    const user = await users.findById(payload.id);
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });

    // El refresh debe coincidir con el guardado en BD
    // (si el usuario hizo logout, el guardado es null y esto falla)
    if (user.refresh_token !== refreshToken) {
      return res.status(401).json({ error: 'Refresh token revocado' });
    }

    const accessToken = signAccessToken(user);
    return res.json({ accessToken });
  } catch (err) {
    console.error('[AuthController] refresh:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function logout(req, res) {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) return res.status(204).end();

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
  } catch {
    return res.status(204).end();
  }

  try {
    if (payload?.type === 'refresh' && payload.id) {
      await users.updateRefreshToken(payload.id, null);
    }
    return res.status(204).end();
  } catch (err) {
    console.error('[AuthController] logout:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { login, refresh, logout };
