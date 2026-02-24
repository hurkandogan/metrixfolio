import 'dotenv/config';

const TLG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TLG_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

export const sendTelegramMessage = async (text: string) => {
  if (!TLG_TOKEN || !TLG_CHANNEL_ID) {
    console.error('❌ Telegram Token or Channel ID missing!');
    return { success: false, error: 'Config missing' };
  }

  try {
    const url = `https://api.telegram.org/bot${TLG_TOKEN}/sendMessage`;

    console.log(`📤 Telegram'a gönderiliyor: ${text}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TLG_CHANNEL_ID,
        text: text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error('Telegram API Error:', result);
      return { success: false, error: result.description };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Network Errors:', err);
    return { success: false, error: err.message };
  }
};
