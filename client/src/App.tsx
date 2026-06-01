import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppProvider, useApp } from "./contexts/AppContext";
import { PentestLayout } from "./components/PentestLayout";
import NotFound from "./pages/NotFound";

// Module pages
import Overview from "./pages/Overview";
import Projects from "./pages/Projects";
import CodeEditor from "./pages/CodeEditor";
import Payloads from "./pages/Payloads";
import Templates from "./pages/Templates";
import Builds from "./pages/Builds";
import Assistant from "./pages/Assistant";
import SystemSettings from "./pages/SystemSettings";

function AppContent() {
  const { activeModule } = useApp();

  // Modules that manage their own internal scroll (fixed height, no outer scroll)
  const SELF_SCROLL_MODULES = ["editor", "assistant"];
  const isSelfScroll = SELF_SCROLL_MODULES.includes(activeModule);

  const renderModule = () => {
    switch (activeModule) {
      case "overview": return <Overview />;
      case "projects": return <Projects />;
      case "editor": return <CodeEditor />;
      case "payloads": return <Payloads />;
      case "templates": return <Templates />;
      case "builds": return <Builds />;
      case "assistant": return <Assistant />;
      case "settings": return <SystemSettings />;
      default: return <Overview />;
    }
  };

  return (
    <PentestLayout isSelfScroll={isSelfScroll}>
      {renderModule()}
    </PentestLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AppProvider>
          <TooltipProvider>
            <Toaster position="top-right" richColors />
            <Switch>
              <Route path="/" component={AppContent} />
              <Route path="/404" component={NotFound} />
              <Route component={AppContent} />
            </Switch>
          </TooltipProvider>
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
