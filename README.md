# DownloadMaster

Cross-platform desktop app for intelligent Downloads folder organization. Scans, categorizes, sorts, detects duplicates, and cleans up files — with optional AI-powered analysis.

Built with Tauri v2 (Rust) + React + TypeScript.

![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Dashboard** — file count, disk usage, stale files, duplicates, type distribution chart
- **Auto-sort** — rule-based file organization with glob patterns, preview before move, undo
- **8 preset rules** — Documents, Images, Archives, Code, Video, Audio, Installers, Firmware
- **Duplicate detection** — xxHash3 hashing, grouped view, bulk archive
- **Cleanup wizard** — tabs for duplicates, stale files (90+ days), large files
- **AI categorization** — local tier (by extension) + Claude API batch analysis
- **File watcher** — realtime monitoring with debounced events
- **Dark mode** — light / dark / system theme
- **Action history** — full log with per-action undo

## Requirements

- Node.js 20+
- Rust 1.77+
- Platform build tools ([Tauri prerequisites](https://v2.tauri.app/start/prerequisites/))

## Setup

```bash
git clone <repo-url> && cd downloadmaster
npm install
```

## Development

```bash
npm run tauri dev
```

Opens the app with hot-reload. Rust backend recompiles on changes.

## Build

```bash
npm run tauri build
```

Produces platform-specific binaries in `src-tauri/target/release/bundle/`.

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
    ai_client.rs        Claude API integration, 3-tier analysis
    config.rs           TOML configuration
    commands/           Tauri IPC command handlers
```

## Configuration

Config file is stored in the platform config directory (`~/.config/downloadmaster/config.toml` on Linux/macOS).

| Setting | Default | Description |
|---|---|---|
| `watch_dir` | `~/Downloads` | Directory to monitor |
| `sort_mode` | `manual` | `manual` / `scheduled` / `realtime` |
| `stale_threshold_days` | `90` | Days before a file is considered stale |
| `ai_enabled` | `false` | Enable Claude API categorization |
| `theme` | `system` | `light` / `dark` / `system` |

## AI Setup (optional)

1. Go to **Settings** in the app
2. Enable **AI categorization**
3. Enter your [Anthropic API key](https://console.anthropic.com/)
4. Click **Save**, then **Analyze** on the Dashboard

Without an API key, local categorization by file extension still works.

## Safety

- All file moves show a preview before execution
- Every action is logged and undoable (7-day window)
- Files are never deleted directly — only moved to archive or trash
- Filename conflicts resolved by auto-rename (`file_2.pdf`)

## License

MIT
