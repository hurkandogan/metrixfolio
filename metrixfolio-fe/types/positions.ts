import { Timestamp } from 'firebase-admin/firestore';
import { CategoryType } from './settings';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  amount: number;
  currency: string;
  category_id: string;
  source: string;
  avg_cost: number;
  multiplier: number;
  current_price: number;
  unrealized_pnl: number;
  market_value?: number;

  original_currency?: string;
  original_avg_cost?: number;
  original_current_price?: number;
}
