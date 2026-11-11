import { pgStore } from '../server/db/pgStore.ts';
import { assertDemoSeedAllowed } from './environment-guards.ts';

assertDemoSeedAllowed();
await pgStore.seedInitialExpenses();
console.log('Demo finance seed completed.');
