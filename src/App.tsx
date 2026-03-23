import { useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { DashboardView } from "./views/DashboardView";
import { FilesView } from "./views/FilesView";
import { RulesView } from "./views/RulesView";
import { CleanupView } from "./views/CleanupView";
import { HistoryView } from "./views/HistoryView";
import { SettingsView } from "./views/SettingsView";
import { useAppStore } from "./store/useAppStore";
import { getConfig } from "./hooks/useTauri";

function App() {
  const activeNav = useAppStore((s) => s.activeNav);

  useEffect(() => {
    getConfig().then((config) => {
      const root = document.documentElement;
      if (config.theme === "dark") {
        root.classList.add("dark");
      } else if (config.theme === "system") {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          root.classList.add("dark");
        }
      } else {
        root.classList.remove("dark");
      }
    });
  }, []);

  const renderView = () => {
    switch (activeNav) {
      case "dashboard":
        return <DashboardView />;
      case "files":
        return <FilesView />;
      case "rules":
        return <RulesView />;
      case "cleanup":
        return <CleanupView />;
      case "history":
        return <HistoryView />;
      case "settings":
        return <SettingsView />;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900">{renderView()}</main>
    </div>
  );
}

export default App;
