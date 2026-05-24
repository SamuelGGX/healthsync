const express        = require('express');
const router         = express.Router();
const adminController = require('../controllers/admin.controller');
const requireRole    = require('../middleware/requireRole');

router.get('/slow-queries',       requireRole('admin'), adminController.getSlowQueries);
router.post('/slow-queries/reset', requireRole('admin'), adminController.resetStats);

module.exports = router;
