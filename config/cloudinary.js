const { v2: cloudinary } = require('cloudinary');

// configuramos la conexión con cloudinary usando las credenciales del archivo .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// función para subir una foto a la nube y devolver el resultado
function subirImagen(buffer, folder = 'pretta-home-deco') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: 'image' }, (err, res) => {
      if (err) return reject(new Error(`Cloudinary: ${err.message}`));
      resolve(res);
    });
    stream.end(buffer);
  });
}

// función para borrar una foto de la nube usando su id único
function borrarImagen(publicId) {
  if (!publicId) return Promise.resolve();
  return cloudinary.uploader.destroy(publicId).catch((err) => {
    throw new Error(`Cloudinary: ${err.message}`);
  });
}

module.exports = { cloudinary, subirImagen, borrarImagen };