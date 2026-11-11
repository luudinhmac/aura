ALTER TABLE "revenue_transactions" DROP CONSTRAINT IF EXISTS "revenue_transactions_personnelId_fkey";
ALTER TABLE "revenue_transactions"
  ADD CONSTRAINT "revenue_transactions_personnelId_fkey"
  FOREIGN KEY ("personnelId") REFERENCES "personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
