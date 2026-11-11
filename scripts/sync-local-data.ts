import fs from 'fs';
import path from 'path';
import { DEFAULT_IDOLS, DEFAULT_DEPARTMENTS } from '../server/data/defaultData.ts';

async function main() {
  const dbJsonPath = path.join(process.cwd(), 'server', 'data', 'db.json');
  console.log('🔄 Đang cập nhật server/data/db.json...');
  const raw = fs.readFileSync(dbJsonPath, 'utf-8');
  const db = JSON.parse(raw);

  db.idols = DEFAULT_IDOLS;
  db.departments = DEFAULT_DEPARTMENTS;

  fs.writeFileSync(dbJsonPath, JSON.stringify(db, null, 2), 'utf-8');
  console.log('✅ Đã cập nhật xong db.json!');
  console.log('💡 Để đồng bộ vào PostgreSQL, hãy chạy script: pnpm exec tsx scripts/migrate-json-to-pg-v2.ts');
}

main().catch(console.error);
