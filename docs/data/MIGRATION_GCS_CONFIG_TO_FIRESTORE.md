# Migración de parámetros: GCS → Firestore

| | |
| --- | --- |
| Origen | `gs://pokemic-127635471462-informe-octavio-config/config-v2.json` |
| Destino | Firestore `(default)`, documento `informeOctavioConfig/main` |
| Script | `scripts/migrate-config-to-firestore.ts` |
| Fecha | 2026-11-01 |
| Estado | Completada y verificada |

## Qué hace el script

1. Lee `config-v2.json` desde GCS.
2. Valida con `validateAppConfig`, la misma función que usa Admin.
3. Lee `informeOctavioConfig/main`.
4. Según lo que encuentre:

| Estado del destino | Acción |
| --- | --- |
| No existe | Lo crea con `create()`, lo relee y compara con el origen |
| Existe e idéntico | No escribe nada |
| Existe y es distinto | Lista las diferencias, termina con error y **no sobrescribe** |

Compara IDs, nombres, códigos, tipos y `capacityM3`. Es idempotente: se puede repetir sin riesgo.

Nunca borra `config-v2.json` y no toca ningún otro documento de la base compartida.

Si el destino difiere porque se editó en Admin, es lo esperado: Firestore es la fuente de verdad y el JSON es solo un respaldo.

## Ejecución

```powershell
# Sin Application Default Credentials en el equipo:
$env:GCLOUD_ACCESS_TOKEN = gcloud auth print-access-token
npm run migrate:config -- --dry-run   # valida y compara, no escribe
npm run migrate:config
Remove-Item Env:\GCLOUD_ACCESS_TOKEN
```

## Resultado

```text
Validated: 1 generalAreas, 33 activityAreas, 15 equipment
Target: informeOctavioConfig/main (does not exist yet)
Verified: IDs, names, codes, types and capacityM3 match the source.
Backup kept: gs://pokemic-127635471462-informe-octavio-config/config-v2.json
```

Segunda ejecución:

```text
Target: informeOctavioConfig/main (already exists)
Already migrated and identical to the source: nothing written.
```

Los tres casos de la tabla se ensayaron primero en el emulador, incluido el rechazo a sobrescribir. Tamaño y fecha del respaldo sin cambios: 4737 bytes, `2026-11-01T18:03:08Z`.

## Historial

| Paso | Destino | Revisión |
| --- | --- | --- |
| Primera migración | `config/main` | `informe-octavio-v2-00002-mh8` |
| Reubicación en namespace propio | `informeOctavioConfig/main` | `informe-octavio-v2-00003-kk9` |

`config/main` nunca se editó desde Admin antes de reubicarlo: su última escritura fue la propia migración. Sigue en la base como residuo y **no se eliminó**.

## Cambio en la aplicación

- `CONFIG_STORAGE=firestore` en Cloud Run. El soporte `gcs` se eliminó de `server/config/configStore.ts`: no hay dos fuentes activas.
- `GET /api/config` y `PUT /api/admin/config` mantienen su contrato.
- `CONFIG_BUCKET` sigue en uso para los PDF. `CONFIG_OBJECT` solo documenta el origen.
- En local, sin `CONFIG_STORAGE`, sigue usándose `config/local-config.json`.

## Rollback

Ni `config/main` ni `config-v2.json` reciben los cambios hechos en Admin después de la migración. Exporta `informeOctavioConfig/main` antes de un rollback si hay cambios que conservar.

```powershell
# Volver a la revisión que lee config/main y usa las colecciones sin prefijo:
gcloud run services update-traffic informe-octavio-v2 --region=southamerica-west1 --project=pokemic `
  --to-revisions=informe-octavio-v2-00002-mh8=100

# Volver a la revisión que lee config-v2.json desde GCS (sin Dashboard, Historial ni aprobación):
gcloud run services update-traffic informe-octavio-v2 --region=southamerica-west1 --project=pokemic `
  --to-revisions=informe-octavio-v2-00001-hxm=100
```

Tras volver a `00002-mh8`, los informes de `informeOctavioReports` no aparecerían en Historial ni Dashboard, porque esa revisión lee `reports`.
