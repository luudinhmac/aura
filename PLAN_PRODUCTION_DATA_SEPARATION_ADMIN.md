# Kế hoạch tách System Admin, tài khoản nghiệp vụ và dữ liệu demo

## 1. Mục tiêu và nguyên tắc

### Mục tiêu

- Giữ một tài khoản `admin` mặc định làm System Administrator/root, có quyền cao nhất và không đại diện cho một nhân sự.
- Tạo tài khoản nghiệp vụ riêng, ví dụ `khanghm` hoặc `khang.hm`, để gắn với hồ sơ Giám đốc.
- Không đưa System Admin vào danh sách nhân sự, bảng lương, KPI, lịch, nhiệm vụ hoặc các báo cáo nhân sự.
- Tách hoàn toàn dữ liệu demo/test local khỏi production; deploy production chỉ áp dụng schema/migration và bootstrap admin tối thiểu.
- Bảo đảm migration mới không cập nhật, xóa hoặc ghi đè dữ liệu người dùng đã nhập trên production.

### Nguyên tắc không được phá vỡ

1. Migration production chỉ thay đổi schema và các bản ghi hệ thống được xác định rõ; không import `defaultData`, `db.json` hoặc dữ liệu demo.
2. Không dùng username/email mẫu để nhận diện dữ liệu cần xóa trên production.
3. Không hard-delete hồ sơ có payroll/revenue; dữ liệu tài chính phải được giữ nguyên.
4. Root admin và tài khoản nghiệp vụ là hai khái niệm khác nhau: cấp quyền nghiệp vụ đầy đủ không đồng nghĩa với quyền root.
5. Mọi script có khả năng seed/reset/import phải có environment guard và fail-closed khi chạy ở production.

## 2. Hiện trạng và impact đã xác định

Rà soát database local ngày 2026-10-30:

- `users.admin` (ID 1) có `isSuperAdmin=true`, `role=super_admin`, nhưng đang liên kết với personnel ID 7 “Hoàng Minh Khang”.
- Personnel ID 7 có 25 payroll records, không có revenue/schedule/task/score/KPI-member.
- Các tài khoản còn lại đều là dữ liệu test mẫu, gồm nhân sự vận hành, Idol, khách dịch vụ và dữ liệu payroll/schedule/KPI liên quan.
- `getIdols()` hiện đọc từ bảng `personnel`; vì vậy việc chỉ đổi nhãn UI không đủ để loại System Admin khỏi danh sách nghiệp vụ.
- `createIdol()` có thể tự tạo `UserAccount` cho hồ sơ mới; cần bảo đảm không bao giờ tạo account root từ luồng nhân sự.
- `deleteUser()` hiện chỉ chặn username `admin` hoặc `isSuperAdmin`; cần mở rộng invariant theo loại tài khoản.
- `scripts/migrate-json-to-pg-v2.ts`, `server/data/defaultData.ts` và script seed finance là nguồn dữ liệu demo/import cần được cô lập khỏi production.
- Endpoint reset dữ liệu hiện tồn tại trong Admin Portal; nếu không khóa theo environment, đây là rủi ro xóa dữ liệu production.

### Các module bị ảnh hưởng

| Nhóm | Module/logic cần rà soát |
|---|---|
| Account/auth | `UserAccount`, JWT claims, login/me, refresh session, `isSuperAdmin`, role/allowedActions |
| Personnel | `getIdols`, `getIdolById`, create/update/delete personnel, user-personnel mapping |
| Payroll | payroll period/records, payslip của user, payroll sync, company labor cost |
| KPI | KPI eligibility, groups/members, score records, operational metrics, leaderboard |
| Operations | schedule, task, leave, approval, dashboard và báo cáo |
| Finance | revenue, expense, P&L, createdBy/approvedBy và liên kết personnel |
| Admin UI | user management, role editor, reset data, bootstrap/configuration tabs |
| Deployment | Prisma migrations, seed/import scripts, Docker env, backup/restore, CI/CD preflight |

## 3. Kiến trúc đích đề xuất

### 3.1 Phân loại account

Thêm thuộc tính hệ thống rõ ràng cho `UserAccount`, ưu tiên tên `accountType`:

- `system_admin`: tài khoản root/bootstrap, không được có `Personnel` profile.
- `personnel`: tài khoản gắn với một hồ sơ personnel, có thể là Idol, Giám đốc, nhân viên, cộng tác viên hoặc khách nghiệp vụ tùy policy.
- Có thể mở rộng `service_account` sau này, nhưng chưa cần cho giai đoạn này.

`isSuperAdmin` được giữ tạm thời để tương thích, sau đó chuẩn hóa thành invariant: `accountType=system_admin` mới được coi là root. Không dùng `roleTitle` hoặc tên “Giám đốc” để suy ra root.

### 3.2 Phân quyền

- `admin` là root duy nhất được phép quản lý bootstrap, reset/migration control, tạo hoặc thu hồi root khác.
- Tài khoản `khanghm` là account nghiệp vụ gắn với hồ sơ Giám đốc; có thể được cấp toàn bộ `allowedTabs` và `allowedActions` nghiệp vụ.
- Các thao tác cực nhạy cảm như reset database, thay đổi root account, đổi environment policy và migration control chỉ dành cho root.
- UI hiển thị rõ “System Admin” và “Giám đốc/nhân sự” là hai vai trò khác nhau.

### 3.3 Quy tắc loại System Admin khỏi dữ liệu nghiệp vụ

Tạo helper server-side dùng thống nhất:

- `isSystemAccount(user)` xác định account root theo `accountType`.
- `isBusinessPersonnel(personnel)` chỉ trả true khi personnel không gắn system account.
- `getBusinessPersonnelWhere()` được dùng trong roster, payroll, KPI, schedule, task, leave, leaderboard và các báo cáo.

Không lọc riêng ở frontend. Backend phải lọc trước khi trả dữ liệu và kiểm tra ownership ở các API chi tiết.

## 4. Luồng chuyển đổi dữ liệu local hiện tại

Không dùng migration production để tự động đổi admin test thành người thật. Thực hiện bằng một script migration dữ liệu local có dry-run và backup:

1. Kiểm tra `admin` tồn tại và đang là root.
2. Tạo hoặc xác nhận account nghiệp vụ `khanghm` với `accountType=personnel`, không có `isSuperAdmin`.
3. Gắn account mới vào personnel ID 7 hiện tại để giữ nguyên 25 payroll records và toàn bộ lịch sử tài chính.
4. Gỡ `personnel.userId` khỏi account `admin`; không xóa personnel ID 7.
5. Đổi tên/role title của account nghiệp vụ thành thông tin Giám đốc phù hợp.
6. Kiểm tra admin không còn `personnelProfile`; kiểm tra payroll vẫn thuộc personnel ID 7 nhưng không thuộc system account.
7. In báo cáo trước/sau và yêu cầu xác nhận khi chạy trên database có dữ liệu ngoài fixture.

Nếu production đã có dữ liệu thực, bước 2–5 phải là thao tác có mapping do chủ hệ thống cung cấp, không suy đoán theo ID hoặc tên mẫu.

## 5. Kế hoạch theo stage

### Stage 0 — Inventory và safety gate (hoàn tất 2026-10-30)

**Thực hiện**

- Lập inventory số lượng user/personnel/payroll/KPI/revenue và mapping user-personnel.
- Đánh dấu các nguồn seed/import/reset và tất cả route đọc danh sách nghiệp vụ.
- Bổ sung backup/restore checklist, dry-run output và production database preflight.
- Chốt database production hoàn toàn riêng với local; không dùng chung `DATABASE_URL`.

**Điều kiện hoàn tất**

- Đã kiểm kê mapping 19 users, 21 personnel, 235 payroll records, 25 payroll periods, 6 revenue transactions, 35 company expenses, 14 KPI settings, 8 KPI groups, 6 score records, 16 schedules, 6 tasks, 6 approvals và 10 audit logs.
- Đã xác nhận `admin` là Super Admin nhưng đang gắn personnel ID 7 “Hoàng Minh Khang”; personnel này có 25 payroll records. Đây là mapping bắt buộc phải xử lý có chủ đích ở Stage 3, không được xóa.
- Đã ghi nhận 2 personnel chưa gắn account; cả hai là khách dịch vụ ngoài. Không tự động gắn account cho các bản ghi này.
- Prisma migration status: database up-to-date với 15 migrations.
- Đã tạo PostgreSQL custom-format backup tại thư mục temporary của agent; `pg_restore --list` đọc được 229 TOC entries, schema-only restore validation đọc được 90 CREATE statements. SHA-256: `966ABF320D4E5F7758EF4B3FC07DD0BE71E9E835022CB6A5FF7502FC7E78A5F8`.
- Chưa thay đổi schema, migration, dữ liệu nghiệp vụ hoặc tài khoản.
- Safety gate: database hiện tại được xác định là local/test fixture; chưa được phép dùng làm production database. Stage 1 có thể bắt đầu trên local/staging, nhưng Stage 3 chuyển account chỉ thực hiện sau khi chốt username/email Giám đốc và mapping production.

### Stage 1 — Domain model và database invariant (hoàn tất 2026-10-30)

**Thực hiện**

- Thêm `UserAccount.accountType` với default an toàn là `personnel` cho migration tương thích.
- Backfill `system_admin` cho root hiện tại.
- Bổ sung service-level invariant: system account không được tạo/gắn personnel.
- Cập nhật Prisma mapper và type frontend.

**Điều kiện hoàn tất**

- Đã thêm `UserAccount.accountType` với constraint `system_admin|personnel` trong migration `20261030_stage1_account_types`.
- Đã cập nhật mapper/create/update service và chặn tạo personnel từ system account hoặc promote account đang có personnel profile.
- Prisma validate/migrate status pass; Prisma Client đã regenerate sau khi xử lý process lock.
- 28/28 tests và lint pass.
- Đã backfill account `admin` thành `system_admin` trong Stage 3; invariant đã được xác nhận sau migration.

### Stage 2 — Backend business-scope filtering (đã triển khai, chờ integration acceptance)

**Thực hiện**

- Áp dụng helper business scope cho roster, detail, payroll, KPI, schedule, task, leave, approval target, leaderboard, analytics và finance filter theo personnel.
- Bảo vệ các endpoint lấy payslip/KPI/profile khỏi việc truyền `personnelId` của system account.
- Xác minh các liên kết createdBy/approvedBy vẫn cho phép root ghi audit/duyệt nhưng không biến root thành nhân sự.

**Điều kiện hoàn tất**

- Đã thêm business-personnel filter dùng chung cho roster, score, task, schedule, leave, payroll, KPI, operational metrics và revenue read paths.
- Finance P&L, revenue summary, payroll aggregation và payroll sync chỉ xử lý personnel nghiệp vụ; khách dịch vụ không bị loại khỏi doanh thu.
- `getIdolById`, revenue detail và payslip path không trả dữ liệu khi owner là `system_admin`.
- Các luồng ghi task, schedule, leave, score, KPI group/setting, operational metric và revenue đã chặn gắn `system_admin`; payroll sync cũng không tạo record cho system account.
- Lint, typecheck, build và 28/28 tests pass; browser smoke localhost:3000 tải được roster.
- Chưa đóng Stage 2: cần bổ sung API integration tests có dữ liệu system account thực tế; business filter và write guard đã triển khai.

### Stage 3 — Tách root admin khỏi personnel local (hoàn tất migration local 2026-10-30)

**Thực hiện**

- Viết `scripts/migrate-admin-account.ts` có `--dry-run`, backup reminder, transaction và idempotency.
- Chuyển admin khỏi personnel; tạo account nghiệp vụ Giám đốc theo mapping được duyệt.
- Không hard-delete personnel có payroll; kiểm tra 25 payroll records được giữ nguyên.
- Cập nhật seed demo để tạo system admin riêng và account Giám đốc riêng ngay từ đầu.

**Điều kiện hoàn tất**

- `admin.personnelProfile === null`.
- Account Giám đốc có personnel profile đúng.
- Payroll/revenue/KPI không bị đổi owner ngoài mapping đã duyệt.
- Chạy lại script không tạo duplicate hoặc thay đổi ngoài mong muốn.

**Cập nhật 2026-10-30**

- Đã thêm [`scripts/migrate-admin-account.ts`](./scripts/migrate-admin-account.ts) và lệnh `pnpm migrate:admin-account`.
- Script mặc định dry-run; yêu cầu `--director-username`, `--director-email`; khi ghi bắt buộc `--apply --confirm`; production còn cần `--allow-production`.
- Đã chạy `--apply --confirm` với mapping `khanghm / khanghm@auratalent.vn` và giữ nguyên password hash của `admin`.
- Hậu kiểm đạt: `admin` là `system_admin`, không còn personnel profile; `khanghm` là account personnel gắn personnel ID 7; 25 payroll records vẫn còn nguyên.
- Legacy demo importer đã phân loại user Super Admin thành `system_admin` và không còn gắn account root vào personnel; account Giám đốc production vẫn được tạo bằng bootstrap/migration mapping riêng.

### Stage 4 — Admin UI và quyền cấp cho tài khoản khác (đã triển khai phần root boundary 2026-10-30)

**Thực hiện**

- Role editor hiển thị loại account, khóa trường root đối với user không phải root.
- Cho root cấp toàn bộ quyền nghiệp vụ cho tài khoản Giám đốc bằng preset “Business Administrator/Director”.
- Tách rõ các quyền root khỏi các quyền nghiệp vụ.
- Ẩn System Admin khỏi dropdown chọn nhân sự, payroll, KPI, schedule và task.
- Thêm cảnh báo khi tạo account không gắn personnel hoặc khi gắn account vào hồ sơ đã có account.

**Điều kiện hoàn tất**

- UI không thể tạo account root từ form nhân sự.
- Tài khoản Giám đốc dùng được các module được cấp nhưng không thực hiện root-only action.
- Accessibility/browser smoke pass.

**Cập nhật**

- Authorization backend và UI root boundary dùng `accountType=system_admin`; `role='super_admin'` đơn lẻ không còn đủ để vượt root-only policy.
- Admin UI nhận diện System Admin theo account type và khóa root account khỏi thao tác nghiệp vụ personnel.
- Còn lại: kiểm tra browser với tài khoản `khanghm` sau khi cấp preset business administrator.

### Stage 5 — Tách demo seed khỏi production (đã triển khai guard 2026-10-30)

**Thực hiện**

- Đổi seed demo thành command rõ ràng, ví dụ `pnpm seed:demo -- --database=local`.
- Thêm `pnpm seed:production-admin` chỉ tạo root admin bootstrap, không tạo personnel/payroll/KPI/revenue mẫu.
- Mọi seed script phải kiểm tra `APP_ENV`, `ALLOW_DEMO_SEED`, database host/name và marker môi trường; production thì fail-closed.
- Chặn `/api/reset` và các thao tác reset khi `APP_ENV=production`, đồng thời tách migration DB user khỏi app DB user.
- Không gọi seed từ GET/startup/runtime path.
- Đưa `defaultData.ts`, `db.json`, finance demo và legacy JSON import vào phạm vi local-only; thêm README vận hành.

**Điều kiện hoàn tất**

- Database production mới chỉ có schema và root bootstrap.
- Chạy app production không tự sinh dữ liệu mẫu.
- Seed demo bị từ chối khi dùng production env/database.
- Reset endpoint trả 403/404 hoặc không được mount ở production.

**Cập nhật**

- Đã thêm `scripts/environment-guards.ts` để demo seed và legacy import fail-closed.
- `seed-demo-finance.ts` chỉ chạy khi có `ALLOW_DEMO_SEED=true` hoặc `--allow-demo-seed`; production luôn bị từ chối.
- Đã thêm `seed:production-admin`, chỉ bootstrap `system_admin`, không tạo dữ liệu nghiệp vụ/demo.
- `/api/reset` trả 403 khi `APP_ENV` hoặc `NODE_ENV` là production.
- Đã kiểm chứng demo seed bị từ chối cả khi thiếu cờ và khi chạy production.

### Stage 6 — Import/migration safety và chống ảnh hưởng dữ liệu thật (đã triển khai guard 2026-10-30)

**Thực hiện**

- Legacy JSON import chỉ chạy khi database rỗng hoặc có explicit import token; không dùng `upsert` theo username/email để ghi đè production.
- Thêm `--dry-run`, allowlist bảng, transaction, row counts trước/sau và fail khi phát hiện dữ liệu business hiện hữu.
- Migrations schema không chứa insert demo; data migration phải có precondition, audit và rollback plan.
- CI kiểm tra migration không tham chiếu `defaultData`, `db.json`, credentials mẫu hoặc production seed.
- Tách `.env.local`, `.env.test`, `.env.production`; secret chỉ lấy từ deployment secret store.

**Điều kiện hoàn tất**

- CI fail nếu production build chứa demo seed command trong startup path.
- Import trên database có dữ liệu thật dừng trước khi ghi.
- Restore backup và đối chiếu row counts pass.

**Cập nhật**

- Legacy JSON import v1/v2 yêu cầu explicit `ALLOW_LEGACY_IMPORT=true` hoặc `--allow-legacy-import` và luôn bị từ chối trong production.
- Đã kiểm chứng `migrate-json-to-pg-v2.ts` dừng trước khi đọc/ghi dữ liệu khi `APP_ENV=production`.
- Vẫn cần rehearsal import trên staging sạch trước khi production deployment.

### Stage 7 — Production preflight và deployment runbook (đã triển khai preflight 2026-10-30)

**Thực hiện**

- Preflight kiểm tra `APP_ENV=production`, `DATABASE_URL`, migration status, database role, TLS/secret và backup age.
- Chạy migrations bằng user migration riêng; app chỉ dùng runtime user không có quyền DDL/reset.
- Deploy theo thứ tự: backup → migrate schema → bootstrap admin nếu chưa có → smoke test → bật traffic.
- Thêm kiểm tra sau deploy: admin không có personnel, không có demo rows, business lists không rỗng bất thường, login/refresh/audit hoạt động.

**Điều kiện hoàn tất**

- Có runbook và rollback procedure được thử trên staging.
- Staging dùng dataset sạch không chứa local IDs.
- Production deploy rehearsal không thay đổi dữ liệu nghiệp vụ ngoài dự kiến.

**Cập nhật**

- Đã thêm `scripts/preflight-production.ts` kiểm tra environment, `DATABASE_URL`, kết nối DB, system admin, không có system admin profile và migration đã apply.
- Đã thêm [`docs/PRODUCTION_RUNBOOK.md`](./docs/PRODUCTION_RUNBOOK.md) cho backup → migrate → bootstrap → preflight → smoke test → traffic.
- Preflight local với dataset hiện tại pass; production rehearsal/staging restore vẫn cần thực hiện trước go-live.

### Stage 8 — Regression, security và acceptance (đang kiểm thử 2026-10-30)

**Test bắt buộc**

- Unit: account type, root invariant, business personnel filter.
- Integration: admin không vào roster/payroll/KPI; director account vẫn hoạt động đúng.
- Negative: `x-user-id` spoofing, client gửi `isSuperAdmin`, client gắn system account vào personnel, reset ở production, demo seed ở production.
- Migration: database rỗng, database có dữ liệu, database có payroll/revenue, chạy migration lần hai.
- Browser: login root, tạo/sửa account nghiệp vụ, cấp quyền, mở roster/payroll/KPI, refresh session.
- Operational: backup/restore, migration status, audit log, no demo rows.

**Definition of Done**

- `admin` là system account độc lập, không có personnel profile.
- Account nghiệp vụ của Giám đốc tồn tại riêng và được cấp quyền theo policy.
- Không có dữ liệu demo trong database production mới.
- Không có startup seed/reset/import nguy hiểm ở production.
- Mọi migration/data script đều idempotent hoặc fail-closed, có backup và log.
- Lint, typecheck, unit/integration tests, build, browser smoke và production preflight đều pass.

**Cập nhật**

- Lint/typecheck pass, build pass, 28/28 unit tests pass, preflight pass trên database local hiện tại.
- Browser smoke localhost:3000 pass, không có page error; cần thêm test login thực tế bằng `khanghm` và negative API integration trên staging.

## 6. Các quyết định cần chốt trước khi triển khai Stage 3

1. Username chính thức của account Giám đốc: `khanghm` — đã chốt.
2. Email công việc: `khanghm@auratalent.vn` — đã chốt. Còn chờ chính sách mật khẩu/temporary password; không dùng mật khẩu demo `123`.
3. Account Giám đốc có toàn bộ quyền nghiệp vụ hay chỉ các module được chọn; đề xuất: toàn bộ business actions, không có root-only actions.
4. Production có cần giữ các dữ liệu lịch sử hiện tại hay là database hoàn toàn mới; nếu có lịch sử, phải cung cấp mapping account-personnel chính thức.
5. Cách quản lý secret production và database role migration/runtime.

## 7. Kết quả rà soát hiện tại

- Stage 0 đã hoàn tất: inventory, backup và safety gate đã được ghi nhận; database hiện tại vẫn là local/test fixture.
- Stage 1 đã triển khai schema `accountType`, invariant service-level và đã backfill root admin sau khi mapping được chốt.
- Stage 2 đã triển khai business-scope filtering và write guard; các kiểm tra tĩnh, build, unit tests và browser smoke đều pass.
- Stage 3 đã chạy migration local an toàn; owner personnel ID 7 chuyển sang `khanghm`, root `admin` được tách riêng, 25 payroll records được bảo toàn.
- Stage 4 đã siết root boundary theo `accountType`; Stage 5–7 đã có environment guard, bootstrap production admin và runbook/preflight.
- Stage 8 chưa đóng hoàn toàn vì chưa có staging production rehearsal và API integration test độc lập.

