CREATE TABLE "operational_metrics" (
    "id" UUID NOT NULL,
    "personnelId" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "metricCode" TEXT NOT NULL,
    "actualValue" DECIMAL(15,2) NOT NULL,
    "source" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_metrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "operational_metrics_personnelId_period_metricCode_key"
    ON "operational_metrics"("personnelId", "period", "metricCode");

CREATE INDEX "operational_metrics_personnelId_period_idx"
    ON "operational_metrics"("personnelId", "period");

ALTER TABLE "operational_metrics"
    ADD CONSTRAINT "operational_metrics_personnelId_fkey"
    FOREIGN KEY ("personnelId") REFERENCES "personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
