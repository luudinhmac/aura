-- Seed the normalized activity catalog.
INSERT INTO "personnel_activity_types"
    ("code", "name", "description", "displayOrder", "updatedAt")
VALUES
    ('gaming_gear', 'Gaming & Gear', 'Livestream game, review và quảng bá thiết bị gaming/gear', 10, CURRENT_TIMESTAMP),
    ('performance', 'Biểu diễn, Nhảy & Hát', 'Ca hát, nhảy và các hoạt động biểu diễn trực tiếp', 20, CURRENT_TIMESTAMP),
    ('pk_donate', 'Donate & PK', 'PK, giao lưu và hoạt động nhận quà tặng/donate', 30, CURRENT_TIMESTAMP),
    ('live_commerce', 'Live Commerce', 'Livestream bán hàng, giới thiệu sản phẩm và chốt đơn', 40, CURRENT_TIMESTAMP),
    ('brand_sponsorship', 'Quảng cáo & Tài trợ', 'Lồng ghép sản phẩm nhãn hàng trong nội dung/livestream', 50, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name",
    "description" = EXCLUDED."description",
    "displayOrder" = EXCLUDED."displayOrder",
    "isActive" = true,
    "updatedAt" = CURRENT_TIMESTAMP;

-- Migrate the legacy single category to the new normalized relation.
-- Only eligible company Idol profiles are migrated into the KPI activity model.
INSERT INTO "personnel_activities"
    ("id", "personnelId", "activityTypeId", "isPrimary", "createdAt", "updatedAt")
SELECT gen_random_uuid(), p."id", t."id", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "personnel" p
JOIN "personnel_activity_types" t
  ON t."code" = CASE p."idolCategory"
      WHEN 'gaming_gear' THEN 'gaming_gear'
      WHEN 'performance_donate' THEN 'performance'
      WHEN 'live_commerce' THEN 'live_commerce'
    END
WHERE p."isIdol" = true
  AND p."personnelType" = 'Công ty'
  AND p."department" <> 'Ban Giám Đốc'
  AND p."idolCategory" IN ('gaming_gear', 'performance_donate', 'live_commerce')
ON CONFLICT ("personnelId", "activityTypeId") DO NOTHING;

-- Existing performance/donate profiles receive Donate & PK as a secondary activity.
INSERT INTO "personnel_activities"
    ("id", "personnelId", "activityTypeId", "isPrimary", "createdAt", "updatedAt")
SELECT gen_random_uuid(), p."id", t."id", false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "personnel" p
JOIN "personnel_activity_types" t ON t."code" = 'pk_donate'
WHERE p."isIdol" = true
  AND p."personnelType" = 'Công ty'
  AND p."department" <> 'Ban Giám Đốc'
  AND p."idolCategory" = 'performance_donate'
ON CONFLICT ("personnelId", "activityTypeId") DO NOTHING;
