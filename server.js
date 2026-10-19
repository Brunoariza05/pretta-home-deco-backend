require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const OPCIONES_MONGO = {
  serverSelectionTimeoutMS: 8000, // si en 8 s no encuentra la base, corta con un error limpio (el navegador reintenta)
  socketTimeoutMS: 20000,
  maxPoolSize: 5,
};


let conexion;
async function conectarDB() {
  const estado = mongoose.connection.readyState; // 0 desconectada · 1 conectada · 2 conectando · 3 desconectando
  if (estado === 1) return;
  if (estado === 0 || estado === 3) conexion = null;
  if (!conexion) {
    conexion = mongoose.connect(process.env.MONGO_URI, OPCIONES_MONGO).catch((err) => { conexion = null; throw err; });
  }
  await conexion;
}
app.use(async (req, res, next) => {
  try {
    await conectarDB();
    next();
  } catch (err) {
    console.error('❌ Mongo:', err.message);
    res.status(503).json({ error: 'Base de datos no disponible. Reintentá en unos segundos.' });
  }
});
app.get('/api/salud', (req, res) => {
  res.set('Cache-Control', 'no-store').json({ ok: true, db: mongoose.connection.readyState === 1 });
});
app.use(['/api/productos', '/api/datos'], (req, res, next) => {
  const publico = req.method === 'GET' && !req.headers.authorization && !req.path.startsWith('/admin');
  res.set('Cache-Control', publico ? 'public, s-maxage=30, stale-while-revalidate=120' : 'no-store');
  const jsonOriginal = res.json.bind(res);
  res.json = (cuerpo) => {
    if (res.statusCode >= 400) res.set('Cache-Control', 'no-store');
    return jsonOriginal(cuerpo);
  };
  next();
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