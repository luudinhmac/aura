# KẾ HOẠCH TRIỂN KHAI: ĐIỀU CHỈNH FORM THÊM NHÂN SỰ & QUY TẮC TRẠNG THÁI

> **Mục tiêu**: 
> 1. Đưa mục chọn **Loại nhân sự** lên trên đầu biểu mẫu thêm nhân sự (`IdolModal.tsx`).
> 2. Khi chọn **Dịch vụ ngoài** (khách ngoài thuê studio/chụp ảnh/quay phim): **Ẩn toàn bộ khối phân loại đối tượng nội bộ & 3 loại Idol chuyên biệt** (phần hiển thị trong ảnh 2 người dùng cung cấp). Thay vào đó chỉ hiển thị phần ghi chú dịch vụ thuê và thông tin cơ bản.
> 3. **Quy tắc Trạng thái nhân sự**:
>    - Khi HR thêm mới nhân sự: Không hiển thị bộ chọn trạng thái thủ công; hệ thống tự động gán là `Chờ duyệt` (Pending request). Khi Ban Giám Đốc phê duyệt, trạng thái tự động chuyển thành `Đang hoạt động`.
>    - Riêng **Nhân sự ngoài công ty / Dịch vụ ngoài**: **Không thể hiện trạng thái** (ẩn selector trạng thái trong modal, hiển thị dấu `-` trên bảng danh sách, không hiển thị huy hiệu trạng thái nhân viên nội bộ trên hover card / chi tiết).

---

## 1. KHẢO SÁT & HIỆN TRẠNG MÃ NGUỒN

1. **Vị trí Loại nhân sự hiện tại trong `src/components/IdolModal.tsx`**:
   - Hiện nằm ở dòng 980 (rất thấp, sau cả khối chọn Là Idol/Cán bộ, sau 3 card Gaming/PK/Commerce và sau cả cấu hình giỏ hàng).
   - Khiến người dùng phải cuộn qua các thông số Idol nội bộ rồi mới chọn được "Dịch vụ ngoài", gây rối mắt và không hợp lý về luồng logic.
2. **Khối Phân loại Đối tượng & 3 Idol chuyên biệt**:
   - Hiện đang hiển thị mặc định cho mọi loại nhân sự (dòng 525-978). Khi chọn "Dịch vụ ngoài", khối này vẫn xuất hiện, gây nhầm lẫn vì khách thuê dịch vụ ngoài không phải là Idol ký hợp đồng độc quyền với công ty.
3. **Luồng Trạng thái (Status Flow)**:
   - Trong `IdolModal.tsx`: Hiện tại luôn hiển thị cụm nút bấm chọn 5 trạng thái (`Đang hoạt động`, `Đang lưu diễn`, `Đang ghi hình`, `Tạm nghỉ`, `Đã nghỉ việc`) cho tất cả mọi người khi tạo mới.
   - Khi HR thêm mới, request đã gửi qua `ApprovalRequest` (`create_idol`), nhưng `status` ban đầu vẫn để là `Đang hoạt động`.
   - Trong `server/data/store.ts` và `server/db/pgStore.ts`: Khi Giám đốc duyệt `create_idol`, cần đảm bảo gán trạng thái `Đang hoạt động` khi được approve.
4. **Hiển thị Trạng thái cho Dịch vụ ngoài**:
   - `IdolListView.tsx` (cột `status`): Hiện vẫn hiển thị huy hiệu trạng thái nhân viên cho cả Dịch vụ ngoài.
   - `IdolHoverCard.tsx` và `IdolDetailModal.tsx`: Vẫn render chấm tròn xanh `Đang hoạt động` cho khách dịch vụ ngoài.

---

## 2. GIẢI PHÁP THIẾT KẾ CHI TIẾT

### 2.1. Tái cấu trúc giao diện `src/components/IdolModal.tsx`
- **Bước 1 (Đầu biểu mẫu)**: Di chuyển cụm **"Loại nhân sự *"** lên ngay sau Avatar/Tên cơ bản (hoặc đầu form), gồm 5 nút:
  `[ Công ty ]`  `[ Cộng tác viên ]`  `[ Thực tập sinh ]`  `[ Dịch vụ ngoài ]`
- **Bước 2 (Điều kiện hiển thị)**:
  - **Trường hợp 1: Nếu `personnelType === 'Dịch vụ ngoài'`**:
    - **ẨN TOÀN BỘ** khối "Phân Loại Đối Tượng, Đơn Vị & Role Hệ Thống *" (bao gồm cả 2 nút Là Idol / Cán bộ, 3 card Idol chuyên biệt, cấu hình nghiệp vụ giỏ hàng/game, chọn phòng ban nội bộ và cấp role hệ thống).
    - **ẨN** khối cấp tài khoản đăng nhập nội bộ công ty (`accountUsername`, mật khẩu nội bộ).
    - **ẨN** bộ chọn Trạng thái nhân sự (vì khách ngoài không quản lý trạng thái công tác).
    - **HIỆN RÕ** khung cấu hình: *Ghi chú gói dịch vụ khách thuê* (VD: Thuê studio live Tiktok 2 tiếng/buổi, chụp lookbook, quay TVC...).
  - **Trường hợp 2: Nếu `personnelType !== 'Dịch vụ ngoài'` (Công ty / CTV / Thực tập sinh)**:
    - Hiển thị khối Phân loại Đối tượng & 3 Idol chuyên biệt như bình thường.

### 2.2. Xử lý Trạng Thái Khi HR Thêm Mới & Ban Giám Đốc Phê Duyệt
- **Khi thêm mới (`!isEdit`)**:
  - Nếu người dùng hiện tại **không phải Super Admin (ví dụ: HR / Manager)**:
    - **Ẩn** bộ chọn trạng thái nhân sự.
    - Hiển thị thông báo nhẹ nhàng: *"💡 Trạng thái nhân sự mới sẽ tự động là 'Chờ duyệt' (Pending) và kích hoạt thành 'Đang hoạt động' ngay sau khi Ban Giám Đốc phê duyệt."*
    - Tự động gán `status: 'Chờ duyệt'` vào payload đề xuất.
  - Nếu là **Super Admin (Giám Đốc)** hoặc khi đang **Chỉnh sửa hồ sơ (`isEdit`)**:
    - Hiển thị bộ chọn trạng thái bình thường để quản trị viên có thể cập nhật.
- **Tại Backend / Store (`server/data/store.ts` & `server/db/pgStore.ts`)**:
  - Trong hàm `approveApproval` khi duyệt yêu cầu `create_idol`: Đảm bảo `createdIdol.status` được thiết lập chính thức là `'Đang hoạt động'`.

### 2.3. Quy tắc "Riêng nhân sự ngoài công ty thì không thể hiện trạng thái"
- **Tại `IdolListView.tsx` (Bảng danh sách)**:
  - Cột `Trạng thái`: Nếu `idol.personnelType === 'Dịch vụ ngoài'`, hiển thị ký tự `-` (màu xám nhạt trung tính), không hiển thị tag trạng thái nhân viên.
- **Tại `IdolHoverCard.tsx` (Thẻ xem nhanh)**:
  - Dòng trạng thái: Nếu `idol.personnelType === 'Dịch vụ ngoài'`, hiển thị nhãn `🏷️ Khách thuê dịch vụ` thay vì `Đang hoạt động`.
- **Tại `IdolDetailModal.tsx` (Chi tiết hồ sơ)**:
  - Badge trạng thái ở banner trên cùng: Không hiển thị chấm xanh `Đang hoạt động`, chỉ hiển thị tag `🏷️ Khách Thuê Dịch Vụ Ngoài`.

---

## 3. CÁC TỆP SẼ ĐƯỢC CHỈNH SỬA

1. `src/components/IdolModal.tsx`:
   - Di chuyển `personnelType` lên đầu form.
   - Thêm điều kiện ẩn toàn bộ khối phân loại Idol (ảnh 2) khi chọn "Dịch vụ ngoài".
   - Ẩn chọn trạng thái khi HR thêm mới và khi chọn "Dịch vụ ngoài".
2. `server/data/store.ts` & `server/db/pgStore.ts`:
   - Chuẩn hóa trạng thái phê duyệt `create_idol` thành `Đang hoạt động`.
3. `src/views/IdolListView.tsx`:
   - Cột trạng thái hiển thị `-` cho Dịch vụ ngoài.
4. `src/components/IdolHoverCard.tsx` & `src/components/IdolDetailModal.tsx`:
   - Ẩn trạng thái nhân sự nội bộ đối với Dịch vụ ngoài.

---

## 4. KẾ HOẠCH XÁC MINH (VERIFICATION PLAN)

1. **Kiểm tra biên dịch**: Chạy `pnpm exec tsc --noEmit` đảm bảo không phát sinh lỗi kiểu dữ liệu.
2. **Kiểm thử giao diện với Browser Subagent**:
   - Đăng nhập tài khoản HR (`user-hr` hoặc `admin`).
   - Mở modal Thêm Nhân Sự:
     - Xác nhận mục **Loại nhân sự** đã nằm ở trên đầu.
     - Khi tick chọn **"Dịch vụ ngoài"**: Xác nhận khối phân loại Idol chuyên biệt (ảnh 2) biến mất hoàn toàn, không có bộ chọn trạng thái.
     - Khi tick chọn **"Công ty"**: Xác nhận khối phân loại Idol chuyên biệt hiển thị đầy đủ.
     - Xác nhận HR không thấy bộ chọn trạng thái mà thấy thông báo tự động pending chờ giám đốc duyệt.
   - Kiểm tra hiển thị tại Bảng danh sách: Nhân sự Dịch vụ ngoài thể hiện cột trạng thái là `-`.
