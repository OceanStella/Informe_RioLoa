import { Firestore } from '@google-cloud/firestore';

let client: Firestore | null = null;

export function getFirestore(): Firestore {
  client ??= new Firestore({ ignoreUndefinedProperties: true });
  return client;
}
