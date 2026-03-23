export interface FileRecord {
  id: number;
  path: string;
  filename: string;
  extension: string | null;
  size_bytes: number;
  mime_type: string | null;
  hash_xxh3: string | null;
  created_at: string | null;
  modified_at: string | null;
  scanned_at: string;
  ai_category: string | null;
  ai_tags: string | null;
  ai_summary: string | null;
  status: string;
}

export interface CategoryStat {
  name: string;
  count: number;
  size: number;
}

export interface Stats {
  total_files: number;
  total_size: number;
  stale_files: number;
  duplicate_groups: number;
  categories: CategoryStat[];
}

export interface AppConfig {
  watch_dir: string;
  sort_mode: "manual" | "scheduled" | "realtime";
  schedule_cron: string;
  stale_threshold_days: number;
  ai_enabled: boolean;
  ai_api_key: string;
  ai_model: string;
  theme: "light" | "dark" | "system";
  language: string;
  archive_dir: string;
}

export type NavItem = "dashboard" | "files" | "rules" | "cleanup" | "history" | "settings";
