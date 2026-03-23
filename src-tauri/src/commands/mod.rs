use crate::db::{FileRecord, Stats};
use crate::config::AppConfig;
use crate::scanner;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub fn scan_directory(state: State<AppState>) -> Result<u64, String> {
    let config = AppConfig::load();
    scanner::scan_directory(&config.watch_dir, &state.db)
}

#[tauri::command]
pub fn get_files(state: State<AppState>, limit: Option<u32>, offset: Option<u32>) -> Result<Vec<FileRecord>, String> {
    let limit = limit.unwrap_or(100);
    let offset = offset.unwrap_or(0);
    state.db.get_files(limit, offset).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_stats(state: State<AppState>) -> Result<Stats, String> {
    state.db.get_stats().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_config() -> Result<AppConfig, String> {
    Ok(AppConfig::load())
}

#[tauri::command]
pub fn save_config(config: AppConfig) -> Result<(), String> {
    config.save()
}
