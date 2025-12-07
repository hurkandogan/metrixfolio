import { Hono } from 'hono';
import { sendTelegramMessage } from '../services/telegram.js';
import { MarketDataService } from '../services/marketDataServices.js';
import marketsData from '../data/market.json' with { type: 'json' };

type MarketIndex = { symbol: string; label: string, currency?: string };
type MarketConfig = {
  name: string;
  timezone: string;
  open_hour: number;
  open_minute: number;
  close_hour: number;
  close_minute: number;
  holidays: string[];
  indices: MarketIndex[];
};

const markets = marketsData as Record<string, MarketConfig>;
const scheduler = new Hono();
const marketService = new MarketDataService();

scheduler.post('/trigger', async (c) => {
  const now = new Date();
  const results: string[] = [];

  console.log(`⏰ Tick: ${now.toISOString()}`);

  for (const [region, config] of Object.entries(markets)) {
    const localTimeStr = now.toLocaleString('en-US', {
      timeZone: config.timezone,
    });
    const localDate = new Date(localTimeStr);

    const day = localDate.getDay();
    const hour = localDate.getHours();
    const minute = localDate.getMinutes();
    const dateString = localDate.toISOString().split('T')[0];

    console.log(`🌍 ${region}: ${hour}:${minute} (Day: ${day})`);

    if (day === 0 || day === 6) continue;
    if (config.holidays.includes(dateString)) continue;

    if (
      hour === config.open_hour &&
      minute >= config.open_minute &&
      minute < config.open_minute + 5
    ) {
      console.log(`🚀 ${region} Market Opening detected! Fetching prices...`);

      const symbols = config.indices.map((i) => i.symbol);

      const prices = await marketService.getPrices(symbols);

      const msg = generateMessage(
        region,
        config.name,
        'OPEN',
        config.indices,
        prices
      );

      await sendTelegramMessage(msg);
      results.push(`${region} OPEN sent`);
    }

    if (
      hour === config.close_hour &&
      minute >= config.close_minute &&
      minute < config.close_minute + 5
    ) {
      console.log(`🏁 ${region} Market Closing detected!`);

      const symbols = config.indices.map((i) => i.symbol);
      const prices = await marketService.getPrices(symbols);
      const msg = generateMessage(
        region,
        config.name,
        'CLOSE',
        config.indices,
        prices
      );

      await sendTelegramMessage(msg);
      results.push(`${region} CLOSE sent`);
    }
  }

  return c.json({
    status: 'success',
    actions: results.length > 0 ? results : 'No market events',
  });
});

function generateMessage(
  region: string,
  marketName: string,
  status: 'OPEN' | 'CLOSE',
  indices: MarketIndex[],
  prices: Record<string, number>
): string {
  const flag = region === 'US' ? '🇺🇸' : region === 'EU' ? '🇪🇺' : '🌍';
  const statusIcon = status === 'OPEN' ? '🔔' : '🏁';
  const statusText = status === 'OPEN' ? 'Opened' : 'Closed';

  let message = `${statusIcon} ${flag} *${marketName} ${statusText}*\n\n`;

  indices.forEach((idx) => {
    const price = prices[idx.symbol];

    if (price) {
      // TODO: add pnl calculation with colored arrows
      message += `▫️ *${idx.label}:* ${price.toFixed(2)}${idx.currency}\n`;
    }  else {
      message += `▫️ *${idx.currency} ${idx.label}:* (undefined)\n`;
    }
  });

  return message;
}

export default scheduler;
