export interface WatchlistItem {
  symbol: string;
  name: string;
  exchange: string;
  category: string;
  industry: string;
  currency: string;
  added_at: string;
}

export interface WatchlistComment {
  id: string;
  text: string;
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at?: string;
}
