// Migra las imágenes que están en public/uploads a Cloudinary y actualiza cada producto.
// Se corre UNA sola vez, desde la raíz del proyecto:  node seed-imagenes.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Producto = require('../models/Producto');
const { cloudinary } = require('../config/cloudinary');

// Los errores de Cloudinary a veces son objetos y no "Error", así que los mostramos con cuidado
function textoError(err) {
  return err && err.message ? err.message : JSON.stringify(err);
}

async function migrar() {
  await mongoose.connect(process.env.MONGO_URI);

  // Solo los productos cuya imagen todavía apunta a /uploads/...
  const productos = await Producto.find({ imagenUrl: /^\/uploads\// });
  console.log(`Productos con imagen local: ${productos.length}`);

  for (const p of productos) {
    const ruta = path.join(__dirname, 'public', p.imagenUrl);
    if (!fs.existsSync(ruta)) {
      console.log(`⚠️ "${p.nombre}": no encontré el archivo ${ruta}, se salteó.`);
      continue;
    }
    try {
      const resultado = await cloudinary.uploader.upload(ruta, { folder: 'pretta-home-deco' });
      p.imagenUrl = resultado.secure_url;
      p.imagenPublicId = resultado.public_id;
      await p.save();
      console.log(`✅ "${p.nombre}" subido a Cloudinary.`);
    } catch (err) {
      console.log(`❌ "${p.nombre}": ${textoError(err)}`);
    }
  }
}

migrar()
  .catch((err) => console.error('❌ Error general:', textoError(err)))
  .finally(() => mongoose.disconnect());
