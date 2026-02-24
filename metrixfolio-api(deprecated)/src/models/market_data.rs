use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MarketData {
    pub symbol: String,
    pub price: f64,

    #[serde(default)]
    pub change_percent: f64,
    
    pub currency: String,
    pub last_updated: u64,
    pub source: String,
}

#[derive(Debug, Clone)]
pub struct TickerInfo {
    pub price: f64,
    pub change_percent: f64,
}
