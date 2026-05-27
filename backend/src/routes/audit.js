const express     = require('express');
const router      = express.Router();
const requireRole = require('../middleware/requireRole');
const ctrl        = require('../controllers/audit.controller');

router.get('/', requireRole('admin'), ctrl.getAll);

module.exports = router;
