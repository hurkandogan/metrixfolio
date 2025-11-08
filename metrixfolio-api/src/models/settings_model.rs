use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub target_percentage: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ManualAsset {
    pub id: String,
    pub ticker: String,
    pub amount: f64,
    pub category_id: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct UserSettings {
    #[serde(default)]
    pub categories: Vec<Category>,
    #[serde(default)]
    pub manual_assets: Vec<ManualAsset>,
}
