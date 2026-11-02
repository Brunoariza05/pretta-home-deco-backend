const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/auth');
const ctrl = require('../controllers/authController');

// ruta para iniciar sesión y obtener el token de acceso
router.post('/login', ctrl.login);

// ruta protegida para cambiar la contraseña del administrador
router.put('/cambiar-password', verificarToken, ctrl.cambiarPassword);

module.exports = router;