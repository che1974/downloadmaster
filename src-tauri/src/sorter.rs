use crate::db::Database;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SortRule {
    pub id: i64,
    pub name: String,
    pub pattern: String,
    pub target_dir: String,
    pub priority: i32,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SortAction {
    pub file_id: i64,
    pub filename: String,
    pub from_path: String,
    pub to_path: String,
    pub rule_name: String,
}

pub fn preview_sort(rules: &[SortRule], watch_dir: &str, db: &Database) -> Result<Vec<SortAction>, String> {
    let files = db.get_files(10000, 0).map_err(|e| e.to_string())?;
    let watch = Path::new(watch_dir);
    let mut actions = Vec::new();

    let enabled_rules: Vec<&SortRule> = rules.iter().filter(|r| r.enabled).collect();

    for file in &files {
        let file_path = Path::new(&file.path);

        // Only sort files directly in watch_dir (not in subdirectories)
        if file_path.parent() != Some(watch) {
            continue;
        }

        for rule in &enabled_rules {
            if glob_match(&rule.pattern, &file.filename) {
                let target_dir = watch.join(&rule.target_dir);
                let to_path = resolve_conflict(&target_dir.join(&file.filename));

                actions.push(SortAction {
                    file_id: file.id,
                    filename: file.filename.clone(),
                    from_path: file.path.clone(),
                    to_path: to_path.to_string_lossy().to_string(),
                    rule_name: rule.name.clone(),
                });
                break; // first matching rule wins (by priority)
            }
        }
    }

    Ok(actions)
}

pub fn execute_sort(actions: &[SortAction], db: &Database) -> Result<u64, String> {
    let mut count: u64 = 0;

    for action in actions {
        let from = Path::new(&action.from_path);
        let to = Path::new(&action.to_path);

        // Create target directory
        if let Some(parent) = to.parent() {
            std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create dir: {}", e))?;
        }

        // Move file
        std::fs::rename(from, to).map_err(|e| {
            // If rename fails (cross-device), try copy + delete
            if let Ok(_) = std::fs::copy(from, to) {
                std::fs::remove_file(from).ok();
                return format!("Moved via copy (cross-device): {}", e);
            }
            format!("Failed to move {}: {}", action.filename, e)
        }).ok();

        // Log action
        db.log_action(action.file_id, "moved", &action.from_path, &action.to_path).ok();

        // Update file path in DB
        db.update_file_path(action.file_id, &action.to_path).ok();

        count += 1;
    }

    Ok(count)
}

pub fn undo_move(action_id: i64, db: &Database) -> Result<(), String> {
    let action = db.get_action(action_id).map_err(|e| e.to_string())?;

    let from_str = action.to_path.as_deref().unwrap_or("");
    let to_str = action.from_path.as_deref().unwrap_or("");
    let from = Path::new(from_str);
    let to = Path::new(to_str);

    if !from.exists() {
        return Err("File no longer exists at current location".into());
    }

    // Move back
    if let Some(parent) = to.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::rename(from, to).map_err(|e| e.to_string())?;

    // Update DB
    if let Some(file_id) = action.file_id {
        db.update_file_path(file_id, &to.to_string_lossy()).ok();
    }
    db.mark_action_undone(action_id).ok();

    Ok(())
}

fn glob_match(pattern: &str, filename: &str) -> bool {
    let pattern = pattern.to_lowercase();
    let filename = filename.to_lowercase();

    // Support comma-separated patterns: "*.pdf, *.docx"
    for p in pattern.split(',') {
        let p = p.trim();
        if single_glob_match(p, &filename) {
            return true;
        }
    }
    false
}

fn single_glob_match(pattern: &str, text: &str) -> bool {
    let mut star_p = None;
    let mut star_t = None;

    let p_vec: Vec<char> = pattern.chars().collect();
    let t_vec: Vec<char> = text.chars().collect();
    let mut pi = 0;
    let mut ti = 0;

    while ti < t_vec.len() {
        if pi < p_vec.len() && (p_vec[pi] == '?' || p_vec[pi] == t_vec[ti]) {
            pi += 1;
            ti += 1;
        } else if pi < p_vec.len() && p_vec[pi] == '*' {
            star_p = Some(pi);
            star_t = Some(ti);
            pi += 1;
        } else if let Some(sp) = star_p {
            pi = sp + 1;
            let st = star_t.unwrap() + 1;
            star_t = Some(st);
            ti = st;
        } else {
            return false;
        }
    }

    while pi < p_vec.len() && p_vec[pi] == '*' {
        pi += 1;
    }

    pi == p_vec.len()
}

pub fn resolve_conflict_pub(path: &Path) -> PathBuf {
    resolve_conflict(path)
}

fn resolve_conflict(path: &Path) -> PathBuf {
    if !path.exists() {
        return path.to_path_buf();
    }

    let stem = path.file_stem().unwrap_or_default().to_string_lossy();
    let ext = path.extension().map(|e| e.to_string_lossy().to_string());
    let parent = path.parent().unwrap_or(Path::new("."));

    for i in 2..1000 {
        let new_name = match &ext {
            Some(e) => format!("{}_{}.{}", stem, i, e),
            None => format!("{}_{}", stem, i),
        };
        let new_path = parent.join(new_name);
        if !new_path.exists() {
            return new_path;
        }
    }

    path.to_path_buf()
}

pub fn default_rules() -> Vec<(String, String, String, i32)> {
    vec![
        ("Documents".into(), "*.pdf, *.docx, *.xlsx, *.pptx, *.doc, *.xls, *.ppt, *.odt, *.ods, *.txt, *.csv".into(), "Documents".into(), 10),
        ("Images".into(), "*.jpg, *.jpeg, *.png, *.gif, *.svg, *.webp, *.ico, *.bmp, *.tiff".into(), "Images".into(), 20),
        ("Archives".into(), "*.zip, *.tar.gz, *.7z, *.rar, *.tar, *.gz, *.bz2, *.xz".into(), "Archives".into(), 30),
        ("Code".into(), "*.py, *.js, *.ts, *.rs, *.go, *.java, *.c, *.cpp, *.h, *.rb, *.php, *.sh".into(), "Code".into(), 40),
        ("Video".into(), "*.mp4, *.mkv, *.avi, *.mov, *.webm, *.flv, *.wmv".into(), "Video".into(), 50),
        ("Audio".into(), "*.mp3, *.wav, *.flac, *.ogg, *.aac, *.m4a, *.wma".into(), "Audio".into(), 60),
        ("Installers".into(), "*.deb, *.dmg, *.exe, *.msi, *.AppImage, *.pkg, *.rpm".into(), "Installers".into(), 70),
        ("Firmware".into(), "*.bin, *.hex, *.uf2, *.elf, *.img".into(), "Firmware".into(), 80),
    ]
}
