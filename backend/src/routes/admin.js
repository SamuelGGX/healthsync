const express         = require('express');
const router          = express.Router();
const adminController = require('../controllers/admin.controller');
const requireRole     = require('../middleware/requireRole');

router.get('/slow-queries',        requireRole('admin'), adminController.getSlowQueries);
router.post('/slow-queries/reset', requireRole('admin'), adminController.resetStats);

router.get('/pingdom/checks',           requireRole('admin'), adminController.getPingdomChecks);
router.get('/pingdom/uptime/:checkId',  requireRole('admin'), adminController.getPingdomUptime);
router.get('/pingdom/outages/:checkId', requireRole('admin'), adminController.getPingdomOutages);

router.get('/audit-logs', requireRole('admin'), adminController.getAuditLogs);

module.exports = router;
