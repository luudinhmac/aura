# Trạng Thái Dự Án (Project State)

### Lọc CI/CD cho thay đổi tài liệu & phi-runtime — 2026-11-11

- Đã tinh chỉnh `.gitlab-ci.yml`: chuyển bộ lọc `changes:regexp` lên `workflow:rules` cho `main` (tránh lỗi pipeline rỗng khi merge docs-only lên `main`), hỗ trợ `$CI_PIPELINE_SOURCE == "web"` (**Run pipeline** thủ công), bật `interruptible: true` cho `docs_only`/`verify` và khóa `interruptible: false` cho `.vm_deploy`.
- Mở rộng phạm vi bỏ qua (125 ký tự) cho `docs/`, Markdown ở root, `prisma/migrations-archive/`, `.agents/`, `.vscode/`, `.gitignore`, `.gitattributes`, `metadata.json`; MR chỉ sửa nhóm này chạy `docs_only`, thay đổi ứng dụng/cấu hình/hạ tầng hoặc MR pha trộn vẫn chạy đầy đủ `verify` → staging → production manual.
- Cú pháp `rules:changes:regexp` yêu cầu GitLab 19.2+. Đã kiểm chứng `yaml.safe_load`, mô phỏng 10 đường dẫn bỏ qua / 11 đường dẫn chạy pipeline và `git diff --check` đạt trên máy local. Chưa xác nhận bằng GitLab CI Lint hoặc pipeline thực tế; cần kiểm tra trên GitLab trước khi merge. Chưa commit/push/deploy.

### Vệ sinh Git ignore & EOL shell script — 2026-11-11

- Đã bổ sung `.gitignore` cho `/prisma/client/`, `.pnpm-store/`, `*.dump`, `/*.sql`, `.*-backup-*/`, `.*-release-*/`, `Server-production-info.md` và `POSTGRES_MIGRATION_PLAN.md`; đồng thời mở rộng `.gitattributes` sang `*.sh text eol=lf` để bảo vệ các script triển khai trên Linux VM khi thao tác từ Windows.
- Các file/thư mục nhạy cảm, bản nháp và backup cục bộ (`Server-production-info.md`, `POSTGRES_MIGRATION_PLAN.md`, `aura_talent_dump.sql`, `.clock-test-backup-20261105/`, `.aura-prod-release-20261106/`, `prisma/client/`) vẫn được giữ nguyên trên đĩa nhưng đã được Git bỏ qua, không còn nằm trong danh sách untracked. Chưa thực hiện `git add`/`commit`/`push`.

### Hướng dẫn phát hành theo CI/CD — 2026-11-10

- Đã cập nhật hướng dẫn thao tác trong `docs/PRODUCTION_CODE_DEPLOYMENT.md`: dùng branch trong worktree D:, commit có chọn lọc, push/Merge Request vào `main`, kiểm tra pipeline và staging, sau đó mới chạy job production manual của đúng commit.
- `docs/CI-CD-DEPLOYMENT.md` đã được đối chiếu với mạng Docker hiện tại (`staging-app:3000`) và pipeline staging thành công; runbook thủ công được đánh dấu không phải đường deploy thường lệ. Đây là thay đổi tài liệu, không sửa pipeline/script, không chạy deploy production hay migration.
- Cần kiểm thử đăng nhập và luồng nghiệp vụ trên staging trước khi phê duyệt production. Các điều kiện bảo vệ branch/runner/CI variables phải được xác nhận trong GitLab; tài liệu không thay thế cấu hình bảo mật thực tế.

### CI/CD staging: quyền file SSH tạm — 2026-11-10

- Lần retry sau khi sửa GitLab File variable đã qua SSH và tới VM, nhưng Nginx preflight báo không tìm thấy `app` vì container kiểm thử không nằm trên production network. Xác nhận `aura-nginx` và `aura-app` vẫn đang chạy trên `aura-talent_aura-network`; production chưa bị thay đổi bởi lỗi này.
- Sửa luồng staging: khởi động app và kiểm tra health trước, sau đó nối container Nginx kiểm thử vào cả mạng production/staging để chạy `nginx -t`. Nginx phục vụ staging qua `staging-app:3000` trên staging network, không qua host gateway tới port chỉ bind loopback.
- Pipeline `3050392360` cho commit `153a748` đã qua verify và deploy_staging; staging app/PostgreSQL healthy, Nginx nằm trên cả hai mạng, HTTPS staging/production đều trả 200. Trình duyệt hiển thị form đăng nhập ở cả hai host; 401 của API bảo vệ khi chưa đăng nhập là dự kiến. Chưa kiểm thử luồng đăng nhập/nghiệp vụ có xác thực. Job production vẫn manual, chưa chạy.

- Pipeline `main` cho commit `875d0675` đã qua `verify`. Job staging đã được runner `vmportal` nhận nhưng lần thử mới nhất thất bại trước khi gửi release vì OpenSSH từ chối file `VM_DEPLOY_SSH_KEY` có mode `0664`.
- Cấu hình CI đã thêm `chmod 600` cho file key trước khi gọi SSH. Cần chạy pipeline mới để xác nhận staging; production manual chưa chạy. Không có thay đổi DB hay Nginx từ lỗi này.
- Pipeline `3050324297` cho commit `0b23542` thất bại ở `verify`: `scripts/sync-local-data.ts` import Prisma Client từ package mặc định, không khớp output tùy chỉnh của repo. Đã bỏ import/instance Prisma không sử dụng; cần xác minh lại bằng pipeline mới. Staging và production của pipeline này đều Skipped.

### GitLab CI/CD staging → production — 2026-11-09

- Đã chuẩn bị pipeline chạy quality checks trên Shared Runner, tự deploy commit từ `main` lên staging, và giữ production ở job manual phụ thuộc staging thành công.
- Staging dùng Compose project, PostgreSQL volume, uploads volume, secret file và port loopback riêng; production giữ nguyên project/volumes hiện hữu. Không có lệnh xóa volume hoặc reset DB trong pipeline.
- Docker image được tag bằng full commit SHA: stage build image, production chỉ chạy image đã stage, không build lại.
- Runner VM gắn tag `aura-runner`; tài khoản `gitlab-runner` không được cấp quyền Docker socket. Deploy SSH qua CI file variables dùng account `aura-talent`.
- Chưa chạy pipeline/deploy. Branch `staging-cicd-20261109` đã push commit `034dcb6`; MR chưa được tạo do phiên browser GitLab đang đăng xuất. Staging tự deploy chỉ sau khi MR được merge vào `main`; production job vẫn manual và không chạy trong lần thử này.
- VM đã có staging `.env`, cert wildcard đã xác minh được qua `aura-nginx`, và `aura-talent` có Docker Compose/access. Sáu DB-dependent suites vẫn bị loại khỏi CI unit job; cần disposable seeded DB harness để CI bao phủ full DB integration.
- Chi tiết và acceptance prerequisites: [CI-CD-DEPLOYMENT.md](./CI-CD-DEPLOYMENT.md). Production deploy vẫn cần thao tác manual trong GitLab.

### Chuẩn bị deploy thử staging — 2026-11-10

- Đã tạo `/data/aura-talent/staging/.env` trên VM với secret staging riêng; file thuộc `aura-talent`, mode `600`. Giá trị secret không ghi vào repo/tài liệu.
- Xác minh VM có Docker Compose, production containers healthy, và `aura-talent` có Docker access. DNS staging trên VM phân giải về loopback.
- Phát hiện host certificate/key không đọc được trực tiếp bởi `aura-talent`; script deploy được điều chỉnh để kiểm tra file đã mount trong container `aura-nginx` và xác minh SAN wildcard mà không nới quyền cert. Lint, build, YAML/Bash syntax checks, 130 tests và kiểm tra SAN đều đạt; build có cảnh báo bundle >500 kB. Commit `034dcb6` đã push; MR chưa tạo do GitLab browser đăng xuất. Chưa deploy staging/production.

### Khởi tạo lại production trên volume mới — 2026-11-06

- Người dùng đã xóa volume production trước khi khởi tạo; xác minh trước triển khai không có container/volume cũ. Backup trước đó vẫn được giữ tại VM và `pg_restore --list` đọc được.
- Loại migration alias `20261102_service_usage_assignment_payment` khỏi gói release; giữ 11 migration canonical hiện có trong `prisma/migrations/`. Cả 11 migration đã áp dụng thành công và Prisma báo database up to date.
- PostgreSQL volume mới `aura-talent_pgdata`; app, PostgreSQL và Nginx chạy, app/PostgreSQL healthy. HTTPS `https://aura.com/` trả 200; trang đăng nhập hiển thị. Browser phát sinh 401 cho request chưa xác thực; chưa thử đăng nhập bằng credential admin.
- Bootstrap tạo một account `admin` dạng system admin, 16 role và 1 role assignment; không có personnel, payroll records, task, work assignment, leave, KPI, revenue, expense hay service-usage records. Có một kỳ lương draft `2026-10`, phù hợp với cơ chế tự tạo kỳ tháng trước hiện có; đây không phải dữ liệu demo.
- Bản backup cũ được giữ để khôi phục khi cần. Production preflight đạt (`systemAdmins=1`, `systemAdminProfiles=0`, `appliedMigrations=11`); Prisma báo up to date. Browser sau reload vẫn ở form đăng nhập, API bảo vệ trả 401 khi chưa xác thực; chưa thử đăng nhập sau bootstrap hoặc các luồng nghiệp vụ có xác thực. Cần kiểm thử thủ công sau khi người quản trị đăng nhập.

### Migration đồng hồ tham chiếu trên DB local — 2026-11-06

- DB local `aura_talent` đã được sao lưu trước khi áp dụng riêng migration `20261105_continuous_reference_clock`; không áp dụng các migration pending khác vì migration history DB và repo còn lệch.
- `app_settings.referenceClockAnchorAt` hiện có kiểu `TIMESTAMP(3)`, nullable, không default; 1 cấu hình có `referenceDate` được backfill anchor và migration có trạng thái `finished`.
- PostgreSQL xác nhận rollover từ ngày tham chiếu 10/01/2026 sang 11/01/2026 khi mô phỏng 24 giờ + 2 phút kể từ anchor; `timezone.test.ts` và `dateFormatting.test.ts` đạt 4/4.
- Chưa xác minh API/browser trên DB local: trang `localhost:3000` không truy cập được và Prisma smoke test qua `tsx` lỗi `uv_os_get_passwd ... ENOMEM`. Backup: `.clock-test-backup-20261105/aura_talent_before_local_migration_20261106.dump`.
- Prisma migration history vẫn cần được xử lý riêng trước khi dùng `migrate deploy`; không chạy lệnh đó trên DB local hiện tại.

### Làm rõ thời gian và trạng thái phạt của công tác — 2026-11-05

- Panel giao công việc hiển thị khoảng bắt đầu–kết thúc theo múi giờ `Asia/Ho_Chi_Minh`; định mức phạt tách khỏi kết quả của từng người.
- Mỗi người chỉ có một trạng thái phạt phù hợp: đã xác nhận hiển thị tiền thực tế; đang xem xét/giải trình hiển thị trạng thái chờ; hoàn thành hoặc hủy không còn hiện ước tính. Trên dashboard Idol, định mức phạt chung cũng được ẩn khi Idol đã hoàn thành; quản lý vẫn thấy quy tắc chung để đối chiếu. Chỉ người chưa có kết quả cuối cùng mới thấy mức “có thể áp dụng nếu vi phạm”.
- Chỉ thay đổi cách trình bày, không đổi API, lưu trữ, quyền hoặc quy tắc nghiệp vụ. Xác minh: `pnpm.cmd run lint`, build và 14/14 focused tests đạt; trên `localhost:3001`/DB clone có 4 thẻ, cả 4 có khoảng thời gian, không còn nhãn “Dự kiến”, người hoàn thành không thấy mức có thể phạt, các khoản đã xác nhận chỉ hiện số tiền thực tế. Reload và mở lại màn hình không có lỗi console/page. Test bổ sung xác nhận dashboard Idol ẩn định mức sau khi cá nhân hoàn thành nhưng màn quản lý vẫn giữ quy tắc chung.

### Ẩn thao tác hủy công tác sau thời điểm kết thúc — 2026-11-05

- Nút “Hủy công tác” trên panel dùng chung chỉ hiển thị trước `endAt`; kiểm tra theo đồng hồ hệ thống mô phỏng và tự cập nhật tại thời điểm kết thúc, định kỳ 30 giây và khi tab được hiển thị lại.
- Không thay đổi API, dữ liệu, quyền hoặc hành vi hủy phía máy chủ. Xác minh: lint, build và focused tests 7/7 đạt; trên browser `localhost:3001`/DB clone, công tác `Gặp gỡ khách hàng` có `endAt` 20/01/2026 12:00 và giờ hệ thống 20/01/2026 23:07 không còn nút hủy; Playwright reload/điều hướng không ghi nhận console/page errors. Build còn cảnh báo chunk index >500 kB vốn có từ trước.

### Tách cấu hình chạy DB kiểm thử — 2026-11-05

- Thêm `pnpm run dev:test` để nạp `.env.test.local` riêng và chạy app ở cổng 3001; `.env` local-dev không bị thay đổi. File chứa thông tin kết nối test được Git ignore.
- Cấu hình này chỉ dành cho máy phát triển; không chạy migration/seed tự động. Browser/API test có thể tạo thay đổi nghiệp vụ trong DB clone.
- Server chạy tại `http://localhost:3001/` qua task VS Code “Aura Talent: Start test DB server”. Trang khôi phục được phiên `admin` và tải dữ liệu (24 tài khoản, 10 đơn vị); cấu hình `.env.test.local` trỏ DB clone `aura_talent_clock_test_20261105`, và `.env` local-dev vẫn nguyên trạng. Chưa điều hướng được qua menu tới dashboard cá nhân bằng browser automation; người dùng có thể tiếp tục kiểm tra thủ công trên tab 3001. Không chạy migration/seed.

### Dashboard hiển thị ngày và giờ hệ thống — 2026-11-05

- Dashboard cá nhân theo vai trò và dashboard Idol hiển thị ngày–giờ từ đồng hồ tham chiếu, định dạng `DD/MM/YYYY HH:mm`, múi giờ `Asia/Ho_Chi_Minh`; đồng hồ làm mới định kỳ và khi tab hoạt động lại.
- Chỉ thay đổi hiển thị frontend; không thay đổi DB, API, ngày hạn công việc hoặc dữ liệu nghiệp vụ.
- Verification: `pnpm.cmd run lint`, test `dateFormatting.test.ts` (3/3) và `pnpm.cmd run build` đạt; build còn cảnh báo chunk index lớn hơn 500 kB như trước. Chưa xác minh DOM tương tác trên trình duyệt: các trang localhost hiện được chia sẻ không kết nối được tới server (3001 trả `ERR_CONNECTION_REFUSED`, 3000 mở trang lỗi). Không tự khởi động app vì `.env` đang trỏ DB local-dev `aura_talent`, trong khi phiên kiểm tra thủ công trước đó dùng DB clone trên cổng 3001; cần khởi động đúng cấu hình clone để xác minh giao diện.

### Đồng hồ ngày tham chiếu chạy liên tục — 2026-11-05

- Đang triển khai trên branch `fix/continuous-reference-clock` tại worktree D:.
- Ngày kiểm thử được xem là mốc bắt đầu; backend lưu mốc neo thời gian thật, sau đó tính thời gian giả lập bằng thời gian đã trôi qua. Không cần ghi DB mỗi phút hoặc mỗi nửa đêm; múi giờ nghiệp vụ được cố định `Asia/Ho_Chi_Minh`.
- Có migration additive cho `AppSetting.referenceClockAnchorAt`; migration backfill mốc hiện tại cho các cấu hình ngày tham chiếu đang có.
- Không áp dụng migration lên DB local gốc: `prisma migrate status` phát hiện lịch sử DB và repo không đồng nhất. Thay vào đó đã clone thành `aura_talent_clock_test_20261105`, áp dụng riêng migration đồng hồ và ghi nhận migration trong lịch sử của clone; không chạy toàn bộ pending migrations.
- Xác minh đạt: lint, Prisma schema validation, production build, 9/9 focused tests, migration/backfill trên clone, quyền đọc của role ứng dụng, API GET/PUT/GET lưu-đọc anchor và rollover thực tế trên giao diện/backend (10/01/2026 23:59 → 11/01/2026 00:12 giờ Việt Nam). Test clone giữ cấu hình này để người dùng kiểm tra thêm.
- Dev server test vẫn chạy ở `http://localhost:3001/` kết nối clone để người dùng kiểm tra thủ công; server `localhost:3000` và DB `aura_talent` giữ nguyên. Browser console chưa được kiểm tra riêng; xem changelog ngày 2026-11-05.
- Phần cài đặt ngày tham chiếu hiển thị riêng ngày mốc và ngày hiệu lực đã lưu; thay đổi chưa lưu được đánh dấu là bản nháp. Không đổi logic đồng hồ hoặc dữ liệu.
- Browser trên DB clone xác nhận ngày mốc `12/01/2026` và ngày hiệu lực đã lưu `13/01/2026`; reload giữ phiên, không có console/page errors. Lint/build và 5/5 test đồng hồ đạt. Full suite còn bị chặn bởi các test DB cần migration trên DB local cấu hình `aura_talent`; không còn bản ghi test nhân sự theo các tiền tố đã kiểm tra.
- Chưa merge/deploy; đang ở branch `fix/continuous-reference-clock` trong worktree D:.
- Cập nhật hiện tại: chỉ khi người dùng tương tác với điều khiển ngày/mốc rồi lưu, hệ thống mới xóa giờ cũ và đặt anchor mới tại thời điểm server nhận request; áp dụng cả khi ngày cuối cùng bằng ngày cũ. Lưu lại cài đặt mà không chạm điều khiển ngày không reset clock. Không thêm schema/migration. Xác minh lint và build đạt; test định dạng ngày 3/3 đạt; trên browser/DB clone, thao tác chạm lựa chọn ngày rồi lưu thành công, `referenceTime` rỗng và anchor được tạo mới; lưu lần nữa mà không chạm ngày giữ nguyên anchor. Lệnh `pnpm run test -- ...` do truyền sai cú pháp đã chạy toàn bộ suite trên DATABASE_URL mặc định `aura_talent`; một số test DB lỗi do thiếu cột migration `referenceClockAnchorAt`. Audit read-only các dấu nhận diện test (nhân sự, tài khoản, KPI group, doanh thu, chi phí, audit log) đều có số lượng 0; không thấy bản ghi test còn sót. Full suite vẫn chưa được xác nhận đạt; không chạy lại với DB mặc định.

### Khôi phục phiên trước khi tải dữ liệu — 2026-11-05

- `loadAllData()` chỉ chạy sau khi session restore hoàn tất và có `currentUser`; không gọi API dữ liệu được bảo vệ khi chưa đăng nhập.
- Xác minh: `pnpm.cmd run lint`, `pnpm.cmd run build`, và 8 test JWT/authorization đạt. Full test suite thất bại do checkout không có `DATABASE_URL` cho các test Prisma; browser test authenticated success chưa xác minh trong checkout cô lập không có backend/database.
- Không thay đổi API, database, token format hoặc RBAC. Cần xác nhận thêm luồng phiên hợp lệ trên browser có backend test.
- Cập nhật trạng thái triển khai: payroll fix commit `5d80cdc30d4af7e2666ee177a1d0b72b46b212fb` đã lên VM production ngày 2026-11-05; app/PostgreSQL healthy, HTTPS trả 200.

### Tự tạo kỳ lương khi thiếu kỳ trước — 2026-11-04

Đã xác định và sửa lỗi API bảng lương 500 khi hệ thống cần tự tạo kỳ của tháng trước: Prisma nhận `Date` UTC cho các cột ngày thay vì chuỗi `YYYY-MM-DD` không có phần thời gian. Quy tắc tự tạo kỳ khi chưa tồn tại và định dạng ngày trả về API được giữ nguyên. Đã xác minh trên database kiểm thử không có nhân sự/kỳ lương, trên database có tài khoản và kỳ cũ nhưng thiếu kỳ tháng trước, đồng thời gọi lặp không tạo trùng. Lint, build và toàn bộ 118 tests đạt trên DB clone từ backup local-dev; API smoke test đạt. Các database kiểm thử đã được xóa sau test, local dev không bị thay đổi. Sau khi kiểm thử đạt, nhánh `fix/payroll-period-date-prisma` được tích hợp vào `main`; chưa triển khai production.

### Form đăng nhập production — 2026-11-04

Production khởi tạo form đăng nhập với tài khoản và mật khẩu để trống; dữ liệu đăng nhập mẫu chỉ còn ở development. Đã xác minh trên `https://aura.com/`: hai input rỗng, trang HTTPS trả mã 200, container app healthy. Lint, Prisma validation và 116/116 unit tests passed. PostgreSQL backup được tạo và kiểm tra trước triển khai; toàn bộ 10 migrations đã áp dụng thành công. Trong lúc deploy phát hiện thứ tự phụ thuộc sai giữa migrations tạo bảng và mở rộng bảng; đã đổi thứ tự migration chưa áp dụng, đánh dấu lần chạy thất bại là rolled back sau khi xác nhận transaction rollback, và lưu bản migration cũ ngoài thư mục Prisma để có thể khôi phục.

### Bộ chọn có tìm kiếm — 2026-11-04

Đã bổ sung bộ chọn tìm kiếm dùng chung cho các danh sách Idol/nhóm tại giao nhiệm vụ, lọc/chọn lịch làm việc và thiết lập KPI. Chưa chuyển các bộ chọn enum ngắn hoặc danh sách nhiều lựa chọn dạng native; đây là các vị trí cần đánh giá riêng để bảo toàn thao tác hiện có.

## Thông Tin Tổng Quan
- **Dự án**: Aura Talent Management (Hệ Thống Quản Lý Idol & Nhân Sự Nghệ Thuật)
- **Kiến trúc**:
  - Frontend: React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Motion

### Vietnamese date display/input normalization - verified complete (2026-10-30)

All user-facing date inputs now use a text control with `DD/MM/YYYY` display and emit ISO `YYYY-MM-DD` values to the existing state, API, and database contracts. Date-only displays across personnel, schedules, tasks, leave, revenue, expenses, approvals, and dynamic personnel columns now use `formatDateVN`; internal date calculations and storage remain unchanged. Lint, 35/35 unit tests, build, and browser DOM/accessibility verification passed. The existing large-bundle warning remains unrelated.
  - Backend: Node.js + Express + Prisma ORM + PostgreSQL
- **Chế độ cơ sở dữ liệu**: PostgreSQL
- **Ngày cập nhật gần nhất**: 2026-11-02
- **Hồ sơ năng lực hệ thống**: [docs/system-capabilities.md](./system-capabilities.md)
- **Rà soát mới nhất**: Các kiểm tra thời gian giao công tác đã đồng bộ theo `referenceDate`; xem [change record](./changes/2026-11-02-reference-date-work-assignment.md).

## Các Phân Hệ Chính (Core Business Hubs)
1. **Nghệ Sĩ & Nhân Sự (Talent Hub)**:
   - Danh sách nhân sự & Idol (`IdolListView`)
   - Dashboard Idol cá nhân (`IdolDashboardView`)
   - Lịch làm việc & ca phát sóng (`WorkScheduleView`)
   - Hồ sơ nhân sự đa năng, phê duyệt HR & liên kết phân quyền tự động theo phòng ban (`IdolModal`, `IdolDetailModal`)
2. **Vận Hành & Đánh Giá (Operations Hub)**:
   - Quản lý nhiệm vụ, nhắc hẹn & duyệt kết quả (`TaskManagementView`)
   - Bảng điểm chấm định kỳ theo tiêu chí động (`ScoringSheetView`)
   - Bảng xếp hạng Idol & phân hạng Tier (`LeaderboardView`)
   - Báo cáo phân tích hiệu suất (`AnalyticsDashboardView`)
3. **Tài Chính & Lợi Nhuận (Finance Hub)**:
   - **Tài Chính & Báo Cáo P&L (`FinanceManagementView`)**: Báo cáo doanh thu, giá vốn, chi phí OpEx, lợi nhuận gộp/ròng theo Tháng/Quý/Năm/Tổng; Quản lý phiếu chi hoạt động, mua sắm, sửa chữa, đầu tư CapEx, mặt bằng, sự kiện động; Tích hợp hệ thống biểu đồ tương quan Doanh thu - Chi phí - Lợi nhuận (Bar Chart, SVG Trend Area, Bảng đối soát kỳ hạn) và phân tích tốc độ tăng trưởng (% MoM / QoQ).
   - **Quản lý Doanh Thu (`RevenueManagementView`)**: Quản lý booking nhãn hàng, hoa hồng GMV, quà tặng PK, doanh thu thương mại.
   - **Bảng Tính Lương & Thù Lao (`PayrollManagementView`)**: Tính lương nhân viên và idol, thưởng KPI, thưởng nóng CEO, khấu trừ thuế, đối soát tiền pay thực nhận vs chi phí thực tế công ty đóng thêm 21.5% bảo hiểm.
   - **Thiết đặt Định Mức & KPI (`KpiSettingsView`)**: Định mức doanh thu, giờ livestream, tỷ lệ hoa hồng.
4. **Hệ Thống & Quản Trị (Admin Hub)**:
   - Super Admin Console (`AdminPortalView`): Hàng đợi phê duyệt tuyển dụng/nghỉ việc, duyệt đơn nghỉ phép, phân quyền vai trò người dùng, cấu hình phòng ban & mốc thời gian hệ thống.
   - Phân quyền tài khoản & vai trò (`RoleBasedPermissionManager`, `RolePermissionModal`)
   - Cấu hình phòng ban, trạng thái & cài đặt hệ thống (`AppSettings`)

## Trạng Thái Kiểm Tra & Bất Biến Hệ Thống (Invariants & Verified State)

### Phase 1 dashboard HR & Kế toán — 2026-11-01

- Dashboard HR & Kế toán hiện hiển thị các nhóm thông tin theo đúng phạm vi nghiệp vụ: nhân sự đang hoạt động, hồ sơ mới vào tháng, đơn nghỉ phép/hồ sơ chờ xử lý, kỳ lương hiện tại và cảnh báo dữ liệu.
- Cảnh báo hồ sơ thiếu dữ liệu và lịch còn hoạt động sau ngày nghỉ việc được lấy từ dữ liệu hiện có; không sinh số liệu giả và không thêm migration/API tổng hợp mới.
- Quick action được ẩn/hiện theo quyền tài khoản; HR không được thấy thao tác payroll nếu không có quyền payroll.
- Đã xác minh local bằng dashboard của tài khoản HR & Kế toán, DOM/accessibility snapshot, lint, test và build; chưa đồng bộ VM production.

### Phase 2 dashboard HR & Kế toán — 2026-11-01

- Khu vực trọng tâm hỗ trợ lọc `Tất cả`, `Nhân sự` và `Kế toán`, giữ dữ liệu từ các nguồn đã được phân quyền.
- Các mục công việc được phân loại theo nhóm và có thể điều hướng đến roster, lịch làm việc, bảng lương, phản ánh bảng lương hoặc trung tâm phê duyệt tương ứng.
- Đã xác minh local bằng accessibility snapshot, click bộ lọc Kế toán và click mục tranh chấp bảng lương; lint, 88/88 tests và build đều đạt.
- Chưa đồng bộ VM production.

### Phase 3 dashboard theo persona — 2026-11-01

- Khu vực trọng tâm và quick action đã có nội dung riêng cho từng nhóm nghiệp vụ thay vì dùng cùng một bộ nhãn chung.
- Quick action được lọc theo `allowedTabs`; mục không nằm trong quyền tài khoản sẽ không hiển thị.
- Đã xác minh local với tài khoản HR & Kế toán và Trưởng phòng QL & Phát triển Idol; lint, 88/88 tests và build đều đạt.
- Chưa đồng bộ VM production.

### Role permission header theme contrast — 2026-11-01

- The selected-role header in `RoleBasedPermissionManager` now uses a flat slate surface instead of a gradient.
- Light mode uses dark slate text and borders; dark mode uses slate-800/slate-700 surfaces with light text.
- Rose remains an action accent only; permission behavior is unchanged.
- Local type-check passed; browser verification is pending until a browser page is shared.

### System Admin/root account invariant — 2026-11-01

- Username `admin` is the immutable root account and is always normalized to full System Admin permissions by the backend.
- `system_admin` remains a grantable role for other accounts; non-root System Admin accounts may be demoted while the root account cannot be demoted or deleted.
- User mapping now adds the `system_admin` role code for every account whose authoritative `accountType` is `system_admin`, keeping the account list and role-based list consistent.
- The role editor presents System Admin permissions as read-only; assignment/removal of other members remains available.
- Local verification: lint, 90/90 tests, and production build passed. Browser verification is pending because no browser page is currently shared.

- **Mốc Thời Gian Hệ Thống Chuẩn (`getEffectiveSystemDate`)**:
  - Khi cấu hình `referenceDate` được thiết lập (ví dụ `31/10/2025`), toàn bộ thời gian tạo/duyệt (`createdAt`, `reviewedAt`), hạn nhiệm vụ, ngày gia nhập (`joinDate`) và đơn nghỉ phép trên toàn hệ thống (cả frontend lẫn backend PostgreSQL) tự động lấy theo mốc ngày cấu hình kết hợp giờ phút giây thực tế.
  - Khi chọn tùy chọn mặc định, hệ thống tự động rơi về đồng hồ thời gian thực của máy chủ.
- **Tiêu Chuẩn Ảnh Đại Diện Trống (`DEFAULT_BLANK_AVATAR`)**:
  - Toàn bộ liên kết hình ảnh Unsplash đã được xóa sạch hoàn toàn (0 kết quả ripgrep trên toàn repository, file SQL dump và cơ sở dữ liệu PostgreSQL live). Mọi tài khoản không có ảnh đại diện được chuẩn hóa về SVG silhouette trung tính nhẹ nhàng.
- **Quy Trình Phê Duyệt Nhân Sự & Đồng Bộ Trạng Thái**:
  - Phê duyệt nhân sự mới (`create_idol`) tự động chuyển `personnel.status` và tài khoản `userAccount` liên kết sang `'Đang hoạt động'`, đồng thời cập nhật ngay lập tức vào state danh sách nhân sự trên giao diện người dùng mà không bị đứng im hay xung đột khóa ngoại.
- **Trạng thái kiểm tra mã nguồn**:
  - `pnpm exec tsc --noEmit`: 0 lỗi type-check.
## Last verified: 2026-10-30

### Account migration follow-up — 2026-10-30

- `khanghm` is the personnel-linked director account for personnel ID 7, with official email `khanghm@auratalent.vn`.
- Login verification with `khanghm/123` returns HTTP 200. The password is the preserved hash from the former local admin account.
- Fixed the personnel mapper so the linked account email is authoritative over stale legacy `socialLinks.email` values. This prevents the roster from displaying `admin@auratalent.vn` for Khang after the admin/personnel split.
- Verification: lint pass, 28/28 tests pass, production build pass, and authenticated roster API returns `khanghm@auratalent.vn` for Hoàng Minh Khang.
- Fixed the post-migration redirect loop: the director account now has business tabs/actions (`roster`, schedule, tasks, analytics, payroll, KPI, revenue, finance) and all business departments, while remaining `accountType=personnel` and `isSuperAdmin=false`.
- Made `scripts/migrate-admin-account.ts` idempotent for an already-separated admin/personnel pair; its post-check no longer assumes the root admin still owns a personnel profile.
- Browser reload verification now lands on the personnel roster instead of the indefinite redirect screen.
- Added `users.isBusinessAdmin` and a separate Business Super Admin capability. Root `system_admin` remains the only system/root administrator; a personnel account can now receive all business actions without being detached from personnel, payroll, or KPI data.
- Root account permission editing now requires an explicit confirmation dialog before assigning Business Super Admin, including bulk/role-based assignment paths. The dialog is the integration point for a future OTP/Telegram challenge.
- Prisma migration `20261030_business_admin_permission` is applied and the authorization test suite covers business-admin action grants without root escalation.
- Restored and hardened the root-account invariant: every `system_admin` maps to `isSuperAdmin=true`, cannot be downgraded by Business Super Admin payloads, and is forced out of `isBusinessAdmin`; migration `20261030_restore_system_admin_invariant` repairs existing root rows.
- Fixed the Admin Portal leadership role-template payload: personnel directors now submit `isSuperAdmin=false` with `isBusinessAdmin=true`, avoiding the invalid attempt to promote a personnel-linked account to root System Admin. Browser save verification for `khanghm` returned HTTP 200.
- RBAC role membership now excludes `accountType=system_admin` from business-role counts, department assignment, bulk selection, and assigned-member lists. The CEO/BOD role now correctly shows only `khanghm` (1 member); root `admin` remains visible in account administration but is not treated as personnel.

- Schedule matrix and per-person views now show calendar dates alongside weekdays and schedule recurrence scope.
- Idol dashboard operational KPI cards now request `/api/operational-kpi/:personnelId` for the current month.
- KPI actuals for engagement and gift points are stored in `operational_metrics`; the migration is applied to the target PostgreSQL database.
- `pnpm.cmd run lint` and `pnpm.cmd run build` pass.
- Payroll seed records for personnel ID 7 were synchronized to the current Khang visual profile by migration `20261029_sync_khang_payroll_records`.
- Personal payslips now resolve personnel ownership from the account ID on the server; a client-supplied `idolId` cannot override that relationship.
- Admin roster column titles are managed in the dedicated `Hiển Thị Danh Sách` tab, separate from general system settings.
- Top-level `Nghệ Sĩ`, `Vận Hành`, and `Tài Chính` menus open on hover and remain click-toggle compatible for touch devices.
- Navigation dropdowns include a hover bridge, preventing accidental closure while moving the pointer from a hub button into its menu.
- The primary expense-voucher action is located in the `Quản Lý Chi Phí Doanh Nghiệp` tab rather than the P&L dashboard header.
- The active top-level page is persisted across refreshes, including Finance, Revenue, Payroll, and KPI pages.
- Live-shift creation keeps its header visible with an internal scroll area and supports creating one schedule for multiple selected personnel.
- Live-shift cards are automatically ordered by weekday and start time in the schedule views; users do not need to arrange them manually.
- Weekly matrix cards show the assigned personnel's stage name, real name, and department so schedules remain identifiable when viewing everyone together.
- Personnel commercial-detail fields preserve spaces and commas during typing; comma-separated values are parsed only at save time.
- Dynamic personnel-column Stage 1 is complete: PostgreSQL has `personnel.customFields` and `personnel_columns` with 16 seeded system columns.
- Dynamic personnel-column Stage 2 types and PostgreSQL mapper/create/update handling are implemented and verified through `GET /api/idols/7` in the browser; Agent-only Node `uv_os_get_passwd ENOMEM` remains an environment limitation.
- Dynamic personnel-column Stage 3 APIs are implemented: CRUD, archive/restore, reorder, validation, and server-side Super Admin checks via verified `x-user-id` lookup.
- Dynamic personnel-column Stage 4 admin UI is implemented in `AdminPortalView`: custom-column form, CRUD, archive/restore, reorder, system-column protection, and browser verification are complete. Stage 5 remains for rendering/editing dynamic values in personnel forms.
- Dynamic personnel-column Stage 5 is implemented in `IdolModal`: active custom profile fields render by metadata type, values load/save through `customFields`, client validation is applied, and system fields are not duplicated. Stage 6 remains for roster rendering.
- Dynamic personnel-column Stage 6 is implemented in `IdolListView`: active roster columns load from metadata, custom columns render by type, column visibility is persisted locally, and system column renderers remain intact. Stage 6 browser verification and test-data cleanup are complete.
- Dynamic personnel-column Stage 7 is implemented in `IdolDetailModal`: active profile columns load from metadata, render by type, and preserve the existing approval `customFields` snapshot. Browser verification and temporary-field cleanup are complete. Field-level sensitivity/permissions are not yet modeled; all users who can view a profile currently see active `showInProfile` fields.
- Dynamic personnel-column Stage 8 is implemented: `PersonnelColumn.sensitivity` supports public/internal/sensitive fields, backend filters protected `customFields` for roster/profile/update flows, Admin Portal can configure sensitivity, and approval creation preserves protected values. JWT/RBAC and audit logging remain pending; current `x-user-id` identity is not tamper-resistant for production.
- Dynamic personnel-column Stage 9 verification is complete: database migrations are up to date, 6/6 unit tests, lint, build, API positive/negative cases, Admin Portal accessibility tree, browser reload and cleanup were verified. Build retains only the existing large-bundle warning; JWT/RBAC remains the next security stage.
- Dynamic personnel-column Stage 10 documentation handoff is complete: the implementation plan, project state, changelog, database schema, permission matrix, migration references, verification results, and known limitations are synchronized. JWT/RBAC, audit logging, and stronger field-level authorization remain planned work.
- Dynamic personnel-column Stage 11A is complete as a design/inventory stage: JWT token storage, refresh-session strategy, password migration direction, CSRF/CORS assumptions, and the current/target API route matrix are documented in `docs/security/jwt-design.md`; runtime authentication is unchanged.
- Stage 11B is partially implemented: password hashing uses `crypto.scrypt`, 19 existing PostgreSQL user passwords were migrated, `auth_sessions` migration is applied, and password tests pass. Prisma Client regeneration is pending because the running Node process locks the Windows query-engine file; JWT/session runtime remains Stage 11C.
- Stage 11C backend JWT is implemented and browser-verified: login, access-token `/me`, refresh rotation, invalid-token `401`, and logout/revoke work. Production middleware requires Bearer authentication; frontend token interceptor and full route action matrix remain Stage 11D.
- Stage 11D frontend auth migration is implemented and browser-verified: access token stays in memory, refresh cookie restores the session after reload, requests retry once after `401`, logout calls revoke, and frontend `x-user-id` usage is removed.
- Stage 11E authorization rollout is implemented: production JWT enforcement rejects missing tokens and `x-user-id` spoofing, centralized route policies enforce `allowedActions` for mutation APIs, and account/reset/configuration APIs enforce Super Admin. Production smoke tests passed using the agent preload workaround.
- Work assignment acceptance/cancellation/delegation is implemented: acceptance deadlines are validated before start, late responses become reviewable violations, published assignments can be cancelled with an audit reason, assignees can change before start, employees can request waiver/reduction, and directors can delegate penalty approval for a bounded period with automatic expiry and early revoke. Verified with lint, 105 tests, build, migration execution, and browser smoke.
- Payroll salary snapshot Stage 7 is complete: payroll APIs classify each record as explicit snapshot, legacy evidence, or missing snapshot; the payroll UI shows warnings/badges, and hot-bonus/manual-adjustment controls are disabled for approved or locked periods. No migration, backfill, or recalculation was executed. Lint, 52/52 tests, build, and browser smoke passed; the existing large-bundle warning remains.
- Approval mutations validate required payloads; requester/reviewer identity is resolved from the authenticated user, preventing body-level identity spoofing.
- Personnel activity/KPI redesign Stage 0 is complete: KPI scope is limited to company Idol groups that have active KPI activity assignments and excludes external service customers, non-Idol operations staff, and the Board of Directors. External-service revenue remains included in company revenue/P&L but not personal KPI. Current impact inventory and staged implementation plan are recorded in `PLAN_PERSONNEL_ACTIVITY_KPI.md`; no schema or runtime data changes have started.
- Personnel activity/KPI redesign Stage 1 is partially implemented: `PersonnelActivityType` and `PersonnelActivity` schema/migration are applied to PostgreSQL with one-primary-per-personnel enforcement. Prisma Client regeneration is blocked by a Windows query-engine file lock from an active Node process; Stage 2 is intentionally paused until regeneration succeeds.
- Personnel activity/KPI redesign Stages 1-2 are now complete: Prisma Client regenerated, the activity catalog is seeded, and legacy Idol categories migrated into 16 normalized activity records for 11 eligible company Idol profiles. There are 11 primary activities and no duplicate primary assignments. Stage 3 is in progress for API and multi-activity personnel form support.
- Personnel activity/KPI redesign Stage 3 is complete: activity catalog/read APIs and multi-activity create/update mapping are implemented; the Idol form supports multiple activities with one primary activity. Browser API/UI verification passed, with 5 activity types and legacy performance/PK data exposed as activity performance + pk_donate. Stage 4 is next for group/role and permission invariants.
- Personnel activity/KPI redesign Stage 4 is complete: operational KPI now returns “Không áp dụng” with zero score for non-eligible profiles (operations, collaborators, external service customers, and Board of Directors), while eligible company Idol profiles continue through the KPI pipeline. Mixed operational groups remain backward-compatible.
- Personnel activity/KPI redesign Stage 5 is complete: tasks and work schedules now have optional activity links with ownership validation; task, single-schedule, and recurring-schedule forms expose activity selection. Authenticated browser save/delete verification passed, migration is applied, lint/unit/build checks pass, and the database is up to date.
- Personnel activity/KPI redesign Stage 6 is complete: personal Idol KPI eligibility is centralized in `isEligibleForIdolKpi`; external-service customers, non-Idol staff, Board members, and Idol profiles without an activity assignment are excluded from personal KPI while company revenue/P&L remains available. Browser API verification and 16/16 unit tests pass.
- Personnel activity/KPI redesign Stage 7 is complete: `kpi_settings` supports an optional activity FK with ownership validation, API mapping, KPI form selection, and activity-aware target/weight resolution (primary activity first, then secondary activities). `monthly` settings are compatible with concrete `YYYY-MM` aggregation periods. JWT browser verification, migration status, lint, 16/16 unit tests, build, reload, and console checks passed; the existing large-bundle warning remains.

- Personnel activity/KPI redesign Stage 8 is complete: `OperationalKpiSummary.items` and the Idol dashboard now render configured KPI items dynamically with activity, target, actual, and weight context while retaining the legacy `metrics` contract. Browser verification passed with Idol Aria and an external-service customer; lint, 16/16 unit tests, build, migration status, reload, and console checks passed.
- Personnel activity/KPI redesign Stage 9 is complete: KPI administration now filters by activity, labels each setting with its activity scope, summarizes weights per activity, and backend validation blocks invalid or duplicate active configurations. Browser admin/API verification passed; lint, 16/16 unit tests, and build passed. No schema migration was required.
- Personnel activity/KPI redesign Stage 10 is complete: external-service revenue is categorized into company P&L by personnel classification, forced to zero personal payout, excluded from payroll synchronization, and explicitly labeled in Finance UI as company revenue that does not count toward personal KPI/payroll. Browser/API temporary transaction and sync checks passed; lint, 16/16 unit tests, build, and migration status passed.
- Personnel activity/KPI redesign Stage 11 is complete: legacy personnel/activity fields, KPI `metrics` compatibility, revenue/P&L/payroll fallback behavior, and existing database records were regression-checked without detected breakage.
- Personnel activity/KPI redesign Stage 12 is complete: unit coverage is 18/18, API integration and authorization negative checks passed, and browser acceptance passed across roster, schedule, tasks, KPI, finance, revenue, and payroll tabs. The redesign plan is now fully verified; the existing large-bundle warning remains.
- Bundle optimization Stage 0–1 is complete: the baseline was recorded at 1,668.39 kB minified / 339.58 kB gzip, then 11 large views were moved to `React.lazy` chunks. The entry chunk is now 712.57 kB minified / 182.01 kB gzip. Lint, 18/18 unit tests, build, and browser reload acceptance across eight tabs passed; modal/dependency/data-fetch optimization remains in later stages.
- Bundle optimization Stage 2 is complete: five large modals are now conditionally mounted with `React.lazy`, so modal chunks load only on interaction. The entry chunk is now 531.44 kB minified / 151.40 kB gzip. Lint, 18/18 unit tests, build, static diagnostics, modal interaction and browser console checks passed; dependency/chunk strategy remains Stage 3.
- Bundle optimization Stage 3 is complete: Vite/Rolldown vendor grouping was measured and rejected because it increased total initial loading (generic vendor produced a 425.65 kB React vendor; lucide grouping produced a 45.44 kB chunk). The project keeps automatic code splitting without deprecated `manualChunks` or warning suppression. Final build remains 531.44 kB minified / 151.40 kB gzip; lint, 18/18 tests, build and browser smoke passed.
- Bundle optimization Stage 4 is complete: `src/App.tsx` now loads roster/core data first and defers users, approvals, leave requests, and KPI datasets until the relevant tab is opened; loaded datasets are cached per session and explicit refresh/reset/sync paths force reload. Roster browser reload measured 11 data endpoints instead of 16, with no console/page errors. Final entry is 532.52 kB minified / 151.71 kB gzip; diagnostics, lint, 18/18 tests, build, and browser verification passed. Stage 5 remains for render/state profiling.
- Bundle optimization Stage 5 is complete: roster filtering/personnel-type fallback is memoized, and task management now indexes tasks by `idolId` with memoized per-person statistics instead of repeatedly scanning all tasks for every roster row. Browser roster/task smoke checks passed with no console/page errors; diagnostics, lint, 18/18 tests, and build passed. Entry remains 532.52 kB minified / 151.70 kB gzip; Stage 6 remains for final regression.
- Bundle optimization Stage 6 is complete: workspace diagnostics, lint/typecheck, 18/18 unit tests, production build, and browser smoke tests across roster, schedule, tasks, KPI, finance, revenue, payroll, and admin all passed with no console/page errors. The staged bundle optimization plan is complete; the transparent >500 kB entry warning remains at 532.52 kB minified / 151.70 kB gzip.
- Database storage optimization Stage 0 is complete: PostgreSQL custom-format backup and archive catalog validation passed; Prisma schema validation and migration status are clean. Baseline is 27 public tables, 64 indexes, 34 foreign keys, 27 primary keys, and 0 CHECK constraints. The staged implementation plan is recorded in `PLAN_DATABASE_STORAGE_OPTIMIZATION.md`; no schema or business data was changed.
- Database storage optimization Stage 1 is complete: multi-step personnel, approval, resignation/payroll, KPI-group, and score workflows now share Prisma transaction boundaries; rollback integration tests cover failed KPI-member and personnel-activity writes. Lint, 20/20 tests, build, Prisma validation/migration status, browser reload, and console checks passed. Stage 2 remains for concurrency/idempotency.
- Database storage optimization Stage 2 is complete: revenue/expense codes use PostgreSQL advisory locking and MAX-based allocation, score records are unique per personnel/period, and personnel JSON updates use optimistic locking via `updatedAt`. Migration was deployed, Prisma Client regenerated, and 22/22 tests, lint, build, migration status, browser reload, and console checks passed. Stage 3 remains for database constraints.
- Payroll period rollover is complete (2026-10-30): when the configured system reference date enters a new month, the PostgreSQL store automatically creates the previous month's draft payroll period and initial payroll records. With reference date 2025-12-01, `2025-11` is now returned first and selected by the payroll UI; existing paid periods remain unchanged. Lint, 35/35 unit tests, build, API verification, reload, and browser checks passed.
- Database storage optimization Stages 4–9 are complete: access-pattern indexes were added and verified with EXPLAIN; demo seed was removed from GET paths; application instants were converted to timestamptz while date-only fields remain date; request IDs and PostgreSQL audit logs cover API mutations; financial records use cancellation retention and personnel with payroll/revenue cannot be hard-deleted. The final suite passes 26/26 tests, lint, build, Prisma validation/status, migration deploy, browser reload/accessibility smoke, and API request-ID verification. The known bundle warning and agent-only `uv_os_get_passwd ENOMEM`/Windows query-engine lock limitations remain documented in `PLAN_DATABASE_STORAGE_OPTIMIZATION.md`.

### Personnel activity/KPI redesign Stage 7 — verified complete (2026-10-30)

`kpi_settings` supports an optional activity FK with ownership validation, API mapping, KPI form selection, and activity-aware target/weight resolution (primary activity first, then secondary activities). `monthly` settings are compatible with concrete `YYYY-MM` aggregation periods. JWT browser verification, migration status, lint, 16/16 unit tests, build, reload, and console checks passed; the existing large-bundle warning remains.

### Payroll reconciliation false-positive fix — verified complete (2026-10-30)

The payroll mismatch counter now uses the same personnel-profile source as the backend and no longer adds standalone/system-admin user accounts. The 2025-10 payroll browser check shows 17/17 records with no false mismatch banner or sync button. Lint, 33/33 unit tests, build, reload, and accessibility verification passed.

### Finance overview simplification — verified complete (2026-10-30)

Removed the repeated “Minh Bạch Tài Chính” explanation banner from the Finance & Profit overview. The detailed Net pay, employee insurance, company insurance, and total labor-cost explanation remains available in the “Cơ Cấu Chi Phí & Định Phí” tab. Lint, 33/33 unit tests, build, and browser UI/console checks passed.

### Payroll salary snapshot Stage 1 - schema and creation snapshot (2026-10-30)

Migration `20261030_payroll_salary_snapshots` is applied. `personnel_salary_history` and explicit nullable payroll snapshot fields are available; new PostgreSQL payroll records persist `contractSalarySnapshot` and `salarySnapshotAt`. Existing historical records were not backfilled or recalculated. Stage 2 remains for effective-dated salary-change workflow. Prisma validation/status, lint, 38/38 tests and build passed; the existing large-bundle warning remains.
### Payroll salary snapshot Stage 2 (2026-10-30)

- Implemented transactional salary-history workflow with effective date, reason, actor and audit metadata.
- Added salary-history GET/POST API and `manage_payroll` enforcement for mutations.
- Direct profile salary changes without `salaryChange` are rejected; profile UI now collects effective date and reason.
- Retroactive salary changes are blocked when affected payroll periods are pending approval, approved or locked/paid.
- Verification: lint passed, 40/40 unit/integration tests passed, production build passed, browser smoke checks passed.
- No historical payroll amounts were backfilled or overwritten. Stage 3 remains for centralized payroll-period salary resolution and proration.
### Payroll salary snapshot Stage 3 (2026-10-30)

- Added the shared payroll salary resolver and integrated it into PostgreSQL `syncPayrollPeriod()` for new records.
- Salary history is selected by effective date; current `Personnel.baseSalary` is fallback only when no history applies.
- Mid-month salary changes are prorated by Monday-Saturday working days and clipped by join/resignation dates.
- New payroll records snapshot contract salary, effective date, history ID, snapshot timestamp, and salary segments; existing records remain unchanged during sync.
- Verification: 44/44 tests, lint, build, Prisma validation/migration status and browser payroll API smoke check passed.
- Stage 4 remains for legacy JSON/fallback salary recalculation isolation.

### Payroll salary snapshot Stage 4 (2026-10-30)

- Legacy JSON payroll salary recalculation and automatic snapshot backfill are disabled.
- Production rejects the legacy JSON store and uses PostgreSQL only.
- Legacy synchronization is restricted to draft periods; approved and locked historical periods are immutable during fallback sync.
- No historical payroll data was backfilled or recalculated. No schema migration was required.
- Verification: lint, 44/44 tests, production guard, build and browser payroll API smoke passed; the existing large-bundle warning remains.
- Stage 5 remains for an explicit evidence-backed legacy audit/backfill tool with operator approval and audit trail.

### Payroll salary snapshot Stage 5 (2026-10-30)

- Added the read-only legacy salary backfill planner and controlled apply script.
- Only explicit historical evidence is eligible; existing snapshots are immutable and conflicting/missing evidence is quarantined.
- Apply mode requires a system Super Admin, a transaction, per-record audit logs, and period-total invariants; it changes snapshot metadata only.
- Dry-run inspected 253 PostgreSQL records: 242 candidates, 11 missing-evidence records, 0 conflicts. No records were applied.
- Verification: lint and 48/48 tests passed. Stage 5 apply remains an operator-controlled action after backup/checksum and business review.

### Payroll salary snapshot Stage 6 (2026-10-30)

- Payroll amount mutation is now restricted to `draft` and `pending_approval` periods.
- Sync, manual adjustment, and revenue-to-payroll synchronization reject approved/locked periods before changing data.
- Legacy API mapping exposes explicit `earningsDetail.contractBaseSalary` as a snapshot fallback; current `Personnel.baseSalary` is not used for historical payroll display.
- No historical data was recalculated or migrated.
- Verification: lint and 51/51 tests passed; browser/API and build verification completed with the existing large-bundle warning.
- Stage 7 remains for UI warnings, RBAC/audit presentation, and missing-snapshot fallback isolation.

### Payroll salary snapshot Stage 8 (2026-10-30)

- Payroll management/audit retains `snapshotSource`, ngay hieu luc/thoi diem snapshot va lich su dieu chinh; phiếu lương không hiển thị metadata kỹ thuật này.
- Bang luong co bo loc legacy/missing; bank CSV co them cot `Snapshot Source` de truy vet.
- Record thieu snapshot chi dung so tien da luu, khong thay bang luong hien tai; khong co migration/backfill/recalculation.
- Verification: lint/problems dat, 52/52 tests dat, build dat va browser smoke test loc duoc 11 record missing snapshot o ky 2025/10; canh bao chunk lon hien huu van con.

### Payroll director workflow and action layout (2026-10-30)

- Tach submitter va director trong workflow payroll; Giam doc/Super Admin khong con nut trinh bang luong.
- UI ky draft hien `Cho HR/Ke toan trinh duyet`; nut phe duyet chi hien o ky `pending_approval`.
- Backend PostgreSQL va legacy store chan submit/approve/lock sai vai tro hoac sai trang thai; user JWT da xac thuc duoc uu tien hon request body.
- Verification: problems khong loi, lint dat, 53/53 tests dat, build dat va browser xac minh voi tai khoan Giam doc; canh bao chunk lon hien huu van con.
- Change record: `docs/changes/2026-10-30-payroll-director-workflow-ux.md`.

### Payroll display status workflow fix (2026-10-30)

- Cột trạng thái từng phiếu lương nay dùng `PayrollPeriod.status` làm nguồn sự thật: kỳ `draft`/`pending_approval` hiển thị `Chờ duyệt`, kỳ `approved` hiển thị `Chờ chi`, và kỳ `locked_paid` hiển thị `Đã chi`.
- Không thay đổi dữ liệu, schema, số tiền hoặc transition backend; `paymentStatus` chỉ là fallback cho caller không có trạng thái kỳ.
- Verification: lint đạt, 57/57 tests đạt, build đạt; browser kiểm tra kỳ `approved` hiển thị `Chờ chi` và kỳ `locked_paid` hiển thị `Đã chi`. Kỳ draft được bao phủ bằng unit test do database hiện không có kỳ draft đang mở.
- Change record: `docs/changes/2026-10-30-payroll-display-status.md`.

### Payslip status and technical metadata cleanup (2026-10-30)

- PostgreSQL payroll records now carry the owning `PayrollPeriod.status` as `periodStatus`; the payslip status is derived from the period workflow instead of `paymentStatus` alone.
- A `draft` or `pending_approval` period displays **Chờ duyệt**, an `approved` period displays **Chờ chi**, and only `locked_paid` displays **Đã chi**.
- The payslip no longer exposes the technical `Nguồn snapshot lương` banner. Snapshot values and audit metadata remain stored and available to payroll management/audit views.
- Database verification confirmed `2025-12` is `draft` with no submission/approval timestamps; this was the direct reproduction of the reported mismatch.
- Verification: diagnostics clean, lint passed, 64/64 tests passed, build passed. Existing Vite large-entry-chunk warning remains.
- Change record: `docs/changes/2026-10-30-payroll-display-status.md`.

### Payroll feedback and approval calendar — Stage 0 (2026-10-30)

- Đã chốt chính sách phản ánh lệch công/khấu trừ: ngày 1–3 phản hồi và điều chỉnh; từ ngày 4 phê duyệt; từ ngày 5 mới được khóa sổ/chi.
- Điều kiện khóa/chi là điều kiện kép: ngày hệ thống >= 5 và kỳ lương đã `approved`; nếu chưa phê duyệt thì UI disable và backend từ chối.
- Sau `approved`, số tiền kỳ gốc bất biến; sai sót xử lý bằng kỳ/khoản điều chỉnh riêng.
- Stage 0 chỉ ghi nhận chính sách, chưa thay đổi schema, API, UI hoặc dữ liệu.
- Plan: `PLAN_PAYROLL_FEEDBACK_APPROVAL_CALENDAR.md`.
- Change record: `docs/changes/2026-10-30-payroll-feedback-approval-calendar-stage0.md`.

### Payroll feedback and approval calendar — Stage 1 (2026-10-30)

- Đã thêm model `PayrollDispute` liên kết với kỳ lương, phiếu lương, nhân sự, người gửi và người xử lý; có trạng thái, lý do, số liệu hệ thống/đề nghị, bằng chứng và kết luận.
- Đã thêm các cột ngày `feedbackStartsAt`, `approvalStartsAt`, `lockStartsAt` vào `PayrollPeriod` để lịch sử từng kỳ độc lập với cấu hình tương lai.
- Migration `20261030_payroll_feedback_calendar` đã apply; database up to date; hiện có 0 phản ánh và các mốc kỳ hiện hữu để NULL chờ Stage 3 khởi tạo.
- Stage 1 chưa có API/UI và chưa thay đổi số liệu lương.
- Verification: Prisma validate/generate/migrate đạt, lint đạt, 66/66 test đạt.
- Stage 2 tiếp theo: backend API, ownership và RBAC cho phản ánh.

### Payroll feedback and approval calendar — Stage 2 (2026-10-30)

- Đã triển khai API đọc/tạo/cập nhật/hủy phản ánh bảng lương và client API tương ứng.
- Ownership được kiểm tra ở backend: nhân sự chỉ thao tác phiếu của chính mình; reviewer là HR/Kế toán/Giám đốc/Super Admin theo quyền.
- Không cho tạo phản ánh trên kỳ `locked_paid`; người gửi không thể tự đổi trạng thái xử lý hoặc giả mạo định danh trong body.
- Route policy và audit middleware bao phủ các endpoint mutation.
- Chưa có UI và chưa có phản ánh nghiệp vụ nào được tạo.
- Verification: problems sạch, lint đạt, 68/68 test đạt, migration status up to date.
- Stage 3 tiếp theo: calendar guard cho phê duyệt và khóa sổ/chi.

### Payroll feedback and approval calendar — Stage 3 (2026-10-30)

- Calendar utility dùng mốc tháng liền sau kỳ lương: ngày 1–3 phản hồi, ngày 4 trình/phê duyệt, ngày 5 bắt đầu khóa sổ/chi.
- Backend đã chặn submit/approve trước ngày 4 và chặn lock/pay trước ngày 5 hoặc khi kỳ chưa `approved`.
- UI bảng lương disable nút theo cùng lịch; điều kiện backend vẫn là lớp bảo vệ chính.
- Migration `20261030_payroll_calendar_backfill` đã backfill mốc cho các kỳ hiện hữu; kỳ `2025-12` có các mốc `2026-01-01`, `2026-01-04`, `2026-01-05`.
- Verification: Prisma validate/generate/migrate đạt, problems sạch, lint đạt, 70/70 test đạt, build đạt. Browser smoke test bị chặn bởi lỗi runtime `uv_os_get_passwd ENOMEM`.
- Stage 4 tiếp theo: UI phản ánh trên phiếu lương.

### Leave responsive layout and allocation (2026-10-30)

- Browser smoke test completed with `quynhbt/123`: idol Dashboard access, responsive leave modal at 420x700, and annual/unpaid overflow confirmation were verified without persisting a test request.
- Leave workflow Stage 4 is complete: users with `manage_approvals` can access the Admin Portal entry point and are routed to `Duyệt Nghỉ Phép` without being promoted to system admin; `khanghm` retains `accountType=personnel` and `isSuperAdmin=false`. Lint, 62/62 tests, diagnostics, and build passed; the existing large-entry-chunk warning remains.

- Long modal surfaces now constrain height to the viewport and scroll their content, including the leave request modal and shared/admin/finance/payroll/operation/KPI modals.
- Annual leave requests reserve quota while pending or approved. When a request exceeds the remaining quota, the user must confirm the split; the request stores annual and unpaid day counts and remains subject to management approval.
- Approved unpaid leave is included in the deduction when new PostgreSQL payroll records are created. Finalized payroll periods remain immutable.
- Migration `20261030_leave_allocations` is applied. Lint passed, 62/62 tests passed, build passed. Existing Vite large-chunk warning remains.
- Browser payroll reload passed; leave-form interaction remains unverified in the current HR account because its navigation does not expose Idol Dashboard.
- Change record: `docs/changes/2026-10-30-leave-responsive-allocation.md`.
- Stage 3 adds server-side RBAC for leave APIs: personnel can only view/submit their own request, while cross-person access and updates/deletes require `manage_approvals`; reviewer identity is taken from the authenticated request.

### Payroll feedback and approval calendar — Stage 4 (2026-10-30)

- Phiếu lương có form phản ánh trực tiếp cho các lỗi lệch công, giờ live, ngày nghỉ, khoản trừ, lương và KPI/thưởng; lý do là bắt buộc, số liệu đề nghị và bằng chứng là tùy chọn.
- Phiếu lương tải và hiển thị lịch sử phản ánh theo đúng `recordId`, dùng API backend đã có; không tự điều chỉnh dữ liệu lương.
- Phiếu lương chỉ hiển thị cửa sổ phản hồi từ ngày 01 đến 23:59:59 ngày 03 của tháng kế tiếp; đã bỏ mốc phê duyệt và khóa/chi khỏi phiếu, trong khi workflow quản trị vẫn giữ nguyên.
- Chặn phản ánh mới khi phiếu đã thanh toán hoặc kỳ đã `locked_paid`.
- Verification: problems sạch, lint đạt, 72/72 test đạt, build đạt; browser smoke test chưa xác minh do `uv_os_get_passwd ENOMEM` khi khởi động Node.
- Stage 5 đã được triển khai ở phần ghi nhận ngay dưới đây.

### Payroll feedback and approval calendar — Stage 5 (2026-10-30)

- Màn hình quản lý bảng lương có panel xử lý phản ánh dành cho reviewer hợp lệ, với bộ lọc phản ánh mở/tất cả và số lượng đang mở.
- Reviewer xem được nhân sự, loại phản ánh, giá trị hệ thống/đề nghị, lý do, bằng chứng và kết luận; có thể tiếp nhận, xử lý hoặc từ chối với ghi chú bắt buộc khi kết luận.
- Khu vực workflow hiển thị lý do khi nút trình/phê duyệt/khóa/chi bị disable theo lịch kỳ lương.
- Server-side RBAC và transition API vẫn là lớp bảo vệ chính; UI không tự cấp quyền.
- Verification: problems sạch, lint đạt, 72/72 test đạt, build đạt; browser smoke test còn bị chặn bởi lỗi API localhost 401/kết nối máy chủ.
- Stage 6 tiếp theo: kiểm thử tích hợp/browser đầy đủ với Idol, HR/Kế toán và Giám đốc, sau đó hoàn thiện tài liệu vận hành.

### Payroll feedback and approval calendar — Stage 6 (2026-10-30)

- Prisma migration status/schema validation, diagnostics, lint, 72/72 tests và production build đều đạt.
- Test tự động bao phủ ownership/RBAC, trạng thái phản ánh, lịch ngày biên 03/04/05 và bất biến payroll sau phê duyệt/khóa.
- Browser verification chưa hoàn tất: ứng dụng mở được với admin nhưng server localhost dừng khi chuyển sang Tài chính, dẫn tới `ERR_CONNECTION_REFUSED`; chưa xác minh đủ Idol, HR/Kế toán và Giám đốc.
- Trạng thái tổng thể: implementation hoàn tất, browser acceptance còn chờ môi trường runtime ổn định.
- Change record: `docs/changes/2026-10-30-payroll-feedback-approval-calendar-stage6.md`.
### Payroll dispute inbox — Stage 7 (2026-10-30)

- Đã tách phản ánh bảng lương thành phân hệ riêng có badge, tìm kiếm, lọc và màn hình chi tiết; màn hình quản lý lương không còn render panel danh sách phản ánh legacy.
- Đã thêm inbox API có server-side RBAC/ownership, chuẩn hóa số liệu thành nhãn nghiệp vụ và liên kết nút mở điều chỉnh tới đúng kỳ/phiếu lương.
- Luồng hiển thị: tiếp nhận chỉ ghi nhận `under_review`; xác nhận xử lý/từ chối yêu cầu ghi chú; điều chỉnh vẫn dùng guard kỳ lương hiện hành.
- Verification: lint, 73/73 tests, build và diagnostics đều đạt; browser bị chặn bởi `uv_os_get_passwd ENOMEM` khi khởi động Node.
- Change record: `docs/changes/2026-10-30-payroll-dispute-inbox-stage7.md`.
- Native dialog removal (2026-10-30): Đã thay toàn bộ `alert/confirm` native trong mã thực thi bằng toast và modal xác nhận nội bộ dùng chung. Lint, 73/73 tests và build đạt; browser acceptance tiếp tục bị chặn bởi `uv_os_get_passwd ENOMEM`. Change record: `docs/changes/2026-10-30-native-dialog-removal.md`.

### Payroll auto deductions and money input (2026-10-30)

- Thuế TNCN, BHXH/BHYT người lao động và phần bảo hiểm công ty được tính theo lương hợp đồng bằng utility dùng chung; backend luôn tính lại và không tin giá trị thuế/bảo hiểm do client gửi.
- Các trường tiền trong form điều chỉnh phiếu lương dùng input văn bản có phân cách hàng nghìn theo locale Việt Nam, chấp nhận dấu `.` hoặc `,`, không còn mũi tên tăng/giảm; ngày công và giờ làm thêm vẫn là input số.
- Verification: lint đạt, 76/76 tests đạt, build đạt; browser smoke test còn chờ runtime Node ổn định.
- Change record: `docs/changes/2026-10-30-payroll-auto-deductions-money-input.md`.

### Payroll dispute adjustment return flow (2026-10-30)

- Ticket phản ánh giữ `disputeId` khi mở phiếu lương điều chỉnh; sau khi lưu thành công, ticket chuyển sang `adjusted` / “Đã điều chỉnh” và giao diện quay lại đúng ticket.
- Ticket `adjusted` cho phép reviewer ghi kết luận và đóng bằng “Đã xử lý” hoặc “Từ chối”; backend kiểm tra transition tương ứng.
- Đã sửa lỗi mất `disputeId` khi target điều chỉnh được consume sớm; mã phản ánh hiện được giữ trong state cục bộ đến khi lưu xong.
- Verification: pnpm lint đạt, 76/76 tests đạt, pnpm build đạt; browser smoke test còn chờ runtime Node ổn định.
- Change record: `docs/changes/2026-10-30-payroll-dispute-adjustment-return.md`.

### Dark mode (2026-10-30)

- Đã thêm nút chuyển giao diện sáng/tối trên Navbar, lưu lựa chọn bằng `localStorage` và fallback theo cài đặt hệ điều hành.
- CSS theme dùng chung xử lý nền, card, chữ trung tính, border, input và scrollbar; màu thương hiệu/trạng thái được giữ nguyên.
- Browser visual verification còn chờ runtime Node ổn định.
- Đã sửa lỗi phản màu ở Navbar và header bảng do các lớp nền trắng/xám trong suốt chưa được override trong dark mode.
- Change record: `docs/changes/2026-10-30-dark-mode.md`.

#### Dark-mode gradient follow-up (2026-10-31)

- Remaining pale cards were traced to gradient stops such as `to-white`, `via-white`, and light accent gradient variants rather than base background utilities.
- Those gradient stops and additional pink/orange/teal/cyan surfaces are now remapped for dark mode.
- Production was rebuilt/recreated and `aura-app` is healthy; lint, build, and type-check passed.

### Dark-mode contrast remediation (2026-10-31)

- Shared dark-mode CSS now remaps light semantic backgrounds, opacity variants, borders, text shades, and gradient stops across Finance, Payroll, Payroll Disputes, KPI, Work Schedule, Admin, and Permissions screens.
- Production app was rebuilt and recreated on the VM; `aura-app` reports healthy.
- Verification: lint, build, and 76/76 tests passed. Browser computed-style verification on `https://aura.com` confirmed dark surfaces with readable text.
- Existing Vite large-chunk warning remains non-blocking.
- Change record: `docs/changes/2026-10-30-dark-mode.md`.

### Dark-mode profile modal contrast follow-up (2026-10-31)

- Remaining pale gradient stops in the personnel profile modal were traced to the emerald/teal/slate gradient combination and remapped for dark mode.
- Deep semantic heading colors and modal light-surface/hover states now use readable dark-mode values.
- Local verification: lint passed, 77/77 tests passed, build passed, problems check passed, and browser computed styles confirmed dark gradient surfaces with readable text.
- Production synchronization is intentionally pending explicit deployment confirmation.
- An unrelated existing `Maximum update depth exceeded` browser console warning remains when opening the profile modal and should be handled separately.

### Profile modal layout alignment (2026-10-31)

- The salary/bank section now uses a consistent four-column row with a fixed label height, preventing long labels from misaligning textboxes.
- Salary effective date and change reason are displayed in a separate responsive row below the primary fields.
- Local verification: lint passed, 77/77 tests passed, build passed, and browser DOM coordinates confirmed aligned primary inputs.
- Production synchronization remains pending explicit confirmation.
### HR personnel creation error — verified 2026-10-31

- The HR/Accounting account retains `manage_idols` for personnel creation and update; deletion remains System Admin-only at the route layer.
- Personnel creation now reports the server validation error and logs the request ID instead of returning only a generic failure message.
- Username/email reuse is rejected when the account is already linked to a personnel profile, preventing duplicate personnel-account relation failures.
- Verification: lint passed and 87/87 tests passed. VM synchronization remains intentionally pending separate confirmation.

### Pending personnel status constraint — verified 2026-10-31

- The HR approval workflow creates personnel with status `Chờ duyệt`.
- Migration `20261031_allow_pending_personnel_status` updates PostgreSQL's status check to allow `Đang hoạt động`, `Đã nghỉ việc`, and `Chờ duyệt`.
- Local migration is applied and the database-backed regression test passes. The constraint was verified to include all three workflow states. Production/VM migration is explicitly pending separate confirmation.

### Personnel creation form surfaces — verified 2026-10-31

- The personnel creation modal uses theme-scoped neutral surfaces for major sections instead of separate colored gradients.
- Accent colors remain available for active selections, semantic labels, and warnings.
- Local browser verification covered the modal in light and dark mode; lint, 88/88 tests, and build passed. VM synchronization remains pending separate confirmation.

- Work-assignment waiver requests are now visible in the manager assignment list with reason, submitted time, status, and inline review actions.
- Fixed stale user-scoped work-assignment data after account switching; login/logout now forces a fresh scoped fetch.
- Payroll penalty period rule: a confirmed work-assignment violation dated 2026-01-01 belongs to payroll period 2026-01; cross-month assignments are anchored to their violation/start date.
- Payroll feedback lifecycle rule: the employee feedback window is open only for a closed attendance period awaiting director approval (`pending_approval`). Draft, approved, and locked/paid periods are read-only for new feedback.
- Personnel roster filter UX: block selection is consolidated into one dropdown while preserving the existing `all`/`idol`/`corporate` filtering behavior and counts.
## Cập nhật 2026-11-02

- Đã triển khai lịch sử sử dụng dịch vụ cho hồ sơ Dịch vụ ngoài trong modal chi tiết hồ sơ.
- Migration `20261102_service_usage_history` đã được áp dụng tại database local; trạng thái Prisma hiện up to date sau khi đồng bộ trạng thái migration cũ đã tồn tại bảng.
- UI/API đã có tạo, xem, sửa và huỷ mềm; chưa thay đổi logic payroll/KPI.
- Lịch sử đã tách thành tab riêng trong phân hệ Tài chính; modal hồ sơ dịch vụ ngoài chỉ dùng để nhập lượt mới. Trạng thái lượt được tính tự động theo thời gian.
- Browser đã xác nhận tab hiển thị danh sách 2 hồ sơ dịch vụ ngoài và modal không còn hiển thị bảng lịch sử.
- Form thêm lượt sử dụng đã có toast thành công/thất bại và chọn nhiều người thực hiện bằng tìm kiếm + checkbox; dữ liệu một người cũ vẫn được tương thích.
- Dashboard HR/kế toán đã gom các mục dịch vụ ngoài thành một nhóm riêng; thao tác mở đơn truyền đúng hồ sơ người sử dụng và mã lượt để chọn đúng đơn trong trang lịch sử.
- Dashboard nhân sự hiển thị ngày hệ thống theo mốc đã cấu hình; nhóm dịch vụ ngoài có nút thu gọn/mở ra tương tự nhóm hồ sơ cần kiểm tra.
- Đã kiểm tra lint, test và build; browser smoke test tiếp tục được thực hiện sau khi khởi động lại app.
### System time and date input — verified (2026-11-02)

- Added the configured reference time field and shared date-time parsing/display helpers.
- Prisma migration is applied in the local runtime database; lint, build, tests, and browser reload verification completed.

## External service assignment and payment (2026-11-02)

- Implemented assignment conflict checks, personal-dashboard visibility, accounting payment queue, partial-payment tracking, and one-revenue-transaction idempotency.
- Migration `20261102_service_usage_assignment_payment` is applied locally.
- Payment confirmation and service cancellation now use in-app modals with inline validation; browser-native confirmation/prompt dialogs are no longer used in the service workflow.
- Fixed payment modal number-input validation so the default outstanding amount is accepted instead of being rejected by an incompatible step increment.
- The service-history page now exposes visible edit and cancel actions per record; edit is blocked after full payment and cancellation requires a reason.
- The HR/director/talent-management dashboard now includes a compact external-service tracking section with current status, assignee, and payment status, linked to the full history page. Browser DOM/accessibility verification confirmed the section renders for an HR account.
- Dashboard presentation was refined: the standalone service card was removed; active service usages now join HR's "Việc cần xử lý" list for tracking, while completed unpaid/partial usages become accounting payment-confirmation items. Browser accessibility verification confirmed `SVC-202601-0001` appears as a tracking item.
- Fixed HR service-usage entry: the form now retrieves active assignees through a permission-protected endpoint, and service mutations accept either `manage_revenue` or `manage_idols`. Browser accessibility verification showed the assignee dropdown populated with active accounts.
# Date/time input standardization - implemented (2026-11-02)

- Service usage editing and work-assignment delegation now use the shared localized date-time inputs.
- Date-only fields display `DD/MM/YYYY`; date-time fields display `DD/MM/YYYY HH:mm` while preserving ISO values for APIs.
- Month-only and time-only scheduling/system-reference controls remain specialized controls.
- Shared date controls retain a calendar button and browser picker, while the visible value remains localized.
- Personal role dashboards now combine assigned work and external-service records into a chronological timeline; the existing action panel remains the source for response/completion actions.

# Dedicated work-assignment view - implemented (2026-11-02)

Công tác bắt buộc không phản hồi sẽ tự động chốt phạt đủ định mức sau 3 ngày kể từ `endAt`, trừ trường hợp đã gửi giải trình chờ xử lý. Action vi phạm dùng modal thống nhất; công tác đã hoàn tất không còn nút huỷ.

Tráº¡ng thÃ¡i “ChÆ°a xong/ÄÃ£ xong” trÃªn dashboard giao viá»‡c Ä‘Æ°á»£c tÃ­nh theo tráº¡ng thÃ¡i assignee; khi táº¥t cáº£ ngÆ°á»i Ä‘Æ°á»£c giao Ä‘Ã£ hoÃ n táº¥t hoáº·c Ä‘Æ°á»£c xá»­ lÃ½ khÃ´ng tham gia, cÃ´ng viá»‡c Ä‘Æ°á»£c xem lÃ  Ä‘Ã£ xong.

Dashboard cá nhân đã sắp xếp block tổng quan KPI/tài chính/nghỉ phép trước block giao việc chi tiết.

Trạng thái không tham gia sau khi quản lý xác nhận phạt/miễn/giảm phạt được tính là đã kết thúc trên dashboard cá nhân; trạng thái đang chờ xử lý vi phạm vẫn là chưa xong.

Dashboard cá nhân hiện là lối tắt/tổng quan cho giao việc. Trang `work_assignments` đảm nhiệm timeline, lọc trạng thái và chi tiết từng việc, đồng thời giữ nguyên các thao tác quản lý giao việc. Đã kiểm tra TypeScript/lint và build; browser verification cần tiếp tục trên phiên đang chạy để xác nhận điều hướng trực tiếp.

Trang `work_assignments` hiển thị ngày và giờ hệ thống trong phần tổng quan, dùng cùng mốc thời gian cấu hình với các nghiệp vụ quá hạn và phản hồi.

Dashboard Idol cũng hiển thị cùng ngày giờ hệ thống trong banner tổng quan để người dùng đối chiếu với lịch công việc và hạn phản hồi.
Các dịch vụ ngoài được phân công cũng xuất hiện trong nhóm riêng trên trang này, lấy theo tài khoản đăng nhập qua API `/service-usage/assigned`.

Luồng giải trình vi phạm giao việc hiển thị trạng thái “Đã gửi giải trình · Chờ xử lý” cho người thực hiện và chặn gửi lặp ở cả giao diện lẫn server.

Luồng phản hồi giao việc đã phân biệt trước và sau `Hạn phản hồi nhận việc`: trước hạn dùng `Phản hồi` để xin đổi người/thông báo không tham gia không phạt; sau hạn dùng `Giải trình` theo chính sách miễn, giảm hoặc phạt. Thẻ công việc hiển thị trước mức phạt cố định/phần trăm và số tiền dự kiến khi có lương hợp đồng. Server cho phép Giám đốc, người được ủy quyền, Manager có quyền quản lý hoặc người trực tiếp giao việc xử lý phản hồi.

Đã mở rộng xử lý giải trình: quản lý chọn tham gia hoặc không tham gia; nhánh không tham gia hỗ trợ không phạt, phạt đủ định mức hoặc phạt theo tỷ lệ phần trăm định mức. Kết quả được lưu cùng tỷ lệ và số tiền phạt thực tế.

Mức phạt phần trăm trên thẻ giao việc được tính theo lương hợp đồng của từng người được assign; màn hình quản lý không còn lấy nhầm lương của tài khoản đang đăng nhập để hiển thị số tiền dự kiến.

Thẻ giao việc hiển thị nhãn “Mức phạt khi vi phạm” và chú thích rằng phạt chưa được áp dụng, chỉ phát sinh sau khi vi phạm được xác nhận.

Dropdown ủy quyền phê duyệt trên màn hình giao việc đã được sửa để người có quyền quản lý giao việc nhận đủ danh sách tài khoản, thay vì chỉ tải danh sách cho Super Admin.

Các nút thao tác của người thực hiện trong thẻ giao việc đã được tách xuống khu vực footer riêng, giúp nút hoàn thành không bị lẫn với thông tin mô tả và kết quả xử lý.


### Task ownership và time tracking — 2026-11-03

- Task API đã tách quyền quản lý task khỏi quyền bấm giờ của chính Idol. Idol chỉ có thể Start/Stop task thuộc hồ sơ liên kết; server từ chối task khác bằng `403`.
- Danh sách task của Idol được scope ở server và frontend; dropdown chi tiết không còn cho chuyển sang Idol khác. Quản lý vẫn được lọc theo phòng ban/quyền.
- Timer lưu `startTime`, `endTime`, `loggedDurationMinutes` vào PostgreSQL qua endpoint timer riêng; khi reload sẽ khôi phục trạng thái đang chạy. Màn quản lý polling dữ liệu task mỗi 5 giây để đồng bộ trạng thái.
- UI timer đã được thu gọn vào card task: bỏ thanh trạng thái riêng phía trên và giữ thời gian đang chạy cùng nút `Dừng & Lưu` trong card, tránh layout bị nhảy.
- Bổ sung shortcut `Space` để dừng/tiếp tục task gần nhất; không bắt phím khi người dùng đang nhập liệu hoặc thao tác control khác.
- Khi quản lý chọn một Idol, danh sách task được refresh ngay; timer active được xác định bởi `startTime` có giá trị và `endTime` trống để tránh lệch nhãn trạng thái.
- Màn quản lý không còn cho chọn thủ công `Đang làm`; trạng thái này hiển thị nhãn tự động từ thao tác Start timer, còn các trạng thái chưa làm/đã xong vẫn có thể điều chỉnh.
- Đã ẩn block thông tin `Phạm vi truy cập` trên giao diện danh sách nhân sự; chỉ thay đổi trình bày, không thay đổi phạm vi dữ liệu.
- Đã chạy lint, test và build; browser smoke/e2e cho hai tài khoản và trạng thái timer cần hoàn tất sau khi khởi động lại server local.
- Task creation now derives category choices from the Idol category and filters KPI activities by the selected category. The backend validates the pair on create/update while preserving existing task records for backward-compatible reads.
# Fresh production baseline and redeployment — 2026-11-09

- Replaced the active Prisma migration history with one schema-derived baseline (`00000000000000_squashed_baseline`); the previous 11 active migration directories are retained under `prisma/migrations-archive/active-history-20261109/` for audit.
- User explicitly approved a fresh production initialization and no backup. Removed exactly the two approved volumes (`aura-talent_pgdata`, `aura-talent_uploads_data`); Compose recreated them empty. Uploaded media and previous DB contents were irreversibly removed as approved.
- Deployed GitLab `main` at `0c72df19bf60b35a0971917127933214b65f8206` under `/data/aura-talent/releases/0c72df1`, using only VM account `aura-talent`; preserved `/data/aura-talent/.env` and did not store or print secrets.
- First app start exposed a CRLF shebang issue in `docker-entrypoint.sh`; fixed with `.gitattributes` (`eol=lf`), merged to main, and rebuilt. App and PostgreSQL are healthy, Nginx is up, HTTPS returns 200.
- Fresh database has exactly one applied Prisma migration (`00000000000000_squashed_baseline`); Prisma reports up to date. Read-only production preflight: `systemAdmins=1`, `systemAdminProfiles=0`, `appliedMigrations=1`; startup reports 16 RBAC roles and 0 role assignments. No personnel/demo data was seeded. Browser displays the blank login form; the unauthenticated protected API returns 401 as expected. Authenticated business-flow smoke tests remain for the administrator.
