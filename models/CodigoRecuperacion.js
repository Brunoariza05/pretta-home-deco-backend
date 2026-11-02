const mongoose = require('mongoose');

// esquema para guardar temporalmente los códigos de recuperación de contraseña por correo
const codigoRecuperacionSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  codigoHash: { type: String, required: true },
  intentos: { type: Number, default: 0 },
  enviadoEn: { type: Date, required: true }, 
  expira: { type: Date, required: true },
});

// índice para que mongodb borre el documento automáticamente una vez que el código expire
codigoRecuperacionSchema.index({ expira: 1 }, { expireAfterSeconds: 0 }); 

module.exports = mongoose.model('CodigoRecuperacion', codigoRecuperacionSchema);