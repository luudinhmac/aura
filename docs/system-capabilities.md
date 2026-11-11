# Aura Talent Management — Năng lực và nghiệp vụ hệ thống

## CI/CD triển khai

- MR chỉ đổi tệp phi-runtime (`docs/`, Markdown ở thư mục gốc, `prisma/migrations-archive/`, `.agents/`, `.vscode/`, `.gitignore`, `.gitattributes`, `metadata.json`) chạy job `docs_only` nhẹ (`interruptible: true`) để giữ điều kiện merge; MR có ít nhất một file khác chạy `verify` (`interruptible: true`). Push lên `main` lọc ngay ở `workflow:rules` để chỉ tạo pipeline (`verify` → `deploy_staging` → `deploy_production` manual, các job deploy khóa `interruptible: false`) khi có thay đổi ngoài phạm vi phi-runtime hoặc khi chạy thủ công qua `web` (**Run pipeline**). Push chỉ sửa tệp phi-runtime không tạo pipeline/deploy mới; production vẫn phải duyệt từ pipeline ứng dụng đã kiểm thử trên staging.
- Pipeline trên `main` kiểm tra mã nguồn trước khi tự triển khai staging; production là job thủ công sau khi staging đạt. Job deploy dùng SSH file variables và giới hạn quyền file private key ở `0600` trước khi kết nối; không tắt xác minh host key.
- Nginx production nối cả mạng ứng dụng production và mạng staging, định tuyến `staging.aura.com` thẳng tới alias `staging-app:3000`. App staging vẫn chỉ publish `127.0.0.1:13001` cho health check trên VM. Trước khi cập nhật Nginx đang chạy, CI kiểm tra cấu hình trong container tạm nối cả hai mạng để phân giải đúng cả hai upstream.
- Ngày 10/11/2026, pipeline `3050392360` đã triển khai thành công staging ở commit `153a748`; HTTPS của staging và production đều trả 200. Production deploy vẫn là job manual, chưa được kích hoạt.
- Script đồng bộ dữ liệu JSON local chỉ ghi dữ liệu mặc định vào `server/data/db.json`; không tạo kết nối Prisma/PostgreSQL khi chạy. Đây không phải bước trong pipeline deploy.

## Hiển thị đồng hồ trên dashboard

- Dashboard cá nhân theo vai trò và dashboard Idol hiển thị ngày cùng giờ hệ thống theo định dạng `DD/MM/YYYY HH:mm`, múi giờ `Asia/Ho_Chi_Minh` và đồng hồ tham chiếu đang cấu hình.
- Đồng hồ trên dashboard tự làm mới định kỳ và khi tab được hiển thị lại; không ghi dữ liệu vào DB chỉ để cập nhật giao diện.

## Đồng hồ ngày tham chiếu

- Khi cấu hình ngày tham chiếu để kiểm thử, đồng hồ giả lập bắt đầu từ ngày đã chọn và giờ tại lúc lưu (hoặc giờ cấu hình); hệ thống lưu mốc neo một lần rồi tính thời gian đã trôi qua, vì vậy ngày tự tăng qua nửa đêm mà không ghi DB định kỳ. Múi giờ nghiệp vụ là `Asia/Ho_Chi_Minh`.
- PostgreSQL lưu mốc neo tại `app_settings.referenceClockAnchorAt`, kiểu `TIMESTAMP(3)` nullable (giá trị được xử lý theo UTC); migration `20261105_continuous_reference_clock` thêm cột và backfill cấu hình có ngày tham chiếu.
- Các API chỉ sử dụng đồng hồ liên tục khi migration `20261105_continuous_reference_clock` đã được áp dụng. Trước migration, backend dùng hành vi thời gian tương thích cũ để không làm hỏng các môi trường triển khai theo thứ tự code trước schema.
- Phần cài đặt phân biệt ngày mốc bắt đầu với ngày hệ thống hiệu lực đã lưu; ngày hiệu lực tự cập nhật theo đồng hồ liên tục, còn thay đổi ngày mốc chưa lưu chỉ là bản nháp và chưa tác động đến hệ thống.
- Khi người dùng tương tác với lựa chọn ngày/mốc rồi lưu, đồng hồ bắt đầu lại tại thời điểm lưu: xóa giờ `referenceTime` cũ và tạo `referenceClockAnchorAt` mới, kể cả khi ngày cuối cùng trùng ngày cũ. Cùng nút lưu còn lưu thương hiệu; nếu chỉ sửa thương hiệu mà không chạm điều khiển ngày thì đồng hồ không reset. Cờ reset chỉ tồn tại trong request, không được lưu thành trường cấu hình hoặc cần migration mới.

### Tìm kiếm trong danh sách lựa chọn

Các bộ chọn có danh sách Idol và nhóm dài trong giao nhiệm vụ, lịch làm việc và thiết lập KPI hỗ trợ nhập từ khóa để lọc nhanh theo tên hiển thị; danh sách Idol còn khớp theo họ tên, phòng ban và vai trò. Tìm kiếm không phân biệt dấu tiếng Việt. Các bộ chọn trạng thái và enum ngắn vẫn giữ dạng chọn hiện tại.

## Mục đích và phạm vi

Đây là hồ sơ chuẩn ghi nhận các chức năng, nghiệp vụ và các nguyên tắc đang được triển khai trong Aura Talent Management. Nội dung được đối chiếu từ mã nguồn frontend, backend, Prisma schema, migration và các kiểm thử hiện có; không coi một ý tưởng trong hội thoại hoặc tài liệu kế hoạch là chức năng đã hoàn thành.

Mọi thay đổi về chức năng, nghiệp vụ, dữ liệu, quyền hoặc cấu hình phải cập nhật tài liệu này trong cùng lần thay đổi mã nguồn. Lịch sử thay đổi chi tiết được ghi tại [CHANGELOG](./changes/CHANGELOG.md), còn trạng thái và các quyết định đang theo dõi nằm tại [project-state](./project-state.md).

| Thông tin | Giá trị |
|---|---|
| Ngày rà soát | 2026-11-02 |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Express, TypeScript, Prisma |
| Cơ sở dữ liệu | PostgreSQL; có chế độ store phù hợp môi trường kiểm thử |
| Package manager chuẩn | pnpm |
| Điểm vào chính | [`src/App.tsx`](../src/App.tsx), [`server.ts`](../server.ts) |
| Schema dữ liệu | [`prisma/schema.prisma`](../prisma/schema.prisma) |

## Trạng thái triển khai

| Nhóm | Ý nghĩa |
|---|---|
| Đã triển khai | Có giao diện/API và logic dữ liệu tương ứng trong mã nguồn hiện tại. |
| Đã triển khai một phần | Có model hoặc luồng cơ bản nhưng còn giới hạn theo vai trò, môi trường hoặc nghiệp vụ. |
| Đang đề xuất | Chưa được xem là hành vi có thể sử dụng cho đến khi có mã nguồn, kiểm thử và cập nhật tài liệu. |
| Hạn chế đã biết | Vấn đề môi trường, dữ liệu demo, migration hoặc phạm vi hiện tại cần được nêu rõ khi nghiệm thu. |

## Kiến trúc chức năng

### Frontend

- [`src/views/`](../src/views/) chứa các màn hình theo nghiệp vụ: hồ sơ, dashboard, lịch, công việc, KPI, lương, tài chính và quản trị.
- [`src/components/`](../src/components/) chứa modal, bảng, bộ lọc, thanh điều hướng, phân quyền, payroll và các thành phần giao việc.
- [`src/services/api.ts`](../src/services/api.ts) là lớp gọi API dùng chung.
- [`src/utils/`](../src/utils/) chứa các hàm định dạng, tính toán và quy tắc dùng lại.

### Backend

- [`server.ts`](../server.ts) đăng ký route, xác thực, kiểm tra quyền, xử lý nghiệp vụ và khởi động server.
- [`server/auth/`](../server/auth/) xử lý session/token và thông tin tài khoản.
- [`server/db/pgStore.ts`](../server/db/pgStore.ts) là lớp truy cập PostgreSQL.
- [`server/data/`](../server/data/) chứa dữ liệu cấu hình/seed dùng cho các luồng phù hợp.

### Dữ liệu và kiểm soát thay đổi

- Prisma schema và migrations là nguồn chuẩn của cấu trúc dữ liệu.
- Các nghiệp vụ nhạy cảm như quyền, lương, chấm điểm, phạt và duyệt phải được kiểm tra ở server; trạng thái trên UI không được xem là bằng chứng bảo mật.
- Dữ liệu demo hoặc store kiểm thử không đại diện cho dữ liệu production.

## Các nhóm chức năng và nghiệp vụ hiện có

### 1. Hồ sơ nhân sự, Idol và tài khoản

Màn hình liên quan: [`IdolListView.tsx`](../src/views/IdolListView.tsx), [`IdolDashboardView.tsx`](../src/views/IdolDashboardView.tsx) và các modal hồ sơ.

- Quản lý hồ sơ nhân sự/Idol, nghệ danh, thông tin liên hệ, phòng ban, nhóm và chức danh.
- Phân loại cán bộ/vận hành và Idol/nghệ sĩ; hỗ trợ loại nhân sự tùy chỉnh.
- Gắn tài khoản đăng nhập với hồ sơ; đồng bộ tài khoản và hiển thị trạng thái tài khoản.
- Quản lý cột dữ liệu tùy chỉnh, hoạt động nhân sự, loại hoạt động và lịch sử lương.
- Hiển thị phạm vi nhân sự theo quyền và đơn vị được cấp.
- Không xóa cứng hồ sơ nhạy cảm nếu còn ràng buộc nghiệp vụ; các luồng xóa phải kiểm tra quan hệ và có xác nhận.

API chính: `personnel`, `idols`, `users`, `personnel-column`, `personnel-activity-type`, `personnel-activity`, `salary-history`.

### 2. Dashboard theo vai trò

Màn hình chính: [`RoleDashboardView.tsx`](../src/views/RoleDashboardView.tsx) và [`IdolDashboardView.tsx`](../src/views/IdolDashboardView.tsx).

- Dashboard thay đổi theo vai trò và phạm vi dữ liệu của người đăng nhập.
- Hiển thị nhanh lịch, nhiệm vụ, KPI, lương, nghỉ phép, phản ánh bảng lương, giao công tác và cảnh báo dữ liệu.
- Nhân sự/Idol có thể gửi nghỉ phép, xem lịch/nhiệm vụ, phản hồi công việc được giao và truy cập nội dung liên quan từ các lối tắt.
- Quản lý có thể xem các yêu cầu, giao việc/giao công tác và theo dõi trạng thái người thực hiện.
- Các chỉ số phải được tính từ dữ liệu nghiệp vụ; không dùng số hardcode để mô tả trạng thái thực tế.

### 3. Lịch làm việc, ca live và nhiệm vụ

Màn hình: [`WorkScheduleView.tsx`](../src/views/WorkScheduleView.tsx), [`TaskManagementView.tsx`](../src/views/TaskManagementView.tsx).

- Tạo, sửa, xóa, gán lịch/ca cho nhân sự hoặc Idol; hỗ trợ lịch lặp, thao tác theo ngày và ma trận lịch.
- Theo dõi ca live, giờ công, trạng thái thực hiện và các lịch đã gán.
- Tạo nhiệm vụ, giao người thực hiện, quản lý trạng thái, thời hạn và nhiệm vụ con.
- Nút hoàn thành công việc bị khóa trước ngày/giờ được phép hoàn thành để tránh đánh dấu hoàn thành sớm.
- Thay đổi lịch phải giữ đúng múi giờ và quy tắc ngày của hệ thống.

API chính: `schedules`, `tasks`, `subtasks`, `personnel-tasks`.

### 4. Giao công tác / công việc đặc biệt

Thành phần chính: [`WorkAssignmentPanel.tsx`](../src/components/WorkAssignmentPanel.tsx), [`WorkAssignmentModal.tsx`](../src/components/WorkAssignmentModal.tsx).

- Quản lý/giám đốc có thể giao công tác hoặc công việc cho nhiều nhân sự/Idol trong phạm vi quyền.
- Giao việc có loại, mô tả, địa điểm, thời gian bắt đầu/kết thúc, hạn chấp nhận, người giao và người thực hiện.
- Phân biệt công việc bắt buộc và không bắt buộc. Công việc không bắt buộc có thể từ chối kèm lý do; công việc bắt buộc được xử lý theo mức phạt đã cấu hình.
- Cho phép sửa người thực hiện trước thời điểm bắt đầu; quản lý có thể hủy công tác kèm lý do trước `endAt`. Nút hủy tự ẩn khi đồng hồ hệ thống đạt hoặc vượt `endAt`; công việc không có thời điểm kết thúc hợp lệ giữ hành vi hiện tại.
- Hỗ trợ tính giờ công đặc biệt theo giờ cơ bản và các hệ số tăng ca; công tác nhiều ngày được tính theo tổng giờ, có quy tắc nghỉ bù cho cả chuyến đi.
- Công tác có thể bỏ qua lịch cố định trong thời gian hiệu lực; ngày công tác được loại khỏi mục tiêu KPI phù hợp để không làm giảm KPI vì nhiệm vụ được giao.
- Có luồng phản hồi trước hạn và giải trình sau hạn; trước hạn người được giao có thể xin đổi người/thông báo không tham gia mà không tự phát sinh phạt.
- Có luồng xin miễn/giảm phạt, giám đốc, người giao việc hoặc Manager có quyền quản lý phê duyệt trong phạm vi được server kiểm tra; ủy quyền tự hết hạn.
- Giám đốc có thể chọn tài khoản được ủy quyền trong danh sách tài khoản đang được nạp cho màn hình giao việc; danh sách không bị giới hạn bởi quyền Super Admin.
- Người thực hiện nhìn thấy cấu hình phạt và số tiền dự kiến trước khi quyết định; phần trăm lương được tính theo lương hợp đồng của đúng người được assign. Màn hình quản lý hiển thị số dự kiến riêng cho từng người và không dùng lương của tài khoản đang xem.
- Giao diện phân biệt rõ mức phạt cấu hình với khoản phạt thực tế: mức phạt chỉ phát sinh khi có vi phạm được xác nhận.
- Trên dashboard Idol, định mức phạt cũng được ẩn khi chính Idol đó đã hoàn thành công tác; nếu công tác còn mở thì vẫn hiển thị quy định áp dụng. Dashboard quản lý có thể tiếp tục thấy định mức chung để đối chiếu.
- Thẻ công tác hiển thị đầy đủ thời gian bắt đầu–kết thúc theo `Asia/Ho_Chi_Minh`; định mức phạt chung được trình bày tách khỏi kết quả mỗi người. Người đã hoàn thành/hủy không thấy mức phạt có thể phát sinh; khoản đã xác nhận chỉ hiển thị tiền thực tế; trạng thái đang xem xét/giải trình không kèm ước tính. Người chưa có kết quả cuối cùng thấy mức có thể áp dụng được ghi rõ là có điều kiện.
- Chỉ ghi nhận phạt sau khi có điều kiện vi phạm và quyết định/luồng phê duyệt phù hợp; không cho phép người dùng tự sửa trạng thái để né phạt.

API/model chính: `work-assignments`, `WorkAssignment`, `WorkAssignmentAssignee`, `WorkAssignmentApprovalDelegation`.

### 5. Nghỉ phép, yêu cầu và thông báo

- Mọi hồ sơ nhân sự đủ điều kiện đều có luồng gửi, theo dõi và xem kết quả nghỉ phép.
- Hỗ trợ loại phép, khoảng thời gian, lý do, số ngày và tự động phê duyệt đối với chính sách được cấu hình.
- Quản lý xử lý yêu cầu trong phạm vi; kết quả phê duyệt/từ chối được gắn với người gửi.
- Các sự kiện cần chú ý (lịch, nhiệm vụ, nghỉ phép, phản ánh, giao việc) có thể hiển thị trong trung tâm thông báo và dẫn tới màn hình chi tiết tương ứng khi luồng thông báo được bật.

API chính: `leave-requests`, `approvals`; thông báo hiện được tổng hợp ở ứng dụng từ các nguồn dữ liệu liên quan và lưu trạng thái đã đọc phía trình duyệt.

### 6. Đánh giá, KPI và xếp hạng

Màn hình: [`ScoringSheetView.tsx`](../src/views/ScoringSheetView.tsx), [`KpiSettingsView.tsx`](../src/views/KpiSettingsView.tsx), [`LeaderboardView.tsx`](../src/views/LeaderboardView.tsx).

- Cấu hình tiêu chí, nhóm KPI, trọng số, chỉ tiêu hoạt động và chu kỳ đánh giá.
- Nhập/chấm điểm, lưu chi tiết điểm, tổng hợp điểm KPI và xếp hạng.
- Theo dõi KPI vận hành từ dữ liệu ca live, lịch, nhiệm vụ hoặc metric đã cấu hình.
- Khi chưa có lịch hoặc chỉ tiêu hoạt động, dashboard phải hiển thị `0/0`, không tự hiển thị mục tiêu mặc định như `60h`.
- Khi công tác được duyệt trong ngày làm việc, mục tiêu giờ live/KPI được điều chỉnh theo thời gian bị thay thế; công tác không bị tính là giờ thiếu do không live.
- Quy đổi thưởng KPI được tách khỏi dữ liệu chấm điểm và phải có cấu hình rõ ràng.

API chính: `criteria`, `scores`, `kpi-groups`, `kpi-settings`, `operational-metrics`, `kpi`.

### 7. Payroll, thuế và phản ánh bảng lương

Màn hình: [`PayrollManagementView.tsx`](../src/views/PayrollManagementView.tsx), [`PayrollDisputesView.tsx`](../src/views/PayrollDisputesView.tsx).

- Tạo kỳ lương, đồng bộ hồ sơ, tính lương theo công, ca, KPI, thưởng, hoa hồng, phụ cấp và các khoản khấu trừ.
- Khi sang tháng mới, tự tạo kỳ lương của tháng liền trước nếu chưa tồn tại; các mốc lịch ngày được chuyển thành `DateTime` UTC trước khi ghi qua Prisma, đồng thời API vẫn trả về ngày dạng ISO date-only.
- Tự động tính lại thuế TNCN khi thay đổi KPI hoặc các khoản thu nhập/khấu trừ liên quan.
- Theo dõi bảo hiểm, tạm ứng, lương thực nhận, lịch sử lương và snapshot kỳ lương.
- Có luồng gửi, tiếp nhận, xử lý và đóng phản ánh; trước khi đóng phải hiển thị thay đổi trước/sau điều chỉnh, tổng tiền lương sau điều chỉnh và lý do xử lý.
- Phần giờ/hệ số từ giao công tác phải đi vào dữ liệu tính lương theo cấu hình, không tính trùng lịch cố định.
- Có các trạng thái dự thảo, chờ duyệt, đã duyệt và khóa kỳ; sau khi khóa không sửa trực tiếp dữ liệu đã chốt.

API chính: `payrolls`, `payroll-records`, `payroll-disputes`, `payroll-sync`, `payroll-adjust`, `payroll-submit`, `payroll-approve`, `payroll-lock`.

### 8. Doanh thu, chi phí và tài chính

Màn hình: [`RevenueManagementView.tsx`](../src/views/RevenueManagementView.tsx), [`FinanceManagementView.tsx`](../src/views/FinanceManagementView.tsx).

- Quản lý danh mục doanh thu, nền tảng, giao dịch doanh thu, khoản khấu trừ và chi phí công ty.
- Theo dõi tổng hợp doanh thu, chi phí, lợi nhuận và dữ liệu phục vụ kỳ lương.
- Có quyền và trạng thái phù hợp cho các thao tác tài chính nhạy cảm.

API chính: `revenue`, `revenue-categories`, `revenue-platforms`, `revenue-transactions`, `company-expenses`, `finance`.

### 9. Phê duyệt nhân sự & nghỉ phép

Màn hình: [`ApprovalCenterView.tsx`](../src/views/ApprovalCenterView.tsx).

- Tách riêng khỏi `Quản Trị Hệ Thống` thành phân hệ độc lập (`'approvals'`) nằm trong nhóm điều hướng `Hồ Sơ` trên cả `AppSidebarShell` và `Navbar`.
- Gồm 2 sub-tab nghiệp vụ: `Duyệt Nghỉ Phép` (phân cấp tự động / trưởng phòng / Giám Đốc theo số ngày nghỉ) và `Duyệt Yêu Cầu` (thêm/cập nhật/xóa hồ sơ nhân sự từ cấp dưới).
- Cho phép cấp quyền riêng qua tab permission `'approvals'` (`Phê Duyệt Nhân Sự & Nghỉ Phép`) hoặc hành động `manage_approvals` / vai trò `director` mà không mở quyền vào `Quản Trị Hệ Thống` (`'admin'`).

### 10. Quản trị hệ thống, đơn vị và phân quyền

Màn hình: [`AdminPortalView.tsx`](../src/views/AdminPortalView.tsx), [`AdminAuditLogPanel.tsx`](../src/components/AdminAuditLogPanel.tsx).

- Chỉ chứa 8 tab quản trị hệ thống chia thành 3 nhóm (`1. Tài khoản & Bảo mật`: `Tài Khoản & RBAC`, `Nhật Ký Hệ Thống`; `2. Danh mục & Tổ chức`: `Cơ Cấu Đơn Vị`, `Loại Nhân Sự`, `Trạng Thái`, `Hiển Thị Cột & Trường`; `3. Cấu hình & Đánh giá`: `Tiêu Chí Đánh Giá`, `Thiết Lập Hệ Thống`).
- Quản lý phòng ban cấp 1, nhóm/team trực thuộc, loại nhân sự, trạng thái, tiêu chí và thiết lập hệ thống.
- Gán nhân sự vào đơn vị/nhóm và hiển thị các chỉ số đếm từ dữ liệu hiện có.
- Quản lý role, quyền xem theo đơn vị và quyền thao tác; quyền được kiểm tra ở cả frontend và backend.
- Tài khoản gốc `admin` luôn giữ toàn quyền, không thể bị xóa hoặc hạ quyền qua UI/API. Các tài khoản khác có thể được promote/demote theo quyền của người thực hiện.
- `System Admin`/`superadmin` phải được thể hiện thống nhất: role là nguồn phân quyền; nhãn hiển thị không được tạo ra một cấu hình quyền thứ hai gây mâu thuẫn.
- Các nút xóa loại nhân sự, đơn vị, nhóm, tiêu chí và cấu hình phải hiển thị xác nhận/hủy trước khi thực hiện; server vẫn kiểm tra ràng buộc và không phụ thuộc vào confirm của trình duyệt.
- Tab phụ `Nhật Ký Hệ Thống` (`audit_logs`, chỉ Super Admin) hiển thị bản ghi `AuditLog` phân trang từ PostgreSQL kèm lọc theo từ khóa (`path`, tài nguyên, `requestId`, người thao tác), phương thức HTTP, tài nguyên và modal xem metadata JSON.

API chính: `departments`, `personnel-types`, `statuses`, `settings`, `roles`, `users`, `permissions`, `columns`, `admin/audit-logs`.

### 10. Xác thực, session và audit

- Đăng nhập, refresh token, đăng xuất, lấy thông tin người dùng hiện tại và cập nhật profile.
- Form đăng nhập production khởi tạo trống, không điền sẵn tài khoản/mật khẩu; tài khoản mẫu chỉ được giữ ở môi trường development.
- Khi mở ứng dụng, chỉ tải các bộ dữ liệu cần xác thực sau khi khôi phục phiên hoàn tất và có người dùng hiện tại; nếu phiên không hợp lệ, ứng dụng giữ ở màn đăng nhập và không gửi request dữ liệu được bảo vệ.
- Session có thời hạn; các API cần xác thực phải từ chối request không có session hợp lệ.
- Ghi audit log cho các thay đổi nhạy cảm như quyền, lương, phê duyệt, giao việc, phạt và cấu hình.
- Các lỗi quyền hoặc dữ liệu không hợp lệ được trả về với trạng thái HTTP phù hợp để UI hiển thị rõ ràng.

## Mô hình dữ liệu chính

| Nhóm | Model tiêu biểu |
|---|---|
| Tài khoản và quyền | `UserAccount`, `Role`, `UserRole`, `AuthSession`, `AuditLog` |
| Nhân sự | `Personnel`, `PersonnelActivityType`, `PersonnelActivity`, `PersonnelColumn`, `PersonnelSalaryHistory` |
| Đơn vị | dữ liệu phòng ban/nhóm và quan hệ phạm vi quyền trong schema hiện hành |
| Lịch và công việc | `WorkSchedule`, `PersonnelTask`, `WorkAssignment`, `WorkAssignmentAssignee`, `WorkAssignmentApprovalDelegation` |
| Nghỉ phép và duyệt | `LeaveRequest`, `ApprovalRequest` |
| KPI và đánh giá | `KpiGroup`, `KpiGroupMember`, `KpiSetting`, `OperationalMetric`, `Criterion`, `ScoreRecord`, `ScoreRecordItem` |
| Lương | `PayrollPeriod`, `PayrollRecord`, `PayrollDispute` |
| Tài chính | `RevenueCategory`, `RevenuePlatform`, `RevenueTransaction`, `RevenueDeductionItem`, `CompanyExpense` |
| Cấu hình | `AppSetting`, `SystemLookup` |

Schema chuẩn: [`prisma/schema.prisma`](../prisma/schema.prisma). Migration mới phải được ghi nhận cùng tài liệu nghiệp vụ liên quan.

## Nguyên tắc nghiệp vụ bắt buộc

Các kiểm tra thời gian của giao công tác (quá hạn, chấp nhận, hoàn thành, đổi người thực hiện và ủy quyền) dùng cùng mốc ngày/giờ hệ thống đã cấu hình; khi không cấu hình mới dùng thời gian thực. Trang giao việc và dashboard Idol hiển thị cả ngày và giờ của mốc này.
- Trước hạn phản hồi nhận việc, nhân sự/Idol thấy nút `Phản hồi`; sau hạn và đang chờ xử lý vi phạm thấy nút `Giải trình`. Sau khi gửi, nút bị khóa và hiển thị trạng thái đang chờ xử lý.

1. Quyền và dữ liệu nhạy cảm phải được bảo vệ ở server; ẩn nút trên UI chỉ là hỗ trợ trải nghiệm.
2. `admin` là tài khoản gốc bất biến về quyền; không được có API nào cho phép hạ quyền hoặc xóa tài khoản này.
3. Công việc/công tác bị hủy không được tạo giờ công, phạt hoặc giảm KPI như một nhiệm vụ còn hiệu lực.
4. Công việc bắt buộc chỉ chuyển sang vi phạm khi qua điều kiện thời gian/trạng thái tương ứng; xin miễn phạt phải có lý do và quyết định của người có thẩm quyền hoặc được ủy quyền còn hạn.
5. Hạn chấp nhận phải trước thời điểm bắt đầu; quá hạn thì không thể chấp nhận và được xử lý theo chính sách vi phạm.
6. Lịch công tác hợp lệ thay thế lịch cố định trong thời gian hiệu lực; thời gian và hệ số phải được tính đúng vào payroll/KPI, không tính trùng.
7. Kỳ lương đã khóa không được sửa trực tiếp; điều chỉnh phải tạo dấu vết và thể hiện số liệu trước/sau.
8. Số liệu trên dashboard phải lấy từ API/dữ liệu thực tế. Không hiển thị mục tiêu mặc định nếu chưa có cấu hình.
9. Thao tác xóa có tác động dữ liệu phải có xác nhận/hủy ở giao diện và kiểm tra ràng buộc ở server.
10. Mỗi thay đổi làm thay đổi hành vi hệ thống phải cập nhật file này, [project-state](./project-state.md) nếu ảnh hưởng trạng thái, và [CHANGELOG](./changes/CHANGELOG.md).

## Kiểm chứng và giới hạn hiện tại

Các lệnh chuẩn:

```text
pnpm.cmd run lint
pnpm.cmd run test
pnpm.cmd run build

Trạng thái giao việc trên dashboard được tính từ trạng thái từng người thực hiện: dashboard cá nhân dùng trạng thái của người đó, còn dashboard quản lý chỉ đánh dấu hoàn thành khi tất cả người được giao đã kết thúc hợp lệ.

Trên dashboard cá nhân của Idol, block tổng quan KPI/tài chính/nghỉ phép được hiển thị trước block chi tiết giao việc để người dùng xem tổng quan trước.

Trường hợp không tham gia đã được quản lý xác nhận xử lý (phạt, miễn hoặc giảm phạt) được tính là đã kết thúc; chỉ yêu cầu giải trình còn `under_review` mới tiếp tục nằm trong nhóm chưa xong.
```

Khi thay đổi UI hoặc API, cần khởi động app, kiểm tra DOM/accessibility, thao tác luồng chính bằng trình duyệt và kiểm tra console theo quy định trong [AGENTS.md](../AGENTS.md). Một số môi trường trình duyệt có thể giữ state cũ hoặc JWT hết hạn; request API trả `401` trong trường hợp đó không được kết luận là lỗi nghiệp vụ nếu chưa đăng nhập lại.

Các giới hạn cần ghi rõ khi nghiệm thu:

- Build hiện có thể cảnh báo chunk lớn hơn 500 KB; đây là cảnh báo tối ưu bundle, không tự động là lỗi chức năng.
- Prisma có thể gặp `EPERM` khi query engine đang bị process khác giữ trên Windows; cần đóng process/khởi động lại trước khi kết luận migration hoặc generate thất bại.
- Dữ liệu demo và chế độ store kiểm thử không thay thế dữ liệu PostgreSQL production.

## Những nội dung chưa được coi là đã triển khai

- Quy định pháp lý cụ thể về thuế, phạt, lương và nghỉ phép phải được doanh nghiệp xác nhận trước khi biến thành cấu hình mặc định.
- Tích hợp realtime/push notification chỉ được coi là hoàn chỉnh khi có backend event, lưu trạng thái đã đọc và kiểm thử đa phiên; UI placeholder không đủ.
- Các báo cáo hoặc workflow chưa có route, model và kiểm thử tương ứng phải được ghi ở kế hoạch riêng, không đưa vào danh sách chức năng hiện có.

## Quy trình cập nhật bắt buộc

Sau mỗi lần sửa code hoặc thêm tính năng:

1. Xác định module, màn hình, API, model và invariant bị ảnh hưởng.
2. Cập nhật mục tương ứng trong file này: trạng thái, luồng người dùng, quyền, dữ liệu và giới hạn.
3. Nếu thay đổi trạng thái nghiệm thu hoặc quyết định kiến trúc, cập nhật [project-state](./project-state.md).
4. Ghi một mục ngắn trong [CHANGELOG](./changes/CHANGELOG.md), kèm ngày và phạm vi.
5. Chạy lint/type check, test liên quan và build khi phù hợp; với UI/API phải kiểm tra trên browser và console.
6. Báo cáo rõ kiểm thử đã chạy, kết quả, lỗi còn tồn tại và giới hạn môi trường.

## Lịch sử rà soát

### 2026-11-02 — External service usage history

- Hồ sơ có `personnelType = Dịch vụ ngoài` có lịch sử sử dụng dịch vụ độc lập, không trộn với bảng doanh thu.
- Lịch sử lưu mã lượt, dịch vụ, mô tả, ngày/giờ, số lượng/đơn vị, địa điểm, giá trị trước giảm, giảm giá, giá trị ròng, trạng thái, hợp đồng/hóa đơn, ghi chú và liên kết giao dịch doanh thu tùy chọn.
- Người có quyền quản lý hồ sơ có thể thêm, sửa và huỷ mềm từng lượt; huỷ yêu cầu xác nhận và vẫn giữ lịch sử.
- API kiểm tra hồ sơ phải là dịch vụ ngoài; mã lượt được sinh tuần tự theo tháng trong transaction. Các thao tác ghi yêu cầu quyền `manage_revenue`; dữ liệu không thuộc dịch vụ ngoài bị từ chối.
- Lịch sử được xem tại phân hệ riêng “Lịch Sử Dịch Vụ Ngoài”, gồm danh sách người sử dụng và chi tiết các dịch vụ/lượt sử dụng. Hồ sơ cá nhân chỉ còn form nhập nhanh lượt mới.
- Trạng thái không nhập thủ công: hệ thống suy ra `planned`, `in_progress` hoặc `completed` từ thời điểm bắt đầu/kết thúc; `cancelled` được giữ nguyên khi huỷ mềm.
- Sau khi thêm hoặc cập nhật lượt sử dụng, giao diện hiển thị thông báo thành công/thất bại rõ ràng.
- Một lượt sử dụng có thể phân công nhiều tài khoản đang hoạt động; form hỗ trợ tìm kiếm theo tên/tài khoản, hiển thị lựa chọn dạng checkbox và kiểm tra trùng lịch riêng cho từng người.

### 2026-11-02 — Rà soát tổng thể

Đối chiếu các view, component, API route, Prisma model, migration, test script và tài liệu trạng thái dự án. Ghi nhận các nhóm nghiệp vụ hiện có ở trên; không đánh dấu các đề xuất chưa có implementation là chức năng đã hoàn thành.
- Work-assignment waiver requests: employees submit a reason after an overdue mandatory assignment; managers can see the reason, timestamp, status, and review actions in the assignment panel.
- Session-scoped data refresh: switching or logging out accounts clears loaded markers so work assignments and approval data are fetched again for the new user's permissions and scope.
- Work-assignment penalties are allocated to the payroll period containing the assignment start/violation date; assignments crossing month boundaries are not counted in both periods. If no start date exists, the violation review date is used.
- Payroll periods explicitly display the salary month and status. Payroll feedback can be submitted only after attendance is closed (`pending_approval`) and before director approval; the feedback control is disabled for draft, approved, or locked/paid periods, with the same rule enforced by the API.
- The personnel roster uses a single “Lọc theo khối” dropdown for All, Idol, and Operations groups; the existing block filtering and counts remain unchanged.
## System time and date input (2026-11-02)

- The administrator can configure a system reference date and time (`DD/MM/YYYY` plus `HH:mm`) for business-time calculations.
- Frontend date-time inputs use a locale-independent `DD/MM/YYYY HH:mm` format; API/database values remain ISO-compatible.
- Technical audit timestamps such as `createdAt` and `updatedAt` continue to record real event time.

## External service assignment and payment (2026-11-02)

- Each external-service usage can be assigned to one account; the server rejects overlapping time ranges for the same assignee.
- Assigned usages appear on the personal dashboard and the service-history table shows the assignee.
- Accounting can record full or partial payment. One usage creates one linked revenue transaction; later payments never duplicate revenue.
- Usage payment totals and the revenue period are based on the usage month.
- The dedicated history table exposes edit and soft-cancel controls for managers; cancellation requires a reason and preserves the record for audit.
- HR, director, and talent-management dashboards show active external-service usages with the customer, service, assignee, derived status, and payment status; selecting a row or "Xem chi tiết" opens the dedicated history page.
- On the HR/accounting dashboard, external-service items are grouped into a dedicated section. Each item carries the exact personnel and usage identifiers, so opening `SVC-...` selects the matching customer record in the service-history page.
- Non-Idol personnel dashboards display the configured system date in the header; the value follows the same reference-date rule used by attendance, assignments, KPI and service status calculations.
- The external-service group on the HR/accounting dashboard can be collapsed and expanded without losing its item count.
- On the HR/finance dashboard, planned or in-progress service usages are surfaced in "Việc cần xử lý" as tracking items; completed unpaid or partially paid usages are surfaced as accounting tasks to check and confirm payment. Fully paid or cancelled usages are not actionable items.
- The service-usage form loads active assignable accounts from a protected assignee endpoint, so HR with `manage_idols` can assign a responsible person and create/update/cancel service usages without requiring `manage_revenue`.
- Service payment confirmation and service cancellation use in-app modals with inline validation and required cancellation reasons; the service workflow no longer uses browser-native `window.prompt` or `window.confirm` dialogs.
- Payment amount input accepts any positive whole-number amount within the outstanding balance without an incompatible browser step constraint; business validation remains enforced before submission.
- Work-assignment waiver requests move to a visible pending state after submission; the assignee cannot submit the same explanation again while management review is pending, and the server rejects duplicate pending requests.
- A pending work-assignment explanation is reviewed through one action flow: the manager can confirm participation, or mark non-participation as no penalty, full configured penalty, or a percentage of the configured penalty. The final decision, applied rate, amount, reviewer, timestamp, and response reason are retained and shown to the assignee.
- Personal work-assignment actions are displayed in a distinct footer area inside each assignment card, separated from descriptive data and review results for clearer completion/response actions.
# Date/time input standardization (2026-11-02)

- User-facing date-only fields use the shared `DateInput` control and display `DD/MM/YYYY`.
- User-facing date-time fields use the shared `DateTimeInput` control and display `DD/MM/YYYY HH:mm`.
- The shared controls emit ISO-compatible values for existing state, API, and database contracts.
- Each shared control includes a calendar button that opens the browser date/date-time picker while retaining the localized visible text format.
- Personal dashboards show a chronological timeline combining assigned work assignments and assigned external-service usage, including time range, work/service name, related subject, location, and status.

### Tự động xử lý công tác không phản hồi sau 3 ngày (2026-11-02)

- Công tác bắt buộc có người `pending`/`overdue` không phản hồi đến hết 3 ngày sau `endAt` tự động chuyển sang không tham gia, xác nhận vi phạm và áp dụng 100% định mức phạt đã cấu hình; giải trình đang chờ xử lý được loại trừ.
- Action xử lý vi phạm dùng chung modal với luồng giải trình; nút hủy bị ẩn ngay khi công tác đạt `endAt` (kể cả khi assignee còn trạng thái chưa xử lý), hoặc khi công tác đã hoàn tất/hủy.
- Month-only and time-only controls remain semantically specialized; they are not converted into full date controls.

# Giao việc & công tác — trang theo dõi riêng (2026-11-02)

- Dashboard cá nhân chỉ hiển thị tổng quan số lượng công việc và lối tắt; không còn nhúng toàn bộ danh sách chi tiết.
- Trang `work_assignments` hiển thị timeline theo thời gian bắt đầu, bộ lọc tất cả/chưa xong/đang làm/đã xong/đã huỷ và đầy đủ mô tả, địa điểm, người giao, hạn chấp nhận, người thực hiện, vi phạm và miễn giảm.
- Các thao tác tạo, sửa, phản hồi, hoàn thành, huỷ và xử lý miễn giảm vẫn dùng `WorkAssignmentPanel` trên trang riêng; dữ liệu và API hiện hữu được giữ nguyên.
- Các đơn dịch vụ ngoài được assign (ví dụ Bingsu, Trang Nơ) được tải từ `/service-usage/assigned` và hiển thị riêng trên cùng trang với mã đơn, đối tượng, thời gian, người thực hiện, trạng thái và thanh toán.


## Quản lý task và bấm giờ theo quyền sở hữu (2026-11-03)

- Tài khoản Idol chỉ được tải và xem các task thuộc hồ sơ Idol liên kết của chính tài khoản; server không chấp nhận truy cập task của Idol khác trong cùng phòng/nhóm.
- Tài khoản quản lý/giám đốc tiếp tục xem task theo phạm vi phòng ban và quyền `manage_tasks`; các thao tác tạo, sửa nội dung, xóa task và quản lý subtask vẫn bị giới hạn theo quyền này.
- Idol được Start/Stop bộ đếm thời gian trên task của chính mình qua endpoint timer riêng; server kiểm tra ownership trước khi ghi nhận.
- Thời điểm bắt đầu/kết thúc và tổng số phút được lưu trong `personnel_tasks`. Khi tải lại trang, timer đang chạy được khôi phục từ `startTime`; màn quản lý đồng bộ task định kỳ để thấy thay đổi từ tài khoản Idol.
- Trạng thái timer đang chạy được hiển thị trực tiếp trong card task, dùng chung nút `Dừng & Lưu`; không render thêm thanh timer riêng làm thay đổi bố cục danh sách.
- Phím `Space` bật/tắt timer của task gần nhất đang chọn; shortcut bỏ qua ô nhập liệu, select, nút và modal để không cản trở thao tác giao diện.
- Màn quản lý tải lại task ngay khi đổi Idol và nhận diện timer đang chạy theo cặp `startTime`/`endTime`, ngoài polling định kỳ, để trạng thái Start từ tài khoản Idol xuất hiện ngay khi mở hồ sơ.
- Trạng thái `Đang làm` được hiển thị dạng nhãn chỉ đọc trên màn quản lý và được tự động đặt khi người dùng bấm giờ; quản lý không cần chọn thủ công trạng thái này.
- Danh sách nhân sự không hiển thị banner mô tả phạm vi truy cập; việc lọc theo đơn vị và phân quyền dữ liệu vẫn được giữ nguyên.
- Task creation uses Idol-category-aware task categories: performance/PK, gaming/gear, and live-commerce Idols receive relevant category choices instead of one universal list. KPI activity choices are filtered by the selected task category, while unassigned KPI remains available for non-KPI work.
- Task creation and update are validated server-side against the Idol category and selected KPI activity, so an invalid task-category/activity pairing cannot be saved through a direct API request.

## Kiểm soát truy cập API, đối soát lương và tối ưu upload (2026-11-11)

- Bảo vệ RBAC cho các endpoint đọc dữ liệu nhạy cảm trong `routePolicies` (`server/auth/authorization.ts`):
  - `GET /api/approvals` yêu cầu một trong các quyền `manage_approvals`, `manage_criteria`, `manage_settings`.
  - Các route `GET /api/payrolls*` yêu cầu một trong các quyền `manage_payroll`, `adjust_payroll`, `approve_payroll`, `hot_bonus` (ngoại trừ `GET /api/payrolls/my-payslips/:userId`).
  - Các route `GET /api/finance/*` yêu cầu `adjust_payroll`, `manage_payroll`, `approve_payroll` hoặc `manage_revenue`.
  - Các route `GET /api/revenue/*` yêu cầu `manage_revenue`, `adjust_payroll`, `manage_payroll` hoặc `approve_payroll`.
  - Các route `GET /api/service-usage/accounting` và `GET /api/service-usage` yêu cầu quyền tài chính/dịch vụ tương ứng; `POST /api/upload`, `GET /api/idols/:id/salary-history`, và `GET /api/payrolls/my-payslips/:userId` yêu cầu xác thực (`action: undefined`) và kiểm tra quyền/sở hữu tại handler.
- Kiểm tra quyền sở hữu (anti-IDOR) tại `server.ts`:
  - `GET /api/payrolls/my-payslips/:userId` chặn truy cập phiếu lương của người dùng khác (`403`) trừ khi người gọi có quyền bảng lương (`manage_payroll`, `adjust_payroll`, `approve_payroll`, `hot_bonus`).
  - `GET /api/idols/:id/salary-history` yêu cầu người gọi là chính Idol sở hữu hồ sơ (`personnel.userId === requestUser.id`) hoặc có quyền bảng lương.
  - `PUT /api/auth/profile` bắt buộc có `requestUser` (`401`), từ chối khi `req.body.userId` khác `requestUser.id` (`403`), và luôn cập nhật theo `requestUser.id`.
- Logic nghiệp vụ & kế toán trong `server/db/pgStore.ts` và `src/utils/payrollDeductions.ts`:
  - `approveApproval` hỗ trợ thực thi nhánh `'update_idol'` bằng cách gọi `this.updateIdol` trong transaction.
  - `getPayrollRecords` áp dụng bộ lọc `filter.userId` qua `personnel.userId`.
  - `recalculatePayrollRecordFinancials` chuẩn hóa việc tính lại `totalGross` (đầy đủ 9 khoản thu nhập gồm `allowance`, `workAssignmentPay`, `otherBonus`), khấu trừ PIT/BHXH, `netSalary`, `companyInsurance` và `companyLaborCost` cho cả `adjustPayrollRecord` và `syncRevenueToPayroll`; `syncRevenueToPayroll` chạy trong `prisma.$transaction`.
  - `getFinancePnLSummary` và `getFinanceTrendSeries` lấy kỳ mặc định từ `getEffectiveSystemDate()` (`YYYY-MM`) thay vì chuỗi cứng, và cộng `CompanyExpense(category='LABOR_INSURANCE')` vào `totalCompanyLaborCost` để `officeLaborCost` và `totalOpEx` khớp với `expenses.companyInsurancePaid`.
- Hiệu năng & bảo mật upload (`POST /api/upload` trong `server.ts`): thay thế quét thư mục đồng bộ `fs.readdirSync`/`fs.readFileSync` bằng chỉ mục SHA-256 bất đồng bộ khởi tạo lười (`getUploadHashIndex`), kiểm tra phần mở rộng hợp lệ và magic bytes ảnh (`hasValidImageSignature`), và ghi tệp bất đồng bộ (`fs.promises.writeFile`).

## Dual-Shell Navigation, Tương Phản Dark Mode và Audit Log Viewer (2026-11-11)

- **Chuyển đổi bố cục Dual-Shell (`sidebar` ↔ `classic`) trong [`App.tsx`](../src/App.tsx)**:
  - Mặc định sử dụng shell mới [`AppSidebarShell.tsx`](../src/components/AppSidebarShell.tsx) (thanh bên thu gọn được, thanh trên gọn, ngăn kéo di động, tìm kiếm toàn hệ thống `#sidebar-universal-search` với phím tắt `Ctrl+K`, thông báo cá nhân, chuyển giao diện Sáng/Tối và menu tài khoản).
  - Cho phép chuyển đổi trực tiếp giữa giao diện mới và [`Navbar.tsx`](../src/components/Navbar.tsx) cổ điển (`Giao diện Cũ` ↔ `Giao diện Mới`), lưu lựa chọn vào `localStorage` (`aura_ui_shell`) mà không mất phiên đăng nhập hay tab đang mở.
  - Hợp nhất logic phân quyền menu (`buildNavGroups`, `canAccessNavTab`, `getHomeNavTab`, `canViewSystemSettings`) trong [`navigationConfig.ts`](../src/utils/navigationConfig.ts) dùng chung cho cả hai shell.
- **API & Giao diện Audit Log (`GET /api/admin/audit-logs`)**:
  - `server/db/pgStore.ts` (`pgStore.getAuditLogs`) truy vấn bảng `audit_logs` kèm thông tin người thực hiện (`actorUser.personnelProfile` / `roleTitle` / `username`), phân trang và lọc `search`, `method`, `resource`, `statusCode`.
  - Bảo vệ chỉ Super Admin qua `requireSuperAdmin` trong `server.ts` và policy `{ methods: ['GET'], pattern: /^\/admin\/audit-logs$/, superAdminOnly: true }` trong `server/auth/authorization.ts`; frontend khóa sub-tab `'audit_logs'` trong `src/utils/adminAccess.ts` và `AdminPortalView.tsx`, kết nối qua [`AdminAuditLogPanel.tsx`](../src/components/AdminAuditLogPanel.tsx) và `api.getAuditLogs`.
- **Sửa tương phản Dark Mode & Accessibility**:
  - [`src/index.css`](../src/index.css) bổ sung override Dark Mode cho `bg-rose-200`, `bg-rose-200/80` và `text-rose-900/80` để đảm bảo độ tương phản trên thẻ KPI tài chính và badge.
  - Gắn đủ `id`, `name`, `label[for]` và `aria-label` cho các trường tìm kiếm/lọc mới (`#sidebar-universal-search`, `#classic-universal-search`, `#audit-log-search`, `#audit-log-method`, `#audit-log-resource`).

## Chuẩn Hóa Quản Trị Hệ Thống, Đồng Bộ 15/15 Quyền RBAC và Bảo Vệ Trạng Thái (2026-11-11)

- **Danh mục phân quyền dùng chung ([`permissionCatalog.ts`](../src/utils/permissionCatalog.ts))**:
  - Hợp nhất `TAB_PERMISSION_OPTIONS` (**15** `AppTabPermission`) và `ACTION_PERMISSION_OPTIONS` (**15** `AppActionPermission`, phân 4 nhóm chức năng) dùng chung cho cả ma trận vai trò trong [`RoleBasedPermissionManager.tsx`](../src/components/RoleBasedPermissionManager.tsx) (kèm tìm kiếm nhanh `#rbac-perm-search`) và modal tài khoản trong [`AdminPortalView.tsx`](../src/views/AdminPortalView.tsx), khắc phục lỗi lệch số đếm `15/12 quyền`.
- **Bảo vệ toàn vẹn khi xóa Trạng Thái nhân sự**:
  - [`pgStore.deleteStatus`](../server/db/pgStore.ts) kiểm tra `prisma.personnel.count({ where: { status } })` và từ chối xóa nếu còn hồ sơ đang sử dụng (`400 Bad Request` kèm thông báo cụ thể); UI trong [`AdminPortalView.tsx`](../src/views/AdminPortalView.tsx) khóa nút xóa khi `count > 0` và yêu cầu xác nhận khi `count === 0`.
- **Tái cấu trúc 10 tab trong `AdminPortalView` & Nâng cấp `AdminAuditLogPanel`**:
  - Phân rõ 4 nhóm có nhãn trên thanh điều hướng phụ (`1. Phê duyệt & Quy trình`, `2. Tài khoản & Bảo mật`, `3. Danh mục & Tổ chức`, `4. Cấu hình & Đánh giá`), đổi nhãn `Hiển Thị Cột & Trường` và bổ sung huy hiệu phạm vi ảnh hưởng trên 3 khối của `Thiết Lập Hệ Thống`.
  - Mở rộng `pgStore.getAuditLogs` và [`AdminAuditLogPanel.tsx`](../src/components/AdminAuditLogPanel.tsx) thêm lọc phân loại (`all` / `data` / `auth`), nhóm trạng thái HTTP (`2xx` / `4xx_5xx`), khoảng ngày (`fromDate` / `toDate`) và nút `Xuất CSV`.

## Tách Phê Duyệt Nhân Sự & Nghỉ Phép Khỏi Quản Trị Hệ Thống (2026-11-11)

- **Phân hệ độc lập [`ApprovalCenterView.tsx`](../src/views/ApprovalCenterView.tsx) (`tab = 'approvals'`)**:
  - Chuyển toàn bộ quy trình `Duyệt Nghỉ Phép` và `Duyệt Yêu Cầu` ra khỏi [`AdminPortalView.tsx`](../src/views/AdminPortalView.tsx) sang màn hình chuyên trách cho HR / Ban Giám Đốc / Quản lý, đặt trong nhóm điều hướng `Hồ Sơ` (`Phê Duyệt Nhân Sự` kèm huy hiệu đếm chờ duyệt) đồng bộ trên cả [`AppSidebarShell.tsx`](../src/components/AppSidebarShell.tsx) và [`Navbar.tsx`](../src/components/Navbar.tsx) thông qua [`navigationConfig.ts`](../src/utils/navigationConfig.ts).
- **Thu gọn [`AdminPortalView.tsx`](../src/views/AdminPortalView.tsx) (`tab = 'admin'`)**:
  - Chỉ giữ 8 sub-tab quản trị hệ thống trong 3 nhóm (`1. Tài khoản & Bảo mật`, `2. Danh mục & Tổ chức`, `3. Cấu hình & Đánh giá`).
- **Tách quyền truy cập & Nâng danh mục Tab lên 16 mục**:
  - Bổ sung `'approvals'` vào `AppTabPermission` ([`src/types/index.ts`](../src/types/index.ts)) và `TAB_PERMISSION_OPTIONS` ([`permissionCatalog.ts`](../src/utils/permissionCatalog.ts), tổng **16** tab / **15** action).
  - [`adminAccess.ts`](../src/utils/adminAccess.ts) cung cấp `canAccessApprovalCenter(user)` (cho `isSuperAdmin`, `director`, tab `'approvals'` hoặc action `manage_approvals`) và thu hẹp `canAccessAdminPortal(user)` chỉ dành cho `isSuperAdmin` hoặc người có quyền cấu hình hệ thống (`manage_settings`, `manage_departments`, `manage_criteria`). Tài khoản `hr_admin` chỉ có `manage_approvals` sẽ không thấy nhóm/nút `Hệ Thống` hay `Quản Trị`.
