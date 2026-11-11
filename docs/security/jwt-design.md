# Thiết kế JWT và Session — Stage 11A

## Trạng thái

Stage 11A hoàn tất ngày 2026-10-29. Đây là tài liệu thiết kế và kiểm kê; chưa thay đổi authentication runtime, chưa thêm dependency, chưa thêm migration và chưa chấp nhận token trong server.

## Hiện trạng đã kiểm tra

- Login nằm tại `POST /api/auth/login` trong `server.ts` và gọi `dbStore.authenticate`.
- Mật khẩu hiện được so sánh trực tiếp với giá trị lưu trong `users.password`; Stage 11B phải chuyển sang hash.
- Identity của request được lấy từ Bearer access token ở production; `x-user-id` chỉ còn fallback chuyển tiếp khi chạy development.
- Frontend lưu user object trong `localStorage` và chưa có access-token/refresh flow.
- API có middleware authentication chung; các route mutation quan trọng được kiểm tra thêm theo `allowedActions` hoặc Super Admin.
- Permission hiện có gồm `role`, `isSuperAdmin`, `allowedTabs`, `allowedDepartments` và `allowedActions`.

## Quyết định thiết kế cho Stage 11

| Hạng mục | Quyết định | Lý do |
|---|---|---|
| Access token | JWT lưu trong memory ở frontend, TTL 15 phút | Giảm thời gian sống của token và tránh lưu access token lâu dài trong storage |
| Refresh token | Cookie `HttpOnly`, `Secure` ở production, `SameSite=Lax` mặc định | JavaScript không đọc được refresh token; phù hợp ứng dụng cùng site |
| Session/revoke | Lưu session server-side trong PostgreSQL | Hỗ trợ logout, rotation và revoke khi refresh token bị reuse |
| Refresh token database | Chỉ lưu hash, không lưu token gốc | Giảm tác động nếu database bị lộ |
| JWT claims | `sub`, `jti`, `iss`, `aud`, `iat`, `exp` | Không nhúng password, custom fields hoặc permission snapshot |
| Password hash | Dùng Node `crypto.scrypt` với salt ngẫu nhiên trước khi cân nhắc dependency ngoài | Không mở rộng dependency nếu chưa cần thiết |
| Permission | Đọc lại user từ database ở endpoint nhạy cảm | Tránh quyền cũ trong token sau khi admin thay đổi role |
| Library JWT | Đánh giá `jose` trong 11B; chưa cài ở 11A | ESM/TypeScript phù hợp, nhưng cần review dependency trước khi thêm |

## Session model dự kiến

Stage 11B sẽ bổ sung bảng `auth_sessions` với các trường tối thiểu:

- `id`, `userId`, `refreshTokenHash`.
- `expiresAt`, `createdAt`, `lastUsedAt`, `revokedAt`.
- `replacedBySessionId` để hỗ trợ rotation và phát hiện reuse.

Không lưu refresh token gốc, password, JWT secret hoặc access token trong database.

## Route matrix hiện tại và đích đến

| Nhóm | Route/module | Hiện tại | Đích Stage 11 |
|---|---|---|---|
| Public | `POST /api/auth/login` | Public | Public + rate limit + cookie refresh |
| Session | `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/me` | Chưa có đầy đủ | Auth/session middleware |
| Personnel | `/api/idols*`, `/api/upload` | JWT middleware; mutation `manage_idols`; custom-field filter theo user DB | Authenticated; action/department check từ DB |
| Configuration | `/api/personnel-columns*`, `/api/column-headers` | JWT middleware; mutation Super Admin | Authenticated; mutation Super Admin |
| Headers/settings | `/api/column-headers`, `/api/settings` | Chưa đồng nhất | Read authenticated; mutation theo action/Super Admin |
| Operations | `/api/criteria*`, `/api/scores*`, `/api/tasks*`, `/api/schedules*` | JWT middleware; mutation kiểm tra action tương ứng | Authenticated + `allowedActions` |
| Approval | `/api/approvals*`, `/api/leave-requests*` | Reviewer có thể lấy từ body/header | Authenticated; reviewer lấy từ token, action-level permission |
| Finance | `/api/revenue*`, `/api/finance*`, `/api/payrolls*` | Chưa có middleware chung | Authenticated; phân quyền tài chính riêng |
| KPI | `/api/kpi-groups*`, `/api/kpi-settings*`, `/api/operational-*` | Chưa có middleware chung | Authenticated + action/department scope |
| User admin | `/api/users*` | JWT middleware + Super Admin | Chỉ Super Admin |
| Upload/reset | `/api/upload`, `/api/reset` | Đang mở hoặc cần rà soát riêng | Authenticated; reset phải có xác nhận và quyền đặc biệt |

Static assets `/uploads` được xem là public theo thiết kế hiện tại; ảnh nhạy cảm nếu có trong tương lai phải chuyển sang private access hoặc signed URL.

## Luồng dự kiến

1. Login xác thực username/password đã hash.
2. Server tạo access JWT và session refresh token hash.
3. Frontend giữ access token trong memory; browser giữ refresh cookie.
4. API gửi `Authorization: Bearer <access-token>`.
5. Khi access token hết hạn, client gọi refresh một lần và retry request đang chờ.
6. Refresh rotation tạo token/session mới và revoke session cũ.
7. Refresh token reuse, session hết hạn hoặc logout đều trả `401` và xóa auth state.
8. Endpoint nhạy cảm đọc user hiện tại từ `sub` rồi đối chiếu database.

## CSRF, CORS và vận hành

- Production bắt buộc HTTPS.
- CORS chỉ cho phép origin được cấu hình, không dùng wildcard khi có credentials.
- Refresh cookie dùng `HttpOnly`, `Secure`, `SameSite=Lax`; nếu deployment khác site phải thiết kế CSRF token và `SameSite=None` có kiểm soát.
- JWT secret, issuer, audience và TTL chỉ lấy từ environment/secret manager.
- Không log cookie, token, password hoặc request Authorization header.
- Login/refresh/logout cần rate limit và audit event ở stage sau.

## Không thuộc Stage 11A

- Không sửa `prisma/schema.prisma`.
- Không đổi password hiện có.
- Không thêm package JWT.
- Không thêm route login/refresh/logout/me.
- Không đổi frontend API client.
- Không chạy migration.

## Stage 11B implementation note

Stage 11B đã bắt đầu triển khai: password utility dùng `crypto.scrypt`, dữ liệu 19 tài khoản hiện hữu đã được hash, model/migration `auth_sessions` đã được áp dụng. Prisma Client cần được generate lại sau khi dừng process Node đang khóa query engine; chưa sử dụng session model ở runtime cho đến khi hoàn tất bước này.

Stage 11C backend đã triển khai: access JWT HS256, refresh rotation/revoke, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/me`, middleware xác thực và production enforcement. Frontend interceptor và chuyển toàn bộ client API vẫn thuộc Stage 11D.

Stage 11D frontend đã triển khai: `apiFetch` gắn Bearer token, refresh một lần khi `401`, đồng bộ request song song qua một refresh promise, khôi phục session khi reload, logout revoke và loại bỏ `x-user-id` khỏi frontend. Các fetch trực tiếp của Revenue cũng dùng wrapper chung.

Stage 11E đã triển khai policy authorization tập trung trong `server/auth/authorization.ts`: production bắt buộc JWT, các mutation nghiệp vụ được map sang `allowedActions`, còn user/account/reset và cấu hình nhạy cảm yêu cầu Super Admin. Smoke test production xác nhận request thiếu token và request giả bằng `x-user-id` đều bị từ chối `401`.

## Tiêu chí chuyển sang 11B

- Route matrix được review.
- Token storage, TTL, cookie flags và session strategy đã chốt.
- Có backup database trước migration.
- Có kế hoạch chuyển password plaintext sang hash và rollback.
- Có xác nhận rõ môi trường production, origin frontend và chính sách HTTPS/CORS.
