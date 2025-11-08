use crate::models::settings_model::UserSettings;
use firestore::FirestoreDb;
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Clone)]
pub struct FirestoreClient {
    db: FirestoreDb,
}

impl FirestoreClient {
    pub async fn new() -> Result<Self, String> {
        let project_id = env::var("FIREBASE_PROJECT_ID")
            .map_err(|e| format!("FIREBASE_PROJECT_ID env var error: {}", e))?;

        let db = FirestoreDb::new(&project_id)
            .await
            .map_err(|e| format!("FirestoreDb initialization error: {}", e))?;

        println!("Firestore client initialized for project: {}", project_id);

        Ok(Self { db })
    }

    pub async fn get_settings(&self, user_id: &str) -> Result<UserSettings, String> {
        println!("Getting settings for user: {}", user_id);

        let collection_name = "user_settings";
        let document_id = user_id;

        let object: Option<UserSettings> = self
            .db
            .fluent()
            .select()
            .by_id_in(collection_name)
            .obj()
            .one(document_id)
            .await
            .map_err(|e| format!("Error fetching user settings: {}", e))?;

        match object {
            Some(settings) => {
                println!("User settings found: {:?}", settings);
                Ok(settings)
            }
            None => {
                println!(
                    "No settings found for user: {}. Empty settings are returning.",
                    user_id
                );
                Ok(UserSettings::default())
            }
        }
    }
}
