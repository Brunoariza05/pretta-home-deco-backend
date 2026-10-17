const API_URL = (['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://localhost:3000' : '') + '/api';
const ESPERA_REENVIO_SEG = 60;

let emailActual = '';
let resetToken = '';
let temporizador = null;

const $ = (id) => document.getElementById(id);
const PASOS = ['formEmail', 'formCodigo', 'formNuevaClave', 'pasoExito'];

function mostrarPaso(id) {
  PASOS.forEach((p) => { $(p).hidden = (p !== id); });
  mostrarMensaje('');
}

function mostrarMensaje(texto, tipo = 'error') {
  const m = $('mensajeRecuperar');
  m.textContent = texto;
  m.className = 'mensaje-recuperar' + (texto ? ' ' + tipo : '');
}

async function pedir(ruta, cuerpo) {
  const res = await fetch(`${API_URL}/recuperacion/${ruta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ocurrió un error. Probá de nuevo.');
  return data;
}

async function conBoton(form, accion) {
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try { await accion(); } catch (err) { mostrarMensaje(err.message); } finally { btn.disabled = false; }
}

function iniciarEsperaReenvio() {
  const btn = $('btnReenviar');
  let restante = ESPERA_REENVIO_SEG;
  clearInterval(temporizador);
  btn.disabled = true;
  btn.textContent = `Reenviar código (${restante}s)`;
  temporizador = setInterval(() => {
    restante -= 1;
    if (restante <= 0) {
      clearInterval(temporizador);
      btn.disabled = false;
      btn.textContent = 'Reenviar código';
    } else {
      btn.textContent = `Reenviar código (${restante}s)`;
    }
  }, 1000);
}

async function enviarCodigo() {
  const data = await pedir('solicitar', { email: emailActual });
  $('recEmailMostrado').textContent = emailActual;
  mostrarPaso('formCodigo');
  mostrarMensaje(data.mensaje, 'ok');
  iniciarEsperaReenvio();
  $('recCodigo').focus();
}

document.addEventListener('DOMContentLoaded', () => {
  $('formEmail').addEventListener('submit', (ev) => {
    ev.preventDefault();
    emailActual = $('recEmail').value.trim().toLowerCase();
    conBoton(ev.target, enviarCodigo);
  });

  $('btnReenviar').addEventListener('click', async () => {
    try { await enviarCodigo(); } catch (err) { mostrarMensaje(err.message); }
  });

  $('recCodigo').addEventListener('input', (ev) => {
    ev.target.value = ev.target.value.replace(/\D/g, '').slice(0, 6); 
  });

  $('formCodigo').addEventListener('submit', (ev) => {
    ev.preventDefault();
    conBoton(ev.target, async () => {
      const data = await pedir('verificar', { email: emailActual, codigo: $('recCodigo').value });
      resetToken = data.resetToken;
      clearInterval(temporizador);
      mostrarPaso('formNuevaClave');
      $('recClaveNueva').focus();
    });
  });

  $('formNuevaClave').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const nueva = $('recClaveNueva').value;
    if (nueva !== $('recClaveRepetida').value) return mostrarMensaje('Las dos claves no coinciden');
    conBoton(ev.target, async () => {
      await pedir('cambiar', { resetToken, nuevaPassword: nueva });
      resetToken = '';
      mostrarPaso('pasoExito');
    });
  });
});
