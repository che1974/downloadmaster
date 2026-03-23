import { create } from "zustand";
import type { FileRecord, Stats, NavItem } from "../types";
import { scanDirectory, getFiles, getStats } from "../hooks/useTauri";

interface AppStore {
  files: FileRecord[];
  stats: Stats | null;
  activeNav: NavItem;
  scanning: boolean;
  loading: boolean;

  setActiveNav: (nav: NavItem) => void;
  fetchFiles: () => Promise<void>;
  fetchStats: () => Promise<void>;
  runScan: () => Promise<void>;
}

export const useAppStore = create<AppStore>((set) => ({
  files: [],
  stats: null,
  activeNav: "dashboard",
  scanning: false,
  loading: false,

  setActiveNav: (nav) => set({ activeNav: nav }),

  fetchFiles: async () => {
    set({ loading: true });
    try {
      const files = await getFiles(500, 0);
      set({ files });
    } finally {
      set({ loading: false });
    }
  },

  fetchStats: async () => {
    try {
      const stats = await getStats();
      set({ stats });
    } catch (e) {
      console.error("Failed to fetch stats:", e);
    }
  },

  runScan: async () => {
    set({ scanning: true });
    try {
      await scanDirectory();
      const [files, stats] = await Promise.all([getFiles(500, 0), getStats()]);
      set({ files, stats });
    } finally {
      set({ scanning: false });
    }
  },
}));
