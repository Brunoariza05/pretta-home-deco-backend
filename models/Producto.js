const mongoose = require('mongoose');

const MAX_IMAGENES = 5;

// esquema para guardar las fotos asociadas a un producto y saber cuál es la principal
const imagenSchema = new mongoose.Schema({
  url: { type: String, required: true },
  public_id: { type: String, required: true }, 
  principal: { type: Boolean, default: false },
});

// esquema principal que define la estructura y validaciones de los productos del catálogo
const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, index: true },
  descripcion: { type: String, required: true },
  precio: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, default: 0, min: 0 },
  imagenes: {
    type: [imagenSchema],
    default: [],
    validate: {
      validator: (arr) => arr.length <= MAX_IMAGENES,
      message: `Máximo ${MAX_IMAGENES} fotos por producto`,
    },
  },
  activo: { type: Boolean, default: true, index: true },
}, { timestamps: true });

productoSchema.statics.MAX_IMAGENES = MAX_IMAGENES;

// método para asegurar que siempre haya una foto marcada como principal (por defecto la primera)
productoSchema.methods.asegurarPrincipal = function () {
  if (this.imagenes.length === 0) return;
  const elegida = this.imagenes.find((img) => img.principal) || this.imagenes[0];
  this.imagenes.forEach((img) => { img.principal = (img === elegida); });
};

module.exports = mongoose.model('Producto', productoSchema);