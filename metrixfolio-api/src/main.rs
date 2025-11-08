mod clients;
mod handlers;
mod models;
mod routes;
mod state;

use crate::routes::create_router;
use crate::state::AppState;
use std::env;
use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();

    let app_state = AppState::new()
        .await
        .expect("AppState initialization failed! Check .env variables.");

    let app = create_router(app_state);

    // listener
    let port_str = env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let port = port_str.parse::<u16>().expect("Invalid port number");
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("Listening on {addr}");
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
