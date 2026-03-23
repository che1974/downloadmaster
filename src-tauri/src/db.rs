use rusqlite::{Connection, Result, params};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(app_data_dir: PathBuf) -> Result<Self> {
        std::fs::create_dir_all(&app_data_dir)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

        let db_path = app_data_dir.join("downloadmaster.db");
        let conn = Connection::open(db_path)?;

        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

        let db = Self {
            conn: Mutex::new(conn),
        };
        db.migrate()?;
        Ok(db)
    }

    fn migrate(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS files (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                path        TEXT NOT NULL UNIQUE,
                filename    TEXT NOT NULL,
                extension   TEXT,
                size_bytes  INTEGER NOT NULL DEFAULT 0,
                mime_type   TEXT,
                hash_xxh3   TEXT,
                created_at  TEXT,
                modified_at TEXT,
                scanned_at  TEXT NOT NULL,
                ai_category TEXT,
                ai_tags     TEXT,
                ai_summary  TEXT,
                status      TEXT NOT NULL DEFAULT 'active'
            );

            CREATE INDEX IF NOT EXISTS idx_files_extension ON files(extension);
            CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash_xxh3);
            CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);

            CREATE TABLE IF NOT EXISTS sort_rules (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                name        TEXT NOT NULL,
                pattern     TEXT NOT NULL,
                target_dir  TEXT NOT NULL,
                priority    INTEGER NOT NULL DEFAULT 100,
                enabled     INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS actions_log (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                file_id       INTEGER,
                action        TEXT NOT NULL,
                from_path     TEXT,
                to_path       TEXT,
                performed_at  TEXT NOT NULL,
                undoable      INTEGER NOT NULL DEFAULT 1,
                FOREIGN KEY (file_id) REFERENCES files(id)
            );

            CREATE INDEX IF NOT EXISTS idx_actions_performed ON actions_log(performed_at);",
        )?;
        Ok(())
    }

    pub fn upsert_file(&self, file: &ScannedFile) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO files (path, filename, extension, size_bytes, mime_type, created_at, modified_at, scanned_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(path) DO UPDATE SET
                size_bytes = excluded.size_bytes,
                modified_at = excluded.modified_at,
                scanned_at = excluded.scanned_at",
            params![
                file.path,
                file.filename,
                file.extension,
                file.size_bytes,
                file.mime_type,
                file.created_at,
                file.modified_at,
                file.scanned_at,
            ],
        )?;
        Ok(())
    }

    pub fn get_files(&self, limit: u32, offset: u32) -> Result<Vec<FileRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, path, filename, extension, size_bytes, mime_type, hash_xxh3,
                    created_at, modified_at, scanned_at, ai_category, ai_tags, ai_summary, status
             FROM files
             WHERE status = 'active'
             ORDER BY modified_at DESC
             LIMIT ?1 OFFSET ?2",
        )?;

        let rows = stmt.query_map(params![limit, offset], |row| {
            Ok(FileRecord {
                id: row.get(0)?,
                path: row.get(1)?,
                filename: row.get(2)?,
                extension: row.get(3)?,
                size_bytes: row.get(4)?,
                mime_type: row.get(5)?,
                hash_xxh3: row.get(6)?,
                created_at: row.get(7)?,
                modified_at: row.get(8)?,
                scanned_at: row.get(9)?,
                ai_category: row.get(10)?,
                ai_tags: row.get(11)?,
                ai_summary: row.get(12)?,
                status: row.get(13)?,
            })
        })?;

        rows.collect()
    }

    pub fn get_stats(&self) -> Result<Stats> {
        let conn = self.conn.lock().unwrap();

        let total_files: u64 = conn.query_row(
            "SELECT COUNT(*) FROM files WHERE status = 'active'",
            [],
            |row| row.get(0),
        )?;

        let total_size: u64 = conn.query_row(
            "SELECT COALESCE(SUM(size_bytes), 0) FROM files WHERE status = 'active'",
            [],
            |row| row.get(0),
        )?;

        let stale_files: u64 = conn.query_row(
            "SELECT COUNT(*) FROM files WHERE status = 'active' AND modified_at < datetime('now', '-90 days')",
            [],
            |row| row.get(0),
        )?;

        let duplicate_groups: u64 = conn.query_row(
            "SELECT COUNT(*) FROM (
                SELECT hash_xxh3 FROM files
                WHERE status = 'active' AND hash_xxh3 IS NOT NULL
                GROUP BY hash_xxh3 HAVING COUNT(*) > 1
            )",
            [],
            |row| row.get(0),
        )?;

        // Extension distribution
        let mut stmt = conn.prepare(
            "SELECT COALESCE(extension, 'other'), COUNT(*), COALESCE(SUM(size_bytes), 0)
             FROM files WHERE status = 'active'
             GROUP BY extension ORDER BY COUNT(*) DESC LIMIT 10",
        )?;
        let categories: Vec<CategoryStat> = stmt
            .query_map([], |row| {
                Ok(CategoryStat {
                    name: row.get(0)?,
                    count: row.get(1)?,
                    size: row.get(2)?,
                })
            })?
            .filter_map(|r| r.ok())
            .collect();

        Ok(Stats {
            total_files,
            total_size,
            stale_files,
            duplicate_groups,
            categories,
        })
    }

    // --- Sort Rules CRUD ---

    pub fn get_rules(&self) -> Result<Vec<crate::sorter::SortRule>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, pattern, target_dir, priority, enabled FROM sort_rules ORDER BY priority ASC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(crate::sorter::SortRule {
                id: row.get(0)?,
                name: row.get(1)?,
                pattern: row.get(2)?,
                target_dir: row.get(3)?,
                priority: row.get(4)?,
                enabled: row.get::<_, i32>(5)? != 0,
            })
        })?;
        rows.collect()
    }

    pub fn create_rule(&self, name: &str, pattern: &str, target_dir: &str, priority: i32) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO sort_rules (name, pattern, target_dir, priority) VALUES (?1, ?2, ?3, ?4)",
            params![name, pattern, target_dir, priority],
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn update_rule(&self, id: i64, name: &str, pattern: &str, target_dir: &str, priority: i32) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE sort_rules SET name = ?1, pattern = ?2, target_dir = ?3, priority = ?4 WHERE id = ?5",
            params![name, pattern, target_dir, priority, id],
        )?;
        Ok(())
    }

    pub fn delete_rule(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM sort_rules WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn toggle_rule(&self, id: i64, enabled: bool) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE sort_rules SET enabled = ?1 WHERE id = ?2",
            params![enabled as i32, id],
        )?;
        Ok(())
    }

    pub fn rules_count(&self) -> Result<u64> {
        let conn = self.conn.lock().unwrap();
        conn.query_row("SELECT COUNT(*) FROM sort_rules", [], |row| row.get(0))
    }

    pub fn seed_default_rules(&self) -> Result<()> {
        if self.rules_count()? > 0 {
            return Ok(());
        }
        for (name, pattern, target_dir, priority) in crate::sorter::default_rules() {
            self.create_rule(&name, &pattern, &target_dir, priority)?;
        }
        Ok(())
    }

    // --- Actions Log ---

    pub fn log_action(&self, file_id: i64, action: &str, from_path: &str, to_path: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO actions_log (file_id, action, from_path, to_path, performed_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![file_id, action, from_path, to_path, now],
        )?;
        Ok(())
    }

    pub fn get_actions(&self, limit: u32, offset: u32) -> Result<Vec<ActionRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT a.id, a.file_id, a.action, a.from_path, a.to_path, a.performed_at, a.undoable,
                    COALESCE(f.filename, '')
             FROM actions_log a
             LEFT JOIN files f ON a.file_id = f.id
             ORDER BY a.performed_at DESC
             LIMIT ?1 OFFSET ?2",
        )?;
        let rows = stmt.query_map(params![limit, offset], |row| {
            Ok(ActionRecord {
                id: row.get(0)?,
                file_id: row.get(1)?,
                action: row.get(2)?,
                from_path: row.get(3)?,
                to_path: row.get(4)?,
                performed_at: row.get(5)?,
                undoable: row.get::<_, i32>(6)? != 0,
                filename: row.get(7)?,
            })
        })?;
        rows.collect()
    }

    pub fn get_action(&self, id: i64) -> Result<ActionRecord> {
        let conn = self.conn.lock().unwrap();
        conn.query_row(
            "SELECT a.id, a.file_id, a.action, a.from_path, a.to_path, a.performed_at, a.undoable,
                    COALESCE(f.filename, '')
             FROM actions_log a
             LEFT JOIN files f ON a.file_id = f.id
             WHERE a.id = ?1",
            params![id],
            |row| {
                Ok(ActionRecord {
                    id: row.get(0)?,
                    file_id: row.get(1)?,
                    action: row.get(2)?,
                    from_path: row.get(3)?,
                    to_path: row.get(4)?,
                    performed_at: row.get(5)?,
                    undoable: row.get::<_, i32>(6)? != 0,
                    filename: row.get(7)?,
                })
            },
        )
    }

    pub fn mark_action_undone(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE actions_log SET undoable = 0 WHERE id = ?1",
            params![id],
        )?;
        Ok(())
    }

    pub fn update_file_path(&self, id: i64, new_path: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let filename = std::path::Path::new(new_path)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();
        conn.execute(
            "UPDATE files SET path = ?1, filename = ?2 WHERE id = ?3",
            params![new_path, filename, id],
        )?;
        Ok(())
    }

    // --- AI Fields ---

    pub fn update_ai_fields(&self, id: i64, category: &str, tags_json: &str, summary: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE files SET ai_category = ?1, ai_tags = ?2, ai_summary = ?3 WHERE id = ?4",
            params![category, tags_json, summary, id],
        )?;
        Ok(())
    }

    pub fn get_uncategorized_files(&self, limit: u32) -> Result<Vec<FileRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, path, filename, extension, size_bytes, mime_type, hash_xxh3,
                    created_at, modified_at, scanned_at, ai_category, ai_tags, ai_summary, status
             FROM files
             WHERE status = 'active' AND ai_category IS NULL
             ORDER BY modified_at DESC
             LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit], |row| {
            Ok(FileRecord {
                id: row.get(0)?,
                path: row.get(1)?,
                filename: row.get(2)?,
                extension: row.get(3)?,
                size_bytes: row.get(4)?,
                mime_type: row.get(5)?,
                hash_xxh3: row.get(6)?,
                created_at: row.get(7)?,
                modified_at: row.get(8)?,
                scanned_at: row.get(9)?,
                ai_category: row.get(10)?,
                ai_tags: row.get(11)?,
                ai_summary: row.get(12)?,
                status: row.get(13)?,
            })
        })?;
        rows.collect()
    }

    pub fn remove_missing_files(&self, existing_paths: &[String]) -> Result<usize> {
        let conn = self.conn.lock().unwrap();
        if existing_paths.is_empty() {
            return conn.execute("DELETE FROM files", []);
        }
        let placeholders: Vec<String> = existing_paths.iter().enumerate().map(|(i, _)| format!("?{}", i + 1)).collect();
        let sql = format!(
            "DELETE FROM files WHERE path NOT IN ({})",
            placeholders.join(",")
        );
        let params: Vec<&dyn rusqlite::ToSql> = existing_paths.iter().map(|s| s as &dyn rusqlite::ToSql).collect();
        conn.execute(&sql, params.as_slice())
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ScannedFile {
    pub path: String,
    pub filename: String,
    pub extension: Option<String>,
    pub size_bytes: u64,
    pub mime_type: Option<String>,
    pub created_at: Option<String>,
    pub modified_at: Option<String>,
    pub scanned_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FileRecord {
    pub id: i64,
    pub path: String,
    pub filename: String,
    pub extension: Option<String>,
    pub size_bytes: u64,
    pub mime_type: Option<String>,
    pub hash_xxh3: Option<String>,
    pub created_at: Option<String>,
    pub modified_at: Option<String>,
    pub scanned_at: String,
    pub ai_category: Option<String>,
    pub ai_tags: Option<String>,
    pub ai_summary: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CategoryStat {
    pub name: String,
    pub count: u64,
    pub size: u64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Stats {
    pub total_files: u64,
    pub total_size: u64,
    pub stale_files: u64,
    pub duplicate_groups: u64,
    pub categories: Vec<CategoryStat>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ActionRecord {
    pub id: i64,
    pub file_id: Option<i64>,
    pub action: String,
    pub from_path: Option<String>,
    pub to_path: Option<String>,
    pub performed_at: String,
    pub undoable: bool,
    pub filename: String,
}
