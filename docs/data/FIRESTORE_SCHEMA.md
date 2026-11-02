# Firestore — Esquema de datos

| | |
| --- | --- |
| Project | `pokemic` |
| Database | `(default)`, Native Mode, edición Standard |
| Location | `nam5` (multi-región Estados Unidos) |
| Acceso | Solo backend (`server/repositories/`), con Application Default Credentials |
| Rol de la service account | `roles/datastore.user` |

**Collections de Informe Octavio V2:**

- `informeOctavioConfig`
- `informeOctavioReports`
- `informeOctavioReportApprovals`
- `informeOctavioUsers`

> **Advertencia:** Esta Firestore database es compartida con otro proyecto. Informe Octavio V2 nunca debe leer, modificar ni eliminar colecciones fuera de su namespace de colecciones.

## Base compartida

- No se crea otra base. El cliente usa `(default)` y no existe `FIRESTORE_DATABASE_ID`.
- Los nombres se definen en un solo lugar: `FIRESTORE_COLLECTIONS` en [server/firestore/collections.ts](../../server/firestore/collections.ts). Repositorios y scripts deben usar esa constante, nunca un string.
- No hacer limpiezas generales ni tocar colecciones desconocidas. Colecciones que no son de esta aplicación: `builded_moves`, `learnsets`, `moveCanonOverrides`, `moveSuggestions`, `moves`, `pokemon_builds`, `pokemons`, `sprites`, `users`.
- `roles/datastore.user` aplica a toda la base, porque IAM de Firestore no separa por colección. El aislamiento depende del código.
- Las reglas publicadas son `allow read, write: if false`. Bloquean todo cliente web. El backend no pasa por reglas.
- `nam5` añade latencia desde `southamerica-west1` y los datos residen en Estados Unidos.

## Residuo pendiente de decisión

| Documento | Estado |
| --- | --- |
| `config/main` | Creado por la primera migración. Ya no lo usa la revisión activa. **No se eliminó** |

Es el único documento de la colección `config`. Si se borra, un rollback a la revisión `informe-octavio-v2-00002-mh8` dejaría de ver esos parámetros y usaría los valores por defecto.

## Colecciones

### `informeOctavioConfig/main`

Fuente de verdad de los parámetros. `GET /api/config` lo lee (caché de 30 s por instancia) y `PUT /api/admin/config` lo escribe.

```text
generalAreas:  [{ id, name }]
activityAreas: [{ id, name }]
equipment:     [{ id, code, type: 'truck' | 'machinery', capacityM3 }]
updatedAt:     Timestamp
```

### `informeOctavioReports/{reportId}`

`reportId` es un ID automático de Firestore.

```text
createdAt:       Timestamp
reportDate:      'YYYY-MM-DD'
createdBy:       { userId, email, displayName }
supervisorEmail: string, en minúsculas
ccEmails:        string[]
status:          'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'SEND_FAILED'
storage:         { bucket, path, filename }
metrics:         { activitiesCount, activeEquipmentCount, trucksCount, machineryCount, truckM3, watermasterM3 }
summary:         { area, supervisorName, activities: [{ area, type }],
                   equipment: [{ code, type, activities }], watermasterHourlyPerformance }
review:          null | { reviewedAt, reviewedByUserId, reviewedByEmail, reviewedByName, decision, comment }
emailDelivery:   { sentAt, status: 'PENDING' | 'SENT' | 'FAILED' }
formSnapshot:    string JSON del formulario (máx. 256 KB) | null
formPhotos:      [{ activityId, which: 'before' | 'after', path, contentType }]
revisedFromReportId: string | null
```

Los tres últimos campos y `review.comment` no existen en informes antiguos; el código los trata como vacíos. **No hay migración.**

- `formSnapshot` guarda todo lo necesario para reconstruir el formulario, sin fotos. Las listas (Historial, Dashboard) nunca lo devuelven.
- `review.comment` es `null` si no hubo comentario y siempre `null` en una aprobación. Máximo 5000 caracteres.
- `revisedFromReportId` apunta al informe rechazado del que proviene una corrección. Ese original nunca se modifica.
- `IN_REVIEW` con `emailDelivery.status = 'FAILED'` es el formato anterior de un envío fallido: se lee como `SEND_FAILED` sin reescribir el documento.

- Con `AUTH_ENABLED=false`, `createdBy` es un perfil guest declarado (`userId = guest:<sha256(correo)>`) y una decisión queda con `reviewedByName = 'Correo declarado en el enlace (modo MVP)'`. Ver [AUTH_DISABLED_MVP.md](../auth/AUTH_DISABLED_MVP.md). La revisión `00003-kk9` guardaba `anonymous`; ambos formatos son válidos como copia histórica.
- No se guardan fotos, base64 ni el PDF.
- `metrics` y `summary` los calcula el frontend con las funciones existentes (`buildReportOverview`, `getWatermasterHourlyPerformance`). El servidor valida forma y rangos, pero no recalcula.
- `activities` de `summary.equipment` cuenta en cuántas actividades participó cada equipo.

Historial y Dashboard consultan exclusivamente esta colección.

### `informeOctavioReportApprovals/{tokenHash}`

El ID es el SHA-256 hexadecimal del token. El token en claro solo existe en el correo.

```text
reportId:        string
supervisorEmail: string
createdAt:       Timestamp
usedAt:          null | Timestamp
```

### `informeOctavioUsers/{userId}`

Solo perfiles de Microsoft Entra: `userId` es el `oid` del token, o `sub` de respaldo. Se crea con el primer login. Los perfiles guest nunca se guardan aquí.

```text
externalId, email, displayName, tenantId, createdAt, lastLoginAt
```

Firestore solo muestra una colección cuando tiene documentos. Hoy existe `informeOctavioConfig`; las otras tres aparecen con su primer documento.

## Cloud Storage

Bucket: `pokemic-127635471462-informe-octavio-config` (privado).

```text
reports/YYYY/MM/<reportId>/INFORME_DIARIO_<fecha>.pdf
```

```text
reports/YYYY/MM/<reportId>/photos/<activityId>-<before|after>.<jpg|png|webp>
```

`YYYY/MM` salen de `reportDate`. Las fotos del formulario se guardan junto al PDF para poder reconstruirlo; no van a Firestore. PDF y fotos se suben con `ifGenerationMatch: 0`, por lo que no se pueden sobrescribir. La descarga pasa siempre por `GET /api/reports/:id/pdf`, que hace streaming desde GCS.

El bucket también contiene `config.json` (servicio Original) y `config-v2.json` (respaldo). No tocar.

## Ciclo de vida

```text
                                    ┌─> APPROVED   (definitivo)
generar ─> IN_REVIEW ──> correo OK ─┤
              │                     └─> REJECTED   (definitivo) ··> corrección = informe nuevo
              │ correo falla
              v
         SEND_FAILED ──> Reenviar OK ──> IN_REVIEW
              ^                │
              └── Reenviar falla┘
```

1. El frontend genera el PDF una sola vez y lo envía a `POST /api/reports`.
2. El backend sube el PDF. Si falla, no se crea nada.
3. `informeOctavioReports` e `informeOctavioReportApprovals` se escriben en un batch atómico. Si falla, se borra el PDF.
4. Se envía el correo al supervisor con el enlace, y una copia separada **sin enlace** a CC.
5. Si el correo falla, el informe queda `SEND_FAILED`. *Reenviar* (`POST /api/reports/:id/resend-email`, con `supervisorEmail`) usa el mismo registro y PDF, y emite un enlace nuevo que invalida el anterior. Solo al confirmarse el envío se actualiza `supervisorEmail` y pasa a `IN_REVIEW`.
6. `POST /api/review/:token/decision` decide dentro de una transacción. Valida token, `usedAt`, estado y correo. Dos decisiones simultáneas no pueden ganar ambas, y un informe `SEND_FAILED` no se puede decidir.

El PDF nunca se regenera: es el documento histórico inmutable. Si faltara en GCS, el reenvío falla y el informe sigue `SEND_FAILED`.

**Envíos duplicados.** El frontend manda un `submissionId` por cada estado del formulario, y el servidor deriva de él el ID del informe. Repetir la petición devuelve el informe existente; dos simultáneas no pueden crear dos.

**Corrección de un rechazado.** `GET /api/reports/:id/edit-data` y `/photos/:activityId/:which` reconstruyen el formulario sin escribir nada. Enviarlo crea un informe nuevo, con ID y PDF propios, y `revisedFromReportId` hacia el original.

## Consultas e índices

| Consulta | Origen | Índice |
| --- | --- | --- |
| `informeOctavioReports` por `createdAt desc`, paginada | Historial | Automático de un campo |
| `informeOctavioReports` completa | Dashboard | Ninguno |
| `informeOctavioReportApprovals` donde `reportId ==` | Reenvío | Automático de un campo |
| Lectura por ID | Resto | Ninguno |

**No se requieren índices compuestos.** El dashboard agrega en memoria leyendo toda la colección, adecuado para un informe diario. Si el volumen creciera a decenas de miles, conviene mantener agregados precalculados.

## Seguridad

- Con `AUTH_ENABLED=false` la aplicación queda abierta. Análisis completo en [AUTH_DISABLED_MVP.md](../auth/AUTH_DISABLED_MVP.md).
- La ruta `/review/<token>` queda registrada en los logs de acceso de Cloud Run. Quien lea esos logs ve tokens activos. Con Entra activo no bastan para decidir: además hay que iniciar sesión con el correo del supervisor.
