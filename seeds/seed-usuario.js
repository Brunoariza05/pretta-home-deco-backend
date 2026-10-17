require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Usuario = require('../models/Usuario');

async function crearUsuario() {
  await mongoose.connect(process.env.MONGO_URI);

  const usuarioExistente = await Usuario.findOne({ usuario: 'estefania' });
  if (usuarioExistente) {
    console.log('⚠️ Ese usuario ya existe, no se creó de nuevo.');
    return mongoose.disconnect();
  }

  const passwordHash = await bcrypt.hash('-', 10);

  const nuevoUsuario = new Usuario({
    usuario: 'estefania',
    passwordHash,
    rol: 'dueña',
  });

  await nuevoUsuario.save();
  console.log('✅ Usuario creado con éxito');
  mongoose.disconnect();
}

crearUsuario();