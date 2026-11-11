# Payroll salary snapshot - Stage 8

## Muc tieu

Lam ro nguon luong cua tung phieu luong trong payslip, bang luong va file xuat ngan hang; dong thoi tao diem review cho record legacy/thieu snapshot ma khong thay doi so tien da luu.

## Da thuc hien

- Them `snapshotSource` vao du lieu payslip ca nhan va ket qua dieu chinh payroll.
- Payslip hien thi nguon snapshot, ngay hieu luc/thoi diem snapshot neu co, cung lich su dieu chinh tu `adjustmentLogs`.
- Khi thieu snapshot, UI thong bao dang dung so tien da luu va khong thay bang muc luong hien tai.
- Them bo loc bang luong theo `legacy_evidence` va `missing_snapshot`.
- Them cot `Snapshot Source` vao bank CSV.
- Sua mapping CSV de header va data cung thu tu cot.

## Anh huong du lieu

Khong co migration, backfill, recalculation hay cap nhat cac truong tien. Cac record cu tiep tuc hien thi dung so tien dang luu; cac record thieu snapshot chi duoc danh dau de review.

## Kiem tra

- Lint/typecheck: dat.
- Unit/integration tests: 52/52 dat.
- Production build: dat; van con canh bao chunk lon hien huu.
- Browser: bo loc snapshot va payslip da duoc thao tac/xac minh tren ky 2025/10; 11 record thieu snapshot loc duoc va payslip hien thi canh bao dung.

## Ghi chu van hanh

Khong chay backfill tu dong. Moi backfill legacy trong tuong lai phai di qua planner, phe duyet, backup/checksum va audit trail theo cac stage truoc.
