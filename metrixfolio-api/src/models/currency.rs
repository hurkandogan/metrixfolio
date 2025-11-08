use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum Currency {
    USD,
    EUR,
    GBP,
    JPY,
    CHF,
    AUD,
    CAD,
    CNY,
    SEK,
    NZD,
    TRY,
    UNKNOWN,
}

impl Default for Currency {
    fn default() -> Self {
        Currency::USD
    }
}

impl From<&str> for Currency {
    fn from(s: &str) -> Self {
        match s.to_uppercase().as_str() {
            "USD" => Currency::USD,
            "EUR" => Currency::EUR,
            "GBP" => Currency::GBP,
            "JPY" => Currency::JPY,
            "CHF" => Currency::CHF,
            "AUD" => Currency::AUD,
            "CAD" => Currency::CAD,
            "CNY" => Currency::CNY,
            "SEK" => Currency::SEK,
            "NZD" => Currency::NZD,
            "TRY" => Currency::TRY,
            _ => Currency::UNKNOWN,
        }
    }
}
