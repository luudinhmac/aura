# Plan: Bảo toàn lương lịch sử theo kỳ bảng lương

Ngày lập: 2026-10-30

## 1. Kết luận rà soát

Ví dụ: năm 2024 lương 30.000.000, từ năm 2025 tăng lên 40.000.000. Kỳ lương 2024 phải giữ 30.000.000; chỉ kỳ có hiệu lực từ năm 2025 mới dùng 40.000.000.

Hiện trạng:

- `Personnel.baseSalary` là mức lương hiện hành và có thể bị cập nhật.
- PostgreSQL ghi snapshot vào `PayrollRecord.baseSalary`, `earningsDetail.contractBaseSalary`, gross, khấu trừ, net và bảo hiểm khi tạo phiếu.
- `syncPayrollPeriod()` của PostgreSQL hiện không cập nhật lương của record đã tồn tại; đây là hướng đúng nhưng chưa có ràng buộc bảo vệ và chưa có lịch sử lương.
- Legacy JSON trong `server/data/store.ts` có nhánh `needDaysRecalc` có thể ghi lại `contractBaseSalary`, lương prorate, thuế và net của record cũ khi hồ sơ hiện tại khác record.
- Luồng nghỉ việc có thể cập nhật kỳ cuối chưa trả lương để prorate; đây là ngoại lệ nghiệp vụ cần giới hạn và audit riêng.
- Báo cáo P&L và phiếu lương chủ yếu đọc record snapshot PostgreSQL, nhưng các fallback legacy có thể làm sai lịch sử.

Rủi ro: không thể tự khôi phục chính xác mức cũ nếu dữ liệu đã bị ghi đè mà không còn backup/audit/history. Vì vậy không được lấy mức 40M hiện tại để gán ngược cho năm 2024.

## 2. Nguyên tắc đích

- `Personnel.baseSalary` chỉ là mức hiện hành, không phải nguồn đọc ngược cho lịch sử.
- Mỗi `PayrollRecord` lưu snapshot đầy đủ của lương hợp đồng và các thành phần tính tại thời điểm của kỳ.
- Kỳ `pending_approval`, `approved`, `locked_paid` không bị thay đổi do cập nhật hồ sơ.
- Đồng bộ kỳ chỉ thêm record thiếu; không ghi đè snapshot đã tồn tại.
- Mọi thay đổi lương có ngày hiệu lực, actor, lý do và audit log.
- Báo cáo lịch sử chỉ đọc snapshot của từng payroll record.

## 3. Stages thực hiện

### Stage 0 — Baseline, kiểm kê và backup

- Liệt kê toàn bộ kỳ lương và trạng thái.
- Đối chiếu từng record: `baseSalary`, `earningsDetail.contractBaseSalary`, lương prorate, gross, deductions, net, bảo hiểm và `Personnel.baseSalary` hiện tại.
- Phân loại record: snapshot hợp lệ, thiếu snapshot, lệch snapshot, đã điều chỉnh, đã trả.
- Kiểm tra backup PostgreSQL/audit để biết có thể khôi phục giá trị cũ hay không.
- Xác định production bắt buộc dùng PostgreSQL; JSON fallback chỉ giữ cho dev/test.

Điều kiện qua stage: có báo cáo chênh lệch và backup rollback; chưa chạy update dữ liệu hàng loạt.

### Stage 1 — Salary history và migration

Tạo bảng `personnel_salary_history` gồm:

- `id`, `personnelId`, `salaryAmount`, `effectiveFrom`, `effectiveTo`.
- `currency`, `reason`, `source`, `createdById`, `createdAt`, `updatedAt`.

Ràng buộc:

- Không âm lương; `effectiveTo` không trước `effectiveFrom`.
- Không có hai mức lương hiệu lực cùng ngày cho một người.
- Index `(personnelId, effectiveFrom DESC)`.
- Không xoá cứng lịch sử đã được payroll sử dụng.

Thêm snapshot rõ nghĩa vào `PayrollRecord`:

- `contractSalarySnapshot` — lương hợp đồng gốc của kỳ.
- `salaryEffectiveFromSnapshot` — ngày hiệu lực được áp dụng.
- `salarySnapshotAt` — thời điểm chụp.
- Có thể thêm `salaryHistoryId` để truy vết.

Giữ `PayrollRecord.baseSalary` là lương cơ bản sau prorate và giữ `earningsDetail` để tương thích.

### Stage 2 — Quy trình thay đổi lương

- Tạo API riêng, ví dụ `POST /personnel/:id/salary-history`.
- Khi tạo mức mới: đóng `effectiveTo` của bản ghi trước, tạo bản ghi mới, cập nhật mức hiện hành, tất cả trong transaction.
- Form phải có số tiền, ngày hiệu lực, lý do và người thực hiện.
- Không cho hồi tố qua kỳ đã duyệt/đã chi trong luồng thường.
- Hồi tố cần Super Admin/quy trình đặc biệt, cảnh báo tác động và audit.
- Nếu hiệu lực giữa tháng, áp dụng prorate theo chính sách được phê duyệt; không tự suy diễn.
- HR/Kế toán được đề xuất/nhập; quyền xác nhận theo RBAC hiện hành.

### Stage 3 — Resolver và snapshot payroll

Tạo hàm dùng chung `resolveSalaryForPayrollPeriod(personnelId, period)`:

- Chọn mức có `effectiveFrom <= periodEnd`, gần nhất với kỳ.
- Nếu thay đổi giữa tháng, tính prorate theo ngày hiệu lực và chính sách.
- Ghi snapshot vào record ngay khi tạo.

Thay đổi `syncPayrollPeriod()`:

- Record đã tồn tại: tuyệt đối không đổi snapshot lương.
- Record thiếu: tạo bằng salary history của kỳ.
- Kỳ draft chỉ tính lại khi có thao tác riêng, xác nhận và audit.
- Kỳ pending/approved/locked không được sync làm thay đổi tiền.
- GET danh sách kỳ không được gây side effect tính lại record cũ.

### Stage 4 — Sửa legacy JSON/fallback

- Loại bỏ `needDaysRecalc` dựa trên chênh lệch với lương hiện hành.
- Chỉ backfill trường snapshot bị thiếu; không ghi đè trường đã có.
- Fallback phải dùng cùng resolver/snapshot contract với PostgreSQL.
- Production từ chối JSON fallback hoặc đánh dấu rõ dev/test-only.

### Stage 5 — Backfill lịch sử có kiểm soát

- Record đã có snapshot: giữ nguyên.
- Record thiếu nhưng có bằng chứng trong `earningsDetail`, adjustment log hoặc backup: backfill kèm nguồn và audit.
- Record đã bị ghi đè: lập danh sách yêu cầu xác nhận nghiệp vụ; không tự gán lương hiện hành.
- Kỳ locked/paid phải đối chiếu tổng trước/sau; backfill metadata không được đổi tiền.
- Backup và checksum trước khi chạy migration/backfill.

### Stage 6 — Rà soát báo cáo và consumer

Kiểm tra bảng lương tháng/quý/năm/toàn thời gian, P&L, phiếu lương cá nhân, CSV ngân hàng, revenue sync, KPI/bonus/commission.

- Tất cả báo cáo lịch sử đọc từ payroll snapshot.
- Không fallback sang `Personnel.baseSalary` với record kỳ đã tồn tại.
- Fallback record legacy thiếu dữ liệu phải hiển thị cảnh báo.
- Phiếu lương hiển thị “lương áp dụng kỳ này” tách biệt với “lương hiện hành”.

### Stage 7 — UI, RBAC và audit

- Thêm khu vực lịch sử lương trong hồ sơ.
- Cảnh báo các kỳ draft bị ảnh hưởng khi đổi lương.
- Chặn kỳ đã duyệt/đã chi trong luồng thường.
- Audit ghi giá trị cũ/mới, ngày hiệu lực, actor, lý do và kỳ bị ảnh hưởng.

### Stage 8 — Test, rollout và giám sát

Test bắt buộc:

- 2024 = 30M, 2025 = 40M: kỳ 2024 không đổi, kỳ 2025 dùng 40M.
- Tăng lương giữa tháng prorate đúng chính sách.
- Đổi `Personnel.baseSalary` không đổi record cũ.
- Sync không ghi đè record hiện hữu.
- Kỳ locked/paid không thể bị đổi tiền.
- P&L, payslip và CSV dùng snapshot.
- Concurrent update không tạo hai history record cùng ngày.
- Browser kiểm tra tạo history, xem kỳ cũ, tạo kỳ mới và audit.

Rollout: backup → Stage 0 → migration tương thích ngược → ghi snapshot mới → backfill có kiểm soát → bật chặn overwrite → đối chiếu 1-2 kỳ thực tế → mở rộng toàn hệ thống.

## Stage 0 - Baseline audit result (2026-10-30)

Da them `scripts/audit-payroll-salary-snapshots.ts` va `src/utils/payrollSnapshotAudit.ts`. Audit chi doc PostgreSQL, khong goi sync, khong update/delete va co the xuat JSON baseline.

Ket qua baseline `reports/payroll-salary-baseline-2026-10-30.json`:

- 26 ky luong, 253 record; 25 ky da `approved`/`locked_paid`.
- 11 record thieu `earningsDetail.contractBaseSalary`; tat ca nam trong ky `2025-10`.
- 0 record co snapshot khac `Personnel.baseSalary` hien tai; chua co bang chung cu the cua tinh huong 30M -> 40M trong du lieu hien tai.
- 4 record co `adjustmentLogs`; 209 record co trang thai da tra.
- 24 ky co tong ky (`PayrollPeriod`) khong khop voi tong cac record. Khong tu dong recalculate cac ky da chi truoc khi doi soat nghiep vu.

Backup PostgreSQL custom-format da tao va kiem tra catalog tai `backups/payroll-stage0-2026-10-30.dump` (229 catalog entries). Chua co thay doi schema hay business data.

Stage 1 chi duoc trien khai sau khi chinh sach xu ly 24 ky total mismatch va 11 record thieu snapshot duoc xac nhan; tuyet doi khong gan nguoc luong hien tai cho ky cu.

## Stage 1 - Salary history and explicit payroll snapshot (2026-10-30)

Da ap dung migration `20261030_payroll_salary_snapshots`:

- Tao bang `personnel_salary_history` voi unique `(personnelId, effectiveFrom)`, index tra cuu, FK den personnel/user, check luong khong am va ngay ket thuc khong truoc ngay bat dau.
- Them cac cot nullable vao `payroll_records`: `contractSalarySnapshot`, `salaryEffectiveFromSnapshot`, `salarySnapshotAt`, `salaryHistoryId`.
- Khi tao payroll record moi tu PostgreSQL, he thong ghi `contractSalarySnapshot` va `salarySnapshotAt`; khong doc nguoc lai tu `Personnel.baseSalary` khi record da ton tai.
- API mapping da tra ve cac truong snapshot moi; du lieu cu van tuong thich vi cac cot moi con nullable.
- Khong backfill 11 record thieu snapshot va khong sua 24 ky total mismatch.

Kiem tra: Prisma validate, migration deploy/status, lint, build va 38/38 unit tests deu dat. Stage 2 tiep theo la API/quy trinh thay doi luong co `effectiveFrom`, actor, ly do va transaction.

## 4. Impact

- Database: thêm salary history, index, FK và snapshot columns; cần migration/rollback.
- Backend: thêm resolver, API, transaction, invariant cho sync và báo cáo.
- Frontend: form lương thành quy trình có ngày hiệu lực, lịch sử và cảnh báo.
- Dữ liệu: có thể phát hiện record đã sai; không tự khôi phục nếu thiếu bằng chứng.
- Vận hành: mọi điều chỉnh hồi tố cần phê duyệt và chứng từ.

## 5. Tiêu chí hoàn tất

- Thay đổi lương hiện hành không làm thay đổi bất kỳ kỳ cũ nào.
- Snapshot và salary history được tạo transactionally.
- Kỳ approved/locked_paid bất biến đối với cập nhật hồ sơ.
- Báo cáo ổn định sau khi lương hiện hành thay đổi.
- Dữ liệu thiếu/ghi đè được báo cáo rõ, không tự bịa giá trị.
- Unit, integration, migration, browser và production smoke tests đều đạt.
## Stage 2 - Salary change workflow implementation result (2026-10-30)

Da hoan tat quy trinh thay doi luong co ngay hieu luc:

- Them `POST /api/idols/:id/salary-history` va `GET /api/idols/:id/salary-history`.
- Moi thay doi luong phai co muc luong, ngay hieu luc YYYY-MM-DD, ly do va actor; du lieu duoc ghi trong transaction.
- Dong `effectiveTo` cua muc truoc, tao muc moi, cap nhat `Personnel.baseSalary` chi khi ngay hieu luc khong nam trong tuong lai.
- Chan hoi to neu co ky payroll tu ngay hieu luc dang o `pending_approval`, `approved` hoac `locked_paid`.
- Chan cap nhat `Personnel.baseSalary` truc tiep khi gia tri thay doi ma khong co `salaryChange`.
- Them UI nhap ngay hieu luc va ly do khi sua luong; hien thi canh bao ky luong da tao khong tu dong thay doi.
- Route mutation yeu cau `manage_payroll`; audit ghi old/new salary, effectiveFrom, actor, reason va source.

Kiem tra Stage 2:

- `pnpm.cmd run lint`: dat.
- `pnpm.cmd test`: 40/40 test dat, gom test history tuong lai, trung ngay hieu luc va chan hoi to.
- `pnpm.cmd run build`: dat; Vite van canh bao chunk lon hien huu, khong phat sinh loi build.
- Browser smoke test: trang roster tai du lieu; GET history tra 200; POST hoi to co `x-user-id` admin tra 400 dung thong bao chan hoi to; form sua ho so hien ngay hieu luc va ly do.

Khong backfill hoac sua cac payroll record cu trong Stage 2.
## Stage 3 - Payroll salary resolver implementation result (2026-10-30)

Da hoan tat resolver chon luong theo ky:

- Them `resolveSalaryForPayrollPeriod()` dung chung cho ky payroll PostgreSQL.
- Ky luong chon ban ghi salary history co `effectiveFrom` phu hop; neu chua co history thi fallback ve `Personnel.baseSalary` chi cho record moi.
- Neu tang luong giua thang, luong co ban duoc chia theo ngay lam viec Monday-Saturday cua tung doan hieu luc; ngay vao/nghi viec duoc cat theo cung quy tac prorate hien tai.
- Payroll record moi luu `contractSalarySnapshot`, `salaryEffectiveFromSnapshot`, `salaryHistoryId`, `salarySnapshotAt` va chi tiet `salarySegments`.
- Sync khong cap nhat record da ton tai, do do thay doi luong hien tai khong viet de payroll lich su.

Kiem tra Stage 3:

- `pnpm.cmd run lint`: dat.
- `pnpm.cmd test`: 44/44 test dat, gom resolver theo nam, tang giua thang, cat theo ngay vao/nghi va sync snapshot integration.
- `pnpm.cmd run build`: dat; chi con canh bao chunk lon hien huu.
- Prisma validate/migrate status: schema hop le, database up to date.
- Browser smoke test: roster va `/api/payrolls` tra 200 sau khi khoi dong server bang preload; khong thay doi business data hien huu.

Chinh sach Stage 3: tang luong giua thang dung weighted working days, khong tu dong hoi to cac ky da tao.

## Stage 4 - Legacy fallback salary isolation (2026-10-30)

Da hoan tat cach ly fallback JSON legacy:

- Production chan legacy JSON store va yeu cau PostgreSQL.
- Legacy sync khong con tinh lai salary/allowance/tax/deduction/gross/net cua record hien huu theo `Personnel.baseSalary` hien tai.
- Backfill snapshot legacy dang tat; khong tu phat minh gia tri lich su khi thieu bang chung.
- Legacy sync chi chay cho ky `draft`; ky `pending_approval`, `approved`, `locked_paid` duoc giu nguyen ca record va tong ky.
- Khong co schema migration va khong co business data nao duoc backfill trong Stage 4.

Kiem tra: lint dat, 44/44 unit tests dat, production guard dat, build dat (chi con canh bao chunk lon hien huu), browser payroll API smoke dat HTTP 200. Stage 5 la cong cu backfill co bang chung, co report/audit va co phe duyet nguoi van hanh.

## Stage 5 - Controlled legacy historical backfill (2026-10-30)

Da hoan tat cong cu backfill co kiem soat:

- Tao planner phan loai record da co snapshot, co bang chung duy nhat, thieu bang chung va bang chung xung dot.
- Chi chap nhan bang chung minh thi trong `earningsDetail.contractBaseSalary`, adjustment log co truong snapshot ro rang, hoac record backup khop ID.
- Record da co snapshot khong bi ghi de; record xung dot bi dua vao danh sach review thu cong.
- Script `scripts/backfill-payroll-salary-snapshots.ts` mac dinh chi dry-run; `--apply` bat buoc co actor Super Admin.
- Apply chi ghi `contractSalarySnapshot` va `salarySnapshotAt`, audit tung record trong transaction va doi chieu tong gross/deduction/net/employee count truoc khi commit.
- Tuyet doi khong cap nhat `baseSalary`, tong tien, thue, bao hiem, KPI, bonus, payment status hoac cac truong tien khac.

Dry-run PostgreSQL: 253 record, 242 candidate co bang chung duy nhat, 11 record thieu bang chung, 0 xung dot. Chua apply du lieu; report nam tai `reports/payroll-salary-backfill-stage5-2026-10-30.json`. Kiem tra lint va 48/48 unit tests dat. Buoc apply can backup/checksum va xac nhan nghiep vu rieng.

## Stage 6 - Consumer and finalized-period protection (2026-10-30)

Da hoan tat:

- Tao guard dung chung: chi ky `draft` va `pending_approval` moi duoc thay doi tien.
- `syncPayrollPeriod()` chan ky `approved` va `locked_paid` truoc moi thao tac xoa, tao, sync hoac tinh lai.
- Dieu chinh phieu luong va revenue-to-payroll sync deu chan ky da duyet/da khoa.
- API payroll legacy co the doc `earningsDetail.contractBaseSalary` lam snapshot fallback ro rang; khong doc `Personnel.baseSalary` hien tai de thay the luong lich su.
- Bao cao payroll/P&L tong hop tiep tuc dung cac truong tien da luu tren payroll record/period.

Kiem tra: lint dat, 51/51 unit/integration tests dat, browser API payroll doc du lieu dat, build dat (canh bao chunk lon hien huu). Stage 7 tiep theo la UI warning, RBAC/audit hien thi va cach ly fallback thieu snapshot.

## Stage 7 - Snapshot source warning and finalized-period UI protection (2026-10-30)

Da hoan tat:

- API payroll tra them `snapshotSource`: `explicit_snapshot`, `legacy_evidence` hoac `missing_snapshot`.
- UI bang luong hien thi badge theo tung phieu va canh bao tong hop neu ky co fallback legacy hoac thieu snapshot.
- Khong tu dong dung `Personnel.baseSalary` hien tai de bo sung snapshot thieu.
- Nut Thuong Nong va Dieu Chinh duoc disable tren ky `approved`/`locked_paid`; backend guard van la lop bao ve chinh.
- Ky luong draft/pending van giu nguyen luong trinh va thao tac dieu chinh hop le.

Kiem tra Stage 7:

- `pnpm.cmd run lint`: dat.
- `pnpm.cmd test`: 52/52 test dat, gom test phan loai snapshot explicit/legacy/missing va guard ky da khoa.
- `pnpm.cmd run build`: dat; canh bao chunk lon hien huu van con.
- Browser: ky 2025/11 hien canh bao 18 legacy snapshot; ky 2025/10 hien 6 legacy + 11 thieu snapshot, badge hien dung va nut Thuong Nong/Dieu Chinh bi disable.
- Browser console/page error: khong phat hien trong lan smoke payroll thanh cong.

Khong migration hoac backfill du lieu trong Stage 7. Stage 8 tiep theo la audit detail/export va quy trinh xu ly record thieu snapshot neu nghiep vu can phe duyet.

## Stage 8 - Payslip, export va quy trinh review snapshot (2026-10-30)

Da hoan tat:

- API phieu luong ca nhan bo sung `snapshotSource`; payslip hien thi nguon snapshot, ngay hieu luc va thoi diem snapshot khi co.
- Payslip thieu snapshot hien thi canh bao ro rang va cam ket dung so tien da luu, khong thay bang `Personnel.baseSalary` hien tai.
- Payslip hien thi lich su dieu chinh/doi soat tu `adjustmentLogs` neu co.
- Bang luong bo sung bo loc `Tat ca / Chi legacy evidence / Chi thieu snapshot` de ke toan va HR khoanh vung record can review.
- File CSV ngan hang bo sung cot `Snapshot Source` de truy vet nguon du lieu khi xuat chi tra.
- Ket qua `adjustPayrollRecord()` cung tra ve phan loai snapshot nhat quan voi API danh sach.
- Khong migration, khong backfill, khong tinh lai va khong thay doi cac khoan tien lich su trong Stage 8.

Kiem tra Stage 8:

- `pnpm.cmd run lint`: dat; problems khong co loi tren cac file lien quan.
- `pnpm.cmd test`: 52/52 test dat.
- `pnpm.cmd run build`: dat; canh bao chunk lon hien huu van con, khong phat sinh loi build.
- Browser smoke test: bo loc snapshot ton tai; ky 2025/10 loc `missing_snapshot` con 11/17 record va badge hien dung; payslip hien thi nguon snapshot va thong diep khong thay luong hien tai.
- Server local da duoc khoi dong lai bang preload Node de hoan tat browser verification.

Stage tiep theo neu can: quy trinh phe duyet/backfill snapshot legacy co bang chung va bao cao sai lech theo ky; phai giu nguyen nguyen tac khong tu dong ghi de tien lich su.
