# Payroll feedback and approval calendar — Stage 6 (2026-10-30)

## Kết quả

- Đã kiểm tra `prisma migrate status`: database up to date.
- Đã kiểm tra `prisma validate`: schema hợp lệ.
- `npm.cmd run lint`: đạt.
- `npm.cmd test`: 72/72 test đạt.
- `npm.cmd run build`: đạt; cảnh báo bundle entry lớn hơn 500 kB vẫn là cảnh báo hiện hữu.
- Diagnostics trên các file Stage 4–5: không có lỗi.

## Phạm vi test đã bao phủ

- Ownership và RBAC của phản ánh bảng lương.
- Transition `submitted` → `under_review` → `resolved`/`rejected`.
- Hủy phản ánh của chính người gửi.
- Mốc ngày phản hồi/phê duyệt/khóa sổ 03/04/05.
- Chặn thay đổi số tiền sau phê duyệt/khóa.
- Bảo toàn snapshot lương lịch sử.

## Giới hạn browser verification

Smoke test đã mở được ứng dụng với phiên admin. Khi chuyển sang khu vực Tài chính, server localhost dừng và browser trả `ERR_CONNECTION_REFUSED`, nên chưa thể xác minh đầy đủ với tài khoản Idol, HR/Kế toán và Giám đốc. Cần chạy lại browser verification sau khi runtime Node/server ổn định; không coi phần này là đã đạt.

## Trạng thái

Implementation Stage 0–5 đã hoàn tất. Stage 6 hoàn tất kiểm thử tự động và tài liệu; browser acceptance còn chờ môi trường runtime ổn định.
