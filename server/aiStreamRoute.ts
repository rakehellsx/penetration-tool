import type { Express, Request, Response } from "express";
import { invokeLLMStream } from "./_core/llmStream";
import { getDb } from "./db";
import { aiUsageStats, auditLogs, aiSessions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// System prompts per mode
const SYSTEM_PROMPTS: Record<string, string> = {
  chat: "你是一个专业的红队/渗透测试AI助手。你具备深厚的安全知识，能够帮助安全研究人员进行合法的渗透测试工作。请用中文回复，代码部分保持原语言。",
  code_gen: "你是一个专业的安全代码生成助手。根据用户描述生成高质量的渗透测试代码，包括漏洞利用代码、载荷代码等。请提供完整代码，用中文解释，代码用英文注释。生成的代码请用markdown代码块包裹，并标注语言类型。",
  audit: "你是一个代码安全审计专家。分析提供的代码，找出安全漏洞、可利用点和潜在风险。提供详细的漏洞描述、影响分析和利用思路。用中文回复，代码示例用英文。",
  exploit: "你是一个漏洞利用代码生成专家。生成的代码仅用于合法的安全研究和渗透测试。根据CVE编号或漏洞描述生成利用代码，提供详细注释和使用说明。用中文解释，代码用英文。",
  report: "你是一个渗透测试报告撰写专家。将测试过程和发现整理为专业的渗透测试报告草稿，包括执行摘要、技术细节、风险评级（严重/高/中/低）和修复建议。用中文回复，格式规范。",
};

async function updateAiStats(tokens: number) {
  const db = await getDb();
  if (!db) return;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const existing = await db.select().from(aiUsageStats).where(eq(aiUsageStats.date, today)).limit(1);
    if (existing[0]) {
      await db.update(aiUsageStats).set({
        callCount: existing[0].callCount + 1,
        tokenCount: existing[0].tokenCount + tokens,
      }).where(eq(aiUsageStats.id, existing[0].id));
    } else {
      await db.insert(aiUsageStats).values({ date: today, callCount: 1, tokenCount: tokens });
    }
  } catch {}
}

export function registerAIStreamRoute(app: Express) {
  /**
   * POST /api/ai/stream
   * Body: { messages, mode, systemPrompt?, contextCode?, contextProject?, sessionId? }
   * Response: text/event-stream
   *
   * SSE format:
   *   data: {"type":"chunk","content":"..."}
   *   data: {"type":"done","totalTokens":123}
   *   data: {"type":"error","message":"..."}
   */
  app.post("/api/ai/stream", async (req: Request, res: Response) => {
    const {
      messages = [],
      mode = "chat",
      systemPrompt,
      contextCode,
      contextProject,
      sessionId,
    } = req.body as {
      messages: Array<{ role: string; content: string }>;
      mode?: string;
      systemPrompt?: string;
      contextCode?: string;
      contextProject?: string;
      sessionId?: number;
    };

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const sendEvent = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // Build full message list
      const sysPrompt = systemPrompt ?? SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPTS.chat;
      const fullMessages: Array<{ role: string; content: string }> = [
        { role: "system", content: sysPrompt },
      ];

      if (contextProject) {
        fullMessages.push({ role: "system", content: `当前项目上下文：${contextProject}` });
      }
      if (contextCode) {
        fullMessages.push({ role: "system", content: `当前代码上下文：\n\`\`\`\n${contextCode.slice(0, 2000)}\n\`\`\`` });
      }
      fullMessages.push(...messages);

      // Read AI model config from DB
      let modelOverride: string | undefined;
      try {
        const db = await getDb();
        if (db) {
          const { systemSettings } = await import("../drizzle/schema");
          const settings = await db.select().from(systemSettings);
          const modelSetting = settings.find(s => s.key === "ai.model");
          if (modelSetting?.value) modelOverride = modelSetting.value;
        }
      } catch {}

      // Stream the response
      let fullContent = "";
      let charCount = 0;

      for await (const chunk of invokeLLMStream({ messages: fullMessages, model: modelOverride })) {
        fullContent += chunk;
        charCount += chunk.length;
        sendEvent({ type: "chunk", content: chunk });
      }

      // Estimate token count (rough: ~4 chars per token)
      const estimatedTokens = Math.ceil(charCount / 4) + Math.ceil(fullMessages.reduce((s, m) => s + m.content.length, 0) / 4);

      // Update stats
      await updateAiStats(estimatedTokens);

      // Persist message to session if sessionId provided
      if (sessionId) {
        try {
          const db = await getDb();
          if (db) {
            const sessions = await db.select().from(aiSessions).where(eq(aiSessions.id, sessionId)).limit(1);
            if (sessions[0]) {
              const existingMessages = (sessions[0].messages as any[]) ?? [];
              const newMessages = [
                ...existingMessages,
                // Add the last user message
                ...(messages.length > 0 ? [{ role: messages[messages.length - 1].role, content: messages[messages.length - 1].content, timestamp: Date.now() }] : []),
                // Add assistant reply
                { role: "assistant", content: fullContent, timestamp: Date.now() + 1 },
              ];
              await db.update(aiSessions).set({
                messages: newMessages,
                totalTokens: (sessions[0].totalTokens ?? 0) + estimatedTokens,
              }).where(eq(aiSessions.id, sessionId));
            }
          }
        } catch {}
      }

      // Audit log
      try {
        const db = await getDb();
        if (db) {
          await db.insert(auditLogs).values({
            userId: 1,
            userName: "User",
            action: "ai_generate",
            module: "ai",
            details: { mode, tokens: estimatedTokens, stream: true },
          });
        }
      } catch {}

      sendEvent({ type: "done", totalTokens: estimatedTokens, content: fullContent });
    } catch (err: any) {
      sendEvent({ type: "error", message: err.message ?? "AI 请求失败" });
    } finally {
      res.end();
    }
  });
}
