const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const vitalsController = require('../controllers/vitals.controller');

// Limitar POST /vitals para proteger contra ráfagas extremas
const vitalsLimiter = rateLimit({
	windowMs: 1000, // 1 segundo
	max: 200,       // máximo 200 requests por ventana por IP
	standardHeaders: true,
	legacyHeaders: false,
	handler: (req, res) => {
		res.status(429).json({ error: 'Too many requests - slow down' });
	}
});

router.post('/', vitalsLimiter, vitalsController.create);

module.exports = router;
