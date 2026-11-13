import { createApp } from './app.js';
import { config } from './config.js';
import { ensureAdminUser } from './services/auth.service.js';

await ensureAdminUser();

createApp().listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
