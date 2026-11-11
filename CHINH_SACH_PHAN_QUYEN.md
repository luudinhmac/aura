# CHÍNH SÁCH PHÂN QUYỀN HỆ THỐNG AURA TALENT
## Hệ Thống Quản Trị Truy Cập Dựa Trên Vai Trò (Role-Based Access Control - RBAC)

> **Tài liệu chính thức:** [docs/security/permission-matrix.md](file:///d:/DATA/Project/aura-talent-management/docs/security/permission-matrix.md)  
> **Phiên bản:** 2.0 (Cập nhật sau chuẩn hóa RBAC)  
> **Áp dụng cho:** Toàn bộ nhân sự Khối Quản lý Vận hành và Khối Idol trực thuộc Aura Talent  
> **Nguyên tắc cốt lõi:** Quyền hạn tối thiểu (Principle of Least Privilege) & Phân tách trách nhiệm (Segregation of Duties).

---

## 1. TỔNG QUAN KIẾN TRÚC PHÂN QUYỀN

Hệ thống Aura Talent áp dụng mô hình phân quyền đa tầng kết hợp 3 chiều:

```
┌─────────────────────────────────────────────────────────────┐
│                       TÀI KHOẢN NGƯỜI DÙNG                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
       ┌───────────────────────┼────────────────────────┐
       ▼                       ▼                        ▼
┌──────────────┐       ┌───────────────┐       ┌─────────────────┐
│ TABS TRUY CẬP │       │ QUYỀN THAO TÁC│       │ PHẠM VI DỮ LIỆU │
│ (Navigation) │       │   (Actions)   │       │  (Departments)  │
└──────────────┘       └───────────────┘       └─────────────────┘
```

1. **Phân quyền Tabs (`allowedTabs`)**: Xác định các phân hệ/màn hình mà người dùng được phép nhìn thấy trên thanh điều hướng.
2. **Phân quyền Hành động (`allowedActions`)**: Xác định các nút bấm, nghiệp vụ CRUD, phê duyệt, hoặc thao tác tài chính được phép thực thi.
3. **Phạm vi Dữ liệu theo Phòng Ban (`allowedDepartments`)**:
   - `['*']`: Toàn quyền xem và tương tác với dữ liệu nhân sự trên toàn bộ công ty.
   - Danh sách cụ thể (ví dụ: `['Nhóm Idol Gaming & Gear']`): Chỉ được xem và tương tác với nhân sự thuộc các đơn vị được chỉ định.

---

## 2. DANH MỤC QUYỀN CHUẨN TRONG HỆ THỐNG

### 2.1. Phân Phân Hệ / Tabs Giao Diện (`AppTabPermission`)

| Mã Tab | Tên Phân Hệ | Mục Đích Sử Dụng |
| :--- | :--- | :--- |
| `roster` | **Danh Sách Nhân Sự** | Quản lý hồ sơ nhân sự, thông tin cá nhân, liên hệ, loại hợp đồng, tình trạng hoạt động. |
| `scoring` | **Bảng Chấm Điểm** | Đánh giá năng lực, nhập điểm định kỳ theo bộ tiêu chí chuyên môn. |
| `leaderboard` | **Bảng Xếp Hạng** | Theo dõi bảng vàng thành tích, thứ hạng điểm thi đua của các Idol. |
| `schedule` | **Lịch Trình & Ca Live** | Xếp ca livestream, lịch tập luyện, phân bổ phòng live studio. |
| `tasks` | **Công Việc & Nhiệm Vụ** | Giao việc, theo dõi tiến độ, bấm giờ ca trực, xử lý check-list. |
| `analytics` | **Báo Cáo & Phân Tích** | Biểu đồ nhân sự, tỷ lệ lấp đầy ca live, cơ cấu độ tuổi, thâm niên và KPI. |
| `payroll` | **Bảng Lương & Thưởng** | Tính lương cứng, phụ cấp, thưởng KPI, thưởng nóng và đối soát lương. |
| `kpi` | **Mục Tiêu & Chỉ Tiêu (KPI)** | Thiết lập nhóm chỉ tiêu doanh số GMV, giờ live, quà tặng donate. |
| `revenue` | **Doanh Thu & Hoa Hồng** | Thống kê doanh thu từ PK Donate, Booking Ads, Giỏ hàng thương mại. |
| `admin` | **Cài Đặt Hệ Thống** | Quản lý tài khoản, phân quyền RBAC, cơ cấu phòng ban, cấu hình hiển thị. |
| `my_dashboard` | **Bàn Làm Việc Cá Nhân** | Dành riêng cho Idol: xem ca trực cá nhân, điểm đánh giá, gửi đơn xin phép. |

---

### 2.2. Quyền Thao Tác Nghiệp Vụ (`AppActionPermission`)

| Mã Quyền Thao Tác | Tên Hành Động | Ý Nghĩa & Rủi Ro Nghiệp Vụ |
| :--- | :--- | :--- |
| `manage_idols` | Quản lý hồ sơ nhân sự | Thêm mới, chỉnh sửa hồ sơ, cập nhật trạng thái làm việc, xóa hồ sơ nhân sự. |
| `manage_scores` | Chấm điểm & Đánh giá | Nhập điểm chi tiết, cập nhật kết quả đánh giá cho từng nhân sự. |
| `manage_criteria` | Cấu hình tiêu chí chấm | Tạo mới, sửa đổi thang điểm, tỷ trọng bộ tiêu chí đánh giá. |
| `manage_schedule` | Xếp lịch & Phân ca | Tạo, điều chỉnh, phê duyệt lịch live, lịch tập luyện, đổi ca trực. |
| `manage_tasks` | Quản lý giao việc | Tạo task, giao việc cho nhân sự, đóng task và giám sát tiến độ. |
| `manage_departments` | Quản lý cơ cấu tổ chức | Thêm bớt phòng ban, phân nhánh trực thuộc trong sơ đồ tổ chức. |
| `manage_settings` | Cấu hình tham số hệ thống | Đổi năm tham chiếu thâm niên, tùy biến tiêu đề bảng, cấu hình tiêu chí phụ. |
| `manage_approvals` | Phê duyệt yêu cầu | Duyệt đơn xin nghỉ phép, đổi ca, yêu cầu duyệt hồ sơ từ cấp dưới. |
| `manage_payroll` | Lập dự thảo bảng lương | Tạo bảng tính lương, tổng hợp công và thưởng tự động theo tháng. |
| `adjust_payroll` | Điều chỉnh lương kế toán | Bổ sung các khoản khấu trừ, phụ cấp phát sinh, ứng lương. |
| `approve_payroll` | Duyệt chi trả lương | Giám đốc chốt và ký duyệt bảng lương chuyển khoản chính thức. |
| `hot_bonus` | Thưởng nóng trực tiếp | Ban Giám Đốc cấp thưởng nóng tức thì cho thành tích đột xuất. |
| `manage_kpi` | Thiết lập chỉ tiêu KPI | Cài đặt target GMV, giờ stream tối thiểu cho cá nhân và nhóm. |
| `manage_revenue` | Quản lý chia sẻ doanh thu | Cấu hình tỷ lệ chia sẻ doanh thu (RevShare) và đối soát hoa hồng đối tác. |

---

## 3. MA TRẬN PHÂN QUYỀN THEO VAI TRÒ CHUẨN (RBAC MATRIX)

Hệ thống định nghĩa sẵn **11 Role Presets** chuẩn hóa, phân theo 4 nhóm khối chức năng:

### 3.1. Nhóm Lãnh Đạo & Điều Hành (Leadership)

| Vai Trò | Đơn Vị Công Tác | Phạm Vi Dữ Liệu | Tabs Được Phép | Quyền Thao Tác Cấp Phép |
| :--- | :--- | :---: | :--- | :--- |
| **Giám Đốc Điều Hành (Super Admin)** | Ban Giám Đốc | Toàn bộ (`*`) | `roster`, `scoring`, `leaderboard`, `schedule`, `tasks`, `analytics`, `admin`, `payroll`, `kpi` | **Toàn quyền:** `manage_idols`, `manage_scores`, `manage_criteria`, `manage_schedule`, `manage_tasks`, `manage_departments`, `manage_settings`, `manage_approvals`, `manage_payroll`, `approve_payroll`, `hot_bonus`, `manage_kpi` |

---

### 3.2. Nhóm Quản Lý & Phát Triển Idol (Talent Management)

| Vai Trò | Đơn Vị Công Tác | Phạm Vi Dữ Liệu | Tabs Được Phép | Quyền Thao Tác Cấp Phép |
| :--- | :--- | :---: | :--- | :--- |
| **Trưởng Phòng QL & Phát Triển Idol** | Phòng QL & Phát Triển Idol | 3 Nhóm Idol | `roster`, `schedule`, `tasks`, `analytics`, `kpi` | `manage_idols`, `manage_schedule`, `manage_tasks`, `manage_approvals`, `manage_kpi` |
| **Chuyên Viên Tuyển Chọn & Đào Tạo** | Phòng QL & Phát Triển Idol | 3 Nhóm Idol | `roster`, `schedule`, `tasks` | `manage_idols`, `manage_schedule`, `manage_tasks` |

---

### 3.3. Nhóm Trực Tiếp Vận Hành Nhóm Idol Chuyên Biệt

| Vai Trò | Đơn Vị Công Tác | Phạm Vi Dữ Liệu | Tabs Được Phép | Quyền Thao Tác Cấp Phép |
| :--- | :--- | :---: | :--- | :--- |
| **Trưởng Nhóm Gaming & Gear** | Nhóm Idol Gaming & Gear | Nhóm Gaming & Gear | `roster`, `schedule`, `tasks` | `manage_schedule`, `manage_tasks` |
| **Idol Nữ Gaming & Gear** | Nhóm Idol Gaming & Gear | Nhóm Gaming & Gear | `my_dashboard`, `schedule`, `tasks` | *Chỉ xem cá nhân (Viewer)* |
| **Trưởng Nhóm Biểu Diễn & Donate (PK)** | Nhóm Idol Biểu Diễn & Donate | Nhóm Biểu Diễn & Donate | `roster`, `schedule`, `tasks` | `manage_schedule`, `manage_tasks` |
| **Idol Biểu Diễn & Donate (PK)** | Nhóm Idol Biểu Diễn & Donate | Nhóm Biểu Diễn & Donate | `my_dashboard`, `schedule`, `tasks` | *Chỉ xem cá nhân (Viewer)* |
| **Trưởng Nhóm Live Commerce** | Nhóm Idol Live Commerce | Nhóm Live Commerce | `roster`, `schedule`, `tasks`, `analytics` | `manage_schedule`, `manage_tasks` |
| **Idol Live Commerce Chốt Đơn** | Nhóm Idol Live Commerce | Nhóm Live Commerce | `my_dashboard`, `schedule`, `tasks` | *Chỉ xem cá nhân (Viewer)* |
| **Idol / Nghệ Sĩ Độc Quyền (Chung)** | Phòng QL & Phát Triển Idol | Cá nhân / Khối Idol | `my_dashboard`, `schedule`, `tasks` | *Chỉ xem cá nhân (Viewer)* |

---

### 3.4. Nhóm Phòng Ban Hỗ Trợ Dùng Chung (Shared Corporate Support)

| Vai Trò | Đơn Vị Công Tác | Phạm Vi Dữ Liệu | Tabs Được Phép | Quyền Thao Tác Cấp Phép |
| :--- | :--- | :---: | :--- | :--- |
| **HR & Kế Toán** | HR & Kế Toán | Toàn bộ (`*`) | `roster`, `schedule`, `analytics`, `payroll`, `kpi` | `manage_idols`, `manage_approvals`, `manage_payroll`, `adjust_payroll` *(Không có quyền Admin hệ thống)* |
| **Marketing & Truyền Thông** | Marketing & Truyền Thông | Toàn bộ (`*`) | `roster`, `tasks`, `analytics` | `manage_tasks` |
| **Kinh Doanh Nhãn Hàng** | Kinh Doanh Nhãn Hàng | Toàn bộ (`*`) | `roster`, `schedule`, `tasks`, `analytics` | `manage_tasks`, `manage_schedule` |
| **Nội Dung & Sản Xuất** | Nội Dung & Sản Xuất | Toàn bộ (`*`) | `roster`, `schedule`, `tasks` | `manage_tasks`, `manage_schedule` |
| **Vận Hành Livestream** | Vận Hành Livestream | Toàn bộ (`*`) | `schedule`, `tasks`, `roster` | `manage_schedule`, `manage_tasks` |

---

## 4. QUY TRÌNH GÁN QUYỀN & QUẢN LÝ TRUY CẬP (RBAC WORKFLOW)

Tại màn hình **Trang Quản Trị** (`AdminPortalView`), tab **Tài Khoản & Phân Quyền**, quản trị viên có 3 phương thức thiết lập quyền nhanh chóng:

### 4.1. Gán Nhanh Theo Cả Phòng Ban (⚡ 1-Click Department Assign)
- Dành cho trường hợp toàn bộ nhân viên trong một phòng ban cùng đảm nhiệm một vai trò (ví dụ: gán toàn bộ nhân sự phòng *HR & Kế toán* vào vai trò *HR & Kế toán*).
- Quản trị viên chỉ cần chọn vai trò bên cột trái -> Nhấn nút **"⚡ Gán Cả Phòng Ban"** -> Chọn phòng ban đích -> Toàn bộ tài khoản thuộc phòng ban đó sẽ được gán vai trò và kế thừa toàn bộ ma trận quyền tương ứng.

### 4.2. Chọn Thêm Nhân Sự Hàng Loạt (👥 Bulk Multi-Select Assign)
- Cho phép tìm kiếm nhân sự theo tên, lọc theo từng phòng ban và tick chọn hàng loạt thành viên để gán vào vai trò.
- Thích hợp cho các vai trò kiêm nhiệm (ví dụ: chọn 3 trưởng nhóm từ các đơn vị khác nhau vào vai trò quản lý).

### 4.3. Đồng Bộ Quyền Chuẩn Hóa (Sync Roles)
- Khi chính sách công ty thay đổi (ví dụ: cấp thêm tab `kpi` cho vai trò *Trưởng Phòng QL Idol*), quản trị viên chỉ cần cập nhật ma trận quyền của vai trò trên giao diện -> Nhấn **"Lưu & Đồng Bộ Quyền"**.
- Hệ thống sẽ tự động đồng bộ ngay lập tức quyền mới cho toàn bộ nhân sự đang thuộc vai trò đó mà không cần sửa từng người.

---

## 5. CÁC NGUYÊN TẮC BẢO MẬT & PHÂN TÁCH TRÁCH NHIỆM

1. **Ranh giới HR & Kế Toán với Quản Trị Hệ Thống**:
   - HR & Kế Toán có toàn quyền đối soát nhân sự, lịch trực và lập dự thảo bảng lương nhưng **tuyệt đối không có quyền truy cập tab `admin`** và không thể sửa đổi cấu trúc phòng ban hệ thống (`manage_departments`).
2. **Quy Trình Duyệt Bảng Lương 2 Cấp**:
   - HR/Kế toán: Lập bảng lương (`manage_payroll`) và điều chỉnh các khoản chiết khấu/thưởng phạt phát sinh (`adjust_payroll`).
   - Giám đốc điều hành: Là người duy nhất có quyền ký duyệt chi thức bảng lương (`approve_payroll`).
3. **Quyền Hạn Idol & Streamer**:
   - Tài khoản của Idol là tài khoản tự phục vụ (Self-Service Viewer), chỉ được xem lịch ca của bản thân qua tab `my_dashboard`, không thể sửa thông tin của Idol khác hoặc truy cập bảng lương nội bộ.
4. **Bảo Mật Mật Khẩu**:
   - Tài khoản nhân viên có thể tự đổi mật khẩu qua thanh người dùng ở góc trên cùng.
   - Quản trị viên hệ thống có thể cấp lại mật khẩu mới thông qua Modal Chỉnh Sửa Tài Khoản.
