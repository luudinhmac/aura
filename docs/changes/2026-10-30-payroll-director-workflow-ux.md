# Payroll director workflow and action layout

## Muc tieu

Dam bao tai khoan Giam doc chi phe duyet/khoa so bang luong, khong bi hien nham thao tac trinh bang luong cho Giam doc.

## Da thuc hien

- Tach logic quyen payroll thanh submitter va director trong `src/utils/payrollWorkflowPermissions.ts`.
- Loai tru Giam doc/Super Admin khoi thao tac submit tren UI.
- Chi hien thi phe duyet cho ky `pending_approval`; ky `draft` hien thong bao cho HR/Ke toan trinh.
- Them guard backend cho submit/approve/lock trong PostgreSQL store va legacy store:
  - submit: chi `draft` va user khong phai Giam doc;
  - approve: chi `pending_approval` va user co quyen Giam doc;
  - lock: chi `approved` va user co quyen Giam doc.
- Khi co JWT, backend uu tien user da xac thuc thay vi thong tin user trong request body.
- Sap xep lai cum thao tac theo workflow va them nhan dien accessibility.

## Anh huong du lieu

Khong thay doi schema, khong thay doi so tien luong va khong tao migration. Chi chan cac chuyen trang thai payroll sai quy trinh.

## Kiem tra

- Problems: khong co loi tren cac file thay doi.
- `pnpm.cmd run lint`: dat.
- `pnpm.cmd test`: 53/53 test dat, bao gom nhom test phan tach quyen submit/approve/lock.
- `pnpm.cmd run build`: dat; canh bao chunk lon hien huu van con.
- Browser: tai khoan Giam doc o ky draft khong thay nut `Trinh Giam Doc Duyet`, hien `Cho HR/Ke toan trinh duyet`; khu vuc hanh dong co aria-label va chi con nut xuat CSV.

## Ghi chu

Kiem tra browser co ghi nhan mot so loi tai nguyen trong lan server truoc bi dung; sau khi khoi dong lai server, payroll da render va smoke test thanh cong. Cac loi cu khong tai hien trong luong payroll sau restart.
