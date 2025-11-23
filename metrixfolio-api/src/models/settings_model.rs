use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct PortfolioConfig {
    #[serde(default)]
    pub base_currency: String,

    #[serde(default)]
    pub categories: Vec<Category>,

    #[serde(default)]
    pub connections: HashMap<String, ConnectionSettings>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ConnectionSettings {
    pub enabled: bool,
    pub last_sync: Option<u64>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub target_percentage: f64,

    #[serde(rename = "type")]
    pub category_type: String,
}
