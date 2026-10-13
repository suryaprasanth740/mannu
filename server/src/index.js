import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import { User } from './models/index.js';

async function main() {
  await connectDB();

  // On a fresh hosted database (e.g. a new Render + Atlas deploy), load the demo farms once.
  if (process.env.SEED_DEMO_DATA === 'true' && !(await User.exists({}))) {
    console.log('Empty database: loading demo data (SEED_DEMO_DATA=true)');
    const { seed } = await import('./seed/seed.js');
    await seed();
  }

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Mannu API listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
