const express = require('express');
const router = express.Router();
const bedsController = require('../controllers/beds.controller');

router.get('/', bedsController.getAll);

module.exports = router;
