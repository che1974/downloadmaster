use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub struct FileWatcher {
    handle: Option<thread::JoinHandle<()>>,
    stop_flag: Arc<Mutex<bool>>,
}

impl FileWatcher {
    pub fn new() -> Self {
        Self {
            handle: None,
            stop_flag: Arc::new(Mutex::new(false)),
        }
    }

    pub fn is_running(&self) -> bool {
        self.handle.is_some()
    }

    pub fn start(&mut self, watch_dir: String, app_handle: AppHandle) -> Result<(), String> {
        if self.is_running() {
            return Err("Watcher is already running".into());
        }

        let stop_flag = self.stop_flag.clone();
        *stop_flag.lock().unwrap() = false;

        let handle = thread::spawn(move || {
            let (tx, rx) = mpsc::channel();

            let mut watcher: RecommendedWatcher = match RecommendedWatcher::new(tx, Config::default()) {
                Ok(w) => w,
                Err(e) => {
                    log::error!("Failed to create watcher: {}", e);
                    return;
                }
            };

            if let Err(e) = watcher.watch(Path::new(&watch_dir), RecursiveMode::NonRecursive) {
                log::error!("Failed to watch directory: {}", e);
                return;
            }

            log::info!("File watcher started on: {}", watch_dir);

            loop {
                if *stop_flag.lock().unwrap() {
                    break;
                }

                match rx.recv_timeout(Duration::from_secs(1)) {
                    Ok(Ok(event)) => {
                        // Debounce: wait for file writes to complete
                        thread::sleep(Duration::from_secs(2));
                        handle_event(&event, &app_handle);
                    }
                    Ok(Err(e)) => {
                        log::error!("Watcher error: {}", e);
                    }
                    Err(mpsc::RecvTimeoutError::Timeout) => continue,
                    Err(mpsc::RecvTimeoutError::Disconnected) => break,
                }
            }

            log::info!("File watcher stopped");
        });

        self.handle = Some(handle);
        Ok(())
    }

    pub fn stop(&mut self) {
        *self.stop_flag.lock().unwrap() = true;
        if let Some(handle) = self.handle.take() {
            handle.join().ok();
        }
    }
}

fn handle_event(event: &Event, app_handle: &AppHandle) {
    let paths: Vec<String> = event
        .paths
        .iter()
        .map(|p: &std::path::PathBuf| p.to_string_lossy().to_string())
        .collect();

    if paths.is_empty() {
        return;
    }

    let event_name = match event.kind {
        EventKind::Create(_) => "file:created",
        EventKind::Modify(_) => "file:modified",
        EventKind::Remove(_) => "file:deleted",
        _ => return,
    };

    app_handle.emit(event_name, &paths).ok();
}
