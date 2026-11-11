# BẢN THIẾT KẾ KIẾN TRÚC & KẾ HOẠCH TRIỂN KHAI HỆ THỐNG TÀI CHÍNH AURA TALENT

## 1. Mục Tiêu & Yêu Cầu Nghiệp Vụ Cốt Lõi

Hệ thống tài chính hiện tại của công ty cần được thiết kế lại để phản ánh chính xác thực tế hoạt động của một **Agency Quản Lý Idol & Giải Trí (Idol Agency OS)**, khắc phục các khoảng trống kế toán:
1. **Phân biệt rạch ròi giữa "Số tiền Pay thực nhận cho nhân viên" vs "Chi phí Nhân sự thực tế công ty phải chi"**:
   - Nhân viên đóng **10.5%** bảo hiểm (8% BHXH, 1.5% BHYT, 1% BHTN) trừ vào lương Gross để ra lương Net thực nhận.
   - Công ty đóng thêm **21.5%** bảo hiểm (17.5% BHXH, 3% BHYT, 1% BHTN) trên quỹ lương đóng bảo hiểm.
   - $\Rightarrow$ **Chi phí nhân sự thực tế của Công ty = Lương Gross + 21.5% Bảo hiểm công ty đóng**. Thực tế công ty chi trả nhiều hơn số tiền chuyển khoản vào tài khoản nhân viên.
2. **Quản lý danh mục Chi phí toàn diện của Agency**:
   - **Chi phí Mặt bằng & Trụ sở**: Thuê mặt bằng/studio cố định hoặc theo kỳ, tiền điện nước, cáp quang Internet chuyên dụng livestream tốc độ cao.
   - **Chi phí Đầu tư Trang thiết bị (CapEx)**: Dàn PC livestream, card đồ họa, máy quay Sony, ống kính, đèn chiếu sáng, micro thu âm cao cấp, decor cách âm phòng live.
   - **Chi phí Vận hành, Đi lại & Sửa chữa (OpEx)**: Đưa đón idol đi diễn/event, công tác phí, mua phụ kiện, mỹ phẩm, sửa chữa và bảo dưỡng thiết bị định kỳ.
   - **Chi phí Khác & Chi phí Phát sinh Động**: Chạy quảng cáo đẩy view phiên live lớn, tiệc liên hoan/tiếp khách, phần mềm bản quyền, phát sinh theo sự kiện.
3. **Báo cáo Tài chính & Lợi Nhuận Đa Chu Kỳ**:
   - Xem báo cáo theo **Tháng**, **Quý**, **Năm**, và **Tổng Toàn Thời Gian**.
   - Báo cáo Lợi Nhuận P&L (Doanh thu thuần $\rightarrow$ Lợi nhuận gộp $\rightarrow$ Chi phí vận hành $\rightarrow$ Lợi nhuận trước thuế $\rightarrow$ Lợi nhuận ròng).
4. **Chuẩn hóa Gợi ý (Image 2) cho mô hình Idol Agency**:
   - Không áp dụng máy móc mô hình thương mại bán lẻ chung chung, mà tùy biến thành 4 trụ cột phù hợp đặc thù của Aura Talent:
     + Trụ cột 1: **Quản lý Thu - Chi & Sổ Quỹ (Cash Flow & Vouchers)**
     + Trụ cột 2: **Quản lý Doanh thu Agency (Brand Booking, Live Commerce, PK Donate, Dịch vụ ngoài)**
     + Trụ cột 3: **Quản lý Chi phí & Chi phí Nhân sự thực tế (Expenses & Employment Cost)**
     + Trụ cột 4: **Báo cáo Lợi nhuận & Phân tích Tài chính P&L (P&L Financial Reports)**

---

## 2. Thiết Kế Chi Tiết Các Hợp Phần

### A. Công Thức Chi Phí Lương & Bảo Hiểm Thực Tế

| Hạng mục bảo hiểm | Nhân viên đóng (trừ vào lương Gross) | Công ty đóng thêm (chi phí công ty) | Tổng nộp cơ quan BHXH |
| :--- | :---: | :---: | :---: |
| **BHXH (Bảo hiểm xã hội)** | 8.0% | 17.5% | 25.5% |
| **BHYT (Bảo hiểm y tế)** | 1.5% | 3.0% | 4.5% |
| **BHTN (Bảo hiểm thất nghiệp)** | 1.0% | 1.0% | 2.0% |
| **TỔNG CỘNG** | **10.5%** | **21.5%** | **32.0%** |

- **Số tiền Pay thực nhận cho nhân viên (Net Payout)**:
  $$\text{Net Payout} = \text{Total Gross} - \text{Bảo hiểm NV (10.5\%)} - \text{Thuế TNCN} - \text{Tạm ứng/Khấu trừ khác}$$
- **Tổng Chi Phí Nhân Sự Thực Tế Của Công Ty (Total Employment Cost)**:
  $$\text{Company Labor Cost} = \text{Total Gross} + \text{Bảo hiểm Công ty (21.5\%)}$$
  *(Đối với CTV / Dịch vụ ngoài: không phát sinh 21.5% bảo hiểm bắt buộc).*

---

### B. Cấu Trúc Danh Mục Chi Phí (Company Expense Categories)

1. **Chi phí Nhân sự & Lương - Bảo hiểm (`LABOR_EXPENSE`)**:
   - Lương Net nhân viên & idol
   - Bảo hiểm công ty đóng (21.5%) nộp BHXH
   - Thưởng nóng, thưởng KPI, hoa hồng
2. **Chi phí Mặt bằng & Tiện ích Studio (`FACILITY_EXPENSE`)**:
   - Tiền thuê mặt bằng văn phòng & studio livestream (cố định hoặc hợp đồng thuê)
   - Tiền điện, nước studio (hoạt động máy tính & đèn công suất lớn)
   - Đường truyền Internet cáp quang chuyên dụng livestream (FTTH băng thông quốc tế)
   - Phí dịch vụ tòa nhà, an ninh, vệ sinh
3. **Chi phí Đầu tư Thiết bị & Tài sản (`INVESTMENT_CAPEX`)**:
   - PC Gaming/Streaming chuyên dụng, màn hình, Capture Card
   - Máy ảnh, máy quay phim, ống kính lens
   - Hệ thống đèn studio (Key light, fill light, RGB background)
   - Thiết bị âm thanh (Micro Shure/Rode, Sound card GoXLR/Audient, tai nghe kiểm âm)
   - Bàn nâng hạ công thái học, ghế livestream, setup decor cách âm phòng live
4. **Chi phí Đi lại, Dụng cụ & Sửa chữa (`OPERATIONS_OPEX`)**:
   - Chi phí đưa đón idol đi show/event, công tác phí, vé máy bay/khách sạn
   - Mua sắm mỹ phẩm, đồ trang điểm, phụ kiện quay, trang phục biểu diễn
   - Sửa chữa, bảo dưỡng linh kiện, thay thế thiết bị hỏng hóc
5. **Chi phí Phát sinh Động & Sự kiện (`DYNAMIC_EVENT_EXPENSE`)**:
   - Chi phí Marketing/Ads đẩy traffic cho các phiên Live Mega / Sự kiện thương hiệu
   - Tiếp khách, ký kết hợp đồng với Brand đối tác
   - Tiệc liên hoan, sinh nhật idol, teambuilding gắn kết
   - Bản quyền phần mềm, kho nhạc stream, các phát sinh đột xuất theo dự án

---

### C. Cấu Trúc Báo Cáo Lợi Nhuận P&L (Profit & Loss Statement)

Hệ thống cung cấp chuyển đổi linh hoạt 4 phạm vi: **Tháng** | **Quý** | **Năm** | **Toàn thời gian (Tổng)**:

```
[+] DOANH THU THUẦN (NET REVENUE)
    ├── Doanh thu Booking nhãn hàng & Brand Deals
    ├── Doanh thu Live Commerce (Affiliate & GMV chốt đơn)
    ├── Doanh thu Quà tặng & PK Donate
    └── Doanh thu Dịch vụ ngoài (Khách thuê studio, quay chụp)

[-] CHI PHÍ TRỰC TIẾP TẠO DOANH THU (COGS)
    ├── Thù lao chia sẻ cho Idol/Talent theo tỷ lệ hợp đồng
    ├── Phí nền tảng (TikTok, Shopee, Bigo, thuế sàn)
    └── Chi phí sản xuất & ekip trực tiếp theo deal

[=] LỢI NHUẬN GỘP (GROSS PROFIT)
    └── Tỷ suất Lợi nhuận gộp (Gross Margin %)

[-] CHI PHÍ HOẠT ĐỘNG & VẬN HÀNH (OPEX)
    ├── Chi phí nhân sự & Quản lý (Lương khối văn phòng + 21.5% Bảo hiểm công ty đóng)
    ├── Chi phí mặt bằng & Tiện ích điện nước mạng
    ├── Chi phí đi lại, công tác, dụng cụ, sửa chữa
    ├── Chi phí phân bổ/khấu hao thiết bị đầu tư (CapEx)
    └── Chi phí động, Marketing & Tiếp khách sự kiện

[=] LỢI NHUẬN HOẠT ĐỘNG THUẦN (OPERATING PROFIT / EBIT)

[-] CHI PHÍ KHÁC & THUẾ THU NHẬP DOANH NGHIỆP (TNDN)

[=] LỢI NHUẬN RÒNG CUỐI CÙNG (NET PROFIT / BOTTOM LINE)
    └── Biên lợi nhuận ròng (Net Profit Margin %)
```

---

## 3. Kiến Trúc Kỹ Thuật (Data & UI Implementation)

### A. Mô Hình Cơ Sở Dữ Liệu (Prisma / PostgreSQL)
Tạo bảng mới `company_expenses`:
1. **`CompanyExpense`**:
   - `id`: UUID
   - `expenseCode`: EXP-YYYYMM-0001
   - `period`: YYYY-MM
   - `expenseDate`: Date
   - `category`: `FACILITY` | `INVESTMENT_CAPEX` | `OPERATIONS_OPEX` | `LABOR_INSURANCE` | `DYNAMIC_EVENT` | `OTHER`
   - `title`: Tên khoản chi (VD: "Tiền thuê mặt bằng studio T10", "Dàn PC Live Stream Studio 1", "Đóng bảo hiểm 21.5% cơ quan BHXH T10")
   - `amount`: Số tiền chi
   - `facilityType`: `fixed` (mặt bằng cố định) | `rented` (thuê) | null
   - `paymentMethod`: `bank_transfer` | `cash`
   - `recipient`: Đơn vị thụ hưởng (chủ nhà, nhà cung cấp linh kiện, BHXH quận...)
   - `invoiceRef`: Số hóa đơn / hợp đồng
   - `proofUrl`: Ảnh biên lai chuyển khoản / hóa đơn đỏ
   - `status`: `pending` | `approved` | `paid` | `cancelled`
   - `notes`: Ghi chú chi tiết
2. **Bổ sung vào `PayrollRecord`**:
   - `companyInsuranceAmount`: Số tiền công ty đóng thêm (21.5% lương đóng BH)
   - `totalCompanyLaborCost`: `totalGross + companyInsuranceAmount`

### B. Giao Diện Người Dùng (Frontend UI Components)
1. **Nâng cấp Navigation (Navbar)**:
   - Trong nhóm **Tài Chính**, bố cục lại trực quan:
     + 🪙 **Quản Lý Tài Chính & Lợi Nhuận (Finance Hub)** (Báo cáo P&L, Thu - Chi, Chi phí công ty)
     + 📈 **Quản Lý Doanh Thu** (Doanh thu booking, sàn, PK, dịch vụ ngoài)
     + 💵 **Bảng Tính Lương & Thù Lao** (Bảng lương idol, chi phí pay nhân viên & bảo hiểm 21.5%)
     + 🎯 **Thiết Đặt Định Mức & KPI**
2. **Xây dựng `FinanceManagementView.tsx`**:
   - **Thanh chuyển đổi 4 Chu Kỳ**: `Tháng` (chọn tháng) | `Quý` (chọn quý) | `Năm` (chọn năm) | `Tổng (Toàn thời gian)`.
   - **Thẻ Chỉ Số KPI Tài Chính Nhanh**:
     + Tổng Doanh Thu (Gross & Net Revenue)
     + Thực Tế Pay Trả Nhân Viên (Net Payout)
     + Tổng Chi Phí Công Ty Thực Tế (Gồm Lương + 21.5% Bảo hiểm + Mặt bằng + Thiết bị + Vận hành)
     + Lợi Nhuận Gộp & Lợi Nhuận Ròng (kèm tỷ suất %)
   - **4 Tab Nghiệp Vụ Chuyên Sâu**:
     + **Tab 1: Báo Cáo P&L (Profit & Loss)**: Bảng phân tích chi tiết dòng thu - chi theo chuẩn kế toán quản trị.
     + **Tab 2: Sổ Thu - Chi & Quỹ**: Danh sách phiếu thu, phiếu chi, lọc tiền mặt / tài khoản ngân hàng.
     + **Tab 3: Quản Lý Chi Phí**: Tạo mới khoản chi, phân loại mặt bằng (cố định/thuê), thiết bị đầu tư, sửa chữa, phát sinh động.
     + **Tab 4: So Sánh Cơ Cấu Chi Phí**: Biểu đồ trực quan cơ cấu chi phí (Nhân sự & BH 21.5%, Mặt bằng, Thiết bị, Vận hành).

---

## 4. Kế Hoạch Triển Khai Từng Bước (Implementation Steps)

- **Bước 1: Cơ sở dữ liệu & Backend**:
  - Cập nhật schema Prisma bổ sung `CompanyExpense` và các trường bảo hiểm công ty `companyInsuranceAmount` trong `PayrollRecord`.
  - Tạo Prisma migration & cập nhật `pgStore.ts` với các hàm quản lý chi phí, tổng hợp P&L đa kỳ (Tháng, Quý, Năm, Tổng).
  - Bổ sung REST APIs tại `server.ts` cho phân hệ chi phí và báo cáo tài chính.
- **Bước 2: Cập nhật Bảng Lương & Phiếu Lương**:
  - Cập nhật `PayrollManagementView.tsx` và `PayslipModal.tsx`:
    + Thể hiện rõ: Lương Net thực nhận vs Bảo hiểm công ty đóng thêm (21.5%) vs Tổng chi phí nhân sự công ty.
    + Tự động tính toán khoản 21.5% cho nhân viên chính thức (`Công ty`).
- **Bước 3: Xây dựng Giao Diện Quản Lý Tài Chính (`FinanceManagementView.tsx`)**:
  - Thiết kế giao diện hiện đại, chuyên nghiệp với đầy đủ 4 tab nghiệp vụ và bộ lọc thời gian 4 kỳ (Tháng / Quý / Năm / Tổng).
  - Tích hợp biểu đồ trực quan, modal thêm khoản chi (mặt bằng, thiết bị, đi lại, phát sinh).
- **Bước 4: Cập nhật Điều Hướng (`Navbar.tsx`, `App.tsx`)**:
  - Thêm tab `finance` kết nối trực tiếp vào Hub tài chính mới.
  - Phân quyền chặt chẽ: Chỉ Giám Đốc, Kế Toán và Super Admin được truy cập.
- **Bước 5: Kiểm Thử Toàn Diện & Cập Nhật Tài Liệu**:
  - Kiểm thử biên dịch TypeScript `tsc --noEmit`.
  - Kiểm thử các phép tính số học (P&L, 21.5% bảo hiểm, công thức net/gross).
  - Cập nhật canonical documentation tại `docs/changes/CHANGELOG.md`.
