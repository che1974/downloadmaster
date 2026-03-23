import { invoke } from "@tauri-apps/api/core";
import type { FileRecord, Stats, AppConfig } from "../types";

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
