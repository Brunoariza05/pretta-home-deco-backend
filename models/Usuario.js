const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// esquema para almacenar las credenciales del administrador del panel
const usuarioSchema = new mongoose.Schema({
  usuario: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  rol: { type: String, default: 'dueña' },
}, { timestamps: true });

// método para comparar una contraseña ingresada con la contraseña encriptada guardada en la base
usuarioSchema.methods.compararPassword = function (passwordIngresada) {
  return bcrypt.compare(passwordIngresada, this.passwordHash);
};

module.exports = mongoose.model('Usuario', usuarioSchema);