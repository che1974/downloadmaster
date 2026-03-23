import { Sidebar } from "./components/Sidebar";
import { DashboardView } from "./views/DashboardView";
import { FilesView } from "./views/FilesView";
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
        return <PlaceholderView title="Sort Rules" description="Rule management will be available in Phase 2." />;
      case "cleanup":
        return <PlaceholderView title="Cleanup" description="Duplicate detection and cleanup will be available in Phase 4." />;
      case "history":
        return <PlaceholderView title="History" description="Action history with undo will be available in Phase 2." />;
      case "settings":
        return <PlaceholderView title="Settings" description="App settings will be available in Phase 2." />;
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
