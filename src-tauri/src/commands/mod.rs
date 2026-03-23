use crate::ai_client::{self, AnalysisResult};
use crate::config::AppConfig;
use crate::db::{ActionRecord, FileRecord, Stats};
use crate::scanner;
use crate::sorter::{self, SortAction, SortRule};
use crate::AppState;
use tauri::State;

// --- Scanning ---

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

// --- Config ---

#[tauri::command]
pub fn get_config() -> Result<AppConfig, String> {
    Ok(AppConfig::load())
}

#[tauri::command]
pub fn save_config(config: AppConfig) -> Result<(), String> {
    config.save()
}

// --- Sort Rules ---

#[tauri::command]
pub fn get_rules(state: State<AppState>) -> Result<Vec<SortRule>, String> {
    state.db.get_rules().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_rule(state: State<AppState>, name: String, pattern: String, target_dir: String, priority: i32) -> Result<i64, String> {
    state.db.create_rule(&name, &pattern, &target_dir, priority).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_rule(state: State<AppState>, id: i64, name: String, pattern: String, target_dir: String, priority: i32) -> Result<(), String> {
    state.db.update_rule(id, &name, &pattern, &target_dir, priority).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_rule(state: State<AppState>, id: i64) -> Result<(), String> {
    state.db.delete_rule(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_rule(state: State<AppState>, id: i64, enabled: bool) -> Result<(), String> {
    state.db.toggle_rule(id, enabled).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn seed_default_rules(state: State<AppState>) -> Result<(), String> {
    // Force seed by checking if rules exist
    let count = state.db.rules_count().map_err(|e| e.to_string())?;
    if count > 0 {
        return Ok(());
    }
    state.db.seed_default_rules().map_err(|e| e.to_string())
}

// --- Sorting ---

#[tauri::command]
pub fn preview_sort(state: State<AppState>) -> Result<Vec<SortAction>, String> {
    let config = AppConfig::load();
    let rules = state.db.get_rules().map_err(|e| e.to_string())?;
    sorter::preview_sort(&rules, &config.watch_dir, &state.db)
}

#[tauri::command]
pub fn execute_sort(state: State<AppState>, actions: Vec<SortAction>) -> Result<u64, String> {
    sorter::execute_sort(&actions, &state.db)
}

// --- Actions History ---

#[tauri::command]
pub fn get_actions(state: State<AppState>, limit: Option<u32>, offset: Option<u32>) -> Result<Vec<ActionRecord>, String> {
    let limit = limit.unwrap_or(100);
    let offset = offset.unwrap_or(0);
    state.db.get_actions(limit, offset).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn undo_action(state: State<AppState>, id: i64) -> Result<(), String> {
    sorter::undo_move(id, &state.db)
}

// --- AI Analysis ---

#[tauri::command]
pub async fn analyze_files(state: State<'_, AppState>) -> Result<AnalysisResult, String> {
    let config = AppConfig::load();
    ai_client::analyze_all(&state.db, &config).await
}

// --- Watcher ---

#[tauri::command]
pub fn start_watcher(state: State<AppState>, app_handle: tauri::AppHandle) -> Result<(), String> {
    let config = AppConfig::load();
    let mut watcher = state.watcher.lock().unwrap();
    watcher.start(config.watch_dir, app_handle)
}

#[tauri::command]
pub fn stop_watcher(state: State<AppState>) -> Result<(), String> {
    let mut watcher = state.watcher.lock().unwrap();
    watcher.stop();
    Ok(())
}

#[tauri::command]
pub fn watcher_status(state: State<AppState>) -> bool {
    let watcher = state.watcher.lock().unwrap();
    watcher.is_running()
}
