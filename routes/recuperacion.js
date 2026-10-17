const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/recuperacionController');

router.post('/solicitar', ctrl.solicitar);
router.post('/verificar', ctrl.verificar);
router.post('/cambiar', ctrl.cambiar);

module.exports = router;
