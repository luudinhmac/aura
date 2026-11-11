# Kế hoạch tối ưu cơ chế lưu dữ liệu PostgreSQL

## Phạm vi

Hardening cơ chế đọc/ghi trong `server/db/pgStore.ts`, bảo vệ tính nguyên tử, chống race condition, bổ sung database constraints/index phù hợp và bảo toàn dữ liệu lịch sử tài chính.

Không gộp các migration rủi ro cao vào một lần; mỗi stage phải được kiểm thử và xác nhận trước khi chuyển stage tiếp theo.

## Trạng thái stage

| Stage | Nội dung | Trạng thái |
|---|---|---|
| 0 | Backup, baseline schema/data/migration và kiểm tra khả năng restore | Hoàn tất |
| 1 | Transaction cho workflow nhiều bước | Hoàn tất |
| 2 | Concurrency và idempotency | Hoàn tất |
| 3 | Database constraints và tính toàn vẹn | Hoàn tất |
| 4 | Index và tối ưu truy vấn theo access pattern | Hoàn tất |
| 5 | Tách seed khỏi read path | Hoàn tất |
| 6 | Chuẩn hóa timestamp/timezone | Hoàn tất |
| 7 | Error handling và audit log | Hoàn tất |
| 8 | Bảo vệ dữ liệu lịch sử tài chính, hạn chế hard delete | Hoàn tất |
| 9 | Regression và acceptance cuối | Hoàn tất |

## Stage 0 — baseline đã ghi nhận (2026-10-30)

- `prisma validate`: pass.
- `prisma migrate status`: database up-to-date, 9 migration trong thư mục migration.
- Backup custom-format PostgreSQL đã tạo ở thư mục temporary của máy agent; SHA-256 được ghi nhận trong session, không đưa credential hoặc dữ liệu nhạy cảm vào repository.
- `pg_restore --list`: đọc được archive, 198 TOC entries.
- Database thực tế có 27 bảng public, 64 index, 34 foreign keys, 27 primary keys và 0 CHECK constraint.
- Baseline row estimate: 21 personnel, 19 users, 235 payroll records, 25 payroll periods, 16 schedules, 6 tasks, 6 revenue transactions, 14 KPI settings.
- Không thay đổi schema, migration hoặc dữ liệu nghiệp vụ trong Stage 0.

## Stage 1 — transaction boundary (hoàn tất 2026-10-30)

- `createIdol`, `updateIdol`, approval, resignation/payroll cascade, KPI groups và score batches now share Prisma transaction boundaries.
- Activity replacement và payroll total recalculation dùng transaction client hiện hành, tránh partial write và nested transaction leak.
- Rollback integration tests cover failed KPI-member and personnel-activity writes; không còn orphan group, user hoặc personnel record.
- Verification: lint, 20/20 tests, production build, Prisma validation/migration status, browser reload/accessibility smoke và console check đều pass.

## Stage 2 — concurrency/idempotency

Đã hoàn tất:

- Mã revenue/expense dùng PostgreSQL transaction advisory lock theo prefix/kỳ và lấy số tiếp theo từ `MAX`, không còn phụ thuộc `count + 1` nên không tái sử dụng mã khi bản ghi cũ bị xóa.
- Bổ sung unique index cho `score_records(personnelId, period)` sau khi xác nhận dữ liệu hiện tại không có duplicate.
- Bổ sung optimistic locking cho cập nhật hồ sơ nhân sự dựa trên `updatedAt`; concurrent update sẽ bị từ chối thay vì ghi đè JSON âm thầm.
- Thêm test cạnh tranh cho revenue/expense và test xung đột cập nhật hồ sơ; dữ liệu test được dọn sau khi chạy.

Verification: migration deploy, Prisma generate/validate/status, lint, 22/22 tests, build, browser reload/accessibility smoke và console check đều pass.

## Stage 3 — constraints (hoàn tất 2026-10-30)

- Bổ sung CHECK constraints cho giá trị tiền không âm, tỷ lệ chia sẻ/KPI trong khoảng hợp lệ, định dạng kỳ `YYYY-MM`, ngày nghỉ không trước ngày vào, trạng thái và payout mode.
- Bổ sung constraint cho payroll, revenue, expense, deduction, KPI, criterion, operational metric và leave request.
- Đã kiểm kê dữ liệu trước migration: không có bản ghi vi phạm các invariant đã chọn; trạng thái legacy revenue `completed` được giữ tương thích.
- Thêm negative integration test chứng minh PostgreSQL từ chối `baseSalary < 0` với SQLSTATE `23514`.

Verification: migration deploy, Prisma validate/migration status, lint, 23/23 tests, build, browser reload/accessibility smoke và console check đều pass.

## Stage 4 — indexes/query (hoàn tất 2026-10-30)

- Bổ sung index theo access pattern cho personnel, leave/approval, payroll, KPI, lookup, revenue deduction và expense.
- Đã dùng `EXPLAIN (ANALYZE, BUFFERS)` để xác minh truy vấn payroll theo personnel sử dụng index; các bảng nhỏ còn seq scan là hợp lý vì chi phí thấp hơn.
- Không thêm index trùng với index hiện có.

## Stage 5 — seed/read path (hoàn tất 2026-10-30)

- Loại bỏ seed tự động khỏi `getCompanyExpenses` và `getFinancePnLSummary`, tránh GET làm thay đổi dữ liệu.
- Thêm script `seed:demo-finance` cho môi trường demo; script chạy idempotent qua store.
- Đã xác minh script trực tiếp bằng preload tương thích runtime Node hiện tại.

## Stage 6 — timestamp/timezone (hoàn tất 2026-10-30)

- Đã xác định dữ liệu cũ dùng `Asia/Bangkok`.
- Chuyển các cột thời điểm thực sang `timestamptz` bằng migration riêng, bảo toàn giờ địa phương cũ qua `AT TIME ZONE 'Asia/Bangkok'`.
- Giữ các trường ngày-only như ngày sinh, ngày vào, ngày giao dịch và ngày chi ở kiểu `date`.
- Thêm test kiểm tra cả hai nhóm kiểu dữ liệu.

## Stage 7 — error handling/audit (hoàn tất 2026-10-30)

- Mọi request mutation `/api` có request ID trong header `x-request-id`.
- Ghi audit tập trung vào PostgreSQL với actor, method/path, resource, resource ID, HTTP status và metadata query key; không ghi request body nhạy cảm.
- Middleware bao phủ các nhóm nhân sự, quyền, payroll, approval và tài chính mà không phụ thuộc từng route riêng lẻ.

## Stage 8 — financial retention (hoàn tất 2026-10-30)

- Không cho hard-delete personnel đã có payroll hoặc revenue liên quan.
- Đổi quan hệ revenue → personnel từ `CASCADE` sang `RESTRICT`.
- Xóa giao dịch doanh thu và chi phí chuyển thành cập nhật `status = cancelled`, giữ lại lịch sử và loại khỏi các tổng hợp hiện hành.

## Stage 9 — regression (hoàn tất 2026-10-30)

- `pnpm run lint`: pass.
- Unit/integration/concurrency/database tests: 26/26 pass.
- Prisma validate, migrate deploy và migrate status: pass; database up-to-date với 15 migrations.
- Production build: pass; vẫn có cảnh báo bundle entry hiện hữu khoảng 532.52 kB minified / 151.70 kB gzip, không phát sinh từ các thay đổi storage.
- Browser smoke: reload localhost:3000 pass, DOM/accessibility tree có lịch và các bộ lọc, API `/api/schedules` trả 200 cùng `x-request-id`.
- Known environment limitation: `pnpm run seed:demo-finance` và một lần `prisma generate` qua process đang chạy có thể gặp lần lượt `uv_os_get_passwd ENOMEM` và Windows `EPERM` do file query engine bị lock; seed đã chạy được bằng preload tương thích, còn client đã generate thành công sau Stage 7 và Stage 8 chỉ thay đổi referential action không ảnh hưởng runtime client.

Chạy unit/integration/concurrency tests, migration validation, API negative tests, build và browser smoke test trước khi đóng kế hoạch.
