# Kế Hoạch Cải Tiến Phân Quyền, Bảo Mật & Trải Nghiệm Người Dùng (UX)
## Hệ Thống Aura Talent Management - 27/10/2026

---

## 1. Mục Tiêu & Phạm Vi

Kế hoạch này nhằm giải quyết triệt để 5 vấn đề về phân quyền, tính toàn vẹn dữ liệu tài khoản và trải nghiệm người dùng được ghi nhận trong quá trình vận hành hệ thống.

---

## 2. Chi Tiết 5 Vấn Đề & Phương Án Xử Lý

### 📌 Vấn đề 1: Khóa Tên đăng nhập (Username) & Email công ty khi Chỉnh sửa hồ sơ
- **Tệp liên quan:** `src/components/IdolModal.tsx`
- **Hiện trạng:**
  - Ô `Tên đăng nhập (Username)` và `Email công ty` đang cho phép gõ tự do khi chỉnh sửa hồ sơ nhân sự đã tồn tại.
- **Rủi ro:**
  - Người sửa vô tình gõ nhầm một ký tự sẽ làm thay đổi username/email đăng nhập, khiến nhân sự đó bị mất quyền đăng nhập, không truy cập được vào Bàn làm việc Idol hoặc xem phiếu lương.
- **Giải pháp triển khai:**
  - Khi **Chỉnh sửa hồ sơ đã tồn tại (`isEdit === true`)**:
    - Chuyển trường `accountUsername` và `email` sang chế độ **Chỉ đọc (Readonly / Disabled)** với nền xám nhạt (`bg-slate-100/80`) và viền xám khóa.
    - Hiển thị biểu tượng ổ khóa nhỏ gọn `🔒` ngay cạnh nhãn hoặc trong ô input (gọn gàng, tinh tế, không cần dòng chú thích dài dòng).
  - Chỉ cho phép gõ tự do khi **Thêm mới nhân sự (`isEdit === false`)**.
  - *(Dành cho Super Admin)*: Nếu Super Admin thực sự cần đổi username/email vì lý do đặc biệt, bổ sung nút bấm `🔓 Mở khóa` kèm hộp thoại xác nhận.

---

### 📌 Vấn đề 2: Chặn quyền sửa hồ sơ trái phép từ Modal xem chi tiết (IdolDetailModal)
- **Tệp liên quan:** `src/components/IdolDetailModal.tsx`, `src/App.tsx`
- **Hiện trạng:**
  - `IdolListView.tsx` đã kiểm tra quyền `canManageIdols` để ẩn nút "+ Thêm" và nút "Sửa/Xóa" ở bảng danh sách.
  - Tuy nhiên, khi nhân sự (ví dụ: Chuyên viên Marketing Hoàng Hải Yến) nhấn vào biểu tượng hình con mắt (Xem chi tiết), Modal chi tiết `IdolDetailModal.tsx` mở ra và **vẫn hiển thị nút màu đỏ `✏️ Chỉnh Sửa Hồ Sơ` ở chân trang**. Nhấn vào nút này sẽ kích hoạt `onEdit(idol)`, cho phép nhân sự chỉnh sửa toàn bộ thông tin nhân sự khác.
- **Rủi ro:**
  - Sai lệch phân quyền nghiêm trọng (Privilege Escalation): Nhân sự chỉ có quyền xem vẫn có thể sửa được hồ sơ của người khác.
- **Giải pháp triển khai:**
  - Bổ sung prop `canManageIdols?: boolean` và `canManageSchedule?: boolean` vào `IdolDetailModalProps`.
  - Truyền giá trị `canManageIdols` và `canManageSchedule` từ `App.tsx` vào `IdolDetailModal`.
  - Trong `IdolDetailModal.tsx`:
    - Nếu `canManageIdols === false`: **Ẩn hoàn toàn nút màu đỏ `✏️ Chỉnh Sửa Hồ Sơ`**.
    - Nếu `canManageSchedule === false`: **Ẩn nút `⚡ Thiết Lập Lịch Cho...`** (hoặc chỉ cho phép xem lịch làm việc mà không mở form can thiệp lịch).
    - Ở chân trang modal chỉ còn nút `Đóng` và nút `Lịch Làm Việc` (xem lịch dạng chỉ đọc).

---

### 📌 Vấn đề 3: Bổ sung đầy đủ trường thông tin cá nhân trong Hồ Sơ Cá Nhân (ProfileModal)
- **Tệp liên quan:** `src/components/UserProfileModal.tsx`, `src/App.tsx`, `server/db/pgStore.ts`, `server.ts`
- **Hiện trạng:**
  - `UserProfileModal.tsx` hiện chỉ cho phép cập nhật SĐT, Địa chỉ, Avatar và Mật khẩu.
  - Thiếu hoàn toàn các trường thông tin cá nhân cơ bản và chỉ số hình thể quan trọng của nghệ sĩ.
- **Giải pháp triển khai:**
  - Mở rộng giao diện `UserProfileModal.tsx` thành các khu vực quản lý thông tin rõ ràng:
    1. **Thông tin nhân thân cơ bản:**
       - Họ và tên thật (`name` / `realName`)
       - Biệt danh / Nghệ danh (`stageName`)
       - Ngày tháng năm sinh (`dob`)
       - Quê quán (`hometown`)
       - Số điện thoại (`phone`)
       - Địa chỉ cư trú hiện tại (`address` / `currentLiving`)
    2. **Chỉ số hình thể & Sức khỏe (Áp dụng khi tài khoản liên kết với Idol):**
       - Chiều cao (`height` - đơn vị cm)
       - Cân nặng (`weight` - đơn vị kg)
       - Tự động hiển thị chỉ số thể trạng BMI và đánh giá thể trạng tương ứng.
    3. **Bảo mật & Tài khoản:**
       - Cập nhật ảnh đại diện (Upload hoặc dán URL).
       - Chức năng đổi mật khẩu đăng nhập an toàn.
       - Tài khoản ngân hàng nhận lương: Giữ nguyên chế độ Chỉ đọc (Readonly) kèm cảnh báo liên hệ phòng Kế toán / HR nếu cần đổi STK (đảm bảo an toàn tài chính).
  - Cập nhật hàm `onSaveProfile` trong `App.tsx` và backend API: Khi người dùng lưu, hệ thống sẽ đồng bộ cập nhật cả bảng tài khoản `UserAccount` lẫn hồ sơ nghệ sĩ `Idol` tương ứng nếu có liên kết `currentUser.idolId`.

---

### 📌 Vấn đề 4: Nâng cấp cụm Avatar góc phải thành User Dropdown Menu hiện đại
- **Tệp liên quan:** `src/components/Navbar.tsx`
- **Hiện trạng:**
  - Hiện tại, khi người dùng click vào Avatar / Tên trên Navbar, hệ thống lập tức mở toang modal `UserProfileModal`.
  - Trải nghiệm chưa tối ưu, thiếu các lối tắt nhanh (xem phiếu lương, đổi mật khẩu, đăng xuất...) theo chuẩn của các ứng dụng hiện đại.
- **Giải pháp triển khai:**
  - Khi click vào cụm Avatar / Tên người dùng góc phải Navbar, hiển thị **User Dropdown Menu (Menu popover)**:
    ```
    ┌────────────────────────────────────────────────────────┐
    │  [Avatar]  Hoàng Hải Yến                             🟢│
    │            Chuyên Viên Marketing & PR                  │
    │            marketing@auratalent.vn                     │
    ├────────────────────────────────────────────────────────┤
    │  👤  Hồ Sơ Cá Nhân & Chỉ Số (Profile)                  │
    │      Xem & cập nhật thông tin cá nhân, chiều cao, cân nặng │
    ├────────────────────────────────────────────────────────┤
    │  📄  Xem Phiếu Lương Của Tôi (My Payslip)              │
    │      Xem nhanh bảng lương cá nhân tháng gần nhất       │
    ├────────────────────────────────────────────────────────┤
    │  🔒  Đổi Mật Khẩu (Security)                           │
    │      Bảo vệ an toàn tài khoản đăng nhập                │
    ├────────────────────────────────────────────────────────┤
    │  ⚙️  Cài Đặt Hệ Thống (Settings - nếu có quyền)        │
    │      Cấu hình năm tham chiếu, thương hiệu & phòng ban  │
    ├────────────────────────────────────────────────────────┤
    │  🚪  Đăng Xuất (Logout - nút đỏ nổi bật)               │
    └────────────────────────────────────────────────────────┘
    ```
  - Tính năng tương tác:
    - Bấm ra ngoài (click-outside) tự động đóng menu.
    - Nhấn phím `Esc` tự động đóng menu.
    - Chuyển đổi trạng thái mượt mà với animation.

---

### 📌 Vấn đề 5: Chuyển nút Khôi Phục Dữ Liệu Ban Đầu vào Cài Đặt Hệ Thống trong Quản Trị
- **Tệp liên quan:** `src/components/Navbar.tsx`, `src/views/AdminPortalView.tsx`, `src/App.tsx`
- **Hiện trạng & Mối nguy hại:**
  - Nút icon xoay tròn `RotateCcw` đang hiển thị công khai trên thanh Navbar cho tất cả nhân viên.
  - Bất kỳ ai nhấn nhầm vào cũng có thể kích hoạt reset sạch cơ sở dữ liệu về mặc định ban đầu.
- **Giải pháp triển khai:**
  - **Xóa bỏ hoàn toàn nút `RotateCcw` trên thanh Navbar công khai** và **KHÔNG để trong User Dropdown**.
  - **Chuyển tính năng này vào bên trong Tab Quản Trị (`admin`) ➔ Mục Cài Đặt Hệ Thống / Quản Trị Dữ Liệu**:
    - Chỉ Super Admin / Giám đốc mới có quyền truy cập trang này.
    - Đặt trong khu vực **"Vùng Nguy Hiểm (Danger Zone)"** với viền đỏ cảnh báo.
  - **Hộp thoại xác nhận 2 bước an toàn (Two-Step Confirmation Modal)**:
    - Khi Super Admin nhấn nút Khôi phục dữ liệu ban đầu, hiển thị modal cảnh báo nguy hiểm màu đỏ:
      *"Hành động này sẽ khôi phục toàn bộ hệ thống về dữ liệu mẫu ban đầu và xóa sạch mọi thay đổi hiện tại."*
    - Yêu cầu người quản trị **phải gõ chính xác từ khóa `RESET` hoặc `XAC NHAN`** vào ô xác nhận thì nút thực thi mới sáng lên.
    - Triệt tiêu 100% rủi ro bấm nhầm làm mất dữ liệu.

---

## 3. Bảng Phân Công Tệp Tin Cần Chỉnh Sửa

| STT | Tệp tin (File Path) | Nhiệm vụ chỉnh sửa |
| :---: | :--- | :--- |
| 1 | `src/components/IdolModal.tsx` | Khóa `accountUsername` và `email` khi `isEdit === true` (Readonly + icon 🔒 nhỏ gọn, không text dài dòng). |
| 2 | `src/components/IdolDetailModal.tsx` | Nhận prop `canManageIdols`, ẩn nút màu đỏ `Chỉnh Sửa Hồ Sơ` và nút lập lịch khi không có quyền. |
| 3 | `src/components/UserProfileModal.tsx` | Thêm các trường Tên thật, Nghệ danh, Ngày sinh, Quê quán, Chiều cao, Cân nặng, tính BMI. |
| 4 | `src/components/Navbar.tsx` | Xây dựng User Dropdown Menu cho Avatar; Xóa bỏ hoàn toàn nút Reset dữ liệu khỏi Navbar. |
| 5 | `src/views/AdminPortalView.tsx` | Tích hợp nút "Khôi Phục Dữ Liệu Ban Đầu" vào mục Cài Đặt Hệ Thống / Vùng nguy hiểm. |
| 6 | `src/App.tsx` | Truyền `canManageIdols` vào `IdolDetailModal`; Mở rộng handler `handleSaveProfile` cập nhật cả Idol; Thêm modal xác nhận 2 bước (gõ chữ) khi Reset dữ liệu. |

---

## 4. Trình Tự Thực Hiện

1. **Bước 1 (Đã hoàn thành ✅):** Cập nhật `IdolModal.tsx` khóa Username & Email khi chỉnh sửa (gọn gàng với icon `🔒`).
2. **Bước 2 (Đã hoàn thành ✅):** Cập nhật `IdolDetailModal.tsx` và `App.tsx` kiểm tra quyền `canManageIdols` (ẩn nút đỏ "Chỉnh Sửa Hồ Sơ" và nút thiết lập lịch đối với nhân sự không có quyền quản lý).
3. **Bước 3 (Đã hoàn thành ✅):** Cập nhật `UserProfileModal.tsx`, `api.ts`, `server.ts`, `store.ts` và `pgStore.ts` đồng bộ thông tin cá nhân đầy đủ (Họ tên thật, Nghệ danh, Ngày sinh, Quê quán, Chiều cao, Cân nặng, Live BMI Card).
4. **Bước 4 (Đã hoàn thành ✅):** Cập nhật `Navbar.tsx` với User Dropdown Menu hiện đại (Profile, Phiếu lương, Đổi mật khẩu, Cài đặt hệ thống, Đăng xuất) và xóa nút Reset lộ thiên.
5. **Bước 5 (Đã hoàn thành ✅):** Thêm nút Reset vào Cài Đặt Hệ Thống trong `AdminPortalView.tsx` (Vùng Nguy Hiểm - Danger Zone) kèm Hộp thoại xác nhận 2 bước an toàn (bắt buộc gõ chữ `RESET` hoặc `XAC NHAN`).
6. **Bước 6 (Đã hoàn thành ✅):** Kiểm tra TypeScript (`pnpm exec tsc --noEmit` đạt 0 lỗi) và kiểm tra tương tác thực tế qua trình duyệt.
