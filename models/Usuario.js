const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const usuarioSchema = new mongoose.Schema({
  usuario: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  rol: { type: String, default: 'dueña' },
}, { timestamps: true });

usuarioSchema.methods.compararPassword = function (passwordIngresada) {
  return bcrypt.compare(passwordIngresada, this.passwordHash);
};

module.exports = mongoose.model('Usuario', usuarioSchema);