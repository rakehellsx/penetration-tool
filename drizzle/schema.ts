import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  boolean,
  float,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Projects ─────────────────────────────────────────────────────────────────
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  platform: varchar("platform", { length: 64 }),
  language: varchar("language", { length: 64 }),
  status: mysqlEnum("status", ["active", "archived", "draft"]).default("active").notNull(),
  tags: json("tags").$type<string[]>(),
  ownerId: int("ownerId").notNull(),
  linkedPayloadIds: json("linkedPayloadIds").$type<number[]>(),
  linkedTemplateIds: json("linkedTemplateIds").$type<number[]>(),
  buildConfig: json("buildConfig").$type<Record<string, unknown>>(),
  fileStorageKey: varchar("fileStorageKey", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ─── Project Members ──────────────────────────────────────────────────────────
export const projectMembers = mysqlTable("project_members", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  permission: mysqlEnum("permission", ["readonly", "editor", "admin"]).default("readonly").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Project Files ────────────────────────────────────────────────────────────
export const projectFiles = mysqlTable("project_files", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  path: varchar("path", { length: 1024 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  content: text("content"),
  language: varchar("language", { length: 64 }),
  storageKey: varchar("storageKey", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectFile = typeof projectFiles.$inferSelect;

// ─── Payloads ─────────────────────────────────────────────────────────────────
export const payloads = mysqlTable("payloads", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  os: mysqlEnum("os", ["windows", "linux", "macos", "cross"]).notNull(),
  arch: mysqlEnum("arch", ["x64", "x86", "arm64", "arm"]).default("x64").notNull(),
  payloadType: mysqlEnum("payloadType", ["shellcode", "exe", "dll", "script", "other"]).notNull(),
  listenType: mysqlEnum("listenType", ["reverse_shell", "bind", "http", "dns", "other"]),
  lhost: varchar("lhost", { length: 255 }),
  lport: int("lport"),
  encoding: varchar("encoding", { length: 128 }),
  obfuscation: varchar("obfuscation", { length: 128 }),
  encryption: varchar("encryption", { length: 128 }),
  avScore: float("avScore"),
  avDetections: int("avDetections"),
  avTotal: int("avTotal"),
  avScanResult: json("avScanResult").$type<Record<string, unknown>>(),
  tags: json("tags").$type<string[]>(),
  notes: text("notes"),
  storageKey: varchar("storageKey", { length: 512 }),
  fileSize: int("fileSize"),
  fileHash: varchar("fileHash", { length: 128 }),
  ownerId: int("ownerId").notNull(),
  parentId: int("parentId"),
  generationParams: json("generationParams").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payload = typeof payloads.$inferSelect;
export type InsertPayload = typeof payloads.$inferInsert;

// ─── Templates ────────────────────────────────────────────────────────────────
export const templates = mysqlTable("templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["injection", "privilege_escalation", "lateral_movement", "persistence", "recon", "evasion", "other"]).notNull(),
  platform: varchar("platform", { length: 64 }),
  language: varchar("language", { length: 64 }),
  mitreAttack: json("mitreAttack").$type<string[]>(),
  codeTemplate: text("codeTemplate"),
  parameters: json("parameters").$type<Array<{name: string; type: string; description: string; defaultValue?: string}>>(),
  isBuiltin: boolean("isBuiltin").default(false).notNull(),
  tags: json("tags").$type<string[]>(),
  ownerId: int("ownerId"),
  storageKey: varchar("storageKey", { length: 512 }),
  version: int("version").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;

// ─── Template Versions ────────────────────────────────────────────────────────
export const templateVersions = mysqlTable("template_versions", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull(),
  version: int("version").notNull(),
  codeTemplate: text("codeTemplate"),
  parameters: json("parameters").$type<Array<{name: string; type: string; description: string; defaultValue?: string}>>(),
  changelog: text("changelog"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Builds ───────────────────────────────────────────────────────────────────
export const builds = mysqlTable("builds", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  name: varchar("name", { length: 255 }),
  platform: varchar("platform", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["pending", "running", "success", "failed", "cancelled"]).default("pending").notNull(),
  pipeline: json("pipeline").$type<Array<{step: string; status: string; log?: string}>>(),
  buildLog: text("buildLog"),
  artifactKey: varchar("artifactKey", { length: 512 }),
  artifactSize: int("artifactSize"),
  artifactHash: varchar("artifactHash", { length: 128 }),
  avScore: float("avScore"),
  avDetections: int("avDetections"),
  avTotal: int("avTotal"),
  linkedPayloadId: int("linkedPayloadId"),
  duration: int("duration"),
  ownerId: int("ownerId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Build = typeof builds.$inferSelect;
export type InsertBuild = typeof builds.$inferInsert;

// ─── AI Sessions ──────────────────────────────────────────────────────────────
export const aiSessions = mysqlTable("ai_sessions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  archived: boolean("archived").default(false).notNull(),
  contextProjectId: int("contextProjectId"),
  contextFileId: int("contextFileId"),
  messages: json("messages").$type<Array<{role: string; content: string; timestamp: number; toolCalls?: unknown[]}>>(),
  totalTokens: int("totalTokens").default(0),
  ownerId: int("ownerId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiSession = typeof aiSessions.$inferSelect;
export type InsertAiSession = typeof aiSessions.$inferInsert;

// ─── AI Usage Stats ───────────────────────────────────────────────────────────
export const aiUsageStats = mysqlTable("ai_usage_stats", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 16 }).notNull(),
  callCount: int("callCount").default(0).notNull(),
  tokenCount: int("tokenCount").default(0).notNull(),
  promptTokens: int("promptTokens").default(0).notNull(),
  completionTokens: int("completionTokens").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  userName: varchar("userName", { length: 255 }),
  action: varchar("action", { length: 128 }).notNull(),
  module: varchar("module", { length: 64 }).notNull(),
  resourceId: int("resourceId"),
  resourceName: varchar("resourceName", { length: 255 }),
  details: json("details").$type<Record<string, unknown>>(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;

// ─── System Settings ──────────────────────────────────────────────────────────
export const systemSettings = mysqlTable("system_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: text("value"),
  category: varchar("category", { length: 64 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Code Snippets ────────────────────────────────────────────────────────────
export const codeSnippets = mysqlTable("code_snippets", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  language: varchar("language", { length: 64 }).notNull(),
  code: text("code").notNull(),
  category: varchar("category", { length: 128 }),
  tags: json("tags").$type<string[]>(),
  isBuiltin: boolean("isBuiltin").default(false).notNull(),
  ownerId: int("ownerId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CodeSnippet = typeof codeSnippets.$inferSelect;
