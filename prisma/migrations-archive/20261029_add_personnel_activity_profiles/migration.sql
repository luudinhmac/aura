-- CreateTable
CREATE TABLE "personnel_activity_types" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnel_activity_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personnel_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "personnelId" INTEGER NOT NULL,
    "activityTypeId" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnel_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "personnel_activity_types_code_key" ON "personnel_activity_types"("code");
CREATE INDEX "personnel_activity_types_isActive_displayOrder_idx" ON "personnel_activity_types"("isActive", "displayOrder");
CREATE UNIQUE INDEX "personnel_activities_personnelId_activityTypeId_key" ON "personnel_activities"("personnelId", "activityTypeId");
CREATE INDEX "personnel_activities_personnelId_isPrimary_idx" ON "personnel_activities"("personnelId", "isPrimary");
CREATE INDEX "personnel_activities_activityTypeId_idx" ON "personnel_activities"("activityTypeId");
CREATE UNIQUE INDEX "personnel_activities_one_primary_per_personnel_idx"
    ON "personnel_activities"("personnelId")
    WHERE "isPrimary" = true;

-- AddForeignKey
ALTER TABLE "personnel_activities" ADD CONSTRAINT "personnel_activities_personnelId_fkey"
    FOREIGN KEY ("personnelId") REFERENCES "personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "personnel_activities" ADD CONSTRAINT "personnel_activities_activityTypeId_fkey"
    FOREIGN KEY ("activityTypeId") REFERENCES "personnel_activity_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
