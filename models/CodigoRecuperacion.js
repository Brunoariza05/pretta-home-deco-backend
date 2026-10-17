const mongoose = require('mongoose');

const codigoRecuperacionSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  codigoHash: { type: String, required: true },
  intentos: { type: Number, default: 0 },
  enviadoEn: { type: Date, required: true }, 
  expira: { type: Date, required: true },
});

codigoRecuperacionSchema.index({ expira: 1 }, { expireAfterSeconds: 0 }); 

module.exports = mongoose.model('CodigoRecuperacion', codigoRecuperacionSchema);
