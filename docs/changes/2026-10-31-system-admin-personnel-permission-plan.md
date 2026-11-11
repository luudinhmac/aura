# Kế hoạch phân quyền System Admin cho tài khoản gắn với hồ sơ nhân sự

## 1. Vấn đề hiện tại

Hệ thống đang trộn hai khái niệm khác nhau:

1. **Quyền của tài khoản đăng nhập**: tài khoản có phải `system_admin` hay không.
2. **Hồ sơ nhân sự**: người đó có thông tin nhân sự, phòng ban, chức danh, lương và dữ liệu nghiệp vụ hay không.

Quan hệ trong Prisma đã cho phép một `UserAccount` liên kết một-một với `Personnel` qua `Personnel.userId`. Tuy nhiên, code hiện tại lại đặt invariant rằng tài khoản `system_admin` không được liên kết hoặc tham gia dữ liệu nhân sự.

Các điểm đang chặn yêu cầu:

- `assertBusinessPersonnel()` từ chối mọi hồ sơ có tài khoản `system_admin`.
- Luồng tạo/gắn hồ sơ nhân sự từ tài khoản có sẵn từ chối tài khoản `system_admin`.
- `updateUser()` từ chối nâng cấp tài khoản đang có `personnelProfile` thành `system_admin`.
- `RoleBasedPermissionManager` loại tài khoản `system_admin` khỏi danh sách có thể gán vai trò.
- Luồng đồng bộ vai trò luôn ghi `isSuperAdmin: false`, nên không thể cấp quyền System Admin qua vai trò.
- Một số truy vấn nghiệp vụ loại System Admin khỏi roster hoặc dữ liệu nhân sự.

Vì vậy, tài khoản `adminlocal` hiện không thể cấp toàn quyền hệ thống cho tài khoản đăng nhập của một nhân sự đã có hồ sơ.

## 2. Mô hình đúng cần đạt

Một người dùng có thể đồng thời là:

- một hồ sơ nhân sự trong `Personnel`; và
- một tài khoản `system_admin` trong `UserAccount`.

`system_admin` là quyền quản trị tài khoản, không phải loại trừ hồ sơ nhân sự.

Ví dụ:

```text
Personnel: Nguyễn Văn A
  - phòng ban: Ban Giám Đốc
  - chức danh: Giám Đốc Điều Hành
  - lương, ngân hàng, ngày vào làm...

UserAccount: adminlocal
  - accountType: system_admin
  - isSuperAdmin: true
  - allowedTabs: toàn bộ
  - allowedActions: toàn bộ
  - allowedDepartments = ['*']
  - personnelProfile: Nguyễn Văn A
```

## 3. Nguyên tắc bảo mật

- Chỉ tài khoản đã là `system_admin` mới được cấp, thu hồi hoặc sửa quyền `system_admin` cho tài khoản khác.
- HR, Quản lý, Business Admin và tài khoản có `manage_approvals` không được tự nâng quyền System Admin.
- Không cho phép thao tác tạo ra tài khoản System Admin cuối cùng bị xóa hoặc hạ cấp.
- Khi lưu System Admin, server phải chuẩn hóa quyền, không tin toàn bộ danh sách quyền do frontend gửi lên.
- `isSuperAdmin` trên frontend chỉ là dữ liệu hiển thị; quyền thực tế phải dựa trên `accountType` từ server/JWT.
- Việc gắn hồ sơ nhân sự và việc cấp quyền System Admin phải được audit, gồm người thao tác, tài khoản đích, quyền trước và sau.

## 4. Phạm vi thay đổi dự kiến

### Stage 0 — Chốt mô hình dữ liệu và nghiệp vụ

- Giữ quan hệ `UserAccount.personnelProfile` hiện tại, không cần tạo bảng mới.
- Cho phép `Personnel.userId` trỏ tới tài khoản `personnel` hoặc `system_admin`.
- Chốt rằng System Admin có hồ sơ nhân sự vẫn được hiển thị trong roster và có thể tham gia nghiệp vụ nhân sự khi có dữ liệu tương ứng.
- Không dùng `accountType` làm điều kiện duy nhất để loại nhân sự khỏi payroll/KPI/schedule/leave.
- Nếu cần loại trừ một System Admin khỏi một nghiệp vụ, dùng trạng thái hoặc loại nhân sự/quyền nghiệp vụ riêng, không dùng quyền quản trị làm điều kiện loại bỏ.

### Stage 1 — Chuẩn hóa quyền System Admin ở server

- Cập nhật `updateUser()` để tài khoản System Admin có thể có `personnelProfile`.
- Cho phép nâng tài khoản personnel đã gắn hồ sơ lên `system_admin` nếu request đã qua route `superAdminOnly`.
- Khi `accountType` là `system_admin`, server luôn ghi:
  - `isSuperAdmin = true`
  - `isBusinessAdmin = false`
  - toàn bộ tab hệ thống
  - toàn bộ action hệ thống
  - `allowedDepartments = ['*']`
- Khi hạ cấp System Admin, bắt buộc kiểm tra người thao tác và số lượng System Admin còn lại.
- Cập nhật các hàm mapping để tài khoản System Admin có hồ sơ nhân sự vẫn trả về đầy đủ thông tin hồ sơ.

### Stage 2 — Bỏ các invariant loại trừ sai

- Bỏ lỗi `Không thể gắn System Admin vào dữ liệu nghiệp vụ` khỏi luồng liên kết hồ sơ.
- Cập nhật `businessPersonnelRelation` để hồ sơ có tài khoản System Admin không tự động bị loại khỏi roster/nghiệp vụ.
- Rà soát các truy vấn có điều kiện `accountType: 'personnel'` hoặc `if (...accountType === 'system_admin') return null`.
- Giữ nguyên các giới hạn bảo mật riêng của từng API; bỏ loại trừ theo account type nhưng không mở rộng quyền thao tác cho người không đủ action.

### Stage 3 — Sửa giao diện quản lý quyền

- Trong `RoleBasedPermissionManager`, System Admin được phép chọn hồ sơ nhân sự đã liên kết.
- Khi chọn vai trò System Admin:
  - cho phép đồng bộ toàn quyền;
  - hiển thị cảnh báo cấp quyền cao;
  - yêu cầu xác nhận rõ ràng;
  - không ghi đè hoặc hạ cấp System Admin khác ngoài các tài khoản được chọn.
- Khi chọn vai trò thường:
  - không được phép vô tình hạ cấp một tài khoản System Admin;
  - hiển thị nhãn khóa quyền System Admin.
- Trong `RolePermissionModal`, preset System Admin phải gán đầy đủ `admin`, `payroll`, `finance`, `revenue`, `kpi` và các tab còn lại cùng toàn bộ action.
- Không để frontend tự quyết định quyền cao nhất; frontend chỉ gửi đề xuất, server chuẩn hóa lại.

### Stage 4 — Tách rõ vai trò nghiệp vụ

Sau khi xử lý khả năng gắn System Admin với hồ sơ nhân sự, ma trận nghiệp vụ cần được chuẩn hóa:

| Vai trò | Quản trị tài khoản/hệ thống | Phê duyệt nghỉ phép | Bảng lương | Giới hạn phòng ban |
|---|---:|---:|---:|---|
| System Admin | Toàn quyền | Toàn quyền | Toàn quyền | Tất cả |
| Giám đốc nghiệp vụ | Không mặc định | Phê duyệt cấp Giám đốc | Phê duyệt/khóa/chi theo action | Theo phân quyền |
| HR/Kế toán | Không | Tiếp nhận/xử lý theo action | Quản lý/điều chỉnh theo action | Toàn công ty hoặc phòng được cấp |
| Quản lý phòng/nhóm | Không | Chỉ cấp quản lý | Không mặc định | Phòng/nhóm được cấp |

Phần này cần triển khai sau hoặc cùng Stage 4, vì việc một nhân sự là System Admin không nên tự động biến người đó thành “Giám đốc nghiệp vụ” nếu chức danh không phù hợp.

### Stage 5 — Migration và dữ liệu hiện có

- Không cần migration schema nếu vẫn dùng quan hệ `Personnel.userId` hiện tại.
- Kiểm tra các tài khoản đã có `accountType = system_admin` và hồ sơ nhân sự bị bỏ qua trước đây.
- Kiểm tra tài khoản có `isSuperAdmin = true` nhưng `accountType != system_admin`; chuẩn hóa theo `accountType` hoặc tạo báo cáo cần xử lý thủ công.
- Không tự động cấp System Admin cho tài khoản nào chỉ dựa trên `roleTitle`, phòng ban hoặc `isBusinessAdmin`.
- Ghi audit cho mọi bản ghi được chuẩn hóa.

### Stage 6 — Kiểm thử

#### Unit/API

- System Admin có thể cấp System Admin cho tài khoản personnel đã gắn hồ sơ.
- HR không thể cấp System Admin.
- Quản lý không thể cấp System Admin.
- Business Admin không thể cấp System Admin.
- System Admin không bị từ chối khi có `personnelProfile`.
- Không thể hạ cấp/xóa System Admin cuối cùng.
- Tài khoản System Admin gắn hồ sơ vẫn xuất hiện đúng trong roster và mapping user.
- Payroll/KPI/schedule/leave không bị lỗi chỉ vì `accountType = system_admin`.
- Các route `superAdminOnly` vẫn từ chối token không phải System Admin.

#### Browser

- Đăng nhập `adminlocal`.
- Mở quản lý tài khoản và chọn một nhân sự đã có tài khoản.
- Chọn preset System Admin, xác nhận cảnh báo.
- Đăng xuất và đăng nhập bằng tài khoản đích.
- Xác nhận thấy toàn bộ tab hệ thống và toàn bộ chức năng được cấp.
- Kiểm tra hồ sơ nhân sự, roster và các nghiệp vụ liên quan vẫn hiển thị đúng.
- Đăng nhập HR/Quản lý và xác nhận không thấy thao tác cấp System Admin.

#### Regression

- `pnpm run lint`
- `pnpm run build`
- `pnpm test`
- Kiểm tra console browser và các request API 401/403.

## 5. Tiêu chí nghiệm thu

Tính năng chỉ đạt khi đồng thời thỏa mãn:

1. `adminlocal` cấp được toàn quyền cho tài khoản của một nhân sự đã có hồ sơ.
2. Tài khoản đích đăng nhập được và nhận đúng quyền từ server.
3. Hồ sơ nhân sự đích không bị mất, không bị nhân đôi và vẫn giữ liên kết một-một.
4. HR/Quản lý không thể nâng quyền bằng UI, API hoặc payload trực tiếp.
5. System Admin hiện hữu không bị hạ quyền ngoài chủ đích.
6. Không làm hỏng payroll, KPI, lịch, nghỉ phép và roster.
7. Có test hồi quy cho cả quyền tài khoản và quyền nghiệp vụ.

## 6. Rủi ro cần xác nhận trước khi triển khai

- Nếu cho System Admin tham gia payroll/KPI như nhân sự bình thường, người đó có thể xuất hiện trong báo cáo và chi phí công ty. Đây là hành vi cần xác nhận nghiệp vụ.
- Nếu chỉ cần System Admin có hồ sơ để xem thông tin cá nhân nhưng không tham gia payroll/KPI, cần thêm cờ nghiệp vụ riêng thay vì dùng `accountType` để loại trừ.
- Cấp toàn quyền cho một tài khoản nhân sự là thao tác nhạy cảm; bắt buộc có cảnh báo, audit và bảo vệ System Admin cuối cùng.

## Trạng thái

Đây là kế hoạch, chưa triển khai mã nguồn hoặc thay đổi dữ liệu.
