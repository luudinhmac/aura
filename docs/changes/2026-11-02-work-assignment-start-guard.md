# Bảo vệ hoàn thành công tác trước thời điểm bắt đầu

- Nút hoàn thành trên dashboard bị khóa trước `startAt` và hiển thị lý do.
- Backend kiểm tra lại `startAt`, không cho cập nhật trạng thái qua API trước thời gian thực hiện.
- Đã thêm test chống hoàn thành sớm.

Kiểm thử: lint đạt, 100/100 tests đạt. Browser chưa cần đăng nhập lại để kiểm tra trực quan vì logic được khóa ở cả UI và server.
