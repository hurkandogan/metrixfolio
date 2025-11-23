use crate::models::kraken::KrakenResponse;
use axum::body;
use base64::{Engine as _, engine::general_purpose::STANDARD as base64_standard};
use hmac::{Hmac, Mac};
use reqwest::Client;
use serde::de::DeserializeOwned;
use sha2::{Digest, Sha256, Sha512};
use std::{collections::HashMap, time::UNIX_EPOCH};

type HmacSha512 = Hmac<Sha512>;

pub const KRAKEN_API_URL: &str = "https://api.kraken.com";

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

    fn sign(&self, path: &str, nonce: &str, post_data: &str) -> Result<String, String> {
        let decoded_secret = base64_standard
            .decode(&self.api_secret)
            .map_err(|e| format!("Base64 decode error: {}", e))?;

        let mut sha256 = Sha256::new();
        sha256.update(nonce.as_bytes());
        sha256.update(post_data.as_bytes());
        let hash_digest = sha256.finalize();

        let mut mac = HmacSha512::new_from_slice(&decoded_secret)
            .map_err(|e| format!("HMAC initialization error: {}", e))?;

        let mut message = path.as_bytes().to_vec();
        message.extend_from_slice(&hash_digest);

        mac.update(&message);

        Ok(base64_standard.encode(mac.finalize().into_bytes()))
    }

    pub async fn private_request<T: DeserializeOwned>(
        &self,
        endpoint: &str,
        mut params: HashMap<String, String>,
    ) -> Result<T, String> {
        let nonce = std::time::SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis()
            .to_string();

        params.insert("nonce".to_string(), nonce.clone());

        let post_data = params
            .iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect::<Vec<_>>()
            .join("&");

        let signature = self.sign(endpoint, &nonce, &post_data)?;
        let url = format!("{}{}", KRAKEN_API_URL, endpoint);

        let res = self
            .http_client
            .post(&url)
            .header("API-Key", &self.api_key)
            .header("API-Sign", &signature)
            .form(&params)
            .send()
            .await
            .map_err(|e| format!("API request cannot be done!: {}", e))?;

        let body_text = res
            .text()
            .await
            .map_err(|e| format!("Failed to read response text: {}", e))?;

        let kraken_res: KrakenResponse<T> = serde_json::from_str(&body_text).map_err(|e| {
            format!(
                "Failed to parse response ERROR: {} | Body: {}",
                e, body_text
            )
        })?;

        if !kraken_res.error.is_empty() {
            return Err(format!("Kraken API Error: {:?}", kraken_res.error));
        }

        kraken_res
            .result
            .ok_or_else(|| "No result in response".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::kraken::KrakenBalance;
    use std::env;

    #[tokio::test]
    async fn test_kraken_balance() {
        dotenv::dotenv().ok();

        let api_key = env::var("KRAKEN_API_KEY").expect("KRAKEN_API_KEY yok");
        let api_secret = env::var("KRAKEN_API_SECRET").expect("KRAKEN_API_SECRET yok");

        let client = KrakenClient::new(api_key, api_secret);

        let response = client
            .private_request::<KrakenBalance>("/0/private/Balance", HashMap::new())
            .await;

        match response {
            Ok(balance) => {
                println!("✅ Successful! Here is your balance:");
                println!("{:#?}", balance);
            }
            Err(e) => {
                println!("❌ AN ERROR OCCURRED:");
                println!("{}", e);
                eprintln!("Kraken API request failed: {}", e);
            }
        }
    }
}
