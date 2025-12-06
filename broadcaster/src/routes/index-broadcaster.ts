import { Hono } from 'hono';

const index_broadcaster = new Hono();

index_broadcaster.post('/trigger', async (c) => {
  const now = new Date();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();

  console.log(`⏰ Scheduler triggered! Time (UTC): ${hour}:${minute}`);

  // LOGIC WILL COME HERE LATER:
  // if (hour === 14 && minute === 30) -> Send US Market Open Message
  // if (hour === 8 && minute === 0) -> Send EU Market Open Message

  return c.json({
    status: 'success',
    time: `${hour}:${minute}`,
    message: 'Timer is triggered successfully!',
  });
});

export default index_broadcaster;
