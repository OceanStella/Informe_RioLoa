# Informe Octavio — Original vs V2

Documento de comparación para otra IA. No interpreta diferencias visuales como regresiones. El código de negocio (cálculos, validación, PDF, backend, API) se comparó por hash SHA-256: **idéntico** entre ambas carpetas.

## 1. Proyectos analizados

Original:

`../Informe_Octavio`

equivalente a `React/Informe_Octavio`

V2:

`./`

equivalente a `React/Informe_Octavio_v2`

Fecha de esta comparación: 2026-11-01.

Ignorado en la comparación: `node_modules`, `dist`, `server-dist`, `.git`, logs, caches, artefactos de build.

## 2. Arquitectura original

Aplicación React 19 + Vite 8 + TypeScript, con backend Express en el mismo repositorio.

- Frontend: un único `ReportApp` con estado en `ReportContext` (`useReducer` / `reportReducer`) y configuración en `ConfigContext` (GET `/api/config`).
- UI original: CSS plano (`src/App.css`), header simple, cards, grids de 2 columnas, badges Info+Check.
- Backend: `server/index.ts` sirve API (`/api/reports`, `/api/config`, `/api/admin`) y, en producción, el `dist` estático.
- Persistencia Admin: `CONFIG_STORAGE=gcs` + bucket + `CONFIG_OBJECT=config.json`, o JSON local en desarrollo.
- PDF: `@react-pdf/renderer` (`src/pdf/*`).
- Email: Nodemailer, SMTP vía env/secretos, endpoint `POST /api/reports/send` con PDF adjunto.
- Deploy: Cloud Run `informe-octavio`, región `southamerica-west1`, proyecto `pokemic`.

## 3. Arquitectura V2

Misma arquitectura de runtime. El Dockerfile, `vite.config.ts`, `tsconfig*`, `server/*` y `src/pdf/*` son **byte-a-byte idénticos** al Original.

Lo que cambia es la **capa de presentación**:

- Shell: sidebar fija (desktop ≥1200px) + topbar + KPIs + panel de generación.
- Tokens en `src/styles/tokens.css`, fuente Plus Jakarta Sans.
- Componentes UI nuevos: `AppSidebar`, `TopBar`, `StepNav`, `KpiStrip`, `ProgressRing`, `SectionHeader`, `StatusChip`, `EquipmentOption`, `CollapseToggle`.
- Admin: mismas operaciones CRUD, presentadas como pestañas (una lista visible a la vez).
- Heurística de avance del sidebar (`reportOverview.ts`): **solo presentación**, no altera `validateReport` ni el PDF.

Producción V2: Cloud Run **`informe-octavio-v2`**, mismo bucket GCS, objeto **`config-v2.json`**.

## 4. Paridad funcional

| Funcionalidad | Original | V2 | Estado | Comentario |
|---|---|---|---|---|
| Fecha | Sí | Sí | IGUAL | `general.date`, mismo `data-field` y handler |
| Supervisor | Sí | Sí | IGUAL | |
| Área / poza (antecedentes) | Sí | Sí | IGUAL | Select desde `config.generalAreas` |
| APR / Responsable | Sí | Sí | IGUAL | |
| Campo Administrativo en el formulario | No | No | IGUAL | Solo aparece hardcodeado en el PDF (“Octavio Waiz”) en **ambas** versiones |
| Dotación: camiones checkbox | Sí | Sí | IGUAL | `SELECT_ROSTER_EQUIPMENT` / `UNSELECT_ROSTER_EQUIPMENT` |
| Dotación: maquinaria checkbox | Sí | Sí | IGUAL | |
| Operador / horómetros / KM en Dotación | Sí | Sí | IGUAL | Mismos `id` `roster-<id>-<campo>` y `data-field` |
| Indicador equipo completo | Info+Check | Info+Check | MODIFICADO INTENCIONALMENTE | Mismo significado y tooltip; estilo V2 (teal + check verde). Tap/focus además de hover |
| Tooltip Dotación | Sí | Sí | IGUAL | Texto generado por `formatRosterTooltip` (archivo idéntico) |
| Minimizar / expandir fichas | Sí | Sí | IGUAL | Acciones `TOGGLE_ROSTER` / `TOGGLE_EQUIPMENT` / `TOGGLE_ACTIVITY` |
| Actividad 1 Watermaster | Sí | Sí | IGUAL | `kind: 'watermaster'` |
| Actividades adicionales | Sí | Sí | IGUAL | `ADD_ACTIVITY` / `REMOVE_ACTIVITY` |
| Poza/área y tipo de actividad | Sí | Sí | IGUAL | Incluye “Otro” + campo custom |
| Descripción | Sí | Sí | IGUAL | No es obligatoria en `validateReport` (ambas) |
| Equipos por actividad | Sí | Sí | IGUAL | |
| Equipos de apoyo | Sí | Sí | IGUAL | Texto libre, opcional |
| Herencia desde Dotación | Sí | Sí | IGUAL | `resolveEquipmentOperationalData` idéntico; campos read-only/computed |
| Reutilizar el mismo equipo en varias actividades | Sí | Sí | IGUAL | |
| Cambio en Dotación se refleja en actividades | Sí | Sí | IGUAL | No hay copia de estado operativo |
| Vueltas × capacidad = Total M³ | Sí | Sí | IGUAL | `calculateTruckM3` |
| Horas de operación / KM recorridos | Sí | Sí | IGUAL | `subtractMetrics` |
| M³ maquinaria (reparto) | Sí | Sí | IGUAL | `calculateMachineryShareM3` |
| Watermaster m³ y rendimiento | Sí | Sí | IGUAL | |
| Validación >12 h y KM invertidos | Sí | Sí | IGUAL | `validation.ts` / `roster.ts` idénticos |
| Errores no aparecen al cargar | Sí | Sí | IGUAL | `collectLiveErrors` solo mensajes live |
| Errores al generar/descargar + scroll + autoexpand | Sí | Sí | IGUAL | Handlers de `App.tsx` copiados; `scrollToField` / `validationExpand` idénticos |
| Fotos Antes / Después | Sí | Sí | IGUAL | Preview, reemplazar, eliminar |
| PDF | Sí | Sí | IGUAL | Toda `src/pdf/` idéntica |
| Email modal + regex + adicionales | Sí | Sí | IGUAL | `emailValidation.ts` y ruta `POST /api/reports/send` idénticos |
| Admin login + CRUD | Sí | Sí | MODIFICADO INTENCIONALMENTE | Misma API y persistencia; UI en pestañas |
| GET `/api/config` y PUT admin | Sí | Sí | IGUAL | Backend idéntico |
| Cloud Storage | Sí | Sí | MODIFICADO INTENCIONALMENTE | **Mismo bucket**, objeto distinto (`config-v2.json`) para no pisar Original |
| Sidebar de progreso / “lista” | No | Sí | NUEVO EN V2 | Heurística `isActivityReady`; no bloquea envío si `validateReport` pasa |
| KPIs, topbar, panel generar oscuro | No | Sí | NUEVO EN V2 | Solo presentación |
| Diseño desktop V2 | No | Sí | NUEVO EN V2 | Rediseño deliberado |

## 5. Cálculos

Archivos `src/utils/calculations.ts`, `src/utils/metrics.ts` y `src/utils/roster.ts`: **IDENTICAL**.

Fórmulas (iguales en Original y V2):

- Diferencia: `end - start` (`subtractMetrics`). Vacío → `null`.
- Horas draga / bomba / camión / maquinaria: la misma diferencia.
- Máximo 12 horas: `diff > MAX_HOURMETER_HOURS` (12) → mensaje live; `diff < 0` → orden inválido.
- KM: misma resta; KM final < inicial → error.
- Camión M³: `vueltas * capacidad`. Capacidad desde `config.equipment[].capacityM3` o fallback **18**.
- Total M³ actividad (camiones): suma de asignaciones truck.
- M³ maquinaria: `totalCamionesActividad / cantidadMaquinaria` si ambos > 0.
- Watermaster M³: `rendimientoFabricante * horasEfectivasDraga` si horas > 0.
- Rendimiento horario real: `totalM3 / horasEfectivas`.
- PDF Watermaster: se incluye si hay horómetro inicial y final de draga (`shouldIncludeWatermasterReport`).

No hay cambio de fórmula en V2.

## 6. Dotación activa

Misma selección por checkbox, mismas fichas, mismos campos.

Diferencias de presentación V2:

- Tiles `.equipment-option` con borde teal al seleccionar.
- Badge Info+Check (22–28px) con tooltip portal.
- StatusChip “Completo” / “Pendiente” en el header de ficha.
- Layout 3 columnas en desktop; 1 columna bajo 1024px.

Contratos DOM conservados: `id="roster-<equipmentId>"`, `data-field="roster.<id>.*"`.

## 7. Actividades

Misma máquina de estados (`ADD/REMOVE/UPDATE/TOGGLE_ACTIVITY`, `SELECT/UNSELECT_EQUIPMENT`).

V2 añade:

- `activity-index` visual (01, 02…).
- `SectionHeader` con “Paso N de 5”.
- Heurística de “lista” en el sidebar: poza+tipo, ≥1 equipo, vueltas > 0 en cada camión, y en Watermaster sector/operador/profundidad/dureza + m³ calculable. Descripción y fotos **no** entran. Esto **no** cambia `validateReport`.

Orden visual Watermaster: V2 coloca Profundidad junto a Operador (en Original iba más abajo). Mismos `data-field`. Cambio de layout, no de datos.

## 8. Watermaster

Campos idénticos: sector, operador, horómetros draga/bomba, profundidad, dureza 25/50/75/100, rendimiento fabricante, totales calculados.

PDF: página extra solo si hay horómetros de draga. Archivos PDF idénticos.

Botones de dureza: 44px, `button.hardness-btn`, clases `hardness-25/50/75/100` (el scroll-to-error las busca).

## 9. Camiones

En actividad, datos operativos son computed/inherited desde Dotación. Editable: N° de vueltas. Total M³ highlight.

`TruckAssignmentCard` V2 envuelve collapse en un solo árbol (clase `is-collapsed`) en lugar de dos returns; mismos dispatch y `data-field`.

## 10. Maquinaria

Operador, zona, horómetros, horas, M³ asociado (reparto). Sin vueltas. Igual en datos.

## 11. PDF

`src/pdf/**` IDENTICAL, incluido `pdf.tsx`.

Contenido:

1. Portada: header logo, título, Área de Pozas, fecha, antecedentes (Supervisor, Administrativo hardcodeado, APR), detalle de actividades, footer.
2. Páginas Watermaster condicionales.
3. Tabla camiones (y gráfico de producción si `PdfMachineryTable` lo activa).
4. Tabla maquinaria.
5. Registro fotográfico.

No se rediseñó el PDF en V2.

## 12. Email

`SendReportModal`, `emailValidation.ts`, `sendReport.ts`, `server/routes/reports.ts`, `server/services/emailService.ts`: idénticos en lógica (el modal V2 solo cambia clases CSS / iconos).

- Destinatario obligatorio + regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`.
- Adicionales, duplicados, quitar fila.
- `POST /api/reports/send` multipart PDF ≤ 15 MB.
- `EMAIL_MODE=mock` existe en código; **Original y V2 en Cloud Run no lo setean** (SMTP real).

En Cloud Run, el log `Email SMTP verification failed` aparece **también en Original** al arrancar. El servicio igual marca `Email service: configured` si hay `SMTP_USER` + `SMTP_PASS`. No se envió correo real en esta tarea.

## 13. Administración

Backend `server/routes/admin.ts`, auth JWT/cookie, CRUD: **idénticos**.

UI V2:

- Pestañas: Pozas generales, Pozas de actividades, Camiones Tolva, Maquinaria.
- Una tabla visible. Sidebar y tabs sincronizan el mismo estado.
- Acciones Editar / Eliminar / Agregar iguales.

## 14. Cloud Storage / configuración

Código `server/config/configStore.ts` idéntico. El objeto lo define `CONFIG_OBJECT`.

| | Original | V2 |
|---|---|---|
| `CONFIG_STORAGE` | `gcs` | `gcs` |
| `CONFIG_BUCKET` | `pokemic-127635471462-informe-octavio-config` | **el mismo** |
| `CONFIG_OBJECT` | `config.json` | `config-v2.json` |
| Desarrollo local | `config/local-config.json` | `config/local-config.json` |

`config-v2.json` se creó el 2026-11-01 como **copia** de `config.json`. No se sobrescribió el original (`config.json` sigue con timestamp 2026-10-29).

GET `/api/config` responde 200 en ambos servicios. Longitud de payload cloud: 3221 bytes (misma copia inicial).

## 15. Diferencias UI/UX

Concretas en V2 (intencionales):

- Sidebar 292px teal oscuro, logo original en placa blanca, tarjeta de turno, anillo de avance, 5 pasos con meta en vivo, botón Admin.
- Topbar sticky: título, estado, acceso Admin (móvil), Generar.
- KPIs: equipos, actividades, m³ camiones, m³ Watermaster.
- Paleta: marca `#195A64` / `#0091C7` + aqua / arena / coral.
- Tipografía Plus Jakarta Sans (Original usa el stack del sistema / CSS previo).
- Panel final de generación oscuro con textura de curvas de nivel (`contours.svg`).
- Admin por pestañas.
- Dependencia extra: `@fontsource/plus-jakarta-sans`.

## 16. Responsive

Auditoría real con Edge headless sobre `http://localhost:5173/` en:

1440×900, 1280×800, 1024×768, 768×1024, 430×932, 390×844, 375×812.

### Resultado por viewport

| Viewport | Scroll horizontal de página | Notas |
|---|---|---|
| 1440×900 | No (`scrollWidth === clientWidth`) | Sidebar + 4 KPIs + forms 4/3 col. Diseño desktop aprobado |
| 1280×800 | No | Sidebar sigue visible (≥1200). OK |
| 1024×768 | No | Sidebar oculta; logo en topbar; antecedentes 2×2 |
| 768×1024 | No | Horómetros / KM / vueltas en 1 columna; dureza 2×2; fotos 2 col |
| 430 / 390 / 375 | No | 1 columna; KPIs 2×2; título en 2 líneas; equipos full-width |

La tabla de resumen (`.data-table`) es más ancha que el móvil (~583px). Queda dentro de `.table-wrap { overflow-x: auto }` y **no** ensancha la página.

### Problemas encontrados (reales) y corrección en V2

1. **Título cortado** en 1024 (“Informe Diario de Opera…”) y 375.  
   Corregido: se quitó `nowrap+ellipsis` del topbar; el título puede partir en dos líneas. Chip de fecha se oculta <1200px para dejar espacio.
2. **Tooltip de Dotación solo útil con hover.**  
   Corregido: ya tenía focus; se añadió `pointerup` touch/pen. Área del badge a 28px.
3. **Targets táctiles de 32px** (Minimizar, iconos topbar) en tablet/móvil.  
   Corregido: `btn-sm` / collapse / status-pill / Admin icon ≥40px bajo 860px. Hardness ya era 44px; equipment-option 40px.
4. **Header sticky con altura fija** rompía si el título wrappeaba.  
   Corregido: wrapper `.topbar-sticky` agrupa topbar + barra de progreso.
5. **Filas de 3 campos apretadas a 768px.**  
   Corregido: `form-row-triple`, `trips-row` y `form-grid.cols-3` pasan a 1 columna bajo 1024px.
6. **Botones de generar** podían quedar bajo el fold en tablet.  
   Corregido: acciones en columna desde 860px; más padding inferior.

No se tocó el layout desktop ≥1200.

Touch: checkbox nativo 16px (igual que Original). Acciones principales ≥40px en móvil.

## 17. Posibles regresiones

Ninguna **CRÍTICA** ni **ALTA** de lógica.

| Severidad | Ítem | Notas |
|---|---|---|
| BAJA | Heurística “lista” del sidebar más estricta que `validateReport` | Intencional. Generar/PDF siguen la validación original. Una actividad puede enviarse “completa” para validación y aún no marcarse lista en el sidebar |
| BAJA | `Email SMTP verification failed` al arrancar Cloud Run | **También ocurre en Original**. No introducido por V2. No se envió mail de prueba |
| — | PDF “Administrativo” hardcodeado | Igual en Original. No es una pérdida de V2 |

No se perdieron: herencia, cálculos, validaciones, fotos, PDF, email, Admin API, `data-field` / ids de scroll.

## 18. Archivos modificados entre versiones

| Archivo original | Archivo V2 | Tipo de cambio | Impacto |
|---|---|---|---|
| `src/utils/calculations.ts` (y metrics, roster, validation, pdf utils, reducer, types, constants, context, server/*, Dockerfile, vite, tsconfig, default-config) | Igual path | IDENTICAL | Ninguno funcional |
| `src/App.tsx` | `src/App.tsx` | Presentación + mismos handlers | UI; contratos de validación/PDF iguales |
| `src/App.css` | `src/App.css` | Reescritura CSS | Visual + responsive |
| `src/main.tsx` | `src/main.tsx` | Fonts + tokens | Visual |
| `src/components/*.tsx` de negocio | Mismos archivos | Markup/clases; mismos dispatch | Visual |
| — | `src/components/ui/*` | NUEVO | Presentación |
| — | `src/components/reportOverview.ts` | NUEVO | Solo sidebar/KPIs |
| — | `src/styles/tokens.css` | NUEVO | Tokens |
| — | `src/assets/contours.svg` | NUEVO | Textura |
| `package.json` | `package.json` | + `@fontsource/plus-jakarta-sans` | Build visual |
| — | `.gcloudignore` | NUEVO | Deploy source |

## 19. Estado funcional final

**¿V2 conserva funcionalmente todo lo necesario de Original?**

**Sí.**

El modelo de datos, reducer, cálculos, validación, PDF, email y backend son los mismos archivos. El rediseño es de presentación. La única semántica nueva (avance del sidebar) no altera envío ni persistencia. Cloud Run V2 usa un objeto de config separado para no interferir con Original.

## 20. Deploy

Servicio Original:

- Nombre: `informe-octavio`
- URL: https://informe-octavio-tzd2urowuq-tl.a.run.app
- Revisión al cerrar esta tarea: `informe-octavio-00009-996` (generation 9, **sin cambio**)
- `CONFIG_OBJECT`: `config.json`

Servicio V2:

- Nombre: `informe-octavio-v2`
- URL: https://informe-octavio-v2-tzd2urowuq-tl.a.run.app
- URL regional: https://informe-octavio-v2-127635471462.southamerica-west1.run.app
- Revisión: `informe-octavio-v2-00001-hxm`
- `CONFIG_OBJECT`: `config-v2.json`

Bucket: `pokemic-127635471462-informe-octavio-config`

Objeto config original: `config.json` (no modificado; timestamp 2026-10-29)

Objeto config V2: `config-v2.json` (copia creada 2026-11-01)

Comprobación post-deploy:

- Original generation sigue en 9, misma URL, mismo `CONFIG_OBJECT=config.json`.
- V2 `/` 200, JS/CSS/favicon 200, `/api/config` 200.
- Logs V2: `Config storage: gcs (.../config-v2.json)`.
- No se ejecutó `gcloud run deploy informe-octavio`.
