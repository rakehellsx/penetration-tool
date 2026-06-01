import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { projects, payloads, builds, aiUsageStats, auditLogs } from "../../drizzle/schema";
import { eq, count, sql, desc } from "drizzle-orm";

export const overviewRouter = router({
  stats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return {
        totalProjects: 0, activeProjects: 0, buildSuccessRate: 0,
        totalPayloads: 0, totalAiCalls: 0, totalTokens: 0,
      };
    }
    try {
      const [totalProjects] = await db.select({ count: count() }).from(projects);
      const [activeProjects] = await db.select({ count: count() }).from(projects).where(eq(projects.status, "active"));
      const [totalPayloads] = await db.select({ count: count() }).from(payloads);
      const [successBuilds] = await db.select({ count: count() }).from(builds).where(eq(builds.status, "success"));
      const [totalBuilds] = await db.select({ count: count() }).from(builds);
      const buildSuccessRate = totalBuilds.count > 0 ? Math.round((successBuilds.count / totalBuilds.count) * 1000) / 10 : 0;
      const aiStats = await db.select({
        totalCalls: sql<number>`sum(${aiUsageStats.callCount})`,
        totalTokens: sql<number>`sum(${aiUsageStats.tokenCount})`,
      }).from(aiUsageStats);
      return {
        totalProjects: totalProjects.count,
        activeProjects: activeProjects.count,
        buildSuccessRate,
        totalPayloads: totalPayloads.count,
        totalAiCalls: Number(aiStats[0]?.totalCalls ?? 0),
        totalTokens: Number(aiStats[0]?.totalTokens ?? 0),
      };
    } catch {
      return { totalProjects: 0, activeProjects: 0, buildSuccessRate: 0, totalPayloads: 0, totalAiCalls: 0, totalTokens: 0 };
    }
  }),

  aiTrend: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    try {
      const rows = await db.select().from(aiUsageStats).orderBy(desc(aiUsageStats.date));
      return rows.slice(0, 7).reverse().map(r => ({
        date: r.date.slice(5), // MM-DD
        calls: r.callCount,
        tokens: r.tokenCount,
        promptTokens: r.promptTokens,
        completionTokens: r.completionTokens,
      }));
    } catch { return []; }
  }),

  payloadStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { byType: [], byOs: [] };
    try {
      const byTypeRows = await db.select({
        payloadType: payloads.payloadType,
        count: count(),
      }).from(payloads).groupBy(payloads.payloadType);

      const byOsRows = await db.select({
        os: payloads.os,
        arch: payloads.arch,
        count: count(),
      }).from(payloads).groupBy(payloads.os, payloads.arch);

      const typeColors: Record<string, string> = {
        shellcode: "#6366f1", exe: "#22c55e", dll: "#f59e0b", script: "#ef4444", other: "#94a3b8"
      };
      const byType = byTypeRows.map(r => ({
        name: r.payloadType.toUpperCase(),
        value: r.count,
        color: typeColors[r.payloadType] ?? "#94a3b8",
      }));

      // Group by OS for bar chart
      const osMap: Record<string, Record<string, number>> = {};
      for (const r of byOsRows) {
        if (!osMap[r.os]) osMap[r.os] = {};
        osMap[r.os][r.arch] = r.count;
      }
      const byOs = Object.entries(osMap).map(([os, archs]) => ({
        os: os.charAt(0).toUpperCase() + os.slice(1),
        x64: archs.x64 ?? 0,
        x86: archs.x86 ?? 0,
        arm64: archs.arm64 ?? 0,
      }));

      return { byType, byOs };
    } catch { return { byType: [], byOs: [] }; }
  }),

  recentActivity: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    try {
      return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(10);
    } catch { return []; }
  }),

  recentProjects: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    try {
      return await db.select().from(projects).orderBy(desc(projects.updatedAt)).limit(5);
    } catch { return []; }
  }),
});
