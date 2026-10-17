const CONFIG = { API_URL: (['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://localhost:3000' : '') + '/api' };

let token = localStorage.getItem('pretta_token') || null;
let productosCache = [];
let ventasCache = [];
let idVentaEditando = null;
let datosCache = null;
let productoEditandoId = null; 
const MAX_IMAGENES_PRODUCTO = 5;

function toggleModal(idModal, idFondo, mostrar) {
  document.getElementById(idModal)?.classList.toggle('visible', mostrar);
  document.getElementById(idFondo)?.classList.toggle('visible', mostrar);
}

function authHeaders() {
  return { Authorization: `Bearer ${token}` };
}

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

function mostrarAviso(texto, tipo = 'ok') {
  const aviso = document.querySelector('[data-aviso]');
  if (!aviso) return;
  aviso.querySelector('span:last-child').textContent = texto;
  aviso.classList.toggle('aviso-error', tipo === 'error');
  aviso.classList.add('visible');
  clearTimeout(mostrarAviso._temporizador);
  mostrarAviso._temporizador = setTimeout(() => aviso.classList.remove('visible'), tipo === 'error' ? 4200 : 2600);
}

function avisarError(err) {
  if (err.message !== '401') mostrarAviso(err.message, 'error');
}

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

  ['filtroFechaDesde', 'filtroFechaHasta', 'filtroOrden']
    .forEach((id) => document.getElementById(id)?.addEventListener('change', renderizarVentas));

  document.getElementById('btnGenerarPDF')?.addEventListener('click', exportarPDFVentas);

  const btnAgregar = document.getElementById('btnAgregarLineaVenta');
  if (btnAgregar) {
    btnAgregar.type = 'button';
    btnAgregar.addEventListener('click', (ev) => { ev.preventDefault(); agregarLineaVenta(); });
  }
});

async function manejarLogin(ev) {
  ev.preventDefault();
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
  cargarProductosAdmin();
  cargarVentasAdmin();
  cargarConfiguracionAdmin();
}

async function cargarProductosAdmin() {
  try {
    productosCache = await fetchProtegido(`${CONFIG.API_URL}/productos/admin/todos`);
    renderizarProductos();
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
    else if (p.stock < 3) estadoBadge = '<span class="badge badge-stock-bajo">Stock bajo</span>';

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
    mostrarAviso(activar ? 'Producto visibilizado' : 'Producto ocultado');
    cargarProductosAdmin();
  } catch (err) {
    avisarError(err);
  }
}

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

let urlsPendientes = []; 

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

function reemplazarProductoEnCache(actualizado) {
  const i = productosCache.findIndex((p) => p._id === actualizado._id);
  if (i >= 0) productosCache[i] = actualizado;
  renderizarProductos();
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

async function cargarVentasAdmin() {
  try {
    ventasCache = await fetchProtegido(`${CONFIG.API_URL}/ventas`);
    renderizarVentas();
  } catch (err) {
    if (err.message === '401') return;
    console.error(err);
    const tbody = document.getElementById('tablaVentasBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="texto-centro">Sin ventas registradas.</td></tr>`;
  }
}
const COMPARADORES_ORDEN_VENTA = {
  fecha_desc: (a, b) => new Date(b.createdAt) - new Date(a.createdAt), 
  fecha_asc: (a, b) => new Date(a.createdAt) - new Date(b.createdAt), 
  total_desc: (a, b) => b.total - a.total, 
  total_asc: (a, b) => a.total - b.total, 
};

function obtenerVentasFiltradas() {
  let ventas = [...ventasCache];

  const fDesde = document.getElementById('filtroFechaDesde')?.value;
  const fHasta = document.getElementById('filtroFechaHasta')?.value;
  const orden = document.getElementById('filtroOrden')?.value;

  if (fDesde) ventas = ventas.filter((v) => new Date(v.createdAt) >= new Date(fDesde));
  if (fHasta) {
    const h = new Date(fHasta);
    h.setHours(23, 59, 59);
    ventas = ventas.filter((v) => new Date(v.createdAt) <= h);
  }

  ventas.sort(COMPARADORES_ORDEN_VENTA[orden] || COMPARADORES_ORDEN_VENTA.fecha_desc);

  return ventas;
}

function renderizarVentas() {
  const tbody = document.getElementById('tablaVentasBody');
  const ventas = obtenerVentasFiltradas();

  if (ventas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="texto-centro">No hay ventas registradas.</td></tr>`;
    return;
  }

  tbody.innerHTML = ventas.map((v, i) => {
    const cod = `V-${(i + 1).toString().padStart(4, '0')}`;
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
    mostrarAviso('Por favor, seleccioná al menos un producto válido');
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

function abrirModalPass() {
  document.getElementById('formCambiarPass').reset();
  toggleModal('modalPass', 'fondoModalPass', true);
}

function cerrarModalPass() {
  toggleModal('modalPass', 'fondoModalPass', false);
}

async function cambiarPassword(ev) {
  ev.preventDefault();
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
    const cod = `V-${(index + 1).toString().padStart(4, '0')}`;
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

let imagenConfigSeleccionada = null;

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

  const mensajes = leerMensajesConfig();
  if (mensajes.length === 0) {
    mostrarAviso('Agregá al menos 1 mensaje');
    return;
  }

  const formData = new FormData();
  formData.append('titulo', document.getElementById('cfgTitulo').value);
  formData.append('subtitulo', document.getElementById('cfgSubtitulo').value);
  formData.append('whatsappNumero', document.getElementById('cfgWhatsapp').value);
  formData.append('instagramUrl', document.getElementById('cfgInstagram').value);
  formData.append('facebookUrl', document.getElementById('cfgFacebook').value);
  formData.append('mensajes', JSON.stringify(mensajes));

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
