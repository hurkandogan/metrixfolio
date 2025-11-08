export interface Category {
  id: string;
  name: string;
  target_percentage: number;
}

export interface ManualAsset {
  id: string;
  ticker: string;
  amount: number;
  category_id: string;
}

export interface StockInfo {
  symbol: string;
  name: string;
}

export interface UserSettings {
  categories: Category[];
  // connections: Connection[];
  manual_assets: ManualAsset[];
}
