const express                                   = require('express');
const auth                                      = require('../middleware/auth');
const requireRole                               = require('../middleware/requireRole');
const { createUser, getAll, updateUser, removeUser } = require('../controllers/users.controller');

const router = express.Router();

router.get('/',      auth, requireRole('admin'), getAll);
router.post('/',     auth, requireRole('admin'), createUser);
router.put('/:id',   auth, requireRole('admin'), updateUser);
router.delete('/:id',auth, requireRole('admin'), removeUser);

module.exports = router;
