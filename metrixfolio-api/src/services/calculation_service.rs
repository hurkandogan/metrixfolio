use crate::models::Asset;
use crate::models::portfolio_view::{CategoryAnalysis, PortfolioSummary};
use crate::models::settings_model::PortfolioConfig;
use std::collections::HashMap;

// Yardımcı: String -> f64 (Hata verirse 0.0)
fn parse_f64(val: &str) -> f64 {
    val.parse::<f64>().unwrap_or(0.0)
}

pub fn calculate_portfolio(assets: Vec<Asset>, config: PortfolioConfig) -> PortfolioSummary {
    let mut total_value = 0.0;
    let mut total_cost = 0.0;
    let mut category_values: HashMap<String, f64> = HashMap::new();

    // 1. Tüm varlıkları gez ve topla
    for asset in &assets {
        let amount = parse_f64(&asset.amount);
        let price = parse_f64(&asset.current_price);

        // Kraken'de cost bazen 0 geliyor, onu ihmal etmemiz gerekebilir
        let cost_basis = parse_f64(&asset.cost_basis_money);

        // --- DÖVİZ ÇEVİRİSİ (TODO) ---
        // Şimdilik her şeyi 1.0 kabul ediyoruz.
        // İleride buraya (if asset.currency != base_currency) mantığı gelecek.
        let rate = 1.0;
        // -----------------------------

        // Değer Hesabı
        // Eğer fiyat 0 ise (Kraken henüz fiyat çekmediyse), maliyeti değer gibi varsayabiliriz
        // veya 0 kabul edebiliriz. Şimdilik 0 olsun.
        let market_value = amount * price;

        let value_in_base = market_value * rate;
        let cost_in_base = cost_basis * rate;

        total_value += value_in_base;
        total_cost += cost_in_base;

        // Kategoriye ekle
        *category_values
            .entry(asset.category_id.clone())
            .or_insert(0.0) += value_in_base;
    }

    // 2. Kategorileri Analiz Et
    let mut categories_view = Vec::new();

    for cat_conf in config.categories {
        let cat_val = *category_values.get(&cat_conf.id).unwrap_or(&0.0);

        let actual_pct = if total_value > 0.0 {
            (cat_val / total_value) * 100.0
        } else {
            0.0
        };

        categories_view.push(CategoryAnalysis {
            id: cat_conf.id.clone(),
            name: cat_conf.name.clone(),
            value: cat_val,
            actual_percentage: actual_pct,
            target_percentage: cat_conf.target_percentage, // Settings'den gelen hedef
        });
    }

    // Uncategorized varsa ekle (Grafikte görünsün diye)
    if let Some(uncat_val) = category_values.get("uncategorized") {
        if *uncat_val > 0.0 {
            let actual_pct = (*uncat_val / total_value) * 100.0;
            categories_view.push(CategoryAnalysis {
                id: "uncategorized".to_string(),
                name: "Uncategorized".to_string(),
                value: *uncat_val,
                actual_percentage: actual_pct,
                target_percentage: 0.0,
            });
        }
    }

    // 3. Özet Çıkar
    let total_pnl = total_value - total_cost;
    let pnl_percentage = if total_cost > 0.0 {
        (total_pnl / total_cost) * 100.0
    } else {
        0.0
    };

    PortfolioSummary {
        total_value,
        total_cost,
        total_pnl,
        pnl_percentage,
        base_currency: config.base_currency,
        categories: categories_view,
    }
}
