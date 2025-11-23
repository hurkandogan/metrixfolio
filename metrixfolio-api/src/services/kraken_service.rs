use crate::clients::KrakenClient;
use crate::models::{Asset, KrakenBalance};
use firestore::*;
use std::collections::HashMap;
use std::error::Error;
use std::time::{SystemTime, UNIX_EPOCH};

pub async fn sync_kraken_to_firestore(
    db: &FirestoreDb,
    client: &KrakenClient,
    user_id: &str,
) -> Result<(), Box<dyn Error>> {
    println!("INFO; Starting Kraken sync for user: {}", user_id);

    let balance: KrakenBalance = client
        .private_request("/0/private/Balance", HashMap::new())
        .await?;

    let project_id = std::env::var("FIREBASE_PROJECT_ID").unwrap_or("metrixfolio".to_string());
    let parent_path = format!(
        "projects/{}/databases/(default)/documents/users/{}",
        project_id, user_id
    );

    let timestamp = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();
    let full_collection_path = format!("users/{}/assets", user_id);

    let existing_assets_map: HashMap<String, String> = match db
        .fluent()
        .select()
        .from("assets")
        .parent(&parent_path)
        .obj::<Asset>()
        .query()
        .await
    {
        Ok(assets) => {
            let mut map = HashMap::new();
            for asset in assets {
                if asset.category_id != "uncategorized" {
                    map.insert(asset.id.clone(), asset.category_id.clone());
                }
            }
            map
        }
        Err(_) => HashMap::new(), // Sessizce devam et
    };

    for (symbol, amount_str) in balance {
        let amount: f64 = amount_str.parse().unwrap_or(0.0);

        if amount <= 0.0001 {
            continue;
        }

        let (clean_symbol, id_suffix, display_name) = match symbol.as_str() {
            "XXBT" => ("BTC", "BTC", "Bitcoin"),
            "XETH" => ("ETH", "ETH", "Ethereum"),
            "ETH.B" => ("ETH", "ETH_STAKED", "Ethereum (Staked)"),
            "XLTCT" => ("LTC", "LTC", "Litecoin"),
            "XXDG" => ("DOGE", "DOGE", "Dogecoin"),
            "XXRP" => ("XRP", "XRP", "Ripple"),
            "ZEUR" => ("EUR", "EUR", "Euro"),
            "ZUSD" => ("USD", "USD", "US Dollar"),
            _ => (symbol.as_str(), symbol.as_str(), symbol.as_str()),
        };

        let asset_id = format!("KRAKEN_{}", id_suffix);

        let category_id = existing_assets_map
            .get(&asset_id)
            .cloned()
            .unwrap_or_else(|| "uncategorized".to_string());

        let asset = Asset {
            id: asset_id.clone(),
            symbol: clean_symbol.to_string(),
            name: display_name.to_string(),
            amount: amount_str,
            avg_cost: "0.0".to_string(),
            cost_basis_money: "0.0".to_string(),
            currency: "USD".to_string(),
            current_price: "0.0".to_string(),
            unrealized_pnl: "0.0".to_string(),
            source: "KRAKEN".to_string(),
            category_id: category_id,
            updated_at: timestamp,
        };

        let result = db
            .fluent()
            .update()
            .in_col(&full_collection_path)
            .document_id(&asset.id)
            .object(&asset)
            .execute::<()>()
            .await;

        match result {
            Ok(_) => println!("✅ KRAKEN: Synced {}", clean_symbol),
            Err(e) => eprintln!("❌ KRAKEN: Failed to sync {}: {}", clean_symbol, e),
        }
    }
    Ok(())
}
