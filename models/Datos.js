const mongoose = require('mongoose');

// esquema para cada uno de los mensajes de la franja de valores de la página principal
const mensajeSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  texto: { type: String, required: true },
}, { _id: false });

// esquema para guardar la imagen principal de la home junto a su id de cloudinary
const imagenSchema = new mongoose.Schema({
  url: { type: String, required: true },
  public_id: { type: String, required: true }, 
}, { _id: false });

// esquema general que almacena la configuración editable de la página principal
const datosSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  subtitulo: { type: String, required: true },
  imagen: { type: imagenSchema }, 
  mensajes: { type: [mensajeSchema], default: [] },
  whatsappNumero: { type: String, required: true },
  instagramUrl: { type: String },
  facebookUrl: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Datos', datosSchema);