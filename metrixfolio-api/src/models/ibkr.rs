use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename = "FlexStatementResponse")]
pub struct IbkrReferenceResponse {
    #[serde(rename = "Status")]
    pub status: String,

    #[serde(rename = "ReferenceCode")]
    pub reference_code: String,

    #[serde(rename = "Url")]
    pub url: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename = "FlexQueryResponse")]
pub struct FlexQueryResponse {
    #[serde(rename = "FlexStatements")]
    pub flex_statements: FlexStatements,
}

#[derive(Debug, Deserialize)]
pub struct FlexStatements {
    #[serde(rename = "FlexStatement")]
    pub statement: FlexStatement,
}

#[derive(Debug, Deserialize)]
pub struct FlexStatement {
    #[serde(rename = "@accountId")]
    pub account_id: String,

    #[serde(rename = "AccountInformation")]
    pub account_info: AccountInformation,

    #[serde(rename = "CashReport")]
    pub cash_report: CashReport,

    #[serde(rename = "OpenPositions")]
    pub open_positions: OpenPositions,

    #[serde(rename = "ConversionRates")]
    pub conversion_rates: ConversionRates,
}

#[derive(Debug, Deserialize)]
pub struct AccountInformation {
    #[serde(rename = "@currency")]
    pub currency: String,
}

#[derive(Debug, Deserialize)]
pub struct CashReport {
    #[serde(rename = "CashReportCurrency", default)]
    pub currencies: Vec<CashReportCurrency>,
}

#[derive(Debug, Deserialize)]
pub struct CashReportCurrency {
    #[serde(rename = "@currency")]
    pub currency: String,

    #[serde(rename = "@endingCash")]
    pub ending_cash: String,

    #[serde(rename = "@endingSettledCash")]
    pub ending_settled_cash: String,

    #[serde(rename = "@depositsYTD")]
    pub deposits_ytd: String,

    #[serde(rename = "@withdrawalsYTD")]
    pub withdrawals_ytd: String,

    #[serde(rename = "@netTradesSalesYTD")]
    pub net_trades_sales_ytd: String,

    #[serde(rename = "@dividendsYTD")]
    pub dividends_ytd: String,
}

#[derive(Debug, Deserialize)]
pub struct OpenPositions {
    #[serde(rename = "OpenPosition", default)]
    pub position: Vec<OpenPosition>,
}

#[derive(Debug, Deserialize)]
pub struct OpenPosition {
    #[serde(rename = "@symbol")]
    pub symbol: String,

    #[serde(rename = "@currency")]
    pub currency: String,

    #[serde(rename = "@assetCategory")]
    pub asset_category: String,

    #[serde(rename = "@position")]
    pub quantity: String,

    #[serde(rename = "@multiplier")]
    pub multiplier: f64,

    #[serde(rename = "@markPrice")]
    pub mark_price: String,

    #[serde(rename = "@costBasisPrice")]
    pub cost_basis_price: String,

    #[serde(rename = "@costBasisMoney")]
    pub cost_basis_money: String,

    #[serde(rename = "@fifoPnlUnrealized")]
    pub unrealized_pnl: String,

    #[serde(rename = "@description")]
    pub description: String,

    #[serde(rename = "@underlyingSymbol")]
    pub underlying_symbol: String,

    #[serde(rename = "@listingExchange")]
    pub listing_exchange: String,
}

#[derive(Debug, Deserialize)]
pub struct ConversionRates {
    #[serde(rename = "ConversionRate", default)]
    pub rates: Vec<ConversionRate>,
}

#[derive(Debug, Deserialize)]
pub struct ConversionRate {
    #[serde(rename = "@fromCurrency")]
    pub from_currency: String,

    #[serde(rename = "@toCurrency")]
    pub to_currency: String,

    #[serde(rename = "@rate")]
    pub rate: String,
}
