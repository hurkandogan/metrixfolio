use crate::handlers::{get_full_portfolio_handler, root_handler, stock_list_handler};
use crate::state::AppState;

use axum::{
    Router,
    http::{HeaderValue, Method},
    middleware::from_fn_with_state,
    routing::get,
};
use axum_firebase_middleware::{FirebaseConfig, firebase_auth_middleware};
use tower_http::cors::CorsLayer;

pub fn create_router(app_state: AppState) -> Router {
    let cors_layer = CorsLayer::new()
        .allow_origin("http://localhost:3000".parse::<HeaderValue>().unwrap())
        .allow_origin(
            "https://metrixfolio--metrixfolio.europe-west4.hosted.app"
                .parse::<HeaderValue>()
                .unwrap(),
        )
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(vec![
            axum::http::header::AUTHORIZATION,
            axum::http::header::CONTENT_TYPE,
        ]);

    let firebase_project_id =
        std::env::var("FIREBASE_PROJECT_ID").expect("FIREBASE_PROJECT_ID env could not be found!");

    let firebase_config = FirebaseConfig::new(firebase_project_id.to_string())
        .expect("Failed to create Firebase config")
        .with_max_token_age(std::time::Duration::from_secs(24 * 3600));

    let auth_layer = from_fn_with_state(firebase_config.clone(), firebase_auth_middleware);

    let protected_routes = Router::new()
        .route("/api/v1/portfolio", get(get_full_portfolio_handler))
        .layer(auth_layer)
        .with_state(app_state.clone());

    let public_routes = Router::new()
        .route("/", get(root_handler))
        .route("/api/v1/public/stock-list", get(stock_list_handler))
        .with_state(app_state.clone());

    Router::new()
        .merge(protected_routes)
        .merge(public_routes)
        .layer(cors_layer)
}
