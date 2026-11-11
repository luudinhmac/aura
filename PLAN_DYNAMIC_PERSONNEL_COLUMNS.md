# Kế hoạch triển khai cột nhân sự động

## 1. Mục tiêu

Cho phép Super Admin quản lý các cột thông tin nhân sự theo cấu hình:

- Thêm cột tùy chỉnh.
- Sửa tên, kiểu dữ liệu và tùy chọn của cột.
- Ẩn/hiện cột.
- Sắp xếp thứ tự cột.
- Ngừng sử dụng và khôi phục cột mà không làm mất dữ liệu cũ.
- Nhập và chỉnh sửa giá trị cột trong hồ sơ nhân sự.
- Hiển thị cột trong danh sách nhân sự và hồ sơ chi tiết.

Các module lịch, KPI, bảng xếp hạng, lương, doanh thu, tài khoản và phân quyền vẫn phải hoạt động theo các trường hệ thống hiện tại.

## 2. Nguyên tắc thiết kế

### 2.1. Phân tách cột hệ thống và cột tùy chỉnh

#### Cột hệ thống

Các trường đang được nhiều module sử dụng trực tiếp:

- `stt`
- `stageName`
- `realName`
- `age`
- `dob`
- `joinDate`
- `tenure`
- `role`
- `height`
- `weight`
- `hometown`
- `currentLiving`
- `department`
- `personnelType`
- `status`
- `actions`

Cột hệ thống được phép đổi nhãn, ẩn/hiện và sắp xếp; không xóa vật lý.

#### Cột tùy chỉnh

Cột tùy chỉnh phù hợp cho các thông tin như:

- Tình trạng hôn nhân.
- Số người phụ thuộc.
- Size quần áo.
- Ngày ký hợp đồng.
- Kỹ năng đặc biệt.
- Ghi chú HR.

Cột tùy chỉnh không tự động tham gia tính lương, KPI, lịch hoặc phân quyền. Nếu một cột cần ảnh hưởng nghiệp vụ, phải có thiết kế liên kết riêng.

### 2.2. Không xóa dữ liệu vật lý

Thao tác “Xóa cột” được triển khai dưới dạng ngừng sử dụng:

```text
isActive = false
isVisible = false
```

Dữ liệu trong hồ sơ nhân sự vẫn được giữ lại để có thể khôi phục, audit hoặc export.

### 2.3. Dùng key bất biến

Mỗi cột có `key` duy nhất. Có thể đổi `label`, nhưng không đổi `key` sau khi cột đã có dữ liệu.

Ví dụ:

```text
key: marital_status
label: Tình trạng hôn nhân
```

Nếu đổi label thành “Tình trạng gia đình”, dữ liệu vẫn liên kết theo `marital_status`.

## 3. Trạng thái triển khai

| Stage | Nội dung | Trạng thái | Ngày hoàn thành | Ghi chú |
|---|---|---|---|---|
| 0 | Baseline, khảo sát và backup | Đạt | 2026-10-29 | PostgreSQL backup đã tạo; Docker CLI không có trong agent environment |
| 1 | Prisma schema, model và migration | Đạt | 2026-10-29 | Migration đã áp dụng; Prisma Client đã generate; database up to date |
| 2 | TypeScript types và backend mapper | Đạt | 2026-10-29 | Types, mapper, create/update và runtime GET đã xác minh; server chạy được từ terminal ngoài Agent |
| 3 | API CRUD cột và validation quyền | Đạt | 2026-10-29 | CRUD, archive/restore, reorder, validation và kiểm tra quyền đã xác minh qua browser |
| 4 | Form quản trị cột | Đạt | 2026-10-29 | Admin Portal CRUD, archive/restore, reorder và browser verification |
| 5 | Form thêm/sửa nhân sự | Đạt | 2026-10-29 | Render, validate, load/save customFields và approval snapshot |
| 6 | Danh sách nhân sự và bộ chọn cột | Đạt | 2026-10-29 | Render động, visibility persistence, format theo type và cleanup |
| 7 | Hồ sơ chi tiết và approval | Đạt | 2026-10-29 | Profile dynamic fields, approval preservation và browser verification |
| 8 | Rà soát liên kết các module | Đạt | 2026-10-29 | sensitivity, backend filtering và Admin Portal configuration |
| 9 | Kiểm thử, migration verification và browser QA | Đạt | 2026-10-29 | Migration status, 6/6 tests, API negative cases và browser QA |
| 10 | Tài liệu, changelog và bàn giao | Đạt | 2026-10-29 | Đồng bộ tài liệu schema, permission matrix, changelog và project state |

Quy ước trạng thái:

- `Chưa thực hiện`: chưa bắt đầu.
- `Đang thực hiện`: đã bắt đầu nhưng chưa đạt acceptance criteria.
- `Đạt`: đã triển khai và kiểm thử theo stage.
- `Bị chặn`: cần thay đổi thiết kế, quyền hoặc môi trường trước khi tiếp tục.

## 4. Stage 0 — Baseline, khảo sát và backup

### Mục tiêu

Đóng băng trạng thái hiện tại trước khi thay đổi schema và UI.

### Phạm vi kiểm tra

- Kiểm tra `git status` và thay đổi chưa commit.
- Kiểm tra Prisma schema và migration hiện có.
- Kiểm tra số lượng và cấu trúc dữ liệu trong `personnel`.
- Kiểm tra cấu hình cột hiện tại trong `AppSetting`.
- Kiểm tra quyền Super Admin và middleware/API authorization.
- Kiểm tra các module đang đọc `Idol`.
- Backup database trước migration.

### Thành phần liên quan

- `prisma/schema.prisma`
- `prisma/migrations/`
- `server/db/pgStore.ts`
- `server.ts`
- `src/types/index.ts`
- `src/App.tsx`
- `src/views/IdolListView.tsx`
- `src/views/AdminPortalView.tsx`
- `src/components/IdolModal.tsx`
- `src/components/IdolDetailModal.tsx`
- `src/components/ColumnHeadersModal.tsx`

### Acceptance criteria

- Có danh sách module và API bị ảnh hưởng.
- Có backup hoặc xác nhận cơ chế phục hồi database.
- Xác định rõ cột hệ thống không được xóa.
- Không có thay đổi source code ngoài phạm vi khảo sát.

### Kết quả Stage 0 — 2026-10-29

#### Repository và môi trường

- Không có thư mục `.git` trong workspace, vì vậy không thể lấy `git status` hoặc diff baseline bằng Git.
- Backend đang dùng PostgreSQL qua `server/db/pgStore.ts`, được import trực tiếp trong `server.ts`.
- Docker Compose có các service `postgres`, `app`, `nginx`, nhưng Docker CLI không có trong môi trường agent; không thể kiểm tra container bằng `docker compose ps`.
- PostgreSQL client native có sẵn tại `C:\Program Files\PostgreSQL\16\bin`.

#### Database baseline đã xác nhận

Database kết nối thành công qua `localhost:5432/aura_talent`.

| Bảng | Số dòng |
|---|---:|
| `personnel` | 21 |
| `users` | 19 |
| `app_settings` | 1 |
| `approval_requests` | 6 |
| `work_schedules` | 16 |
| `payroll_records` | 235 |
| `kpi_settings` | 14 |
| `revenue_transactions` | 6 |

Schema hiện tại của `personnel` chưa có:

- `customFields`.
- Bảng `personnel_columns`.

Cấu hình cột hiện tại đang nằm trong `app_settings.departmentParentMap.columnHeaders` dưới dạng JSON và chỉ chứa các key cố định như `stageName`, `realName`, `age`, `dob`, `role`, `department`, `status`, `actions`.

Prisma xác nhận database đang up to date với 2 migration hiện có:

- `20261029_add_operational_metrics`.
- `20261029_sync_khang_payroll_records`.

#### Backup

Đã tạo backup PostgreSQL trước Stage 1:

```text
backups/stage0-pre-dynamic-columns-20261029.sql
```

Backup có kích thước khoảng 356 KB và được tạo thành công bằng `pg_dump` native. Lần thử đầu tiên dùng nguyên `DATABASE_URL` thất bại vì `pg_dump` không hỗ trợ query parameter `schema`; lần thứ hai đã dùng cùng connection nhưng bỏ query parameter đó và thành công.

#### Liên kết đã rà soát

- Frontend types và app state: `src/types/index.ts`, `src/App.tsx`.
- Cấu hình tiêu đề: `src/components/ColumnHeadersModal.tsx`, `server/db/pgStore.ts`, `server.ts`.
- Bảng nhân sự và visibility: `src/views/IdolListView.tsx`.
- Form nhân sự: `src/components/IdolModal.tsx`.
- Hồ sơ chi tiết: `src/components/IdolDetailModal.tsx`.
- Mapper và persistence nhân sự: `server/db/pgStore.ts`.
- Approval nhân sự: `server/db/pgStore.ts`, `server.ts`.
- Lịch, KPI, payroll và revenue đều liên kết bằng các trường nhân sự hệ thống; chưa có module nào sử dụng `customFields` vì trường này chưa tồn tại.

#### Phát hiện bảo mật cần xử lý ở Stage 3

Hai endpoint tiêu đề cột hiện tại trong `server.ts` là:

- `GET /api/column-headers`.
- `PUT /api/column-headers`.

Stage 3 phải bổ sung kiểm tra quyền server-side cho API quản lý cấu hình cột. Không được chỉ dựa vào việc ẩn UI ở Admin Portal.

#### Kết luận Stage 0

- Đủ thông tin để bắt đầu Stage 1.
- Không có thay đổi source code hoặc schema trong Stage 0.
- Backup database đã có.
- Việc kiểm tra Docker container bị giới hạn bởi môi trường agent; không ảnh hưởng đến backup native hoặc việc lập migration, nhưng cần kiểm tra lại container trước khi triển khai production.

## 5. Stage 1 — Prisma schema, model và migration

### Mục tiêu

Tạo nền tảng lưu cấu hình cột và giá trị cột tùy chỉnh.

### Thay đổi schema

Thêm vào `Personnel`:

```prisma
customFields Json?
```

Tạo model `PersonnelColumn`:

```prisma
model PersonnelColumn {
  id            String   @id @default(uuid())
  key           String   @unique
  label         String
  type          String
  options       Json?
  required      Boolean  @default(false)
  isVisible     Boolean  @default(true)
  isActive      Boolean  @default(true)
  sortOrder     Int      @default(0)
  showInRoster  Boolean  @default(true)
  showInProfile Boolean  @default(true)
  isSystem      Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("personnel_columns")
}
```

### Kiểu dữ liệu được phép

```text
text | number | date | select | boolean
```

### Công việc

- Cập nhật `prisma/schema.prisma`.
- Tạo migration với tên mô tả rõ mục đích.
- Generate Prisma client.
- Seed các cột hệ thống mặc định.
- Không thay đổi dữ liệu nhân sự hiện có.
- Kiểm tra migration trên database test trước database mục tiêu.

### Lệnh dự kiến

```bash
pnpm prisma migrate dev --name add_personnel_dynamic_columns
pnpm prisma generate
```

### Rủi ro

- Migration thất bại do database chưa đồng bộ.
- Dữ liệu JSON null/không hợp lệ.
- Prisma client chưa được generate đúng môi trường.

### Acceptance criteria

- Migration chạy thành công.
- Bảng `personnel_columns` tồn tại.
- `personnel.customFields` tồn tại.
- Dữ liệu nhân sự cũ vẫn đọc được.
- Có thể rollback hoặc phục hồi từ backup.

### Kết quả thực hiện Stage 1 — 2026-10-29

#### Đã hoàn thành

- Cập nhật `prisma/schema.prisma`:
  - Thêm `Personnel.customFields Json?`.
  - Thêm model `PersonnelColumn`.
  - Thêm unique index cho `key`.
  - Thêm index cho `isActive` và `sortOrder`.
- Tạo migration:
  - `prisma/migrations/20261029_add_personnel_dynamic_columns/migration.sql`
- Migration đã áp dụng thành công bằng `pnpm.cmd exec prisma migrate deploy`.
- Migration seed 16 cột hệ thống hiện tại với `isSystem = true`.
- Database kiểm tra sau migration:
  - `personnel`: 21 dòng.
  - `personnel_columns`: 16 dòng.
  - Cột hệ thống active: 16.
  - `personnel.customFields` đang null ở 21 hồ sơ cũ, đúng với backward compatibility.
- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd run build`: đạt; vẫn có cảnh báo bundle lớn hơn 500 KB như baseline.
- `pnpm.cmd exec prisma migrate status`: database up to date với 3 migration.
- Sau khi dừng server để giải phóng khóa query engine, `pnpm.cmd exec prisma generate` đã chạy thành công.
- Generated Prisma Client đã nhận model `PersonnelColumn` và trường `Personnel.customFields`.
- Chạy xác nhận lại `pnpm.cmd run lint` và `pnpm.cmd run build`: đều đạt.

#### Vấn đề đã xử lý

- Lần chạy `pnpm.cmd exec prisma generate` đầu tiên bị lỗi Windows `EPERM` khi đổi tên:

```text
prisma/client/query_engine-windows.dll.node.tmp -> prisma/client/query_engine-windows.dll.node
```

Nguyên nhân là query engine bị process Node/server giữ khóa. Sau khi server dừng, lệnh đã chạy thành công.

`prisma migrate dev` không dùng được với user database hiện tại vì Prisma cần tạo shadow database nhưng user không có quyền `CREATE DATABASE`. Đã dùng `prisma migrate diff` để kiểm tra SQL và `prisma migrate deploy` để áp dụng migration chính thức.

#### Quyết định dữ liệu

- Không backfill `customFields` thành `{}` ở database; để null vẫn tương thích và mapper Stage 2 sẽ fallback về object rỗng.
- Cột hệ thống được seed bằng key ổn định như `system-stage-name`; không phụ thuộc vào label tiếng Việt.
- “Xóa cột” vẫn sẽ là archive ở các stage API/UI sau, không xóa record hoặc dữ liệu vật lý.

## 6. Stage 2 — TypeScript types và backend mapper

### Mục tiêu

Đồng nhất model frontend, backend và dữ liệu PostgreSQL.

### Thay đổi dự kiến

Trong `src/types/index.ts`:

```ts
export type PersonnelColumnType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'boolean';

export interface PersonnelColumn {
  id: string;
  key: string;
  label: string;
  type: PersonnelColumnType;
  options?: string[];
  required: boolean;
  isVisible: boolean;
  isActive: boolean;
  sortOrder: number;
  showInRoster: boolean;
  showInProfile: boolean;
  isSystem?: boolean;
}
```

Bổ sung vào `Idol`:

```ts
customFields?: Record<string, string | number | boolean | null>;
```

### Backend

- Cập nhật `mapPersonnelToIdol()`.
- Cập nhật `createIdol()`.
- Cập nhật `updateIdol()`.
- Cập nhật các mapper trong approval.
- Fallback `customFields` về `{}` nếu dữ liệu cũ là `null`.

### Acceptance criteria

- GET nhân sự trả về `customFields` an toàn.
- POST/PUT nhân sự giữ được custom fields.
- Hồ sơ cũ không làm frontend crash.
- Type-check không phát sinh lỗi.

### Kết quả thực hiện Stage 2 — 2026-10-29

#### Đã triển khai

- Bổ sung `PersonnelColumnType`, `PersonnelColumn`, `PersonnelCustomFieldValue` và `PersonnelCustomFields` trong `src/types/index.ts`.
- Bổ sung `Idol.customFields?: PersonnelCustomFields` để frontend nhận dữ liệu cột động theo key ổn định.
- Cập nhật `mapPersonnelToIdol()` trong `server/db/pgStore.ts`:
  - Hồ sơ cũ có `null` được trả về `customFields: {}`.
  - Chỉ giữ các giá trị JSON scalar hợp lệ: string, number, boolean và null.
  - Không để object/array ngoài contract lọt vào frontend.
- Cập nhật `createIdol()` và `updateIdol()` để lưu `customFields` vào `personnel.customFields`.
- Luồng approval tạo nhân sự dùng chung `createIdol()`, vì vậy custom fields trong `approval.data` được giữ lại khi phê duyệt.

#### Kiểm tra đã chạy

- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd run build`: đạt; vẫn có cảnh báo bundle lớn hơn 500 KB như baseline.
- Kiểm tra tĩnh bằng `rg`: generated Prisma Client có `PersonnelColumn`; source có đầy đủ type, mapper, create và update references.
- Server chạy thành công từ terminal ngoài Agent tại `http://0.0.0.0:3000`.
- Browser reload `http://localhost:3000/`: đạt.
- Browser gọi `GET /api/idols/7`: HTTP 200 và trả `customFields: {}`.
- Browser console sau reload: không có error.

#### Vấn đề môi trường đã xử lý

- Agent runtime vẫn có thể gặp `uv_os_get_passwd ENOMEM` khi chạy trực tiếp `tsx`; đây là khác biệt môi trường Node/VS Code, không phải lỗi ứng dụng hoặc migration.
- Runtime verification đã được thực hiện thành công bằng server chạy từ terminal ngoài Agent.

## 7. Stage 3 — API CRUD cột và validation quyền

### Mục tiêu

Cho phép đọc và quản lý cấu hình cột bằng API, có kiểm tra quyền phía server.

### API dự kiến

```http
GET    /api/personnel-columns
POST   /api/personnel-columns
PUT    /api/personnel-columns/:id
DELETE /api/personnel-columns/:id
POST   /api/personnel-columns/:id/restore
PUT    /api/personnel-columns/reorder
```

### Quy tắc API

- GET cho phép các role được xem danh sách nhân sự.
- POST/PUT/DELETE/restore/reorder chỉ Super Admin.
- Không cho tạo key trùng.
- Không cho đổi key sau khi đã có dữ liệu.
- Không cho xóa cột hệ thống.
- Không cho cột `select` có options rỗng.
- Không cho đổi type nếu dữ liệu hiện tại không thể chuyển đổi an toàn.
- Không cho xóa vật lý cột.

### Security

API hiện tại `/api/column-headers` cần được rà soát và bổ sung authorization trong `server.ts`. Không chỉ ẩn nút trên frontend.

### Acceptance criteria

- Super Admin thực hiện được CRUD.
- Người không đủ quyền nhận `403`.
- Key trùng, type sai và cột hệ thống bị xóa đều bị từ chối.
- API trả lỗi rõ ràng, không lộ thông tin nhạy cảm.

### Kết quả thực hiện Stage 3 — 2026-10-29

#### Đã triển khai

- Thêm các API:
  - `GET /api/personnel-columns`
  - `POST /api/personnel-columns`
  - `PUT /api/personnel-columns/:id`
  - `DELETE /api/personnel-columns/:id` — archive mềm
  - `POST /api/personnel-columns/:id/restore`
  - `PUT /api/personnel-columns/reorder`
- Thêm các method tương ứng vào `src/services/api.ts`.
- Bảo vệ mutation bằng kiểm tra `x-user-id` đối chiếu với `userAccount` trên server; chỉ `isSuperAdmin` hoặc role `super_admin` được phép thay đổi.
- Bảo vệ `PUT /api/column-headers` hiện tại bằng cùng cơ chế, đồng thời truyền identity từ `App.tsx` để không phá luồng chỉnh tiêu đề cột cũ.
- Validation:
  - key duy nhất và đúng format.
  - type chỉ gồm `text`, `number`, `date`, `select`, `boolean`.
  - `select` bắt buộc có options; type khác không được có options.
  - không đổi key khi đã có dữ liệu custom field.
  - không đổi key/type hoặc archive cột hệ thống.
  - delete chỉ archive, không xóa vật lý.

#### Kiểm tra đã chạy

- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd run build`: đạt; còn cảnh báo bundle lớn hơn 500 KB như baseline.
- Browser API verification:
  - danh sách active: `200`, đủ 16 cột hệ thống.
  - thiếu identity: `401`.
  - non-Super Admin mutation: `403`.
  - key/type sai: `400`.
  - archive cột hệ thống: `409`.
  - CRUD custom column, archive, restore và archive lại: đạt.
  - sau cleanup database không còn record test, còn 16 cột hệ thống.
- Browser reload sau kiểm thử: đạt, console không có error.

#### Quyết định tương thích

- Hệ thống hiện chưa có session/token server-side; Stage 3 dùng `x-user-id` được server đối chiếu lại với database. Đây là lớp kiểm tra quyền server-side hiện tại, còn hardening session/token sẽ là hạng mục bảo mật riêng nếu triển khai production.

## 8. Stage 4 — Giao diện quản trị cột

### Mục tiêu

Thay modal chỉ đổi tiêu đề bằng màn hình quản lý cột đầy đủ.

### Vị trí

Tạo tab riêng trong `AdminPortalView`:

```text
Cột danh sách nhân sự
```

Giữ `ColumnHeadersModal` cho mục tương thích cột hệ thống nếu cần, hoặc refactor thành màn hình mới.

### Chức năng UI

- Danh sách cột hệ thống.
- Danh sách cột tùy chỉnh.
- Thêm cột.
- Sửa cột.
- Đổi label.
- Chọn type.
- Quản lý options của select.
- Chọn bắt buộc/không bắt buộc.
- Chọn hiển thị ở roster/profile.
- Sắp xếp thứ tự.
- Ngừng sử dụng.
- Khôi phục.
- Preview danh sách nhân sự.

### UX

- Cột hệ thống có badge “Hệ thống”.
- Cột không thể xóa thật.
- Cảnh báo trước khi ngừng sử dụng.
- Hiển thị số nhân sự đang có dữ liệu ở cột.
- Không cho lưu label rỗng.

### Acceptance criteria

- Admin thao tác được trên browser.
- Sau refresh cấu hình vẫn được giữ.
- Cột inactive không xuất hiện trong form mới.
- Cột đã ngừng sử dụng vẫn có thể restore.

### Kết quả thực hiện Stage 4 — 2026-10-29

#### Đã triển khai

- Bổ sung khu vực quản trị cột động trong `AdminPortalView`.
- Tải danh sách cột active/inactive bằng `GET /api/personnel-columns?includeInactive=true`.
- Thêm form tạo/sửa cột với:
  - key bất biến.
  - label.
  - type: text, number, date, select, boolean.
  - options dạng danh sách phân cách bằng dấu phẩy cho select.
  - required, hiển thị ở roster và profile.
- Bổ sung thao tác archive/restore và xác nhận trước khi archive.
- Bổ sung nút sắp xếp lên/xuống qua `PUT /api/personnel-columns/reorder`.
- Cột hệ thống được nhận diện, không cho đổi key/type và không có thao tác archive.
- Giữ nguyên phần chỉnh label các cột hệ thống qua `ColumnHeadersConfig`.

#### Kiểm tra đã chạy

- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd run build`: đạt; còn cảnh báo bundle lớn hơn 500 KB như baseline.
- Browser:
  - Mở tab “Hiển Thị Danh Sách” bằng tài khoản Super Admin.
  - Accessibility tree hiển thị form, bảng cột và các nút thao tác.
  - Tạo thử cột `stage4Probe20261029`, xác minh cột xuất hiện trong bảng.
  - Archive thử qua UI, xác nhận dialog hoạt động và trạng thái thay đổi.
  - Xóa dữ liệu thử sau kiểm tra; database trở lại 16 cột hệ thống.
  - Reload trang quản trị thành công, không thấy lỗi hiển thị.

#### Giới hạn còn lại

- Form nhập giá trị custom field trong hồ sơ nhân sự thuộc Stage 5.
- Bảng roster chưa render custom columns động; thuộc Stage 6.
- Chưa có filter/export theo custom column; thuộc Stage 8 hoặc stage mở rộng sau.

## 9. Stage 5 — Form thêm/sửa nhân sự

### Mục tiêu

Render các field động trong form nhân sự và lưu đúng dữ liệu.

### File chính

- `src/components/IdolModal.tsx`
- Có thể tạo `src/components/CustomPersonnelField.tsx`.

### Mapping UI

| Type | Component |
|---|---|
| `text` | input text hoặc textarea |
| `number` | input number |
| `date` | input date |
| `select` | select |
| `boolean` | checkbox/switch |

### Validation

- Kiểm tra required ở client để phản hồi nhanh.
- Kiểm tra lại ở backend để bảo mật và nhất quán.
- Select chỉ nhận options đã khai báo.
- Number và date phải đúng kiểu.
- Không làm mất custom fields khi sửa trường hệ thống.

### Approval

Custom fields phải đi qua đầy đủ:

- Tạo nhân sự.
- Tạo approval.
- Duyệt approval.
- Từ chối approval.
- Cập nhật hồ sơ.

### Acceptance criteria

- Thêm nhân sự có field động.
- Sửa nhân sự giữ nguyên field chưa chỉnh sửa.
- Validation client/server nhất quán.
- Approval không làm mất custom fields.

### Kết quả thực hiện Stage 5 — 2026-10-29

#### Đã triển khai

- Cập nhật `IdolModal` để tải các cột tùy chỉnh active có `showInProfile=true`.
- Không render lặp các cột hệ thống; các trường hệ thống tiếp tục dùng form chuyên biệt hiện tại.
- Render đúng control theo type:
  - text.
  - number.
  - date.
  - select với options quản trị.
  - boolean.
- Đọc giá trị từ `Idol.customFields` khi chỉnh sửa hồ sơ.
- Gửi `customFields` khi tạo/sửa nhân sự và giữ nguyên các key chưa chỉnh sửa.
- Bổ sung validation required, number, boolean và select ở client trước khi gửi API.
- Luồng approval tạo nhân sự tiếp tục truyền snapshot payload có `customFields`.

#### Kiểm tra đã chạy

- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd run build`: đạt; còn cảnh báo bundle lớn hơn 500 KB như baseline.
- Browser:
  - Mở form “Thêm Nhân Sự / Idol Mới”.
  - Tạo thử cột select `stage5Probe20261029` với options “Độc thân”, “Có gia đình”.
  - Xác minh form hiển thị đúng label và combobox custom.
  - Chọn option “Độc thân” thành công.
  - Đóng form không lưu hồ sơ thử.
  - Xóa cột thử khỏi database; dữ liệu trở lại baseline.
  - Không ghi nhận lỗi runtime trong browser flow.

#### Giới hạn còn lại

- Custom columns chưa được render trong bảng roster; thuộc Stage 6.
- Custom columns chưa được hiển thị trong profile detail; thuộc Stage 7.
- Chưa có server-side validation theo metadata khi create/update; cần bổ sung hardening nếu backend hiện chỉ normalize JSON.

## 10. Stage 6 — Danh sách nhân sự và bộ chọn cột

### Mục tiêu

Chuyển bảng từ render hardcode sang render theo metadata.

### File chính

- `src/views/IdolListView.tsx`
- `src/App.tsx`
- `src/services/api.ts`

### Thay đổi

- Tạo danh sách `systemColumns`.
- Ghép với `customColumns` từ API.
- Render header theo danh sách cột.
- Render cell theo renderer tương ứng.
- Bộ chọn cột lấy danh sách động.
- Sắp xếp theo `sortOrder`.

### Renderer đặc biệt phải giữ lại

- Nghệ danh + ảnh.
- Tuổi tính từ DOB.
- Thâm niên tính từ join date.
- Badge trạng thái.
- Badge phòng ban.
- Cột thao tác.
- Định dạng chiều cao/cân nặng.

### Visibility

Giai đoạn đầu:

- Cấu hình cột chung lưu server.
- Lựa chọn ẩn/hiện cá nhân tiếp tục lưu localStorage.

Giai đoạn sau có thể đưa cấu hình cá nhân lên database nếu cần đồng bộ nhiều thiết bị.

### Acceptance criteria

- Cột mới xuất hiện đúng vị trí.
- Cột bị ẩn không xuất hiện trong bảng.
- Cột hệ thống vẫn hiển thị đúng renderer.
- Refresh không làm mất cấu hình.
- Bảng không lệch header/body.

### Kết quả thực hiện Stage 6 — 2026-10-29

- Hoàn tất tích hợp `PersonnelColumn` vào `IdolListView` và nạp danh sách cột active từ `App` qua `api.getPersonnelColumns()`.
- Cột hệ thống vẫn giữ renderer chuyên biệt; cột tùy chỉnh được ghép theo `sortOrder`, chỉ lấy cột active có `showInRoster` và không trùng cột hệ thống.
- Bộ chọn cột hỗ trợ cột động, lưu lựa chọn hiển thị theo từng trình duyệt bằng `aura_visible_columns_roster`; cột mới nhận mặc định từ `isVisible`.
- Đã hỗ trợ format cơ bản cho custom field: text/select, number, date và boolean; giá trị trống hiển thị `-`.
- Đã xác minh trên browser: tạo cột thử nghiệm, cột xuất hiện trong bộ chọn và header/body; tắt cột làm biến mất đồng bộ header/body; F5 vẫn giữ trạng thái ẩn; sau test đã archive dữ liệu thử.
- `problems` không phát hiện lỗi ở `IdolListView.tsx` và `App.tsx`; `pnpm.cmd run lint` đạt; `pnpm.cmd run build` đạt (chỉ còn cảnh báo bundle lớn vốn có).
- Bổ sung utility thuần và unit test bằng Node test runner cho lọc/sắp xếp cột, merge visibility và format giá trị; `pnpm.cmd run test` đạt 3/3. Test runner có preload riêng để tránh lỗi `uv_os_get_passwd ENOMEM` của runtime agent trên Windows.

## 11. Stage 7 — Hồ sơ chi tiết và approval

### Hồ sơ chi tiết

Trong `IdolDetailModal` thêm vùng:

```text
Thông tin bổ sung
```

Chỉ hiển thị các cột:

- `isActive = true`
- `showInProfile = true`
- Có dữ liệu hoặc được đánh dấu cần hiển thị.

### Phân quyền xem

Cần quyết định và kiểm thử các nhóm:

- Super Admin.
- HR/Kế toán.
- Quản lý phòng ban.
- Người dùng cá nhân.

Các trường nhạy cảm như ghi chú HR, tình trạng hôn nhân hoặc người phụ thuộc không mặc định hiển thị cho tất cả người dùng.

### Approval

Kiểm tra payload snapshot trong:

- `server/db/pgStore.ts`.
- `server.ts`.
- Các component approval trong Admin Portal.

### Acceptance criteria

- Profile hiển thị field động đúng quyền.
- Approval giữ nguyên custom fields.
- Người không đủ quyền không xem được field nhạy cảm.

### Kết quả thực hiện Stage 7 — 2026-10-29

- Hoàn tất vùng `Thông tin bổ sung` trong `IdolDetailModal`; các field active có `showInProfile=true` được lọc theo metadata, sắp xếp theo `sortOrder` và format theo type.
- Kết nối `personnelColumns` từ `App` xuống profile detail; giá trị rỗng hiển thị `-`, không làm trùng các field hệ thống.
- Đã kiểm tra approval snapshot: payload hiện tại đã bao gồm `customFields`, approval flow không ghi đè lên phần dữ liệu này, nên không cần đổi backend cho Stage 7.
- Browser verification: tạo field select thử nghiệm `showInProfile=true/showInRoster=false`, field hiện trong profile và không hiện trong roster; sau đó đã archive field thử và reload để cleanup.
- `pnpm.cmd run lint`, `pnpm.cmd run test` (4/4) và `pnpm.cmd run build` đạt. Build vẫn có warning bundle >500 kB nhưng không có build error.
- Giới hạn: schema chưa có metadata sensitivity/field-level permission. Hiện tất cả người dùng đã có quyền xem profile sẽ thấy field `showInProfile`; phân quyền field nhạy cảm cần stage bảo mật riêng có migration và policy rõ ràng.

## 12. Stage 8 — Rà soát module liên kết

### Lịch

Không thay đổi nhận diện nhân sự dựa trên custom field. Lịch tiếp tục dùng:

- `id`.
- `stageName`.
- `realName`.
- `department`.

### KPI và leaderboard

Không tự động dùng field số làm KPI. Nếu cần liên kết, phải có mapping rõ ràng:

```text
custom field → KPI source
```

### Payroll và payslip

Không dùng custom field để tính lương mặc định. Các trường lương, bảo hiểm và ngân hàng giữ nguyên model chuyên dụng.

### Tài khoản và phân quyền

Custom fields không được phép ghi đè:

- `role`.
- `assignedRole`.
- `allowedTabs`.
- `allowedDepartments`.
- `isSuperAdmin`.

### Search/filter/export

Giai đoạn đầu:

- Cho hiển thị custom columns.
- Chưa bắt buộc filter tất cả custom columns.

Giai đoạn sau có thể bổ sung filter theo text/select/date/number. Nếu có export danh sách nhân sự, phải bổ sung custom columns vào export.

### Acceptance criteria

- Lịch không bị ảnh hưởng.
- KPI không bị cộng nhầm dữ liệu custom.
- Payroll không bị thay đổi.
- Tài khoản và permission không bị ghi đè.
- Search/filter hiện tại vẫn hoạt động.

### Kết quả thực hiện Stage 8 — 2026-10-29

- Thêm `sensitivity` cho `PersonnelColumn` với ba mức `public`, `internal`, `sensitive` và migration `20261029_add_personnel_column_sensitivity`.
- Backend lọc `customFields` trước khi trả roster/profile và giữ nguyên các field không được xem khi cập nhật hồ sơ.
- Quyền mặc định: `public` cho phép hiển thị; `internal` yêu cầu tài khoản; `sensitive` chỉ cho Super Admin, Director hoặc HR.
- Admin Portal cho phép cấu hình mức độ nhạy cảm của từng cột.
- Approval khi duyệt hồ sơ sử dụng viewer của reviewer để không làm mất dữ liệu field được bảo vệ.
- Đã bổ sung test allowed/denied và filter dữ liệu: tổng cộng 6/6 unit test đạt.
- Đã chạy migration, lint, build; build chỉ còn cảnh báo bundle lớn hiện hữu.
- JWT/RBAC, audit log và danh sách role tùy chỉnh vẫn thuộc Stage 10/11, chưa triển khai trong Stage 8.
- Lưu ý bảo mật: policy đã được enforce ở backend nhưng identity hiện vẫn lấy từ `x-user-id`; chưa coi là chống giả mạo cho production cho đến khi Stage JWT hoàn tất.

## 13. Stage 9 — Kiểm thử và migration verification

### Static checks

```bash
pnpm.cmd run lint
pnpm.cmd run build
```

### Database checks

- Migration thành công trên database test.
- Schema đúng với Prisma.
- Dữ liệu cũ không thay đổi.
- Backup phục hồi được.
- Ngừng sử dụng cột không xóa dữ liệu.

### API checks

- GET columns.
- POST column.
- PUT column.
- DELETE/archive column.
- Restore column.
- Reorder columns.
- Permission 403.
- Validation sai type.
- Key trùng.
- Xóa cột hệ thống.

### Browser checks

- Mở tab quản trị cột.
- Thêm cột text.
- Thêm cột select.
- Sửa label.
- Đổi options.
- Ẩn/hiện.
- Sắp xếp.
- Ngừng sử dụng/khôi phục.
- Nhập dữ liệu trong form nhân sự.
- Sửa hồ sơ.
- Xem danh sách.
- Xem profile.
- Refresh.
- Kiểm tra responsive.
- Kiểm tra accessibility tree.
- Kiểm tra browser console.

### Regression checks

- Lịch cá nhân.
- Ma trận lịch.
- KPI.
- Bảng xếp hạng.
- Payroll.
- Payslip.

### Kết quả thực hiện Stage 9 — 2026-10-29

- `pnpm.cmd exec prisma migrate status`: database schema up to date, đủ 4 migration.
- `pnpm.cmd run test`: 6/6 unit test đạt, gồm lọc/sắp xếp/format cột và allowed/denied field-level access.
- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd run build`: đạt; chỉ còn cảnh báo bundle >500 kB vốn có.
- API verification trên browser đạt: unauthenticated `401`, non-Super Admin `403`, key không hợp lệ `400`, create `201`, update `200`, archive `200`, restore `200`, archive cleanup `200`.
- Browser accessibility tree xác nhận Admin Portal có trường chọn “Mức độ nhạy cảm” và cột “Bảo mật”. Sau reload, UI tải lại bình thường; không còn lỗi console từ ứng dụng. Các lỗi console trong lúc test API `401/403/400` là phản hồi kỳ vọng của các ca negative test.
- Dữ liệu test Stage 9 đã được archive/cleanup; migration không thay đổi dữ liệu nhân sự hiện hữu.
- Approval.
- Đăng nhập.
- Phân quyền.

### Acceptance criteria

- Tất cả kiểm thử bắt buộc có kết quả thực tế.
- Không tuyên bố pass nếu chưa chạy.
- Lỗi phát hiện trong browser phải được sửa và retest.

## 14. Stage 10 — Tài liệu và bàn giao

### Tài liệu cập nhật

- `docs/project-state.md`
- `docs/changes/CHANGELOG.md`
- `docs/database/schema.md`
- `docs/security/permission-matrix.md`

### Nội dung cần ghi nhận

- Model `PersonnelColumn`.
- `Personnel.customFields`.
- API CRUD.
- Quyền Super Admin.
- Quy tắc archive thay vì hard delete.
- Các module không sử dụng custom fields tự động.
- Migration và backup.
- Kết quả kiểm thử thực tế.
- Known issues và phần chưa triển khai.

### Acceptance criteria

- Tài liệu khớp với implementation thực tế.
- Có changelog theo từng stage.
- Project state ghi đúng stage cuối cùng.
- Không ghi nhận chức năng chưa triển khai là đã hoàn thành.

### Kết quả thực hiện Stage 10 — 2026-10-29

- Đã đồng bộ `docs/project-state.md`, `docs/changes/CHANGELOG.md`, `docs/database/schema.md` và `docs/security/permission-matrix.md` với implementation thực tế.
- Đã ghi nhận migration `20261029_add_personnel_dynamic_columns` và `20261029_add_personnel_column_sensitivity`, model `PersonnelColumn`, `Personnel.customFields`, API CRUD, archive/restore và server-side filtering.
- Đã ghi rõ giới hạn: JWT/RBAC chuẩn hóa, audit log và field-level role tùy chỉnh chưa triển khai; `x-user-id` chưa đủ an toàn cho production.
- Đã cập nhật bảng trạng thái và lịch sử stage; không ghi nhận các hạng mục JWT/audit là đã hoàn thành.

## 15. Rủi ro và phương án xử lý

| Rủi ro | Ảnh hưởng | Phương án |
|---|---|---|
| Dùng label làm key | Đổi tên làm mất dữ liệu | Dùng key bất biến |
| Xóa vật lý cột | Mất dữ liệu nhân sự | Archive/restore |
| Chỉ kiểm tra quyền ở UI | Người dùng gọi API trực tiếp | Server-side authorization |
| Render toàn bộ như text | Hỏng ảnh, tuổi, trạng thái, thao tác | Renderer riêng cho cột hệ thống |
| Custom field tự tham gia KPI/lương | Sai nghiệp vụ | Không tự động mapping |
| Migration lỗi | Gián đoạn hệ thống | Backup và test database trước |
| Cột select đổi options | Dữ liệu cũ không còn hợp lệ | Cảnh báo và giữ giá trị cũ |
| Người dùng thường xem dữ liệu nhạy cảm | Rủi ro riêng tư | Visibility theo role/field |

## 16. Điều kiện bắt đầu triển khai

Trước khi bắt đầu Stage 1 cần xác nhận:

- Đồng ý mô hình cột hệ thống + cột tùy chỉnh.
- Đồng ý archive thay vì xóa vật lý.
- Đồng ý lưu giá trị trong `Personnel.customFields`.
- Đồng ý chỉ Super Admin quản lý cấu hình cột.
- Cho phép tạo migration PostgreSQL.
- Có backup hoặc phương án phục hồi database.

## 17. Quy trình cập nhật file này

Sau mỗi stage:

1. Cập nhật trạng thái trong bảng `Trạng thái triển khai`.
2. Ghi ngày hoàn thành.
3. Ghi các file/module thực tế đã thay đổi.
4. Ghi lệnh kiểm thử đã chạy.
5. Ghi lỗi, giới hạn hoặc quyết định phát sinh.
6. Chỉ chuyển sang stage tiếp theo khi acceptance criteria của stage hiện tại đạt.

## 18. Lịch sử cập nhật kế hoạch

| Ngày | Nội dung |
|---|---|
| 2026-10-29 | Tạo kế hoạch triển khai cột nhân sự động sau khi rà soát frontend, backend, Prisma, API và phân quyền. |
| 2026-10-29 | Hoàn tất Stage 0: xác nhận PostgreSQL baseline, kiểm kê module liên quan, xác nhận 2 migration hiện có và tạo backup `backups/stage0-pre-dynamic-columns-20261029.sql`. |
| 2026-10-29 | Hoàn tất Stage 1: thêm `personnel.customFields`, tạo `personnel_columns`, seed 16 cột hệ thống, áp dụng migration và generate lại Prisma Client sau khi dừng server. |
| 2026-10-29 | Hoàn tất Stage 2: bổ sung TypeScript contract và PostgreSQL mapper/create/update cho `customFields`; runtime GET và browser reload đã xác minh thành công bằng server chạy từ terminal ngoài Agent. |
| 2026-10-29 | Hoàn tất Stage 3: thêm API CRUD/restore/reorder cho `personnel_columns`, validation, archive mềm và kiểm tra quyền Super Admin; browser API verification đạt. |
| 2026-10-29 | Hoàn tất Stage 4: thêm UI quản trị cột động trong `AdminPortalView`, form CRUD, archive/restore, reorder, xác nhận browser và cleanup dữ liệu thử. |
| 2026-10-29 | Hoàn tất Stage 5: tích hợp custom fields vào `IdolModal`, render theo type, validation client, giữ dữ liệu khi sửa và xác minh browser với select field. |
| 2026-10-29 | Hoàn tất Stage 6: roster render cột động theo metadata, bộ chọn cột động, format giá trị theo type, giữ renderer hệ thống, kiểm tra browser và cleanup dữ liệu thử. |
| 2026-10-29 | Bổ sung unit test Stage 6 bằng Node test runner cho các utility cột động; 3/3 test đạt, thêm preload test-only xử lý giới hạn `uv_os_get_passwd ENOMEM` của runtime agent. |
| 2026-10-29 | Hoàn tất Stage 7: profile detail render field động, kiểm tra approval snapshot, browser verification, unit test 4/4, lint/build và cleanup field thử nghiệm; ghi nhận field-level permission là hạng mục bảo mật tiếp theo. |
| 2026-10-29 | Hoàn tất Stage 10: đồng bộ plan, project state, changelog, database schema, permission matrix và ghi nhận các giới hạn hiện tại; JWT/RBAC và audit logging chưa được đánh dấu hoàn thành. |

## 19. Stage 11 — Chuyển đổi xác thực sang JWT (Kế hoạch bổ sung)

### Trạng thái

**Stage 11A–11E đã triển khai. Stage 11E đã bổ sung authorization policy tập trung, kiểm thử production enforcement và cập nhật tài liệu. Prisma engine replacement vẫn cần được hoàn tất sau khi dừng process đang khóa file.**

Stage này là hạng mục bảo mật độc lập, nhưng phải hoàn tất trước khi đưa các API quản trị cột vào production. Migration [20261029_add_personnel_dynamic_columns/migration.sql](./prisma/migrations/20261029_add_personnel_dynamic_columns/migration.sql) không cần sửa cho JWT.

### Mục tiêu

- Thay cơ chế gửi `x-user-id` tùy ý bằng xác thực token có chữ ký.
- Bảo vệ server cho login, refresh, logout và các API yêu cầu quyền.
- Giữ nguyên permission model hiện tại: `role`, `isSuperAdmin`, `allowedTabs`, `allowedActions`.
- Không làm mất phiên đăng nhập hoặc dữ liệu khi chuyển đổi.

### Thiết kế đề xuất

- Access token JWT ngắn hạn 10–15 phút; refresh token 7–30 ngày và có rotation.
- Claim tối thiểu: `sub`, `jti`, `iss`, `aud`, `iat`, `exp`; không nhét password, custom fields hoặc permission snapshot dễ lỗi thời.
- Refresh token lưu trong cookie `HttpOnly`, `Secure` khi production, `SameSite` phù hợp deployment; không lưu refresh token trong `localStorage`.
- Chỉ lưu bản băm refresh token trong database; logout/revoke phải vô hiệu hóa được session.
- Permission nhạy cảm và `isSuperAdmin` vẫn đối chiếu lại từ database ở endpoint quan trọng, không tin hoàn toàn claim cũ.
- JWT secret, issuer, audience và TTL lấy từ environment; không hardcode hoặc ghi secret vào tài liệu/log.

### Phạm vi module và file dự kiến

1. **Khảo sát auth hiện tại**
   - `server.ts`: login, user APIs, `requireSuperAdmin`, các route đang dùng `x-user-id`.
   - `server/db/pgStore.ts`: `authenticate`, `getUsers`, mapping user và password hiện có.
   - `src/services/api.ts`, `src/App.tsx` và auth state/localStorage: login, reload, fetch, logout.
   - `prisma/schema.prisma` và migration: xác định có cần thêm `auth_sessions` hay không.

2. **Password security**
   - Xác minh password hiện đang lưu plaintext hay hash.
   - Nếu plaintext, thêm hash an toàn và migration/dual-read có kiểm soát; không ghi password vào log/tài liệu.
   - Login thành công chỉ trả user an toàn, không trả password.

3. **JWT backend**
   - Thêm dependency JWT và utility ký/verify token.
   - Validate environment khi khởi động; production thiếu secret/issuer/audience phải fail fast.
   - Thêm middleware `authenticate` và `requireSuperAdmin` dùng identity từ token.
   - Bổ sung login trả access token, refresh rotation, logout revoke và endpoint identity/me.
   - Nếu cần revoke/rotation server-side, thêm `auth_sessions` với index theo user, token hash, expires và revoked.

4. **Frontend auth client**
   - Request API gửi access token qua `Authorization: Bearer ...`.
   - Khi nhận 401, refresh một lần rồi retry; refresh thất bại thì xóa auth state và đưa về login.
   - Không cho UI tiếp tục gửi `x-user-id` để bypass server.
   - Reload browser khôi phục user qua refresh/me, không tin user object trong localStorage là identity đã xác thực.

5. **Bảo vệ API và chuyển đổi**
   - Đưa các API `personnel-columns`, `column-headers` và các route có user/permission vào middleware chung.
   - Phân loại rõ public, authenticated và Super Admin.
   - Giai đoạn chuyển tiếp có thể giữ `x-user-id` chỉ trong dev nếu được confirm; production phải từ chối header này sau JWT rollout.

### Database impact

- Không thay đổi `personnel_columns` hoặc `Personnel.customFields`.
- Nếu dùng refresh/revoke server-side, thêm migration `auth_sessions` và backup trước khi migrate.
- Giữ nguyên dữ liệu user, role và permission.
- Có rollback schema; khi rollback auth contract phải revoke toàn bộ token cũ.

### Security impact

- Giảm rủi ro user spoofing qua `x-user-id`.
- Phát sinh rủi ro cần xử lý: XSS/token theft, CSRF nếu auth bằng cookie, secret rotation, token expiry, clock skew, stale permission claim và refresh token reuse.
- Production yêu cầu HTTPS, CORS chỉ cho origin được phép, cookie flags đúng và không log token/password.
- Login, refresh và logout nên có rate limit và audit log phù hợp.

### Kiểm thử và acceptance criteria

- Login đúng trả access token và refresh cookie; login sai bị từ chối.
- Thiếu token, token sai chữ ký, expired, issuer/audience sai đều trả `401`.
- User thường không gọi được API Super Admin và nhận `403`.
- Token user A không dùng để thao tác dữ liệu/permission của user B.
- Refresh rotation hoạt động; refresh token dùng lại bị revoke/fail.
- Logout làm refresh token không còn dùng được.
- Reload browser không nhảy sang user sai và khôi phục session hợp lệ.
- `x-user-id` không còn là nguồn identity trong production.
- Chạy `pnpm.cmd run lint`, `pnpm.cmd run build`, auth API tests, browser E2E và regression cho nhân sự, lịch, KPI, payroll, payslip, approval.

### Phân stage nhỏ khi triển khai

- **11A — Design & inventory:** chốt token storage, TTL, cookie/CORS/CSRF, password strategy và route matrix; chưa đổi code.
- **11B — Password/session foundation:** hash password, migration `auth_sessions` nếu chọn, env validation và backup.
- **11C — Backend auth:** login/refresh/logout/me, JWT middleware, route protection, revoke/rotation.
- **11D — Frontend migration:** API interceptor, refresh/retry, reload, logout và xóa `x-user-id`.
- **11E — Verification & rollout:** security/API/browser/regression tests, rollout dev → staging → production và rollback runbook.

### Quyết định cần confirm trước khi code

- Chọn access token trong memory + refresh cookie HttpOnly, hay cookie cho cả hai token.
- Xác nhận password hiện tại có plaintext không và có cho phép migration hash trong cùng stage không.
- Chọn database session để revoke/rotation hay JWT stateless có blacklist.
- Xác nhận domain production, HTTPS, CORS và quy tắc SameSite.
- Xác nhận có cho phép tương thích `x-user-id` trong dev trong giai đoạn chuyển tiếp không.

### Tác động tóm tắt

| Khu vực | Tác động |
|---|---|
| Backend | Thêm middleware, token lifecycle, route matrix và error handling. |
| Frontend | Thay header identity, thêm refresh/retry và auth state sau reload. |
| Database | Có thể thêm `auth_sessions`; không ảnh hưởng custom columns. |
| Security | Giảm spoofing nhưng cần xử lý XSS, CSRF, token theft và rotation. |
| Vận hành | Cần secret management, HTTPS, clock sync, monitoring và rollback. |
| Kiểm thử | Bổ sung auth negative tests và regression toàn bộ API. |

| 2026-10-29 | Bổ sung Stage 11: kế hoạch chuyển authentication từ `x-user-id` sang JWT, gồm password/session, backend middleware, frontend refresh, security impact và acceptance criteria; chưa triển khai. |
| 2026-10-29 | Hoàn tất Stage 8: thêm sensitivity cho cột nhân sự, lọc customFields ở backend, cấu hình mức bảo mật trong Admin Portal, migration và test allowed/denied; JWT/RBAC vẫn là hạng mục tiếp theo. |
| 2026-10-29 | Hoàn tất Stage 9: migration status, unit test 6/6, lint/build, API positive/negative verification, browser accessibility/reload/console check và cleanup dữ liệu thử nghiệm. |
| 2026-10-29 | Hoàn tất Stage 11A: kiểm kê authentication, chốt token/session strategy, password migration direction, CSRF/CORS assumptions và route matrix; chưa thay đổi runtime, schema, dependency hoặc migration. |
| 2026-10-29 | Stage 11B triển khai phần lớn: thêm scrypt password hashing, hash 19 tài khoản, thêm/applied `auth_sessions` migration, test 8/8; Prisma Client regeneration bị chặn tạm thời bởi process Node đang khóa query engine, session runtime để Stage 11C. |
| 2026-10-29 | Hoàn tất phần backend Stage 11C: access JWT, refresh rotation/revoke, auth middleware, login/refresh/logout/me và browser verification; frontend interceptor và full action route matrix để Stage 11D. |
| 2026-10-29 | Hoàn tất Stage 11D: frontend auth wrapper, Bearer token, refresh/retry, reload recovery, logout revoke, loại bỏ `x-user-id` và browser verification; Stage 11E còn lại cho security regression/rollout. |
| 2026-10-29 | Hoàn tất Stage 11E: centralized route authorization cho `allowedActions`/Super Admin, unit test 12/12, production smoke test `401/200/400` và cập nhật JWT/RBAC route matrix, project state, changelog. |
