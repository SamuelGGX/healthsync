const express       = require('express');
const auth          = require('../middleware/auth');
const requireRole   = require('../middleware/requireRole');
const { createUser } = require('../controllers/users.controller');

const router = express.Router();

router.post('/', auth, requireRole('admin'), createUser);

module.exports = router;
