// src/utils/market_utils.rs

/// Borsaya göre Yahoo Finance sonekini (suffix) bulur.
/// Bu fonksiyonu ileride eToro veya diğer kaynaklar için de kullanabilirsin.
pub fn get_yahoo_suffix(exchange: &str) -> &str {
    match exchange {
        // Germany (Xetra, Frankfurt)
        "IBIS" | "IBIS2" | "FWB" | "GER" | "XETRA" => ".DE",

        // United Kingdom (London)
        "LSE" | "LSEETF" | "UK" => ".L",

        // Europe (Euronext Amsterdam, Paris etc.)
        "AEB" | "BVME" | "AMS" => ".AS", // Amsterdam
        "PA" | "SBF" | "PAR" => ".PA",   // Paris
        "MI" | "MIL" => ".MI",           // Milano
        "BM" | "XMAD" => ".MC",          // Madrid

        // Asia / Pacific
        "HKSE" | "HK" => ".HK",        // Hong Kong
        "TSE" | "TSEJ" | "JP" => ".T", // Tokyo
        "ASX" => ".AX",                // Australia

        // Switzerland
        "EBS" | "SW" => ".SW",

        // Canada
        "TSE_CA" | "TO" => ".TO", // Toronto

        // Default (USA and others)
        _ => "",
    }
}

pub fn normalize_symbol(symbol: &str, underlying: &str, exchange: &str) -> String {
    let suffix = get_yahoo_suffix(exchange);

    if !suffix.is_empty() {
        let base = if !underlying.is_empty() {
            underlying
        } else {
            symbol
        };
        format!("{}{}", base, suffix)
    } else {
        // If it's a US stock (no suffix), leave it as is
        symbol.to_string()
    }
}

pub fn sanitize_id(input: &str) -> String {
    input
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '_' })
        .collect()
}
