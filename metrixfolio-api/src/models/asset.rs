use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Asset {
    pub id: String,
    pub symbol: String,
    pub name: String,
    pub amount: String,
    pub avg_cost: String,
    pub cost_basis_money: String,
    pub currency: String,
    pub current_price: String,
    pub unrealized_pnl: String,
    pub source: String,
    pub category_id: String,
    pub updated_at: u64,
}
