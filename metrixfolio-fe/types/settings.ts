export enum CollectionType {
  USERS = 'users',
  SETTINGS = 'settings',
  CONFIG = 'config',
  MANUAL_ASSETS = 'manual_assets',
  OPEN_POSITIONS = 'open_positions',
  CLOSED_POSITIONS = 'closed_positions',
}

export type CategoryType = 'ASSET' | 'CASH' | 'CRYPTO' | 'LIABILITY';

export interface Category {
  id: string;
  name: string;
  target_percentage: number;
  type: CategoryType;
}

export type ConnectionType = 'KRAKEN' | 'GOOGLE_SHEET';

export interface Connection {
  id: string;
  type: ConnectionType;
  name: string;
  auto_category_id?: string;
}

export interface UserSettings {
  categories: Category[];
  connections: Connection[];
}
