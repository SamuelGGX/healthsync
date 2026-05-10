const express = require('express');
const router = express.Router();
const vitalsController = require('../controllers/vitals.controller');

router.post('/', vitalsController.create);

module.exports = router;
