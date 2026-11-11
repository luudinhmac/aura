# Plan: Phản ánh bảng lương và lịch phê duyệt/khóa sổ

## Mục tiêu

Bổ sung luồng để nhân sự phản ánh lệch công hoặc khoản bị trừ, đồng thời kiểm soát bảng lương theo mốc ngày cố định. Bảng lương phải giữ nguyên số liệu sau khi được phê duyệt; việc khóa sổ và chi chỉ được thực hiện từ ngày 5 và chỉ khi kỳ đã được phê duyệt.

## Chính sách đã chốt — Stage 0

Mốc ngày áp dụng theo ngày trong tháng của `referenceDate` hệ thống:

| Mốc | Quy tắc |
|---|---|
| Ngày 1–3 | Nhân sự xem phiếu và gửi phản ánh; HR/Kế toán kiểm tra, điều chỉnh khi kỳ còn cho phép |
| Từ ngày 4 | Có thể trình và phê duyệt bảng lương nếu kỳ đang ở trạng thái phù hợp |
| Từ ngày 5 | Có thể khóa sổ và xác nhận chi **chỉ khi** kỳ đã ở trạng thái `approved` |
| Trước ngày 5 | Nút khóa sổ/chi bị disable và backend từ chối |
| Chưa `approved` | Không được khóa sổ/chi ở bất kỳ ngày nào |
| Sau `approved` | Không được sửa số tiền, ngày công, khoản trừ trực tiếp trên kỳ |

### Quy tắc bảo toàn số liệu

- `draft` và `pending_approval`: được điều chỉnh theo quyền HR/Kế toán và quy trình phản ánh.
- `approved`: bất biến về số tiền; chỉ được khóa sổ từ ngày 5.
- `locked_paid`: bất biến hoàn toàn và đánh dấu đã chi.
- Sai sót phát hiện sau phê duyệt không sửa ngược kỳ gốc; xử lý bằng khoản bù/trừ hoặc kỳ điều chỉnh riêng có liên kết kỳ gốc.

### Quy tắc phản ánh

Nhân sự được phản ánh các nhóm: lệch ngày công, sai giờ live, sai ngày nghỉ, bị trừ sai, sai lương, sai KPI/thưởng và khác. Phản ánh bắt buộc có lý do; bằng chứng là tùy chọn.

Trạng thái dự kiến:

```text
submitted → under_review → resolved | rejected
submitted → cancelled
```

Người gửi chỉ được sửa/hủy phản ánh của mình khi còn `submitted`. HR/Kế toán xử lý phản ánh và điều chỉnh khi kỳ chưa phê duyệt. Sau `approved`, phản ánh vẫn có thể được ghi nhận để truy vết nhưng không làm thay đổi kỳ đã duyệt.

## Các stage tiếp theo

### Stage 1 — Schema và migration

- Thêm bảng `payroll_disputes` liên kết `payroll_periods`, `payroll_records`, `personnel` và user xử lý.
- Lưu loại phản ánh, số liệu hệ thống, số liệu đề nghị, lý do, bằng chứng, trạng thái và kết quả xử lý.
- Lưu mốc thời gian của kỳ hoặc cấu hình lịch áp dụng để lịch sử không bị ảnh hưởng khi đổi cấu hình.
- Bổ sung index, foreign key và audit metadata.

### Stage 2 — Backend phản ánh và phân quyền

- API tạo/xem/cập nhật/hủy/xử lý phản ánh.
- Kiểm tra ownership và quyền HR/Kế toán/Giám đốc/Super Admin ở server.
- Ghi audit cho phản ánh, điều chỉnh và kết luận.

### Stage 3 — Calendar guard cho payroll workflow

- Tạo utility kiểm tra ngày phản hồi, ngày phê duyệt và ngày khóa/chi.
- Chặn submit/approve/lock ở backend theo `referenceDate`.
- Giữ điều kiện lock kép: ngày >= 5 và `status === approved`.
- Giữ guard bất biến số tiền sau `approved`/`locked_paid`.

### Stage 4 — UI phản ánh trên phiếu lương

- Thêm nút và form phản ánh trên phiếu lương.
- Hiển thị thời hạn, trạng thái và lịch sử phản ánh.
- Không cho tạo phản ánh mới khi kỳ đã khóa.

### Stage 5 — UI HR/Kế toán/Giám đốc

- Danh sách phản ánh cần xử lý.
- Hiển thị lý do disable nút phê duyệt/khóa/chi.
- Hiển thị số phản ánh chưa xử lý trước khi phê duyệt.

### Stage 6 — Verification và tài liệu

- Unit/integration test cho ownership, quyền, trạng thái và ngày biên.
- Browser test với Idol, HR/Kế toán và Giám đốc.
- Cập nhật project state, change record và hướng dẫn vận hành.

### Stage 7 — Inbox phản ánh và liên kết điều chỉnh

- Tách danh sách phản ánh khỏi màn hình quản lý bảng lương thành tab `Phản ánh bảng lương`, có badge số phản ánh đang mở.
- Bổ sung inbox API có phân quyền server-side, trả về thông tin kỳ lương, nhân sự, phòng ban và trạng thái.
- Chuẩn hóa số liệu hiển thị thành nhãn nghiệp vụ, không hiển thị JSON/khoá kỹ thuật.
- Quy định rõ: `Tiếp nhận` chỉ chuyển sang `under_review`; `Mở điều chỉnh` chuyển người xử lý tới đúng phiếu lương/kỳ lương; `Xác nhận đã xử lý` hoặc `Từ chối` bắt buộc có kết luận.
- Tái sử dụng form điều chỉnh lương/KPI hiện có; không cho phép sửa kỳ đã phê duyệt/khóa theo guard hiện hành.
- Kiểm thử formatter, inbox, quyền truy cập và điều hướng mở form điều chỉnh.

## Acceptance criteria

- Kỳ chưa phê duyệt không thể khóa/chi dù là ngày 5 trở đi.
- Kỳ đã phê duyệt trước ngày 5 không thể khóa/chi.
- Kỳ đã phê duyệt từ ngày 5 có thể khóa/chi nếu người dùng có quyền.
- Sau phê duyệt, mọi API điều chỉnh số tiền đều bị từ chối.
- Nhân sự có thể gửi phản ánh của chính mình với lý do.
- Không thể xem/sửa phản ánh của người khác nếu không có quyền phù hợp.
- Mọi thay đổi phản ánh/điều chỉnh/phê duyệt/khóa đều có audit.

## Trạng thái thực hiện

- Stage 0: Hoàn tất — chính sách và mốc ngày đã được xác nhận.
- Stage 1: Hoàn tất — schema/migration đã áp dụng; chưa có dữ liệu phản ánh và các mốc kỳ hiện để trống chờ Stage 3 khởi tạo theo lịch.
- Stage 2: Hoàn tất — API phản ánh, ownership và RBAC đã triển khai; chưa có phản ánh nghiệp vụ nào được tạo.
- Stage 3: Hoàn tất — calendar guard đã áp dụng ở backend và UI; kỳ 2025-12 có mốc 2026-01-01/04/05.
- Stage 4: Hoàn tất — đã thêm UI phản ánh trực tiếp trên phiếu lương, hiển thị duy nhất cửa sổ phản hồi 01 đến 23:59:59 ngày 03 và chặn tạo mới khi kỳ đã khóa hoặc đã chi.
- Stage 5: Hoàn tất — đã thêm panel xử lý phản ánh cho reviewer, lọc trạng thái, tiếp nhận/xử lý/từ chối kèm ghi chú và thông báo lý do workflow bị disable.
- Stage 6: Kiểm thử tự động và tài liệu đã hoàn tất; browser verification với các vai trò chưa hoàn tất vì server localhost dừng và trả `ERR_CONNECTION_REFUSED` trong lúc smoke test.
