-- Stage 2: make one score record authoritative per personnel and period.
CREATE UNIQUE INDEX "score_records_personnelId_period_key"
ON "score_records"("personnelId", "period");
