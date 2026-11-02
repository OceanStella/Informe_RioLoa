import fs from 'fs/promises';
import path from 'path';
import { CONFIG_DOCUMENT_ID, FIRESTORE_COLLECTIONS } from '../firestore/collections.js';
import { readConfigDocument, writeConfigDocument } from '../repositories/configRepository.js';
import type { AppConfig } from './configTypes.js';
import { validateAppConfig } from './validateConfig.js';

// Cloud Run may run several instances; the TTL lets the others pick up an Admin save.
const CONFIG_CACHE_TTL_MS = 30_000;

const CONFIG_DOCUMENT_PATH = `${FIRESTORE_COLLECTIONS.config}/${CONFIG_DOCUMENT_ID}`;

let cachedConfig: AppConfig | null = null;
let cachedAt = 0;

function configRoot(): string {
  return path.join(process.cwd(), 'config');
}

function defaultConfigPath(): string {
  return path.join(configRoot(), 'default-config.json');
}

function localConfigPath(): string {
  return path.join(configRoot(), 'local-config.json');
}

function isFirestoreStorage(): boolean {
  return process.env.CONFIG_STORAGE?.trim().toLowerCase() === 'firestore';
}

async function readJsonFile(filePath: string): Promise<unknown> {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as unknown;
}

export async function loadDefaultConfig(): Promise<AppConfig> {
  const parsed = validateAppConfig(await readJsonFile(defaultConfigPath()));
  if (!parsed.ok) {
    throw new Error('default-config.json is invalid');
  }
  return parsed.config;
}

async function loadLocalConfig(): Promise<AppConfig> {
  const filePath = localConfigPath();
  try {
    const parsed = validateAppConfig(await readJsonFile(filePath));
    if (!parsed.ok) {
      console.error('local-config.json is invalid, using default-config.json');
      return loadDefaultConfig();
    }
    return parsed.config;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      const fallback = await loadDefaultConfig();
      await fs.mkdir(configRoot(), { recursive: true });
      await fs.writeFile(filePath, `${JSON.stringify(fallback, null, 2)}\n`, 'utf8');
      return fallback;
    }
    throw error;
  }
}

async function saveLocalConfig(config: AppConfig): Promise<void> {
  await fs.mkdir(configRoot(), { recursive: true });
  await fs.writeFile(localConfigPath(), `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

async function loadFirestoreConfig(): Promise<AppConfig> {
  const document = await readConfigDocument();
  if (!document) {
    return loadDefaultConfig();
  }
  const parsed = validateAppConfig(document);
  if (!parsed.ok) {
    throw new Error(`Firestore ${CONFIG_DOCUMENT_PATH} is invalid`);
  }
  return parsed.config;
}

export async function loadConfig(): Promise<AppConfig> {
  if (cachedConfig && Date.now() - cachedAt < CONFIG_CACHE_TTL_MS) return cachedConfig;

  try {
    const config = isFirestoreStorage() ? await loadFirestoreConfig() : await loadLocalConfig();
    cachedConfig = config;
    cachedAt = Date.now();
    return config;
  } catch (error) {
    console.error('Failed to load persistent config, using default-config.json', error);
    return cachedConfig ?? loadDefaultConfig();
  }
}

export async function saveConfig(config: AppConfig): Promise<void> {
  if (isFirestoreStorage()) {
    await writeConfigDocument(config);
  } else {
    await saveLocalConfig(config);
  }
  cachedConfig = config;
  cachedAt = Date.now();
}

export function logConfigStorageStatus(): void {
  if (isFirestoreStorage()) {
    console.log(`Config storage: firestore (${CONFIG_DOCUMENT_PATH})`);
    return;
  }
  console.log('Config storage: local (config/local-config.json)');
}
