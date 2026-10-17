const Datos = require('../models/Datos');
const { subirImagen, borrarImagen } = require('../config/cloudinary');

const VALORES_POR_DEFECTO = {
  titulo: 'Objetos con carácter para cada rincón de tu casa',
  subtitulo: 'Piezas simples y prolijas elegidas para durar y acompañar el día a día de tu hogar.',
  mensajes: [
    { titulo: 'Selección cuidada', texto: 'Piezas elegidas por su calidad, textura y terminación.' },
    { titulo: 'Compra directa', texto: 'Armás tu pedido y confirmás directamente por WhatsApp.' },
    { titulo: 'Trato personalizado', texto: 'Te asesoramos personalmente de principio a fin.' },
  ],
  whatsappNumero: '5493516519583',
};

async function obtenerOCrearDatos() {
  let datos = await Datos.findOne();
  if (!datos) datos = await Datos.create(VALORES_POR_DEFECTO);
  return datos;
}

exports.obtener = async (req, res) => {
  try {
    const datos = await obtenerOCrearDatos();
    res.json(datos);
  } catch (err) {
    console.error('Error al obtener datos de la página principal:', err);
    res.status(500).json({ error: 'Error al obtener los datos de la página principal' });
  }
};

exports.actualizar = async (req, res) => {
  let imagenNueva = null;
  try {
    const datos = await obtenerOCrearDatos();

    if (req.body.titulo !== undefined) datos.titulo = req.body.titulo;
    if (req.body.subtitulo !== undefined) datos.subtitulo = req.body.subtitulo;
    if (req.body.whatsappNumero !== undefined) datos.whatsappNumero = req.body.whatsappNumero;
    if (req.body.instagramUrl !== undefined) datos.instagramUrl = req.body.instagramUrl;
    if (req.body.facebookUrl !== undefined) datos.facebookUrl = req.body.facebookUrl;

    if (req.body.mensajes) {
      const mensajes = JSON.parse(req.body.mensajes);
      if (!Array.isArray(mensajes) || mensajes.length === 0) {
        return res.status(400).json({ error: 'Tiene que haber al menos 1 mensaje' });
      }
      datos.mensajes = mensajes;
    }

    const publicIdViejo = datos.imagen && datos.imagen.public_id;
    if (req.file) {
      const img = await subirImagen(req.file.buffer, 'pretta-home-deco/inicio');
      imagenNueva = { url: img.secure_url, public_id: img.public_id };
      datos.imagen = imagenNueva;
    }

    await datos.save();

    if (imagenNueva && publicIdViejo) {
      await borrarImagen(publicIdViejo).catch(() => {});
    }

    res.json(datos);
  } catch (err) {
    if (imagenNueva) await borrarImagen(imagenNueva.public_id).catch(() => {});
    res.status(400).json({ error: err.message });
  }
};
