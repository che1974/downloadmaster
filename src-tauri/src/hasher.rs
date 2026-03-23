use crate::db::Database;
use std::fs::File;
use std::io::Read;
use std::path::Path;
use xxhash_rust::xxh3::xxh3_64;

const MAX_HASH_SIZE: u64 = 100 * 1024 * 1024; // 100MB limit

pub fn hash_file(path: &str) -> Result<String, String> {
    let p = Path::new(path);
    if !p.exists() {
        return Err("File not found".into());
    }

    let metadata = p.metadata().map_err(|e| e.to_string())?;
    if metadata.len() > MAX_HASH_SIZE {
        return Err("File too large for hashing".into());
    }

    let mut file = File::open(p).map_err(|e| e.to_string())?;
    let mut buffer = Vec::with_capacity(metadata.len() as usize);
    file.read_to_end(&mut buffer).map_err(|e| e.to_string())?;

    let hash = xxh3_64(&buffer);
    Ok(format!("{:016x}", hash))
}

pub fn hash_all_files(db: &Database) -> Result<u64, String> {
    let files = db.get_files(10000, 0).map_err(|e| e.to_string())?;
    let mut count: u64 = 0;

    // Two-pass: first group by size, then only hash files with size duplicates
    let mut size_groups: std::collections::HashMap<u64, Vec<(i64, String)>> = std::collections::HashMap::new();
    for file in &files {
        if file.hash_xxh3.is_some() {
            continue;
        }
        size_groups
            .entry(file.size_bytes)
            .or_default()
            .push((file.id, file.path.clone()));
    }

    for (_size, group) in &size_groups {
        // Hash all files — even unique sizes get hashed for future dedup
        for (id, path) in group {
            match hash_file(path) {
                Ok(hash) => {
                    db.update_hash(*id, &hash).ok();
                    count += 1;
                }
                Err(e) => {
                    log::warn!("Failed to hash {}: {}", path, e);
                }
            }
        }
    }

    Ok(count)
}
