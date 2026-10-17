const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/auth');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/datosController');

router.get('/', ctrl.obtener);
router.put('/', verificarToken, upload.single('imagen'), ctrl.actualizar);

module.exports = router;
