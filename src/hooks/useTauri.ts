import { invoke } from "@tauri-apps/api/core";
import type { FileRecord, Stats, AppConfig, SortRule, SortAction, ActionRecord } from "../types";

export async function scanDirectory(): Promise<number> {
  return invoke("scan_directory");
}

export async function getFiles(limit = 100, offset = 0): Promise<FileRecord[]> {
  return invoke("get_files", { limit, offset });
}

export async function getStats(): Promise<Stats> {
  return invoke("get_stats");
}

export async function getConfig(): Promise<AppConfig> {
  return invoke("get_config");
}

export async function saveConfig(config: AppConfig): Promise<void> {
  return invoke("save_config", { config });
}

// Rules
export async function getRules(): Promise<SortRule[]> {
  return invoke("get_rules");
}

export async function createRule(name: string, pattern: string, targetDir: string, priority: number): Promise<number> {
  return invoke("create_rule", { name, pattern, targetDir, priority });
}

export async function updateRule(id: number, name: string, pattern: string, targetDir: string, priority: number): Promise<void> {
  return invoke("update_rule", { id, name, pattern, targetDir, priority });
}

export async function deleteRule(id: number): Promise<void> {
  return invoke("delete_rule", { id });
}

export async function toggleRule(id: number, enabled: boolean): Promise<void> {
  return invoke("toggle_rule", { id, enabled });
}

export async function seedDefaultRules(): Promise<void> {
  return invoke("seed_default_rules");
}

// Sorting
export async function previewSort(): Promise<SortAction[]> {
  return invoke("preview_sort");
}

export async function executeSort(actions: SortAction[]): Promise<number> {
  return invoke("execute_sort", { actions });
}

// History
export async function getActions(limit = 100, offset = 0): Promise<ActionRecord[]> {
  return invoke("get_actions", { limit, offset });
}

export async function undoAction(id: number): Promise<void> {
  return invoke("undo_action", { id });
}

// AI Analysis
export interface AnalysisResult {
  quick_categorized: number;
  api_categorized: number;
  total_uncategorized: number;
}

export async function analyzeFiles(): Promise<AnalysisResult> {
  return invoke("analyze_files");
}

// Watcher
export async function startWatcher(): Promise<void> {
  return invoke("start_watcher");
}

export async function stopWatcher(): Promise<void> {
  return invoke("stop_watcher");
}

export async function watcherStatus(): Promise<boolean> {
  return invoke("watcher_status");
}
