const express   = require('express');
const rateLimit = require('express-rate-limit');
const { login } = require('../controllers/auth.controller');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs:      15 * 60 * 1000,
  max:           10,
  message:       { error: 'Demasiados intentos. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

router.post('/login', loginLimiter, login);

module.exports = router;
