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

const Contador = require('./Contador');

ventaSchema.add({ numero: { type: Number, unique: true, sparse: true } });

ventaSchema.pre('save', async function () {
  if (!this.isNew || this.numero) return;
  const c = await Contador.findOneAndUpdate({ _id: 'ventas' }, { $inc: { valor: 1 } }, { new: true, upsert: true });
  this.numero = c.valor;
});

module.exports = mongoose.model('Venta', ventaSchema);