use csv::ReaderBuilder;
use reqwest::Client;
use serde_json::Value;
use std::collections::HashMap;

#[derive(Clone)]
pub struct GoogleSheetsClient {
    http_client: Client,
    sheet_url: String,
}

impl GoogleSheetsClient {
    pub fn new(csv_url: String) -> Self {
        Self {
            http_client: Client::new(),
            sheet_url: csv_url,
        }
    }

    pub async fn fetch_stock_data(&self) -> Result<Vec<HashMap<String, Value>>, String> {
        println!("Google Sheet CSV test handler called.");

        let csv_text = match self.http_client.get(&self.sheet_url).send().await {
            Ok(response) => match response.text().await {
                Ok(text) => text,
                Err(e) => return Err(format!("Google Sheet response error: {}", e)),
            },
            Err(e) => return Err(format!("Google Sheet connection error: {}", e)),
        };

        let mut results: Vec<HashMap<String, Value>> = Vec::new();

        let mut reader = ReaderBuilder::new()
            .flexible(true)
            .from_reader(csv_text.as_bytes());

        let headers = match reader.headers() {
            Ok(h) => h.clone(),
            Err(e) => return Err(format!("CSV headers could not be read: {}", e)),
        };

        for result in reader.records() {
            let record = match result {
                Ok(r) => r,
                Err(_) => continue,
            };

            let map: HashMap<String, Value> = headers
                .iter()
                .zip(record.iter())
                .map(|(header, value_str)| {
                    let json_value = match value_str {
                        "N/A" => Value::Null,
                        "#N/A" => Value::Null,
                        "" => Value::Null,
                        _ => Value::String(value_str.to_string()),
                    };
                    (header.to_string(), json_value)
                })
                .collect();

            results.push(map);
        }
        println!("Google Sheets data fetched successfully.");
        Ok(results)
    }
}
