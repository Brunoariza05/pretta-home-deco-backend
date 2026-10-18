const CONFIG = {
  API_URL: (['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://localhost:3000' : '') + '/api',
  WHATSAPP_NUMERO: '5493516519583',
  INSTAGRAM_URL: 'https://instagram.com/prettahomedeco',
  FACEBOOK_URL: 'https://facebook.com/prettahomedeco',
};

const CLAVE_CARRITO = 'pretta_carrito';
let productosCargados = [];

function obtenerCarrito() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_CARRITO));
    return Array.isArray(datos) ? datos : [];
  } catch {
    return [];
  }
}

function guardarCarrito(items) {
  localStorage.setItem(CLAVE_CARRITO, JSON.stringify(items));
  actualizarContador();
  renderizarCarrito();
}

function agregarAlCarrito(producto, cantidad = 1) {
  if (!producto || (producto.stock !== undefined && producto.stock <= 0)) {
    mostrarAviso('Producto sin stock disponible');
    return;
  }

  const items = obtenerCarrito();
  const existente = items.find((i) => i.id === producto.id);

  let imagenPrincipal = 'placeholder.svg';
  if (producto.imagenes && producto.imagenes.length > 0) {
    imagenPrincipal = typeof producto.imagenes[0] === 'string' ? producto.imagenes[0] : (producto.imagenes[0].url || 'placeholder.svg');
  } else if (producto.imagenUrl) {
    imagenPrincipal = producto.imagenUrl;
  }

  const maxStock = producto.stock || 99;

  if (existente) {
    if (existente.cantidad >= maxStock) {
      mostrarAviso('Alcanzaste el límite de stock de este producto');
      return;
    }
    existente.cantidad = Math.min(existente.cantidad + cantidad, maxStock);
  } else {
    items.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      imagenUrl: imagenPrincipal,
      stock: maxStock,
      cantidad: Math.min(cantidad, maxStock),
    });
  }

  guardarCarrito(items);
  mostrarAviso(`${producto.nombre} agregado al carrito`);
}

function cambiarCantidadItem(id, cantidad) {
  const items = obtenerCarrito();
  const item = items.find((i) => i.id === id);
  if (!item) return;

  item.cantidad = Math.max(1, Math.min(cantidad, item.stock));
  guardarCarrito(items);
}

function quitarDelCarrito(id) {
  guardarCarrito(obtenerCarrito().filter((i) => i.id !== id));
}

function vaciarCarrito() {
  guardarCarrito([]);
  mostrarAviso('Carrito vaciado');
}

function calcularTotal(items) {
  return items.reduce((suma, i) => suma + i.precio * i.cantidad, 0);
}

function formatearPrecio(numero) {
  return (numero || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

function actualizarContador() {
  const total = obtenerCarrito().reduce((suma, i) => suma + i.cantidad, 0);
  document.querySelectorAll('[data-contador-carrito]').forEach((el) => {
    el.textContent = total;
    el.style.display = total > 0 ? 'inline-flex' : 'none';
  });
}

function renderizarCarrito() {
  const contenedor = document.querySelector('[data-carrito-items]');
  if (!contenedor) return;

  const items = obtenerCarrito();
  const piePago = document.querySelector('[data-carrito-pie]');
  const totalEl = document.querySelector('[data-carrito-total]');
  const btnConfirmar = document.querySelector('[data-confirmar-compra]');

  if (items.length === 0) {
    contenedor.innerHTML = '<p class="carrito-vacio">Tu carrito está vacío.<br>Explorá el catálogo y elegí tus objetos favoritos.</p>';
    if (piePago) piePago.style.display = 'none';
    return;
  }

  if (piePago) piePago.style.display = 'block';

  contenedor.innerHTML = items.map((item) => `
    <div class="item-carrito" data-id="${item.id}">
      <img src="${item.imagenUrl}" alt="${item.nombre}" onerror="this.src='placeholder.svg'">
      <div class="item-info">
        <h4>${item.nombre}</h4>
        <p class="precio-unitario">${formatearPrecio(item.precio)} c/u</p>
        <div class="item-acciones">
          <div class="selector-cantidad">
            <button type="button" data-restar aria-label="Restar unidad">−</button>
            <input type="text" inputmode="numeric" value="${item.cantidad}" readonly aria-label="Cantidad">
            <button type="button" data-sumar aria-label="Sumar unidad" ${item.cantidad >= item.stock ? 'disabled' : ''}>+</button>
          </div>
          <button type="button" class="btn-eliminar-item" data-quitar aria-label="Eliminar ${item.nombre}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>
      <span class="item-subtotal">${formatearPrecio(item.precio * item.cantidad)}</span>
    </div>
  `).join('');

  if (totalEl) totalEl.textContent = formatearPrecio(calcularTotal(items));
  if (btnConfirmar) btnConfirmar.disabled = items.length === 0;
}

function abrirCarrito() {
  document.querySelector('[data-panel-carrito]')?.classList.add('visible');
  document.querySelector('[data-fondo-carrito]')?.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function cerrarCarrito() {
  document.querySelector('[data-panel-carrito]')?.classList.remove('visible');
  document.querySelector('[data-fondo-carrito]')?.classList.remove('visible');
  document.body.style.overflow = '';
}

function mostrarAviso(texto) {
  const aviso = document.querySelector('[data-aviso]');
  if (!aviso) return;
  aviso.querySelector('span:last-child').textContent = texto;
  aviso.classList.add('visible');
  clearTimeout(mostrarAviso._temporizador);
  mostrarAviso._temporizador = setTimeout(() => aviso.classList.remove('visible'), 2600);
}

function finalizarCompraWhatsApp() {
  const items = obtenerCarrito();
  if (items.length === 0) {
    mostrarAviso('Agregá al menos un producto antes de finalizar');
    return;
  }

  const lineas = items.map((i) => `• ${i.nombre} (x${i.cantidad}) — ${formatearPrecio(i.precio * i.cantidad)}`);
  const total = formatearPrecio(calcularTotal(items));

  const mensaje = [
    'Hola Pretta Home Deco! Quiero realizar el siguiente pedido:',
    '',
    ...lineas,
    '',
    `*Total a pagar: ${total}*`,
    '',
    'Quedo a la espera para coordinar pago y envío. ¡Gracias!'
  ].join('\n');

  const url = `https://wa.me/${CONFIG.WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank', 'noopener');
}

function tarjetaProductoHtml(producto) {
  const sinStock = producto.stock <= 0;
  const imagenPrincipal = (producto.imagenes && producto.imagenes.length > 0) 
    ? producto.imagenes[0] 
    : 'placeholder.svg';

  return `
    <article class="tarjeta-producto" data-id="${producto.id}">
      <div class="tarjeta-imagen">
        <img src="${imagenPrincipal}" alt="${producto.nombre}" onerror="this.src='placeholder.svg'">
        ${sinStock ? '<span class="etiqueta-sin-stock">Sin stock</span>' : ''}
      </div>
      <div class="tarjeta-cuerpo">
        <h3>${producto.nombre}</h3>
        <p class="tarjeta-precio">${formatearPrecio(producto.precio)}</p>

        <button type="button" class="btn-ver-mas" data-ver-mas>
          <span>Ver detalle</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>

        <div class="tarjeta-pie">
          <button type="button" class="btn btn-salvia btn-ancho btn-agregar" data-agregar ${sinStock ? 'disabled' : ''}>
            ${sinStock ? 'Sin stock' : 'Agregar al carrito'}
          </button>
        </div>
      </div>
    </article>
  `;
}

async function cargarCatalogo() {
  const grilla = document.querySelector('[data-grilla-productos]');
  if (!grilla) return;

  try {
    const respuesta = await fetch(`${CONFIG.API_URL}/productos`);
    if (!respuesta.ok) throw new Error('Error al obtener productos');
    const datos = await respuesta.json();

    productosCargados = datos.map((p) => {
      let listaImg = [];
      if (p.imagenes && p.imagenes.length > 0) {
        const ordenadas = [...p.imagenes].sort((x, y) => (y.principal ? 1 : 0) - (x.principal ? 1 : 0));
        listaImg = ordenadas.map(i => typeof i === 'string' ? i : i.url);
      } else if (p.imagenUrl) {
        listaImg = [p.imagenUrl];
      } else {
        listaImg = ['placeholder.svg'];
      }

      return {
        ...p,
        id: p._id || p.id,
        imagenes: listaImg
      };
    });

    aplicarFiltrosCatalogo();
  } catch (err) {
    console.error('Error al conectar con MongoDB:', err);
    grilla.innerHTML = `<p class="mensaje-vacio">No pudimos cargar el catálogo. Verificá la conexión con el servidor.</p>`;
  }
}

function aplicarFiltrosCatalogo() {
  const texto = (document.querySelector('[data-buscador]')?.value || '').trim().toLowerCase();
  const orden = document.querySelector('[data-orden-precio]')?.value || '';

  const lista = texto
    ? productosCargados.filter((p) => p.nombre.toLowerCase().includes(texto))
    : [...productosCargados];
  if (orden === 'menor') lista.sort((a, b) => a.precio - b.precio);
  if (orden === 'mayor') lista.sort((a, b) => b.precio - a.precio);
  renderizarGrilla(lista);
}

function renderizarGrilla(productos) {
  const grilla = document.querySelector('[data-grilla-productos]');
  if (!grilla) return;

  if (productos.length === 0) {
    grilla.innerHTML = '<p class="mensaje-vacio">No se encontraron productos coincidentes.</p>';
    return;
  }
  grilla.innerHTML = productos.map(tarjetaProductoHtml).join('');
}

function abrirModalProducto(producto) {
  const modal = document.querySelector('[data-modal-detalle]');
  const fondo = document.querySelector('[data-fondo-modal]');
  const contenedor = document.querySelector('[data-modal-contenido]');
  if (!modal || !contenedor) return;

  const sinStock = producto.stock <= 0;
  const listaImg = producto.imagenes && producto.imagenes.length > 0 ? producto.imagenes : ['placeholder.svg'];

  const miniaturasHtml = listaImg.length > 1 ? `
    <div class="modal-miniaturas">
      ${listaImg.map((img, idx) => `
        <button type="button" class="btn-miniatura-modal ${idx === 0 ? 'activa' : ''}" data-img="${img}">
          <img src="${img}" alt="Vista ${idx + 1}" onerror="this.src='placeholder.svg'">
        </button>
      `).join('')}
    </div>
  ` : '';

  contenedor.innerHTML = `
    <div class="modal-col-imagen">
      <div class="modal-imagen-principal">
        <img src="${listaImg[0]}" id="imgPrincipalModal" alt="${producto.nombre}" onerror="this.src='placeholder.svg'">
        ${sinStock ? '<span class="etiqueta-sin-stock">Sin stock</span>' : ''}
      </div>
      ${miniaturasHtml}
    </div>
    <div class="modal-col-info">
      <h2>${producto.nombre}</h2>
      <p class="modal-precio">${formatearPrecio(producto.precio)}</p>
      <div class="modal-descripcion">
        <p>${producto.descripcion || 'Sin descripción disponible.'}</p>
      </div>
      <p class="modal-stock-info">${sinStock ? '❌ Producto agotado' : '✔ Stock disponible'}</p>
      <button type="button" class="btn btn-salvia btn-ancho" id="btnAgregarDesdeModal" ${sinStock ? 'disabled' : ''}>
        ${sinStock ? 'Sin stock' : 'Agregar al carrito'}
      </button>
    </div>
  `;

  contenedor.querySelectorAll('.btn-miniatura-modal').forEach((btn) => {
    btn.addEventListener('click', () => {
      const imgTarget = btn.dataset.img;
      const imgPrincipal = document.getElementById('imgPrincipalModal');
      if (imgPrincipal && imgTarget) {
        imgPrincipal.src = imgTarget;
        contenedor.querySelectorAll('.btn-miniatura-modal').forEach((b) => b.classList.remove('activa'));
        btn.classList.add('activa');
      }
    });
  });

  document.getElementById('btnAgregarDesdeModal')?.addEventListener('click', () => {
    agregarAlCarrito(producto, 1);
  });

  modal.classList.add('visible');
  fondo.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function cerrarModalProducto() {
  document.querySelector('[data-modal-detalle]')?.classList.remove('visible');
  document.querySelector('[data-fondo-modal]')?.classList.remove('visible');
  document.body.style.overflow = '';
}
async function cargarDatosSitio() {
  try {
    const res = await fetch(`${CONFIG.API_URL}/datos`);
    if (!res.ok) throw new Error('No se pudo cargar la página principal');
    const datos = await res.json();

    if (datos.whatsappNumero) CONFIG.WHATSAPP_NUMERO = datos.whatsappNumero;
    if (datos.instagramUrl) CONFIG.INSTAGRAM_URL = datos.instagramUrl;
    if (datos.facebookUrl) CONFIG.FACEBOOK_URL = datos.facebookUrl;

    pintarHero(datos);
    return datos;
  } catch (err) {
    console.error(err);
    return null;
  }
}

function pintarHero(datos) {
  if (datos.titulo) {
    const h1 = document.querySelector('[data-hero-titulo]');
    if (h1) h1.textContent = datos.titulo;
  }

  if (datos.subtitulo) {
    const p = document.querySelector('[data-hero-subtitulo]');
    if (p) p.textContent = datos.subtitulo;
  }
  if (datos.imagen && datos.imagen.url) {
    const img = document.querySelector('[data-hero-imagen]');
    const svg = document.querySelector('[data-hero-ilustracion-svg]');
    if (img) {
      img.onerror = () => {
        img.style.display = 'none';
        if (svg) svg.style.display = '';
      };
      img.alt = datos.titulo || '';
      img.src = datos.imagen.url;
      img.style.display = '';
    }
    if (svg) svg.style.display = 'none';
  }
  if (Array.isArray(datos.mensajes) && datos.mensajes.length > 0) {
    const franja = document.querySelector('[data-franja-valores]');
    if (franja) {
      franja.innerHTML = datos.mensajes.map((m) => `
        <div class="valor-card">
          <span class="valor-icono">✦</span>
          <div>
            <h3>${m.titulo}</h3>
            <p>${m.texto}</p>
          </div>
        </div>
      `).join('');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  cargarDatosSitio().then(() => {
    const linkWa = `https://wa.me/${CONFIG.WHATSAPP_NUMERO}?text=${encodeURIComponent('Hola! Quisiera realizar una consulta sobre Pretta Home Deco.')}`;
    const btnWa = document.querySelector('[data-whatsapp-contacto]');
    if (btnWa) btnWa.href = linkWa;
    if (CONFIG.INSTAGRAM_URL) document.querySelector('[data-instagram]')?.setAttribute('href', CONFIG.INSTAGRAM_URL);
    if (CONFIG.FACEBOOK_URL) document.querySelector('[data-facebook]')?.setAttribute('href', CONFIG.FACEBOOK_URL);
  });

  actualizarContador();
  renderizarCarrito();
  cargarCatalogo();

  document.querySelectorAll('[data-abrir-carrito]').forEach((btn) => btn.addEventListener('click', abrirCarrito));
  document.querySelector('[data-cerrar-carrito]')?.addEventListener('click', cerrarCarrito);
  document.querySelector('[data-fondo-carrito]')?.addEventListener('click', cerrarCarrito);
  document.querySelector('[data-confirmar-compra]')?.addEventListener('click', finalizarCompraWhatsApp);
  document.querySelector('[data-vaciar-carrito]')?.addEventListener('click', vaciarCarrito);

  document.querySelector('[data-cerrar-modal]')?.addEventListener('click', cerrarModalProducto);
  document.querySelector('[data-fondo-modal]')?.addEventListener('click', cerrarModalProducto);

  document.querySelector('[data-carrito-items]')?.addEventListener('click', (ev) => {
    const fila = ev.target.closest('.item-carrito');
    if (!fila) return;
    const id = fila.dataset.id;
    const items = obtenerCarrito();
    const item = items.find((i) => i.id === id);
    if (!item) return;

    if (ev.target.closest('[data-sumar]')) cambiarCantidadItem(id, item.cantidad + 1);
    else if (ev.target.closest('[data-restar]')) {
      if (item.cantidad <= 1) quitarDelCarrito(id);
      else cambiarCantidadItem(id, item.cantidad - 1);
    } else if (ev.target.closest('[data-quitar]')) quitarDelCarrito(id);
  });

  const grilla = document.querySelector('[data-grilla-productos]');
  if (grilla) {
    grilla.addEventListener('click', (ev) => {
      const tarjeta = ev.target.closest('.tarjeta-producto');
      if (!tarjeta) return;

      const id = tarjeta.dataset.id;
      const producto = productosCargados.find((p) => p.id === id);
      if (!producto) return;

      if (ev.target.closest('[data-agregar]')) {
        ev.stopPropagation();
        agregarAlCarrito(producto, 1);
      } else {
        abrirModalProducto(producto);
      }
    });
  }

  document.querySelector('[data-buscador]')?.addEventListener('input', aplicarFiltrosCatalogo);
  document.querySelector('[data-orden-precio]')?.addEventListener('change', aplicarFiltrosCatalogo);

  const nav = document.querySelector('[data-nav]');
  const botonMenu = document.querySelector('[data-boton-menu]');
  const actualizarNav = () => {
    const modoCelular = botonMenu && getComputedStyle(botonMenu).display !== 'none';
    nav?.classList.toggle('nav-oculta', !!modoCelular && !nav.classList.contains('abierto'));
  };
  botonMenu?.addEventListener('click', () => nav?.classList.toggle('abierto'));
  document.querySelectorAll('.enlace-nav').forEach((enlace) => enlace.addEventListener('click', () => nav?.classList.remove('abierto')));
  if (nav) new MutationObserver(actualizarNav).observe(nav, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', actualizarNav);
  actualizarNav();

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      cerrarCarrito();
      cerrarModalProducto();
    }
  });
});
