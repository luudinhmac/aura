# Dashboard Idol: cải thiện tương phản lịch livestream

## Phạm vi

- Cải thiện màu nền, viền, badge thứ/giờ, tiêu đề và ghi chú của khu vực “Lịch Ca Trực & Phiên Livestream Của Tôi”.
- Bổ sung trạng thái light/dark cho phần header lịch và danh sách nhiệm vụ cá nhân liên quan.
- Không thay đổi dữ liệu, API, logic lịch, phân quyền hoặc quy tắc nghiệp vụ.

## Xác minh

- Local browser: mở dashboard Idol bằng tài khoản test Idol Aria.
- Light mode: section lịch giữ nền sáng, chữ tối và badge dễ đọc.
- Dark mode: section lịch chuyển sang nền slate tối, tiêu đề sáng và ghi chú có tương phản phù hợp.
- Đã chuyển dark → light lại thành công.
- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd test -- --run`: đạt 86/86.
- `pnpm.cmd run build`: đạt; vẫn có cảnh báo bundle lớn hơn 500 kB sau minify.

## Ghi chú

- Chỉ thay đổi và kiểm tra trên local.
- Chưa đồng bộ lên VM production.
