# Kiểm soát lịch và hồ sơ nhân sự nghỉ việc

## Mục tiêu

- Không hiển thị ca làm việc ngoài thời gian nhân sự được phép làm việc.
- Giới hạn quyền xoá nhân sự cho `system_admin`.
- Khoá hồ sơ đã nghỉ việc đối với người dùng không phải `system_admin`.

## Phạm vi đã triển khai

- Lịch cụ thể chỉ hợp lệ khi `joinDate <= scheduleDate < resignedDate`.
- Nhân sự đang làm việc không bị chặn lịch tương lai; chỉ chặn lịch trước `joinDate`.
- Lịch lặp năm/tháng được đánh giá theo ngày xuất hiện trong kỳ đang xem.
- Lịch của nhân sự đã nghỉ được lọc khỏi matrix, lịch từng người và thống kê hiển thị.
- HR không còn thấy hoặc khởi tạo thao tác xoá nhân sự.
- Route xoá nhân sự yêu cầu `system_admin` ở server.
- Hồ sơ đã nghỉ hiển thị ở trạng thái chỉ đọc cho người không phải `system_admin`.
- Server từ chối cập nhật hồ sơ đã nghỉ nếu actor không phải `system_admin`.

## Các file ảnh hưởng

- `src/utils/scheduleUtils.ts`
- `src/views/WorkScheduleView.tsx`
- `src/views/IdolListView.tsx`
- `src/App.tsx`
- `src/components/IdolModal.tsx`
- `server/auth/authorization.ts`
- `server.ts`
- `server/db/pgStore.ts`
- `test/scheduleUtils.test.ts`

## Kiểm thử thực tế

- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd test -- --run`: đạt, 86/86 test.
- `pnpm.cmd run build`: đạt.
- Local browser: hồ sơ Bảo Vy đã nghỉ hiển thị 0 ca trong tuần hiện tại.
- Local browser: HR không thấy nút xoá nhân sự.
- Local browser: HR mở hồ sơ đã nghỉ thấy toàn bộ input/select/upload disabled và nút lưu disabled.

## Ghi chú

- Không xoá dữ liệu lịch cũ; chỉ lọc theo khoảng thời gian khi hiển thị và ngăn tạo lịch không hợp lệ.
- Chưa đồng bộ VM/production. Theo quy ước dự án, việc đồng bộ chỉ được thực hiện sau khi kiểm thử local và có xác nhận riêng.
- Build vẫn có cảnh báo chunk JavaScript chính lớn hơn 500 kB; không thuộc phạm vi thay đổi này.
