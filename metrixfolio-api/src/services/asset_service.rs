use crate::models::Asset;
use firestore::*;
use futures::stream::StreamExt;
use std::collections::HashMap;
use std::env;

pub async fn get_all_assets(db: &FirestoreDb, user_id: &str) -> Result<Vec<Asset>, String> {
    let project_id = env::var("FIREBASE_PROJECT_ID").unwrap_or("metrixfolio".to_string());

    // O karmaşık path mantığı sadece burada yaşayacak
    let parent_path = format!(
        "projects/{}/databases/(default)/documents/users/{}",
        project_id, user_id
    );

    println!("🔍 DB READ: Fetching assets for user: {}", user_id);

    let stream_query = db
        .fluent()
        .select()
        .from("assets")
        .parent(&parent_path)
        .obj::<Asset>()
        .stream_query()
        .await
        .map_err(|e| format!("Firestore Query Error: {}", e))?;

    let assets: Vec<Asset> = stream_query.collect().await;

    Ok(assets)
}

/// Smart Sync için varlıkları HashMap (ID -> CategoryID) olarak çeker.
pub async fn get_assets_category_map(db: &FirestoreDb, user_id: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();

    // Yukarıdaki fonksiyonu tekrar kullanıyoruz (Code Reuse)
    if let Ok(assets) = get_all_assets(db, user_id).await {
        for asset in assets {
            if asset.category_id != "uncategorized" {
                map.insert(asset.id, asset.category_id);
            }
        }
    }

    map
}
