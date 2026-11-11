# Payroll display status fix (2026-10-30)

## Mục tiêu

Đồng bộ trạng thái hiển thị của từng dòng trong bảng lương với workflow của kỳ lương:

- Kỳ `draft` hoặc `pending_approval`: **Chờ duyệt**.
- Kỳ `approved`: **Chờ chi**.
- Kỳ `locked_paid`: **Đã chi**.

## Phạm vi đã duyệt

- Thêm hàm quy đổi trạng thái hiển thị dùng chung.
- Cập nhật cột trạng thái trong bảng lương.
- Bổ sung unit test cho các trạng thái và fallback legacy.
- Không thay đổi schema, dữ liệu payroll, số tiền, API hoặc workflow transition.

## Thiết kế và dữ liệu

`PayrollPeriod.status` là nguồn sự thật khi có mặt. `PayrollRecord.paymentStatus` chỉ được dùng cho các caller không có trạng thái kỳ lương, nhằm giữ tương thích với các view legacy/non-monthly.

## Files ảnh hưởng

- `src/utils/payrollDisplayStatus.ts`
- `src/views/PayrollManagementView.tsx`
- `src/components/PayslipModal.tsx`
- `src/types/index.ts`
- `server/db/pgStore.ts`
- `test/payrollDisplayStatus.test.ts`

## Kiểm chứng

- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd test`: đạt, 64/64 test.
- `pnpm.cmd run build`: đạt; vẫn còn cảnh báo bundle entry hiện hữu >500 kB.
- Database read-only check: kỳ `2025-12` đang là `draft`, chưa có `submittedAt`/`approvedAt`; record của `khanghm` có `paymentStatus=pending`.
- Payslip now receives `PayrollPeriod.status` through `periodStatus`, so a draft/pending-approval period cannot appear as **Chờ chuyển khoản**.
- The technical `Nguồn snapshot lương` banner was removed from the payslip only; snapshot fields remain available for payroll audit/list/export.
- Unit test bao phủ `draft`/`pending_approval` hiển thị **Chờ duyệt**, kể cả khi record legacy có `paymentStatus=paid`.

## Lưu ý

Database hiện có kỳ `2025-12` ở trạng thái `draft`; browser cần đăng nhập lại bằng tài khoản có quyền xem phiếu lương để kiểm tra trực quan sau khi server reload.
