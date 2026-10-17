const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Usuario = require('../models/Usuario');

exports.login = async (req, res) => {
  try {
    const { usuario, password } = req.body;
    const user = await Usuario.findOne({ usuario });
    if (!user || !(await user.compararPassword(password))) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { id: user._id, usuario: user.usuario, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.cambiarPassword = async (req, res) => {
  try {
    const { passwordActual, nuevaPassword } = req.body;
    if (!passwordActual || !nuevaPassword) {
      return res.status(400).json({ error: 'Faltan datos' });
    }
    if (nuevaPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const user = await Usuario.findById(req.usuario.id);
    if (!user || !(await user.compararPassword(passwordActual))) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    user.passwordHash = await bcrypt.hash(nuevaPassword, 10);
    await user.save();

    res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};