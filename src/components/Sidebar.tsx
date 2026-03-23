import {
  LayoutDashboard,
  Files,
  ArrowUpDown,
  Trash2,
  History,
  Settings,
} from "lucide-react";
import type { NavItem } from "../types";
import { useAppStore } from "../store/useAppStore";

const navItems: { id: NavItem; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
  { id: "files", label: "Files", icon: <Files size={20} /> },
  { id: "rules", label: "Rules", icon: <ArrowUpDown size={20} /> },
  { id: "cleanup", label: "Cleanup", icon: <Trash2 size={20} /> },
  { id: "history", label: "History", icon: <History size={20} /> },
  { id: "settings", label: "Settings", icon: <Settings size={20} /> },
];

export function Sidebar() {
  const { activeNav, setActiveNav } = useAppStore();

  return (
    <aside className="w-56 bg-slate-800 text-white flex flex-col min-h-screen">
      <div className="px-5 py-5">
        <h1 className="text-lg font-semibold tracking-tight">DownloadMaster</h1>
        <p className="text-xs text-slate-400 mt-0.5">Downloads Organizer</p>
      </div>
      <nav className="flex-1 px-3">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveNav(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors cursor-pointer ${
              activeNav === item.id
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
