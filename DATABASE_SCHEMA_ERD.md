# Sơ Đồ Cấu Trúc & Quan Hệ Các Bảng CSDL Chuẩn Hóa 3NF (PostgreSQL)
Hệ Thống Quản Lý Nhân Sự, Nghệ Thuật & Vận Hành — **Aura Talent Agency OS**

> **Phiên bản chuẩn hóa Stage 1:** Chuyển đổi từ Document-oriented (`db.json`) sang CSDL quan hệ chuẩn mực (**PostgreSQL 16** qua **Prisma ORM**).  
> **Thực thể trung tâm:** Đổi `idols` ➔ **`personnel`** (Nhân sự), phân biệt rõ **Nhân sự nội bộ** và **Idol/Khách dịch vụ ngoài**.  
> **Toàn vẹn dữ liệu:** Gỡ bỏ Circular Dependency, chuẩn hóa 1NF bằng bảng trung gian `kpi_group_members` và bảng con `score_record_items`.

---

## 1. Sơ Đồ Tổng Thể Kiến Trúc Bảng Dạng Khối (Architecture Flowchart)

```mermaid
graph TD
    %% ========================================================
    %% CÁC BẢNG NÒNG CỐT: HỒ SƠ & TÀI KHOẢN (MÀU XANH INDIGO)
    %% ========================================================
    subgraph SUB_CORE ["🏢 PHÂN HỆ QUẢN TRỊ NHÂN SỰ & TÀI KHOẢN"]
        PERSONNEL["⭐ BẢNG: PERSONNEL (personnel)<br/>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>🔑 <b>PK: id</b> (INT autoincrement)<br/>🔗 <b>FK: userId</b> (1-1 nullable) ➔ USER_ACCOUNT.id<br/>📋 stageName, realName, dob, joinDate, resignedDate<br/>📋 department, role, personnelType, status<br/>📋 isIdol (Boolean), cooperationType (internal/service_guest), serviceNotes<br/>📋 height, weight, hometown, currentLiving, avatarUrl, bio<br/>📋 bankName, bankAccountNumber, bankAccountName, citizenId<br/>📋 baseSalary (DECIMAL), idolCategory, commercialDetails, socialLinks"]

        USER["👤 BẢNG: USER_ACCOUNT (users)<br/>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>🔑 <b>PK: id</b> (INT autoincrement)<br/>⭐ <b>UK: username, email</b><br/>📋 role, roleTitle, isSuperAdmin, password<br/>📋 allowedTabs, allowedDepartments, allowedActions, avatarUrl, status<br/><i>(Đã gỡ bỏ hoàn toàn idolId - Không còn Circular Dependency)</i>"]

        APPROVAL["📝 BẢNG: APPROVAL_REQUEST (approval_requests)<br/>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>🔑 <b>PK: id</b> (UUID)<br/>🔗 <b>FK: targetPersonnelId</b> ➔ PERSONNEL.id<br/>🔗 <b>FK: requestedById</b> ➔ USER_ACCOUNT.id<br/>🔗 <b>FK: reviewedById</b> ➔ USER_ACCOUNT.id<br/>📋 type, status (pending/approved/rejected), targetName, reason, data, reviewNote"]
    end

    %% ========================================================
    %% PHÂN HỆ VẬN HÀNH & NGHỈ PHÉP (MÀU XANH DƯƠNG/CYAN)
    %% ========================================================
    subgraph SUB_OPS ["📅 PHÂN HỆ VẬN HÀNH, LỊCH TRỰC & NGHỈ PHÉP"]
        SCHEDULE["⏰ BẢNG: WORK_SCHEDULE (work_schedules)<br/>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>🔑 <b>PK: id</b> (UUID)<br/>🔗 <b>FK: personnelId</b> ➔ PERSONNEL.id<br/>📋 dayOfWeek (1=T2...7=CN), shiftType (morning/afternoon/evening)<br/>📋 startTime, endTime, platform (TikTok, Shopee, Studio...)<br/>📋 title, notes, isActive, repeatType, specificMonth, specificDate"]

        TASK["📋 BẢNG: PERSONNEL_TASK (personnel_tasks)<br/>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>🔑 <b>PK: id</b> (UUID)<br/>🔗 <b>FK: personnelId</b> ➔ PERSONNEL.id<br/>📋 title, description, category, status (todo/in_progress/completed)<br/>📋 startTime, endTime, loggedDurationMinutes, subtasks (JSON), dueDate"]

        LEAVE["🏖️ BẢNG: LEAVE_REQUEST (leave_requests)<br/>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>🔑 <b>PK: id</b> (UUID)<br/>🔗 <b>FK: personnelId</b> ➔ PERSONNEL.id<br/>🔗 <b>FK: reviewedById</b> ➔ USER_ACCOUNT.id<br/>📋 personnelName, department, leaveType (annual/sick/personal)<br/>📋 startDate, endDate, totalDays, reason, status, autoApproved, reviewNote"]
    end

    %% ========================================================
    %% PHÂN HỆ BẢNG LƯƠNG & TÀI CHÍNH (MÀU XANH LÁ/EMERALD)
    %% ========================================================
    subgraph SUB_PAYROLL ["💰 PHÂN HỆ TÀI CHÍNH & BẢNG LƯƠNG"]
        PAY_PERIOD["🗓️ BẢNG: PAYROLL_PERIOD (payroll_periods)<br/>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>🔑 <b>PK: id</b> (payroll-YYYY-MM)<br/>⭐ <b>UK: period</b> (YYYY-MM)<br/>📋 status (draft/pending_approval/approved/locked_paid)<br/>📋 totalGross, totalKpiBonus, totalHotBonus, totalDeductions, totalNet<br/>🔗 <b>FK: submittedById</b> ➔ USER_ACCOUNT.id<br/>🔗 <b>FK: approvedById</b> ➔ USER_ACCOUNT.id<br/>📋 submittedAt, approvedAt, lockedAt"]

        PAY_RECORD["💵 BẢNG: PAYROLL_RECORD (payroll_records)<br/>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>🔑 <b>PK: id</b> (UUID)<br/>🔗 <b>FK: periodId</b> ➔ PAYROLL_PERIOD.id<br/>🔗 <b>FK: personnelId</b> ➔ PERSONNEL.id<br/>📋 employeeName, stageName, department, personnelType, isIdol<br/>📋 bankInfo (JSON)<br/>📋 baseSalary, overtimePay, kpiBonus, commissionGmv, giftShare, hotBonus<br/>📋 totalGross, totalDeductions, netSalary (DECIMAL 15,2)<br/>📋 earningsDetail, deductionsDetail (JSON snapshot chi tiết)<br/>📋 paymentStatus, paidAt, paymentRef, adjustmentLogs, notes"]
    end

    %% ========================================================
    %% PHÂN HỆ KPI & ĐÁNH GIÁ CHUYÊN MÔN (MÀU HỔ PHÁCH/CAM)
    %% ========================================================
    subgraph SUB_KPI ["🎯 PHÂN HỆ THIẾT ĐẶT KPI & ĐÁNH GIÁ NỘI BỘ"]
        KPI_GRP["👥 BẢNG: KPI_GROUP (kpi_groups)<br/>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>🔑 <b>PK: id</b> (INT autoincrement)<br/>🔗 <b>FK: leaderId</b> ➔ PERSONNEL.id (Trưởng nhóm)<br/>📋 name, description, type, category, department"]

        KPI_MEM["🔗 BẢNG TRUNG GIAN: KPI_GROUP_MEMBER (kpi_group_members)<br/>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>🔑 <b>Composite PK: (groupId, personnelId)</b><br/>🔗 <b>FK: groupId</b> ➔ KPI_GROUP.id<br/>🔗 <b>FK: personnelId</b> ➔ PERSONNEL.id (Chỉ loại Công ty)<br/>📋 roleInGroup (leader/member), joinedAt"]

        KPI_SET["📊 BẢNG: KPI_SETTING (kpi_settings)<br/>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>🔑 <b>PK: id</b> (INT autoincrement)<br/>📋 code, name, description, unit, customUnitLabel, period<br/>📋 scopeType (group / individual)<br/>🔗 <b>FK: groupId</b> ➔ KPI_GROUP.id (khi scopeType = group)<br/>🔗 <b>FK: assignedPersonnelId</b> ➔ PERSONNEL.id (khi scopeType = individual)<br/>📋 targetValue, minThreshold, weight, bonusIncentive, status"]

        CRIT["🏆 BẢNG: CRITERION (criteria)<br/>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>🔑 <b>PK: id</b> (INT autoincrement)<br/>⭐ <b>UK: code</b><br/>📋 name, maxScore, weight, description, priorityOrder"]

        SCORE_REC["🎖️ BẢNG: SCORE_RECORD (score_records)<br/>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>🔑 <b>PK: id</b> (UUID)<br/>🔗 <b>FK: personnelId</b> ➔ PERSONNEL.id<br/>📋 period, totalScore, averageScore, evaluatorNotes, evaluatedAt"]

        SCORE_ITEM["📝 BẢNG CON: SCORE_RECORD_ITEM (score_record_items)<br/>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>🔑 <b>PK: id</b> (INT autoincrement)<br/>🔗 <b>FK: scoreRecordId</b> ➔ SCORE_RECORD.id<br/>🔗 <b>FK: criterionId</b> ➔ CRITERION.id<br/>📋 score (DECIMAL 5,2)<br/>⭐ <b>UK: (scoreRecordId, criterionId)</b>"]
    end

    %% ========================================================
    %% MỐI QUAN HỆ RÀNG BUỘC (RELATIONSHIPS)
    %% ========================================================
    USER ||--o| PERSONNEL : "1 - 1 (userId UNIQUE nullable)"
    
    PERSONNEL ||--o{ SCHEDULE : "1 - N (Xếp ca trực live / Studio)"
    PERSONNEL ||--o{ TASK : "1 - N (Giao việc/bấm giờ)"
    PERSONNEL ||--o{ LEAVE : "1 - N (Nộp đơn nghỉ phép - chỉ nội bộ)"
    PERSONNEL ||--o{ APPROVAL : "1 - N (Đối tượng thay đổi hồ sơ)"

    PERSONNEL ||--o{ PAY_RECORD : "1 - N (Nhận phiếu lương - chỉ Công ty & CTV)"
    PAY_PERIOD ||--o{ PAY_RECORD : "1 - N (Kỳ lương chứa nhiều phiếu)"

    PERSONNEL ||--o{ KPI_MEM : "1 - N (Gia nhập nhóm KPI)"
    KPI_GRP ||--o{ KPI_MEM : "1 - N (Nhóm có nhiều thành viên)"
    KPI_GRP ||--o{ KPI_SET : "1 - N (Chỉ tiêu nhóm)"
    PERSONNEL ||--o{ KPI_SET : "1 - N (Chỉ tiêu cá nhân)"

    PERSONNEL ||--o{ SCORE_REC : "1 - N (Đánh giá định kỳ)"
    SCORE_REC ||--o{ SCORE_ITEM : "1 - N (Từng tiêu chí điểm)"
    CRIT ||--o{ SCORE_ITEM : "1 - N (Tiêu chí chấm)"

    USER ||--o{ APPROVAL : "requestedBy / reviewedBy"
    USER ||--o{ LEAVE : "reviewedBy"
    USER ||--o{ PAY_PERIOD : "submittedBy / approvedBy"

    %% Styling
    classDef coreClass fill:#EEF2FF,stroke:#4F46E5,stroke-width:2px,color:#1E1B4B;
    classDef opsClass fill:#ECFEFF,stroke:#0891B2,stroke-width:2px,color:#164E63;
    classDef payClass fill:#F0FDF4,stroke:#16A34A,stroke-width:2px,color:#14532D;
    classDef kpiClass fill:#FFFBEB,stroke:#D97706,stroke-width:2px,color:#78350F;

    class PERSONNEL,USER,APPROVAL coreClass;
    class SCHEDULE,TASK,LEAVE opsClass;
    class PAY_PERIOD,PAY_RECORD payClass;
    class KPI_GRP,KPI_MEM,KPI_SET,CRIT,SCORE_REC,SCORE_ITEM kpiClass;
```

---

## 2. Chi Tiết Từng Phân Hệ Sau Khi Chuẩn Hóa

### Phân Hệ 1: Quản Trị Nhân Sự & Tài Khoản (`PERSONNEL` $\leftrightarrow$ `USER_ACCOUNT`)

* **Gỡ bỏ Circular Dependency**: 
  * Cột `idolId` bị xóa vĩnh viễn khỏi bảng `users`.
  * Cột `userId` nằm bên bảng `personnel` với ràng buộc `UNIQUE` (1 - 1 nghiêm ngặt).
  * Đối với Idol/Khách dịch vụ ngoài hoặc CTV không cần đăng nhập: `userId = null`.
* **Phân định rõ nguồn gốc & nghiệp vụ**:
  * `isIdol`: Đánh dấu nghệ sĩ/streamer/talent để hiển thị trên màn hình Quản lý Idol.
  * `cooperationType`:
    * `'internal'`: Nhân sự cơ hữu trực thuộc công ty.
    * `'service_guest'`: Khách hàng/Idol bên ngoài thuê dịch vụ studio, quay phim, livestream theo buổi.
    * `'event_contract'`: Idol hợp tác theo show/sự kiện ngắn hạn.
  * `personnelType`: `Công ty` | `Outsource` | `Cộng tác viên` | `Thực tập sinh` | `Dịch vụ ngoài`.

---

### Phân Hệ 2: Vận Hành, Ca Trực & Nghỉ Phép

* **`work_schedules`**:
  * Khóa ngoại `personnelId` (INT). Cả Idol công ty và Khách dịch vụ ngoài đều có thể được xếp lịch vào phòng live/studio để kiểm soát chống trùng lịch phòng live.
  * `specificDate` định dạng `DATE`, `dayOfWeek` (1 = Thứ Hai ... 7 = Chủ Nhật).
* **`personnel_tasks`**:
  * Quản lý nhiệm vụ, ca diễn xuất, buổi quay chụp. Hỗ trợ bấm giờ tự động và danh sách checklist `subtasks`.
* **`leave_requests`**:
  * Chỉ áp dụng cho nhân sự nội bộ (`cooperationType = 'internal'`). Khách dịch vụ ngoài không được tạo đơn nghỉ phép.
  * Khóa ngoại `reviewedById` (INT) tham chiếu trực tiếp đến `users.id`.

---

### Phân Hệ 3: Bảng Lương & Chi Trả Thu Nhập

* **Quy tắc phân định thu nhập**:
  * **Tăng ca (OT)**: **CHỈ áp dụng cho nhân sự loại `"Công ty"`** (tính theo giờ 1.5x, 2.0x, 3.0x).
  * **Thưởng KPI**: **CHỈ áp dụng cho nhân sự loại `"Công ty"`**.
  * **Idol dịch vụ ngoài**: Tính trọn gói theo **Gói dịch vụ** (`commercialDetails`), **KHÔNG tính giờ, trong giờ hay ngoài giờ, không tính OT**.
  * **Tự động chốt bảng lương tháng**: Khi tạo kỳ lương mới (`payroll_periods`), hệ thống chỉ sinh phiếu cho nhân sự loại `Công ty` và `Cộng tác viên`. Khách dịch vụ ngoài quyết toán theo hợp đồng dịch vụ riêng.
* **Chuẩn hóa kiểu dữ liệu tiền tệ**:
  * Toàn bộ các cột số tiền: `baseSalary`, `overtimePay`, `kpiBonus`, `commissionGmv`, `giftShare`, `hotBonus`, `totalGross`, `totalDeductions`, `netSalary` đều sử dụng kiểu `DECIMAL(15, 2)` của PostgreSQL.
  * Giữ cột `adjustmentLogs` (JSONB) lưu vết can thiệp thủ công của Kế toán.

---

### Phân Hệ 4: Thiết Đặt KPI & Đánh Giá Nội Bộ (Chuẩn Hóa 1NF)

* **Bảng trung gian `kpi_group_members` (Thay thế mảng `memberIds`)**:
  * `groupId` (INT, FK ➔ `kpi_groups.id`, `ON DELETE CASCADE`)
  * `personnelId` (INT, FK ➔ `personnel.id`, `ON DELETE CASCADE`)
  * `roleInGroup` (`'leader'` | `'member'`)
  * `joinedAt` (`TIMESTAMPTZ`)
  * Khóa chính kết hợp: `@@id([groupId, personnelId])`.
  * **Chính sách**: Chỉ nhân sự có `personnelType === 'Công ty'` mới được thêm vào bảng này.
* **Bảng con `score_record_items` (Thay thế object JSON `scores`)**:
  * Tách điểm chi tiết theo từng tiêu chí ra thành dòng độc lập.
  * `scoreRecordId` (UUID, FK ➔ `score_records.id`, `ON DELETE CASCADE`).
  * `criterionId` (INT, FK ➔ `criteria.id`, `ON DELETE RESTRICT`).
  * `score` (`DECIMAL(5, 2)`).
  * Khóa duy nhất: `@@unique([scoreRecordId, criterionId])`.

---

## 3. Bảng Tóm Tắt Khóa Chính & Khóa Ngoại Ràng Buộc Sau Chuẩn Hóa

| Tên Bảng | Khóa Chính (PK) | Khóa Ngoại (FK) & Tham Chiếu | Ý Nghĩa Quan Hệ Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| **`personnel`** | `id` (INT Auto) | `userId` (1-1 UNIQUE) ➔ `users.id` | Hồ sơ nhân sự / Idol, liên kết với tài khoản (nếu cần login). |
| **`users`** | `id` (INT Auto) | *(Không có FK sang personnel)* | Quản lý xác thực và phân quyền, độc lập hoàn toàn. |
| **`approval_requests`** | `id` (UUID) | `targetPersonnelId` ➔ `personnel.id`<br/>`requestedById` ➔ `users.id`<br/>`reviewedById` ➔ `users.id` | Phê duyệt thay đổi hồ sơ nhân sự và phân quyền. |
| **`work_schedules`** | `id` (UUID) | `personnelId` ➔ `personnel.id` | Lịch ca trực livestream / Studio booking (cả nội bộ và khách). |
| **`personnel_tasks`** | `id` (UUID) | `personnelId` ➔ `personnel.id` | Nhiệm vụ, ca live, buổi quay chụp có bấm giờ. |
| **`leave_requests`** | `id` (UUID) | `personnelId` ➔ `personnel.id`<br/>`reviewedById` ➔ `users.id` | Đơn xin nghỉ phép của nhân sự nội bộ. |
| **`payroll_periods`** | `id` (String: `payroll-YYYY-MM`) | `submittedById` ➔ `users.id`<br/>`approvedById` ➔ `users.id` | Kỳ chốt lương tháng của Agency. |
| **`payroll_records`** | `id` (UUID) | `periodId` ➔ `payroll_periods.id`<br/>`personnelId` ➔ `personnel.id` | Phiếu lương chi tiết hàng tháng của nhân viên/CTV. |
| **`kpi_groups`** | `id` (INT Auto) | `leaderId` ➔ `personnel.id` | Nhóm chỉ tiêu KPI theo phòng ban hoặc chiến dịch. |
| **`kpi_group_members`** | `(groupId, personnelId)` | `groupId` ➔ `kpi_groups.id`<br/>`personnelId` ➔ `personnel.id` | Bảng trung gian N - N lưu thành viên nhóm KPI (chỉ loại Công ty). |
| **`kpi_settings`** | `id` (INT Auto) | `groupId` ➔ `kpi_groups.id`<br/>`assignedPersonnelId` ➔ `personnel.id` | Chỉ tiêu định lượng giao cho nhóm hoặc cá nhân. |
| **`criteria`** | `id` (INT Auto), `code` (UK) | *(Không có)* | Danh mục các tiêu chí đánh giá năng lực & chuyên môn. |
| **`score_records`** | `id` (UUID) | `personnelId` ➔ `personnel.id` | Phiếu chấm điểm tổng thể của nhân sự theo kỳ. |
| **`score_record_items`** | `id` (INT Auto) | `scoreRecordId` ➔ `score_records.id`<br/>`criterionId` ➔ `criteria.id` | Chi tiết điểm số từng tiêu chí (Chuẩn 1NF). |
| **`app_settings`** | `id` (`global_settings`) | *(Không có)* | Cấu hình năm chuẩn, tie-breaker và thương hiệu. |
| **`system_lookups`** | `id` (INT Auto), `(type, value)` (UK) | *(Không có)* | Danh mục chuẩn hóa loại nhân sự, trạng thái, phòng ban. |

---

## 4. Đặc Tả Dữ Liệu Chi Tiết Bảng `personnel` (Nhân Sự Gốc)

| STT | Tên Cột (Column) | Kiểu PostgreSQL | Ràng Buộc | Mô Tả Ý Nghĩa Nghiệp Vụ |
| :---: | :--- | :--- | :---: | :--- |
| 1 | `id` | `INT` | **PK (Auto)** | Mã định danh số tự tăng của nhân sự. |
| 2 | `userId` | `INT` | **FK (UNIQUE, Nullable)** | Khóa ngoại 1-1 liên kết tài khoản `users.id`. Null nếu không cần login. |
| 3 | `stt` | `INT` | Tùy chọn | Số thứ tự hiển thị sắp xếp trên giao diện. |
| 4 | `stageName` | `VARCHAR(100)` | Tùy chọn | Nghệ danh biểu diễn (nếu là Idol/Talent). |
| 5 | `realName` | `VARCHAR(150)` | Bắt buộc | Họ và tên thật trên giấy tờ tùy thân. |
| 6 | `dob` | `DATE` | Tùy chọn | Ngày tháng năm sinh. |
| 7 | `joinDate` | `DATE` | Tùy chọn | Ngày gia nhập công ty / bắt đầu hợp tác. |
| 8 | `resignedDate` | `DATE` | Tùy chọn | Ngày kết thúc hợp đồng / thôi việc. |
| 9 | `department` | `VARCHAR(100)` | Bắt buộc | Phòng ban ("Phòng Idol", "Phòng Vận hành", "Khách dịch vụ"...). |
| 10 | `role` | `VARCHAR(100)` | Bắt buộc | Vị trí chuyên môn ("Idol", "Quản lý", "Khách mời show"...). |
| 11 | `personnelType` | `VARCHAR(50)` | Bắt buộc | `'Công ty'`, `'Outsource'`, `'Cộng tác viên'`, `'Thực tập sinh'`, `'Dịch vụ ngoài'`. |
| 12 | `isIdol` | `BOOLEAN` | Mặc định `false` | Đánh dấu để lọc trên tab Quản lý Idol. |
| 13 | `cooperationType` | `VARCHAR(50)` | Mặc định `'internal'` | `'internal'` (Nội bộ) \| `'service_guest'` (Khách thuê dịch vụ) \| `'event_contract'` (Show). |
| 14 | `serviceNotes` | `TEXT` | Tùy chọn | Ghi chú gói dịch vụ khách thuê (thuê studio, chụp hình, makeup...). |
| 15 | `status` | `VARCHAR(50)` | Mặc định `'Đang hoạt động'` | `'Đang hoạt động'`, `'Đang lưu diễn'`, `'Tạm nghỉ'`, `'Đã nghỉ việc'`. |
| 16 | `baseSalary` | `DECIMAL(15,2)` | Mặc định `0` | Lương cứng hợp đồng (chỉ dùng cho nhân sự Công ty). |
| 17 | `commercialDetails` | `JSONB` | Tùy chọn | Biểu phí dịch vụ trọn gói, tỷ lệ chia sẻ hoa hồng, thương hiệu tài trợ. |
| 18 | `bankName` | `VARCHAR(100)` | Tùy chọn | Tên ngân hàng nhận chi trả. |
| 19 | `bankAccountNumber`| `VARCHAR(50)` | Tùy chọn | Số tài khoản ngân hàng. |
| 20 | `bankAccountName` | `VARCHAR(150)` | Tùy chọn | Tên chủ tài khoản thụ hưởng. |
| 21 | `citizenId` | `VARCHAR(20)` | Tùy chọn | Số CCCD / CMND. |
| 22 | `phone` | `VARCHAR(20)` | Tùy chọn | Số điện thoại liên hệ. |
| 23 | `avatarUrl` | `TEXT` | Tùy chọn | Đường dẫn ảnh đại diện. |
| 24 | `socialLinks` | `JSONB` | Mặc định `{}` | Liên kết mạng xã hội (TikTok, Facebook, Nimo, Bigo...). |
| 25 | `createdAt` | `TIMESTAMPTZ` | Mặc định `now()` | Thời điểm tạo hồ sơ. |
| 26 | `updatedAt` | `TIMESTAMPTZ` | Tự động | Thời điểm cập nhật hồ sơ gần nhất. |

---
*Tài liệu này phản ánh chính xác cấu trúc CSDL trong file `prisma/schema.prisma` sau khi hoàn thành Stage 1.*
