# DownloadMaster

Cross-platform desktop app for intelligent Downloads folder organization. Scans, categorizes, sorts, detects duplicates, and cleans up files — with optional AI-powered analysis.

Built with Tauri v2 (Rust) + React + TypeScript.

![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Dashboard** — file count, disk usage, stale files, duplicates, type distribution chart, actionable recommendations
- **Auto-sort** — rule-based file organization with glob patterns, preview before move, undo
- **8 preset rules** — Documents, Images, Archives, Code, Video, Audio, Installers, Firmware
- **Duplicate detection** — xxHash3 hashing, grouped view, bulk archive
- **Cleanup wizard** — tabs for duplicates, stale files (90+ days), large files
- **AI categorization** — local tier (by extension) + cloud/local LLM batch analysis
- **3 AI providers** — Anthropic (Claude), OpenAI (GPT), Ollama (local)
- **File watcher** — realtime monitoring with debounced events
- **Dark mode** — light / dark / system theme
- **Action history** — full log with per-action undo

## Installation

### From release (macOS)

1. Download the latest `.dmg` from [Releases](../../releases)
2. Open the `.dmg` and drag DownloadMaster to Applications
3. On first launch: right-click the app > Open (macOS Gatekeeper)

### From release (Windows)

1. Download the latest `.msi` from [Releases](../../releases)
2. Run the installer

### From release (Linux)

1. Download the latest `.deb` or `.AppImage` from [Releases](../../releases)
2. For `.deb`: `sudo dpkg -i downloadmaster_*.deb`
3. For `.AppImage`: `chmod +x DownloadMaster_*.AppImage && ./DownloadMaster_*.AppImage`

## Building from source

### Prerequisites

- **Node.js** 20+ ([nvm](https://github.com/nvm-sh/nvm) recommended)
- **Rust** 1.77+ ([rustup](https://rustup.rs/))
- **Platform build tools** — see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

macOS:
```bash
xcode-select --install
```

Ubuntu/Debian:
```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

Windows: install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with "Desktop development with C++".

### Clone and install

```bash
git clone https://github.com/che1974/downloadmaster.git
cd downloadmaster
npm install
```

### Development

```bash
npm run tauri dev
```

Opens the app with hot-reload. Rust backend recompiles on source changes.

### Production build

```bash
npm run tauri build
```

Output:
- macOS: `src-tauri/target/release/bundle/dmg/DownloadMaster_*.dmg`
- Windows: `src-tauri/target/release/bundle/msi/DownloadMaster_*.msi`
- Linux: `src-tauri/target/release/bundle/deb/downloadmaster_*.deb`

## Setup

### First launch

1. Open DownloadMaster
2. Click **Scan** — scans your `~/Downloads` folder
3. Click **Analyze** — categorizes files by extension (no API key needed)
4. Go to **Rules** — 8 preset sort rules are ready to use
5. Click **Sort Now** — preview moves, then confirm

### Change monitored directory

Go to **Settings** > **Watch Directory** > enter path > **Save**.

### Sort modes

| Mode | Behavior |
|---|---|
| Manual | Click "Sort Now" in Rules to trigger |
| Scheduled | Runs on cron schedule (default: daily 23:00) |
| Realtime | Sorts files immediately after download (5s delay) |

### AI Setup (optional)

DownloadMaster supports three AI providers for intelligent file categorization:

#### Anthropic (Claude)

1. Settings > Enable AI > Provider: **Anthropic**
2. Get API key at [console.anthropic.com](https://console.anthropic.com/)
3. Paste key, select model (Haiku 4.5 recommended for speed/cost)
4. Save, then click **Analyze** on Dashboard

#### OpenAI (GPT)

1. Settings > Enable AI > Provider: **OpenAI**
2. Get API key at [platform.openai.com](https://platform.openai.com/api-keys)
3. Paste key, select model (GPT-4o Mini recommended)
4. Save, then click **Analyze** on Dashboard

#### Ollama (Local, free)

Run LLMs locally without API keys or internet.

1. Install Ollama: [ollama.com/download](https://ollama.com/download)
2. Pull a model:
   ```bash
   ollama pull llama3.2
   ```
3. Settings > Enable AI > Provider: **Ollama**
4. URL: `http://localhost:11434` (default)
5. Model: `llama3.2` (or any pulled model: `mistral`, `gemma2`, `qwen2.5`, etc.)
6. Save, then click **Analyze** on Dashboard

Without any AI provider configured, local categorization by file extension still works for most common file types.

## Configuration

Config file location:
- macOS: `~/Library/Application Support/com.downloadmaster.app/config.toml`
- Linux: `~/.config/downloadmaster/config.toml`
- Windows: `%APPDATA%/downloadmaster/config.toml`

| Setting | Default | Description |
|---|---|---|
| `watch_dir` | `~/Downloads` | Directory to monitor |
| `sort_mode` | `manual` | `manual` / `scheduled` / `realtime` |
| `stale_threshold_days` | `90` | Days before a file is considered stale |
| `ai_enabled` | `false` | Enable AI categorization |
| `ai_provider` | `anthropic` | `anthropic` / `openai` / `ollama` |
| `ai_model` | `claude-haiku-4-5-20251001` | Model identifier |
| `ai_base_url` | _(empty)_ | Custom API URL (used by Ollama) |
| `theme` | `system` | `light` / `dark` / `system` |
| `archive_dir` | `~/Downloads/_archive` | Where archived files go |

## Project Structure

```
src/                    React frontend
  components/           Sidebar, FileTable, MetricCard, TagBadge, RuleEditor, SortPreview
  views/                Dashboard, Files, Rules, Cleanup, History, Settings
  hooks/useTauri.ts     Tauri IPC wrappers
  store/useAppStore.ts  Zustand state
  types/                TypeScript interfaces

src-tauri/              Rust backend
  src/
    lib.rs              App bootstrap, state management
    scanner.rs          Directory scanning, metadata collection
    sorter.rs           Glob matching, file moves, conflict resolution
    hasher.rs           xxHash3 hashing, duplicate detection
    watcher.rs          Filesystem watcher (notify crate)
    db.rs               SQLite schema, CRUD, migrations
    ai_client.rs        AI integration (Anthropic, OpenAI, Ollama)
    config.rs           TOML configuration
    commands/           Tauri IPC command handlers
```

## Safety

- All file moves show a preview before execution
- Every action is logged and undoable (7-day window)
- Files are never deleted directly — only moved to archive or trash
- Filename conflicts resolved by auto-rename (`file_2.pdf`)

## License

MIT
