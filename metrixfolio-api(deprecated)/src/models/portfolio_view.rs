use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct PortfolioSummary {
    pub total_value: f64,
    pub total_cost: f64,
    pub total_pnl: f64,
    pub pnl_percentage: f64,
    pub unrealized_pnl: f64,
    pub realized_pnl: f64,
    pub base_currency: String,
    pub categories: Vec<CategoryAnalysis>,
}

#[derive(Debug, Serialize)]
pub struct CategoryAnalysis {
    pub id: String,
    pub name: String,
    pub value: f64,
    pub actual_percentage: f64,
    pub target_percentage: f64,
}

#[derive(Debug, Serialize)]
pub struct AssetPerformance {
    pub symbol: String,
    pub name: String,
    pub value: f64,
    pub pnl_percentage: f64,
}
