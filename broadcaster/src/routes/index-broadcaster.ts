import { Hono } from 'hono';
import { sendTelegramMessage } from '../services/telegram.js';
import markets from '../data/market.json' with { type: 'json' };

const scheduler = new Hono();

scheduler.post('/trigger', async (c) => {
  const now = new Date();

  console.log(`⏰ Tick: ${now.toISOString()}`);
  const results = [];

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
      await sendTelegramMessage(`🔔 *${config.name} (${region})* opened! 📈`);
      results.push(`${region} OPEN sent`);
    }

    if (
      hour === config.close_hour &&
      minute >= config.close_minute &&
      minute < config.close_minute + 5
    ) {
      await sendTelegramMessage(`🏁 *${config.name} (${region})* closed.`);
      results.push(`${region} CLOSE sent`);
    }
  }

  sendTelegramMessage(`🏁 Trigger is working!.`);

  return c.json({
    status: 'success',
    actions: results.length > 0 ? results : 'No market events',
  });
});

export default scheduler;
