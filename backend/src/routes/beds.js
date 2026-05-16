const express = require('express');
const router = express.Router();
const bedsController = require('../controllers/beds.controller');

router.get('/', bedsController.getAll);
router.post('/:id/disconnect', bedsController.disconnect);
router.post('/:id/reconnect', bedsController.reconnect);

module.exports = router;
