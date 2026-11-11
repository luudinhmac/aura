# Production deployment runbook

> Quy trình tự động hiện hành: [CI/CD staging và production](./CI-CD-DEPLOYMENT.md). Quy trình bên dưới là runbook triển khai thủ công/khôi phục; không dùng để thay thế bước kiểm thử staging.

> Các lệnh `docker compose up -d --build` dưới đây **không phải cách phát hành code thông thường**. Xem [quy trình commit → Merge Request → staging → production](./PRODUCTION_CODE_DEPLOYMENT.md). Khi khôi phục thủ công trên VM, phải có kế hoạch và phê duyệt riêng; Compose production hiện còn phụ thuộc Docker network của staging, nên không chạy nguyên lệnh trong thư mục gốc `/data/aura-talent` hoặc trên VM mới chưa chuẩn bị mạng này.

## Mục tiêu

Production chỉ nhận schema/migration và dữ liệu người dùng thực tế. Không chạy demo seed hoặc legacy JSON import. Chỉ reset database/volume khi có yêu cầu và phê duyệt rõ ràng; thao tác này xóa cả tài khoản, role assignment, audit log và mọi dữ liệu nghiệp vụ.

## Quy trình triển khai

1. Tạo backup PostgreSQL và kiểm tra có thể đọc bằng `pg_restore --list`.
2. Kiểm tra secret store đã cấp `DATABASE_URL`, `JWT_SECRET` và `BOOTSTRAP_ADMIN_PASSWORD`.
3. Khởi động Docker Compose. Service `migrate` áp dụng tất cả migration active theo thứ tự,
   sau đó app đồng bộ role RBAC, bootstrap admin khi database rỗng và khởi chạy server:

```powershell
docker compose up -d --build
```

Database mới bắt đầu từ migration baseline duy nhất `00000000000000_squashed_baseline`.
Lịch sử migration cũ được lưu trong `prisma/migrations-archive/` để audit và không được Prisma quét.
Không thêm alias trùng tên/nội dung migration vào thư mục active; Prisma sẽ chạy chúng như migration riêng.

Kiểm tra migration sau khi container healthy:

```powershell
docker compose exec app pnpm exec prisma migrate status
```

4. Compose bootstrap root admin tối thiểu nếu database mới và `BOOTSTRAP_ADMIN_PASSWORD`
   được cấp cùng `BOOTSTRAP_ADMIN_IF_EMPTY=true` (mặc định trong Compose). Nếu bootstrap
   thủ công, dùng:

```powershell
$env:APP_ENV='production'
$env:BOOTSTRAP_ADMIN_PASSWORD='<secret-tu-secret-store>'
pnpm.cmd run seed:production-admin
```

Hoặc bật bootstrap một lần ngay trong `docker compose up` bằng secret store:

```powershell
$env:BOOTSTRAP_ADMIN_IF_EMPTY='true'
docker compose up -d --build
```

Script này chỉ tạo/cập nhật account `system_admin`, không tạo personnel, payroll, KPI, revenue hoặc expense mẫu.

5. Chạy preflight:

```powershell
$env:APP_ENV='production'
pnpm exec tsx scripts/preflight-production.ts
```

6. Khởi động app bằng runtime database user không có quyền DDL/reset.
7. Smoke test login, refresh session, roster, payroll, KPI, finance và audit log.
8. Chỉ bật traffic sau khi preflight và smoke test pass.

## Các lệnh bị cấm trong production

- `pnpm seed:demo-finance -- --allow-demo-seed`
- `pnpm exec tsx scripts/migrate-json-to-pg-v2.ts --allow-legacy-import`
- Gọi `POST /api/reset`
- Dùng database URL local/test hoặc migration user làm runtime secret.

## Rollback

- Dừng traffic.
- Giữ nguyên backup và audit log của lần deploy.
- Khôi phục backup vào database staging trước để đối chiếu row counts.
- Chỉ restore production sau khi xác nhận mốc backup và phê duyệt thay đổi.
