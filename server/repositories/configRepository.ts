import { FieldValue } from '@google-cloud/firestore';
import type { AppConfig } from '../config/configTypes.js';
import { CONFIG_DOCUMENT_ID, FIRESTORE_COLLECTIONS } from '../firestore/collections.js';
import { getFirestore } from './firestore.js';

function configDocument() {
  return getFirestore().collection(FIRESTORE_COLLECTIONS.config).doc(CONFIG_DOCUMENT_ID);
}

export async function readConfigDocument(): Promise<unknown | null> {
  const snapshot = await configDocument().get();
  return snapshot.exists ? snapshot.data() : null;
}

export async function writeConfigDocument(config: AppConfig): Promise<void> {
  await configDocument().set({ ...config, updatedAt: FieldValue.serverTimestamp() });
}
