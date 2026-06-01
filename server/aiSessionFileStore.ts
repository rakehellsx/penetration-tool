import fs from "fs";
import path from "path";

type StoredMessage = {
  role: string;
  content: string;
  timestamp: number;
  toolCalls?: unknown[];
};

type StoredSession = {
  id: number;
  name: string;
  archived: boolean;
  contextProjectId?: number | null;
  contextFileId?: number | null;
  messages: StoredMessage[];
  totalTokens: number;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
};

type StoreShape = {
  nextId: number;
  sessions: StoredSession[];
};

const STORE_DIR = path.resolve(process.cwd(), "data");
const STORE_PATH = path.join(STORE_DIR, "sessions.json");

function nowIso() {
  return new Date().toISOString();
}

function ensureStoreDir() {
  fs.mkdirSync(STORE_DIR, { recursive: true });
}

function normalizeStore(raw: Partial<StoreShape> | null | undefined): StoreShape {
  const sessions = Array.isArray(raw?.sessions) ? raw!.sessions : [];
  const maxId = sessions.reduce((max, session) => Math.max(max, Number(session.id) || 0), 0);
  return {
    nextId: Math.max(Number(raw?.nextId) || 1, maxId + 1),
    sessions: sessions.map(session => ({
      id: Number(session.id),
      name: session.name || "新会话",
      archived: Boolean(session.archived),
      contextProjectId: session.contextProjectId ?? null,
      contextFileId: session.contextFileId ?? null,
      messages: Array.isArray(session.messages) ? session.messages : [],
      totalTokens: Number(session.totalTokens) || 0,
      ownerId: Number(session.ownerId) || 1,
      createdAt: session.createdAt || nowIso(),
      updatedAt: session.updatedAt || nowIso(),
    })),
  };
}

function readStore(): StoreShape {
  ensureStoreDir();
  if (!fs.existsSync(STORE_PATH)) return { nextId: 1, sessions: [] };
  try {
    return normalizeStore(JSON.parse(fs.readFileSync(STORE_PATH, "utf8")));
  } catch (error) {
    const backupPath = `${STORE_PATH}.corrupt-${Date.now()}`;
    try { fs.copyFileSync(STORE_PATH, backupPath); } catch {}
    return { nextId: 1, sessions: [] };
  }
}

function writeStore(store: StoreShape) {
  ensureStoreDir();
  const normalized = normalizeStore(store);
  const tmpPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(normalized, null, 2), "utf8");
  fs.renameSync(tmpPath, STORE_PATH);
}

export async function listFileSessions(ownerId = 1, archived?: boolean) {
  const store = readStore();
  return store.sessions
    .filter(session => session.ownerId === ownerId)
    .filter(session => archived === undefined || session.archived === archived)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function createFileSession(input: { name?: string; contextProjectId?: number; ownerId?: number }) {
  const store = readStore();
  const timestamp = nowIso();
  const session: StoredSession = {
    id: store.nextId,
    name: input.name || "新会话",
    archived: false,
    contextProjectId: input.contextProjectId ?? null,
    contextFileId: null,
    messages: [],
    totalTokens: 0,
    ownerId: input.ownerId ?? 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  store.nextId += 1;
  store.sessions.push(session);
  writeStore(store);
  return session;
}

export async function updateFileSession(id: number, data: Partial<Omit<StoredSession, "id" | "ownerId" | "createdAt" | "updatedAt">>) {
  const store = readStore();
  const index = store.sessions.findIndex(session => session.id === id);
  if (index === -1) throw new Error("会话不存在");
  const current = store.sessions[index];
  store.sessions[index] = {
    ...current,
    ...data,
    messages: data.messages ?? current.messages,
    totalTokens: data.totalTokens ?? current.totalTokens,
    updatedAt: nowIso(),
  };
  writeStore(store);
  return store.sessions[index];
}

export async function deleteFileSession(id: number) {
  const store = readStore();
  const before = store.sessions.length;
  store.sessions = store.sessions.filter(session => session.id !== id);
  if (store.sessions.length === before) throw new Error("会话不存在");
  writeStore(store);
  return { success: true };
}

export async function appendFileSessionMessages(id: number, messagesToAppend: StoredMessage[], tokenDelta = 0) {
  const store = readStore();
  const index = store.sessions.findIndex(session => session.id === id);
  if (index === -1) return null;
  const current = store.sessions[index];
  store.sessions[index] = {
    ...current,
    messages: [...(current.messages ?? []), ...messagesToAppend],
    totalTokens: (current.totalTokens ?? 0) + tokenDelta,
    updatedAt: nowIso(),
  };
  writeStore(store);
  return store.sessions[index];
}

export const aiSessionFileStorePath = STORE_PATH;
