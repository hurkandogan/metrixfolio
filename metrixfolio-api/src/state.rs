use crate::clients::{FirestoreClient, GoogleSheetsClient, KrakenClient};
use std::env;

#[derive(Clone)]
pub struct AppState {
    pub kraken_client: KrakenClient,
    pub google_sheets_client: GoogleSheetsClient,
    pub firestore_client: FirestoreClient,
}

impl AppState {
    pub async fn new() -> Result<Self, String> {
        let kraken_api_key =
            env::var("KRAKEN_API_KEY").expect("KRAKEN_API_KEY env could not be found!");
        let kraken_api_secret =
            env::var("KRAKEN_API_SECRET").expect("KRAKEN_API_SECRET env could not be found!");
        let google_sheet_url =
            env::var("GOOGLE_SHEET_CSV_URL").expect("GOOGLE_SHEET_CSV_URL env could not be found!");

        let kraken_client = KrakenClient::new(kraken_api_key, kraken_api_secret);
        let google_sheets_client = GoogleSheetsClient::new(google_sheet_url);
        let firestore_client = FirestoreClient::new().await?;

        Ok(Self {
            kraken_client,
            google_sheets_client,
            firestore_client,
        })
    }
}
