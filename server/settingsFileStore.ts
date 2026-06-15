import fs from "fs";
import path from "path";

type StoredSetting = {
  id: number;
  key: string;
  value: string | null;
  category?: string | null;
  updatedAt: string;
};

type StoreShape = {
  nextId: number;
  settings: StoredSetting[];
};

type SettingInput = {
  key: string;
  value: string;
  category?: string;
};

const STORE_DIR = path.resolve(process.cwd(), "data");
const STORE_PATH = path.join(STORE_DIR, "settings.json");

function nowIso() {
  return new Date().toISOString();
}

function ensureStoreDir() {
  fs.mkdirSync(STORE_DIR, { recursive: true });
}

function normalizeStore(raw: Partial<StoreShape> | null | undefined): StoreShape {
  const settings = Array.isArray(raw?.settings) ? raw!.settings : [];
  const normalizedSettings = settings
    .filter(setting => typeof setting?.key === "string" && setting.key.length > 0)
    .map(setting => ({
      id: Number(setting.id) || 0,
      key: setting.key,
      value: setting.value ?? "",
      category: setting.category ?? null,
      updatedAt: setting.updatedAt || nowIso(),
    }));
  const maxId = normalizedSettings.reduce((max, setting) => Math.max(max, Number(setting.id) || 0), 0);
  return {
    nextId: Math.max(Number(raw?.nextId) || 1, maxId + 1),
    settings: normalizedSettings.map((setting, index) => ({
      ...setting,
      id: setting.id || index + 1,
    })),
  };
}

function readStore(): StoreShape {
  ensureStoreDir();
  if (!fs.existsSync(STORE_PATH)) return { nextId: 1, settings: [] };
  try {
    return normalizeStore(JSON.parse(fs.readFileSync(STORE_PATH, "utf8")));
  } catch {
    const backupPath = `${STORE_PATH}.corrupt-${Date.now()}`;
    try { fs.copyFileSync(STORE_PATH, backupPath); } catch {}
    return { nextId: 1, settings: [] };
  }
}

function writeStore(store: StoreShape) {
  ensureStoreDir();
  const normalized = normalizeStore(store);
  const tmpPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(normalized, null, 2), "utf8");
  fs.renameSync(tmpPath, STORE_PATH);
}

export async function listFileSettings() {
  return readStore().settings;
}

export async function getFileSetting(key: string) {
  return readStore().settings.find(setting => setting.key === key) ?? null;
}

export async function setFileSetting(input: SettingInput) {
  const store = readStore();
  const existingIndex = store.settings.findIndex(setting => setting.key === input.key);
  const timestamp = nowIso();
  if (existingIndex >= 0) {
    store.settings[existingIndex] = {
      ...store.settings[existingIndex],
      value: input.value,
      category: input.category ?? store.settings[existingIndex].category ?? null,
      updatedAt: timestamp,
    };
    writeStore(store);
    return store.settings[existingIndex];
  }
  const setting: StoredSetting = {
    id: store.nextId,
    key: input.key,
    value: input.value,
    category: input.category ?? null,
    updatedAt: timestamp,
  };
  store.nextId += 1;
  store.settings.push(setting);
  writeStore(store);
  return setting;
}

export async function setManyFileSettings(input: SettingInput[]) {
  for (const item of input) {
    await setFileSetting(item);
  }
  return { success: true };
}

export const settingsFileStorePath = STORE_PATH;
