"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.correoSmtpDisponible = correoSmtpDisponible;
exports.verificarConexionSmtp = verificarConexionSmtp;
exports.enviarCorreo = enviarCorreo;
exports.enviarCorreoRecuperacionPassword = enviarCorreoRecuperacionPassword;
exports.enviarCorreoPrueba = enviarCorreoPrueba;
const nodemailer_1 = __importDefault(require("nodemailer"));
const email_log_service_1 = require("./email-log.service");
function smtpConfigurado() {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
function correoSmtpDisponible() {
    return smtpConfigurado();
}
async function crearTransport() {
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    return nodemailer_1.default.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}
async function verificarConexionSmtp() {
    if (!smtpConfigurado()) {
        throw new Error('SMTP_NO_CONFIGURADO');
    }
    const transport = await crearTransport();
    await transport.verify();
}
async function enviarCorreo(opts) {
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
        await (0, email_log_service_1.registrarEmailLog)({
            tipo,
            destinatario: opts.to,
            subject: opts.subject,
            ok: true,
        });
    }
    catch (err) {
        const detalle = err instanceof Error ? err.message : String(err);
        await (0, email_log_service_1.registrarEmailLog)({
            tipo,
            destinatario: opts.to,
            subject: opts.subject,
            ok: false,
            detalle,
        });
        throw err;
    }
}
async function enviarCorreoRecuperacionPassword(opts) {
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
async function enviarCorreoPrueba(to) {
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
