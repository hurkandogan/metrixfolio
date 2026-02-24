use crate::models::transaction::{Transaction, TransactionType};
use firestore::*;
use futures::stream::StreamExt;
use std::env;

pub async fn get_transactions(db: &FirestoreDb, user_id: &str) -> Vec<Transaction> {
    let project_id = env::var("FIREBASE_PROJECT_ID").unwrap_or("metrixfolio".to_string());

    let parent_path = format!(
        "projects/{}/databases/(default)/documents/users/{}",
        project_id, user_id
    );

    let stream = db
        .fluent()
        .list()
        .from("transactions")
        .parent(&parent_path)
        .obj::<Transaction>()
        .stream_all()
        .await;

    match stream {
        Ok(s) => s.collect().await,
        Err(e) => {
            eprintln!("⚠️ Transaction fetch error: {}", e);
            Vec::new()
        }
    }
}

pub fn calculate_net_investment(
    transactions: &[Transaction],
) -> std::collections::HashMap<String, f64> {
    let mut totals = std::collections::HashMap::new();

    for trx in transactions {
        let entry = totals.entry(trx.currency.clone()).or_insert(0.0);

        match trx.type_ {
            TransactionType::DEPOSIT => *entry += trx.amount,
            TransactionType::WITHDRAWAL => *entry -= trx.amount,
        }
    }

    totals
}
