import 'dotenv/config';

export type MarketPriceData = {
  price: number;
  changePercent: number;
};

export class MarketDataService {
  private backendUrl: string;
  private apiSecret: string;

  constructor() {
    this.backendUrl = process.env.RUST_API_URL || 'http://localhost:8080';
    this.apiSecret = process.env.NOTIFIER_API_SECRET || '';
  }

  async getPrices(
    symbols: string[],
    waitForOpen: boolean = false
  ): Promise<Record<string, MarketPriceData>> {
    console.log(`🌍 Asking Rust Backend for: ${symbols.join(', ')}`);

    try {
      const response = await fetch(
        `${this.backendUrl}/api/v1/market/prices/detailed`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiSecret}`,
          },
          body: JSON.stringify({ symbols, wait_for_open: waitForOpen }),
        }
      );

      if (!response.ok) {
        throw new Error(`Backend Error: ${response.statusText}`);
      }

      const data = (await response.json()) as Record<string, MarketPriceData>;
      return data;
    } catch (error) {
      console.error('❌ Market Data Fetch Error:', error);
      return {};
    }
  }
}
