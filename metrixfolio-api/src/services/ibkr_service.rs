use crate::models::Asset;
use crate::models::ibkr::FlexQueryResponse;
use crate::services::asset_service;
use firestore::*;
use std::time::{SystemTime, UNIX_EPOCH};

pub async fn sync_ibkr_to_firestore(
    db: &FirestoreDb,
    user_id: &str,
    xml_data: &str,
) -> Result<(), String> {
    println!(
        "INFO: Starting IBKR Sync (WRITE-ONLY MODE) for user: {}",
        user_id
    );

    let assets_collection_path = format!("users/{}/assets", user_id);
    println!("INFO: Collection Path: {}", assets_collection_path);

    println!("INFO: Fetching existing assets to preserve categories...");

    let existing_assets_map = asset_service::get_assets_category_map(db, user_id).await;

    let response: FlexQueryResponse =
        quick_xml::de::from_str(xml_data).map_err(|e| format!("XML Parsing Error: {}", e))?;

    let positions = response.flex_statements.statement.open_positions.position;
    let cash_reports = response.flex_statements.statement.cash_report.currencies;
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();

    for pos in positions {
        let clean_symbol = sanitize_id(&pos.symbol);
        let asset_id = format!("IBKR_{}", clean_symbol);

        let category_id = existing_assets_map
            .get(&asset_id)
            .cloned()
            .unwrap_or_else(|| "uncategorized".to_string());

        let multiplier_val = if pos.multiplier == 0.0 {
            1.0
        } else {
            pos.multiplier
        };

        let asset = Asset {
            id: asset_id.clone(),
            symbol: pos.symbol.clone(),
            name: pos.description.clone(),
            amount: pos.quantity,
            avg_cost: pos.cost_basis_price,
            multiplier: multiplier_val.to_string(),
            cost_basis_money: pos.cost_basis_money,
            currency: pos.currency,
            current_price: pos.mark_price,
            unrealized_pnl: pos.unrealized_pnl,
            source: "IBKR".to_string(),
            category_id: category_id,
            updated_at: timestamp,
        };

        let result = db
            .fluent()
            .update()
            .in_col(&assets_collection_path.as_str()) // <--- ANA DİZİN (Hata şansı %0)
            .document_id(&asset_id)
            .object(&asset)
            .execute::<()>()
            .await;

        match result {
            Ok(_) => println!("✅ SUCCESS: Wrote {} to Firestore", asset.symbol),
            Err(e) => eprintln!("❌ ERROR writing {}: {}", asset.symbol, e),
        }
    }

    for cash in cash_reports {
        if cash.currency == "BASE_SUMMARY" {
            continue;
        }

        let clean_currency = sanitize_id(&cash.currency);
        let asset_id = format!("IBKR_CASH_{}", clean_currency);

        let category_id = existing_assets_map
            .get(&asset_id)
            .cloned()
            .unwrap_or_else(|| "uncategorized".to_string());

        let asset = Asset {
            id: asset_id.clone(),
            symbol: cash.currency.clone(),
            name: format!("Cash ({})", cash.currency),
            amount: cash.ending_settled_cash.to_string(),
            avg_cost: "1.0".to_string(),
            multiplier: "1.0".to_string(),
            cost_basis_money: cash.ending_settled_cash.to_string(),
            currency: cash.currency.clone(),
            current_price: "1.0".to_string(),
            unrealized_pnl: "0.0".to_string(),
            source: "IBKR".to_string(),
            category_id: category_id,
            updated_at: timestamp,
        };

        let result = db
            .fluent()
            .update()
            .in_col(&assets_collection_path.as_str()) // Kök koleksiyon
            .document_id(&asset_id) // Adresli ID
            .object(&asset)
            .execute::<()>()
            .await;

        if let Err(e) = result {
            eprintln!("ERROR writing CASH {}: {}", asset.symbol, e);
        } else {
            println!("✅ WROTE CASH: {}", asset.symbol);
        }
    }

    println!("INFO: Sync process finished.");
    Ok(())
}

fn sanitize_id(input: &str) -> String {
    input
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '_' })
        .collect()
}
