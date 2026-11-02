const mongoose = require('mongoose');

// esquema para cada producto individual que forma parte de una venta (patrón snapshot)
const itemVentaSchema = new mongoose.Schema({
  producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  nombre: { type: String, required: true },
  precioUnitario: { type: Number, required: true },
  cantidad: { type: Number, required: true, min: 1 },
  subtotal: { type: Number, required: true }
});

// esquema principal que agrupa los ítems comprados, el total y la fecha de la venta
const ventaSchema = new mongoose.Schema({
  items: [itemVentaSchema],
  total: { type: Number, required: true, min: 0 }
}, { timestamps: true });

const Contador = require('./Contador');

ventaSchema.add({ numero: { type: Number, unique: true, sparse: true } });

// middleware que se ejecuta antes de guardar para asignarle un número de ticket correlativo y único a la venta
ventaSchema.pre('save', async function () {
  if (!this.isNew || this.numero) return;
  const c = await Contador.findOneAndUpdate({ _id: 'ventas' }, { $inc: { valor: 1 } }, { new: true, upsert: true });
  this.numero = c.valor;
});

module.exports = mongoose.model('Venta', ventaSchema);