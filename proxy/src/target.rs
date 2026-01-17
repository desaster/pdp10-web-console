//
// © 2026 Upi Tamminen. MIT License.
//
// Note: This file was generated with LLM assistance.  Use with caution.

use anyhow::{anyhow, Result};
use std::collections::HashMap;
use std::sync::Arc;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TargetType {
    Raw,    // Direct TCP passthrough (tv11 protocol)
    Telnet, // Telnet with IAC handling
}

#[derive(Debug, Clone)]
pub struct Target {
    pub name: String,
    pub target_type: TargetType,
    pub address: String,
}

impl Target {
    /// Parse from "NAME:TYPE:HOST:PORT" format
    pub fn parse(s: &str) -> Result<Self> {
        let parts: Vec<&str> = s.splitn(4, ':').collect();
        if parts.len() != 4 {
            return Err(anyhow!(
                "Invalid target format '{}', expected NAME:TYPE:HOST:PORT",
                s
            ));
        }

        let name = parts[0].to_string();
        let target_type = match parts[1].to_lowercase().as_str() {
            "raw" => TargetType::Raw,
            "telnet" => TargetType::Telnet,
            other => return Err(anyhow!("Unknown target type '{}', expected 'raw' or 'telnet'", other)),
        };
        let address = format!("{}:{}", parts[2], parts[3]);

        Ok(Target {
            name,
            target_type,
            address,
        })
    }
}

#[derive(Debug, Clone)]
pub struct TargetRegistry {
    targets: HashMap<String, Arc<Target>>,
}

impl TargetRegistry {
    pub fn new() -> Self {
        Self {
            targets: HashMap::new(),
        }
    }

    pub fn add(&mut self, target: Target) {
        self.targets.insert(target.name.clone(), Arc::new(target));
    }

    pub fn get(&self, name: &str) -> Option<Arc<Target>> {
        self.targets.get(name).cloned()
    }

    pub fn list(&self) -> Vec<Arc<Target>> {
        self.targets.values().cloned().collect()
    }

    pub fn is_empty(&self) -> bool {
        self.targets.is_empty()
    }
}
