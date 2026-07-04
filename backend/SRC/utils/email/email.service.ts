import nodemailer from 'nodemailer';

type EnviarCorreoOpts = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function smtpConfigurado(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function correoSmtpDisponible(): boolean {
  return smtpConfigurado();
}

async function crearTransport() {
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function enviarCorreo(opts: EnviarCorreoOpts): Promise<void> {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@sidep.local';

  if (!smtpConfigurado()) {
    throw new Error('SMTP_NO_CONFIGURADO');
  }

  const transport = await crearTransport();
  await transport.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html ?? opts.text.replace(/\n/g, '<br>'),
  });
}

export async function enviarCorreoRecuperacionPassword(opts: {
  to: string;
  nombre: string;
  link: string;
}): Promise<void> {
  const subject = 'Restablecer contraseña · SIDEP';
  const text = [
    `Hola ${opts.nombre},`,
    '',
    'Recibimos una solicitud para restablecer tu contraseña en SIDEP.',
    'Si fuiste tú, abre este enlace (válido por 2 horas):',
    opts.link,
    '',
    'Si no solicitaste este cambio, ignora este correo.',
  ].join('\n');

  await enviarCorreo({
    to: opts.to,
    subject,
    text,
    html: `<p>Hola ${opts.nombre},</p>
<p>Recibimos una solicitud para restablecer tu contraseña en SIDEP.</p>
<p><a href="${opts.link}">Restablecer contraseña</a></p>
<p>El enlace expira en 2 horas. Si no solicitaste este cambio, ignora este correo.</p>`,
  });
}
