use crate::models::settings_model::PortfolioConfig;
use crate::services::{ibkr_service, kraken_service};
use crate::state::AppState;
use axum::{
    debug_handler,
    extract::State,
    http::{HeaderMap, StatusCode, header},
    response::{IntoResponse, Json},
};
use firebase_auth::FirebaseUser;

#[debug_handler]
pub async fn trigger_sync_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let auth_header = headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "));

    let token = match auth_header {
        Some(t) => t,
        None => {
            println!("⛔ Error: Token not found!");
            return (StatusCode::UNAUTHORIZED, "Missing Token").into_response();
        }
    };

    let user_id = match state.firebase_auth.verify::<FirebaseUser>(token) {
        Ok(user) => user.sub,
        Err(e) => {
            println!("⛔ Error: Invalid Token! {}", e);
            return (StatusCode::UNAUTHORIZED, "Invalid Token").into_response();
        }
    };

    println!("TEST: Manual Sync requested for user: {}", user_id);

    let db = &state.firestore_client.db;

    let config_path = format!("users/{}/configuration", user_id);

    let config: PortfolioConfig = match db
        .fluent()
        .select()
        .by_id_in(&config_path)
        .obj()
        .one("main")
        .await
    {
        Ok(Some(cfg)) => cfg,
        Ok(None) => {
            println!("⚠️ Config is empty, using default settings.");
            PortfolioConfig::default()
        }
        Err(e) => {
            eprintln!("❌ Config read error: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Config Error").into_response();
        }
    };

    for (source_name, settings) in config.connections {
        if !settings.enabled {
            println!("ℹ️ {} sync is disabled, skipping.", source_name);
            continue;
        }

        println!("⚡ SYNCING: {}...", source_name);

        match source_name.as_str() {
            "IBKR" => match state.ibkr_client.fetch_portfolio_xml().await {
                Ok(xml_data) => {
                    if let Err(e) =
                        ibkr_service::sync_ibkr_to_firestore(db, &user_id, &xml_data).await
                    {
                        eprintln!("IBKR Service Error: {}", e);
                    }
                }
                Err(e) => {
                    eprintln!("IBKR Fetch Error: {}", e);
                }
            },
            "KRAKEN" => {
                if let Err(e) =
                    kraken_service::sync_kraken_to_firestore(db, &state.kraken_client, &user_id)
                        .await
                {
                    eprintln!("Kraken Service Error: {}", e);
                }
            }
            "ETORO" => {
                println!("🚧 eToro is not yet implemented (CSV Upload expected).");
            }
            _ => {
                println!("❓ Unknown Source: {}", source_name);
            }
        }
    }

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "status": "success",
            "message": "All sources are synchronized!"
        })),
    )
        .into_response()
}
