# Dashboard cá nhân: cải thiện màu light/dark

## Phạm vi

- Điều chỉnh dashboard cá nhân để các thẻ chỉ số, liên kết nhanh, khu vực trọng tâm và phần giới thiệu hiển thị rõ trong cả light mode và dark mode.
- Thay các màu nền/chữ dark-only bằng màu light mặc định kèm biến thể `dark:` tương ứng.
- Đồng bộ Tailwind `dark:` với class `.dark` do ứng dụng quản lý, tránh việc theme hệ điều hành làm giao diện light bị áp màu tối.

## Xác minh

- Local browser: chuyển light → dark → light thành công.
- Light mode: hero và metric card có nền sáng, nội dung dùng màu chữ tối.
- Dark mode: hero và metric card có nền tối, nội dung dùng màu chữ sáng.
- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd test -- --run`: đạt 86/86.
- `pnpm.cmd run build`: đạt; vẫn có cảnh báo bundle lớn hơn 500 kB sau minify.

## Ghi chú triển khai

- Chỉ thay đổi và kiểm tra trên local.
- Chưa đồng bộ lên VM production; thao tác đó cần xác nhận riêng trước khi thực hiện.
