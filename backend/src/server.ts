import 'dotenv/config';
import { createPool } from './db/pool.js';
import { initDatabase } from './db/seed.js';
import { buildApp } from './http/app.js';

async function main() {
  const pool = createPool();
  await initDatabase(pool);
  const app = buildApp(pool);
  const port = Number(process.env.PORT ?? 3001);
  app.listen(port, () => {
    console.log(`Veterinario API escuchando en puerto ${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
