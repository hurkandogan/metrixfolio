use super::currency::Currency;
use serde::Serialize;
use std::collections::HashMap;

#[derive(Serialize, Debug, Clone)]
pub struct ConsolidatedAsset {
    pub id: String,
    pub symbol: String,
    pub name: String,
    pub amount: f64,
    pub value: f64,
    pub source: String,
    pub category_id: String,
    pub native_currency: String,
}

#[derive(Serialize, Debug, Clone)]
pub struct CategoryData {
    pub name: String,
    pub value: f64,
    pub target_percentage: f64,
    pub actual_percentage: f64,
    pub assets: Vec<ConsolidatedAsset>,
}

#[derive(Serialize, Debug, Clone)]
pub struct FinalPortfolioResponse {
    pub total_value: f64,
    pub reference_rates: HashMap<String, f64>,
    pub categories: HashMap<String, CategoryData>,
}
