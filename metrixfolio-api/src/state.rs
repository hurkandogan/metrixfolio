use crate::clients::{
    FirestoreClient, GoogleSheetsClient, IbkrClient, KrakenClient,
    twelve_data_client::TwelveDataClient, yahoo_client::YahooClient,
};
use axum::extract::FromRef;
use firebase_auth::FirebaseAuth;
use std::env;

#[derive(Clone)]
pub struct AppState {
    pub kraken_client: KrakenClient,
    pub google_sheets_client: GoogleSheetsClient,
    pub firestore_client: FirestoreClient,
    pub firebase_auth: FirebaseAuth,
    pub ibkr_client: IbkrClient,
    pub twelve_data_client: TwelveDataClient,
    pub yahoo_client: YahooClient,
}

impl FromRef<AppState> for FirebaseAuth {
    fn from_ref(state: &AppState) -> Self {
        state.firebase_auth.clone()
    }
}

impl AppState {
    pub async fn new() -> Result<Self, String> {
        // variables
        let kraken_api_key =
            env::var("KRAKEN_API_KEY").expect("KRAKEN_API_KEY env could not be found!");
        let kraken_api_secret =
            env::var("KRAKEN_API_SECRET").expect("KRAKEN_API_SECRET env could not be found!");
        let google_sheet_url =
            env::var("GOOGLE_SHEET_CSV_URL").expect("GOOGLE_SHEET_CSV_URL env could not be found!");
        let ibkr_api_key = env::var("IBKR_TOKEN").expect("IBKR_TOKEN env could not be found!");
        let ibkr_api_secret =
            env::var("IBKR_QUERY_ID").expect("IBKR_QUERY_ID env could not be found!");
        let project_id =
            env::var("FIREBASE_PROJECT_ID").expect("FIREBASE_PROJECT_ID env could not be found!");
        let twelve_data_api_key =
            env::var("TWELVE_DATA_API_KEY").expect("TWELVE_DATA_API_KEY env could not be found!");

        let kraken_client = KrakenClient::new(kraken_api_key, kraken_api_secret);
        let ibkr_client = IbkrClient::new(ibkr_api_key, ibkr_api_secret);
        let google_sheets_client = GoogleSheetsClient::new(google_sheet_url);
        let firestore_client = FirestoreClient::new().await?;

        let firebase_auth = FirebaseAuth::new(&project_id).await;
        let twelve_data_client = TwelveDataClient::new(twelve_data_api_key);
        let yahoo_client = YahooClient::new();

        Ok(Self {
            kraken_client,
            ibkr_client,
            google_sheets_client,
            firestore_client,
            firebase_auth,
            twelve_data_client,
            yahoo_client,
        })
    }
}
