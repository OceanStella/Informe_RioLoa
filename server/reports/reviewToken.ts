import crypto from 'crypto';

export function createReviewToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashReviewToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function isReviewTokenFormat(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
