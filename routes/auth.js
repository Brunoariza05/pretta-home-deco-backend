const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/auth');
const ctrl = require('../controllers/authController');

router.post('/login', ctrl.login);
router.put('/cambiar-password', verificarToken, ctrl.cambiarPassword);

module.exports = router;