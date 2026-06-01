import type { Express, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { getDb } from "./db";
import { aiUsageStats, auditLogs, aiSessions, systemSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { appendFileSessionMessages } from "./aiSessionFileStore";

const execFileAsync = promisify(execFile);

const SYSTEM_PROMPTS: Record<string, string> = {
  chat: "你是一个专业的红队/渗透测试AI助手。你具备深厚的安全知识，能够帮助安全研究人员进行合法的渗透测试工作。请用中文回复，代码部分保持原语言。",
  code_gen: "你是一个专业的安全代码生成助手。根据用户描述生成高质量的渗透测试代码，包括漏洞利用代码、载荷代码等。请提供完整代码，用中文解释，代码用英文注释。生成的代码请用markdown代码块包裹，并标注语言类型。若用户要求生成 Windows 反弹 Shell 示例，请在合法授权测试前提下输出 Go 语言代码，并在回答末尾明确给出本项目会自动保存源码并执行交叉编译，最终返回源码文件与编译产物路径。",
  audit: "你是一个代码安全审计专家。分析提供的代码，找出安全漏洞、可利用点和潜在风险。提供详细的漏洞描述、影响分析和利用思路。用中文回复，代码示例用英文。",
  exploit: "你是一个漏洞利用代码生成专家。生成的代码仅用于合法的安全研究和渗透测试。根据CVE编号或漏洞描述生成利用代码，提供详细注释和使用说明。用中文解释，代码用英文。",
  report: "你是一个渗透测试报告撰写专家。将测试过程和发现整理为专业的渗透测试报告草稿，包括执行摘要、技术细节、风险评级（严重/高/中/低）和修复建议。用中文回复，格式规范。",
};

type ChatMessage = { role: string; content: string };
type OpenCodeConfig = { apiUrl: string; apiKey?: string };

function readDotenvValue(key: string): string | undefined {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return undefined;
  const line = fs.readFileSync(envPath, "utf8").split(/\r?\n/).find(l => l.trim().startsWith(`${key}=`));
  if (!line) return undefined;
  return line.slice(line.indexOf("=") + 1).trim().replace(/^['\"]|['\"]$/g, "");
}

function normalizeOpenCodeBase(apiUrl?: string) {
  const base = (apiUrl || process.env.OPENCODE_API_URL || readDotenvValue("OPENCODE_API_URL") || "http://127.0.0.1:4096").trim();
  return base.replace(/\/+$/, "");
}

function opencodeHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
    headers["X-OpenCode-Key"] = apiKey;
    headers["X-OpenCode-Server-Password"] = apiKey;
  }
  return headers;
}

async function getOpenCodeConfig(override?: Partial<OpenCodeConfig>): Promise<OpenCodeConfig> {
  let apiUrl = override?.apiUrl || process.env.OPENCODE_API_URL || readDotenvValue("OPENCODE_API_URL") || "http://127.0.0.1:4096";
  let apiKey = override?.apiKey || process.env.OPENCODE_API_KEY || readDotenvValue("OPENCODE_API_KEY") || "";
  try {
    const db = await getDb();
    if (db) {
      const settings = await db.select().from(systemSettings);
      const get = (key: string) => settings.find(s => s.key === key)?.value;
      apiUrl = override?.apiUrl || get("ai.opencodeApiUrl") || apiUrl;
      apiKey = override?.apiKey || get("ai.opencodeApiKey") || apiKey;
    }
  } catch {}
  return { apiUrl: normalizeOpenCodeBase(apiUrl), apiKey };
}

async function updateAiStats(tokens: number) {
  const db = await getDb();
  if (!db) return;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const existing = await db.select().from(aiUsageStats).where(eq(aiUsageStats.date, today)).limit(1);
    if (existing[0]) {
      await db.update(aiUsageStats).set({ callCount: existing[0].callCount + 1, tokenCount: existing[0].tokenCount + tokens }).where(eq(aiUsageStats.id, existing[0].id));
    } else {
      await db.insert(aiUsageStats).values({ date: today, callCount: 1, tokenCount: tokens });
    }
  } catch {}
}

async function sendTextByChar(text: string, sendEvent: (data: object) => void, delayMs = 8) {
  for (const ch of text) {
    sendEvent({ type: "chunk", content: ch });
    if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}

function getGeneratedRoot() {
  return path.resolve(process.cwd(), "generated");
}

function ensureGeneratedFile(filePath: string) {
  const resolvedPath = path.resolve(filePath);
  const generatedRoot = getGeneratedRoot();
  if (resolvedPath !== generatedRoot && !resolvedPath.startsWith(`${generatedRoot}${path.sep}`)) {
    throw new Error("非法下载路径：仅允许下载 generated 目录内的编译产物");
  }
  if (!fs.existsSync(resolvedPath)) {
    throw new Error("下载文件不存在或已被清理");
  }
  const stat = fs.statSync(resolvedPath);
  if (!stat.isFile()) {
    throw new Error("下载目标不是文件");
  }
  return { resolvedPath, stat };
}

function buildDownloadUrl(filePath: string) {
  return `/api/ai/download?path=${encodeURIComponent(filePath)}`;
}

async function* streamDeepSeek(messages: ChatMessage[]): AsyncGenerator<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY || readDotenvValue("DEEPSEEK_API_KEY");
  if (!apiKey) throw new Error("DeepSeek API Key 未配置，请在服务端环境变量 DEEPSEEK_API_KEY 中设置。 ");

  const endpoint = process.env.DEEPSEEK_API_URL || readDotenvValue("DEEPSEEK_API_URL") || "https://api.deepseek.com/chat/completions";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "deepseek-chat", messages, stream: true, temperature: 0.3 }),
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    throw new Error(`DeepSeek 调用失败：HTTP ${response.status} ${text.slice(0, 200)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {}
    }
  }
}

async function createOpenCodeSession(config: OpenCodeConfig, title: string) {
  const response = await fetch(`${config.apiUrl}/session`, {
    method: "POST",
    headers: opencodeHeaders(config.apiKey),
    body: JSON.stringify({ title, agent: "build", model: { id: "deepseek-chat", providerID: "deepseek" } }),
  });
  if (!response.ok) throw new Error(`OpenCode 会话创建失败：HTTP ${response.status}`);
  return await response.json() as { id: string };
}

async function queueOpenCodePrompt(config: OpenCodeConfig, sessionID: string, messages: ChatMessage[], systemPrompt: string) {
  const latestUser = [...messages].reverse().find(m => m.role === "user")?.content ?? messages.map(m => m.content).join("\n");
  const context = messages.slice(0, -1).filter(m => m.role !== "system").slice(-8).map(m => `${m.role === "assistant" ? "助手" : "用户"}: ${m.content}`).join("\n\n");
  const prompt = context ? `以下是最近对话上下文：\n${context}\n\n当前用户请求：\n${latestUser}` : latestUser;
  const response = await fetch(`${config.apiUrl}/session/${sessionID}/prompt_async`, {
    method: "POST",
    headers: opencodeHeaders(config.apiKey),
    body: JSON.stringify({
      model: { providerID: "deepseek", modelID: "deepseek-chat" },
      agent: "build",
      tools: {},
      system: systemPrompt,
      parts: [{ type: "text", text: prompt }],
    }),
  });
  if (!response.ok && response.status !== 204) {
    const text = await response.text().catch(() => "");
    throw new Error(`OpenCode 提示提交失败：HTTP ${response.status} ${text.slice(0, 200)}`);
  }
}

async function maybeInitOpenCode(config: OpenCodeConfig, messages: ChatMessage[], systemPrompt: string) {
  const session = await createOpenCodeSession(config, messages.find(m => m.role === "user")?.content.slice(0, 48) || "assistant-chat");
  await queueOpenCodePrompt(config, session.id, messages, systemPrompt);
  return session.id;
}

async function persistSession(sessionId: number | undefined, messages: ChatMessage[], fullContent: string, estimatedTokens: number) {
  if (!sessionId) return;
  try {
    const db = await getDb();
    if (!db) {
      await appendFileSessionMessages(sessionId, [
        ...(messages.length > 0 ? [{ role: messages[messages.length - 1].role, content: messages[messages.length - 1].content, timestamp: Date.now() }] : []),
        { role: "assistant", content: fullContent, timestamp: Date.now() + 1 },
      ], estimatedTokens);
      return;
    }
    const sessions = await db.select().from(aiSessions).where(eq(aiSessions.id, sessionId)).limit(1);
    if (!sessions[0]) return;
    const existingMessages = (sessions[0].messages as any[]) ?? [];
    const newMessages = [
      ...existingMessages,
      ...(messages.length > 0 ? [{ role: messages[messages.length - 1].role, content: messages[messages.length - 1].content, timestamp: Date.now() }] : []),
      { role: "assistant", content: fullContent, timestamp: Date.now() + 1 },
    ];
    await db.update(aiSessions).set({ messages: newMessages, totalTokens: (sessions[0].totalTokens ?? 0) + estimatedTokens }).where(eq(aiSessions.id, sessionId));
  } catch {}
}

export function registerAIStreamRoute(app: Express) {
  app.post("/api/ai/opencode/test", async (req: Request, res: Response) => {
    try {
      const cfg = await getOpenCodeConfig({ apiUrl: req.body?.opencodeApiUrl, apiKey: req.body?.opencodeApiKey });
      const response = await fetch(`${cfg.apiUrl}/config/providers`, { headers: opencodeHeaders(cfg.apiKey), signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const providers = await response.json().catch(() => ({}));
      const providerCount = Array.isArray(providers) ? providers.length : Object.keys(providers || {}).length;
      res.json({ success: true, apiUrl: cfg.apiUrl, providerCount, hasDeepSeek: JSON.stringify(providers).toLowerCase().includes("deepseek") });
    } catch (err: any) {
      res.status(502).json({ success: false, message: err?.message ?? "OpenCode 连接失败" });
    }
  });

  app.post("/api/ai/windows-revshell/build", async (req: Request, res: Response) => {
    try {
      const { code, fileName = "windows_reverse_shell.go" } = req.body as { code?: string; fileName?: string };
      if (!code || typeof code !== "string") return res.status(400).json({ success: false, message: "缺少 Go 源码" });
      const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_").replace(/\.(exe|bin)$/i, ".go");
      const buildDir = path.resolve(process.cwd(), "generated", "windows-revshell", String(Date.now()));
      fs.mkdirSync(buildDir, { recursive: true });
      const sourcePath = path.join(buildDir, safeName.endsWith(".go") ? safeName : `${safeName}.go`);
      const artifactPath = path.join(buildDir, safeName.replace(/\.go$/i, ".exe"));
      fs.writeFileSync(sourcePath, code, "utf8");

      let stdout = "";
      let stderr = "";
      try {
        const goPath = process.env.GO_PATH || "go";
        const result = await execFileAsync(goPath, ["build", "-trimpath", "-ldflags", "-s -w", "-o", artifactPath, sourcePath], {
          env: { ...process.env, GOOS: "windows", GOARCH: "amd64", CGO_ENABLED: "0" },
          timeout: 120000,
          maxBuffer: 1024 * 1024 * 5,
        });
        stdout = result.stdout;
        stderr = result.stderr;
      } catch (err: any) {
        stdout = err?.stdout ?? "";
        stderr = err?.stderr ?? err?.message ?? "编译失败";
        return res.status(500).json({ success: false, message: "Go 交叉编译失败", sourcePath, artifactPath, stdout, stderr });
      }

      const stat = fs.existsSync(artifactPath) ? fs.statSync(artifactPath) : null;
      res.json({
        success: true,
        sourcePath,
        artifactPath,
        sourceDownloadUrl: buildDownloadUrl(sourcePath),
        artifactDownloadUrl: buildDownloadUrl(artifactPath),
        artifactSize: stat?.size ?? 0,
        stdout,
        stderr,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message ?? "自动编译失败" });
    }
  });

  app.get("/api/ai/download", async (req: Request, res: Response) => {
    try {
      const requestedPath = typeof req.query.path === "string" ? req.query.path : "";
      if (!requestedPath) return res.status(400).json({ success: false, message: "缺少下载路径" });
      const { resolvedPath, stat } = ensureGeneratedFile(requestedPath);
      res.setHeader("Content-Length", String(stat.size));
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.download(resolvedPath, path.basename(resolvedPath));
    } catch (err: any) {
      res.status(400).json({ success: false, message: err?.message ?? "文件下载失败" });
    }
  });

  app.post("/api/ai/stream", async (req: Request, res: Response) => {
    const { messages = [], mode = "chat", systemPrompt, contextCode, contextProject, sessionId } = req.body as {
      messages: ChatMessage[];
      mode?: string;
      systemPrompt?: string;
      contextCode?: string;
      contextProject?: string;
      sessionId?: number;
    };

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const sendEvent = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    try {
      const sysPrompt = systemPrompt ?? SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPTS.chat;
      const fullMessages: ChatMessage[] = [{ role: "system", content: sysPrompt }];
      if (contextProject) fullMessages.push({ role: "system", content: `当前项目上下文：${contextProject}` });
      if (contextCode) fullMessages.push({ role: "system", content: `当前代码上下文：\n\`\`\`\n${contextCode.slice(0, 2000)}\n\`\`\`` });
      fullMessages.push(...messages);

      const config = await getOpenCodeConfig();
      maybeInitOpenCode(config, fullMessages, sysPrompt).catch((e) => console.warn("OpenCode queue failed, continue with DeepSeek stream:", e?.message ?? e));

      let fullContent = "";
      let charCount = 0;
      const startTime = Date.now();
      for await (const chunk of streamDeepSeek(fullMessages)) {
        fullContent += chunk;
        charCount += chunk.length;
        await sendTextByChar(chunk, sendEvent, 6);
      }

      const estimatedTokens = Math.ceil(charCount / 4) + Math.ceil(fullMessages.reduce((s, m) => s + m.content.length, 0) / 4);
      await updateAiStats(estimatedTokens);
      await persistSession(sessionId, messages, fullContent, estimatedTokens);

      try {
        const db = await getDb();
        if (db) await db.insert(auditLogs).values({ userId: 1, userName: "User", action: "ai_generate", module: "ai", details: { mode, tokens: estimatedTokens, stream: true, provider: "opencode+deepseek" } });
      } catch {}

      sendEvent({ type: "done", totalTokens: estimatedTokens, content: fullContent, durationMs: Date.now() - startTime });
    } catch (err: any) {
      sendEvent({ type: "error", message: err?.message ?? "AI 请求失败" });
    } finally {
      res.end();
    }
  });
}
