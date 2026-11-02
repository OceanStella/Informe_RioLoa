# Microsoft Entra External ID — Configuración

El código ya está desplegado con `AUTH_ENABLED=false`. Este documento indica qué crear en Microsoft, qué valores entregar y cómo activar el login sin dejar la aplicación inaccesible.

Se usa **Microsoft Entra External ID** (tenant externo, dominio `ciamlogin.com`). **No** Azure AD B2C.

## 1. URLs de esta aplicación

| Uso | Valor |
| --- | --- |
| URL pública | `https://informe-octavio-v2-tzd2urowuq-tl.a.run.app` |
| Redirect URI | `https://informe-octavio-v2-tzd2urowuq-tl.a.run.app/api/auth/callback` |
| Post logout URI | `https://informe-octavio-v2-tzd2urowuq-tl.a.run.app/` |

Si la aplicación cambia de dominio, actualizar estas URLs en Microsoft y en Cloud Run al mismo tiempo. También `APP_PUBLIC_URL`, que construye los enlaces de revisión.

## 2. Pasos en Microsoft

Portal: [entra.microsoft.com](https://entra.microsoft.com).

1. **Crear un tenant externo.** Tipo *External*. Anotar el **Tenant ID** y el **subdominio** (la parte `rioloa` de `rioloa.onmicrosoft.com`).
2. **Registrar la aplicación** (App registrations → New registration), con cuentas *de este directorio únicamente*. Anotar el **Application (client) ID**.
3. **Authentication** → agregar plataforma **Web** y registrar **las dos** URLs de la sección 1 como Redirect URI. External ID exige que el destino posterior al logout también esté registrado.
4. **Certificates & secrets** → New client secret. Copiar el **Value** en el momento: no se vuelve a mostrar. Anotar su fecha de vencimiento; al vencer, el login deja de funcionar.
5. **API permissions** → delegados `openid`, `profile`, `email`, `offline_access`. Otorgar *Grant admin consent*.
6. **Token configuration** → Add optional claim → tipo **ID** → marcar `email` y `preferred_username`.
7. **User flow** (External Identities → User flows → New):
   - Método: *Email with password* o *Email one-time passcode*. Ambos verifican el correo en el registro.
   - Atributo: *Display Name*.
   - Dejar habilitado el registro (*self-service sign-up*).
   - En el flujo → **Applications** → agregar esta aplicación. Sin esto el login falla aunque todo lo demás esté bien.

**Importante para la aprobación de informes.** El supervisor se identifica comparando el correo de la cuenta con el del informe. No agregar proveedores de identidad que entreguen correos sin verificar.

## 3. Valores que debes entregar

| Variable | Dónde sale | Ejemplo | Sensible |
| --- | --- | --- | --- |
| `ENTRA_TENANT_ID` | Paso 1 | `00000000-0000-0000-0000-000000000000` | No |
| `ENTRA_TENANT_SUBDOMAIN` | Paso 1 | `rioloa` | No |
| `ENTRA_CLIENT_ID` | Paso 2 | `00000000-0000-0000-0000-000000000000` | No |
| `ENTRA_CLIENT_SECRET` | Paso 4 (*Value*, no *Secret ID*) | — | **Sí: solo Secret Manager** |
| `ENTRA_AUTHORITY` | Opcional. Por defecto `https://<subdominio>.ciamlogin.com/` | | No |
| `ENTRA_REDIRECT_URI` | Sección 1 | | No |
| `ENTRA_POST_LOGOUT_REDIRECT_URI` | Sección 1 | | No |
| User flow | Paso 7: basta confirmar que la aplicación está asociada | | No |

No compartas `ENTRA_CLIENT_SECRET` por correo ni chat: cárgalo tú con el comando siguiente.

## 4. Activación

Orden seguro: primero credenciales con el login apagado, después el login. Así la aplicación nunca queda inaccesible.

```powershell
# 1. Guardar el secreto (pide pegarlo; no queda en el historial)
$secret = Read-Host "Client secret" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret))
[IO.File]::WriteAllText("$env:TEMP\entra.tmp", $plain)
gcloud secrets create informe-octavio-entra-client-secret --replication-policy=automatic --project=pokemic
gcloud secrets versions add informe-octavio-entra-client-secret --data-file="$env:TEMP\entra.tmp" --project=pokemic
Remove-Item "$env:TEMP\entra.tmp"
gcloud secrets add-iam-policy-binding informe-octavio-entra-client-secret `
  --member="serviceAccount:127635471462-compute@developer.gserviceaccount.com" `
  --role="roles/secretmanager.secretAccessor" --project=pokemic

# 2. Cargar la configuración con AUTH_ENABLED todavía en false
$url = "https://informe-octavio-v2-tzd2urowuq-tl.a.run.app"
gcloud run services update informe-octavio-v2 --region=southamerica-west1 --project=pokemic `
  --update-secrets="ENTRA_CLIENT_SECRET=informe-octavio-entra-client-secret:latest" `
  --update-env-vars="ENTRA_TENANT_ID=<tenant>,ENTRA_TENANT_SUBDOMAIN=<subdominio>,ENTRA_CLIENT_ID=<client>,ENTRA_REDIRECT_URI=$url/api/auth/callback,ENTRA_POST_LOGOUT_REDIRECT_URI=$url/"

# 3. Activar el login
gcloud run services update informe-octavio-v2 --region=southamerica-west1 --project=pokemic `
  --update-env-vars="AUTH_ENABLED=true"
```

`AUTH_SESSION_SECRET` ya está mapeado a `informe-octavio-auth-session:latest`.

**Si algo falla**, se revierte en segundos y la aplicación vuelve a estar accesible:

```powershell
gcloud run services update informe-octavio-v2 --region=southamerica-west1 --project=pokemic --update-env-vars="AUTH_ENABLED=false"
```

## 5. Comportamiento

| Condición | Resultado |
| --- | --- |
| `AUTH_ENABLED=false` | Modo MVP: Access Gate y Guest Profile. Ver [AUTH_DISABLED_MVP.md](AUTH_DISABLED_MVP.md) |
| `AUTH_ENABLED=true`, faltan variables | Cerrado: `/api/auth/login` responde 503 y el log indica qué falta |
| `AUTH_ENABLED=true`, completo | Login obligatorio en toda la aplicación y en `/api/*`. Access Gate y Guest Profile se ignoran |

Detalles de la implementación (`server/services/entraAuthService.ts`, `server/routes/auth.ts`):

- Authorization Code Flow con PKCE, `state` y `nonce`, usando `@azure/msal-node`.
- El estado del flujo viaja en una cookie firmada de 10 minutos (`auth_flow`), porque Cloud Run no comparte memoria entre instancias.
- Se valida audiencia, tenant y expiración del ID token. Los tokens de Microsoft se descartan después de leer la identidad: nunca llegan al navegador.
- Sesión propia: cookie `user_session`, JWT firmado con `AUTH_SESSION_SECRET`, HttpOnly, Secure en Cloud Run, SameSite=Lax, 12 horas.
- Identidad estable: `oid`, con `sub` de respaldo. Los usuarios se guardan en `informeOctavioUsers/{id}`.
- `returnTo` solo acepta rutas del mismo origen.
- Admin sigue usando su contraseña, además de la sesión general.

## 6. Pruebas al activar

Aún no ejecutadas, porque requieren credenciales reales:

- [ ] Registro de un usuario nuevo
- [ ] Inicio de sesión
- [ ] `GET /api/auth/me` devuelve el usuario y ningún token
- [ ] Documento creado en `informeOctavioUsers/{oid}`
- [ ] Cerrar sesión desde el menú del topbar
- [ ] Abrir `/history` sin sesión y volver a `/history` tras el login
- [ ] Abrir `/review/<token>` sin sesión y volver al mismo enlace
- [ ] Supervisor correcto puede decidir
- [ ] Otra cuenta ve: *Este informe debe ser revisado con la cuenta a la que fue enviado.*
- [ ] Admin pide además su contraseña

La autorización del supervisor, los 401 y la validación de claims ya están cubiertos en `tests/`, con sesiones firmadas localmente. Lo que falta probar es la conversación real con Microsoft.
