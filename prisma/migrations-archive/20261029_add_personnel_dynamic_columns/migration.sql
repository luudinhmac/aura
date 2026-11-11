-- AlterTable
ALTER TABLE "personnel" ADD COLUMN "customFields" JSONB;

-- CreateTable
CREATE TABLE "personnel_columns" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "showInRoster" BOOLEAN NOT NULL DEFAULT true,
    "showInProfile" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnel_columns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "personnel_columns_key_key" ON "personnel_columns"("key");

-- CreateIndex
CREATE INDEX "personnel_columns_isActive_sortOrder_idx" ON "personnel_columns"("isActive", "sortOrder");

-- Seed the existing roster columns as protected system metadata.
INSERT INTO "personnel_columns"
    ("id", "key", "label", "type", "isSystem", "showInRoster", "showInProfile", "sortOrder", "updatedAt")
VALUES
    ('system-stt', 'stt', 'STT', 'text', true, true, false, 10, CURRENT_TIMESTAMP),
    ('system-stage-name', 'stageName', 'Nghệ Danh & Ảnh', 'text', true, true, true, 20, CURRENT_TIMESTAMP),
    ('system-real-name', 'realName', 'Tên Thật', 'text', true, true, true, 30, CURRENT_TIMESTAMP),
    ('system-age', 'age', 'Tuổi', 'text', true, true, true, 40, CURRENT_TIMESTAMP),
    ('system-dob', 'dob', 'Ngày Sinh', 'date', true, true, true, 50, CURRENT_TIMESTAMP),
    ('system-join-date', 'joinDate', 'Ngày Vào', 'date', true, true, true, 60, CURRENT_TIMESTAMP),
    ('system-tenure', 'tenure', 'Thâm Niên', 'text', true, true, true, 70, CURRENT_TIMESTAMP),
    ('system-role', 'role', 'Chức Danh', 'text', true, true, true, 80, CURRENT_TIMESTAMP),
    ('system-height', 'height', 'Chiều Cao', 'number', true, true, true, 90, CURRENT_TIMESTAMP),
    ('system-weight', 'weight', 'Cân Nặng', 'number', true, true, true, 100, CURRENT_TIMESTAMP),
    ('system-hometown', 'hometown', 'Quê Quán', 'text', true, true, true, 110, CURRENT_TIMESTAMP),
    ('system-current-living', 'currentLiving', 'Nơi Sống', 'text', true, true, true, 120, CURRENT_TIMESTAMP),
    ('system-department', 'department', 'Đơn Vị Trực Thuộc', 'text', true, true, true, 130, CURRENT_TIMESTAMP),
    ('system-personnel-type', 'personnelType', 'Loại Nhân Sự', 'text', true, true, true, 140, CURRENT_TIMESTAMP),
    ('system-status', 'status', 'Trạng Thái', 'text', true, true, true, 150, CURRENT_TIMESTAMP),
    ('system-actions', 'actions', 'Thao Tác', 'text', true, true, false, 160, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
