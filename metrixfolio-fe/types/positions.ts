import { Timestamp } from 'firebase-admin/firestore';
import { CategoryType } from './settings';

export interface Position {
  id: string;
  user_id: string;
  category_id: string;
  category_type: CategoryType;
  currency?: string;
  ticker?: string;
  amount: number;
  total_cost: number;
  cost_currency: string;
  date: Timestamp;
}

export interface ClosedPosition extends Position {
  exit_date: Timestamp;
  exit_price_per_unit: number;
  profit_loss: number;
}

export interface StockInfo {
  symbol: string;
  name: string;
}
