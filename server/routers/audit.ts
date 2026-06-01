import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { auditLogs } from "../../drizzle/schema";
import { desc } from "drizzle-orm";

export const auditRouter = router({
  list: publicProcedure
    .input(z.object({
      module: z.string().optional(),
      limit: z.number().default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      try {
        const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(input?.limit ?? 50);
        return rows.filter(r => {
          if (input?.module && r.module !== input.module) return false;
          return true;
        });
      } catch { return []; }
    }),
});
