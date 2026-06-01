import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { systemSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const settingsRouter = router({
  getAll: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    try {
      return await db.select().from(systemSettings);
    } catch { return []; }
  }),

  get: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      try {
        const rows = await db.select().from(systemSettings).where(eq(systemSettings.key, input.key)).limit(1);
        return rows[0] ?? null;
      } catch { return null; }
    }),

  set: publicProcedure
    .input(z.object({
      key: z.string(),
      value: z.string(),
      category: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, input.key)).limit(1);
      if (existing[0]) {
        await db.update(systemSettings).set({ value: input.value }).where(eq(systemSettings.key, input.key));
      } else {
        await db.insert(systemSettings).values(input);
      }
      return { success: true };
    }),

  setMany: publicProcedure
    .input(z.array(z.object({
      key: z.string(),
      value: z.string(),
      category: z.string().optional(),
    })))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      for (const item of input) {
        const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, item.key)).limit(1);
        if (existing[0]) {
          await db.update(systemSettings).set({ value: item.value }).where(eq(systemSettings.key, item.key));
        } else {
          await db.insert(systemSettings).values(item);
        }
      }
      return { success: true };
    }),
});
