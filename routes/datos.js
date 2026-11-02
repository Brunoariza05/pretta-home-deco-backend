const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/auth');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/datosController');

// ruta pública para obtener la configuración y datos generales de la tienda
router.get('/', ctrl.obtener);

// ruta protegida para actualizar la configuración de la home y subir una nueva imagen de portada
router.put('/', verificarToken, upload.single('imagen'), ctrl.actualizar);

module.exports = router;