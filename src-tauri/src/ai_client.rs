use crate::config::AppConfig;
use crate::db::{Database, FileRecord};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileAnalysis {
    pub file_id: i64,
    pub category: String,
    pub tags: Vec<String>,
    pub summary: String,
}

/// Tier 1: Quick local categorization by extension (no API call)
pub fn quick_categorize(files: &[FileRecord], db: &Database) -> Result<u64, String> {
    let mut count: u64 = 0;
    for file in files {
        if file.ai_category.is_some() {
            continue;
        }
        if let Some(category) = extension_to_category(&file.extension) {
            let tags = extension_to_tags(&file.extension);
            let tags_json = serde_json::to_string(&tags).unwrap_or_default();
            db.update_ai_fields(file.id, &category, &tags_json, "")
                .map_err(|e| e.to_string())?;
            count += 1;
        }
    }
    Ok(count)
}

/// Tier 2: Batch analysis via AI API (Anthropic or OpenAI)
pub async fn batch_analyze(files: &[FileRecord], config: &AppConfig) -> Result<Vec<FileAnalysis>, String> {
    if files.is_empty() {
        return Ok(vec![]);
    }

    use crate::config::AiProvider;
    match config.ai_provider {
        AiProvider::Anthropic => batch_analyze_anthropic(files, config).await,
        AiProvider::Openai => batch_analyze_openai(files, config).await,
    }
}

const SYSTEM_PROMPT: &str = r#"You are a file categorization assistant. Analyze file names and metadata to assign categories and tags.

Available categories: Documents, Images, Archives, Code, Video, Audio, Installers, Firmware, Data, Design, Fonts, Ebooks, Presentations, Spreadsheets, Other

Rules:
- Assign exactly ONE category per file
- Assign 1-3 relevant tags (lowercase, descriptive)
- Write a brief summary (5-10 words) describing the likely content
- Respond ONLY with a JSON array, no extra text

Response format:
[{"id": 123, "category": "Documents", "tags": ["report", "pdf"], "summary": "PDF document, likely a report"}]"#;

fn build_user_prompt(files: &[FileRecord]) -> String {
    let file_list: Vec<String> = files
        .iter()
        .map(|f| {
            format!(
                "- id:{} name:\"{}\" ext:{} size:{}",
                f.id,
                f.filename,
                f.extension.as_deref().unwrap_or("none"),
                format_size(f.size_bytes)
            )
        })
        .collect();
    format!("Categorize these files:\n{}", file_list.join("\n"))
}

fn parse_analyses(content_text: &str) -> Result<Vec<FileAnalysis>, String> {
    let analyses: Vec<ApiFileResult> = serde_json::from_str(content_text)
        .map_err(|e| format!("Failed to parse AI response JSON: {}. Content: {}", e, content_text))?;

    Ok(analyses
        .into_iter()
        .map(|a| FileAnalysis {
            file_id: a.id,
            category: a.category,
            tags: a.tags,
            summary: a.summary,
        })
        .collect())
}

async fn batch_analyze_anthropic(files: &[FileRecord], config: &AppConfig) -> Result<Vec<FileAnalysis>, String> {
    let request_body = serde_json::json!({
        "model": config.ai_model,
        "max_tokens": 1024,
        "system": SYSTEM_PROMPT,
        "messages": [
            {"role": "user", "content": build_user_prompt(files)}
        ]
    });

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &config.ai_api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Anthropic API request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Anthropic API error {}: {}", status, body));
    }

    let response_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let content_text = response_json["content"]
        .as_array()
        .and_then(|arr| arr.first())
        .and_then(|block| block["text"].as_str())
        .ok_or("No text content in Anthropic response")?;

    parse_analyses(content_text)
}

async fn batch_analyze_openai(files: &[FileRecord], config: &AppConfig) -> Result<Vec<FileAnalysis>, String> {
    let request_body = serde_json::json!({
        "model": config.ai_model,
        "max_tokens": 1024,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(files)}
        ]
    });

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", config.ai_api_key))
        .header("content-type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("OpenAI API request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("OpenAI API error {}: {}", status, body));
    }

    let response_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let content_text = response_json["choices"]
        .as_array()
        .and_then(|arr| arr.first())
        .and_then(|choice| choice["message"]["content"].as_str())
        .ok_or("No content in OpenAI response")?;

    parse_analyses(content_text)
}

#[derive(Debug, Deserialize)]
struct ApiFileResult {
    id: i64,
    category: String,
    tags: Vec<String>,
    summary: String,
}

/// Run full analysis pipeline: tier 1 (quick) then tier 2 (batch API)
pub async fn analyze_all(db: &Database, config: &AppConfig) -> Result<AnalysisResult, String> {
    let all_files = db.get_files(10000, 0).map_err(|e| e.to_string())?;

    // Tier 1: Quick categorization
    let quick_count = quick_categorize(&all_files, db)?;

    // Tier 2: Batch API (only if AI is enabled and API key is set)
    let mut api_count: u64 = 0;
    if config.ai_enabled && !config.ai_api_key.is_empty() {
        let uncategorized = db.get_uncategorized_files(100).map_err(|e| e.to_string())?;

        // Process in batches of 20
        for chunk in uncategorized.chunks(20) {
            match batch_analyze(chunk, config).await {
                Ok(analyses) => {
                    for analysis in &analyses {
                        let tags_json = serde_json::to_string(&analysis.tags).unwrap_or_default();
                        db.update_ai_fields(
                            analysis.file_id,
                            &analysis.category,
                            &tags_json,
                            &analysis.summary,
                        )
                        .ok();
                        api_count += 1;
                    }
                }
                Err(e) => {
                    log::error!("Batch analysis error: {}", e);
                    return Err(e);
                }
            }
        }
    }

    Ok(AnalysisResult {
        quick_categorized: quick_count,
        api_categorized: api_count,
        total_uncategorized: db
            .get_uncategorized_files(1)
            .map(|f| f.len() as u64)
            .unwrap_or(0),
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub quick_categorized: u64,
    pub api_categorized: u64,
    pub total_uncategorized: u64,
}

fn extension_to_category(ext: &Option<String>) -> Option<String> {
    let ext = ext.as_deref()?;
    let category = match ext {
        "pdf" | "doc" | "docx" | "odt" | "rtf" | "txt" | "md" => "Documents",
        "xls" | "xlsx" | "ods" | "csv" | "tsv" => "Spreadsheets",
        "ppt" | "pptx" | "odp" | "key" => "Presentations",
        "jpg" | "jpeg" | "png" | "gif" | "svg" | "webp" | "ico" | "bmp" | "tiff" | "heic" | "raw" => "Images",
        "zip" | "tar" | "gz" | "7z" | "rar" | "bz2" | "xz" | "zst" => "Archives",
        "py" | "js" | "ts" | "rs" | "go" | "java" | "c" | "cpp" | "h" | "rb" | "php" | "sh" | "bash" | "zsh" | "swift" | "kt" | "scala" => "Code",
        "mp4" | "mkv" | "avi" | "mov" | "webm" | "flv" | "wmv" | "m4v" => "Video",
        "mp3" | "wav" | "flac" | "ogg" | "aac" | "m4a" | "wma" | "opus" => "Audio",
        "deb" | "dmg" | "exe" | "msi" | "appimage" | "pkg" | "rpm" | "snap" | "flatpak" => "Installers",
        "bin" | "hex" | "uf2" | "elf" => "Firmware",
        "json" | "xml" | "yaml" | "yml" | "toml" | "ini" | "cfg" | "conf" | "sql" | "db" | "sqlite" => "Data",
        "psd" | "ai" | "sketch" | "fig" | "xd" | "indd" => "Design",
        "ttf" | "otf" | "woff" | "woff2" | "eot" => "Fonts",
        "epub" | "mobi" | "azw" | "djvu" => "Ebooks",
        _ => return None,
    };
    Some(category.to_string())
}

fn extension_to_tags(ext: &Option<String>) -> Vec<String> {
    let ext = ext.as_deref().unwrap_or("");
    match ext {
        "pdf" => vec!["pdf".into(), "document".into()],
        "docx" | "doc" => vec!["word".into(), "document".into()],
        "xlsx" | "xls" => vec!["excel".into(), "spreadsheet".into()],
        "pptx" | "ppt" => vec!["powerpoint".into(), "presentation".into()],
        "jpg" | "jpeg" => vec!["jpeg".into(), "photo".into()],
        "png" => vec!["png".into(), "image".into()],
        "svg" => vec!["svg".into(), "vector".into()],
        "zip" => vec!["zip".into(), "compressed".into()],
        "tar" | "gz" => vec!["tarball".into(), "compressed".into()],
        "mp4" => vec!["mp4".into(), "video".into()],
        "mp3" => vec!["mp3".into(), "audio".into()],
        "py" => vec!["python".into(), "script".into()],
        "js" | "ts" => vec!["javascript".into(), "web".into()],
        "rs" => vec!["rust".into(), "source".into()],
        "dmg" => vec!["macos".into(), "installer".into()],
        "exe" | "msi" => vec!["windows".into(), "installer".into()],
        "deb" => vec!["linux".into(), "package".into()],
        _ => vec![ext.to_string()],
    }
}

fn format_size(bytes: u64) -> String {
    if bytes < 1024 {
        format!("{}B", bytes)
    } else if bytes < 1024 * 1024 {
        format!("{:.0}KB", bytes as f64 / 1024.0)
    } else if bytes < 1024 * 1024 * 1024 {
        format!("{:.1}MB", bytes as f64 / (1024.0 * 1024.0))
    } else {
        format!("{:.1}GB", bytes as f64 / (1024.0 * 1024.0 * 1024.0))
    }
}
