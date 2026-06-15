import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { systemSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getFileSetting, listFileSettings, setFileSetting, setManyFileSettings } from "../settingsFileStore";

const settingInputSchema = z.object({
  key: z.string(),
  value: z.string(),
  category: z.string().optional(),
});

export const settingsRouter = router({
  getAll: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return await listFileSettings();

    try {
      return await db.select().from(systemSettings);
    } catch {
      return await listFileSettings();
    }
  }),

  get: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return await getFileSetting(input.key);

      try {
        const rows = await db.select().from(systemSettings).where(eq(systemSettings.key, input.key)).limit(1);
        return rows[0] ?? null;
      } catch {
        return await getFileSetting(input.key);
      }
    }),

  set: publicProcedure
    .input(settingInputSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        await setFileSetting(input);
        return { success: true };
      }

      try {
        const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, input.key)).limit(1);
        if (existing[0]) {
          await db.update(systemSettings).set({ value: input.value, category: input.category }).where(eq(systemSettings.key, input.key));
        } else {
          await db.insert(systemSettings).values(input);
        }
        return { success: true };
      } catch {
        await setFileSetting(input);
        return { success: true };
      }
    }),

  setMany: publicProcedure
    .input(z.array(settingInputSchema))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return await setManyFileSettings(input);

      try {
        for (const item of input) {
          const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, item.key)).limit(1);
          if (existing[0]) {
            await db.update(systemSettings).set({ value: item.value, category: item.category }).where(eq(systemSettings.key, item.key));
          } else {
            await db.insert(systemSettings).values(item);
          }
        }
        return { success: true };
      } catch {
        return await setManyFileSettings(input);
      }
    }),
});
