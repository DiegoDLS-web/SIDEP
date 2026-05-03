"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.iniciarProgramadorResumenDiario = iniciarProgramadorResumenDiario;
const prisma_js_1 = require("./prisma.js");
const mailer_js_1 = require("./mailer.js");
const configuraciones_js_1 = require("../routes/configuraciones.js");
/** Evita doble envío si el tick cae varias veces entre 08:00 y 08:59 (Santiago). */
let ultimaClaveEnvioSantiago = '';
function claveDiaSantiago(d) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(d);
}
function horaSantiago(d) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Santiago',
        hour: 'numeric',
        hourCycle: 'h23',
    }).formatToParts(d);
    return Number(parts.find((p) => p.type === 'hour')?.value ?? -1);
}
function iniciarProgramadorResumenDiario() {
    const tickMs = 60_000;
    setInterval(() => {
        void tickResumenDiario().catch((e) => {
            // eslint-disable-next-line no-console
            console.error('SIDEP resumen diario email:', e);
        });
    }, tickMs);
}
async function tickResumenDiario() {
    const cfg = await (0, configuraciones_js_1.obtenerConfigSistema)();
    if (!cfg.notificaciones.resumenDiarioEmail) {
        ultimaClaveEnvioSantiago = '';
        return;
    }
    const now = new Date();
    if (horaSantiago(now) !== 8) {
        return;
    }
    const hoyKey = claveDiaSantiago(now);
    if (ultimaClaveEnvioSantiago === hoyKey) {
        return;
    }
    const destinos = [
        ...String(cfg.compania.emailInstitucional ?? '')
            .split(/[;,]/)
            .map((s) => s.trim())
            .filter(Boolean),
        ...String(process.env.SIDEP_RESUMEN_EMAIL_EXTRA ?? '')
            .split(/[;,]/)
            .map((s) => s.trim())
            .filter(Boolean),
    ];
    if (!destinos.length) {
        // eslint-disable-next-line no-console
        console.warn('SIDEP: resumenDiarioEmail activo pero sin correos destino (email institucional vacío ni SIDEP_RESUMEN_EMAIL_EXTRA).');
        return;
    }
    const rows = await prisma_js_1.prisma.$queryRaw `
    SELECT id, correlativo, "claveEmergencia", estado, direccion
    FROM "ParteEmergencia"
    WHERE (timezone('America/Santiago', "fecha"))::date =
      (timezone('America/Santiago', now()))::date - interval '1 day'
    ORDER BY "fecha" DESC
    LIMIT 60
  `;
    const ayer = new Date(now);
    ayer.setUTCDate(ayer.getUTCDate() - 1);
    const fechaTxt = new Intl.DateTimeFormat('es-CL', {
        timeZone: 'America/Santiago',
        dateStyle: 'long',
    }).format(ayer);
    const compania = cfg.compania.nombreCompania || 'Compañía';
    const total = rows.length;
    const listaHtml = total > 0
        ? `<ul style="padding-left:18px">${rows
            .slice(0, 25)
            .map((r) => `<li><b>${escapeHtml(r.correlativo)}</b> — ${escapeHtml(r.claveEmergencia)} — ${escapeHtml(r.estado)}<br/><span style="color:#555">${escapeHtml(r.direccion)}</span></li>`)
            .join('')}</ul>${total > 25 ? `<p>… y ${total - 25} más.</p>` : ''}`
        : '<p>Sin partes cerrados ese día según fecha de parte (zona horaria Chile).</p>';
    const html = `
  <h2 style="font-family:system-ui,sans-serif">Resumen diario SIDEP</h2>
  <p style="font-family:system-ui,sans-serif"><strong>${escapeHtml(compania)}</strong></p>
  <p style="font-family:system-ui,sans-serif">Día cubierto (Chile): <strong>${escapeHtml(fechaTxt)}</strong></p>
  <p style="font-family:system-ui,sans-serif">Total partes: <strong>${total}</strong></p>
  ${listaHtml}
  <p style="color:#888;font-size:12px;font-family:system-ui,sans-serif">Generado automáticamente por SIDEP.</p>
  `;
    const text = [
        `Resumen SIDEP — ${compania}`,
        `Día: ${fechaTxt}`,
        `Total partes: ${total}`,
        ...rows.slice(0, 30).map((r) => `- ${r.correlativo} ${r.claveEmergencia} ${r.estado}`),
    ].join('\n');
    await (0, mailer_js_1.enviarCorreoHtml)({
        to: destinos,
        subject: `SIDEP · Resumen diario (${fechaTxt})`,
        html,
        text,
    });
    ultimaClaveEnvioSantiago = hoyKey;
}
function escapeHtml(s) {
    return (s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
//# sourceMappingURL=resumen-diario-email.js.map