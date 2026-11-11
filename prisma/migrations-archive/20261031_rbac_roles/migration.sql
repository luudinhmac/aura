CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "department" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
    "defaultTabs" JSONB NOT NULL DEFAULT '[]',
    "defaultActions" JSONB NOT NULL DEFAULT '[]',
    "defaultDepartments" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

CREATE TABLE "user_roles" (
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    "assignedById" INTEGER,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId", "roleId")
);

CREATE INDEX "user_roles_roleId_idx" ON "user_roles"("roleId");
CREATE INDEX "user_roles_assignedById_idx" ON "user_roles"("assignedById");

ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assignedById_fkey"
  FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "roles" ("code", "name", "roleTitle", "category", "description", "isSystemRole", "defaultTabs", "defaultActions", "defaultDepartments")
VALUES (
  'system_admin',
  'System Admin',
  'System Administrator',
  'leadership',
  'Toàn quyền quản trị hệ thống, độc lập với phòng ban và chức danh nghiệp vụ.',
  true,
  '["roster","scoring","leaderboard","schedule","tasks","analytics","admin","my_dashboard","payroll","payroll_disputes","kpi","revenue","finance"]',
  '["manage_idols","manage_scores","manage_criteria","manage_schedule","manage_tasks","manage_departments","manage_settings","manage_approvals","manage_payroll","adjust_payroll","approve_payroll","hot_bonus","manage_kpi","manage_revenue"]',
  '["*"]'
)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "user_roles" ("userId", "roleId")
SELECT u."id", r."id"
FROM "users" u CROSS JOIN "roles" r
WHERE u."accountType" = 'system_admin' AND r."code" = 'system_admin'
ON CONFLICT ("userId", "roleId") DO NOTHING;
