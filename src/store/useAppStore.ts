import { create } from "zustand";
import type { FileRecord, Stats, NavItem, SortRule, SortAction, ActionRecord } from "../types";
import {
  scanDirectory, getFiles, getStats,
  getRules, createRule, updateRule, deleteRule, toggleRule,
  previewSort, executeSort,
  getActions, undoAction as undoActionApi,
} from "../hooks/useTauri";

interface AppStore {
  files: FileRecord[];
  stats: Stats | null;
  activeNav: NavItem;
  scanning: boolean;
  loading: boolean;

  // Rules
  rules: SortRule[];
  sortPreview: SortAction[] | null;
  sorting: boolean;

  // History
  actions: ActionRecord[];

  setActiveNav: (nav: NavItem) => void;
  fetchFiles: () => Promise<void>;
  fetchStats: () => Promise<void>;
  runScan: () => Promise<void>;

  // Rules actions
  fetchRules: () => Promise<void>;
  addRule: (name: string, pattern: string, targetDir: string, priority: number) => Promise<void>;
  editRule: (id: number, name: string, pattern: string, targetDir: string, priority: number) => Promise<void>;
  removeRule: (id: number) => Promise<void>;
  toggleRuleEnabled: (id: number, enabled: boolean) => Promise<void>;

  // Sort actions
  runPreview: () => Promise<void>;
  runSort: () => Promise<void>;
  clearPreview: () => void;

  // History actions
  fetchActions: () => Promise<void>;
  undoAction: (id: number) => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  files: [],
  stats: null,
  activeNav: "dashboard",
  scanning: false,
  loading: false,
  rules: [],
  sortPreview: null,
  sorting: false,
  actions: [],

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

  // Rules
  fetchRules: async () => {
    const rules = await getRules();
    set({ rules });
  },

  addRule: async (name, pattern, targetDir, priority) => {
    await createRule(name, pattern, targetDir, priority);
    await get().fetchRules();
  },

  editRule: async (id, name, pattern, targetDir, priority) => {
    await updateRule(id, name, pattern, targetDir, priority);
    await get().fetchRules();
  },

  removeRule: async (id) => {
    await deleteRule(id);
    await get().fetchRules();
  },

  toggleRuleEnabled: async (id, enabled) => {
    await toggleRule(id, enabled);
    await get().fetchRules();
  },

  // Sort
  runPreview: async () => {
    const preview = await previewSort();
    set({ sortPreview: preview });
  },

  runSort: async () => {
    const preview = get().sortPreview;
    if (!preview || preview.length === 0) return;
    set({ sorting: true });
    try {
      await executeSort(preview);
      set({ sortPreview: null });
      await Promise.all([get().fetchFiles(), get().fetchStats(), get().fetchActions()]);
    } finally {
      set({ sorting: false });
    }
  },

  clearPreview: () => set({ sortPreview: null }),

  // History
  fetchActions: async () => {
    const actions = await getActions(200, 0);
    set({ actions });
  },

  undoAction: async (id) => {
    await undoActionApi(id);
    await Promise.all([get().fetchActions(), get().fetchFiles(), get().fetchStats()]);
  },
}));
