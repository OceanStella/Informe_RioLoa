import { Timestamp } from '@google-cloud/firestore';
import { FIRESTORE_COLLECTIONS } from '../firestore/collections.js';
import { getFirestore } from './firestore.js';

export interface UserIdentity {
  externalId: string;
  email: string;
  displayName: string;
  tenantId: string;
}

export async function upsertUser(identity: UserIdentity): Promise<void> {
  const db = getFirestore();
  const ref = db.collection(FIRESTORE_COLLECTIONS.users).doc(identity.externalId);
  const now = Timestamp.now();

  await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    tx.set(ref, { ...identity, lastLoginAt: now, ...(existing.exists ? {} : { createdAt: now }) }, { merge: true });
  });
}
