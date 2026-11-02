const multer = require('multer');

// configura multer para almacenar temporalmente los archivos en memoria, limitar el peso a 5 mb y aceptar solo imágenes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

module.exports = upload;