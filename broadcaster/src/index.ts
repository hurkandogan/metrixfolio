import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import 'dotenv/config';
import { bearerAuth } from 'hono/bearer-auth';
import telegram from './routes/telegram.js';
import index_broadcaster from './routes/index-broadcaster.js';

const app = new Hono();

const API_SECRET = process.env.NOTIFIER_API_SECRET;
const PORT = parseInt(process.env.PORT || '3001'); //TODO: fix local default port 8080 is not working on local env

if (!API_SECRET) {
  throw new Error('NOTIFIER_API_SECRET is not defined in .env file!');
}

app.use('/*', bearerAuth({ token: API_SECRET }));

app.get('/', (c) => {
  return c.text('Bot is running, healthy and secure!');
});

app.route('/api/v1/telegram', telegram);
app.route('/api/v1/scheduler', index_broadcaster);

serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
