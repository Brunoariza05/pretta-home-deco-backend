const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/auth');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/productosController');

// rutas públicas y protegidas para listar y consultar productos
router.get('/', ctrl.listarPublicos);
router.get('/admin/todos', verificarToken, ctrl.listarTodos);
router.get('/:id', ctrl.obtenerUno);

// rutas protegidas para crear, editar y eliminar productos con carga de hasta 5 imágenes
router.post('/', verificarToken, upload.array('imagenes', 5), ctrl.crear);
router.put('/:id', verificarToken, upload.array('imagenes', 5), ctrl.editar);
router.delete('/:id', verificarToken, ctrl.eliminar);

// rutas protegidas para gestionar imágenes específicas de un producto
router.delete('/:id/imagenes/:imagenId', verificarToken, ctrl.eliminarImagen);
router.put('/:id/imagenes/:imagenId/principal', verificarToken, ctrl.marcarPrincipal);

module.exports = router;