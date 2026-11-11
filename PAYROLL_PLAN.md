# Kế Hoạch & Thiết Kế Kiến Trúc Hệ Thống Bảng Lương (Payroll Management)
**Hệ thống Quản lý Idol & Nhân sự Nghệ thuật Aura Talent**

---

## 1. Bối Cảnh & Đặc Thù Nghiệp Vụ Của Agency Nghệ Thuật
Khác với doanh nghiệp truyền thống chỉ chấm công theo giờ hành chính 8 tiếng/ngày, Aura Talent quản lý 2 nhóm nhân sự với cơ chế thu nhập hoàn toàn khác biệt:

```
                          ┌─────────────────────────────────────┐
                          │     HỆ THỐNG QUẢN LÝ BẢNG LƯƠNG     │
                          │        AURA TALENT PAYROLL          │
                          └──────────────────┬──────────────────┘
                                             │
                   ┌─────────────────────────┴─────────────────────────┐
                   ▼                                                   ▼
     ┌───────────────────────────┐                       ┌───────────────────────────┐
     │   NHÓM IDOL / NGHỆ SĨ     │                       │  NHÓM NHÂN SỰ VẬN HÀNH    │
     │      (TALENT POOL)        │                       │       (BACK-OFFICE)       │
     ├───────────────────────────┤                       ├───────────────────────────┤
     │ • Lương cứng cam kết      │                       │ • Lương theo bậc chức danh│
     │ • Thưởng KPI Vận Hành     │                       │ • Phụ cấp trách nhiệm/ăn  │
     │   (Giờ live/GMV/View/Quà) │                       │ • Thưởng KPI nhiệm vụ     │
     │ • Hoa hồng GMV bán hàng   │                       │ • Công chuẩn & Phép năm   │
     │ • Chia sẻ doanh thu quà PK│                       │ • Giảm trừ nghỉ không phép│
     │ • Phạt thiếu giờ live     │                       │ • BHXH, BHYT, Thuế TNCN   │
     └───────────────────────────┘                       └───────────────────────────┘
```

---

## 2. Công Thức & Quy Tắc Tính Lương Chi Tiết

### A. Đối với Nghệ Sĩ & Idol Live Stream
$$\text{Lương Thực Nhận} = (\text{Lương Cứng} + \text{Thưởng KPI} + \text{Hoa Hồng GMV} + \text{Chia Sẻ Quà}) - (\text{Phạt Thiếu Giờ} + \text{Tạm Ứng} + \text{Thuế TNCN})$$

1. **Lương cứng / Trợ cấp cố định (`baseSalary`)**:
   > [!IMPORTANT]
   > **Nguyên tắc Lương cứng do HR nhập linh hoạt (Không cố định 12 triệu)**:
   > - **Tuyệt đối không áp dụng mức cứng 12.000.000 đ mặc định**: Mỗi Idol, nghệ sĩ hay nhân sự đều có hợp đồng riêng với mức đãi ngộ khác nhau tùy theo cấp bậc, độ ảnh hưởng và vai trò:
   >   - *Idol Độc quyền / A-Listers*: 15.000.000 đ – 30.000.000 đ/tháng.
   >   - *Idol Đang phát triển / Ban nhạc*: 10.000.000 đ – 15.000.000 đ/tháng.
   >   - *Thực tập sinh (Trainee)*: Trợ cấp hỗ trợ 5.000.000 đ – 8.000.000 đ/tháng.
   >   - *Cộng tác viên (CTV) / Outsource*: 0 đ (thuần ăn chia hoa hồng đơn hàng & quà PK) hoặc mức thỏa thuận riêng theo mùa vụ.
   > - **Cơ chế thiết lập của HR**:
   >   1. **Thiết lập gốc trong Hồ Sơ**: HR / Quản trị viên nhập trực tiếp tại trường *Lương Cứng Hợp Đồng* trong popup quản lý thông tin Idol (`IdolModal`).
   >   2. **Tự động đối soát vào Bảng Lương**: Khi tạo bảng lương hàng tháng, hệ thống tự động kế thừa mức lương thỏa thuận của từng người.
   >   3. **Quyền điều chỉnh từng kỳ lương**: Trong bước lập dự thảo (Draft), HR có toàn quyền tăng/giảm hoặc nhập số tiền lương thực tế của kỳ đó (nếu có phụ lục hợp đồng, thưởng nóng hoặc thỏa thuận riêng) trước khi trình Giám Đốc phê duyệt.
2. **Thưởng KPI Vận hành (`kpiBonus`)**: Có thể thay đổi theo chính sách của Giám đốc, hoặc quản lý đề xuất, nếu quản lý đề xuất, giám đốc phê duyệt
   - Tự động quy đổi từ 4 trụ cột vận hành tháng:
     - $\ge 90$ điểm (Xuất sắc): **+3.000.000 đ**
     - $80 - 89$ điểm (Đạt chuẩn): **+1.500.000 đ**
     - $70 - 79$ điểm (Khá): **+500.000 đ**
     - $< 70$ điểm: **0 đ**
3. **Hoa hồng Doanh số Live Commerce (`commissionGmv`)**:
   - Tính theo % bậc doanh số chốt đơn thực tế (VD: 2% - 5% GMV bán được).
4. **Chia sẻ Doanh thu Quà tặng & PK (`giftShare`)**:
   - Tỷ lệ trích thưởng từ điểm quà tặng / kim cương sau khi nền tảng đối soát (VD: 20% - 35%).
5. **Khấu trừ & Phạt thiếu giờ (`deductions`)**: tỉ lệ trừ dưới đây là mặc định, giá trị thay đổi đối với từng idol, vì mỗi idol đảm nhiệm 1 hợp đồng với nhãn hàng riêng, mức lương riêng, target kpi riêng
   - Căn cứ số giờ thiếu so với mục tiêu tháng (VD: target 60h/tháng):
     - Thiếu $> 15$h: Phạt **-1.000.000 đ**
     - Thiếu $> 5$h: Phạt **-500.000 đ**
     - Nghỉ ca live đột xuất không phép: **-300.000 đ/ca**
     - Tạm ứng lương trong kỳ: Trừ tương ứng.

---

### B. Đối với Nhân Sự Vận Hành & Phòng Ban (Managers, Live Ops, HR, Booking)
$$\text{Lương Thực Nhận} = (\text{Lương Cơ Bản} + \text{Phụ Cấp} + \text{Thưởng Hiệu Suất}) - (\text{Giảm Trừ Nghỉ Không Lương} + \text{Bảo Hiểm} + \text{Thuế TNCN})$$

1. **Lương cơ bản & Phụ cấp**:
   - Lương theo vị trí (Trưởng phòng, Trưởng nhóm, Chuyên viên).
   - Phụ cấp: Ăn trưa, trách nhiệm quản lý, ca đêm livestream.
2. **Đối soát ngày công & Nghỉ phép**:
   - Dựa trên module **Nghỉ Phép** đã xây dựng:
     - Nghỉ phép năm đã được duyệt: Hưởng 100% lương ngày công.
     - Nghỉ không hưởng lương hoặc nghỉ không phép: Khấu trừ theo tỷ lệ `(Lương cơ bản / Ngày công chuẩn) * Số ngày nghỉ`.
3. **Thưởng hiệu suất nhiệm vụ (`taskBonus`)**:
   - Căn cứ tỷ lệ hoàn thành tasks đúng hạn trên hệ thống.

---

## 3. Thiết Kế Cơ Sở Dữ Liệu (Schema)

```typescript
// Kỳ lương (Payroll Period)
export interface PayrollPeriod {
  id: string; // e.g., "payroll-2026-10"
  period: string; // "2026-10"
  status: 'draft' | 'pending_approval' | 'approved' | 'locked_paid';
  totalGross: number; // Tổng chi lương gộp
  totalDeductions: number; // Tổng giảm trừ
  totalNet: number; // Tổng lương thực chi
  employeeCount: number;
  approvedBy?: {
    id: string;
    name: string;
  };
  approvedAt?: string;
  lockedAt?: string;
  createdAt: string;
}

// Phiếu lương cá nhân chi tiết (Payroll Record / Payslip)
export interface PayrollRecord {
  id: string;
  periodId: string;
  period: string; // "2026-10"
  userId: string;
  idolId?: string; // Nếu là Idol
  employeeName: string;
  stageName?: string;
  department: string;
  personnelType: string;
  isIdol: boolean;
  
  // Dữ liệu tài khoản ngân hàng (Chỉ đọc từ hồ sơ bảo mật)
  bankInfo: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };

  // 1. Các khoản thu nhập (Earnings)
  earnings: {
    baseSalary: number; // Lương cứng / Lương cơ bản
    kpiBonus: number; // Thưởng KPI
    commissionGmv?: number; // Hoa hồng bán hàng
    giftShare?: number; // Thưởng quà tặng
    allowance: number; // Phụ cấp
    otherBonus?: number; // Thưởng khác
    totalGross: number; // Lương gộp
  };

  // 2. Các khoản giảm trừ (Deductions)
  deductions: {
    liveHoursPenalty?: number; // Phạt thiếu giờ live
    unpaidLeaveDeduction?: number; // Trừ ngày nghỉ không phép
    advancePayment?: number; // Tạm ứng
    tax?: number; // Thuế TNCN
    insurance?: number; // Bảo hiểm xã hội/y tế
    otherPenalty?: number; // Kỷ luật khác
    totalDeductions: number; // Tổng giảm trừ
  };

  // 3. Thực nhận
  netSalary: number; // totalGross - totalDeductions

  // 4. Trạng thái & Đối soát
  paymentStatus: 'pending' | 'paid';
  paidAt?: string;
  paymentRef?: string; // Mã giao dịch chuyển khoản ngân hàng
  notes?: string;
}
```

---

## 4. Quy Trình Vận Hành & Phê Duyệt 4 Bước (Workflow)

```
[BƯỚC 1: TỔNG HỢP DỮ LIỆU TỰ ĐỘNG]
      │
      ├── Giờ live stream thực tế từ Ca Trực (Schedules & Tasks)
      ├── Chỉ số KPI Vận Hành (Live hours, GMV, Views, Quà tặng)
      └── Dữ liệu Nghỉ phép từ Module Quản Trị Nghỉ Phép
      │
      ▼
[BƯỚC 2: KẾ TOÁN / HR LẬP DỰ THẢO (DRAFT)]
      │
      ├── Rà soát từng phiếu lương của Idol và Nhân sự
      ├── Bổ sung tạm ứng, hoa hồng đặc biệt hoặc ghi chú đối soát
      └── Nhấn "Gửi Giám Đốc Phê Duyệt"
      │
      ▼
[BƯỚC 3: GIÁM ĐỐC ĐIỀU HÀNH PHÊ DUYỆT (SUPER ADMIN)]
      │
      ├── Xem báo cáo tổng quan quỹ lương theo từng phòng ban
      ├── So sánh ngân sách tháng trước vs tháng này
      └── Phê duyệt bảng lương (Approved)
      │
      ▼
[BƯỚC 4: XUẤT PHIẾU LƯƠNG & CHI TRẢ NGÂN HÀNG]
      │
      ├── Phiếu lương điện tử (Payslip) tự động mở khóa trên Dashboard của Idol/Nhân sự
      ├── Xuất bảng kê thanh toán Excel/CSV chuẩn ngân hàng (MB Bank, VCB, Techcombank)
      └── Khóa sổ kỳ lương (Locked & Paid)
```

---

## 5. Lộ Trình Triển Khai (Implementation Phases)

### Giai đoạn 1: Xây dựng Core Engine & API Backend
- Thiết kế Data Store cho `payrolls` và `payroll_records` trong `server/data/store.ts`.
- Thuật toán tự động quét dữ liệu tháng:
  - Tính `kpiBonus` từ 4 chỉ số vận hành của Idol.
  - Tính `liveDeficitPenalty` dựa trên số giờ thiếu hụt.
  - Tính `unpaidLeaveDeduction` dựa trên đơn nghỉ phép không hưởng lương.
- Các REST API:
  - `GET /api/payrolls`: Danh sách kỳ lương
  - `GET /api/payrolls/:period`: Chi tiết bảng lương theo tháng
  - `POST /api/payrolls/generate`: Tự động tạo bảng lương tháng
  - `PUT /api/payrolls/:period/records/:id`: Cập nhật/điều chỉnh phiếu lương
  - `POST /api/payrolls/:period/submit`: Gửi duyệt
  - `POST /api/payrolls/:period/approve`: Giám đốc phê duyệt
  - `POST /api/payrolls/:period/lock`: Khóa sổ thanh toán

### Giai đoạn 2: Giao Diện Quản Trị Bảng Lương (Admin & Kế Toán View)
- Bổ sung tab **`Bảng Lương`** tại thanh điều hướng (Phân quyền cho Super Admin và HR/Kế toán).
- Bộ lọc theo: Tháng/Quý, Phòng ban/Nhóm, Loại nhân sự (Idol vs Nhân viên văn phòng).
- Thẻ thống kê tài chính: Tổng quỹ lương gộp, Tổng thưởng KPI, Tổng giảm trừ, Thực chi.
- Bảng chi tiết lương từng nhân sự có thanh tìm kiếm, trạng thái chi trả và nút xem Phiếu Lương.
- Modal Drawer chỉnh sửa các khoản tạm ứng/thưởng phát sinh.
- Chức năng xuất danh sách chuyển khoản ngân hàng (Excel/CSV).

### Giai đoạn 3: Màn Hình Xem Phiếu Lương Cá Nhân (Idol & Nhân Viên Dashboard)
- Tích hợp thẻ **Phiếu Lương Điện Tử (Payslip)** vào Bàn Làm Việc Idol & Hồ sơ nhân viên.
- Cơ chế bảo mật:
  - Chỉ người sở hữu tài khoản và Ban Quản Trị mới xem được phiếu lương cá nhân.
  - Khóa hiển thị cho đến khi Giám đốc chính thức phê duyệt kỳ lương.
- Giao diện phiếu lương trực quan:
  - Bóc tách chi tiết: Lương cứng, Thưởng KPI, Hoa hồng, Khấu trừ, Thực lĩnh.
  - Hiển thị tài khoản thụ hưởng đã được khóa bảo mật (`MB Bank - STK: 1900889988`).
  - Nút "Tải Phiếu Lương (PDF/In)".

---

## 6. Cam Kết & Ràng Buộc Bảo Mật
1. **Bảo vệ thông tin tài khoản ngân hàng**: Bảng lương chỉ lấy STK và tên ngân hàng từ hồ sơ nội bộ đã khóa của nhân sự, không cho phép chỉnh sửa tùy tiện khi lập lương.
2. **Bảo mật tiền lương**: Mỗi nhân viên chỉ xem được phiếu lương của chính mình. Chỉ có Super Admin và Kế toán trưởng mới có quyền xem toàn bộ quỹ lương công ty.
3. **Minh bạch đối soát**: Mọi khoản phạt (thiếu giờ live, vi phạm) đều phải gắn kèm bằng chứng số liệu từ hệ thống ca trực và nhiệm vụ.
