const mongoose = require('mongoose');

const mensajeSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  texto: { type: String, required: true },
}, { _id: false });

const imagenSchema = new mongoose.Schema({
  url: { type: String, required: true },
  public_id: { type: String, required: true }, 
}, { _id: false });

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
