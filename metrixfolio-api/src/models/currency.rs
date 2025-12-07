use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CurrencyRate {
    pub from: String,
    pub to: String,
    pub rate: f64,
    pub date: String,
}
