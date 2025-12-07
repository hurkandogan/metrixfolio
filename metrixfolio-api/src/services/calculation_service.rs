use crate::models::{
    Asset,
    portfolio_view::{CategoryAnalysis, PortfolioSummary},
    settings_model::PortfolioConfig,
    transaction::{Transaction, TransactionType}, // TransactionType enum'ı lazım
};
use crate::services::transaction_service;
use std::collections::HashMap;

fn parse_f64(val: &str) -> f64 {
    val.parse::<f64>().unwrap_or(0.0)
}

pub fn calculate_portfolio(
    assets: Vec<Asset>,
    transactions: Vec<Transaction>,
    config: PortfolioConfig,
    current_prices: &HashMap<String, f64>,
    rates: &HashMap<String, f64>,
) -> PortfolioSummary {
    let get_usd_rate = |currency: &str| -> f64 {
        if currency == "USD" {
            return 1.0;
        }

        let usd_to_eur = *rates.get("USD").unwrap_or(&1.0);
        if usd_to_eur == 0.0 {
            return 0.0;
        }
        let asset_to_eur = if currency == "EUR" {
            1.0
        } else {
            *rates.get(currency).unwrap_or(&0.0)
        };

        asset_to_eur / usd_to_eur
    };

    // ---------------------------------------------------------

    let mut total_portfolio_value = 0.0;
    let mut category_values: HashMap<String, f64> = HashMap::new();

    let valid_category_ids: std::collections::HashSet<String> =
        config.categories.iter().map(|c| c.id.clone()).collect();

    for asset in &assets {
        let amount = parse_f64(&asset.amount);
        let live_price = current_prices.get(&asset.symbol).copied();

        let price = if let Some(p) = live_price {
            p
        } else {
            parse_f64(&asset.current_price)
        };

        let multiplier = parse_f64(&asset.multiplier);
        let multiplier = if multiplier == 0.0 { 1.0 } else { multiplier };

        let market_value_native = amount * price * multiplier;

        let usd_rate = get_usd_rate(&asset.currency);
        let value_in_usd = market_value_native * usd_rate;

        total_portfolio_value += value_in_usd;

        let effective_category_id = if valid_category_ids.contains(&asset.category_id) {
            asset.category_id.clone()
        } else {
            "uncategorized".to_string()
        };

        *category_values.entry(effective_category_id).or_insert(0.0) += value_in_usd;
    }

    // Transactionları önce para birimine göre grupla, sonra USD'ye çevir.
    let net_invested_map = transaction_service::calculate_net_investment(&transactions);
    let mut total_invested_usd = 0.0;

    for (currency, amount) in net_invested_map {
        let usd_rate = get_usd_rate(&currency);
        total_invested_usd += amount * usd_rate;
    }

    // 4. KATEGORİ ANALİZİ VE SUNUM
    let mut categories_view = Vec::new();

    for cat_conf in config.categories {
        let cat_val = *category_values.get(&cat_conf.id).unwrap_or(&0.0);

        let actual_pct = if total_portfolio_value > 0.0 {
            (cat_val / total_portfolio_value) * 100.0
        } else {
            0.0
        };

        categories_view.push(CategoryAnalysis {
            id: cat_conf.id.clone(),
            name: cat_conf.name.clone(),
            value: cat_val, // Artık USD
            actual_percentage: actual_pct,
            target_percentage: cat_conf.target_percentage,
        });
    }

    if let Some(uncat_val) = category_values.get("uncategorized") {
        if *uncat_val > 0.01 {
            let actual_pct = (*uncat_val / total_portfolio_value) * 100.0;
            categories_view.push(CategoryAnalysis {
                id: "uncategorized".to_string(),
                name: "Uncategorized".to_string(),
                value: *uncat_val,
                actual_percentage: actual_pct,
                target_percentage: 0.0,
            });
        }
    }

    let total_pnl = total_portfolio_value - total_invested_usd;
    let pnl_percentage = if total_invested_usd > 0.0 {
        (total_pnl / total_invested_usd) * 100.0
    } else {
        0.0
    };

    PortfolioSummary {
        total_value: total_portfolio_value,
        total_cost: total_invested_usd,
        total_pnl,
        pnl_percentage,
        base_currency: "USD".to_string(),
        categories: categories_view,
    }
}
