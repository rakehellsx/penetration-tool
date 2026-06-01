import React, { createContext, useContext, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type ActiveModule =
  | "overview"
  | "projects"
  | "editor"
  | "payloads"
  | "templates"
  | "builds"
  | "assistant"
  | "settings";

export interface CrossModuleAction {
  type:
    | "open_project"
    | "open_editor"
    | "create_payload"
    | "insert_template"
    | "trigger_build"
    | "open_assistant"
    | "search_templates"
    | "view_payload";
  payload?: Record<string, unknown>;
}

interface AppContextValue {
  // Current active module
  activeModule: ActiveModule;
  setActiveModule: (module: ActiveModule) => void;

  // Currently open project
  activeProjectId: number | null;
  setActiveProjectId: (id: number | null) => void;

  // Currently open file in editor
  activeFileId: number | null;
  setActiveFileId: (id: number | null) => void;

  // Cross-module action queue
  pendingAction: CrossModuleAction | null;
  dispatchAction: (action: CrossModuleAction) => void;
  clearAction: () => void;

  // AI assistant context
  assistantContext: {
    projectId?: number;
    fileId?: number;
    fileContent?: string;
    fileName?: string;
  };
  setAssistantContext: (ctx: AppContextValue["assistantContext"]) => void;

  // Build trigger
  triggerBuild: (projectId: number, platform?: string) => void;
  buildTrigger: { projectId: number; platform: string; ts: number } | null;

  // Stats refresh signal
  statsRefreshTs: number;
  refreshStats: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeModule, setActiveModule] = useState<ActiveModule>("overview");
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [activeFileId, setActiveFileId] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<CrossModuleAction | null>(null);
  const [assistantContext, setAssistantContext] = useState<AppContextValue["assistantContext"]>({});
  const [buildTrigger, setBuildTrigger] = useState<{ projectId: number; platform: string; ts: number } | null>(null);
  const [statsRefreshTs, setStatsRefreshTs] = useState(Date.now());

  const dispatchAction = useCallback((action: CrossModuleAction) => {
    setPendingAction(action);
    // Auto-navigate to the relevant module
    switch (action.type) {
      case "open_project":
      case "open_editor":
        setActiveModule("editor");
        if (action.payload?.projectId) setActiveProjectId(action.payload.projectId as number);
        break;
      case "create_payload":
        setActiveModule("payloads");
        break;
      case "insert_template":
      case "search_templates":
        setActiveModule("templates");
        break;
      case "trigger_build":
        setActiveModule("builds");
        break;
      case "open_assistant":
        setActiveModule("assistant");
        break;
      case "view_payload":
        setActiveModule("payloads");
        break;
    }
  }, []);

  const clearAction = useCallback(() => setPendingAction(null), []);

  const triggerBuild = useCallback((projectId: number, platform = "windows_x64") => {
    setBuildTrigger({ projectId, platform, ts: Date.now() });
    setActiveModule("builds");
  }, []);

  const refreshStats = useCallback(() => setStatsRefreshTs(Date.now()), []);

  return (
    <AppContext.Provider
      value={{
        activeModule,
        setActiveModule,
        activeProjectId,
        setActiveProjectId,
        activeFileId,
        setActiveFileId,
        pendingAction,
        dispatchAction,
        clearAction,
        assistantContext,
        setAssistantContext,
        triggerBuild,
        buildTrigger,
        statsRefreshTs,
        refreshStats,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
