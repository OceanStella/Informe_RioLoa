import crypto from 'crypto';
import { isValidEmail, normalizeEmail } from '../utils/email.js';

/**
 * Temporary MVP identity for AUTH_ENABLED=false. It is self-declared, so it gives traceability,
 * not authentication. It only ever exists as a snapshot inside a report.
 */
export interface GuestProfile {
  displayName: string;
  email: string;
}

const MAX_NAME_LENGTH = 200;

export function parseGuestProfile(value: unknown): GuestProfile | null {
  if (!value || typeof value !== 'object') return null;
  const { displayName, email } = value as Record<string, unknown>;
  if (typeof displayName !== 'string' || typeof email !== 'string') return null;

  const name = displayName.trim().slice(0, MAX_NAME_LENGTH);
  const normalizedEmail = normalizeEmail(email);
  if (!name || !isValidEmail(normalizedEmail)) return null;
  return { displayName: name, email: normalizedEmail };
}

export function guestUserId(email: string): string {
  const hash = crypto.createHash('sha256').update(normalizeEmail(email)).digest('hex');
  return `guest:${hash}`;
}
