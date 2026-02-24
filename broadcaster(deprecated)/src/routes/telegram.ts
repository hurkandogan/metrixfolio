import { Hono } from 'hono';
import { sendTelegramMessage } from '../services/telegram.js';

const telegram = new Hono();

const TLG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TLG_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

telegram.post('/send-message', async (c) => {
  try {
    const body = await c.req.json();
    const message = body.text;

    console.log(`📤 Message is sending: ${message}`);

    if (!message) return c.json({ error: 'Message cannot be empty!' }, 400);

    const result = await sendTelegramMessage(message);

    if (!result.success) {
      console.error('Telegram error:', result);
      return c.json({ success: false, error: result.error }, 500);
    }

    return c.json({ success: true, message: 'Message sent to channel!' });
  } catch (err) {
    console.error('Error sending message to Telegram:', err);
  }
});

export default telegram;
