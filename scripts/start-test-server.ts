import dotenv from 'dotenv';

dotenv.config({ path: '.env.test.local', override: true });

await import('../server.ts');
