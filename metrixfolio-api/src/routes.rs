use crate::handlers::{
    portfolio_handler::get_portfolio_summary, public_data_handler::get_market_prices_handler,
    sync_handler::trigger_sync_handler,
};
use crate::handlers::{public_data_handler, root_handler};
use crate::state::AppState;
use axum::http::HeaderValue;
use axum::{
    Router,
    http::Method,
    routing::{get, post},
};
use tower_http::cors::{Any, CorsLayer};

pub fn create_router(app_state: AppState) -> Router {
    let cors_layer = CorsLayer::new()
        .allow_origin(Any)
        // .allow_origin(
        //     "https://metrixfolio--metrixfolio.europe-west4.hosted.app"
        //         .parse::<HeaderValue>()
        //         .unwrap(),
        // )
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(vec![
            axum::http::header::AUTHORIZATION,
            axum::http::header::CONTENT_TYPE,
        ]);

    let protected_routes = Router::new()
        .route("/", get(root_handler))
        .route("/api/v1/sync/all", post(trigger_sync_handler))
        .route("/api/v1/portfolio/summary", get(get_portfolio_summary))
        .route("/api/v1/market/prices", post(get_market_prices_handler))
        .with_state(app_state.clone());

    Router::new().merge(protected_routes).layer(cors_layer)
}
