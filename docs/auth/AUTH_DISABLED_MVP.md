# Modo MVP sin login (AUTH_ENABLED=false)

Referencia del comportamiento real mientras Microsoft Entra no está disponible. Permite entender el sistema sin revisar todo el código.

| | |
| --- | --- |
| Revisión | `informe-octavio-v2-00007-qs7` |
| `AUTH_ENABLED` | `false` |
| `MVP_ACCESS_ENABLED` | `true` |
| Guest Profile | Activo |
| Secreto `informe-octavio-v2-mvp-access-code` | Con versión, cargada por el titular |

**El Access Gate está activo en producción.** Las tablas que distinguen *gate apagado* sirven para entender qué ocurre si se desactiva.

## 1. Veredicto

**SÍ, PERO CON ESTOS AJUSTES**: el MVP es razonable para pruebas internas y clientes controlados con el Access Gate activo.

Pendiente antes de usarlo así:

1. Confirmar que `ADMIN_PASSWORD` y `ADMIN_SESSION_SECRET` de producción son fuertes (sección 11).

No es adecuado como registro de aprobación con valor de auditoría: la aprobación solo es verificable con Entra.

## 2. Tres mecanismos distintos

| Mecanismo | Para qué | Dónde vive | Identifica a alguien |
| --- | --- | --- | --- |
| **MVP Access Code** | Control temporal de acceso general | Cookie `mvp_access` | No: es un código compartido |
| **Guest Profile** | Trazabilidad declarativa | `localStorage` y copia en cada informe | Solo lo declarado |
| **Admin** | Editar parámetros | `ADMIN_PASSWORD`, cookie `admin_session` | No |

Orden de entrada con el gate activo:

```text
URL ─> Access Gate ─> Guest Profile ─> Aplicación

/review/:token ─> Correo del supervisor ─> Revisión ─> Decisión
```

Con `AUTH_ENABLED=true` no aplica ninguno de los dos primeros: Entra es la única autenticación general.

| `AUTH_ENABLED` | `MVP_ACCESS_ENABLED` | Resultado |
| --- | --- | --- |
| `false` | `false` | Abierta, con Guest Profile |
| `false` | `true` | Access Gate y Guest Profile (**estado actual**) |
| `true` | cualquiera | Solo Entra; flag, código y perfil se ignoran |

## 3. Activar el Access Gate

El código real lo cargas tú. No queda en el repositorio, ni en el historial, ni en el chat.

**Paso 1. Cargar el código.** Usa al menos 16 caracteres, sin palabras comunes. Pega este bloque en PowerShell:

```powershell
$secure = Read-Host "Código de acceso" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
$file = Join-Path $env:TEMP "mvp-code.tmp"
[IO.File]::WriteAllText($file, $plain.Trim(), (New-Object Text.UTF8Encoding $false))
gcloud secrets versions add informe-octavio-v2-mvp-access-code --data-file=$file --project=pokemic
Remove-Item -Force $file
Remove-Variable plain, secure
```

**Paso 2. Verificar** que exista una versión. No muestra el valor:

```powershell
gcloud secrets versions list informe-octavio-v2-mvp-access-code --project=pokemic
```

**Paso 3. Activar.** Mapear un secreto sin versión impide arrancar la revisión, por eso el orden importa:

```powershell
gcloud run services update informe-octavio-v2 --region=southamerica-west1 --project=pokemic `
  --update-secrets="MVP_ACCESS_CODE=informe-octavio-v2-mvp-access-code:latest" `
  --update-env-vars="MVP_ACCESS_ENABLED=true"
```

**Paso 4. Comprobar:** abre la URL en una ventana de incógnito. Debe aparecer *Acceso al sistema*.

La cuenta de servicio ya tiene `roles/secretmanager.secretAccessor` sobre ese secreto.

## 4. Implementación del Access Gate

| Pieza | Archivo |
| --- | --- |
| Middleware, cookie, comparación, rate limit | `server/middleware/mvpAccess.ts` |
| Endpoints | `server/routes/mvpAccess.ts` |
| Regla `isMvpAccessRequired()` | `server/config/authConfig.ts` |
| Orden de rutas | `server/app.ts` |
| Estado y comprobación periódica | `src/context/AuthContext.tsx` |
| Pantalla | `src/pages/MvpAccessPage.tsx` |
| Orden de gates | `AuthGate` en `src/App.tsx` |

**Endpoints**

| Endpoint | Respuesta |
| --- | --- |
| `GET /api/mvp-access/status` | `{ required, authenticated }`. Con Entra activo o gate apagado: `{ required: false, authenticated: false }` |
| `POST /api/mvp-access/login` `{ code }` | 200 y cookie · 401 incorrecto · 429 demasiados intentos · 404 gate inactivo · 503 sin configurar |
| `POST /api/mvp-access/logout` | Borra solo `mvp_access`. No toca Guest Profile, Admin ni sesión Microsoft |

**Código**

- Se recortan espacios al inicio y final.
- Se compara `sha256(entrada)` con `sha256(MVP_ACCESS_CODE)` usando `crypto.timingSafeEqual`.
- Nunca se registra, devuelve ni guarda en la cookie.

**Cookie `mvp_access`**

- HttpOnly, Secure en Cloud Run, SameSite=Lax, Path=/, duración de **12 horas**.
- JWT HS256 firmado con `AUTH_SESSION_SECRET`, con `scope: "mvp-access"`.
- No es intercambiable: un token sin ese `scope` no abre el gate, y este token no sirve como `user_session` porque no tiene `sub` ni `email`.

**Rate limit**

- 10 intentos fallidos por IP cada 15 minutos; después, 429 incluso con el código correcto.
- Un acierto reinicia el contador.
- Solo afecta a `POST /api/mvp-access/login`.
- Está en memoria por instancia: con 20 instancias como máximo, el límite global real es mayor.

**Falla cerrado:** con `MVP_ACCESS_ENABLED=true` y sin código o sin `AUTH_SESSION_SECRET`, las APIs responden 401 y el login 503.

**Expiración durante el turno:** el frontend comprueba el estado cada 60 segundos y al volver a la ventana. Si la cookie venció, el gate cubre la pantalla **sin desmontar la aplicación**, así que el informe en curso no se pierde. Se valida en el E2E.

## 5. Rutas protegidas y exentas

**Con gate activo, exigen `mvp_access`:**

| Ruta | Nota |
| --- | --- |
| `GET /api/config` | |
| `GET /api/reports` | |
| `POST /api/reports` | **Bloquea el uso externo del SMTP** |
| `POST /api/reports/:id/resend-email` | |
| `GET /api/reports/:id/pdf` | |
| `GET /api/reports/:id/edit-data`, `GET /api/reports/:id/photos/*` | Reconstrucción de un rechazado |
| `GET /api/reports/latest-form` | Partir del último informe |
| `GET /api/dashboard/summary` | |
| `/api/admin/*` | Además conserva `requireAdmin` |
| `/`, `/dashboard`, `/history`, `/report` | La pantalla del gate se muestra en el navegador; lo que protege son las APIs |

**Exentas:**

| Ruta | Protección propia |
| --- | --- |
| `GET /api/auth/*`, `POST /api/auth/logout` | Sin datos |
| `/api/mvp-access/*` | Rate limit en login |
| `/review/:token` | Token |
| `GET /api/review/:token` | Token y correo declarado |
| `GET /api/review/:token/pdf` | Token y correo declarado; con Entra, token y cuenta |
| `POST /api/review/:token/decision` | Token y correo declarado |

Los archivos estáticos (JS y CSS) son públicos y no contienen secretos ni datos.

## 6. Revisión del supervisor

El supervisor llega desde el correo y no conoce el código, por eso `/api/review` queda antes del gate.

El PDF de revisión ya no usa `/api/reports/:id/pdf`. Usa `GET /api/review/:token/pdf`, que hace streaming del mismo archivo de GCS. El correo viaja en la cabecera `X-Review-Email`, no en la URL, para no quedar en logs. Por eso el botón *Vista previa* descarga el PDF con `fetch` y lo abre como blob en otra pestaña; si el navegador bloquea la pestaña, lo descarga.

Flujo con auth apagada:

1. Sin correo, `GET /api/review/:token` responde `{ ok: true, emailRequired: true }`, sin datos.
2. Si el correo no coincide: 403 `WRONG_EMAIL`.
3. La decisión compara de nuevo el correo **dentro de la transacción**.

> **Esto NO demuestra identidad.** Evita decisiones por error de quien recibe un enlace reenviado, pero quien conozca el correo del supervisor puede escribirlo. La pantalla pide *"Para verificar tu identidad ingresa el correo en donde recibiste el informe"*: es una instrucción de uso, no una garantía técnica. No equivale a Entra.

Vale siempre: decisión de un solo uso, inmutable, y token que no expira mientras siga pendiente.

## 7. Identidad

**`createdBy` con auth apagada** (`reportAuthor`, `server/routes/reports.ts`):

```text
userId:      guest:<sha256(correo en minúsculas)>
email:       correo declarado, en minúsculas
displayName: nombre declarado
```

- `POST /api/reports` recibe `guestProfile` en `payload`. Si falta o es inválido: 400, sin guardar nada.
- Un `userId` enviado por el frontend se ignora.
- Con `AUTH_ENABLED=true`, `guestProfile` se ignora y manda la sesión Entra.

**Historial:** `displayName || email`. La columna *Supervisor* usa `summary.supervisorName`. `GET /api/reports` **ya no devuelve `supervisorEmail`**.

**`informeOctavioUsers`:** no recibe nada en modo guest. Solo se escribe en `GET /api/auth/callback`, tras un login Entra válido.

**Decisión registrada con auth apagada:**

| Campo | Valor |
| --- | --- |
| `reviewedByUserId` | `guest:<sha256(correo declarado)>` |
| `reviewedByEmail` | Correo declarado, ya validado contra el supervisor |
| `reviewedByName` | `'Correo declarado en el enlace (modo MVP)'` |
| `reviewedAt`, `decision` | Fiables (servidor) |

Hay trazabilidad temporal fiable, pero no de identidad.

**Otros datos:** `reportId`, `createdAt` y destinatarios en Firestore. IP y navegador **no se guardan en Firestore**: solo están en los logs de Cloud Run, 30 días, y se asocian por hora aproximada.

## 8. Comportamiento base

`requireUser` deja pasar todo con auth apagada: `res.locals.user = null`, sin usuario ficticio. `req.user` no existe en este proyecto.

`GET /api/auth/me` responde `{"authenticated":false,"authEnabled":false}`. `GET /api/auth/login` y `/callback` redirigen a `/`.

## 9. Menú de usuario

- **Cambiar perfil** y **Borrar perfil**: siempre en modo guest.
- **Bloquear acceso**: solo con el gate activo. Borra `mvp_access` y vuelve al gate; conserva el perfil.
- **Cerrar sesión**: solo con Entra.

`localStorage['informeOctavioGuestProfile']` guarda `{ displayName, email }`, sin contraseñas ni tokens.

## 10. Qué se guarda

| Lugar | Contenido |
| --- | --- |
| `informeOctavioConfig/main` | Parámetros |
| `informeOctavioReports/{id}` | Metadata, `createdBy`, métricas, `review`, `emailDelivery`, ubicación del PDF. Sin fotos ni PDF |
| `informeOctavioReportApprovals/{hash}` | `reportId`, `supervisorEmail`, fechas. Sin token en claro |
| `informeOctavioUsers` | Solo usuarios Entra |
| GCS privado | `reports/YYYY/MM/<reportId>/INFORME_DIARIO_<fecha>.pdf`, inmutable |

## 11. Admin

Sigue con su propia contraseña; no se reutiliza como código MVP ni se modificó.

1. `POST /api/admin/login` compara con `ADMIN_PASSWORD`, con límite de 20 intentos por IP cada 15 minutos.
2. Emite la cookie `admin_session` (JWT con `ADMIN_SESSION_SECRET`, 6 horas).
3. `PUT /api/admin/config` exige esa cookie: `requireAdmin` responde 401 sin ella.

Sin verificar: la fortaleza de los secretos de producción. `.env.example` contuvo valores débiles (`asdf`, `123`). Si llegaron alguna vez a producción, hay que rotarlos: un `ADMIN_SESSION_SECRET` débil permite falsificar la sesión Admin.

## 12. Riesgos

| Riesgo | Gate apagado (hoy) | Gate activo |
| --- | --- | --- |
| **Correo abierto** (`POST /api/reports`) | **ALTO**, inerte solo porque el SMTP falla | BAJO: requiere el código |
| **Lectura de Historial y PDF** | **ALTO** | MEDIO: quien tenga el código ve todo |
| **Código compartido filtrado** | No aplica | MEDIO: nadie individual responde. Rotar (sección 13) |
| **Identidad del creador** | MEDIO | MEDIO: declarada, se puede suplantar |
| **Aprobación por enlace reenviado** | MEDIO | MEDIO: la confirmación frena el error, no la mala fe |
| **Datos falsos e inflado de costos** | MEDIO | BAJO |
| **Autoaprobación** | MEDIO | MEDIO: alguien con el código puede poner su propio correo |
| **Fuerza bruta del código** | No aplica | BAJO con un código largo |
| **Token sin expiración** | BAJO | BAJO |
| **Token en logs** | BAJO | BAJO |
| **Admin** | BAJO, condicionado a sus secretos | BAJO |
| **Dashboard** | BAJO | BAJO |

Ningún riesgo es crítico: nadie sin Admin puede cambiar parámetros ni borrar datos.

## 13. Operación

**Rotar el código:**

```powershell
# 1. Repite el paso 1 de la sección 3 para crear una versión nueva.
# 2. Fuerza una revisión nueva, porque el valor se lee al arrancar:
gcloud run services update informe-octavio-v2 --region=southamerica-west1 --project=pokemic `
  --update-env-vars="MVP_ACCESS_ROTATED_AT=$(Get-Date -Format yyyyMMddHHmm)"
```

Las cookies ya emitidas siguen válidas hasta 12 horas. Para expulsar a todos de inmediato, crea además una versión nueva de `informe-octavio-auth-session` y fuerza otra revisión; eso invalida toda cookie firmada con ese secreto.

**Desactivar temporalmente:**

```powershell
gcloud run services update informe-octavio-v2 --region=southamerica-west1 --project=pokemic `
  --update-env-vars="MVP_ACCESS_ENABLED=false"
```

## 14. Transición a Entra

Activar `AUTH_ENABLED=true` (ver [MICROSOFT_ENTRA_SETUP.md](MICROSOFT_ENTRA_SETUP.md)) basta para que:

- Access Gate y Guest Profile desaparezcan, sin borrar código ni secreto.
- `/review/:token` vuelva a exigir la cuenta Entra del supervisor, también para el PDF.
- Los informes antiguos no cambien: su `createdBy` queda como copia histórica, e Historial muestra ambos porque usa `displayName || email`.
- `informeOctavioUsers` contenga solo usuarios Microsoft.

No hay migración de guest a Entra. Un `localStorage` antiguo y `mvp_access` se ignoran.

## 15. Pruebas

| Prueba | Resultado |
| --- | --- |
| `npm run build` | Pasa |
| Unitarias | 12/12 |
| Integración (emulador) | 39/39 |
| Navegador E2E, gate apagado y auth activa | 122/122 |
| Navegador E2E, gate activo | 47/47 |
| Producción, gate apagado | 33/33 |

Cubren cookie vencida, token alterado, token de otro tipo, rate limit, logout, gate sin configurar, Admin tras el gate, revisión sin código, PDF por token, y `AUTH_ENABLED=true` ignorando gate y perfil.

El código correcto en producción lo validó el titular al activarlo. La conversación con Microsoft sigue sin probar.
