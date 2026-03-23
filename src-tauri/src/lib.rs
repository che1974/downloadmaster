mod commands;
mod config;
mod db;
mod scanner;
mod sorter;
mod watcher;

use db::Database;
use std::sync::Mutex;
use tauri::Manager;
use watcher::FileWatcher;

pub struct AppState {
    pub db: Database,
    pub watcher: Mutex<FileWatcher>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");

            let database = Database::new(app_data_dir)
                .expect("failed to initialize database");

            // Seed default sort rules on first run
            database.seed_default_rules().ok();

            app.manage(AppState {
                db: database,
                watcher: Mutex::new(FileWatcher::new()),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::scan_directory,
            commands::get_files,
            commands::get_stats,
            commands::get_config,
            commands::save_config,
            commands::get_rules,
            commands::create_rule,
            commands::update_rule,
            commands::delete_rule,
            commands::toggle_rule,
            commands::seed_default_rules,
            commands::preview_sort,
            commands::execute_sort,
            commands::get_actions,
            commands::undo_action,
            commands::start_watcher,
            commands::stop_watcher,
            commands::watcher_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
