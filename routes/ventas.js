const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/auth');
const ctrl = require('../controllers/ventasController');

// rutas protegidas para gestionar el registro, listado, edición y eliminación de ventas
router.get('/', verificarToken, ctrl.listar);
router.post('/', verificarToken, ctrl.crear);
router.put('/:id', verificarToken, ctrl.editar);
router.delete('/:id', verificarToken, ctrl.eliminar);

module.exports = router;