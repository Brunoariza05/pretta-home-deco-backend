const ASUNTO = 'Tu código para cambiar la clave — Pretta Home Deco';

function armarMensaje(codigo) {
  const texto =
    `Tu código para cambiar la clave del panel de Pretta Home Deco es: ${codigo}\n\n` +
    'Vence en 10 minutos. Si no lo pediste vos, ignorá este mensaje.';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #ddcdaf;border-radius:12px;color:#3e2e22">
      <h2 style="margin:0 0 8px;color:#7e9a72">Pretta Home Deco</h2>
      <p>Tu código para cambiar la clave del panel es:</p>
      <p style="font-size:34px;letter-spacing:8px;font-weight:bold;text-align:center;margin:18px 0">${codigo}</p>
      <p style="font-size:13px;color:#7a6a5c">Vence en 10 minutos. Si no lo pediste vos, ignorá este mensaje.</p>
    </div>`;
  return { texto, html };
}

async function enviarPorBrevo(destino, codigo) {
  const { texto, html } = armarMensaje(codigo);
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Pretta Home Deco', email: process.env.MAIL_REMITENTE },
      to: [{ email: destino }],
      subject: ASUNTO,
      htmlContent: html,
      textContent: texto,
    }),
  });
  if (!res.ok) throw new Error(`Brevo respondió ${res.status}: ${await res.text()}`);
}

async function enviarPorGmail(destino, codigo) {
  const nodemailer = require('nodemailer');
  const { texto, html } = armarMensaje(codigo);
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.MAIL_USER, pass: (process.env.MAIL_APP_PASSWORD || '').replace(/\s+/g, '') },
  });
  await transporter.sendMail({
    from: `"Pretta Home Deco" <${process.env.MAIL_USER}>`,
    to: destino,
    subject: ASUNTO,
    text: texto,
    html,
  });
}

exports.enviarCodigoRecuperacion = (destino, codigo) => {
  if (process.env.BREVO_API_KEY) return enviarPorBrevo(destino, codigo);
  if (process.env.MAIL_USER && process.env.MAIL_APP_PASSWORD) return enviarPorGmail(destino, codigo);
  return Promise.reject(new Error('Falta configurar el envío de mails en el .env (BREVO_API_KEY o MAIL_USER + MAIL_APP_PASSWORD)'));
};
