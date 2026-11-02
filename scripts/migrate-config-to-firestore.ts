/**
 * One-off migration: gs://<bucket>/config-v2.json -> Firestore informeOctavioConfig/main.
 * Never deletes the JSON object; it stays as a backup.
 *
 * Idempotent: an existing document is compared and never overwritten, because Admin may
 * have changed it after the migration. Touches no other document in the shared database.
 *
 * Auth: Application Default Credentials, or GCLOUD_ACCESS_TOKEN for a short-lived
 * `gcloud auth print-access-token` when ADC is not set up on the machine.
 *
 *   npm run migrate:config              validate, compare and create if missing
 *   npm run migrate:config -- --dry-run validate and compare, write nothing
 */
import { FieldValue, Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';
import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import type { AppConfig, EquipmentConfigItem, NamedConfigItem } from '../server/config/configTypes.js';
import { validateAppConfig } from '../server/config/validateConfig.js';
import { CONFIG_DOCUMENT_ID, FIRESTORE_COLLECTIONS } from '../server/firestore/collections.js';

const PROJECT_ID = 'pokemic';
const BUCKET = 'pokemic-127635471462-informe-octavio-config';
const OBJECT = 'config-v2.json';

function buildClients() {
  const accessToken = process.env.GCLOUD_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    return { storage: new Storage({ projectId: PROJECT_ID }), firestore: new Firestore({ projectId: PROJECT_ID }) };
  }

  const authClient = new OAuth2Client();
  authClient.setCredentials({ access_token: accessToken });
  return {
    storage: new Storage({ projectId: PROJECT_ID, authClient: new GoogleAuth({ authClient, projectId: PROJECT_ID }) }),
    firestore: new Firestore({
      projectId: PROJECT_ID,
      auth: new GoogleAuth({ authClient, projectId: PROJECT_ID }),
    } as ConstructorParameters<typeof Firestore>[0]),
  };
}

function compareNamed(label: string, source: NamedConfigItem[], target: NamedConfigItem[]): string[] {
  const problems: string[] = [];
  if (source.length !== target.length) problems.push(`${label}: ${source.length} vs ${target.length} items`);
  source.forEach((item, index) => {
    const other = target[index];
    if (other?.id !== item.id || other?.name !== item.name) problems.push(`${label}: difference in id ${item.id}`);
  });
  return problems;
}

function compareEquipment(source: EquipmentConfigItem[], target: EquipmentConfigItem[]): string[] {
  const problems: string[] = [];
  if (source.length !== target.length) problems.push(`equipment: ${source.length} vs ${target.length} items`);
  source.forEach((item, index) => {
    const other = target[index];
    if (
      other?.id !== item.id ||
      other?.code !== item.code ||
      other?.type !== item.type ||
      other?.capacityM3 !== item.capacityM3
    ) {
      problems.push(`equipment: difference in id ${item.id}`);
    }
  });
  return problems;
}

function compareConfig(source: AppConfig, target: AppConfig): string[] {
  return [
    ...compareNamed('generalAreas', source.generalAreas, target.generalAreas),
    ...compareNamed('activityAreas', source.activityAreas, target.activityAreas),
    ...compareEquipment(source.equipment, target.equipment),
  ];
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const { storage, firestore } = buildClients();

  console.log(`Source: gs://${BUCKET}/${OBJECT}`);
  const [contents] = await storage.bucket(BUCKET).file(OBJECT).download();
  const parsed = validateAppConfig(JSON.parse(contents.toString('utf8')) as unknown);
  if (!parsed.ok) throw new Error(`Source config is invalid: ${parsed.message}`);

  const source = parsed.config;
  console.log(
    `Validated: ${source.generalAreas.length} generalAreas, ${source.activityAreas.length} activityAreas, ` +
      `${source.equipment.length} equipment`,
  );

  const target = firestore.collection(FIRESTORE_COLLECTIONS.config).doc(CONFIG_DOCUMENT_ID);
  const existing = await target.get();
  console.log(`Target: ${target.path} (${existing.exists ? 'already exists' : 'does not exist yet'})`);

  if (existing.exists) {
    assertMatchesSource(source, existing.data());
    console.log('Already migrated and identical to the source: nothing written.');
    return;
  }

  if (dryRun) {
    console.log('Dry run: nothing written.');
    return;
  }

  // create() fails if the document appeared in the meantime, so it can never overwrite.
  await target.create({ ...source, updatedAt: FieldValue.serverTimestamp() });
  assertMatchesSource(source, (await target.get()).data());

  console.log('Verified: IDs, names, codes, types and capacityM3 match the source.');
  console.log(`Backup kept: gs://${BUCKET}/${OBJECT}`);
}

function assertMatchesSource(source: AppConfig, document: unknown): void {
  const parsed = validateAppConfig(document);
  if (!parsed.ok) throw new Error(`Firestore document is invalid: ${parsed.message}`);

  const problems = compareConfig(source, parsed.config);
  if (problems.length > 0) {
    problems.forEach((problem) => console.error(`DIFF ${problem}`));
    throw new Error(`${problems.length} difference(s) with the source. Nothing was overwritten.`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
