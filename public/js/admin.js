// ============================================================
// CONFIGURACIÓN Y ESTADO GENERAL
// ============================================================
const CONFIG = { API_URL: (['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://localhost:3000' : '') + '/api' };
const UMBRAL_STOCK_BAJO = 5; // de 1 a 5 unidades se considera "por agotarse"

let token = localStorage.getItem('pretta_token') || null;
let productosCache = [];
let ventasCache = [];
let idVentaEditando = null;
let datosCache = null;
let productoEditandoId = null; // producto abierto en el modal (null = producto nuevo)
const MAX_IMAGENES_PRODUCTO = 5;

// ============================================================
// AYUDANTES: modales, fetch autenticado y avisos
// ============================================================
function toggleModal(idModal, idFondo, mostrar) {
  document.getElementById(idModal)?.classList.toggle('visible', mostrar);
  document.getElementById(idFondo)?.classList.toggle('visible', mostrar);
}

function authHeaders() {
  return { Authorization: `Bearer ${token}` };
}

// fetch con el token puesto, que maneja sesión vencida y errores de la API en un solo lugar.
// Ante un 401 cierra la sesión y tira un error especial '401' para no mostrar doble aviso.
async function fetchProtegido(url, opciones = {}) {
  const res = await fetch(url, { ...opciones, headers: { ...authHeaders(), ...(opciones.headers || {}) } });

  if (res.status === 401) {
    mostrarAviso('Sesión expirada. Por favor, volvé a iniciar sesión.');
    cerrarSesion();
    throw new Error('401');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error inesperado');
  return data;
}

// tipo: 'ok' (por defecto) o 'error' (cartelito rojo, dura un poco más para poder leerlo)
function mostrarAviso(texto, tipo = 'ok') {
  const aviso = document.querySelector('[data-aviso]');
  if (!aviso) return;
  aviso.querySelector('span:last-child').textContent = texto;
  aviso.classList.toggle('aviso-error', tipo === 'error');
  aviso.classList.add('visible');
  clearTimeout(mostrarAviso._temporizador);
  mostrarAviso._temporizador = setTimeout(() => aviso.classList.remove('visible'), tipo === 'error' ? 4200 : 2600);
}

// Reporta un error de fetchProtegido, salvo que ya se haya avisado como sesión vencida (401)
function avisarError(err) {
  if (err.message !== '401') mostrarAviso(err.message, 'error');
}

// ============================================================
// INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  token ? mostrarDashboard() : mostrarLogin();

  document.getElementById('formLogin')?.addEventListener('submit', manejarLogin);
  document.getElementById('btnCerrarSesion')?.addEventListener('click', cerrarSesion);

  document.getElementById('btnAbrirCrearProducto')?.addEventListener('click', () => abrirModalProducto());
  document.getElementById('btnCerrarModalProducto')?.addEventListener('click', cerrarModalProducto);
  document.getElementById('fondoModalProducto')?.addEventListener('click', cerrarModalProducto);

  document.getElementById('btnAbrirCrearVenta')?.addEventListener('click', () => abrirModalVenta());
  document.getElementById('btnCerrarModalVenta')?.addEventListener('click', cerrarModalVenta);
  document.getElementById('fondoModalVenta')?.addEventListener('click', cerrarModalVenta);

  document.getElementById('btnAbrirCambiarPass')?.addEventListener('click', abrirModalPass);
  document.getElementById('btnCerrarModalPass')?.addEventListener('click', cerrarModalPass);
  document.getElementById('fondoModalPass')?.addEventListener('click', cerrarModalPass);

  document.getElementById('btnAbrirConfig')?.addEventListener('click', abrirModalConfig);
  document.getElementById('btnCerrarModalConfig')?.addEventListener('click', cerrarModalConfig);
  document.getElementById('fondoModalConfig')?.addEventListener('click', cerrarModalConfig);
  document.getElementById('cfgImagen')?.addEventListener('change', previsualizarImagenConfig);

  // Fotos del producto: validar cantidad al elegir archivos, y check / tachito de cada miniatura
  document.getElementById('prodImagenes')?.addEventListener('change', validarCantidadImagenes);
  const contMiniaturas = document.getElementById('prodImagenesExistentes');
  contMiniaturas?.addEventListener('change', (ev) => {
    const check = ev.target.closest('[data-accion="principal"]');
    if (!check) return;
    if (check.checked) marcarImagenPrincipal(check.closest('[data-imagen-id]').dataset.imagenId);
    else {
      mostrarAviso('Siempre tiene que haber una foto principal: tildá otra para cambiarla', 'error');
      renderizarMiniaturasProducto();
    }
  });
  contMiniaturas?.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-accion="borrar"]');
    if (btn) borrarImagenProducto(btn.closest('[data-imagen-id]').dataset.imagenId);
  });
  document.getElementById('btnAgregarMensajeConfig')?.addEventListener('click', () => agregarMensajeConfig());

  document.getElementById('formProducto')?.addEventListener('submit', guardarProducto);
  document.getElementById('formVenta')?.addEventListener('submit', guardarVenta);
  document.getElementById('formCambiarPass')?.addEventListener('submit', cambiarPassword);
  document.getElementById('formConfig')?.addEventListener('submit', guardarConfiguracion);

  ['filtroFechaDesde', 'filtroFechaHasta'].forEach((id) => document.getElementById(id)?.addEventListener('change', () => { marcarChipRango(null); renderizarVentas(); }));
  document.getElementById('filtroOrden')?.addEventListener('change', renderizarVentas);
  document.getElementById('chipsRango')?.addEventListener('click', (ev) => { const b = ev.target.closest('[data-rango]'); if (b) aplicarRango(b.dataset.rango); });
  document.getElementById('btnLimpiarFiltros')?.addEventListener('click', limpiarFiltrosVentas);
  document.getElementById('chipsTop')?.addEventListener('click', (ev) => { const b = ev.target.closest('[data-top]'); if (b) { periodoTop = b.dataset.top; renderizarResumen(); } });
  document.getElementById('btnResumenCargarVenta')?.addEventListener('click', () => abrirModalVenta());
  document.getElementById('btnResumenCargarProducto')?.addEventListener('click', () => abrirModalProducto());
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-vista-btn],[data-ir-vista]');
    if (b) mostrarVista(b.dataset.vistaBtn || b.dataset.irVista);
  });
  document.addEventListener('input', (ev) => ev.target.closest?.('.campo-error') && limpiarErrorCampo(ev.target.closest('.campo-error')));

  document.getElementById('btnGenerarPDF')?.addEventListener('click', exportarPDFVentas);

  const btnAgregar = document.getElementById('btnAgregarLineaVenta');
  if (btnAgregar) {
    btnAgregar.type = 'button';
    btnAgregar.addEventListener('click', (ev) => { ev.preventDefault(); agregarLineaVenta(); });
  }
});

// ============================================================
// AUTENTICACIÓN
// ============================================================
async function manejarLogin(ev) {
  ev.preventDefault();
  if (!validarFormulario(ev.target)) return;
  const usuario = document.getElementById('loginUsuario').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  try {
    const res = await fetch(`${CONFIG.API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Credenciales inválidas');

    token = data.token;
    localStorage.setItem('pretta_token', token);
    mostrarAviso('Bienvenida al Panel de Gestión');
    mostrarDashboard();
  } catch (err) {
    mostrarAviso(err.message);
  }
}

function cerrarSesion() {
  token = null;
  localStorage.removeItem('pretta_token');
  mostrarLogin();
}

function mostrarLogin() {
  document.getElementById('seccionLogin').style.display = 'flex';
  document.getElementById('seccionDashboard').style.display = 'none';
}

function mostrarDashboard() {
  document.getElementById('seccionLogin').style.display = 'none';
  document.getElementById('seccionDashboard').style.display = 'block';
  mostrarVista(sessionStorage.getItem('pretta_vista') || 'resumen');
  cargarProductosAdmin();
  cargarVentasAdmin();
  cargarConfiguracionAdmin();
}

// ============================================================
// PRODUCTOS
// ============================================================
async function cargarProductosAdmin() {
  try {
    productosCache = await fetchProtegido(`${CONFIG.API_URL}/productos/admin/todos`);
    renderizarProductos();
    renderizarResumen();
  } catch (err) {
    if (err.message === '401') return;
    console.error(err);
    const tbody = document.getElementById('tablaProductosBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="texto-centro">Error al cargar datos.</td></tr>`;
  }
}

function renderizarProductos() {
  const tbody = document.getElementById('tablaProductosBody');
  if (productosCache.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="texto-centro">No hay productos registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = productosCache.map((p) => {
    let estadoBadge = '<span class="badge badge-ok">OK</span>';
    if (p.stock === 0) estadoBadge = '<span class="badge badge-sin-stock">Sin stock</span>';
    else if (p.stock <= UMBRAL_STOCK_BAJO) estadoBadge = '<span class="badge badge-stock-bajo">Stock bajo</span>';

    const imgUrl = urlImagenPrincipal(p);

    const iconoOjo = p.activo
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

    return `
      <tr data-id="${p._id}">
        <td><img src="${imgUrl}" class="img-tabla-thumb" onerror="this.src='placeholder.svg'"></td>
        <td><strong>${p.nombre}</strong></td>
        <td>$${p.precio.toLocaleString('es-AR')}</td>
        <td>${p.stock} u.</td>
        <td>${estadoBadge}</td>
        <td>
          <button type="button" class="btn-icono ${p.activo ? 'activo' : 'oculto'}" onclick="toggleVisibilidad('${p._id}', ${!p.activo})" title="Alternar visibilidad">${iconoOjo}</button>
        </td>
        <td>
          <div class="acciones-tabla">
            <button type="button" class="btn-icono" onclick="prepararEditarProducto('${p._id}')" title="Modificar">✏️</button>
            <button type="button" class="btn-icono btn-eliminar" onclick="eliminarProducto('${p._id}')" title="Eliminar permanentemente">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function toggleVisibilidad(id, activar) {
  try {
    await fetchProtegido(`${CONFIG.API_URL}/productos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: activar }),
    });
    mostrarAviso(activar ? 'Producto visible en la tienda' : 'Producto oculto de la tienda');
    cargarProductosAdmin();
  } catch (err) {
    avisarError(err);
  }
}

// Devuelve la foto que se ve primero en la tienda: la marcada como principal, o la primera.
function urlImagenPrincipal(p) {
  const imgs = p.imagenes || [];
  const img = imgs.find((i) => typeof i !== 'string' && i.principal) || imgs[0];
  if (img) return typeof img === 'string' ? img : (img.url || 'placeholder.svg');
  return p.imagenUrl || 'placeholder.svg';
}

function abrirModalProducto(prod = null) {
  document.getElementById('formProducto').reset();
  document.getElementById('prodId').value = '';
  productoEditandoId = prod ? prod._id : null;

  if (prod) {
    document.getElementById('modalProductoTitulo').textContent = 'Modificar Producto';
    document.getElementById('prodId').value = prod._id;
    document.getElementById('prodNombre').value = prod.nombre;
    document.getElementById('prodDescripcion').value = prod.descripcion;
    document.getElementById('prodPrecio').value = prod.precio;
    document.getElementById('prodStock').value = prod.stock;
    document.getElementById('prodActivo').checked = prod.activo;
  } else {
    document.getElementById('modalProductoTitulo').textContent = 'Cargar Producto';
    document.getElementById('prodActivo').checked = true;
  }

  renderizarMiniaturasProducto();
  toggleModal('modalProducto', 'fondoModalProducto', true);
}

function cerrarModalProducto() {
  toggleModal('modalProducto', 'fondoModalProducto', false);
  productoEditandoId = null;
  document.getElementById('prodImagenes').value = '';
  renderizarMiniaturasProducto();
}

// ---- Fotos del producto: miniaturas con check (principal) y tachito (borrar) ----
let urlsPendientes = []; // vistas previas de archivos recién elegidos (hay que liberarlas)

function productoEnModal() {
  return productosCache.find((p) => p._id === productoEditandoId) || null;
}

function renderizarMiniaturasProducto() {
  const cont = document.getElementById('prodImagenesExistentes');
  if (!cont) return;

  urlsPendientes.forEach((u) => URL.revokeObjectURL(u));
  urlsPendientes = [];

  const guardadas = productoEnModal()?.imagenes || [];
  const nuevas = [...(document.getElementById('prodImagenes')?.files || [])];
  const total = guardadas.length + nuevas.length;

  if (total === 0) {
    cont.innerHTML = '';
    return;
  }

  const htmlGuardadas = guardadas.map((img, i) => `
    <div class="miniatura-producto ${img.principal ? 'es-principal' : ''}" data-imagen-id="${img._id}">
      <img src="${img.url}" alt="Foto ${i + 1}" onerror="this.src='placeholder.svg'">
      <label class="miniatura-check" title="Tildá la foto que querés que se vea primero en la tienda">
        <input type="checkbox" data-accion="principal" ${img.principal ? 'checked' : ''}>
      </label>
      <button type="button" class="miniatura-borrar" data-accion="borrar" title="Borrar esta foto">🗑️</button>
    </div>
  `).join('');

  const htmlNuevas = nuevas.map((archivo, i) => {
    const url = URL.createObjectURL(archivo);
    urlsPendientes.push(url);
    return `
      <div class="miniatura-producto miniatura-nueva">
        <img src="${url}" alt="Foto nueva ${i + 1}">
        <span class="miniatura-etiqueta">Nueva</span>
      </div>
    `;
  }).join('');

  const ayuda = guardadas.length > 0
    ? 'Tildá la foto que querés que se vea primero en la tienda. Las fotos nuevas se guardan al presionar «Guardar Producto».'
    : 'La primera foto que subas va a ser la principal; después podés cambiarla desde «Modificar».';

  cont.innerHTML = `
    <div class="miniaturas-lista">${htmlGuardadas}${htmlNuevas}</div>
    <p class="miniaturas-ayuda">${total} de ${MAX_IMAGENES_PRODUCTO} fotos. ${ayuda}</p>
  `;
}

// Devuelve true si las fotos guardadas + las recién elegidas no pasan el máximo.
// Si se pasan: cartelito de error y se vacía la selección (las guardadas no se tocan).
function validarCantidadImagenes() {
  const input = document.getElementById('prodImagenes');
  const guardadas = productoEnModal()?.imagenes?.length || 0;
  const lugar = MAX_IMAGENES_PRODUCTO - guardadas;
  let ok = true;

  if (input.files.length > lugar) {
    ok = false;
    input.value = '';
    mostrarAviso(
      lugar <= 0
        ? `Este producto ya tiene ${MAX_IMAGENES_PRODUCTO} fotos (el máximo). Borrá alguna para poder subir otra.`
        : `Solo podés agregar ${lugar} foto${lugar === 1 ? '' : 's'} más (máximo ${MAX_IMAGENES_PRODUCTO} por producto).`,
      'error'
    );
  }
  renderizarMiniaturasProducto();
  return ok;
}

// Cuando el servidor devuelve el producto actualizado, se reemplaza en el cache y se repinta la tabla
function reemplazarProductoEnCache(actualizado) {
  const i = productosCache.findIndex((p) => p._id === actualizado._id);
  if (i >= 0) productosCache[i] = actualizado;
  renderizarProductos();
  renderizarResumen();
}

async function marcarImagenPrincipal(imagenId) {
  try {
    const actualizado = await fetchProtegido(
      `${CONFIG.API_URL}/productos/${productoEditandoId}/imagenes/${imagenId}/principal`,
      { method: 'PUT' }
    );
    reemplazarProductoEnCache(actualizado);
    mostrarAviso('Foto principal actualizada');
  } catch (err) {
    avisarError(err);
  }
  renderizarMiniaturasProducto();
}

async function borrarImagenProducto(imagenId) {
  if (!confirm('¿Borrar esta foto? Se elimina definitivamente.')) return;
  try {
    const actualizado = await fetchProtegido(
      `${CONFIG.API_URL}/productos/${productoEditandoId}/imagenes/${imagenId}`,
      { method: 'DELETE' }
    );
    reemplazarProductoEnCache(actualizado);
    mostrarAviso('Foto borrada');
  } catch (err) {
    avisarError(err);
  }
  renderizarMiniaturasProducto();
}

function prepararEditarProducto(id) {
  const p = productosCache.find((item) => item._id === id);
  if (p) abrirModalProducto(p);
}

async function guardarProducto(ev) {
  ev.preventDefault();
  if (!validarFormulario(ev.target)) return;
  if (!validarCantidadImagenes()) return;
  const id = document.getElementById('prodId').value;
  const formData = new FormData();

  formData.append('nombre', document.getElementById('prodNombre').value);
  formData.append('descripcion', document.getElementById('prodDescripcion').value);
  formData.append('precio', document.getElementById('prodPrecio').value);
  formData.append('stock', document.getElementById('prodStock').value);
  formData.append('activo', document.getElementById('prodActivo').checked);
  for (const file of document.getElementById('prodImagenes').files) formData.append('imagenes', file);

  const url = id ? `${CONFIG.API_URL}/productos/${id}` : `${CONFIG.API_URL}/productos`;

  try {
    // Sin 'Content-Type': con FormData lo pone el navegador solo (necesita el boundary)
    await fetchProtegido(url, { method: id ? 'PUT' : 'POST', body: formData });
    mostrarAviso(id ? 'Producto actualizado' : 'Producto registrado');
    cerrarModalProducto();
    cargarProductosAdmin();
  } catch (err) {
    avisarError(err);
  }
}

async function eliminarProducto(id) {
  if (!confirm('¿Estás segura de que querés eliminar permanentemente este producto de la base de datos?')) return;
  try {
    await fetchProtegido(`${CONFIG.API_URL}/productos/${id}`, { method: 'DELETE' });
    mostrarAviso('Producto eliminado de la base de datos');
    cargarProductosAdmin();
  } catch (err) {
    avisarError(err);
  }
}

// ============================================================
// VENTAS (SNAPSHOT PATTERN Y FILTROS)
// ============================================================
async function cargarVentasAdmin() {
  try {
    ventasCache = await fetchProtegido(`${CONFIG.API_URL}/ventas`);
    renderizarVentas();
    renderizarResumen();
  } catch (err) {
    if (err.message === '401') return;
    console.error(err);
    const tbody = document.getElementById('tablaVentasBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="texto-centro">Sin ventas registradas.</td></tr>`;
  }
}

// Un solo select ("Filtro por fecha y precio") con 4 opciones excluyentes entre sí,
// en vez de dos selects separados (uno para fecha, otro para precio).
const COMPARADORES_ORDEN_VENTA = {
  fecha_desc: (a, b) => new Date(b.createdAt) - new Date(a.createdAt), // más reciente primero
  fecha_asc: (a, b) => new Date(a.createdAt) - new Date(b.createdAt), // más antigua primero
  total_desc: (a, b) => b.total - a.total, // mayor a menor precio
  total_asc: (a, b) => a.total - b.total, // menor a mayor precio
};

function obtenerVentasFiltradas() {
  let ventas = [...ventasCache];

  const fDesde = document.getElementById('filtroFechaDesde')?.value;
  const fHasta = document.getElementById('filtroFechaHasta')?.value;
  const orden = document.getElementById('filtroOrden')?.value;

  if (fDesde) ventas = ventas.filter((v) => new Date(v.createdAt) >= new Date(`${fDesde}T00:00:00`));
  if (fHasta) ventas = ventas.filter((v) => new Date(v.createdAt) <= new Date(`${fHasta}T23:59:59.999`));

  // Sin nada elegido, se ordena por fecha más reciente primero (comportamiento por defecto)
  ventas.sort(COMPARADORES_ORDEN_VENTA[orden] || COMPARADORES_ORDEN_VENTA.fecha_desc);

  return ventas;
}

function renderizarVentas() {
  const tbody = document.getElementById('tablaVentasBody');
  const ventas = obtenerVentasFiltradas();
  actualizarResumenFiltro(ventas);

  if (ventas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="texto-centro">No hay ventas registradas.</td></tr>`;
    return;
  }

  tbody.innerHTML = ventas.map((v, i) => {
    const cod = codigoVenta(v);
    const fecha = new Date(v.createdAt).toLocaleString('es-AR');
    const prods = (v.items || []).map((item) => `${item.nombre || 'Producto'} (x${item.cantidad})`).join('<br>');

    return `
      <tr>
        <td><strong>${cod}</strong></td>
        <td class="texto-sm">${prods}</td>
        <td><strong>$${(v.total || 0).toLocaleString('es-AR')}</strong></td>
        <td class="texto-sm">${fecha}</td>
        <td>
          <div class="acciones-tabla">
            <button type="button" class="btn-icono" onclick="abrirModalEditarVenta('${v._id}')" title="Editar venta">✏️</button>
            <button type="button" class="btn-icono btn-eliminar" onclick="eliminarVenta('${v._id}')" title="Eliminar venta">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function eliminarVenta(id) {
  if (!confirm('¿Estás segura de que querés eliminar esta venta?')) return;
  try {
    await fetchProtegido(`${CONFIG.API_URL}/ventas/${id}`, { method: 'DELETE' });
    mostrarAviso('Venta eliminada');
    cargarVentasAdmin();
  } catch (err) {
    avisarError(err);
  }
}

function abrirModalVenta() {
  idVentaEditando = null;
  const titulo = document.getElementById('tituloModalVenta') || document.getElementById('modalVentaTitulo');
  if (titulo) titulo.textContent = 'Registrar Venta';

  document.getElementById('lineasVentaContenedor').innerHTML = '';
  agregarLineaVenta();
  toggleModal('modalVenta', 'fondoModalVenta', true);
}

function abrirModalEditarVenta(id) {
  const venta = ventasCache.find((v) => v._id === id);
  if (!venta) return;

  idVentaEditando = id;
  const titulo = document.getElementById('tituloModalVenta') || document.getElementById('modalVentaTitulo');
  if (titulo) titulo.textContent = 'Editar Venta';

  const cont = document.getElementById('lineasVentaContenedor');
  cont.innerHTML = '';

  (venta.items || []).forEach((item) => {
    const prodId = item.producto?._id || item.producto;
    const precioGuardado = item.precioUnitario !== undefined ? item.precioUnitario : (item.precio || 0);
    // Se pasa también el nombre histórico: si el producto ya fue eliminado, es la única
    // forma de mostrar y conservar esa línea (ver agregarLineaVentaConValores).
    agregarLineaVentaConValores(prodId, item.cantidad, precioGuardado, item.nombre);
  });

  toggleModal('modalVenta', 'fondoModalVenta', true);
  recalcularTotalVentaModal();
}

function cerrarModalVenta() {
  toggleModal('modalVenta', 'fondoModalVenta', false);
}

function agregarLineaVenta() {
  agregarLineaVentaConValores('', 1, null);
}

// Arma una línea del formulario de venta.
// Si idSeleccionado corresponde a un producto que ya NO existe en productosCache (fue
// eliminado), la línea se muestra de solo lectura con su nombre/precio históricos: se puede
// cambiar la cantidad o quitarla, pero no reasignarle otro producto (ese dato ya no existe).
function agregarLineaVentaConValores(idSeleccionado = '', cantidad = 1, precioHistorico = null, nombreHistorico = null) {
  const cont = document.getElementById('lineasVentaContenedor');
  const productoExiste = !idSeleccionado || productosCache.some((p) => p._id === idSeleccionado);
  const prods = productosCache.filter((p) => p.stock > 0 || p._id === idSeleccionado);

  if (!prods.length && !idSeleccionado) {
    mostrarAviso('No hay productos disponibles');
    return;
  }

  const div = document.createElement('div');
  div.className = 'linea-venta-item';

  if (idSeleccionado && !productoExiste) {
    const nombre = nombreHistorico || 'Producto eliminado';
    div.innerHTML = `
      <div class="grupo-campo col-select">
        <label>Producto (eliminado)</label>
        <input type="text" value="${nombre}" disabled title="Este producto ya no existe en el catálogo; se conserva el dato histórico de la venta">
        <input type="hidden" class="select-prod-venta" value="${idSeleccionado}" data-nombre="${nombre}" data-precio-efectivo="${precioHistorico ?? 0}">
      </div>
      <div class="grupo-campo col-cant">
        <label>Cantidad</label>
        <input type="number" class="input-cant-venta" value="${cantidad}" min="1">
      </div>
      <button type="button" class="btn-eliminar-linea" title="Quitar">🗑️</button>
    `;
  } else {
    const opciones = `<option value="NONE" disabled ${!idSeleccionado ? 'selected' : ''}>-- Elegir producto --</option>` +
      prods.map((p) => {
        const precioMostrar = (p._id === idSeleccionado && precioHistorico !== null) ? precioHistorico : p.precio;
        return `<option value="${p._id}" data-precio="${p.precio}" data-nombre="${p.nombre}" ${p._id === idSeleccionado ? 'selected' : ''}>${p.nombre} ($${precioMostrar.toLocaleString('es-AR')})</option>`;
      }).join('');

    div.innerHTML = `
      <div class="grupo-campo col-select">
        <label>Producto</label>
        <select class="select-prod-venta">${opciones}</select>
      </div>
      <div class="grupo-campo col-cant">
        <label>Cantidad</label>
        <input type="number" class="input-cant-venta" value="${cantidad}" min="1">
      </div>
      <button type="button" class="btn-eliminar-linea" title="Quitar">🗑️</button>
    `;
  }

  cont.appendChild(div);

  const select = div.querySelector('.select-prod-venta');
  if (select.tagName === 'SELECT') {
    if (precioHistorico !== null && idSeleccionado) {
      select.dataset.precioEfectivo = precioHistorico;
    } else {
      const opt = select.options[select.selectedIndex];
      if (opt?.dataset.precio) select.dataset.precioEfectivo = opt.dataset.precio;
    }
    select.addEventListener('change', () => {
      const opt = select.options[select.selectedIndex];
      if (opt?.dataset.precio) select.dataset.precioEfectivo = opt.dataset.precio;
      recalcularTotalVentaModal();
    });
  }

  div.querySelector('.input-cant-venta').addEventListener('input', recalcularTotalVentaModal);
  div.querySelector('.btn-eliminar-linea').addEventListener('click', () => { div.remove(); recalcularTotalVentaModal(); });

  recalcularTotalVentaModal();
}

function recalcularTotalVentaModal() {
  let total = 0;
  document.querySelectorAll('.linea-venta-item').forEach((linea) => {
    const select = linea.querySelector('.select-prod-venta');
    const input = linea.querySelector('.input-cant-venta');
    const precioUnitario = parseFloat(select?.dataset?.precioEfectivo) || 0;
    const cantidad = parseInt(input?.value) || 0;
    if (select && select.value !== 'NONE') total += precioUnitario * cantidad;
  });
  document.getElementById('totalVentaModal').textContent = `$${total.toLocaleString('es-AR')}`;
}

// Lee las líneas del formulario y arma el array "items" que espera el backend.
// Se manda también "nombre": es lo que permite conservar el dato histórico si el
// producto de la línea ya fue eliminado (ver routes/ventas.js → procesarItem).
function leerItemsFormularioVenta() {
  const items = [];
  document.querySelectorAll('.linea-venta-item').forEach((linea) => {
    const select = linea.querySelector('.select-prod-venta');
    const id = select?.value;
    const cant = parseInt(linea.querySelector('.input-cant-venta')?.value) || 0;
    const precioUnitario = parseFloat(select?.dataset?.precioEfectivo) || 0;
    const nombre = select?.dataset?.nombre || '';

    if (id && id !== 'NONE' && cant > 0) items.push({ productoId: id, cantidad: cant, precioUnitario, nombre });
  });
  return items;
}

async function guardarVenta(ev) {
  ev.preventDefault();
  const items = leerItemsFormularioVenta();

  if (!items.length) {
    mostrarAviso('Elegí al menos un producto y una cantidad mayor a 0', 'error');
    return;
  }

  try {
    const url = idVentaEditando ? `${CONFIG.API_URL}/ventas/${idVentaEditando}` : `${CONFIG.API_URL}/ventas`;
    await fetchProtegido(url, {
      method: idVentaEditando ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });

    mostrarAviso(idVentaEditando ? 'Venta modificada con éxito' : 'Venta registrada con éxito');
    cerrarModalVenta();
    await cargarProductosAdmin();
    await cargarVentasAdmin();
  } catch (err) {
    avisarError(err);
  }
}

// ============================================================
// CAMBIAR CONTRASEÑA
// ============================================================
function abrirModalPass() {
  document.getElementById('formCambiarPass').reset();
  toggleModal('modalPass', 'fondoModalPass', true);
}

function cerrarModalPass() {
  toggleModal('modalPass', 'fondoModalPass', false);
}

async function cambiarPassword(ev) {
  ev.preventDefault();
  if (!validarFormulario(ev.target)) return;
  const passwordActual = document.getElementById('passActual').value;
  const nuevaPassword = document.getElementById('passNueva').value;

  try {
    await fetchProtegido(`${CONFIG.API_URL}/auth/cambiar-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passwordActual, nuevaPassword }),
    });
    mostrarAviso('Contraseña actualizada correctamente');
    cerrarModalPass();
  } catch (err) {
    avisarError(err);
  }
}

// ============================================================
// EXPORTACIÓN A PDF
// ============================================================
function exportarPDFVentas() {
  const ventas = obtenerVentasFiltradas();
  if (!ventas.length) {
    mostrarAviso('No hay ventas filtradas para exportar');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Pretta Home Deco — Reporte de Ventas', 14, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-AR')}`, 14, 28);

  const filasTabla = [];
  let totalGeneral = 0;

  ventas.forEach((v, index) => {
    const cod = codigoVenta(v);
    const fecha = new Date(v.createdAt).toLocaleString('es-AR');
    const prods = (v.items || []).map((i) => `${i.nombre || i.producto?.nombre || 'Producto'} (x${i.cantidad})`).join(', ');
    const monto = v.total || 0;
    totalGeneral += monto;
    filasTabla.push([cod, prods, `$${monto.toLocaleString('es-AR')}`, fecha]);
  });

  doc.autoTable({
    startY: 34,
    head: [['Código', 'Productos', 'Total', 'Fecha y Hora']],
    body: filasTabla,
    theme: 'grid',
    headStyles: { fillStyle: '#7e9a72', textColor: 255 },
  });

  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Ingresos: $${totalGeneral.toLocaleString('es-AR')}`, 14, finalY);

  doc.save(`reporte-ventas-pretta-${Date.now()}.pdf`);
}

// ============================================================
// PÁGINA PRINCIPAL (tabla "datos": título, subtítulo, imágenes, mensajes, redes y WhatsApp)
// ============================================================
let imagenConfigSeleccionada = null; // archivo elegido ahora (null = no se toca la imagen actual)

async function cargarConfiguracionAdmin() {
  try {
    datosCache = await fetchProtegido(`${CONFIG.API_URL}/datos`);
  } catch (err) {
    if (err.message !== '401') console.error(err);
  }
}

function abrirModalConfig() {
  if (!datosCache) {
    mostrarAviso('Todavía se está cargando la información, probá de nuevo en un segundo');
    return;
  }

  document.getElementById('formConfig').reset();
  document.getElementById('cfgTitulo').value = datosCache.titulo || '';
  document.getElementById('cfgSubtitulo').value = datosCache.subtitulo || '';
  document.getElementById('cfgWhatsapp').value = datosCache.whatsappNumero || '';
  document.getElementById('cfgInstagram').value = datosCache.instagramUrl || '';
  document.getElementById('cfgFacebook').value = datosCache.facebookUrl || '';

  imagenConfigSeleccionada = null;
  mostrarPreviewImagenConfig(datosCache.imagen?.url || null);

  const cont = document.getElementById('mensajesConfigContenedor');
  cont.innerHTML = '';
  const mensajes = datosCache.mensajes?.length ? datosCache.mensajes : [{ titulo: '', texto: '' }];
  mensajes.forEach((m) => agregarMensajeConfig(m.titulo, m.texto));

  toggleModal('modalConfig', 'fondoModalConfig', true);
}

function cerrarModalConfig() {
  toggleModal('modalConfig', 'fondoModalConfig', false);
}

// Agrega una fila de mensaje (título + texto + botón de quitar). Sin límite: se pueden
// seguir agregando, y en la home se acomodan con scroll horizontal si no entran todos.
function agregarMensajeConfig(titulo = '', texto = '') {
  const cont = document.getElementById('mensajesConfigContenedor');
  const div = document.createElement('div');
  div.className = 'linea-venta-item';
  div.innerHTML = `
    <div class="grupo-campo col-select">
      <label>Título</label>
      <input type="text" class="mensaje-cfg-titulo" value="${titulo}" required>
    </div>
    <div class="grupo-campo col-select">
      <label>Texto</label>
      <input type="text" class="mensaje-cfg-texto" value="${texto}" required>
    </div>
    <button type="button" class="btn-eliminar-linea" title="Quitar mensaje">🗑️</button>
  `;
  cont.appendChild(div);
  div.querySelector('.btn-eliminar-linea').addEventListener('click', () => {
    if (cont.children.length <= 1) {
      mostrarAviso('Tiene que quedar al menos 1 mensaje');
      return;
    }
    div.remove();
  });
}

function leerMensajesConfig() {
  return [...document.querySelectorAll('#mensajesConfigContenedor .linea-venta-item')].map((linea) => ({
    titulo: linea.querySelector('.mensaje-cfg-titulo').value.trim(),
    texto: linea.querySelector('.mensaje-cfg-texto').value.trim(),
  }));
}

// Si se elige un archivo, se previsualiza ese (todavía no se subió y va a REEMPLAZAR a la actual).
// Si no se tocó el input, se ve la imagen que ya está guardada.
function previsualizarImagenConfig(ev) {
  imagenConfigSeleccionada = ev.target.files[0] || null;
  if (!imagenConfigSeleccionada) {
    mostrarPreviewImagenConfig(datosCache?.imagen?.url || null);
    return;
  }
  const lector = new FileReader();
  lector.onload = () => mostrarPreviewImagenConfig(lector.result, true);
  lector.readAsDataURL(imagenConfigSeleccionada);
}

function mostrarPreviewImagenConfig(url, esNueva = false) {
  const cont = document.getElementById('cfgImagenPreview');
  cont.innerHTML = url
    ? `<img src="${url}" class="preview-imagen-config" alt="Imagen del inicio" onerror="this.src='placeholder.svg'">
       <p class="texto-sm">${esNueva ? 'Esta imagen va a reemplazar a la actual cuando guardes (la anterior se borra).' : 'Imagen actual. Si elegís otra, la reemplaza.'}</p>`
    : '<p class="texto-sm">Todavía no hay ninguna imagen cargada.</p>';
}

async function guardarConfiguracion(ev) {
  ev.preventDefault();
  if (!validarFormulario(ev.target)) return;

  const mensajes = leerMensajesConfig();
  if (mensajes.length === 0) {
    mostrarAviso('Agregá al menos 1 mensaje', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('titulo', document.getElementById('cfgTitulo').value);
  formData.append('subtitulo', document.getElementById('cfgSubtitulo').value);
  formData.append('whatsappNumero', document.getElementById('cfgWhatsapp').value);
  formData.append('instagramUrl', document.getElementById('cfgInstagram').value);
  formData.append('facebookUrl', document.getElementById('cfgFacebook').value);
  formData.append('mensajes', JSON.stringify(mensajes));

  // Si no se eligió ninguna imagen nueva, no se manda nada y el backend conserva la actual
  if (imagenConfigSeleccionada) formData.append('imagen', imagenConfigSeleccionada);

  try {
    await fetchProtegido(`${CONFIG.API_URL}/datos`, { method: 'PUT', body: formData });
    mostrarAviso('Página principal actualizada');
    cerrarModalConfig();
    cargarConfiguracionAdmin();
  } catch (err) {
    avisarError(err);
  }
}


// ============================================================
// NAVEGACIÓN ENTRE PANTALLAS (Resumen · Productos · Ventas)
// ============================================================
function mostrarVista(nombre) {
  if (!['resumen', 'productos', 'ventas'].includes(nombre)) nombre = 'resumen';
  document.querySelectorAll('.vista-admin').forEach((sec) => { sec.hidden = sec.dataset.vista !== nombre; });
  document.querySelectorAll('[data-vista-btn]').forEach((b) => b.classList.toggle('activo', b.dataset.vistaBtn === nombre));
  sessionStorage.setItem('pretta_vista', nombre);
  window.scrollTo({ top: 0 });
}

// ============================================================
// RESUMEN: facturación, stock para atender y más vendidos
// ============================================================
let periodoTop = '30';

const dinero = (n) => `$${(n || 0).toLocaleString('es-AR')}`;
const escapar = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function inicioDe(periodo) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (periodo === 'semana') d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // lunes
  if (periodo === 'mes') d.setDate(1);
  return d;
}

function facturacionDesde(desde) {
  const lista = ventasCache.filter((v) => new Date(v.createdAt) >= desde);
  return { monto: lista.reduce((acc, v) => acc + (v.total || 0), 0), cantidad: lista.length };
}

function rankingProductos(dias) {
  let lista = ventasCache;
  if (dias !== 'todo') {
    const corte = new Date();
    corte.setHours(0, 0, 0, 0);
    corte.setDate(corte.getDate() - (Number(dias) - 1));
    lista = ventasCache.filter((v) => new Date(v.createdAt) >= corte);
  }
  const porNombre = {};
  lista.forEach((v) => (v.items || []).forEach((it) => {
    const nombre = it.nombre || it.producto?.nombre || 'Producto';
    porNombre[nombre] = (porNombre[nombre] || 0) + (Number(it.cantidad) || 0);
  }));
  return Object.entries(porNombre).map(([nombre, unidades]) => ({ nombre, unidades })).sort((a, b) => b.unidades - a.unidades).slice(0, 5);
}

function filaStock(p, etiqueta, clase) {
  return `
    <div class="fila-stock">
      <span class="fila-stock-nombre">${escapar(p.nombre)}${p.activo ? '' : ' <small>(oculto)</small>'}</span>
      <span class="badge ${clase}">${etiqueta}</span>
      <button type="button" class="btn-enlace-admin" onclick="prepararEditarProducto('${p._id}')">Actualizar</button>
    </div>`;
}

function renderizarResumen() {
  const poner = (id, texto) => { const el = document.getElementById(id); if (el) el.textContent = texto; };
  [['Hoy', 'hoy'], ['Semana', 'semana'], ['Mes', 'mes']].forEach(([nombre, periodo]) => {
    const f = facturacionDesde(inicioDe(periodo));
    poner(`kpi${nombre}Monto`, dinero(f.monto));
    poner(`kpi${nombre}Cant`, `${f.cantidad} venta${f.cantidad === 1 ? '' : 's'}`);
  });

  // Stock para atender: agotados primero, después los que se están por agotar
  const agotados = productosCache.filter((p) => p.stock === 0);
  const porAgotarse = productosCache.filter((p) => p.stock > 0 && p.stock <= UMBRAL_STOCK_BAJO).sort((a, b) => a.stock - b.stock);
  const contStock = document.getElementById('listaStock');
  if (contStock) {
    const filas = [
      ...agotados.map((p) => filaStock(p, 'Agotado', 'badge-sin-stock')),
      ...porAgotarse.map((p) => filaStock(p, `Quedan ${p.stock}`, 'badge-stock-bajo')),
    ];
    const MAX = 6;
    contStock.innerHTML = filas.length === 0
      ? '<p class="vacio-resumen">✔ Todo el stock está bien por ahora.</p>'
      : `<p class="resumen-conteo"><strong>${agotados.length}</strong> agotado${agotados.length === 1 ? '' : 's'} · <strong>${porAgotarse.length}</strong> por agotarse</p>`
        + filas.slice(0, MAX).join('')
        + (filas.length > MAX ? `<button type="button" class="btn-enlace-admin" data-ir-vista="productos">Ver ${filas.length - MAX} más en Productos →</button>` : '');
  }

  // Más vendidos
  document.querySelectorAll('#chipsTop [data-top]').forEach((b) => b.classList.toggle('activo', b.dataset.top === periodoTop));
  const ranking = rankingProductos(periodoTop);
  const contTop = document.getElementById('listaTop');
  if (contTop) {
    const max = ranking[0]?.unidades || 1;
    contTop.innerHTML = ranking.length === 0
      ? '<p class="vacio-resumen">Todavía no hay ventas en este período.</p>'
      : ranking.map((r, i) => `
          <div class="fila-top">
            <span class="fila-top-pos">${i + 1}</span>
            <div class="fila-top-info">
              <div class="fila-top-linea"><span>${escapar(r.nombre)}</span><strong>${r.unidades} u.</strong></div>
              <div class="barra-top"><span style="width:${Math.max(6, Math.round((r.unidades / max) * 100))}%"></span></div>
            </div>
          </div>`).join('');
  }
}

// ============================================================
// FILTROS DE VENTAS: atajos de fecha, resumen y limpiar
// ============================================================
const fechaLocalISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function marcarChipRango(rango) {
  document.querySelectorAll('#chipsRango [data-rango]').forEach((b) => b.classList.toggle('activo', b.dataset.rango === rango));
}

function aplicarRango(rango) {
  const hoy = new Date();
  let desde = '';
  let hasta = '';
  if (rango === 'hoy') { desde = hasta = fechaLocalISO(hoy); }
  if (rango === '7') { const d = new Date(); d.setDate(d.getDate() - 6); desde = fechaLocalISO(d); hasta = fechaLocalISO(hoy); }
  if (rango === 'mes') { desde = fechaLocalISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1)); hasta = fechaLocalISO(hoy); }
  if (rango === 'mes-pasado') { desde = fechaLocalISO(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)); hasta = fechaLocalISO(new Date(hoy.getFullYear(), hoy.getMonth(), 0)); }
  document.getElementById('filtroFechaDesde').value = desde;
  document.getElementById('filtroFechaHasta').value = hasta;
  marcarChipRango(rango);
  renderizarVentas();
}

function limpiarFiltrosVentas() {
  document.getElementById('filtroOrden').value = '';
  aplicarRango('todo');
}

function actualizarResumenFiltro(ventas) {
  const el = document.getElementById('resumenFiltroVentas');
  if (!el) return;
  const total = ventas.reduce((acc, v) => acc + (v.total || 0), 0);
  el.textContent = ventas.length === 0
    ? 'Sin ventas para este filtro'
    : `${ventas.length} venta${ventas.length === 1 ? '' : 's'} · Total ${dinero(total)}`;
}

// Código fijo de la venta (sale del número guardado en la base, no de la posición en la lista)
function codigoVenta(v) {
  return v.numero ? `V-${String(v.numero).padStart(4, '0')}` : `V-${String(v._id).slice(-4).toUpperCase()}`;
}

// ============================================================
// VALIDACIÓN DE FORMULARIOS (avisos claros, campo por campo)
// ============================================================
function etiquetaDe(campo) {
  const l = campo.id ? document.querySelector(`label[for="${campo.id}"]`) : null;
  return (l ? l.textContent : campo.placeholder || 'Campo').replace('*', '').replace(':', '').trim();
}

function limpiarErrorCampo(grupo) {
  grupo.classList.remove('campo-error');
  grupo.querySelector('.msg-campo-error')?.remove();
}

function marcarErrorCampo(campo, mensaje) {
  const grupo = campo.closest('.grupo-campo') || campo.parentElement;
  limpiarErrorCampo(grupo);
  grupo.classList.add('campo-error');
  campo.insertAdjacentHTML('afterend', `<small class="msg-campo-error">${mensaje}</small>`);
}

// Devuelve true si todo está bien. Si falta algo: marca cada campo, enfoca el primero y avisa cuáles faltan.
function validarFormulario(form) {
  form.querySelectorAll('.campo-error').forEach(limpiarErrorCampo);
  const faltan = [];
  let primero = null;
  form.querySelectorAll('[required]').forEach((campo) => {
    if (['file', 'checkbox'].includes(campo.type)) return;
    const valor = String(campo.value || '').trim();
    let mensaje = '';
    if (!valor) mensaje = 'Completá este campo';
    else if (campo.type === 'number' && campo.min !== '' && Number(valor) < Number(campo.min)) mensaje = `Tiene que ser ${campo.min} o más`;
    else if (campo.minLength > 0 && valor.length < campo.minLength) mensaje = `Mínimo ${campo.minLength} caracteres`;
    if (mensaje) {
      marcarErrorCampo(campo, mensaje);
      faltan.push(etiquetaDe(campo));
      primero = primero || campo;
    }
  });
  if (faltan.length > 0) {
    primero.focus();
    mostrarAviso(`Revisá: ${faltan.join(', ')}`, 'error');
    return false;
  }
  return true;
}
