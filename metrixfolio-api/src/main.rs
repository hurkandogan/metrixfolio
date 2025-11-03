mod handlers;

use crate::handlers::{
    kraken::{
        KrakenClient, kraken_balance_handler, kraken_portfolio_handler, kraken_ticker_handler,
    },
    root::root_handler,
};

use axum::{Router, routing::get};
use std::env;
use std::net::SocketAddr;

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

    let app = Router::new()
        .route("/", get(root_handler))
        .route("/kraken/balance", get(kraken_balance_handler))
        .route("/kraken/ticker", get(kraken_ticker_handler))
        .route("/kraken/portfolio", get(kraken_portfolio_handler))
        .with_state(kraken_client);

    // listener
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("Listening on {addr}");
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
