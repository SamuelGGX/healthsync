const express     = require('express');
const router      = express.Router();
const requireRole = require('../middleware/requireRole');
const ctrl        = require('../controllers/bed-assignments.controller');

router.post('/',       requireRole('admin', 'medico', 'enfermero'), ctrl.assign);
router.put('/:id/end', requireRole('admin', 'medico'),              ctrl.end);

module.exports = router;
