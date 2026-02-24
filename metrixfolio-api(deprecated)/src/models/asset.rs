use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Asset {
    pub id: String,
    pub symbol: String,
    pub name: String,

    #[serde(default)]
    pub amount: String,

    #[serde(default)]
    pub avg_cost: String,

    #[serde(default = "default_multiplier")]
    pub multiplier: String,

    #[serde(default)]
    pub cost_basis_money: String,

    #[serde(default)]
    pub currency: String,

    #[serde(default)]
    pub current_price: String,

    #[serde(default)]
    pub unrealized_pnl: String,

    pub source: String,
    pub category_id: String,

    pub updated_at: Option<serde_json::Value>,
}

fn default_multiplier() -> String {
    "1.0".to_string()
}
