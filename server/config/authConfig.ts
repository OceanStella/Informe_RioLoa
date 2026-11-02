export interface EntraConfig {
  tenantId: string;
  tenantSubdomain: string;
  clientId: string;
  clientSecret: string;
  authority: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
}

function env(name: string): string {
  return process.env[name]?.trim() ?? '';
}

export function isAuthEnabled(): boolean {
  return env('AUTH_ENABLED').toLowerCase() === 'true';
}

export function getAuthSessionSecret(): string | undefined {
  return env('AUTH_SESSION_SECRET') || undefined;
}

/** Entra replaces the MVP gate: with AUTH_ENABLED=true the flag and the code are simply ignored. */
export function isMvpAccessRequired(): boolean {
  return !isAuthEnabled() && env('MVP_ACCESS_ENABLED').toLowerCase() === 'true';
}

export function getMvpAccessCode(): string | undefined {
  return env('MVP_ACCESS_CODE') || undefined;
}

const REQUIRED_ENTRA_VARS = [
  'ENTRA_TENANT_ID',
  'ENTRA_TENANT_SUBDOMAIN',
  'ENTRA_CLIENT_ID',
  'ENTRA_CLIENT_SECRET',
  'ENTRA_REDIRECT_URI',
  'ENTRA_POST_LOGOUT_REDIRECT_URI',
];

function missingAuthVars(): string[] {
  const missing = REQUIRED_ENTRA_VARS.filter((name) => !env(name));
  if (!getAuthSessionSecret()) missing.push('AUTH_SESSION_SECRET');
  return missing;
}

/** Returns null while any credential is missing, so login stays closed instead of half-working. */
export function getEntraConfig(): EntraConfig | null {
  if (missingAuthVars().length > 0) return null;
  const tenantSubdomain = env('ENTRA_TENANT_SUBDOMAIN');
  return {
    tenantId: env('ENTRA_TENANT_ID'),
    tenantSubdomain,
    clientId: env('ENTRA_CLIENT_ID'),
    clientSecret: env('ENTRA_CLIENT_SECRET'),
    authority: env('ENTRA_AUTHORITY') || `https://${tenantSubdomain}.ciamlogin.com/`,
    redirectUri: env('ENTRA_REDIRECT_URI'),
    postLogoutRedirectUri: env('ENTRA_POST_LOGOUT_REDIRECT_URI'),
  };
}

export function logAuthStatus(): void {
  if (!isAuthEnabled()) {
    console.log('User auth: disabled (AUTH_ENABLED=false)');
    if (!isMvpAccessRequired()) {
      console.log('MVP access gate: disabled');
    } else if (getMvpAccessCode() && getAuthSessionSecret()) {
      console.log('MVP access gate: enabled');
    } else {
      console.error('MVP access gate: enabled but NOT configured - missing MVP_ACCESS_CODE / AUTH_SESSION_SECRET');
    }
    return;
  }
  const missing = missingAuthVars();
  if (missing.length > 0) {
    console.error(`User auth: enabled but NOT configured - missing ${missing.join(' / ')}`);
    return;
  }
  console.log('User auth: Microsoft Entra External ID');
}
