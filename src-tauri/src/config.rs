use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub watch_dir: String,
    pub sort_mode: SortMode,
    pub schedule_cron: String,
    pub stale_threshold_days: u32,
    pub ai_enabled: bool,
    pub ai_provider: AiProvider,
    pub ai_api_key: String,
    pub ai_model: String,
    pub theme: Theme,
    pub language: String,
    pub archive_dir: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AiProvider {
    Anthropic,
    Openai,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SortMode {
    Manual,
    Scheduled,
    Realtime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Light,
    Dark,
    System,
}

impl Default for AppConfig {
    fn default() -> Self {
        let downloads = dirs::download_dir()
            .unwrap_or_else(|| dirs::home_dir().unwrap().join("Downloads"));
        let archive = downloads.join("_archive");

        Self {
            watch_dir: downloads.to_string_lossy().to_string(),
            sort_mode: SortMode::Manual,
            schedule_cron: "0 23 * * *".into(),
            stale_threshold_days: 90,
            ai_enabled: false,
            ai_provider: AiProvider::Anthropic,
            ai_api_key: String::new(),
            ai_model: "claude-haiku-4-5-20251001".into(),
            theme: Theme::System,
            language: "en".into(),
            archive_dir: archive.to_string_lossy().to_string(),
        }
    }
}

impl AppConfig {
    fn config_path() -> PathBuf {
        let config_dir = dirs::config_dir()
            .unwrap_or_else(|| dirs::home_dir().unwrap().join(".config"))
            .join("downloadmaster");
        std::fs::create_dir_all(&config_dir).ok();
        config_dir.join("config.toml")
    }

    pub fn load() -> Self {
        let path = Self::config_path();
        if path.exists() {
            let content = std::fs::read_to_string(&path).unwrap_or_default();
            toml::from_str(&content).unwrap_or_default()
        } else {
            let config = Self::default();
            config.save().ok();
            config
        }
    }

    pub fn save(&self) -> Result<(), String> {
        let path = Self::config_path();
        let content = toml::to_string_pretty(self).map_err(|e| e.to_string())?;
        std::fs::write(path, content).map_err(|e| e.to_string())
    }
}
