const mongoose = require('mongoose');
const Venta = require('../models/Venta');
const Producto = require('../models/Producto');

async function procesarItem(item, { descontarStock }) {
  const idProd = item.productoId || item.producto;
  const cant = parseInt(item.cantidad) || 0;
  if (!idProd || !mongoose.Types.ObjectId.isValid(idProd) || cant <= 0) return null;

  const prodBD = await Producto.findById(idProd);
  let nombre, precioEfectivo;

  if (prodBD) {
    if (prodBD.stock < cant) {
      const err = new Error(`Stock insuficiente para "${prodBD.nombre}". Disponible: ${prodBD.stock}, Solicitado: ${cant}`);
      err.status = 400;
      throw err;
    }
    nombre = prodBD.nombre;
    precioEfectivo = (item.precioUnitario !== undefined && item.precioUnitario !== null)
      ? Number(item.precioUnitario)
      : prodBD.precio;

    if (descontarStock) {
      prodBD.stock -= cant;
      await prodBD.save();
    }
  } else {
    nombre = item.nombre || 'Producto eliminado';
    precioEfectivo = (item.precioUnitario !== undefined && item.precioUnitario !== null)
      ? Number(item.precioUnitario)
      : 0;
  }

  const subtotal = precioEfectivo * cant;
  return { producto: idProd, nombre, precioUnitario: precioEfectivo, cantidad: cant, subtotal };
}

exports.listar = async (req, res) => {
  try {
    const ventas = await Venta.find().sort({ createdAt: -1 });
    res.json(ventas);
  } catch (err) {
    console.error('Error al obtener ventas:', err);
    res.status(500).json({ error: 'Error interno al obtener ventas' });
  }
};

exports.crear = async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'La venta debe contener al menos 1 producto' });
    }

    const itemsProcesados = [];
    let totalVenta = 0;

    for (const item of items) {
      const procesado = await procesarItem(item, { descontarStock: true });
      if (!procesado) continue;
      itemsProcesados.push(procesado);
      totalVenta += procesado.subtotal;
    }

    if (itemsProcesados.length === 0) {
      return res.status(400).json({ error: 'Ninguno de los productos enviados posee un ID o cantidad válida' });
    }

    const nuevaVenta = await Venta.create({ items: itemsProcesados, total: totalVenta });
    res.status(201).json(nuevaVenta);
  } catch (err) {
    console.error('Error al procesar la venta:', err);
    res.status(err.status || 500).json({ error: err.message || 'Error interno al procesar la venta' });
  }
};

exports.editar = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID de venta inválido' });
    }

    const ventaExistente = await Venta.findById(req.params.id);
    if (!ventaExistente) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'La venta debe tener al menos 1 producto' });
    }

    for (const item of ventaExistente.items) {
      await Producto.findByIdAndUpdate(item.producto, { $inc: { stock: item.cantidad } });
    }

    const itemsProcesados = [];
    let totalVenta = 0;

    for (const item of items) {
      const procesado = await procesarItem(item, { descontarStock: true });
      if (!procesado) continue;
      itemsProcesados.push(procesado);
      totalVenta += procesado.subtotal;
    }

    if (itemsProcesados.length === 0) {
      return res.status(400).json({ error: 'No se enviaron productos válidos' });
    }

    ventaExistente.items = itemsProcesados;
    ventaExistente.total = totalVenta;
    await ventaExistente.save();

    res.json(ventaExistente);
  } catch (err) {
    console.error('Error al actualizar la venta:', err);
    res.status(err.status || 500).json({ error: err.message || 'Error al modificar la venta' });
  }
};

exports.eliminar = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'El ID de venta no es válido' });
    }

    const venta = await Venta.findByIdAndDelete(req.params.id);
    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    res.json({ mensaje: 'Venta eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar venta:', err);
    res.status(500).json({ error: 'Error interno al eliminar la venta' });
  }
};