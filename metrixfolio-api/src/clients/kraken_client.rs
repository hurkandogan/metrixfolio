use axum::Json;
use axum::extract::{Extension, Query, State};
use axum::response::IntoResponse;
use axum_firebase_middleware::FirebaseClaims;
use base64::Engine as _;
use base64::engine::general_purpose::STANDARD as base64_standard;
use hmac::{Hmac, Mac};
use reqwest::{Client, StatusCode};
use serde_json::Value;
use sha2::{Digest, Sha256, Sha512};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

type HmacSha512 = Hmac<Sha512>;

pub const KRAKEN_API_URL: &str = "https://api.kraken.com";
pub const KRAKEN_BALANCE_ENDPOINT: &str = "/0/private/Balance";

#[derive(Clone)]
pub struct KrakenClient {
    http_client: Client,
    api_key: String,
    api_secret: String,
}

impl KrakenClient {
    pub fn new(api_key: String, api_secret: String) -> Self {
        Self {
            http_client: Client::new(),
            api_key,
            api_secret,
        }
    }

    fn create_signature(
        path: &str,
        post_data: &str,
        secret: &str,
        nonce: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let decoded_secret = base64_standard.decode(secret)?;

        let mut sha256 = Sha256::new();
        sha256.update(nonce.as_bytes());
        sha256.update(post_data.as_bytes());
        let hash_digest = sha256.finalize();

        let mut message = Vec::new();
        message.extend_from_slice(path.as_bytes());
        message.extend_from_slice(&hash_digest);

        let mut mac = HmacSha512::new_from_slice(&decoded_secret)?;
        mac.update(&message);
        let mac_result = mac.finalize();
        let signature_bytes = mac_result.into_bytes();

        let signature_base64 = base64_standard.encode(&signature_bytes);

        Ok(signature_base64)
    }

    pub async fn private_request(
        &self,
        path: &str,
        params: HashMap<String, String>,
    ) -> Result<Value, String> {
        let post_data = params
            .iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect::<Vec<String>>()
            .join("&");

        let nonce = params
            .get("nonce")
            .ok_or_else(|| "Nonce param is missing".to_string())?;

        let signature = KrakenClient::create_signature(path, &post_data, &self.api_secret, nonce)
            .map_err(|e| format!("Signature couldn't be created: {}", e))?;

        let url = format!("{}{}", KRAKEN_API_URL, path);

        match self
            .http_client
            .post(&url)
            .header("API-Key", &self.api_key)
            .header("API-Sign", &signature)
            .form(&params)
            .send()
            .await
        {
            Ok(response) => match response.json::<Value>().await {
                Ok(data) => {
                    if data["error"].as_array().map_or(true, |e| e.is_empty()) {
                        Ok(data["result"].clone())
                    } else {
                        Err(format!("Kraken API Error: {:?}", data["error"]))
                    }
                }
                Err(e) => Err(format!("Kraken response JSON parse error: {}", e)),
            },
            Err(e) => Err(format!("API request cannot be done!: {}", e)),
        }
    }

    pub async fn public_request(
        &self,
        path: &str,
        params: Option<HashMap<String, String>>,
    ) -> Result<Value, String> {
        let url = format!("{}{}", KRAKEN_API_URL, path);
        let mut request_builder = self.http_client.get(&url);

        if let Some(p) = params {
            request_builder = request_builder.query(&p);
        }

        match request_builder.send().await {
            Ok(response) => match response.json::<Value>().await {
                Ok(data) => {
                    if data["error"].as_array().map_or(true, |e| e.is_empty()) {
                        Ok(data["result"].clone())
                    } else {
                        Err(format!("Kraken API Error: {:?}", data["error"]))
                    }
                }
                Err(e) => Err(format!("Kraken response JSON parse error: {}", e)),
            },
            Err(e) => Err(format!("Failed to send request to Kraken: {}", e)),
        }
    }
}

// pub async fn kraken_balance_handler(State(client): State<KrakenClient>) -> impl IntoResponse {
//     println!("Kraken balance handler called");

//     let nonce = SystemTime::now()
//         .duration_since(UNIX_EPOCH)
//         .expect("Time went backwards")
//         .as_millis()
//         .to_string();

//     let mut params = HashMap::new();
//     params.insert("nonce".to_string(), nonce);

//     match client
//         .private_request(KRAKEN_BALANCE_ENDPOINT, params)
//         .await
//     {
//         Ok(balance_data) => (StatusCode::OK, Json(balance_data)).into_response(),
//         Err(e) => {
//             eprintln!("{}", e);
//             (StatusCode::INTERNAL_SERVER_ERROR, e).into_response()
//         }
//     }
// }

// pub async fn kraken_ticker_handler(
//     State(client): State<KrakenClient>,
//     Query(params): Query<HashMap<String, String>>,
// ) -> impl IntoResponse {
//     println!("Kraken ticker handler called");

//     match client
//         .public_request("/0/public/Ticker", Some(params))
//         .await
//     {
//         Ok(ticker_data) => (StatusCode::OK, Json(ticker_data)).into_response(),
//         Err(e) => {
//             eprintln!("{}", e);
//             (StatusCode::INTERNAL_SERVER_ERROR, e).into_response()
//         }
//     }
// }

// pub async fn kraken_portfolio_handler(
//     State(client): State<KrakenClient>,
//     Extension(claims): Extension<FirebaseClaims>,
// ) -> impl IntoResponse {
//     println!("Kraken portfolio handler called");

//     let nonce = SystemTime::now()
//         .duration_since(UNIX_EPOCH)
//         .unwrap()
//         .as_millis()
//         .to_string();

//     let user_id = claims.sub;

//     println!(
//         "'Akıllı Portföy' handler'ı çağrıldı. Kullanıcı (axum-firebase-middleware'den): {}",
//         user_id
//     );

//     let mut balance_params = HashMap::new();
//     balance_params.insert("nonce".to_string(), nonce);

//     let balances = match client
//         .private_request(KRAKEN_BALANCE_ENDPOINT, balance_params)
//         .await
//     {
//         Ok(b) => b,
//         Err(e) => {
//             eprintln!("Error fetching balance: {}", e);
//             return (
//                 StatusCode::INTERNAL_SERVER_ERROR,
//                 "ERROR: Data couldn't be fetched.",
//             )
//                 .into_response();
//         }
//     };

//     let balance_map = match balances.as_object() {
//         Some(map) => map,
//         None => {
//             eprintln!("JSON format of balances is incorrect.");
//             return (
//                 StatusCode::INTERNAL_SERVER_ERROR,
//                 "ERROR: Balance format is incorrect.",
//             )
//                 .into_response();
//         }
//     };

//     struct AssetToPrice {
//         original_asset_name: String,
//         ticker_pair_base: String,
//         amount: f64,
//     }

//     let mut assets_to_price = Vec::new();
//     let mut ticker_pairs_to_query = Vec::new();

//     for (asset_name, amount_str) in balance_map {
//         let amount: f64 = amount_str.as_str().unwrap_or("0.0").parse().unwrap_or(0.0);
//         if amount == 0.0 {
//             continue;
//         }

//         let ticker_base = match asset_name.as_str() {
//             "ETH.F" => "XETH",
//             _ => asset_name,
//         };

//         assets_to_price.push(AssetToPrice {
//             original_asset_name: asset_name.clone(),
//             ticker_pair_base: ticker_base.to_string(),
//             amount,
//         });

//         if ticker_base == "ZEUR" {
//             ticker_pairs_to_query.push("ZEURZUSD".to_string());
//         } else if ticker_base == "ZUSD" {
//             ticker_pairs_to_query.push("ZEURZUSD".to_string());
//         } else {
//             ticker_pairs_to_query.push(format!("{}ZEUR", ticker_base));
//             ticker_pairs_to_query.push(format!("{}ZUSD", ticker_base));
//         }
//     }

//     ticker_pairs_to_query.sort();
//     ticker_pairs_to_query.dedup();

//     if assets_to_price.is_empty() {
//         let empty_portfolio = TotalPortfolioValue {
//             total_eur_value: 0.0,
//             total_usd_value: 0.0,
//             assets: vec![],
//         };
//         return (StatusCode::OK, Json(empty_portfolio)).into_response();
//     }

//     let pair_list = ticker_pairs_to_query.join(",");
//     let mut ticker_params = HashMap::new();
//     ticker_params.insert("pair".to_string(), pair_list);

//     let tickers = match client
//         .public_request("/0/public/Ticker", Some(ticker_params))
//         .await
//     {
//         Ok(t) => t,
//         Err(e) => {
//             eprintln!("Ticker prices couldn't be fetched: {}", e);
//             return (
//                 StatusCode::INTERNAL_SERVER_ERROR,
//                 "ERROR: Prices couldn't be fetched.",
//             )
//                 .into_response();
//         }
//     };

//     let mut total_eur: f64 = 0.0;
//     let mut total_usd: f64 = 0.0;
//     let mut asset_details = Vec::new();

//     let eur_usd_rate: f64 = tickers["ZEURZUSD"]["c"][0]
//         .as_str()
//         .unwrap_or("0.0")
//         .parse()
//         .unwrap_or(1.0);

//     for asset in &assets_to_price {
//         let mut asset_eur_value = 0.0;
//         let mut asset_usd_value = 0.0;

//         if asset.ticker_pair_base == "ZEUR" {
//             asset_eur_value = asset.amount;
//             asset_usd_value = asset.amount * eur_usd_rate;
//         } else if asset.ticker_pair_base == "ZUSD" {
//             asset_usd_value = asset.amount;
//             asset_eur_value = asset.amount / eur_usd_rate; // Tersi
//         } else {
//             let eur_pair_name = format!("{}ZEUR", asset.ticker_pair_base);
//             let usd_pair_name = format!("{}ZUSD", asset.ticker_pair_base);

//             let eur_price: f64 = tickers[&eur_pair_name]["c"][0]
//                 .as_str()
//                 .unwrap_or("0.0")
//                 .parse()
//                 .unwrap_or(0.0);
//             let usd_price: f64 = tickers[&usd_pair_name]["c"][0]
//                 .as_str()
//                 .unwrap_or("0.0")
//                 .parse()
//                 .unwrap_or(0.0);

//             asset_eur_value = asset.amount * eur_price;
//             asset_usd_value = asset.amount * usd_price;
//         }

//         total_eur += asset_eur_value;
//         total_usd += asset_usd_value;

//         asset_details.push(AssetPortfolioValue {
//             asset: asset.original_asset_name.clone(), // TODO: Can transform "XETH" to "ETH"
//             amount: asset.amount,
//             eur_value: asset_eur_value,
//             usd_value: asset_usd_value,
//         });
//     }

//     let final_portfolio = TotalPortfolioValue {
//         total_eur_value: total_eur,
//         total_usd_value: total_usd,
//         assets: asset_details,
//     };

//     (StatusCode::OK, Json(final_portfolio)).into_response()
// }
