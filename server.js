require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

let conexion;
app.use(async (req, res, next) => {
  try { conexion = conexion || mongoose.connect(process.env.MONGO_URI); await conexion; next(); }
  catch (err) { conexion = null; console.error(err); res.status(500).json({ error: 'Error de conexión a la base de datos' }); }
});
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/ventas', require('./routes/ventas'));
app.use('/api/datos', require('./routes/datos'));
app.use('/api/recuperacion', require('./routes/recuperacion'));

app.use((err, req, res, next) => {
  const status = err.name === 'MulterError' ? 400 : err.status || 500;
  res.status(status).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Conectado a MongoDB Atlas');
    app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));
  })
  .catch(err => console.error('❌ Error de conexión:', err));

module.exports = app;
if (require.main === module) app.listen(3000, () => console.log('🚀 http://localhost:3000'));