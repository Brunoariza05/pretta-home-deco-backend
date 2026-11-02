const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/recuperacionController');

// rutas públicas para el flujo de recuperación de contraseña por correo
router.post('/solicitar', ctrl.solicitar);
router.post('/verificar', ctrl.verificar);
router.post('/cambiar', ctrl.cambiar);

module.exports = router;