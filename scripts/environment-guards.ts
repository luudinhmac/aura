export function hasCliFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

export function isProductionEnvironment(): boolean {
  return process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';
}

export function assertDemoSeedAllowed(): void {
  if (isProductionEnvironment()) {
    throw new Error('Demo seed bị từ chối trong production');
  }
  if (process.env.ALLOW_DEMO_SEED !== 'true' && !hasCliFlag('allow-demo-seed')) {
    throw new Error('Demo seed cần ALLOW_DEMO_SEED=true hoặc --allow-demo-seed');
  }
}

export function assertImportAllowed(): void {
  if (isProductionEnvironment()) {
    throw new Error('Legacy JSON import bị từ chối trong production');
  }
  if (process.env.ALLOW_LEGACY_IMPORT !== 'true' && !hasCliFlag('allow-legacy-import')) {
    throw new Error('Legacy import cần ALLOW_LEGACY_IMPORT=true hoặc --allow-legacy-import');
  }
}
