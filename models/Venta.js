const mongoose = require('mongoose');

const itemVentaSchema = new mongoose.Schema({
  producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  nombre: { type: String, required: true },
  precioUnitario: { type: Number, required: true },
  cantidad: { type: Number, required: true, min: 1 },
  subtotal: { type: Number, required: true }
});

const ventaSchema = new mongoose.Schema({
  items: [itemVentaSchema],
  total: { type: Number, required: true, min: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Venta', ventaSchema);