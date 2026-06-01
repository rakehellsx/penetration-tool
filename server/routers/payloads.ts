import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { payloads, auditLogs } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const payloadsRouter = router({
  list: publicProcedure
    .input(z.object({
      os: z.string().optional(),
      arch: z.string().optional(),
      payloadType: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      try {
        const rows = await db.select().from(payloads).orderBy(desc(payloads.createdAt));
        return rows.filter(p => {
          if (input?.os && p.os !== input.os) return false;
          if (input?.arch && p.arch !== input.arch) return false;
          if (input?.payloadType && p.payloadType !== input.payloadType) return false;
          if (input?.search) {
            const s = input.search.toLowerCase();
            return p.name.toLowerCase().includes(s) || (p.description ?? "").toLowerCase().includes(s);
          }
          return true;
        });
      } catch { return []; }
    }),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      try {
        const rows = await db.select().from(payloads).where(eq(payloads.id, input.id)).limit(1);
        return rows[0] ?? null;
      } catch { return null; }
    }),

  create: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      os: z.enum(["windows", "linux", "macos", "cross"]),
      arch: z.enum(["x64", "x86", "arm64", "arm"]).default("x64"),
      payloadType: z.enum(["shellcode", "exe", "dll", "script", "other"]),
      listenType: z.enum(["reverse_shell", "bind", "http", "dns", "other"]).optional(),
      lhost: z.string().optional(),
      lport: z.number().optional(),
      encoding: z.string().optional(),
      obfuscation: z.string().optional(),
      encryption: z.string().optional(),
      tags: z.array(z.string()).optional(),
      notes: z.string().optional(),
      generationParams: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const ownerId = (ctx.user as any)?.id ?? 1;
      const result = await db.insert(payloads).values({
        ...input,
        ownerId,
        tags: input.tags ?? [],
      } as any);
      await db.insert(auditLogs).values({
        userId: ownerId,
        userName: (ctx.user as any)?.name ?? "Unknown",
        action: "create_payload",
        module: "payload",
        resourceName: input.name,
        details: { os: input.os, payloadType: input.payloadType },
      }).catch(() => {});
      return { id: (result as any).insertId };
    }),

  update: publicProcedure
    .input(z.object({
      id: z.number(),
      avScore: z.number().optional(),
      avDetections: z.number().optional(),
      avTotal: z.number().optional(),
      avScanResult: z.record(z.string(), z.unknown()).optional(),
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, ...data } = input;
      await db.update(payloads).set(data).where(eq(payloads.id, id));
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(payloads).where(eq(payloads.id, input.id));
      return { success: true };
    }),

  morph: publicProcedure
    .input(z.object({ parentId: z.number(), name: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const rows = await db.select().from(payloads).where(eq(payloads.id, input.parentId)).limit(1);
      if (!rows[0]) throw new Error("Payload not found");
      const src = rows[0];
      const ownerId = (ctx.user as any)?.id ?? 1;
      const result = await db.insert(payloads).values({
        name: input.name,
        description: `Morphed from ${src.name}`,
        os: src.os,
        arch: src.arch,
        payloadType: src.payloadType,
        listenType: src.listenType ?? undefined,
        lhost: src.lhost ?? undefined,
        lport: src.lport ?? undefined,
        encoding: src.encoding ?? undefined,
        obfuscation: src.obfuscation ?? undefined,
        encryption: src.encryption ?? undefined,
        ownerId,
        parentId: input.parentId,
        tags: src.tags ?? [],
        generationParams: src.generationParams ?? {},
      });
      return { id: (result as any).insertId };
    }),
});
