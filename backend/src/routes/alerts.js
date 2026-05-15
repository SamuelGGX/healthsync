const express = require('express');
const router  = express.Router();
const alertsController = require('../controllers/alerts.controller');

router.get('/', alertsController.getAll);

module.exports = router;
