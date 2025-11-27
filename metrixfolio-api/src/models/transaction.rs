use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum TransactionType {
    DEPOSIT,
    WITHDRAWAL,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Transaction {
    pub id: String,
    #[serde(rename = "type")]
    pub type_: TransactionType,
    pub amount: f64,
    pub currency: String,
    pub date: String,
    pub note: Option<String>,
}
