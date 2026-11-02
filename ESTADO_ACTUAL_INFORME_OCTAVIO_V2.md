# Estado actual — Informe Diario de Operaciones V2

Documento autocontenido para otra IA. Describe **solo** `Informe_Octavio_v2` (esta carpeta). No requiere leer el informe comparativo.

Fecha: 2026-11-01.

## Objetivo

Aplicación interna RIOLOA (Área de Pozas / SQM) para armar el **Informe Diario de Operaciones**: turno, dotación de equipos, actividades (incluida draga Watermaster), cálculos de m³, PDF y envío por correo. Incluye un panel Admin para pozas y equipos persistidos.

## Actualización: persistencia, aprobación y login

Revisión `informe-octavio-v2-00007-qs7`. Esta sección prevalece sobre lo que diga el resto del documento.

- **Datos:** parámetros en `informeOctavioConfig/main`; informes en `informeOctavioReports`; tokens en `informeOctavioReportApprovals`; usuarios en `informeOctavioUsers`. Nombres centralizados en `server/firestore/collections.ts`. Ver [docs/data/FIRESTORE_SCHEMA.md](docs/data/FIRESTORE_SCHEMA.md).
- **Base compartida:** Firestore `(default)`, en `nam5`, contiene colecciones de otro proyecto. Informe Octavio V2 nunca debe leer, modificar ni eliminar colecciones fuera de su namespace.
- **Residuo:** `config/main` quedó de la primera migración. No se usa ni se eliminó; la decisión está pendiente.
- **PDF:** inmutables en `reports/YYYY/MM/<reportId>/` del bucket existente.
- **Rutas:** `/dashboard`, `/history`, `/report`, `/review/:token`.
- **Generar:** el destinatario principal es el supervisor. Los CC reciben una copia separada sin el enlace de aprobación.
- **Login:** Microsoft Entra External ID implementado con `AUTH_ENABLED=false`. Ver [docs/auth/MICROSOFT_ENTRA_SETUP.md](docs/auth/MICROSOFT_ENTRA_SETUP.md).
- **Modo MVP:** comportamiento y riesgos sin login en [docs/auth/AUTH_DISABLED_MVP.md](docs/auth/AUTH_DISABLED_MVP.md). Guest Profile y confirmación de correo en `/review` están activos.
- **Access Gate:** activo (`MVP_ACCESS_ENABLED=true`), con el código en el secreto `informe-octavio-v2-mvp-access-code`.
- **Pruebas:** `npm test` y, con el emulador de Firestore, `npm run test:integration`.

**Desplegado en `00007-qs7`:**

- Limpieza del formulario y modal de éxito tras un envío confirmado; protección contra envíos duplicados.
- Estado `SEND_FAILED` ("Error de envío") y botón *Reenviar* en Historial.
- Comentario opcional al rechazar, columna *Comentarios* y *Ver comentario*.
- *Volver a editar*: el formulario y sus fotos se guardan con cada informe; la corrección crea un informe nuevo con `revisedFromReportId`.

No requiere migración ni cambios de variables. Detalle en [docs/data/FIRESTORE_SCHEMA.md](docs/data/FIRESTORE_SCHEMA.md).

## Arquitectura frontend

- React 19 + TypeScript + Vite 8.
- Un árbol: `main.tsx` → `App` → providers → rutas de `src/pages/`.
- Estado del informe: `src/state/reportReducer.ts` (única fuente de verdad). **No** duplicar datos derivados (horas, m³) en estado.
- Configuración remota: `ConfigContext` hace GET `/api/config` al montar.
- UI: CSS propio (`src/styles/tokens.css` + `src/App.css`). No Tailwind.
- Fuente: Plus Jakarta Sans (`@fontsource/plus-jakarta-sans`).
- Iconos: `lucide-react`.
- Logo: `src/assets/rioloa-logo.png` (no recrear ni recolorear). Marca `#195A64` y `#0091C7`.

Shell:

- Desktop ≥1200px: sidebar fija 292px (logo, turno, avance, pasos, Admin).
- `<1200px`: sidebar oculta; logo y Admin en la topbar.
- Topbar sticky + barra de progreso.
- KPIs, secciones 1–5, panel oscuro de generación.

Contratos DOM que usa la lógica (no romper):

- `data-field="<path>"` para scroll al primer error.
- `id="activity-<id>"`, `id="roster-<equipmentId>"`.
- Clase `.activity-card`.
- `button.hardness-btn` y clases `hardness-25/50/75/100`.

## Backend

`server/index.ts` (Express):

- `POST /api/reports/send` — PDF + destinatarios (multer, 15 MB).
- `GET /api/config` — config pública para el formulario.
- `/api/admin/*` — login por contraseña, sesión cookie JWT, GET/PUT config.

En Cloud Run el mismo proceso sirve `dist/` (SPA) y la API. Puerto `8080` (`PORT` o default).

Desarrollo local: Vite en 5173 proxy `/api` → `http://localhost:8080`.

## Estado del informe

`ReportData` (`src/types/report.ts`):

- Generales: `date`, `supervisor`, `area`, `apr`.
- `roster[]`: equipos del turno (operador, horómetros, KM si camión).
- `activities[]`: la primera nace Watermaster; las siguientes son genéricas.

Acciones: ver `ReportAction`. No hay campo “Administrativo” en el formulario; el PDF imprime “Octavio Waiz” fijo.

## Cálculos

`src/utils/metrics.ts` + `calculations.ts` + `roster.ts`.

- Diferencias: `final - inicial`.
- Tope 12 h en horómetro (mensaje live).
- KM final ≥ inicial.
- M³ camión = vueltas × capacidad (config o 18).
- M³ actividad = suma camiones de esa actividad.
- M³ maquinaria = ese total / n maquinaria.
- Watermaster m³ = rendimiento fabricante × horas draga (si horas > 0).

## Dotación activa

Seleccionar camiones/maquinaria una vez. Completar ficha. Las actividades **leen** esos datos (`resolveEquipmentOperationalData`); no se copian. Si cambia Dotación, las actividades se actualizan.

Equipo “listo”: operador + horómetros válidos (+ KM en camión). Badge Info+Check + tooltip (hover, focus y tap).

## Actividades

- Agregar / eliminar (no se puede borrar la primera si `canDelete` es false en la card índice 0).
- Minimizar / expandir. Al validar con errores, `validationExpand` abre lo necesario y `scrollToValidationField` enfoca el primer `data-field`.
- Equipos de apoyo: texto libre.
- Fotos Antes/Después: File + preview object URL; no son obligatorias.

Sidebar “N listas”: heurística de progreso (`src/components/reportOverview.ts`). **No** sustituye `validateReport`. Descripción y fotos no bloquean ese indicador.

## Equipos

Catálogo en config (`equipment[]`: id, code, type `truck|machinery`, `capacityM3`). Admin CRUD. Si un equipo está en uso en el informe actual, el delete avisa pero puede continuar.

## Watermaster

Actividad 1. Campos de draga/bomba, profundidad, dureza, rendimiento. Totales calculados. En PDF, página extra solo si hay ambos horómetros de draga.

## PDF

`src/utils/pdf.tsx` + `src/pdf/*` (`@react-pdf/renderer`).

Vista previa, descarga y adjunto de correo usan el mismo `generateReportPdfBlob`. Fotos se convierten a data URL vía `prepareReportForPdf`.

## Email

Modal: destinatario obligatorio, adicionales, regex, PDF adjunto. No se debe enviar correo real en pruebas salvo destinatario seguro.

`EMAIL_MODE=mock` evita SMTP (dev). En Cloud Run **no** está seteado.

## Admin

Botón “Administrar parámetros” → si hay cookie de sesión entra; si no, modal de contraseña (`POST /api/admin/session`).

UI: 4 pestañas (pozas generales, pozas de actividades, camiones, maquinaria). Una lista a la vez. Persistencia inmediata al guardar.

## Configuración y Cloud Storage

| Entorno | Cómo |
|---|---|
| Local | `CONFIG_STORAGE` vacío → `config/local-config.json` (se crea desde `default-config.json` si falta) |
| Cloud Run V2 | `CONFIG_STORAGE=gcs`, bucket `pokemic-127635471462-informe-octavio-config`, objeto **`config-v2.json`** |

Nunca apuntar V2 a `config.json` (ese es el Original).

## Responsive / UI

Viewports verificados: 1440, 1280, 1024, 768, 430, 390, 375.

- Sin scroll horizontal de página.
- <1200: sin sidebar.
- <1024: grids de 3 campos en 1 columna; antecedentes 2 columnas luego 1.
- <860: acciones de generar apiladas; tabs Admin 2×2; targets táctiles ~40px.
- <640: 1 columna general; título topbar en 2 líneas.
- Tablas anchas: scroll interno en `.table-wrap`.
- Tooltip Dotación: hover + focus + tap.

## Variables de entorno (nombres, nunca valores)

| Nombre | Uso |
|---|---|
| `PORT` | Default 8080 |
| `SMTP_USER` | Usuario SMTP |
| `SMTP_PASS` | Contraseña SMTP (Secret Manager en Cloud Run) |
| `EMAIL_MODE` | `mock` opcional; no usado en Cloud Run V2 |
| `CONFIG_STORAGE` | `gcs` en prod |
| `CONFIG_BUCKET` | Bucket GCS |
| `CONFIG_OBJECT` | V2 = `config-v2.json` |
| `ADMIN_PASSWORD` | Login Admin (secreto) |
| `ADMIN_SESSION_SECRET` | Firma cookie JWT (secreto) |

Local: archivo `.env` (gitignored). No commitear.

## Secretos Cloud Run V2 (mappings)

Reutilizados del Original; no duplicar.

- `SMTP_PASS` → secret `informe-octavio:latest`
- `ADMIN_PASSWORD` → secret `informe-octavio-admin-password:latest`
- `ADMIN_SESSION_SECRET` → secret `informe-octavio-admin-session:latest`

Service account: `127635471462-compute@developer.gserviceaccount.com`.

## Cloud Run

Proyecto: `pokemic`  
Región: `southamerica-west1`

| | V2 |
|---|---|
| Servicio | `informe-octavio-v2` |
| URL | https://informe-octavio-v2-tzd2urowuq-tl.a.run.app |
| URL regional | https://informe-octavio-v2-127635471462.southamerica-west1.run.app |
| Revisión | `informe-octavio-v2-00001-hxm` |
| Acceso | `allUsers` `roles/run.invoker` |
| Memoria / CPU | 512Mi / 1 |
| Ingress | all |

El servicio Original `informe-octavio` es **otro** proceso. No desplegar sobre él desde esta carpeta.

Dockerfile: build `npm ci && npm run build`, runtime `node server-dist/index.js`.

## Comandos locales

Desde `Informe_Octavio_v2` (hace falta **los dos** procesos):

```bash
npm run dev:server
npm run dev -- --port 5173 --strictPort
```

- Frontend: http://localhost:5173/
- Backend: http://localhost:8080/ (`/api` vía proxy de Vite)

Build:

```bash
npm run build
```

Arranque producción local del bundle: `npm start` (requiere `dist` + `server-dist`).

## Archivos importantes

| Path | Rol |
|---|---|
| `src/App.tsx` | Shell, validación, PDF, Admin open |
| `src/state/reportReducer.ts` | Estado |
| `src/utils/calculations.ts` | Fórmulas |
| `src/utils/validation.ts` | Errores de envío |
| `src/utils/roster.ts` | Herencia y 12 h |
| `src/pdf/` | PDF |
| `src/components/reportOverview.ts` | KPIs / pasos (solo UI) |
| `server/` | API |
| `config/default-config.json` | Semilla |
| `Dockerfile` | Imagen Cloud Run |

No tocar cálculos/PDF/backend salvo bug demostrado.

## Riesgos pendientes

1. Log Cloud Run `Email SMTP verification failed` al cold start (Gmail/SMTP). También ocurre en el servicio Original. El mail puede seguir funcionando al enviar; no se probó envío real aquí.
2. El indicador “lista” del sidebar es más estricto que la validación de envío. No es un bloqueo de negocio.
3. “Administrativo” no es editable; sale fijo en el PDF.
4. Prueba Admin de escritura en prod: no se ejecutó PUT para no mutar ni siquiera `config-v2.json`. GET config sí está verificado.
5. `npm ci` local no se relanzó en esta sesión porque el servidor de desarrollo ya usaba `node_modules`; el build de Cloud Run sí ejecuta `npm ci` dentro de Docker.
6. Warning Vite de chunk >500 kB (preexistente, PDF en el bundle).
