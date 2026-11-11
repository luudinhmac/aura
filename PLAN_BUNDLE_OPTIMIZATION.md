# Kế hoạch tối ưu bundle frontend

## Mục tiêu

Giảm JavaScript phải tải ở lần mở ứng dụng đầu tiên, giảm thời gian tương tác ban đầu và chỉ tải code của các phân hệ khi người dùng thực sự mở phân hệ đó. Không thay đổi nghiệp vụ, dữ liệu hoặc quyền truy cập.

## Baseline đã ghi nhận

- Build hiện tại tạo entry chunk khoảng `1,668.39 kB` minified, khoảng `339.58 kB` gzip.
- Vite cảnh báo chunk JavaScript vượt ngưỡng `500 kB`.
- Nguyên nhân chính: [src/App.tsx](./src/App.tsx) import tĩnh toàn bộ các view lớn và các modal; vì vậy code của roster, lịch, KPI, tài chính, payroll, quản trị... đi vào entry chunk ngay cả khi chưa được mở.
- Việc gọi nhiều API lúc khởi động là một vấn đề runtime/network riêng, được xử lý ở Stage 4, không trộn vào đợt tách bundle đầu tiên.

## Các stage

| Stage | Nội dung | Trạng thái |
|---|---|---|
| 0 | Đo baseline build, kiểm tra dependency/import và xác định điểm tải lớn | Hoàn tất |
| 1 | Lazy-load các view lớn theo `activeTab`, thêm trạng thái loading và regression test | Hoàn tất |
| 2 | Lazy-load các modal lớn, chỉ tải modal khi mở | Hoàn tất |
| 3 | Rà soát chunk strategy của Vite, icon/dependency và giới hạn kích thước chunk | Hoàn tất |
| 4 | Tách tải dữ liệu theo phân hệ, tránh over-fetch lúc khởi động | Hoàn tất |
| 5 | Profiling render/state, giảm re-render và xử lý component nặng | Hoàn tất |
| 6 | Regression đầy đủ: lint, typecheck, unit test, build, browser và console | Hoàn tất |

## Stage 1 — thiết kế và phạm vi

### Thay đổi dự kiến

- Thay import tĩnh của các view bằng `React.lazy` và dynamic import.
- Bọc vùng render phân hệ bằng `Suspense` để hiển thị trạng thái tải ngắn trong lúc chunk được tải.
- Giữ nguyên props, callback, routing/tab state, API và quyền; không thay đổi hành vi nghiệp vụ.
- Chưa lazy-load modal ở stage này để dễ cô lập lỗi; modal sẽ là Stage 2.

### Tiêu chí nghiệm thu

- Build tạo nhiều chunk view và entry chunk giảm rõ rệt so với baseline.
- Lint, unit test và build thành công.
- Các tab roster, schedule, tasks, KPI, finance, revenue, payroll và admin mở được sau reload.
- Không có alert lỗi, lỗi runtime mới hoặc trạng thái loading bị kẹt trong browser.
- Nếu dynamic chunk lỗi, người dùng vẫn nhận được trạng thái lỗi có thể thử lại ở stage hardening phù hợp.

## Rủi ro và rollback

- Rủi ro: sai export khi dynamic import, chunk load lỗi hoặc fallback làm thay đổi layout.
- Rollback: khôi phục các import tĩnh của view trong [src/App.tsx](./src/App.tsx); không cần migration hay thay đổi dữ liệu.

## Nhật ký thực hiện

### 2026-10-30 — Stage 0

- Đã kiểm tra [vite.config.ts](./vite.config.ts), [src/main.tsx](./src/main.tsx), [src/App.tsx](./src/App.tsx) và các view.
- Đã ghi nhận baseline entry chunk `1,668.39 kB` minified / `339.58 kB` gzip.
- Đã xác định static import toàn bộ view là nguyên nhân ưu tiên xử lý.

### 2026-10-30 — Stage 1

- Đã thay 11 view lớn bằng `React.lazy`/dynamic import và bọc vùng render bằng `Suspense` fallback.
- Build tạo chunk riêng cho từng view; entry chunk giảm từ `1,668.39 kB` xuống `712.57 kB` minified và từ `339.58 kB` xuống `182.01 kB` gzip.
- Lint pass, unit test pass `18/18`, build pass.
- Browser reload/acceptance pass cho `roster`, `schedule`, `tasks`, `kpi`, `finance`, `revenue`, `payroll`, `admin`: không có alert, không kẹt trạng thái loading.
- Vẫn còn cảnh báo chunk entry vượt `500 kB`; phần này thuộc Stage 2–3 (modal/dependency/chunk strategy), chưa coi là hoàn tất toàn bộ tối ưu.

### 2026-10-30 — Stage 2

- Đã thay 5 modal lớn bằng `React.lazy`/dynamic import: thêm/sửa nhân sự, chi tiết hồ sơ, hồ sơ cá nhân, đổi mật khẩu và phiếu lương.
- Modal chỉ được mount khi thực sự mở, tránh tải chunk modal trong lần khởi động đầu tiên.
- Entry chunk giảm tiếp từ `712.57 kB` xuống `531.44 kB` minified và từ `182.01 kB` xuống `151.40 kB` gzip.
- Build tạo riêng các chunk `IdolModal`, `IdolDetailModal`, `UserProfileModal`, `ChangePasswordModal`, `PayslipModal`.
- Browser xác nhận trước khi mở modal không có resource modal; sau thao tác mở “Thêm thành viên”, chunk `IdolModal` được tải và modal hiển thị đúng, không có alert.
- Lint pass, unit test pass `18/18`, build pass, static diagnostics không có lỗi. Console browser chỉ ghi nhận thông báo Vite/React DevTools, không có runtime error.
- Vẫn còn cảnh báo chunk entry vượt `500 kB`; Stage 3 tiếp tục xử lý dependency/chunk strategy.

### 2026-10-30 — Stage 3

- Đã kiểm tra cấu hình Vite 8/Rolldown local và cơ chế `output.codeSplitting`.
- Đã thử nghiệm nhóm vendor tổng quát và nhóm `lucide-react` trong môi trường build thực tế.
- Nhóm vendor tổng quát tạo `react-vendor` khoảng `425.65 kB`; nhóm icon tạo `lucide-vendor` khoảng `45.44 kB`. Cả hai phương án đều không giảm tổng tải khởi động tốt hơn so với automatic splitting hiện tại.
- Đã rollback cấu hình thử nghiệm; [vite.config.ts](./vite.config.ts) giữ automatic code splitting mặc định, không dùng `manualChunks` deprecated và không tăng `chunkSizeWarningLimit` để che cảnh báo.
- Final build sau rollback: entry `531.44 kB` minified / `151.40 kB` gzip; các view/modal vẫn là chunk riêng.
- Lint pass, unit test pass `18/18`, build pass, browser reload pass, không có console error runtime và không có alert.
- Kết luận: Stage 3 hoàn tất về mặt đánh giá/chọn chiến lược; phần giảm tiếp entry chunk sẽ thuộc Stage 4–5 (data loading và profiling/render), không ép vendor chunk khi chưa có lợi ích đo được.

### 2026-10-30 — Stage 4

- Đã tách việc tải dữ liệu theo tab trong `src/App.tsx`: roster tải dữ liệu cốt lõi, còn users/approvals/leave requests/KPI groups/KPI settings chỉ tải khi mở phân hệ liên quan.
- Đã thêm cache theo phiên cho các dataset đã tải; chuyển tab không fetch lại và các nút refresh/reset/sync dùng force reload.
- Browser roster reload ghi nhận 11 data endpoints có sử dụng thay vì 16 endpoint trước đây; các endpoint theo phân hệ không còn bị over-fetch lúc khởi động.
- Build sau thay đổi: entry `532.52 kB` minified / `151.71 kB` gzip. Còn warning entry vượt `500 kB`; phần này thuộc Stage 5 profiling/render.
- Verification: diagnostics không có lỗi, lint pass, unit test `18/18` pass, build pass, browser reload pass, không có console error/page error.

### 2026-10-30 — Stage 5

- Đã memoize bộ lọc roster và danh sách loại nhân sự để không tính lại khi các state không liên quan thay đổi.
- Đã index task theo `idolId` và memoize thống kê task; màn hình tổng kết không còn quét toàn bộ danh sách task lặp lại cho từng nhân sự trong mỗi lần render.
- Browser kiểm tra màn hình roster và quản lý nhiệm vụ sau reload: nội dung hiển thị đúng, dữ liệu thống kê giữ nguyên, không có console error/page error.
- Verification: diagnostics không có lỗi, lint pass, unit test `18/18` pass, build pass. Entry bundle giữ ở `532.52 kB` minified / `151.70 kB` gzip; warning trên `500 kB` vẫn được giữ để Stage 6 regression đánh giá cuối.

### 2026-10-30 — Stage 6

- Đã chạy diagnostics toàn workspace: không có lỗi.
- Đã chạy lint/typecheck, unit test `18/18` và production build: đều pass.
- Browser smoke test sau reload cho `roster`, `schedule`, `tasks`, `kpi`, `finance`, `revenue`, `payroll` và `admin`: tất cả hiển thị đúng, không có console error hoặc page error.
- Kế hoạch tối ưu bundle hoàn tất. Warning entry chunk trên `500 kB` vẫn được giữ minh bạch vì entry hiện tại là `532.52 kB` minified / `151.70 kB` gzip; không còn stage bắt buộc nào chưa thực hiện.
