import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { aiSessions, aiUsageStats, auditLogs } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { systemSettings } from "../../drizzle/schema";
import { createFileSession, deleteFileSession, listFileSessions, updateFileSession } from "../aiSessionFileStore";
import { listFileSettings } from "../settingsFileStore";

async function getAiConfig(db: any) {
  try {
    const settings = db ? await db.select().from(systemSettings) : await listFileSettings();
    const get = (key: string) => settings.find((s: any) => s.key === key)?.value;
    return {
      model: get("ai.model") ?? undefined,
      temperature: get("ai.temperature") ? parseFloat(get("ai.temperature")) : undefined,
      maxTokens: get("ai.maxTokens") ? parseInt(get("ai.maxTokens")) : undefined,
    };
  } catch { return {}; }
}

async function updateAiStats(tokens: number, promptTokens: number, completionTokens: number) {
  const db = await getDb();
  if (!db) return;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const existing = await db.select().from(aiUsageStats).where(eq(aiUsageStats.date, today)).limit(1);
    if (existing[0]) {
      await db.update(aiUsageStats).set({
        callCount: existing[0].callCount + 1,
        tokenCount: existing[0].tokenCount + tokens,
        promptTokens: existing[0].promptTokens + promptTokens,
        completionTokens: existing[0].completionTokens + completionTokens,
      }).where(eq(aiUsageStats.id, existing[0].id));
    } else {
      await db.insert(aiUsageStats).values({
        date: today,
        callCount: 1,
        tokenCount: tokens,
        promptTokens,
        completionTokens,
      });
    }
  } catch {}
}

export const aiRouter = router({
  // Session management
  listSessions: publicProcedure
    .input(z.object({ archived: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const ownerId = (ctx.user as any)?.id ?? 1;
      if (!db) return listFileSessions(ownerId, input?.archived);
      try {
        const rows = await db.select().from(aiSessions)
          .where(eq(aiSessions.ownerId, ownerId))
          .orderBy(desc(aiSessions.updatedAt));
        return rows.filter(s => {
          if (input?.archived !== undefined && s.archived !== input.archived) return false;
          return true;
        });
      } catch { return []; }
    }),

  createSession: publicProcedure
    .input(z.object({
      name: z.string().default("新会话"),
      contextProjectId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const ownerId = (ctx.user as any)?.id ?? 1;
      if (!db) {
        const session = await createFileSession({ name: input.name, contextProjectId: input.contextProjectId, ownerId });
        return { id: session.id };
      }
      const [result] = await db.insert(aiSessions).values({
        name: input.name,
        ownerId,
        contextProjectId: input.contextProjectId,
        messages: [],
        totalTokens: 0,
      });
      return { id: (result as any).insertId };
    }),

  updateSession: publicProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      archived: z.boolean().optional(),
      messages: z.array(z.object({
        role: z.string(),
        content: z.string(),
        timestamp: z.number(),
        toolCalls: z.array(z.unknown()).optional(),
      })).optional(),
      totalTokens: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...data } = input;
      if (!db) {
        await updateFileSession(id, data);
        return { success: true };
      }
      await db.update(aiSessions).set(data).where(eq(aiSessions.id, id));
      return { success: true };
    }),

  deleteSession: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return deleteFileSession(input.id);
      await db.delete(aiSessions).where(eq(aiSessions.id, input.id));
      return { success: true };
    }),

  // AI Chat
  chat: publicProcedure
    .input(z.object({
      sessionId: z.number().optional(),
      messages: z.array(z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      })),
      systemPrompt: z.string().optional(),
      mode: z.enum(["chat", "code_gen", "audit", "exploit", "report", "explain", "obfuscate", "deobfuscate", "rewrite"]).default("chat"),
      contextCode: z.string().optional(),
      contextProject: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const systemPrompts: Record<string, string> = {
        chat: "你是一个专业的红队/渗透测试AI助手。你具备深厚的安全知识，能够帮助安全研究人员进行合法的渗透测试工作。请用中文回复。",
        code_gen: "你是一个专业的安全代码生成助手。根据用户描述生成高质量的渗透测试代码，包括漏洞利用代码、载荷代码等。请提供详细注释。用中文解释，代码用英文。",
        audit: "你是一个代码安全审计专家。分析提供的代码，找出安全漏洞、可利用点和潜在风险。提供详细的漏洞描述、影响分析和利用思路。用中文回复。",
        exploit: "你是一个漏洞利用专家。根据CVE编号或漏洞描述，生成对应的利用代码和利用思路。提供完整的利用链分析。用中文解释，代码用英文。",
        report: "你是一个渗透测试报告撰写专家。将测试过程和发现整理为专业的渗透测试报告草稿，包括执行摘要、技术细节、风险评级和修复建议。用中文回复。",
        explain: "你是一个安全代码解释专家。详细解释提供的代码的功能、工作原理、使用的技术和潜在的安全影响。用中文回复。",
        obfuscate: "你是一个代码混淆专家。对提供的代码进行混淆处理，使其难以被静态分析工具检测，同时保持功能完整性。用中文解释混淆策略，提供混淆后的代码。",
        deobfuscate: "你是一个代码反混淆专家。对提供的混淆代码进行分析和还原，恢复其可读性并解释其真实功能。用中文回复。",
        rewrite: "你是一个代码重写专家。根据用户要求重写提供的代码，改进其结构、性能或规避检测能力。用中文解释改动，提供重写后的代码。",
      };

      const sysPrompt = input.systemPrompt ?? systemPrompts[input.mode];
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: sysPrompt },
      ];

      if (input.contextProject) {
        messages.push({ role: "system", content: `当前项目上下文：${input.contextProject}` });
      }
      if (input.contextCode) {
        messages.push({ role: "system", content: `当前代码上下文：\n\`\`\`\n${input.contextCode}\n\`\`\`` });
      }

      messages.push(...input.messages);

      // Read AI config from system settings
      const aiDb = await getDb();
      const aiConfig = await getAiConfig(aiDb);

      const response = await invokeLLM({ messages, ...(aiConfig.model ? { model: aiConfig.model } : {}) } as any);
      const content = response.choices[0]?.message?.content ?? "";
      const usage = (response as any).usage ?? {};
      const totalTokens = usage.total_tokens ?? 0;
      const promptTokens = usage.prompt_tokens ?? 0;
      const completionTokens = usage.completion_tokens ?? 0;

      await updateAiStats(totalTokens, promptTokens, completionTokens);

      // Audit log
      if (aiDb) {
        const ownerId = (ctx.user as any)?.id ?? 1;
        await aiDb.insert(auditLogs).values({
          userId: ownerId,
          userName: (ctx.user as any)?.name ?? "Unknown",
          action: "ai_generate",
          module: "ai",
          details: { mode: input.mode, tokens: totalTokens },
        }).catch(() => {});
      }

      return { content, tokens: totalTokens, promptTokens, completionTokens };
    }),

  // Code operations
  codeOperation: publicProcedure
    .input(z.object({
      operation: z.enum(["explain", "obfuscate", "deobfuscate", "rewrite", "audit"]),
      code: z.string(),
      language: z.string().optional(),
      instruction: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const prompts: Record<string, string> = {
        explain: `请详细解释以下${input.language ?? ""}代码的功能和工作原理：\n\n\`\`\`${input.language ?? ""}\n${input.code}\n\`\`\``,
        obfuscate: `请对以下${input.language ?? ""}代码进行混淆处理，使其难以被安全工具检测，同时保持功能完整：\n\n\`\`\`${input.language ?? ""}\n${input.code}\n\`\`\``,
        deobfuscate: `请对以下混淆代码进行反混淆分析，还原其可读形式并解释功能：\n\n\`\`\`${input.language ?? ""}\n${input.code}\n\`\`\``,
        rewrite: `请根据以下要求重写代码：${input.instruction ?? "改进代码质量"}\n\n原始代码：\n\`\`\`${input.language ?? ""}\n${input.code}\n\`\`\``,
        audit: `请对以下代码进行安全审计，找出所有安全问题和可利用点：\n\n\`\`\`${input.language ?? ""}\n${input.code}\n\`\`\``,
      };

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "你是一个专业的安全代码分析专家，擅长代码混淆、反混淆、安全审计和漏洞分析。请用中文回复，代码部分保持原语言。" },
          { role: "user", content: prompts[input.operation] },
        ],
      });

      const content = response.choices[0]?.message?.content ?? "";
      const usage = (response as any).usage ?? {};
      await updateAiStats(usage.total_tokens ?? 0, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0);

      return { content, tokens: usage.total_tokens ?? 0 };
    }),

  // Generate exploit code
  generateExploit: publicProcedure
    .input(z.object({
      cveId: z.string().optional(),
      description: z.string(),
      targetPlatform: z.string().optional(),
      language: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const prompt = input.cveId
        ? `为CVE ${input.cveId} 生成漏洞利用代码。漏洞描述：${input.description}。目标平台：${input.targetPlatform ?? "通用"}。使用语言：${input.language ?? "Python"}。请提供完整的利用代码和详细注释。`
        : `根据以下漏洞描述生成利用代码：${input.description}。目标平台：${input.targetPlatform ?? "通用"}。使用语言：${input.language ?? "Python"}。`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "你是一个漏洞利用代码生成专家。生成的代码仅用于合法的安全研究和渗透测试。请提供详细注释和使用说明。用中文解释，代码用英文。" },
          { role: "user", content: prompt },
        ],
      });

      const content = response.choices[0]?.message?.content ?? "";
      const usage = (response as any).usage ?? {};
      await updateAiStats(usage.total_tokens ?? 0, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0);

      return { content, tokens: usage.total_tokens ?? 0 };
    }),

  // AI inline completion
  complete: publicProcedure
    .input(z.object({
      code: z.string(),
      language: z.string(),
      cursorPosition: z.number(),
      projectContext: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const codeBeforeCursor = input.code.slice(0, input.cursorPosition);
      const response = await invokeLLM({
        messages: [
          { role: "system", content: `你是一个${input.language}代码补全助手，专注于安全/渗透测试代码。只返回补全的代码片段，不要解释。` },
          { role: "user", content: `补全以下${input.language}代码（只返回续写部分）：\n\`\`\`${input.language}\n${codeBeforeCursor}` },
        ],
      });
      const content = response.choices[0]?.message?.content ?? "";
      await updateAiStats(
        (response as any).usage?.total_tokens ?? 0,
        (response as any).usage?.prompt_tokens ?? 0,
        (response as any).usage?.completion_tokens ?? 0,
      );
      return { completion: content };
    }),
});
