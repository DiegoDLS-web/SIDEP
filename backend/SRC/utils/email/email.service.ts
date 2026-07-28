import nodemailer from 'nodemailer';
import { registrarEmailLog } from './email-log.service';

type EnviarCorreoOpts = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  tipo?: string;
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

export async function verificarConexionSmtp(): Promise<void> {
  if (!smtpConfigurado()) {
    throw new Error('SMTP_NO_CONFIGURADO');
  }
  const transport = await crearTransport();
  await transport.verify();
}

export async function enviarCorreo(opts: EnviarCorreoOpts): Promise<void> {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@sidep.local';
  const tipo = opts.tipo ?? 'generico';

  if (!smtpConfigurado()) {
    throw new Error('SMTP_NO_CONFIGURADO');
  }

  const transport = await crearTransport();
  try {
    await transport.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html ?? opts.text.replace(/\n/g, '<br>'),
    });
    await registrarEmailLog({
      tipo,
      destinatario: opts.to,
      subject: opts.subject,
      ok: true,
    });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : String(err);
    await registrarEmailLog({
      tipo,
      destinatario: opts.to,
      subject: opts.subject,
      ok: false,
      detalle,
    });
    throw err;
  }
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
    tipo: 'recuperar-password',
    html: `<p>Hola ${opts.nombre},</p>
<p>Recibimos una solicitud para restablecer tu contraseña en SIDEP.</p>
<p><a href="${opts.link}">Restablecer contraseña</a></p>
<p>El enlace expira en 2 horas. Si no solicitaste este cambio, ignora este correo.</p>`,
  });
}

export async function enviarCorreoPrueba(to: string): Promise<void> {
  const generado = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
  await enviarCorreo({
    to,
    subject: 'Prueba SMTP · SIDEP',
    text: [
      'Este es un correo de prueba del sistema SIDEP.',
      '',
      `Generado: ${generado}`,
      '',
      'Si recibiste este mensaje, el envío SMTP está operativo.',
      '',
      '— SIDEP',
    ].join('\n'),
    tipo: 'prueba-smtp',
  });
}
