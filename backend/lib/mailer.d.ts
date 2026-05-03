/** Envío genérico (resúmenes, avisos). Si no hay SMTP, usa jsonTransport como en desarrollo. */
export declare function enviarCorreoHtml(opts: {
    to: string[];
    subject: string;
    html: string;
    text: string;
}): Promise<void>;
export declare function enviarCorreoRecuperacion(destino: string, resetUrl: string): Promise<void>;
//# sourceMappingURL=mailer.d.ts.map