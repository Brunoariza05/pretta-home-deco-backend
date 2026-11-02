const mongoose = require('mongoose');

// esquema auxiliar para llevar la numeración correlativa de las ventas (ej: v-0001)
const contadorSchema = new mongoose.Schema({ _id: String, valor: { type: Number, default: 0 } });

module.exports = mongoose.model('Contador', contadorSchema);