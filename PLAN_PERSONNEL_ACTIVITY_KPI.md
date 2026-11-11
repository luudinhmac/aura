# Plan: Đa hoạt động Idol và KPI theo hoạt động

## Mục tiêu

Cho phép một Idol có nhiều hoạt động nghiệp vụ (ví dụ Gaming và nhận kèo nhảy), đồng thời tính KPI theo đúng hoạt động tạo doanh thu của từng người.

## Quy tắc nghiệp vụ đã chốt

### Đối tượng được tính KPI Idol

Một hồ sơ chỉ thuộc phạm vi KPI Idol khi đồng thời thỏa các điều kiện:

1. `isIdol = true`.
2. `personnelType = "Công ty"`.
3. Có hoạt động/nhóm KPI Idol đang hoạt động.
4. Không thuộc Ban Giám đốc.

### Đối tượng không tính KPI Idol

- Khách `Dịch vụ ngoài`.
- Cộng tác viên.
- Thực tập sinh.
- Nhân viên vận hành, Marketing, Sales và các phòng ban công ty không thuộc nhóm Idol.
- Ban Giám đốc.

Doanh thu từ khách dịch vụ ngoài vẫn được ghi nhận vào doanh thu/P&L công ty, nhưng không tạo KPI hoặc thưởng KPI cho hồ sơ khách hàng.

## Hoạt động Idol dự kiến

- `gaming_gear`: Gaming & Gear.
- `performance`: Biểu diễn, nhảy, hát.
- `pk_donate`: Donate & PK.
- `live_commerce`: Live Commerce/chốt đơn.
- `brand_sponsorship`: Quảng cáo & tài trợ/lồng ghép sản phẩm.

Mỗi Idol có một hoạt động chính và có thể có nhiều hoạt động bổ sung. Nhóm chính phục vụ quản lý/phân quyền; hoạt động bổ sung phục vụ lịch, nhiệm vụ, doanh thu và KPI.

## Hiện trạng đã xác minh

| Khu vực | Hiện trạng | Tác động |
|---|---|---|
| Hồ sơ | `Personnel.idolCategory` chỉ là một chuỗi | Không lưu được nhiều hoạt động |
| Form hồ sơ | `IdolModal` ghi “Chọn 1 trong 3” và tự gán phòng/role | Không hỗ trợ Idol đa hoạt động |
| KPI | `KpiSetting` hỗ trợ nhóm/cá nhân nhưng chưa gắn hoạt động | Không phân bổ KPI theo hoạt động |
| Tính KPI | `getOperationalKpi` trả về 4 metric cố định và có fallback chung | Mọi hồ sơ có thể bị áp KPI Idol sai |
| Trọng số | Có lưu `weight` nhưng logic hiện tại chia đều 4 metric | Điểm không phản ánh cấu hình |
| Kỳ KPI | Seed dùng `monthly`, dashboard truy vấn kỳ cụ thể như `YYYY-MM` | Cấu hình có thể bị bỏ qua và rơi vào fallback |
| Nhiệm vụ/lịch | Chưa có hoạt động liên quan | Không biết dữ liệu đóng góp cho KPI nào |
| Doanh thu | Có liên kết nhân sự và danh mục doanh thu | Cần tách doanh thu khách dịch vụ khỏi KPI cá nhân |
| Dashboard | Hiển thị cố định Giờ Live/Doanh số/Tương tác/Quà tặng | Không phù hợp từng nhóm Idol |

## Phạm vi ảnh hưởng

- Prisma schema và migration.
- Mapper/API nhân sự.
- Form thêm/sửa hồ sơ.
- Nhóm KPI, chỉ tiêu KPI và cấu hình cá nhân.
- Tạo nhiệm vụ và lịch livestream.
- Tính operational KPI và trọng số.
- Dashboard Idol.
- Doanh thu, P&L và payroll thưởng KPI.
- Unit/integration/browser tests.
- Tài liệu schema, project state và changelog.

## Các stage thực hiện

| Stage | Nội dung | Trạng thái |
|---|---|---|
| 0 | Chốt nghiệp vụ, mapping hiện trạng, impact và acceptance criteria | Hoàn tất |
| 1 | Schema hoạt động và quan hệ nhân sự - hoạt động | Hoàn tất |
| 2 | Migration dữ liệu cũ và seed danh mục hoạt động | Hoàn tất |
| 3 | Form thêm/sửa hồ sơ chọn nhiều hoạt động | Hoàn tất |
| 4 | Nhóm chính, role và quy tắc phân quyền | Hoàn tất |
| 5 | Gắn hoạt động vào nhiệm vụ và lịch | Hoàn tất |
| 6 | Tách doanh thu dịch vụ ngoài khỏi KPI cá nhân | Hoàn tất |
| 7 | Tính KPI theo hoạt động, cá nhân và trọng số | Hoàn tất |
| 8 | Dashboard KPI động theo cấu hình | Hoàn tất |
| 9 | Quản trị cấu hình KPI theo hoạt động | Hoàn tất |
| 10 | Báo cáo, P&L và payroll | Hoàn tất |
| 11 | Backward compatibility và regression | Hoàn tất |
| 12 | Unit, integration, browser và acceptance test | Hoàn tất |

## Acceptance criteria tổng thể

- Một Idol có thể chọn nhiều hoạt động nhưng chỉ có một hoạt động chính.
- Dữ liệu cũ vẫn đọc được sau migration.
- KPI chỉ tính cho Idol công ty thuộc nhóm KPI Idol, không tính cho khách dịch vụ ngoài hoặc Ban Giám đốc.
- Doanh thu khách dịch vụ ngoài vẫn vào doanh thu/P&L công ty.
- KPI cá nhân/hoạt động ghi đè đúng KPI nhóm theo quy tắc ưu tiên.

## Nhật ký Stage 10

- Doanh thu dịch vụ ngoài được nhận diện theo `personnelType = Dịch vụ ngoài` hoặc `cooperationType = service_guest`.
- Khi tạo/cập nhật giao dịch dịch vụ ngoài, payout cá nhân, tỷ lệ chia và khoản cố định đều được chuẩn hóa về 0; toàn bộ net revenue được ghi nhận là lợi nhuận công ty.
- Đồng bộ doanh thu sang payroll chỉ xử lý nhân sự đủ điều kiện; giao dịch khách dịch vụ ngoài không bị đánh dấu `synced_to_payroll` và không tạo/cập nhật phiếu lương.
- P&L phân loại doanh thu dịch vụ ngoài theo hồ sơ nhân sự, đồng thời tương thích với mã danh mục `EXTERNAL_SERVICE`/`SERVICE`; doanh thu booking/live commerce cũng hỗ trợ mã danh mục hiện hành.
- Finance UI hiển thị rõ doanh thu dịch vụ ngoài thuộc P&L công ty và không tính KPI/lương cá nhân.

## Verification Stage 10

- Browser/API test với khách dịch vụ ngoài ID 15: tạo giao dịch 100.000 đ với payout 70% trả `idolPayoutAmount = 0`, `companyProfitAmount = 100.000`, P&L ghi nhận `externalService = 100.000`, direct cost = 0; sau đó dữ liệu test đã được xóa.
- Browser/API test đồng bộ kỳ riêng: trả `syncedCount = 0`, `updatedRecords = 0`, giao dịch ngoài vẫn ở trạng thái `draft`.
- Browser UI Finance: P&L hiển thị thông báo doanh thu dịch vụ ngoài không tính KPI/lương cá nhân; không có alert lỗi sau reload.
- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd test`: đạt, 16/16 tests.
- `pnpm.cmd run build`: đạt; chỉ còn cảnh báo bundle lớn hiện hữu.
- `pnpm.cmd exec prisma migrate status`: database up to date; Stage 10 không cần migration schema.

## Nhật ký Stage 11

- Xác minh các API legacy vẫn giữ hợp đồng tương thích: danh sách hồ sơ vẫn trả `activityCodes`/`primaryActivityCode`; KPI vẫn trả `metrics` cùng với `items` động.
- Xác minh dữ liệu hiện hữu: 21 hồ sơ, 11 hồ sơ có activity normalized, 5 loại activity, KPI Idol và khách dịch vụ ngoài vẫn phân loại đúng.
- Xác minh fallback và phân loại payroll/P&L không làm thay đổi dữ liệu cũ; không phát hiện regression cần sửa thêm.

## Verification Stage 11

- API hồ sơ: `200`, 21 hồ sơ, 11 hồ sơ legacy có activity.
- API KPI Idol ID 1: `200`, có `metrics` legacy và KPI `items` động.
- API KPI khách dịch vụ ngoài ID 15: `200`, `grade = Không áp dụng`, `items = []`.
- API doanh thu, P&L và danh mục doanh thu: đều trả `200`.
- Prisma migration status: database up to date.

## Nhật ký Stage 12

- Bổ sung unit tests cho phân loại nhân sự doanh thu dịch vụ ngoài; tổng bộ test tăng từ 16 lên 18.
- Chạy integration/API acceptance cho activity catalog, hồ sơ, KPI, revenue summary, P&L và authorization mutation.
- Chạy browser acceptance qua các tab Hồ sơ, Lịch, Nhiệm vụ, KPI, Tài chính, Doanh thu và Bảng lương; reload và accessibility tree đều đạt.

## Verification Stage 12

- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd test`: đạt, 18/18 tests.
- `pnpm.cmd run build`: đạt; chỉ còn cảnh báo bundle lớn hiện hữu.
- Browser acceptance: 7/7 tab chính render đúng, không có alert lỗi; payroll reload khôi phục đúng dữ liệu.
- Authorization negative test: mutation doanh thu không có Bearer token bị từ chối `401` như thiết kế.
- Không tạo migration mới; dữ liệu test tạm thời đã được dọn sạch.
- Tổng trọng số KPI hợp lệ bằng 100%.
- Nhiệm vụ, lịch và doanh thu xác định được hoạt động đóng góp.
- Dashboard không còn hiển thị bộ KPI cố định cho mọi hồ sơ.

## Nhật ký Stage 0

- Đã xác minh schema hiện tại tại `prisma/schema.prisma`.
- Đã xác minh form hiện tại tại `src/components/IdolModal.tsx`.
- Đã xác minh logic KPI tại `server/db/pgStore.ts` và `src/views/IdolDashboardView.tsx`.
- Đã xác minh dữ liệu KPI mặc định tại `server/data/defaultData.ts`.
- Chưa thay đổi schema, API hoặc dữ liệu runtime trong Stage 0.

## Verification Stage 0

- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd test`: đạt, 12/12 tests.
- `pnpm.cmd run build`: đạt; chỉ còn cảnh báo bundle lớn hiện hữu.

## Nhật ký Stage 3

- API nhân sự trả danh mục hoạt động qua `GET /api/personnel-activity-types`.
- API `GET /api/idols` và `GET /api/idols/:id` trả `activities`, `activityCodes` và `primaryActivityCode`.
- API tạo/cập nhật hồ sơ lưu nhiều hoạt động, duy nhất một hoạt động chính và tự xóa liên kết khi hồ sơ không còn thuộc phạm vi Idol KPI.
- Form `IdolModal` đã chuyển từ chọn một sang chọn một hoặc nhiều hoạt động; hồ sơ có thể đồng thời là Gaming và Biểu diễn/Donate.
- Không thay đổi `idolCategory` legacy trong Stage 3, nhằm duy trì backward compatibility cho các module chưa chuyển sang activity relation.

## Verification Stage 3

- Browser API verification: 5 activity types; hồ sơ legacy performance/PK trả `performance` và `pk_donate`, primary là `performance`.
- Browser UI verification: modal cho phép chọn đồng thời Gaming và Donate/Sponsor; cả hai card giữ trạng thái selected.
- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd test`: đạt, 12/12 tests.
- `pnpm.cmd run build`: đạt; chỉ còn cảnh báo bundle lớn hiện hữu.
- `prisma migrate status`: database up to date.

## Nhật ký Stage 4

- Bổ sung guard ở lớp tính operational KPI: chỉ hồ sơ có `isIdol = true`, loại nhân sự `Công ty`, không thuộc `Ban Giám Đốc` và có ít nhất một activity assignment mới được tính KPI.
- Hồ sơ nhân viên vận hành, cộng tác viên, khách dịch vụ ngoài và Ban Giám Đốc trả tổng điểm 0 với trạng thái `Không áp dụng`; doanh thu của khách dịch vụ ngoài không bị xóa khỏi module doanh thu/P&L.
- Nhóm vận hành/mixed vẫn giữ được để phục vụ phân công công việc; chỉ các hồ sơ đủ điều kiện mới được dùng làm đối tượng KPI cá nhân. Việc chuẩn hóa thành viên nhóm Idol hiện hữu được giữ backward-compatible và dành cho stage KPI/group tiếp theo nếu cần.

## Verification Stage 4

- Browser API: hồ sơ vận hành ID 8 trả `totalScore = 0`, `grade = Không áp dụng`; hồ sơ Idol công ty ID 1 vẫn đi qua pipeline KPI bình thường.
- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd test`: đạt, 12/12 tests.
- `pnpm.cmd run build`: đạt; chỉ còn cảnh báo bundle lớn hiện hữu.

## Nhật ký Stage 5

- Đã thêm liên kết tùy chọn từ `personnel_tasks` và `work_schedules` tới `personnel_activity_types`, có index và FK `ON DELETE SET NULL`.
- API đọc task/lịch trả thêm `activityCode`; API tạo/cập nhật chỉ chấp nhận activity thuộc đúng hồ sơ nhân sự.
- Form giao nhiệm vụ đã có lựa chọn “Hoạt động KPI đóng góp”; form thiết lập ca live đã có lựa chọn hoạt động chung của các nhân sự được chọn.
- Migration `20261030_add_activity_links_to_work_items` đã áp dụng; lint, unit tests và build đạt.
- Browser verification đã đạt với phiên JWT trong UI: tạo/xoá task có activity, tạo/xoá ca đơn có activity và tạo/xoá lịch định kỳ 3 ngày (T2/T4/T6) có activity.
- Bổ sung xử lý `null`/rỗng để API có thể chủ động xoá liên kết activity khi cập nhật task hoặc ca.

## Verification Stage 5

- UI task: chọn `Donate & PK`, lưu task thử nghiệm và xoá sạch sau khi kiểm tra.
- UI ca đơn: chọn `Donate & PK`, lưu ca thử nghiệm và xoá sạch sau khi kiểm tra.
- UI lịch định kỳ: chọn `Donate & PK`, tạo 3 ca T2/T4/T6, xác nhận hiển thị và xoá sạch sau khi kiểm tra.
- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd test`: đạt, 12/12 tests.
- `pnpm.cmd run build`: đạt; chỉ còn cảnh báo bundle lớn hiện hữu.
- `prisma migrate status`: database up to date.
- Console/page errors sau reload browser: không phát hiện.
- **Trạng thái: Hoàn tất.**

## Nhật ký Stage 6

- Chuẩn hoá quy tắc đủ điều kiện KPI Idol thành helper dùng chung `isEligibleForIdolKpi`, tránh việc các module tự diễn giải khác nhau.
- KPI cá nhân chỉ nhận hồ sơ `isIdol = true`, `personnelType = Công ty`, không thuộc `Ban Giám Đốc` và có activity assignment đang hoạt động.
- Doanh thu của khách dịch vụ ngoài không được đưa vào KPI cá nhân; luồng doanh thu/P&L công ty vẫn đọc toàn bộ giao dịch không bị huỷ.
- Bổ sung unit tests cho Idol hợp lệ, khách dịch vụ ngoài, nhân viên vận hành, Ban Giám Đốc và Idol chưa có activity.

## Verification Stage 6

- Browser API: khách dịch vụ ngoài ID 15 trả `totalScore = 0`, `grade = Không áp dụng`; Idol công ty ID 1 vẫn đi qua pipeline KPI.
- Browser API: `/api/revenue/summary/2025-10` và `/api/finance/pnl-summary` đều trả thành công, số liệu doanh thu tổng không bị loại khỏi P&L.
- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd test`: đạt, 16/16 tests.
- `pnpm.cmd run build`: đạt; chỉ còn cảnh báo bundle lớn hiện hữu.
- **Trạng thái: Hoàn tất.**

## Nhật ký Stage 7 (đã hoàn tất)

- Đã thêm `activityTypeId` nullable vào `kpi_settings`, index theo activity/kỳ/trạng thái và FK `ON DELETE SET NULL`.
- Đã áp dụng migration `20261030_add_activity_links_to_kpi_settings` và regenerate Prisma Client thành công.
- API đọc/ghi KPI đã hỗ trợ `activityCode`, đồng thời kiểm tra activity phải thuộc cá nhân hoặc thành viên nhóm được gán.
- Form thiết lập KPI đã có lựa chọn hoạt động Idol tương ứng với cá nhân/nhóm.
- Đã thêm unit tests cho quy tắc eligibility dùng chung; hiện đạt 16/16 tests.
- Đã hoàn tất việc dùng activity-specific settings trong phép tính operational KPI, xác minh UI/API có JWT sau khi đăng nhập lại, và kiểm tra trọng số tổng hợp theo cá nhân/hoạt động.
- Không có thay đổi schema hoặc migration trong Stage 0.

## Gate chuyển stage

Stage 1 chỉ được đóng sau khi Prisma Client regenerate thành công. Stage 2 chưa bắt đầu vì cần client đã sinh model mới.

## Nhật ký Stage 1

- Đã thêm `PersonnelActivityType` và `PersonnelActivity` vào `prisma/schema.prisma`.
- Đã thêm migration `prisma/migrations/20261029_add_personnel_activity_profiles/migration.sql`.
- Đã thêm unique constraint cho cặp nhân sự-hoạt động và partial unique index bảo đảm một hoạt động chính trên mỗi nhân sự.
- Đã áp dụng migration vào PostgreSQL `aura_talent`; `prisma migrate status` báo database up to date.
- `prisma validate`, lint, 12/12 unit tests và build đều đạt.
- `prisma generate` đang bị chặn bởi query engine Windows bị tiến trình Node hiện tại khóa; chưa chuyển sang Stage 2.

## Nhật ký Stage 2

- Đã tạo migration `20261030_seed_personnel_activity_profiles`.
- Migration seed 5 loại hoạt động chuẩn hóa.
- Migration ánh xạ `gaming_gear`, `performance_donate` và `live_commerce` cũ sang quan hệ mới.
- Hồ sơ `performance_donate` được thêm `performance` làm hoạt động chính và `pk_donate` làm hoạt động phụ.
- Chỉ migrate hồ sơ `isIdol = true`, `personnelType = Công ty` và không thuộc `Ban Giám Đốc`.
- Chưa áp dụng migration và chưa đóng Stage 2; cần kiểm tra số lượng bản ghi, uniqueness, lint, test và build.

## Verification Stage 2

- `prisma migrate deploy`: đạt; migration `20261030_seed_personnel_activity_profiles` đã áp dụng.
- Database verification: 5 loại hoạt động, 16 quan hệ hoạt động, 11 hồ sơ đủ điều kiện, 11 hoạt động chính, 0 hồ sơ có hoạt động chính trùng.
- `prisma migrate status`: database up to date.
- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd test`: đạt, 12/12 tests.
- `pnpm.cmd run build`: đạt; chỉ còn cảnh báo bundle lớn hiện hữu.

## Stage 7 — Kết quả hoàn tất (2026-10-30)

- Đã thêm `kpi_settings.activityTypeId` nullable, index và FK `ON DELETE SET NULL` tới `personnel_activity_types`.
- API và form KPI hỗ trợ chọn hoạt động, kiểm tra activity thuộc cá nhân hoặc nhóm được gán.
- Operational KPI ưu tiên cấu hình theo hoạt động chính, sau đó hoạt động phụ; nếu không có thì fallback theo cá nhân/nhóm.
- Chu kỳ cấu hình `monthly` tương thích với kỳ dữ liệu `YYYY-MM`; cấu hình theo kỳ cụ thể được ưu tiên nếu tồn tại.
- Browser JWT verification: refresh session, tạo/xoá KPI có `activityCode`, áp dụng target `999` cho `DONATE_REVENUE` của hoạt động phụ `pk_donate`, sau đó xoá sạch dữ liệu test.
- Verification: lint đạt, 16/16 unit tests đạt, build đạt, Prisma migration status up to date, reload browser không có console/page error mới.
- **Trạng thái Stage 7: Hoàn tất.**

## Nhật ký Stage 8 (đã hoàn tất)

- Mở rộng `OperationalKpiSummary` với danh sách `items` động, giữ nguyên `metrics` cũ để backward-compatible.
- Dashboard Idol render các chỉ tiêu theo cấu hình KPI thực tế, gồm tên chỉ tiêu, hoạt động liên quan, target, actual và trọng số.
- Dashboard không còn hiển thị cố định bộ “Giờ Live · Doanh Số · Tương Tác · Quà Tặng”; hồ sơ không có cấu hình sẽ hiển thị trạng thái phù hợp.

## Verification Stage 8

- Browser JWT/API: hồ sơ Idol ID 1 trả KPI item `DONATE_REVENUE`, target `40.000.000`, maxScore `40`; hồ sơ dịch vụ ngoài ID 15 trả `grade = Không áp dụng`, `items = []`.
- Browser UI với tài khoản Idol Aria: dashboard hiển thị KPI động “Doanh thu quà tặng & donate PK”, target 40 triệu và trọng số 40.
- Browser reload và accessibility tree: dashboard, KPI item động và trạng thái hồ sơ hiển thị đúng; không có console/page error.
- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd test`: đạt, 16/16 tests.
- `pnpm.cmd run build`: đạt; chỉ còn cảnh báo bundle lớn hiện hữu.
- `pnpm.cmd exec prisma migrate status`: database up to date.
- **Trạng thái Stage 8: Hoàn tất.**

## Nhật ký Stage 9 (đã hoàn tất)

- Màn hình quản trị KPI có bộ lọc theo hoạt động, gồm KPI chung và từng hoạt động Idol.
- Danh sách KPI hiển thị rõ hoạt động áp dụng thay vì chỉ hiển thị mã/tên chỉ tiêu.
- Tổng trọng số được tổng hợp riêng theo từng hoạt động/phạm vi và cảnh báo khi khác 100%.
- Backend kiểm tra phạm vi KPI, mục tiêu/trọng số hợp lệ và chặn cấu hình active bị trùng mã + phạm vi + hoạt động + kỳ áp dụng.
- Không tạo migration mới vì `kpi_settings.activityTypeId` và index hiện hữu đã đáp ứng phạm vi Stage 9.

## Verification Stage 9

- Browser admin: màn hình KPI hiển thị bộ lọc hoạt động, nhãn hoạt động trong bảng và cảnh báo trọng số; lọc `Live Commerce` hoạt động và không phát sinh lỗi accessibility.
- Browser API: thử tạo bản sao cấu hình KPI active trả `400` với thông báo trùng cấu hình; dữ liệu hiện hữu không bị thay đổi.
- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd test`: đạt, 16/16 tests.
- `pnpm.cmd run build`: đạt; chỉ còn cảnh báo bundle lớn hiện hữu.
- Database không thay đổi schema; migration status tiếp tục được giữ ở trạng thái up to date.
- **Trạng thái: Hoàn tất.**
