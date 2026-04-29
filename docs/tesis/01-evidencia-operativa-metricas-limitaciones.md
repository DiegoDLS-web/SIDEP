# 1) Problema operativo y evidencia (métricas antes / después)

Este apartado está pensado para que lo **integres en el capítulo de resultados o evaluación** sin inventar cifras: rellenás con datos reales o declarás con claridad el **diseño esperado** cuando aún no hay mediciones.

---

## 1.1 Planteo del problema (texto base)

En compañías de bomberos, parte de la coordinación operativa y del registro institucional sigue apoyándose en **canales paralelos** (papel, hojas dispersas, mensajería informal). Eso puede generar:

- **Trabajo duplicado** (misma información en dos formatos).
- **Pérdida o desalineación** de datos entre quien despacha y quien documenta.
- **Consultas repetidas** por canales no estructurados (p. ej. “¿ya subió el parte?”, “¿qué unidad salió?”).

**SIDEP** concentra flujos digitales (partes, estadísticas, configuración de compañía según permisos, etc.) para **reducir fricción** y estandarizar registros. El impacto debe medirse con **indicadores explicitados a priori**, no solo con impresiones cualitativas.

---

## 1.2 Indicadores típicos que un tribunal espera ver

Puedes usar una tabla como la siguiente. **Si aún no hay pilotaje**, completá la columna “Método / fuente” y dejá valores en blanco o en “pendiente”, y explicá la limitación en §1.4.

| Indicador | Definición operativa | Antes (línea base) | Después (SIDEP) | Fuente de datos |
|-----------|----------------------|--------------------|------------------|-----------------|
| Tiempo medio de registro de un parte desde el cierre operativo | Desde “emergencia cerrada” hasta “parte cargado y visible” | | | Encuesta cronometrada / logs / formulario |
| Tasa de información incompleta | % partes con campos críticos vacíos o rechazados por oficialidad | | | Revisión muestral de N partes |
| Duplicidad percibida | Escala Likert 1–5 o número de reingresos manual del mismo dato | | | Cuestionario a N voluntarios |
| Consultas informales repetidas | Mensajes en grupo / preguntas repetidas por misma emergencia (difícil sin etnografía) | | | Entrevista semi-estructurada (cualitativo) |
| Satisfacción percibida del sistema | Likert o SUS simplificado | | | Encuesta post-demostración |

**Métricas plausibles sin pilotaje grande (para tesis piloto de software):**

- **Cobertura funcional:** porcentaje de requisitos definidos que el prototipo implementa (trazabilidad requisito → módulo → prueba manual o automática).
- **Defectos encontrados en pruebas:** lista priorizada (crítico / medio / bajo) durante N horas de testing estructurado.
- **Tiempo de tarea en laboratorio:** si medís a 3–5 personas con guión fijo (“crear parte ficticio”, “filtrar año X”), podés reportar **mediana** y rango, con N pequeño pero **protocolo repetible** (anexo con guión).

---

## 1.3 Cómo declarar limitaciones con honestidad metodológica (párrafos tipo)

Puedes usar variantes de estos textos según tu caso real:

> **Limitación 1 — Alcance del pilotaje.** La evaluación cuantitativa del impacto en tiempo operativo y reducción de errores no se realizó con todas las guardias de la compañía, sino en un entorno controlado (laboratorio / demo con datos ficticios o históricos anonimizados). Por ello, los valores no son extrapolables estadísticamente al conjunto de la institución.

> **Limitación 2 — Confundidores.** Durante el periodo de observación pueden coexistir otros cambios (capacitaciones, campañas internas) que afectan el comportamiento independientemente de SIDEP.

> **Limitación 3 — Privacidad.** No se recolectaron datos personales sensibles adicionales solo para la tesis sin consentimiento explícito institucional; donde hubo entrevistas, se anonimizaron roles y fechas en la memoria.

---

## 1.4 Entregable sugerido para tu memoria

Incluir una **subsección titulada**: *“Diseño de evaluación futura (post-memoria)”* con:

1. Población objetivo (roles, N mínimo aspiracional).
2. Métricas primarias y secundarias (tabla arriba).
3. Criterio de éxito (ej. “mediana de tiempo de registro ≤ X minutos” con justificación).
4. Ética y consentimiento informal institucional.

---

*Documento de apoyo SIDEP — adaptable al capítulo de método y resultados.*
