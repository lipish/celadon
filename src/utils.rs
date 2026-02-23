use crate::common::AppResult;
use chrono::Utc;
use serde_json::Value;
use std::path::{Path, PathBuf};

pub fn now_timestamp() -> String {
    Utc::now().to_rfc3339()
}

pub fn suggest_project_name(idea: &str) -> String {
    let mut normalized = String::new();
    let mut last_dash = false;
    for c in idea.chars() {
        if c.is_ascii_alphanumeric() {
            normalized.push(c.to_ascii_lowercase());
            last_dash = false;
        } else if !last_dash {
            normalized.push('-');
            last_dash = true;
        }
    }
    normalized = normalized.trim_matches('-').to_string();
    if normalized.is_empty() {
        "celadon-project".to_string()
    } else if normalized.len() < 4 {
        format!("celadon-{normalized}")
    } else {
        normalized
    }
}

pub fn print_json(value: &Value) -> AppResult<()> {
    println!("{}", serde_json::to_string_pretty(value)?);
    Ok(())
}

pub fn storage_dir() -> PathBuf {
    std::env::current_dir().unwrap_or_else(|_| Path::new(".").to_path_buf()).join(".celadon")
}
