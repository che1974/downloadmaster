use crate::db::{Database, ScannedFile};
use chrono::Utc;
use std::path::Path;
use walkdir::WalkDir;

pub fn scan_directory(dir: &str, db: &Database) -> Result<u64, String> {
    let dir_path = Path::new(dir);
    if !dir_path.exists() {
        return Err(format!("Directory does not exist: {}", dir));
    }

    let now = Utc::now().to_rfc3339();
    let mut count: u64 = 0;
    let mut existing_paths: Vec<String> = Vec::new();

    for entry in WalkDir::new(dir_path).max_depth(1).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let path_str = path.to_string_lossy().to_string();
        existing_paths.push(path_str.clone());

        let metadata = match path.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        let filename = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        // Skip hidden files
        if filename.starts_with('.') {
            continue;
        }

        let extension = path
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase());

        let mime_type = extension_to_mime(&extension);

        let created_at = metadata
            .created()
            .ok()
            .and_then(|t| {
                let datetime: chrono::DateTime<Utc> = t.into();
                Some(datetime.to_rfc3339())
            });

        let modified_at = metadata
            .modified()
            .ok()
            .and_then(|t| {
                let datetime: chrono::DateTime<Utc> = t.into();
                Some(datetime.to_rfc3339())
            });

        let file = ScannedFile {
            path: path_str,
            filename,
            extension,
            size_bytes: metadata.len(),
            mime_type,
            created_at,
            modified_at,
            scanned_at: now.clone(),
        };

        db.upsert_file(&file).map_err(|e| e.to_string())?;
        count += 1;
    }

    // Remove files from DB that no longer exist on disk
    db.remove_missing_files(&existing_paths).ok();

    Ok(count)
}

fn extension_to_mime(ext: &Option<String>) -> Option<String> {
    let ext = ext.as_deref()?;
    let mime = match ext {
        "pdf" => "application/pdf",
        "doc" | "docx" => "application/msword",
        "xls" | "xlsx" => "application/vnd.ms-excel",
        "ppt" | "pptx" => "application/vnd.ms-powerpoint",
        "txt" | "md" | "csv" => "text/plain",
        "html" | "htm" => "text/html",
        "json" => "application/json",
        "xml" => "application/xml",
        "zip" => "application/zip",
        "gz" | "tar" => "application/gzip",
        "7z" => "application/x-7z-compressed",
        "rar" => "application/x-rar-compressed",
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "webp" => "image/webp",
        "ico" => "image/x-icon",
        "mp4" => "video/mp4",
        "mkv" => "video/x-matroska",
        "avi" => "video/x-msvideo",
        "mov" => "video/quicktime",
        "webm" => "video/webm",
        "mp3" => "audio/mpeg",
        "wav" => "audio/wav",
        "flac" => "audio/flac",
        "ogg" => "audio/ogg",
        "js" | "mjs" => "text/javascript",
        "ts" => "text/typescript",
        "py" => "text/x-python",
        "rs" => "text/x-rust",
        "go" => "text/x-go",
        "java" => "text/x-java",
        "c" | "h" => "text/x-c",
        "cpp" | "cc" | "hpp" => "text/x-c++",
        "sh" | "bash" | "zsh" => "text/x-shellscript",
        "exe" | "msi" => "application/x-executable",
        "dmg" => "application/x-apple-diskimage",
        "deb" => "application/x-debian-package",
        "appimage" => "application/x-executable",
        "iso" => "application/x-iso9660-image",
        _ => return None,
    };
    Some(mime.to_string())
}
