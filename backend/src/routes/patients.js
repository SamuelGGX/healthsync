const express        = require('express');
const router         = express.Router();
const requireRole    = require('../middleware/requireRole');
const verifyPassword = require('../middleware/verifyPassword');
const ctrl           = require('../controllers/patients.controller');

router.get('/',              ctrl.getAll);
router.get('/:id',           ctrl.getOne);
router.post('/',             requireRole('admin', 'medico'), ctrl.create);
router.put('/:id',           requireRole('admin', 'medico'), verifyPassword, ctrl.update);
router.put('/:id/discharge', requireRole('medico'),          verifyPassword, ctrl.discharge);

module.exports = router;
