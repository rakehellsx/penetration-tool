import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { builds, auditLogs } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const buildsRouter = router({
  list: publicProcedure
    .input(z.object({
      projectId: z.number().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      try {
        const rows = await db.select().from(builds).orderBy(desc(builds.createdAt));
        return rows.filter(b => {
          if (input?.projectId && b.projectId !== input.projectId) return false;
          if (input?.status && b.status !== input.status) return false;
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
        const rows = await db.select().from(builds).where(eq(builds.id, input.id)).limit(1);
        return rows[0] ?? null;
      } catch { return null; }
    }),

  create: publicProcedure
    .input(z.object({
      projectId: z.number(),
      name: z.string().optional(),
      platform: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const ownerId = (ctx.user as any)?.id ?? 1;
        const pipeline: Array<{step: string; status: string; log?: string}> = [
        { step: "compile", status: "pending" },
        { step: "obfuscate", status: "pending" },
        { step: "package", status: "pending" },
        { step: "test", status: "pending" },
      ];
      const [result] = await db.insert(builds).values({
        projectId: input.projectId,
        name: input.name ?? `Build-${Date.now()}`,
        platform: input.platform,
        status: "pending",
        pipeline,
        ownerId,
      });
      const buildId = (result as any).insertId;

      // Simulate build process
      setTimeout(async () => {
        const db2 = await getDb();
        if (!db2) return;
        const startTime = Date.now();
        const steps = ["compile", "obfuscate", "package", "test"];
        let currentPipeline = pipeline.map(p => ({ ...p }));

        for (let i = 0; i < steps.length; i++) {
          currentPipeline[i].status = "running";
          await db2.update(builds).set({
            status: "running",
            pipeline: currentPipeline,
          }).where(eq(builds.id, buildId));

          await new Promise(r => setTimeout(r, 800 + Math.random() * 400));

          const success = Math.random() > 0.15;
          currentPipeline[i].status = success ? "success" : "failed";
          currentPipeline[i].log = success
            ? `Step ${steps[i]} completed successfully`
            : `Error in ${steps[i]}: compilation failed`;

          if (!success) {
            await db2.update(builds).set({
              status: "failed",
              pipeline: currentPipeline,
              buildLog: `Build failed at step: ${steps[i]}\n${currentPipeline[i].log}`,
              duration: Date.now() - startTime,
            }).where(eq(builds.id, buildId));
            return;
          }
        }

        const avScore = Math.random() * 30;
        const avDetections = Math.floor(avScore * 0.72);
        await db2.update(builds).set({
          status: "success",
          pipeline: currentPipeline,
          buildLog: "Build completed successfully\nAll pipeline steps passed",
          artifactHash: `sha256:${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`,
          artifactSize: Math.floor(50000 + Math.random() * 200000),
          avScore,
          avDetections,
          avTotal: 72,
          duration: Date.now() - startTime,
        }).where(eq(builds.id, buildId));
      }, 100);

      await db.insert(auditLogs).values({
        userId: ownerId,
        userName: (ctx.user as any)?.name ?? "Unknown",
        action: "trigger_build",
        module: "build",
        resourceId: buildId,
        resourceName: input.name ?? `Build-${buildId}`,
        details: { platform: input.platform, projectId: input.projectId },
      }).catch(() => {});

      return { id: buildId };
    }),

  cancel: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(builds).set({ status: "cancelled" }).where(eq(builds.id, input.id));
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(builds).where(eq(builds.id, input.id));
      return { success: true };
    }),
});
