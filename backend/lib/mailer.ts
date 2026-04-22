import nodemailer from 'nodemailer';

function crearTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return nodemailer.createTransport({ jsonTransport: true });
}

export async function enviarCorreoRecuperacion(destino: string, resetUrl: string): Promise<void> {
  const from = process.env.SMTP_FROM || 'no-reply@sidep.local';
  const transporter = crearTransporter();
  const info = await transporter.sendMail({
    from,
    to: destino,
    subject: 'SIDEP - Recuperación de contraseña',
    text: `Recibimos una solicitud para restablecer tu contraseña.\n\nUsa este enlace:\n${resetUrl}\n\nSi no fuiste tú, ignora este mensaje.`,
    html: `<p>Recibimos una solicitud para restablecer tu contraseña.</p><p><a href="${resetUrl}">Restablecer contraseña</a></p><p>Si no fuiste tú, ignora este mensaje.</p>`,
  });
  if ((info as { message?: string }).message) {
    // Salida útil en modo desarrollo (jsonTransport).
    // eslint-disable-next-line no-console
    console.log('Correo recuperación (dev):', (info as { message?: string }).message);
  }
}
