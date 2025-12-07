import 'dotenv/config';

export class MarketDataService {
  private backendUrl: string;
  private apiSecret: string;

  constructor() {
    this.backendUrl = process.env.RUST_API_URL || 'http://localhost:8080';
    this.apiSecret = process.env.NOTIFIER_API_SECRET || '';
  }

  async getPrices(symbols: string[]): Promise<Record<string, number>> {
    console.log(`🌍 Asking Rust Backend for: ${symbols.join(', ')}`);

    try {
      const response = await fetch(`${this.backendUrl}/api/v1/market/prices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiSecret}`,
        },
        body: JSON.stringify({ symbols }),
      });

      if (!response.ok) {
        throw new Error(`Backend Error: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Market Data Fetch Error:', error);
      return {};
    }
  }
}
