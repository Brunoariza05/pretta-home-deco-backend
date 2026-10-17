require('dotenv').config();
const mongoose = require('mongoose');
const Producto = require('../models/Producto');

const productos = [
  {
    nombre: 'Boul',
    descripcion: 'Bol multiuso con tapa, ideal para conservar y organizar alimentos en la cocina.',
    precio: 15000,
    stock: 20,
    imagenUrl: '/uploads/boul.jpg',
  },
  {
    nombre: 'Escurridor',
    descripcion: 'Escurridor de platos y utensilios, resistente y de fácil limpieza, ideal para la mesada.',
    precio: 20000,
    stock: 15,
    imagenUrl: '/uploads/escurridor.jpg',
  },
  {
    nombre: 'Especiero',
    descripcion: 'Especiero organizador para condimentos, mantiene tus especias ordenadas y a mano.',
    precio: 12000,
    stock: 10,
    imagenUrl: '/uploads/especiero.jpg',
  },
  {
    nombre: 'Huevero',
    descripcion: 'Huevero decorativo para guardar y exhibir los huevos de forma prolija en la heladera o mesada.',
    precio: 9000,
    stock: 30,
    imagenUrl: '/uploads/huevero.jpg',
  },
  {
    nombre: 'Laundry',
    descripcion: 'Guarda ropa sucia, práctico y prolijo para mantener el lavadero organizado.',
    precio: 25000,
    stock: 13,
    imagenUrl: '/uploads/laundry.jpg',
  },
];

async function cargarProductos() {
  await mongoose.connect(process.env.MONGO_URI);

  for (const p of productos) {
    const existe = await Producto.findOne({ nombre: p.nombre });
    if (existe) {
      console.log(`⚠️ "${p.nombre}" ya existe, se salteó.`);
      continue;
    }
    await Producto.create(p);
    console.log(`✅ "${p.nombre}" cargado.`);
  }

  mongoose.disconnect();
}

cargarProductos();