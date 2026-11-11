# Điều chỉnh chỉ tiêu giờ live khi đi công tác

## Quy tắc

- Giữ `KpiSetting.targetValue` làm chỉ tiêu giờ live gốc.
- Trừ phần thời lượng các ca live thực tế bị khoảng thời gian công tác thay thế.
- Không trừ công tác đã hủy hoặc nhân sự đã từ chối.
- Chỉ trừ phần giao nhau giữa ca live và công tác; công tác chồng nhau không bị tính trùng.
- Lưu thông tin target gốc, số giờ giảm và số ca bị ảnh hưởng trong dữ liệu KPI trả về.

## Hiển thị

Dashboard Idol hiển thị target sau điều chỉnh và ghi rõ dạng `target gốc → target sau điều chỉnh`, cùng số giờ đã giảm do công tác.

## Kiểm tra

- Công tác 3 ngày thay thế 3 ca 8 giờ: target 216 giờ còn 192 giờ.
- Công tác bị hủy/từ chối: không giảm target.
- Công tác giao với một phần ca: chỉ giảm số giờ giao nhau.
- Công tác chồng nhau: không tính trùng thời gian.
- Không có lịch live áp dụng: target giờ live là `0`, dashboard hiển thị `0/0`, không dùng fallback 60 giờ.
