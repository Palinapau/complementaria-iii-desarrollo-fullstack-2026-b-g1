import { existsSync } from 'node:fs';
import path from 'node:path';
import { createApp } from './app.js';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('Falta JWT_SECRET. Ejemplo: JWT_SECRET=cambia-esto npm start');
  process.exit(1);
}

const staticDir = process.env.STATIC_DIR ? path.resolve(process.env.STATIC_DIR) : undefined;
const app = createApp({
  jwtSecret,
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(','),
  staticDir: staticDir && existsSync(staticDir) ? staticDir : undefined,
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`API lista en http://localhost:${port}`));
