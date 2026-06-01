import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { overviewRouter } from "./routers/overview";
import { projectsRouter } from "./routers/projects";
import { payloadsRouter } from "./routers/payloads";
import { templatesRouter } from "./routers/templates";
import { buildsRouter } from "./routers/builds";
import { aiRouter } from "./routers/ai";
import { settingsRouter } from "./routers/settings";
import { auditRouter } from "./routers/audit";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  overview: overviewRouter,
  projects: projectsRouter,
  payloads: payloadsRouter,
  templates: templatesRouter,
  builds: buildsRouter,
  ai: aiRouter,
  settings: settingsRouter,
  audit: auditRouter,
});

export type AppRouter = typeof appRouter;
