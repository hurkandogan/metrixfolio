use reqwest::Client;
use serde::Deserialize;
use std::error::Error;
use std::time::Duration;
use tokio::time::sleep;

const IBKR_BASE_URL: &str =
    "https://www.interactivebrokers.com/Universal/servlet/FlexStatementService";

#[derive(Clone)]
pub struct IbkrClient {
    http_client: Client,
    token: String,
    query_id: String,
}

#[derive(Deserialize)]
struct IbkrReferenceResponse {
    #[serde(rename = "Status")]
    status: String,
    #[serde(rename = "ReferenceCode")]
    reference_code: String,
    #[serde(rename = "Url")]
    url: String,
}

impl IbkrClient {
    pub fn new(token: String, query_id: String) -> Self {
        Self {
            http_client: Client::builder()
                .timeout(Duration::from_secs(30))
                .build()
                .unwrap(),
            token,
            query_id,
        }
    }

    pub async fn fetch_portfolio_xml(&self) -> Result<String, String> {
        println!("⏳ IBKR XML Report Request Initiated");

        let url_init = format!(
            "{}.SendRequest?t={}&q={}&v=3",
            IBKR_BASE_URL, self.token, self.query_id
        );

        let res_init = self
            .http_client
            .get(&url_init)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .text()
            .await
            .map_err(|e| e.to_string())?;

        let ref_response: IbkrReferenceResponse =
            quick_xml::de::from_str(&res_init).map_err(|e| format!("XML Parsing Error: {}", e))?;

        if ref_response.status != "Success" {
            return Err(format!("IBKR Reference Request Failed: {}", ref_response.status).into());
        }

        println!(
            "✅ IBKR Reference Code Received: {}",
            ref_response.reference_code
        );

        sleep(Duration::from_secs(2)).await;

        let url_download = format!(
            "{}.GetStatement?t={}&q={}&v=3",
            IBKR_BASE_URL, self.token, ref_response.reference_code
        );

        let xml_data = self
            .http_client
            .get(&url_download)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .text()
            .await
            .map_err(|e| e.to_string())?;

        println!("✅ IBKR XML Report Downloaded Successfully");
        Ok(xml_data)
    }
}
