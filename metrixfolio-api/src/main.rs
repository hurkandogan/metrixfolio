mod handlers;

use crate::handlers::{
    kraken::{
        KrakenClient, kraken_balance_handler, kraken_portfolio_handler, kraken_ticker_handler,
    },
    root::root_handler,
    stocks::google_sheet_test_handler,
};

use axum::{
    Router,
    http::{HeaderValue, Method},
    middleware::from_fn_with_state,
    routing::get,
};
use axum_firebase_middleware::{FirebaseConfig, firebase_auth_middleware};
use std::env;
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();

    let kraken_api_key =
        env::var("KRAKEN_API_KEY").expect("KRAKEN_API_KEY env could not be found!");
    let kraken_api_secret =
        env::var("KRAKEN_API_SECRET").expect("KRAKEN_API_SECRET env could not be found!");

    let kraken_client = KrakenClient::new(kraken_api_key, kraken_api_secret);

    let port_str = env::var("PORT").unwrap_or_else(|_| "8080".to_string());

    let port = port_str.parse::<u16>().expect("Invalid port number");

    let cors_layer = CorsLayer::new()
        .allow_origin("http://localhost:3000".parse::<HeaderValue>().unwrap())
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(vec![
            axum::http::header::AUTHORIZATION,
            axum::http::header::CONTENT_TYPE,
        ]);

    let firebase_project_id =
        env::var("FIREBASE_PROJECT_ID").expect("FIREBASE_PROJECT_ID env could not be found!");

    let firebase_config = FirebaseConfig::new(firebase_project_id.to_string())
        .expect("Failed to create Firebase config")
        .with_max_token_age(std::time::Duration::from_secs(24 * 3600));

    let protected_routes = Router::new()
        .route("/kraken/balance", get(kraken_balance_handler))
        .route("/kraken/ticker", get(kraken_ticker_handler))
        .route("/kraken/portfolio", get(kraken_portfolio_handler))
        .route("/stocks/test-csv", get(google_sheet_test_handler))
        .layer(from_fn_with_state(
            firebase_config.clone(),
            firebase_auth_middleware,
        ))
        .with_state(kraken_client);

    let public_routes = Router::new().route("/health", get(root_handler));

    let app = Router::new()
        .merge(protected_routes)
        .merge(public_routes)
        .layer(cors_layer);

    // listener
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("Listening on {addr}");
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
