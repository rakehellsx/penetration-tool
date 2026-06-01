import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { projects, projectMembers, projectFiles, auditLogs } from "../../drizzle/schema";
import { eq, desc, like, and, or } from "drizzle-orm";

const ProjectCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  platform: z.string().optional(),
  language: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const ProjectUpdateSchema = ProjectCreateSchema.partial().extend({ id: z.number() });

export const projectsRouter = router({
  list: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(["active", "archived", "draft"]).optional(),
      platform: z.string().optional(),
      language: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      try {
        let query = db.select().from(projects).orderBy(desc(projects.updatedAt));
        const rows = await query;
        return rows.filter(p => {
          if (input?.status && p.status !== input.status) return false;
          if (input?.platform && p.platform !== input.platform) return false;
          if (input?.language && p.language !== input.language) return false;
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
        const rows = await db.select().from(projects).where(eq(projects.id, input.id)).limit(1);
        return rows[0] ?? null;
      } catch { return null; }
    }),

  create: publicProcedure
    .input(ProjectCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const ownerId = (ctx.user as any)?.id ?? 1;
      const [result] = await db.insert(projects).values({
        ...input,
        ownerId,
        tags: input.tags ?? [],
        linkedPayloadIds: [],
        linkedTemplateIds: [],
        buildConfig: {},
      });
      // Audit log
      await db.insert(auditLogs).values({
        userId: ownerId,
        userName: (ctx.user as any)?.name ?? "Unknown",
        action: "create_project",
        module: "project",
        resourceName: input.name,
        details: { platform: input.platform, language: input.language },
      }).catch(() => {});
      return { id: (result as any).insertId };
    }),

  update: publicProcedure
    .input(ProjectUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, ...data } = input;
      await db.update(projects).set(data).where(eq(projects.id, id));
      return { success: true };
    }),

  archive: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(projects).set({ status: "archived" }).where(eq(projects.id, input.id));
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(projects).where(eq(projects.id, input.id));
      return { success: true };
    }),

  clone: publicProcedure
    .input(z.object({ id: z.number(), newName: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const rows = await db.select().from(projects).where(eq(projects.id, input.id)).limit(1);
      if (!rows[0]) throw new Error("Project not found");
      const src = rows[0];
      const ownerId = (ctx.user as any)?.id ?? 1;
      const [result] = await db.insert(projects).values({
        name: input.newName,
        description: src.description,
        platform: src.platform,
        language: src.language,
        status: "draft",
        tags: src.tags ?? [],
        ownerId,
        linkedPayloadIds: src.linkedPayloadIds ?? [],
        linkedTemplateIds: src.linkedTemplateIds ?? [],
        buildConfig: src.buildConfig ?? {},
      });
      return { id: (result as any).insertId };
    }),

  linkPayload: publicProcedure
    .input(z.object({ projectId: z.number(), payloadId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const rows = await db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1);
      if (!rows[0]) throw new Error("Project not found");
      const ids = rows[0].linkedPayloadIds ?? [];
      if (!ids.includes(input.payloadId)) {
        await db.update(projects).set({ linkedPayloadIds: [...ids, input.payloadId] }).where(eq(projects.id, input.projectId));
      }
      return { success: true };
    }),

  // Project files
  getFiles: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      try {
        return await db.select().from(projectFiles).where(eq(projectFiles.projectId, input.projectId));
      } catch { return []; }
    }),

  saveFile: publicProcedure
    .input(z.object({
      projectId: z.number(),
      name: z.string(),
      path: z.string(),
      content: z.string(),
      language: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const existing = await db.select().from(projectFiles)
        .where(and(eq(projectFiles.projectId, input.projectId), eq(projectFiles.path, input.path)))
        .limit(1);
      if (existing[0]) {
        await db.update(projectFiles).set({ content: input.content, name: input.name, language: input.language })
          .where(eq(projectFiles.id, existing[0].id));
        return { id: existing[0].id };
      } else {
        const [result] = await db.insert(projectFiles).values(input);
        return { id: (result as any).insertId };
      }
    }),

  deleteFile: publicProcedure
    .input(z.object({ fileId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(projectFiles).where(eq(projectFiles.id, input.fileId));
      return { success: true };
    }),
});
