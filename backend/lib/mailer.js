"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enviarCorreoHtml = enviarCorreoHtml;
exports.enviarCorreoRecuperacion = enviarCorreoRecuperacion;
const nodemailer_1 = __importDefault(require("nodemailer"));
function crearTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (host && user && pass) {
        return nodemailer_1.default.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
        });
    }
    return nodemailer_1.default.createTransport({ jsonTransport: true });
}
/** Envío genérico (resúmenes, avisos). Si no hay SMTP, usa jsonTransport como en desarrollo. */
async function enviarCorreoHtml(opts) {
    const to = [...new Set(opts.to.map((x) => x.trim()).filter(Boolean))];
    if (!to.length) {
        return;
    }
    const from = process.env.SMTP_FROM || 'no-reply@sidep.local';
    const transporter = crearTransporter();
    const info = await transporter.sendMail({
        from,
        to: to.join(', '),
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
    });
    if (info.message) {
        // eslint-disable-next-line no-console
        console.log('Correo HTML (dev):', info.message);
    }
}
async function enviarCorreoRecuperacion(destino, resetUrl) {
    const from = process.env.SMTP_FROM || 'no-reply@sidep.local';
    const transporter = crearTransporter();
    const info = await transporter.sendMail({
        from,
        to: destino,
        subject: 'SIDEP - Recuperación de contraseña',
        text: `Recibimos una solicitud para restablecer tu contraseña.\n\nUsa este enlace:\n${resetUrl}\n\nSi no fuiste tú, ignora este mensaje.`,
        html: `<p>Recibimos una solicitud para restablecer tu contraseña.</p><p><a href="${resetUrl}">Restablecer contraseña</a></p><p>Si no fuiste tú, ignora este mensaje.</p>`,
    });
    if (info.message) {
        // Salida útil en modo desarrollo (jsonTransport).
        // eslint-disable-next-line no-console
        console.log('Correo recuperación (dev):', info.message);
    }
}
//# sourceMappingURL=mailer.js.map