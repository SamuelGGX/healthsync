const express = require('express');
const router = express.Router();
const bedsController = require('../controllers/beds.controller');

router.get('/', bedsController.getAll);
router.put('/simulate-all',         bedsController.setSimulateAll);
router.put('/:id/simulate',         bedsController.setSimulate);
router.put('/:id/simulator-pause',  bedsController.pauseSimulator);
router.post('/:id/disconnect',      bedsController.disconnect);
router.post('/:id/reconnect',       bedsController.reconnect);

module.exports = router;
