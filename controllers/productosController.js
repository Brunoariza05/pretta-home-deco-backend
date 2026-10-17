const mongoose = require('mongoose');
const Producto = require('../models/Producto');
const { subirImagen, borrarImagen } = require('../config/cloudinary');

const MAX_IMAGENES = Producto.MAX_IMAGENES; 

const CAMPOS_EDITABLES = ['nombre', 'descripcion', 'precio', 'stock', 'activo'];
const tomarCampos = body => CAMPOS_EDITABLES.reduce((acc, c) => (body[c] !== undefined ? { ...acc, [c]: body[c] } : acc), {});

function mensajeLimiteFotos(actuales) {
  const lugar = MAX_IMAGENES - actuales;
  return lugar <= 0
    ? `Este producto ya tiene ${MAX_IMAGENES} fotos (el máximo). Borrá alguna para poder subir otra.`
    : `Este producto tiene ${actuales} foto${actuales === 1 ? '' : 's'}: solo podés agregar ${lugar} más (máximo ${MAX_IMAGENES}).`;
}

exports.listarPublicos = async (req, res) => {
  try {
    const productos = await Producto.find({ activo: true }).sort({ createdAt: -1 });
    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar productos en MongoDB' });
  }
};

exports.obtenerUno = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID inválido' });
  const prod = await Producto.findOne({ _id: req.params.id, activo: true });
  prod ? res.json(prod) : res.status(404).json({ error: 'Producto no encontrado' });
};

exports.listarTodos = async (req, res) => {
  try {
    const productos = await Producto.find().sort({ nombre: 1 });
    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar productos admin' });
  }
};

exports.crear = async (req, res) => {
  const imagenesSubidas = [];
  try {
    const datos = tomarCampos(req.body);
    const archivos = req.files || [];

    if (archivos.length > MAX_IMAGENES) return res.status(400).json({ error: `Máximo ${MAX_IMAGENES} fotos por producto` });

    for (const file of archivos) {
      const img = await subirImagen(file.buffer);
      imagenesSubidas.push({ url: img.secure_url, public_id: img.public_id, principal: imagenesSubidas.length === 0 });
    }
    if (imagenesSubidas.length > 0) datos.imagenes = imagenesSubidas;

    const nuevoProducto = await Producto.create(datos);
    res.status(201).json(nuevoProducto);
  } catch (err) {
    for (const img of imagenesSubidas) {
      await borrarImagen(img.public_id).catch(() => {});
    }
    res.status(400).json({ error: err.message });
  }
};

exports.editar = async (req, res) => {
  const imagenesSubidas = [];
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID inválido' });
    const prod = await Producto.findById(req.params.id);
    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });

    prod.set(tomarCampos(req.body));

    const archivos = req.files || [];
    if (archivos.length > 0) {
      if (prod.imagenes.length + archivos.length > MAX_IMAGENES) {
        return res.status(400).json({ error: mensajeLimiteFotos(prod.imagenes.length) });
      }
      for (const file of archivos) {
        const img = await subirImagen(file.buffer);
        imagenesSubidas.push({ url: img.secure_url, public_id: img.public_id, principal: false });
      }
      prod.imagenes.push(...imagenesSubidas);
    }

    prod.asegurarPrincipal(); 
    await prod.save();
    res.json(prod);
  } catch (err) {
    for (const img of imagenesSubidas) {
      await borrarImagen(img.public_id).catch(() => {});
    }
    res.status(400).json({ error: err.message });
  }
};

exports.eliminarImagen = async (req, res) => {
  try {
    const { id, imagenId } = req.params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(imagenId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const prod = await Producto.findById(id);
    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });

    const img = prod.imagenes.id(imagenId);
    if (!img) return res.status(404).json({ error: 'La foto no existe' });

    const publicId = img.public_id;
    prod.imagenes.pull({ _id: imagenId });
    prod.asegurarPrincipal();
    await prod.save();

    if (publicId) await borrarImagen(publicId).catch(() => {});

    res.json(prod);
  } catch (err) {
    console.error('Error al borrar foto de producto:', err);
    res.status(500).json({ error: 'Error al borrar la foto' });
  }
};

exports.marcarPrincipal = async (req, res) => {
  try {
    const { id, imagenId } = req.params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(imagenId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const prod = await Producto.findById(id);
    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });

    const elegida = prod.imagenes.id(imagenId);
    if (!elegida) return res.status(404).json({ error: 'La foto no existe' });

    prod.imagenes.forEach((img) => { img.principal = (img === elegida); });
    await prod.save();
    res.json(prod);
  } catch (err) {
    console.error('Error al marcar foto principal:', err);
    res.status(500).json({ error: 'Error al marcar la foto principal' });
  }
};

exports.eliminar = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }

    const prodEliminado = await Producto.findByIdAndDelete(req.params.id);
    if (!prodEliminado) {
      return res.status(404).json({ error: 'El producto no existe' });
    }

    res.json({ mensaje: 'Producto eliminado permanentemente de la base de datos' });
  } catch (err) {
    console.error('Error al eliminar producto:', err);
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
};
