import { Sidebar } from "./components/Sidebar";
import { DashboardView } from "./views/DashboardView";
import { FilesView } from "./views/FilesView";
import { RulesView } from "./views/RulesView";
import { HistoryView } from "./views/HistoryView";
import { SettingsView } from "./views/SettingsView";
import { PlaceholderView } from "./views/PlaceholderView";
import { useAppStore } from "./store/useAppStore";

function App() {
  const activeNav = useAppStore((s) => s.activeNav);

  const renderView = () => {
    switch (activeNav) {
      case "dashboard":
        return <DashboardView />;
      case "files":
        return <FilesView />;
      case "rules":
        return <RulesView />;
      case "cleanup":
        return <PlaceholderView title="Cleanup" description="Duplicate detection and cleanup will be available in Phase 4." />;
      case "history":
        return <HistoryView />;
      case "settings":
        return <SettingsView />;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-slate-50">{renderView()}</main>
    </div>
  );
}

export default App;
