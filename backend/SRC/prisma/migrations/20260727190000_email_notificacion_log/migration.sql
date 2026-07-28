CREATE TABLE "email_notificacion_log" (
    "id" SERIAL NOT NULL,
    "tipo" VARCHAR(80) NOT NULL,
    "destinatario" VARCHAR(150) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "ok" SMALLINT NOT NULL,
    "detalle" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_notificacion_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_notificacion_log_created_at_idx" ON "email_notificacion_log"("created_at" DESC);
