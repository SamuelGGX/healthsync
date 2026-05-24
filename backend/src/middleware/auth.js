const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === process.env.SIMULATOR_API_KEY) {
    req.user = { role: 'simulator' };
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Solo se aceptan access tokens. Un refresh token no puede usarse
    // para acceder a endpoints normales aunque sea válido por firma.
    if (payload.type && payload.type !== 'access') {
      return res.status(401).json({ error: 'Tipo de token inválido' });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
