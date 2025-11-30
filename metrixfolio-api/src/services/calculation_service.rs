use crate::models::{
    Asset,
    portfolio_view::{CategoryAnalysis, PortfolioSummary},
    settings_model::PortfolioConfig,
    transaction::Transaction,
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
) -> PortfolioSummary {
    let net_invested_map = transaction_service::calculate_net_investment(&transactions);
    let mut total_value = 0.0;
    let mut category_values: HashMap<String, f64> = HashMap::new();
    let mut total_invested_base = 0.0;

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

        // TODO: Currency conversion
        // For now accept 1:1 rate
        // In the future, add logic here (if asset.currency != base_currency).
        let rate = 1.0;
        // -----------------------------

        let multiplier = parse_f64(&asset.multiplier);
        let multiplier = if multiplier == 0.0 { 1.0 } else { multiplier };
        // Value Calculation
        // If price is 0 (Kraken hasn't fetched price yet), we can assume cost as value
        // or accept 0. For now, 0.
        let market_value = amount * price * multiplier;

        let value_in_base = market_value * rate;

        total_value += value_in_base;

        let effective_category_id = if valid_category_ids.contains(&asset.category_id) {
            asset.category_id.clone()
        } else {
            "uncategorized".to_string() // Silinmişse buraya at
        };

        *category_values.entry(effective_category_id).or_insert(0.0) += value_in_base;
    }

    for (currency, amount) in net_invested_map {
        // TODO: Currency conversion
        let rate = 1.0;
        total_invested_base += amount * rate;
    }

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
            target_percentage: cat_conf.target_percentage,
        });
    }

    // Add uncategorized if exists (for chart visibility)
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

    let real_pnl = total_value - total_invested_base;
    let real_pnl_pct = if total_invested_base > 0.0 {
        (real_pnl / total_invested_base) * 100.0
    } else {
        0.0
    };

    PortfolioSummary {
        total_value,
        total_cost: total_invested_base,
        total_pnl: real_pnl,
        pnl_percentage: real_pnl_pct,
        base_currency: config.base_currency,
        categories: categories_view,
    }
}
