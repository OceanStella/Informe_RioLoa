import { ConfidentialClientApplication, CryptoProvider } from '@azure/msal-node';
import crypto from 'crypto';
import type { EntraConfig } from '../config/authConfig.js';
import type { UserIdentity } from '../repositories/usersRepository.js';

const SCOPES = ['openid', 'profile', 'email'];

export interface AuthFlowState {
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
}

let msalClient: ConfidentialClientApplication | null = null;

function getMsalClient(config: EntraConfig): ConfidentialClientApplication {
  msalClient ??= new ConfidentialClientApplication({
    auth: {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      authority: config.authority,
      knownAuthorities: [new URL(config.authority).hostname],
    },
  });
  return msalClient;
}

export async function buildAuthorizationRequest(
  config: EntraConfig,
  returnTo: string,
): Promise<{ authorizationUrl: string; flow: AuthFlowState }> {
  const { verifier, challenge } = await new CryptoProvider().generatePkceCodes();
  const flow: AuthFlowState = {
    state: crypto.randomBytes(16).toString('hex'),
    nonce: crypto.randomBytes(16).toString('hex'),
    codeVerifier: verifier,
    returnTo,
  };

  const authorizationUrl = await getMsalClient(config).getAuthCodeUrl({
    scopes: SCOPES,
    redirectUri: config.redirectUri,
    state: flow.state,
    nonce: flow.nonce,
    codeChallenge: challenge,
    codeChallengeMethod: 'S256',
    responseMode: 'query',
  });

  return { authorizationUrl, flow };
}

/** Prefers the immutable oid; email falls back to the sign-in name used by External ID local accounts. */
export function resolveIdentity(claims: Record<string, unknown>, config: EntraConfig): UserIdentity | null {
  const expiresAt = typeof claims.exp === 'number' ? claims.exp : 0;
  if (claims.aud !== config.clientId || expiresAt * 1000 <= Date.now()) return null;
  if (typeof claims.tid === 'string' && claims.tid !== config.tenantId) return null;

  const stringClaim = (name: string) => {
    const value = claims[name];
    return typeof value === 'string' ? value.trim() : '';
  };

  const externalId = stringClaim('oid') || stringClaim('sub');
  const emails = Array.isArray(claims.emails) ? claims.emails : [];
  const candidates = [stringClaim('email'), stringClaim('preferred_username'), emails[0]];
  const email = candidates.find((value): value is string => typeof value === 'string' && value.includes('@'));
  if (!externalId || !email) return null;

  return {
    externalId,
    email: email.toLowerCase(),
    displayName: stringClaim('name'),
    tenantId: config.tenantId,
  };
}

/** MSAL rejects a nonce mismatch; the tokens themselves are discarded right after reading the claims. */
export async function exchangeCodeForIdentity(
  config: EntraConfig,
  code: string,
  flow: AuthFlowState,
): Promise<UserIdentity | null> {
  const client = getMsalClient(config);
  const result = await client.acquireTokenByCode(
    {
      code,
      scopes: SCOPES,
      redirectUri: config.redirectUri,
      codeVerifier: flow.codeVerifier,
      state: flow.state,
    },
    { code, state: flow.state, nonce: flow.nonce },
  );

  if (result.account) {
    await client.getTokenCache().removeAccount(result.account);
  }
  return resolveIdentity(result.idTokenClaims as Record<string, unknown>, config);
}

export function buildLogoutUrl(config: EntraConfig): string {
  const url = new URL(`/${config.tenantId}/oauth2/v2.0/logout`, config.authority);
  url.searchParams.set('post_logout_redirect_uri', config.postLogoutRedirectUri);
  return url.toString();
}
