const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const CodigoRecuperacion = require('../models/CodigoRecuperacion');
const { enviarCodigoRecuperacion } = require('../config/mailer');

const VIDA_CODIGO_MS = 10 * 60 * 1000;   
const ESPERA_REENVIO_MS = 60 * 1000;    
const MAX_INTENTOS = 5;                  

const normalizar = (e) => String(e || '').trim().toLowerCase();
const emailsPermitidos = () => (process.env.RECUPERACION_EMAILS || '').split(',').map(normalizar).filter(Boolean);
const secretoReset = () => `${process.env.JWT_SECRET}:reset-clave`;

exports.solicitar = async (req, res) => {
  const MENSAJE = 'Si el correo está autorizado, te enviamos un código. Revisá tu bandeja de entrada (y el spam).';
  const email = normalizar(req.body.email);
  try {
    if (!email) return res.status(400).json({ error: 'Ingresá un correo' });
    if (!emailsPermitidos().includes(email)) return res.json({ mensaje: MENSAJE });

    const previo = await CodigoRecuperacion.findOne({ email });
    if (previo && Date.now() - previo.enviadoEn.getTime() < ESPERA_REENVIO_MS) {
      return res.json({ mensaje: MENSAJE });
    }

    const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    await CodigoRecuperacion.findOneAndUpdate(
      { email },
      { codigoHash: await bcrypt.hash(codigo, 10), intentos: 0, enviadoEn: new Date(), expira: new Date(Date.now() + VIDA_CODIGO_MS) },
      { upsert: true }
    );

    try {
      await enviarCodigoRecuperacion(email, codigo);
    } catch (errMail) {
      await CodigoRecuperacion.deleteOne({ email }); 
      throw errMail;
    }
    res.json({ mensaje: MENSAJE });
  } catch (err) {
    console.error('Error al enviar código de recuperación:', err.message);
    res.status(500).json({ error: 'No pudimos enviar el correo. Probá de nuevo en unos minutos.' });
  }
};

exports.verificar = async (req, res) => {
  try {
    const email = normalizar(req.body.email);
    const codigo = String(req.body.codigo || '').trim();
    if (!email || !/^\d{6}$/.test(codigo)) return res.status(400).json({ error: 'Ingresá el código de 6 números' });

    const reg = await CodigoRecuperacion.findOneAndUpdate(
      { email, expira: { $gt: new Date() } },
      { $inc: { intentos: 1 } },
      { new: true }
    );
    if (!reg) return res.status(400).json({ error: 'El código venció o no existe. Pedí uno nuevo.' });

    if (reg.intentos > MAX_INTENTOS) {
      await CodigoRecuperacion.deleteOne({ email });
      return res.status(400).json({ error: 'Demasiados intentos. Pedí un código nuevo.' });
    }

    if (!(await bcrypt.compare(codigo, reg.codigoHash))) {
      const quedan = MAX_INTENTOS - reg.intentos;
      return res.status(400).json({ error: `Código incorrecto. Te quedan ${quedan} intento${quedan === 1 ? '' : 's'}.` });
    }

    await CodigoRecuperacion.deleteOne({ email });
    const resetToken = jwt.sign({ proposito: 'reset-clave', email }, secretoReset(), { expiresIn: '10m' });
    res.json({ resetToken });
  } catch (err) {
    console.error('Error al verificar código:', err.message);
    res.status(500).json({ error: 'Ocurrió un error. Probá de nuevo.' });
  }
};

exports.cambiar = async (req, res) => {
  try {
    const { resetToken, nuevaPassword } = req.body;
    if (typeof nuevaPassword !== 'string' || nuevaPassword.length < 6) {
      return res.status(400).json({ error: 'La clave nueva debe tener al menos 6 caracteres' });
    }

    let datos;
    try {
      datos = jwt.verify(String(resetToken || ''), secretoReset());
    } catch {
      return res.status(401).json({ error: 'El permiso para cambiar la clave venció. Empezá de nuevo.' });
    }
    if (datos.proposito !== 'reset-clave') return res.status(401).json({ error: 'Permiso inválido. Empezá de nuevo.' });

    const usuario = (await Usuario.findOne({ rol: 'dueña' })) || (await Usuario.findOne());
    if (!usuario) return res.status(404).json({ error: 'No se encontró el usuario del panel' });

    usuario.passwordHash = await bcrypt.hash(nuevaPassword, 10);
    await usuario.save();
    res.json({ mensaje: 'Clave actualizada. Ya podés ingresar.' });
  } catch (err) {
    console.error('Error al cambiar la clave:', err.message);
    res.status(500).json({ error: 'No pudimos cambiar la clave. Probá de nuevo.' });
  }
};
