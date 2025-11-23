use serde::Deserialize;
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
pub struct KrakenResponse<T> {
    pub error: Vec<String>,
    pub result: Option<T>,
}

pub type KrakenBalance = HashMap<String, String>;

#[derive(Debug, Deserialize)]
pub struct KrakenTickerInfo {
    pub c: Vec<String>,
}

pub type KrakenTickerResponse = HashMap<String, KrakenTickerInfo>;
