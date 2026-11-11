# NHẬT KÝ THAY ĐỔI (CHANGELOG)
## Dự Án Aura Talent Management

### [2026-11-11] - Tránh build và deploy cho thay đổi chỉ có tài liệu và tệp phi-runtime

- Đưa bộ lọc `changes:regexp` lên `workflow:rules` cho nhánh `main` (kèm hỗ trợ chạy tay qua `$CI_PIPELINE_SOURCE == "web"`) để các commit chỉ sửa tệp phi-runtime không tạo pipeline rỗng lỗi trên `main`; giữ job `docs_only` nhẹ cho MR.
- Mở rộng biểu thức loại trừ tệp phi-runtime sang `docs/`, Markdown ở root, `prisma/migrations-archive/`, `.agents/`, `.vscode/`, `.gitignore`, `.gitattributes`, `metadata.json` (125 ký tự, <= 255); bật `interruptible: true` cho `docs_only`/`verify` và khóa `interruptible: false` cho `.vm_deploy`.
- Cập nhật tài liệu vận hành, năng lực hệ thống và trạng thái dự án. Kiểm chứng YAML parse (`yaml.safe_load`), mô phỏng khớp đường dẫn (10 đường dẫn bỏ qua / 11 đường dẫn chạy pipeline) và `git diff --check` đạt; chưa xác minh bằng GitLab CI Lint hoặc pipeline thực tế trên GitLab. Không thay đổi ứng dụng, DB, VM hoặc production.

### [2026-11-11] - Bổ sung quy tắc ignore và chuẩn hóa EOL cho shell script

- Cập nhật `.gitignore` (giữ nguyên các mục hiện có) để loại trừ mã nguồn sinh tự động (`/prisma/client/`), cache `.pnpm-store/`, các file/thư mục dump và release tạm (`*.dump`, `/*.sql`, `.*-backup-*/`, `.*-release-*/`), file thông tin server nhạy cảm (`Server-production-info.md`) và tài liệu nháp cục bộ (`POSTGRES_MIGRATION_PLAN.md`), tránh lộ dữ liệu hoặc đẩy nhầm artifact lên Git.
- Cập nhật `.gitattributes` áp dụng `*.sh text eol=lf` cho toàn bộ shell script (bao gồm `docker-entrypoint.sh` và `scripts/deploy-vmportal-ci.sh`). Không thay đổi code ứng dụng, schema DB hay chạy Git write/deploy.

### [2026-11-10] - Cập nhật hướng dẫn phát hành qua GitLab CI/CD

- Thay hướng dẫn copy source/build thủ công trên VM bằng quy trình chi tiết: branch trong worktree D:, kiểm tra local, stage/commit chọn lọc, push, review và merge MR vào `main`, kiểm thử staging, phê duyệt job production manual của cùng commit rồi smoke test production.
- Sửa tài liệu CI/CD theo Nginx upstream `staging-app:3000`, cập nhật trạng thái pipeline `3050411864` và đánh dấu runbook thủ công chỉ dùng cho khôi phục có phê duyệt. Không thay code/cấu hình, không chạy Git write, migration hoặc deploy trong lần cập nhật tài liệu này.

### [2026-11-10] - Sửa kết nối Nginx trong deploy staging

- Preflight Nginx trước đây chạy trên Docker bridge mặc định nên không phân giải được `app`; chuyển sang container tạm nối đồng thời production và staging network sau khi staging app đã healthy.
- Nginx production nối thêm staging network và chuyển upstream staging sang alias `staging-app:3000`; giữ cổng staging `13001` chỉ trên loopback của VM. Pipeline `3050392360` đã verify/deploy staging thành công; HTTPS staging và production cùng trả 200, production manual không được kích hoạt.

### [2026-11-10] - Sửa quyền private key tạm trong job deploy staging

- Runner shell đã nhận job staging sau khi các biến File và SSH host key được cấu hình; OpenSSH từ chối file private key do mode `0664`.
- Job deploy đặt quyền `0600` cho `VM_DEPLOY_SSH_KEY` trước khi kết nối. Cần xác minh lại bằng pipeline mới; chưa xác nhận staging hoạt động và chưa chạy production.
- Pipeline tiếp theo thất bại ở TypeScript verify do `scripts/sync-local-data.ts` import Prisma Client từ package mặc định dù client được sinh ra ở đường dẫn riêng. Bỏ đối tượng Prisma không dùng trong script ghi JSON; cần xác minh lại trên GitLab.

### [2026-11-06] - Khởi tạo lại production trên volume PostgreSQL mới

- Sau khi người dùng xóa volume production, tạo volume `aura-talent_pgdata` mới; giữ nguyên backup production trước đó và xác nhận archive đọc được bằng `pg_restore --list`.
- Bỏ migration alias trùng `20261102_service_usage_assignment_payment` khỏi gói release; áp dụng thành công 11 migration canonical (baseline và các migration bổ sung), Prisma báo schema up to date.
- Rebuild app/migrate image và khởi động PostgreSQL, app, Nginx. App và PostgreSQL healthy; HTTPS `https://aura.com/` trả 200; trang đăng nhập được kiểm tra trong browser.
- Bootstrap tạo 1 system-admin account `admin`, đồng bộ 16 role và 1 role assignment; không tạo dữ liệu demo. Các bảng nhân sự, payroll records, lịch, task, work assignment, phép, KPI, doanh thu, chi phí và dịch vụ đều rỗng. Kỳ lương draft `2026-10` được tạo theo cơ chế tự tạo kỳ tháng trước đang có.
- Đợt preflight đầu phát hiện gói release thiếu `scripts/preflight-production.ts`; đã bổ sung script chỉ-đọc, rebuild và recreate app. Production preflight đạt (`systemAdmins=1`, `systemAdminProfiles=0`, `appliedMigrations=11`), Prisma up to date, app/PostgreSQL healthy và HTTPS 200.
- Browser sau reload hiển thị form đăng nhập; console ghi nhận 401 cho API bảo vệ khi chưa đăng nhập. Chưa thực hiện smoke test sau đăng nhập bằng credential admin; cần người quản trị kiểm tra các luồng nghiệp vụ.

### [2026-11-06] - Áp dụng migration đồng hồ tham chiếu lên DB local

- Sao lưu DB `aura_talent` trước khi thay đổi; chỉ áp dụng migration `20261105_continuous_reference_clock` trong transaction và đánh dấu migration này hoàn tất. Không chạy các migration pending khác do lịch sử DB/repo còn lệch.
- Thêm `app_settings.referenceClockAnchorAt` kiểu `TIMESTAMP(3)` nullable, không default; backfill cấu hình ngày tham chiếu hiện có (1 dòng).
- Xác minh cột, backfill và trạng thái migration qua PostgreSQL. Kiểm thử rollover bằng anchor thực đã lưu: ngày giả lập 10/01/2026 tiến sang 11/01/2026 sau 24 giờ; timezone/định dạng tests 4/4 đạt. Prisma CLI smoke test bằng Node bị chặn bởi `uv_os_get_passwd ... ENOMEM`; browser localhost không truy cập được, nên API/browser chưa được xác nhận.

### [2026-11-05] - Làm rõ thời gian và trạng thái phạt của công tác

- Thẻ công tác hiển thị rõ thời gian bắt đầu và kết thúc theo múi giờ Việt Nam.
- Tách định mức phạt khỏi kết quả từng người; bỏ khoản ước tính khi đã hoàn thành, đang chờ xét hoặc đã ghi nhận khoản phạt thực tế.
- Áp dụng cả dashboard Idol: khi Idol hoàn thành, ẩn cả định mức phạt chung khỏi thẻ cá nhân; quản lý vẫn thấy quy tắc chung để đối chiếu.
- Không đổi API, database hoặc quy tắc tính/phê duyệt phạt. Verification: lint, build và 14/14 focused tests đạt; trên `localhost:3001`/DB clone, DOM xác nhận đủ 4 khoảng thời gian, không còn “Dự kiến”, không lặp khoản phạt thực tế; reload và điều hướng lại không phát sinh lỗi console/page. Unit test xác nhận định mức bị ẩn với Idol đã hoàn thành và vẫn hiển thị cho quản lý.

### [2026-11-05] - Ẩn nút hủy công tác sau khi hết hạn

- Ẩn nút “Hủy công tác” khi đồng hồ hệ thống đạt hoặc vượt `endAt`; component tự cập nhật theo thời điểm kết thúc, chu kỳ 30 giây và khi tab hiển thị lại.
- Giữ nguyên API/phân quyền hủy; bổ sung unit tests cho ranh giới thời gian và endAt thiếu/không hợp lệ.
- Verification: lint đạt; focused tests 7/7 đạt; production build đạt (còn cảnh báo chunk index >500 kB vốn có). Trên browser `localhost:3001`/DB clone, công tác có `endAt` 20/01/2026 12:00 được kiểm tra lúc 20/01/2026 23:07 và nút hủy không còn trong accessibility tree; Playwright reload/điều hướng không ghi nhận console/page errors.

### [2026-11-05] - Reset đồng hồ theo thời điểm lưu ngày mốc

- Khi người dùng chạm điều khiển ngày/mốc rồi lưu, xóa giờ tham chiếu cũ và tạo anchor mới theo thời gian server; vẫn reset khi ngày cuối cùng trùng ngày đã lưu. Chỉ lưu thương hiệu mà không chạm điều khiển ngày thì không reset.
- Request có cờ điều khiển tạm thời, không thay đổi schema; các lần cập nhật cấu hình khác không reset anchor. Database chưa có cột anchor vẫn nhận giờ HH:mm hiện tại theo múi giờ Việt Nam để tương thích.
- Verification: lint và production build đạt; test định dạng ngày 3/3 đạt. Trên browser/DB clone, chạm lựa chọn ngày rồi lưu thành công, xóa `referenceTime` và tạo anchor mới; lưu lần nữa không chạm ngày thì anchor không đổi. Lệnh test tổng thể chạy nhầm trên DATABASE_URL mặc định local `aura_talent` và một số test DB lỗi do thiếu migration; audit read-only các loại bản ghi có tiền tố/dấu nhận diện test trả về 0 bản ghi còn sót. Full suite chưa được xác nhận đạt.

### [2026-11-05] - Tách lệnh chạy với DB kiểm thử

- Thêm `pnpm run dev:test` nạp `.env.test.local` trước khi import server, chạy trên cổng 3001; không thay đổi `.env` local-dev.
- Cập nhật README; file env riêng nằm trong quy tắc Git ignore và không được ghi vào tài liệu/commit.
- Verification: lint đạt; `.env.test.local` được Git ignore; server task VS Code đang chạy ở cổng 3001; browser khôi phục phiên và tải dữ liệu admin (24 tài khoản, 10 đơn vị). Cấu hình test hướng tới clone `aura_talent_clock_test_20261105`; `.env` local-dev không đổi. Chưa browser-test dashboard cá nhân do automation không chuyển được menu; người dùng có thể tiếp tục thủ công. Không chạy migration/seed.

### [2026-11-05] - Hiển thị ngày và giờ trên dashboard

- Dashboard cá nhân theo vai trò và dashboard Idol hiển thị ngày–giờ theo đồng hồ tham chiếu `Asia/Ho_Chi_Minh`; cập nhật định kỳ 30 giây và khi tab hiện lại.
- Thêm formatter có múi giờ rõ ràng và test xác nhận đúng ngày/giờ Việt Nam; không tác động DB/API hay ngày nghiệp vụ.
- Verification: `pnpm.cmd run lint`, test `dateFormatting.test.ts` (3/3) và `pnpm.cmd run build` đạt; build còn cảnh báo chunk index trên 500 kB. Browser chưa xác minh được vì server 3001 đang dừng (`ERR_CONNECTION_REFUSED`) và không tự khởi động với `.env` hiện trỏ DB local-dev `aura_talent`, thay vì DB clone kiểm thử.

### [2026-11-05] - Làm rõ ngày mốc và ngày hiệu lực trong cài đặt

- Phần cài đặt đồng hồ tham chiếu phân biệt ngày mốc bắt đầu với ngày hệ thống hiện tại đã lưu; ngày mốc mới chưa lưu được ghi chú là bản nháp.
- Không thay đổi cách tính đồng hồ, API, schema hoặc dữ liệu.
- Verification: lint (`tsc --noEmit`) và build đạt; test đồng hồ mục tiêu đạt 5/5. DOM trên `localhost:3001` hiển thị ngày mốc `12/01/2026` và ngày hiệu lực đã lưu `13/01/2026`; reload giữ phiên và console/page errors không ghi nhận lỗi. Full suite chưa đạt do nhóm test PostgreSQL kết nối DB cấu hình `aura_talent` thiếu cột migration đồng hồ; kiểm tra read-only sau test không thấy bản ghi nhân sự còn sót từ các test có tiền tố nhận diện.

### [2026-11-05] - Đồng hồ ngày tham chiếu chạy liên tục qua nửa đêm

- Ngày tham chiếu tùy chọn được tính như thời điểm bắt đầu của đồng hồ giả lập; giờ tiếp tục chạy theo thời gian thực và ngày tự tăng qua 00:00 theo `Asia/Ho_Chi_Minh`.
- Lưu mốc neo trong `app_settings` một lần khi cấu hình ngày/giờ thay đổi; không ghi DB định kỳ hoặc mỗi ngày. Migration backfill mốc cho cấu hình tham chiếu hiện có.
- Giữ khả năng chạy với schema cũ trong giai đoạn trước khi migration được áp dụng bằng fallback thời gian tương thích.
- Xác minh: lint, Prisma schema validation, production build và 9/9 focused tests đều đạt. Tạo clone `aura_talent_clock_test_20261105` từ DB local; áp dụng migration đồng hồ riêng trên clone, backfill 1 cấu hình, xác nhận role `aura_user` đọc được cột mới và API GET/PUT/GET lưu-đọc lại ngày `2026-01-10`, giờ `23:59` cùng anchor. Browser tại `http://localhost:3001/` tải danh sách nhân sự.
- Giữ test DB và dev server cổng 3001 cho người dùng kiểm tra thủ công. Đã quan sát giao diện đổi từ 10/01/2026 sang 11/01/2026 sau mốc giả lập 23:59; backend đọc anchor từ clone cũng tính ra 2026-01-11 00:12 giờ Việt Nam. Server/DB local gốc ở cổng 3000 / `aura_talent` không bị thay đổi. Không chạy `migrate deploy` toàn bộ vì lịch sử migration của clone kế thừa trạng thái lệch; chỉ migration mới được áp dụng và đánh dấu trong clone. Browser console chưa được kiểm tra riêng.

### [2026-11-05] - Chỉ tải dữ liệu sau khi khôi phục phiên đăng nhập

- Chặn `loadAllData()` khi quá trình xác thực chưa hoàn tất hoặc không có người dùng hiện tại, tránh gửi các GET được bảo vệ khi mở app mà chưa có access token.
- Giữ nguyên luồng refresh token, đăng nhập, phân quyền và tải dữ liệu sau xác thực; không đổi API hoặc schema/database.
- Kiểm tra: lint và build đạt; 8 test JWT/authorization đạt. Full test suite thất bại do checkout không có `DATABASE_URL` cho các test Prisma; browser test authenticated success chưa xác minh vì checkout không có backend/database test.

### [2026-11-05] - Triển khai bản sửa ngày kỳ lương lên production

- Commit `5d80cdc30d4af7e2666ee177a1d0b72b46b212fb` đã được build và restart theo Docker Compose trên VM production.
- Xác minh container app/PostgreSQL healthy, không có migration chờ và HTTPS trả HTTP 200; không gọi API payroll để tránh phát sinh kỳ lương mới ngoài dự kiến.

### [2026-11-04] - Sửa lỗi Prisma khi tự tạo kỳ lương tháng trước

- Khi chưa tồn tại kỳ lương của tháng liền trước, API tự tạo kỳ như trước nhưng chuyển các mốc lịch `YYYY-MM-DD` thành `Date` tại 00:00 UTC trước khi ghi vào Prisma `DateTime @db.Date`.
- Giữ nguyên quy tắc chọn kỳ, dữ liệu kỳ lương đã tồn tại và định dạng ngày ISO date-only trong phản hồi API; không thay schema hoặc migration.
- Thêm unit test cho chuyển đổi ngày hợp lệ và từ chối ngày sai định dạng/không hợp lệ.
- Kiểm thử API trên database không có nhân sự/kỳ lương và database có tài khoản/kỳ cũ nhưng thiếu kỳ tháng trước: HTTP 200, các mốc lịch đúng; gọi lặp không tạo kỳ trùng và kỳ cũ vẫn được giữ.
- Xác minh: lint đạt; 118/118 test đạt trên DB clone từ backup local-dev; production build đạt. API smoke test đạt cho DB không có nhân sự/kỳ lương và DB có dữ liệu nhưng thiếu kỳ; gọi lặp không tạo trùng. Các DB kiểm thử đã được xóa sau test, DB local dev không bị thay đổi.

### [2026-11-04] - Không điền sẵn thông tin đăng nhập production

- Form đăng nhập chỉ điền tài khoản mẫu trong development; production bắt đầu với cả tài khoản và mật khẩu để trống.
- Xác minh: lint, Prisma validation, 116/116 unit tests, Docker production build, app container healthy, HTTPS 200; browser xác nhận username/password đều rỗng.
- Trước khi app khởi động, xử lý thứ tự phụ thuộc của các migration chưa áp dụng (tạo bảng trước, mở rộng sau); lần migration lỗi đã rollback, backup PostgreSQL đã được kiểm tra, toàn bộ 10 migrations hiện đã áp dụng.

### [2026-11-04] - Tăng tương phản thẻ nhân sự được chọn trong Thiết đặt KPI

- Bổ sung ánh xạ màu nền tối cho biến thể gradient `from-rose-50/90`, giúp màu nền thẻ đang chọn đồng bộ với chế độ tối và dễ đọc hơn.

### [2026-11-04] - Tìm kiếm trong bộ chọn Idol và nhóm

- Thêm component chọn có tìm kiếm, hỗ trợ bàn phím và lọc không phân biệt dấu.
- Áp dụng tại bộ chọn Idol trong quản lý nhiệm vụ/lịch làm việc và bộ chọn nhóm/cá nhân trong cấu hình KPI; các lựa chọn ngắn vẫn giữ nguyên.

### [2026-11-03] - Hiển thị ngày giờ hệ thống trên timeline giao việc

- Khối thông tin hệ thống trên trang giao việc hiển thị cả ngày và giờ theo mốc thời gian hệ thống đã cấu hình.
- Dashboard Idol cũng hiển thị cùng mốc ngày giờ hệ thống trong banner tổng quan.

### [2026-11-03] - Minh bạch mức phạt và phản hồi trước hạn giao việc

- Hiển thị mức phạt cấu hình trên thẻ công việc trước khi người thực hiện xác nhận, gồm số tiền cố định hoặc phần trăm lương hợp đồng và số tiền dự kiến khi đủ dữ liệu.
- Trước hạn phản hồi nhận việc, người được giao có thể gửi `Phản hồi` để xin đổi người hoặc thông báo không tham gia; yêu cầu hợp lệ không tự phát sinh phạt.
- Sau hạn, luồng dùng nút `Giải trình`; sau khi gửi, nút được khóa và hiển thị `Đã gửi phản hồi · Chờ xử lý`.
- Đổi nhãn `Hạn chấp nhận` thành `Hạn phản hồi nhận việc` và cho phép người giao việc/Manager có quyền quản lý xử lý phản hồi ở server.
- Sửa số tiền phạt dự kiến theo từng người được assign: phần trăm lương hợp đồng không còn lấy nhầm lương của tài khoản quản lý; màn hình quản lý hiển thị số dự kiến riêng cho từng người.
- Tải danh sách tài khoản cho người có quyền quản lý giao việc để dropdown `Ủy quyền phê duyệt` có thể chọn người được ủy quyền, không chỉ giới hạn ở Super Admin.
- Đổi nhãn mức phạt thành `Mức phạt khi vi phạm` và bổ sung ghi chú chỉ phát sinh phạt sau khi có vi phạm được xác nhận.

### [2026-11-02] - Hiển thị trạng thái sau khi gửi giải trình

- Sau khi người được giao gửi giải trình/xin miễn giảm phạt, nút gửi được thay bằng trạng thái “Đã gửi giải trình · Chờ xử lý”.
- Backend từ chối yêu cầu gửi trùng khi giải trình trước đó vẫn đang chờ quản lý xử lý.
- Block KPI trên dashboard cá nhân được giữ ở phía trên block giao việc theo cấu trúc hiện tại.

### [2026-11-02] - Mở rộng xử lý giải trình giao việc

- Thay các nút xử lý riêng lẻ bằng một luồng action gồm “Tham gia” hoặc “Không tham gia”.
- Nhánh “Không tham gia” hỗ trợ không phạt, phạt đủ định mức và phạt theo tỷ lệ phần trăm định mức cấu hình.
- Lưu quyết định, tỷ lệ áp dụng, số tiền phạt thực tế và lý do phản hồi; người thực hiện xem được kết quả sau khi quản lý xử lý.
- Đã áp dụng migration `20261102_work_assignment_waiver_decisions` cho hai trường quyết định và tỷ lệ phạt.

### [2026-11-02] - Tách khu vực thao tác giao việc

- Đưa các nút xác nhận nhận việc, từ chối và đánh dấu hoàn thành xuống footer riêng của thẻ công việc.
- Tăng độ nổi bật của nút hoàn thành và tách khỏi phần dữ liệu mô tả/kết quả.

### [2026-11-02] - Sửa kiểm tra số tiền thanh toán

- Điều chỉnh ô nhập số tiền trong modal thanh toán từ bước 1.000 đồng về bước 1 đồng, tránh lỗi trình duyệt khi số tiền mặc định là 20.000.000 đồng.
- Vẫn giới hạn số tiền lớn hơn 0 và không vượt quá số dư còn phải thanh toán.

### [2026-11-02] - Chuẩn hoá modal dịch vụ ngoài

- Thay hộp thoại native khi xác nhận thanh toán bằng modal trong giao diện, hiển thị mã đơn, số tiền còn lại và ô nhập số tiền có kiểm tra hợp lệ.
- Thay hộp thoại native khi huỷ lượt sử dụng dịch vụ bằng modal trong giao diện, bắt buộc nhập lý do và vẫn giữ lịch sử để kiểm toán.
- Không thay đổi API, quy tắc tính doanh thu hoặc dữ liệu thanh toán.

### [2026-11-02] - Hồ sơ năng lực hệ thống

- Rà soát và ghi nhận các chức năng, nghiệp vụ, API, model dữ liệu, nguyên tắc bảo vệ và giới hạn hiện tại trong [docs/system-capabilities.md](../system-capabilities.md).
- Bổ sung quy trình bắt buộc cập nhật hồ sơ năng lực sau mỗi lần sửa code hoặc thêm tính năng.

### [2026-11-02] - Đồng bộ mốc ngày cho giao công tác

- Đồng bộ các kiểm tra quá hạn, chấp nhận, hoàn thành, đổi người thực hiện và ủy quyền theo `referenceDate`.
- Dashboard truyền mốc ngày cấu hình vào panel giao công tác để khóa/mở nút hoàn thành nhất quán.
- Dashboard ẩn nút xác nhận nhận việc khi hạn chấp nhận đã qua và hiển thị trạng thái quá hạn.
- Hiển thị nút gửi giải trình/xin miễn giảm phạt hoặc kết quả xử lý tương ứng cho người được giao.
- Chi tiết: [reference-date-work-assignment](./2026-11-02-reference-date-work-assignment.md).

### [2026-11-02] - Phase 1: Giao công tác / công việc cho nhân sự

- Bổ sung quyền `manage_work_assignments` cho System Admin, Giám đốc, Trưởng phòng QL Idol và Trưởng nhóm.
- Thêm mô hình PostgreSQL, API và giao diện giao công việc/công tác cho nhân sự và Idol.
- Hỗ trợ phân biệt công việc bắt buộc và không bắt buộc; từ chối công việc không bắt buộc bắt buộc ghi lý do.
- Bổ sung danh sách công việc trên dashboard, nút xác nhận/hoàn thành và thông báo có liên kết về dashboard.
- Phase này chưa tính hệ số lương, giờ công, ngày nghỉ bù hoặc mức phạt; các phần này thuộc phase tiếp theo.
- Đã kiểm tra lint, build và 93/93 tests; browser đã kiểm tra dashboard admin, modal giao việc và dashboard Idol.

### [2026-11-01] - Tự động tính TNCN khi điều chỉnh thưởng KPI

- Form điều chỉnh phiếu lương cập nhật ngay TNCN theo tổng thu nhập chịu thuế, bao gồm thưởng KPI.
- Backend PostgreSQL và legacy store đều tự tính lại TNCN, không sử dụng giá trị thuế do client gửi lên.
- Bảo hiểm vẫn tính theo lương hợp đồng; công thức TNCN hiện tại vẫn áp dụng ngưỡng và tỷ lệ đang cấu hình.
- Đã kiểm tra bằng lint, 91/91 tests, build và Problems không phát hiện lỗi; browser/VM verification chưa thực hiện.

### [2026-11-01] - Chuẩn hóa số liệu cơ cấu tổ chức

- Thẻ tổng quan và thẻ phòng ban lấy số liệu từ hồ sơ nhân sự, không lấy `users.length` để tránh tính tài khoản hệ thống và tài khoản thử nghiệm.
- Tách đúng cán bộ (`isIdol: false`) và Idol (`isIdol: true`), loại người đã nghỉ việc và khách dịch vụ khỏi cơ cấu hiện tại.
- Tránh cộng trùng một người có cả tài khoản đăng nhập và hồ sơ nhân sự.
- Chỉ đếm nhóm đang tồn tại trong danh sách đơn vị.
- Đã kiểm tra bằng lint, 90/90 tests, build và Problems không phát hiện lỗi; browser verification đang chờ trang được share.

### [2026-11-01] - Cải thiện giao diện cơ cấu phòng ban và nhóm

- Thay hàng nhập trực tiếp bằng một nút `Thêm Phòng ban / Nhóm` mở form tập trung.
- Form mới phân biệt rõ phòng ban cấp 1 và nhóm trực thuộc, đồng thời tự giữ quan hệ phòng ban cha.
- Đồng nhất luồng thêm nhóm khi đang xem chi tiết phòng ban.
- Bỏ nền gradient ở phần đầu thẻ phòng ban để cơ cấu dễ đọc hơn ở chế độ sáng và tối.
- Đã kiểm tra bằng lint, 90/90 tests, build và Problems không phát hiện lỗi; browser verification đang chờ trang được share.

### [2026-11-01] - Accessible role permission header colors

- Replaced the selected-role permission header gradient with a flat, theme-aware surface.
- Added explicit light/dark text, border, badge, and action-button colors to preserve readability in both themes.
- No permission behavior or data flow changed.
- Type-check verified with `pnpm.cmd run lint`; browser verification remains pending because no browser page is currently shared.

### [2026-11-01] - Immutable root admin and consistent System Admin role mapping

- Made the `admin` username an immutable root account: full permissions are restored server-side and it cannot be demoted or deleted.
- Kept `system_admin` as a grantable role for other accounts; non-root System Admin accounts can be demoted.
- Normalized account mapping so every `accountType=system_admin` account is visible in the System Admin role group, including personnel-linked accounts.
- Locked System Admin permission toggles in the role editor and added regression coverage for promotion, demotion, and role visibility.
- Verified with lint, 90/90 tests, and production build; browser verification remains pending for this change.

### [2026-11-01] - Phase 3 dashboard theo persona

- Điều chỉnh tiêu đề và mô tả khu vực trọng tâm theo từng nhóm: System Admin, Ban Giám đốc, Quản lý Idol, Trưởng nhóm, Thương mại, Nội dung, Livestream và Nhân sự vận hành.
- Bổ sung quick action riêng cho từng nhóm; các action chỉ hiển thị khi tài khoản có `allowedTabs` tương ứng.
- Giữ nguyên phạm vi dữ liệu hiện có, không thêm số liệu giả, API tổng hợp hoặc migration mới.
- Đã kiểm tra local với tài khoản HR và Trưởng phòng QL & Phát triển Idol, lint, 88/88 tests và build; chưa đồng bộ VM production.

### [2026-11-01] - Phase 2 dashboard HR & Kế toán

- Bổ sung bộ lọc công việc `Tất cả / Nhân sự / Kế toán` trong khu vực trọng tâm của dashboard HR & Kế toán.
- Phân loại cảnh báo hồ sơ, đơn nghỉ phép, lịch sau ngày nghỉ việc, kỳ lương và tranh chấp bảng lương theo nhóm nghiệp vụ.
- Các mục có thể điều hướng đến phân hệ tương ứng theo quyền tài khoản; người không có quyền không thấy hoặc không thể mở dữ liệu đó.
- Đã kiểm tra local bằng DOM/accessibility snapshot, thao tác chuyển tab và điều hướng từ tranh chấp bảng lương; chưa đồng bộ VM production.

### [2026-11-01] - Phase 1 dashboard HR & Kế toán

- Tách nội dung dashboard HR & Kế toán khỏi các chỉ số chung không phù hợp: nhân sự đang hoạt động, hồ sơ mới vào tháng, hồ sơ chờ duyệt, đơn nghỉ phép chờ xử lý và cảnh báo dữ liệu.
- Bổ sung thông tin kỳ lương hiện tại theo dữ liệu payroll đã có và số tranh chấp bảng lương đang mở khi tài khoản được cấp quyền payroll.
- Quick action và nội dung trọng tâm được lọc theo quyền hiện tại; không tạo dữ liệu giả hoặc thêm API tổng hợp mới.
- Đã kiểm tra dashboard HR trên local bằng DOM/accessibility snapshot; chưa đồng bộ VM production.

### [2026-10-31] - Đồng nhất giao diện form tạo nhân sự

- Loại bỏ gradient và các mảng nền màu riêng trong form tạo nhân sự; chuyển các section về nền trung tính theo theme.
- Giữ màu nhấn cho trạng thái đang chọn, nhãn nghiệp vụ và các trạng thái cảnh báo.
- Đã kiểm tra local ở light/dark mode, lint, 88/88 tests và build thành công; chưa đồng bộ VM production.

### [2026-10-31] - Phóng to ảnh hồ sơ trong modal chi tiết

- Tăng ảnh đại diện trong modal chi tiết và bổ sung preview toàn màn hình khi click.
- Preview hỗ trợ nút đóng, click nền và phím Escape.
- Đã kiểm tra local, lint, 86/86 tests và build thành công; chưa đồng bộ VM production.

### [2026-10-31] - Cải thiện tương phản lịch trong dashboard Idol

- Bổ sung màu light/dark cho section lịch livestream, card lịch, badge thời gian và nhiệm vụ cá nhân.
- Đã kiểm tra local bằng dashboard Idol, lint, 86/86 tests và build thành công.
- Chưa đồng bộ lên VM production.

### [2026-10-31] - Cải thiện khả năng đọc dashboard cá nhân ở light/dark mode

- Chuẩn hóa màu nền, màu chữ, viền, trạng thái và hover cho dashboard cá nhân theo cả hai chế độ sáng/tối.
- Đồng bộ Tailwind `dark:` với class `.dark` của ứng dụng để theme hệ điều hành không làm sai màu light mode.
- Đã kiểm tra local browser và chạy lint, 86/86 tests, build thành công; chưa đồng bộ VM production.

### [2026-10-31] - Squashed Prisma migration and clean Docker bootstrap

- Hợp nhất schema production thành một baseline migration duy nhất, lưu lịch sử cũ trong `prisma/migrations-archive/`.
- Docker entrypoint tự chạy migration, đồng bộ RBAC và bootstrap admin có điều kiện database rỗng.
- Đã triển khai sạch trên VM production: 16 role, 1 admin, 0 personnel/payroll, ba container healthy và HTTPS trả HTTP 200.

### [2026-10-30] - Database Storage Optimization Stages 4–9

- Bổ sung index theo access pattern cho personnel, payroll, approval/leave, KPI, lookup, revenue và expense; xác minh bằng `EXPLAIN (ANALYZE, BUFFERS)`.
- Tách seed demo tài chính khỏi các API GET và thêm script `seed:demo-finance`.
- Chuyển timestamp thực sang `timestamptz`, diễn giải dữ liệu cũ theo `Asia/Bangkok`; giữ nguyên các trường ngày-only ở kiểu `date`.
- Thêm request ID `x-request-id` và bảng `audit_logs` cho các mutation API.
- Bảo toàn lịch sử tài chính: xóa doanh thu/chi phí là `cancelled`, revenue relation dùng `RESTRICT`, personnel có payroll/revenue không thể hard-delete.
- Regression cuối đạt 26/26 tests, lint, build, Prisma migration status và browser smoke. Cảnh báo bundle lớn hiện hữu không thay đổi.

### [2026-10-29] - Stage 11A: Thiết Kế JWT Và Kiểm Kê Authentication

- Hoàn tất kiểm kê authentication hiện tại: plaintext password, `x-user-id`, localStorage user state và các route chưa có middleware chung.
- Chốt hướng thiết kế access JWT trong memory, refresh token HttpOnly cookie, session server-side và rotation.
- Ghi nhận route matrix hiện tại/đích đến, CSRF/CORS/HTTPS assumptions và phạm vi chưa triển khai.
- Chưa thay đổi source code, schema, dependency hoặc database migration. Chi tiết tại [`docs/security/jwt-design.md`](../security/jwt-design.md).

### [2026-10-29] - Stage 11B: Password Hash Và Auth Session Foundation

- Thêm password utility dùng Node `crypto.scrypt`, salt ngẫu nhiên và so sánh constant-time.
- Hash 19 password hiện hữu trong PostgreSQL; user mapper không còn trả password về frontend.
- Thêm model/migration `auth_sessions`, migration đã áp dụng thành công.
- Production không chấp nhận password khởi tạo rỗng để rơi về fallback mặc định.
- Unit test đạt 8/8, type-check và build đạt; Prisma Client regeneration còn chờ dừng process Node đang khóa query engine.

### [2026-10-29] - Stage 11C: Backend JWT Authentication

- Thêm HS256 access JWT, claim validation, environment-based configuration và production enforcement.
- Thêm refresh token HttpOnly cookie, rotation, revoke và session lookup qua `auth_sessions`.
- Thêm `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/me`; login trả access token nhưng không trả password.
- Browser verification đạt: login `200`, refresh `200` với token mới, invalid token `401`, logout `200`.
- Frontend API interceptor, reload recovery và hoàn thiện action-level route matrix để Stage 11D.

### [2026-10-29] - Stage 11D: Frontend Auth Migration

- Thêm `apiFetch` wrapper để gắn Bearer token, gửi refresh cookie và retry một lần sau `401`.
- Khôi phục session khi reload qua refresh cookie và `/api/auth/me`; logout gọi backend revoke.
- Loại bỏ `x-user-id` khỏi frontend, bao gồm các API personnel columns.
- Chuẩn hóa các fetch trực tiếp của Revenue qua auth wrapper.
- Browser verification đạt: login, reload giữ session, UI tiếp tục tải dữ liệu và không còn `x-user-id` trong `src`.

### [2026-10-29] - Stage 11E: Authorization Enforcement & Production Smoke Test

- Thêm [server/auth/authorization.ts](../../server/auth/authorization.ts) làm route policy tập trung cho `allowedActions` và Super Admin.
- Bảo vệ các mutation của personnel, criteria, scores, tasks, schedules, payroll, KPI, revenue, finance và approval theo action tương ứng.
- Khóa API tài khoản, reset và cấu hình nhạy cảm bằng Super Admin.
- Production smoke test: thiếu Bearer token `401`, giả mạo bằng `x-user-id` `401`, login và `/auth/me` `200`, mutation hợp lệ đi qua kiểm tra quyền.
- Unit test đạt 12/12; lint và build đạt. `uv_os_get_passwd ENOMEM` chỉ xảy ra khi chạy `tsx` trực tiếp trong agent runtime; chạy qua `test/tsx-preload.cjs` hoạt động bình thường.
- Điều chỉnh frontend chỉ tải danh sách tài khoản khi user là Super Admin; luồng user thường không còn lỗi khởi động do `GET /api/users` trả `403`. Gửi approval vẫn dành cho user đã đăng nhập; chỉ approve/reject/delete yêu cầu `manage_approvals`.
- Hardening approval API: từ chối payload thiếu dữ liệu và lấy `requestedBy`/`reviewer` từ user đã xác thực thay vì tin body tùy ý.

### [2026-10-28] - Đồng Bộ Toàn Bộ Mốc Thời Gian Hệ Thống Theo Cấu Hình, Xóa Triệt Để Unsplash & Hoàn Thiện Quy Trình Phê Duyệt Nhân Sự

#### 1. Đồng Bộ Toàn Bộ Thời Gian Hệ Thống Theo Mốc Thiết Đặt (`referenceDate`):
- **Vấn đề**: Khi thiết lập mốc ngày hệ thống (ví dụ `31/10/2025`), thẻ phê duyệt và các bản ghi trong hệ thống vẫn hiển thị năm 2026 do backend Prisma dùng `@default(now())` và `new Date()` từ đồng hồ máy chủ.
- **Giải pháp**:
  - Xây dựng hàm trợ giúp trung tâm `getEffectiveSystemDate()` trong [`server/db/pgStore.ts`](file:///d:/DATA/Project/aura-talent-management/server/db/pgStore.ts): đọc giá trị `referenceDate` từ `AppSetting`. Nếu có mốc cấu hình, ngày tháng năm sẽ lấy theo mốc thiết đặt kết hợp với giờ, phút, giây hiện tại; chỉ khi chọn lựa chọn mặc định mới lấy theo thời gian thực của máy chủ.
  - Áp dụng `getEffectiveSystemDate()` cho tất cả các thao tác:
    - Tạo yêu cầu phê duyệt (`createApproval`: gán `createdAt`)
    - Phê duyệt / từ chối yêu cầu (`approveApproval`, `rejectApproval`: gán `reviewedAt`)
    - Tạo và duyệt đơn nghỉ phép (`createLeaveRequest`, `updateLeaveRequest`: gán `createdAt`, `startDate`, `endDate`, `reviewedAt`)
    - Tạo nhiệm vụ nhân sự (`createTask`: gán `createdAt`)
    - Tạo hồ sơ nhân sự / Idol mới (`createIdol`: gán `joinDate` theo mốc hệ thống nếu để trống)
  - Nâng cấp `getSystemNow` trong [`src/utils/dateUtils.ts`](file:///d:/DATA/Project/aura-talent-management/src/utils/dateUtils.ts) để kết hợp mốc ngày cấu hình với giờ phút giây hiện tại.
  - Bổ sung `referenceDate` prop cho [`IdolDashboardView.tsx`](file:///d:/DATA/Project/aura-talent-management/src/views/IdolDashboardView.tsx) để mặc định ngày xin nghỉ phép theo đúng mốc thời gian hệ thống.
  - Đồng bộ lại các bản ghi phê duyệt mang năm 2026 về đúng mốc `2025-10-31`.

#### 2. Xóa Sạch 100% Đường Dẫn Unsplash Khỏi Toàn Bộ Mã Nguồn, Dữ Liệu & DB Dump:
- **Phạm vi xử lý**:
  - **Frontend Views & Components**: Thay thế toàn bộ fallback ảnh Unsplash bằng `DEFAULT_BLANK_AVATAR` (SVG silhouette trung tính chuẩn) tại:
    - [`RevenueManagementView.tsx`](file:///d:/DATA/Project/aura-talent-management/src/views/RevenueManagementView.tsx)
    - [`IdolDashboardView.tsx`](file:///d:/DATA/Project/aura-talent-management/src/views/IdolDashboardView.tsx)
    - [`AdminPortalView.tsx`](file:///d:/DATA/Project/aura-talent-management/src/views/AdminPortalView.tsx)
    - [`Navbar.tsx`](file:///d:/DATA/Project/aura-talent-management/src/components/Navbar.tsx)
    - [`RoleBasedPermissionManager.tsx`](file:///d:/DATA/Project/aura-talent-management/src/components/RoleBasedPermissionManager.tsx)
    - [`UserProfileModal.tsx`](file:///d:/DATA/Project/aura-talent-management/src/components/UserProfileModal.tsx)
    - [`RolePermissionModal.tsx`](file:///d:/DATA/Project/aura-talent-management/src/components/RolePermissionModal.tsx)
    - [`App.tsx`](file:///d:/DATA/Project/aura-talent-management/src/App.tsx)
  - **Mock Data & Store**: [`server/data/defaultData.ts`](file:///d:/DATA/Project/aura-talent-management/server/data/defaultData.ts), [`server/data/store.ts`](file:///d:/DATA/Project/aura-talent-management/server/data/store.ts), [`server/data/db.json.bak`](file:///d:/DATA/Project/aura-talent-management/server/data/db.json.bak).
  - **File Backup SQL Dump**: Quét và thay thế toàn bộ liên kết Unsplash trong [`aura_talent_dump.sql`](file:///d:/DATA/Project/aura-talent-management/aura_talent_dump.sql).
  - **Cơ sở dữ liệu PostgreSQL Live**: Cập nhật toàn bộ các trường `avatarUrl` trong bảng `personnel`, `users` và trường `data` trong `approval_requests` có chứa `unsplash.com` thành `DEFAULT_BLANK_AVATAR`.
  - Kiểm tra xác nhận bằng `ripgrep`: Còn chính xác **0** liên kết Unsplash trong toàn bộ thư mục dự án.

#### 3. Khắc Phục Lỗi Hộp Thoại Duyệt Nhân Sự Bị Đứng Im & Bất Đồng Bộ Trạng Thái Danh Sách:
- **Nguyên nhân**:
  - Endpoint `/api/approvals/:id/approve` trong [`server.ts`](file:///d:/DATA/Project/aura-talent-management/server.ts) nuốt ngoại lệ và chỉ trả về `{ error: 'Không thể duyệt yêu cầu' }`.
  - Hàm `approveRequest` trong [`src/services/api.ts`](file:///d:/DATA/Project/aura-talent-management/src/services/api.ts) không đọc error body mà ném lỗi chung chung, khiến modal không thể hiển thị lý do thực tế.
  - Khi có lỗi, `handleConfirmApprovalModal` không đóng hộp thoại, dẫn đến hiện tượng modal đứng im.
  - Khi nhân sự được đề xuất thêm mới, bản ghi `personnel` đã được tạo sẵn ở trạng thái `Chờ duyệt`. Ở phiên bản cũ, hệ thống cố tạo mới thay vì cập nhật trạng thái bản ghi sẵn có, gây lỗi ràng buộc duy nhất và khiến thẻ thì "Đã Duyệt" nhưng ngoài danh sách vẫn là "Chờ duyệt".
- **Xử lý**:
  - `server.ts` log chi tiết lỗi và trả về đúng `err.message`.
  - `src/services/api.ts` parse và ném đúng thông điệp lỗi từ server.
  - `pgStore.ts` `approveApproval` đối soát chính xác `targetPersonnelId` hoặc `realName`/`stageName`, cập nhật trạng thái `personnel.status = 'Đang hoạt động'` và `userAccount.status = 'Đang hoạt động'`, trả về đối tượng `createdIdol` hoàn chỉnh.
  - `App.tsx` `handleApproveRequest` cập nhật đồng thời cả state `idols` và state `users`.
  - Đã kích hoạt trạng thái `Đang hoạt động` cho Hồng Phước (ID: 20) và mọi nhân sự có yêu cầu đã duyệt trong cơ sở dữ liệu.

---

### [2026-10-28] - Khắc Phục Lỗi Phê Duyệt Nhân Sự, Tinh Gọn Modal & Liên Kết Dữ Liệu Role Vận Hành

#### 1. Khắc Phục Lỗi Giám Đốc Đã Duyệt Nhưng Nhân Sự Vẫn Ở Trạng Thái Chờ Duyệt (Pending):
- **Nguyên nhân**:
  - Khi HR gửi yêu cầu phê duyệt thêm nhân sự từ `IdolModal.tsx`, payload truyền khóa `targetPersonnelId`. Trong khi đó, `createApproval` trên server chỉ đọc khóa `payload.targetIdolId`, khiến `targetPersonnelId` trong bảng `approvalRequest` bị lưu thành `null`.
  - Trong `approveApproval`, do `targetPersonnelId` bằng `null` và không có fallback lấy `approval.data.id`, nhánh cập nhật nhân sự sẵn có (`updateIdol`) bị bỏ qua, hệ thống rơi vào nhánh `createIdol` để tạo mới. Tuy nhiên, nhân sự đã có `userId` (quan hệ `@unique` trong bảng `personnel`), khiến Prisma ném lỗi xung đột khóa ngoại.
  - Ngoài ra, trạng thái `approved` được cập nhật vào bảng phê duyệt trước khi xử lý nhân sự, dẫn đến việc thẻ phê duyệt hiển thị "Đã Duyệt" nhưng bản ghi nhân sự vẫn "Chờ duyệt".
- **Xử lý**:
  - Chuẩn hóa `createApproval` trong `pgStore.ts` hỗ trợ cả `targetPersonnelId` và `targetIdolId`.
  - Cải tiến `approveApproval` tự động fallback lấy `approval.data.id` hoặc đối soát `realName`/`stageName` nếu `targetPersonnelId` bị thiếu; tự động chuyển trạng thái nhân sự thành `Đang hoạt động`, kích hoạt tài khoản `userAccount` và cập nhật lại `targetPersonnelId` vào bảng `approvalRequest`.
  - Cập nhật hàm `handleApproveRequest` trong `App.tsx` kiểm tra nếu nhân sự đã có trong danh sách thì thay thế bản ghi cập nhật thay vì nối mảng trùng lặp.
  - Đồng bộ lại trạng thái `Đang hoạt động` cho nhân sự Ms Three (ID: 18) trong PostgreSQL.

#### 2. Tinh Gọn Modal Thêm Nhân Sự (`IdolModal.tsx`):
- **Ẩn khối Trạng thái nhân sự thừa khi HR tạo mới**: Loại bỏ hoàn toàn khung hiển thị "Tự động gán: Chờ duyệt" khỏi form thêm mới nhân sự của HR để tiết kiệm diện tích giao diện. Chỉ hiển thị bộ chọn trạng thái khi chỉnh sửa (`isEdit`) hoặc khi Quản Trị Viên (`isSuperAdmin`) thao tác.
- **Thông Báo In-App Toast Khi Gửi Duyệt**: Khi HR bấm Thêm, modal đóng lại và hệ thống hiển thị thông báo Toast nổi bật: *"Đã gửi đề xuất thêm nhân sự [Tên]. Hồ sơ đang chờ Giám Đốc phê duyệt để kích hoạt!"*.

#### 3. Liên Kết Dữ Liệu Phòng Ban Vận Hành ➔ Role Cán Bộ Vận Hành:
- Bổ sung bảng ánh xạ `DEPARTMENT_STAFF_ROLES_MAP` và hàm helper `getRolesForDepartment` trong `src/types/roles.ts`.
- Dropdown *"Gán Role Cán Bộ Vận Hành"* chỉ hiển thị các chức danh tương ứng với phòng ban vận hành đang chọn (HR & Kế Toán, Quản Lý Idol, Nội Dung & Sản Xuất, Vận Hành Livestream, Kinh Doanh, Marketing, Ban Giám Đốc).
- Tự động gán (Auto-select) Role chính của phòng ban ngay khi người dùng chuyển đổi đơn vị công tác, ngăn ngừa chọn nhầm vai trò chéo phòng ban.

#### 4. Chuẩn Hóa Avatar Trống Mặc Định (`DEFAULT_BLANK_AVATAR`):
- Loại bỏ hoàn toàn việc gán cứng link ảnh mẫu người thật từ Unsplash khi tạo tài khoản không tải ảnh đại diện.
- Tích hợp chuẩn `DEFAULT_BLANK_AVATAR` (SVG silhouette trung tính, nền xám nhạt nhẹ nhàng) làm ảnh đại diện mặc định cho mọi tài khoản mới.
- Cập nhật lại ảnh đại diện của Ms Three trong cơ sở dữ liệu về chuẩn avatar trống mặc định.

---

### [2026-10-28] - Khắc Phục Lỗi Dữ Liệu & Bổ Sung Biểu Đồ Tăng Trưởng Tài Chính (Financial Charts & Trends)

#### 1. Khắc phục triệt để lỗi Toast JSON & Hiển thị 0 đ:
- **Nguyên nhân**:
  - Lỗi toast `Unexpected token '<', "<!doctype "... is not valid JSON` xuất phát từ tiến trình server cũ chạy lâu dài mà chưa tải các route Express mới `/api/finance/pnl-summary`, khiến request lọt vào Vite SPA fallback trả về `index.html`.
  - Các chỉ số KPI hiển thị `0 đ` do view tài chính hardcode mốc năm 2026 trong khi cơ sở dữ liệu hệ thống (doanh thu, bảng lương, chi phí) vận hành trên mốc chuẩn `2025-10` (`AppSettings.referenceDate = '2025-10-31'`).
- **Xử lý**:
  - Cập nhật script `"dev": "tsx watch server.ts"` trong `package.json` giúp server tự động hot-reload khi thay đổi backend routes.
  - Tự động đồng bộ mốc thời gian xem tài chính theo `referenceDate` hệ thống (`2025-10`) với đầy đủ dropdown chọn năm (2026, 2025, 2024, 2023, 2022).
  - Tăng cường kiểm tra `Content-Type: application/json` tại các phương thức gọi API (`getCompanyExpenses`, `getFinancePnLSummary`, `getFinanceTrendSeries`) trong `src/services/api.ts` nhằm chặn triệt để lỗi parse HTML thành JSON.
  - Bổ sung `'finance'` và `'revenue'` vào danh sách `validTabs` trong `App.tsx`.

#### 2. Tích Hợp Biểu Đồ & Phân Tích Xu Hướng Tăng Trưởng (Charts & Growth Trends):
- **API Mới `GET /api/finance/trend-series`**:
  - Trích xuất chuỗi thời gian 6 kỳ liên tiếp (`periodRef` và `count`), tự động tổng hợp Doanh thu thuần, Tổng chi phí, Lợi nhuận gộp và Lợi nhuận ròng từng kỳ.
  - Tính toán tự động các chỉ số tăng trưởng định lượng:
    - `% Tăng trưởng Doanh thu thuần (Revenue Growth MoM)`.
    - `% Tăng trưởng Tổng chi phí (Expenses Growth MoM)`.
    - `% Tăng trưởng Lợi nhuận ròng (Net Profit Growth MoM)`.
    - `Chênh lệch Biên lợi nhuận ròng (Net Margin Diff %)`.
- **Giao Diện Tab Mới "Biểu Đồ & Xu Hướng Tăng Trưởng" (`FinanceManagementView.tsx`)**:
  - **4 Thẻ Tổng Hợp Tăng Trưởng**: Hiển thị trực quan tốc độ tăng/giảm theo tháng kèm icon xu hướng và cảnh báo ngân sách.
  - **Biểu Đồ Cột Đa Chỉ Số (Multi-metric Bar Chart)**: Trực quan hóa tương quan Doanh thu vs Chi phí vs Lợi nhuận qua 6 tháng liên tiếp, tích hợp hover tooltip hiển thị số liệu chi tiết và biên lợi nhuận.
  - **Đường Xu Hướng (Area/Line Trend Chart)**: Đồ thị diện tích SVG mượt mà thể hiện quỹ đạo vận động của dòng tiền và lợi nhuận ròng.
  - **Bảng Đối Soát Định Kỳ (Period-over-Period Table)**: Bảng số liệu chi tiết đối soát từng tháng với phân loại màu sắc lãi/lỗ rõ ràng.
  - **Huy Hiệu Tăng Trưởng Trên KPI Cards**: Cả 3 thẻ KPI hàng đầu (Doanh thu thuần, Tổng chi phí thực tế, Lợi nhuận ròng) đều hiển thị % tăng giảm so với tháng trước.

---

### [2026-10-28] - Tái Thiết Toàn Diện Hệ Thống Tài Chính & Lợi Nhuận (Finance Hub & P&L System)

#### 1. Mô Hình Tài Chính Chuyên Nghiệp Theo Chuẩn Agency OS:
- **Tách biệt rõ ràng Tiền Pay Thực Nhận vs Chi Phí Nhân Sự Thực Tế Công Ty**:
  - Tiền pay thực tế cho nhân sự (Net Take-home): Thu nhập sau khi trừ thuế TNCN, phạt vi phạm, tạm ứng và bảo hiểm phần người lao động tự đóng (10.5%: BHXH 8%, BHYT 1.5%, BHTN 1%).
  - Chi phí thực tế công ty phải gánh: Luôn cao hơn số tiền pay cho nhân sự vì công ty đóng thêm 21.5% bảo hiểm bắt buộc (BHXH 17.5%, BHYT 3%, BHTN 1%) cho nhân sự hợp đồng chính thức `Công ty`, cộng thuế TNCN nộp thay.
  - Tích hợp trường `companyInsurance` và `companyLaborCost` vào CSDL PostgreSQL (`PayrollRecord`).
- **Quản lý danh mục Chi Phí Toàn Diện (`CompanyExpense`)**:
  - `travel_per_diem`: Chi phí công tác, di chuyển, taxi, công tác phí idol dự sự kiện/gặp nhãn hàng.
  - `equipment_purchase`: Mua sắm trang thiết bị, linh phụ kiện livestream (tai nghe, mic Shure, đèn Nanlite, webcam Sony).
  - `repair_maintenance`: Sửa chữa, bảo trì máy tính gaming, soundcard, thay thế phụ kiện phòng studio.
  - `capex_investment`: Chi phí đầu tư tài sản cố định (dàn PC livestream cấu hình cao, camera studio 4K, tiêu âm cách âm studio).
  - `facility_rental`: Chi phí mặt bằng thuê (văn phòng chính, studio livestream) hoặc mặt bằng cố định thuộc sở hữu, tiền điện 3 pha, đường truyền internet cáp quang FTTH chuyên dụng.
  - `dynamic_event`: Chi phí động phát sinh theo chiến dịch (quảng cáo TikTok Ads đẩy traffic mega live, tiếp khách, tổ chức workshop/fan meeting).
  - `general_other`: Các chi phí văn phòng phẩm, tiếp khách, phần mềm và chi phí quản lý khác.
- **Báo cáo Tài Chính & P&L 4 Phạm Vi Thời Gian (Scope)**:
  - Hỗ trợ xem báo cáo theo: Tháng, Quý, Năm và Toàn thời gian (Lũy kế).
  - Phân tích chi tiết P&L: Doanh thu thuần ➔ Giá vốn (COGS - Thù lao chia sẻ Idol) ➔ Lợi nhuận gộp & Biên Gross ➔ Chi phí hoạt động (OpEx: Nhân sự văn phòng + BH 21.5% + Mặt bằng + Đầu tư + Vận hành + Sự kiện động) ➔ Lợi nhuận trước thuế (EBIT) ➔ Thuế TNDN tạm tính (20%) ➔ Lợi nhuận ròng (Net Profit) & Biên Net %.

#### 2. Giao Diện & Trải Nghiệm Người Dùng Mới:
- **`FinanceManagementView.tsx`**: Trung tâm điều hành tài chính cao cấp với 5 KPI Cards điều hành, bảng P&L chuẩn mực, biểu đồ cơ cấu chi phí, bộ lọc chi phí động & modal tạo/sửa phiếu chi đầy đủ chứng từ (VAT, hóa đơn, ủy nhiệm chi, hình thức tiền mặt/chuyển khoản).
- **`PayrollManagementView.tsx`**:
  - Bổ sung Banner Đối Soát Tài Chính: So sánh trực quan giữa Tổng tiền chuyển khoản Net, Bảo hiểm 21.5% C.Ty gánh, và Tổng chi phí nhân sự thực tế công ty phải trả.
  - Bổ sung cột "Chi Phí C.Ty" trên bảng lương tháng hiển thị rõ tiền Cty gánh thêm cùng tooltip bảo hiểm 21.5%.
- **`PayslipModal.tsx`**: Bổ sung khối "🏢 Chi Phí Nhân Sự Thực Tế Của Công Ty (Company Actual Cost)" giải trình minh bạch sự chênh lệch giữa tiền Net chuyển khoản và tổng chi thực tế của công ty.
- **Navigation (`Navbar.tsx` & `App.tsx`)**: Bổ sung tab `finance` (Tài Chính & Lợi Nhuận) vào thanh điều hướng, phân quyền chặt chẽ cho Super Admin, Ban Giám Đốc và Bộ phận Kế Toán.

---

### [2026-10-28] - Tinh Gọn Form Thêm Nhân Sự & Chuẩn Hóa Trạng Thái Nhân Sự Ngoài / Chờ Duyệt

#### 1. Biểu mẫu Thêm Nhân Sự (`IdolModal.tsx`):
- **Đưa Loại nhân sự lên trên đầu**: Chuyển cụm chọn 5 loại nhân sự (`Công ty`, `Cộng tác viên`, `Thực tập sinh`, `Dịch vụ ngoài`) lên vị trí ngay sau thông tin cơ bản.
- **Ẩn khối phân loại Idol chuyên biệt khi chọn Dịch vụ ngoài**: Khi chọn `Dịch vụ ngoài` (khách thuê studio, quay/chụp lookbook...), toàn bộ khối phân loại đối tượng nội bộ (ảnh 2: Là Idol/Cán bộ, 3 nhóm Idol Gaming/PK/Commerce, cấu hình giỏ hàng, phòng ban nội bộ và cấp role hệ thống) được ẩn hoàn toàn. Thay vào đó chỉ hiển thị ô nhập ghi chú gói dịch vụ khách thuê.
- **Ẩn tạo tài khoản nội bộ**: Không yêu cầu tạo email/username công ty cho khách dịch vụ ngoài.
- **Ẩn chọn trạng thái cho Dịch vụ ngoài**: Khách thuê dịch vụ không quản lý trạng thái công tác như nhân viên công ty.

#### 2. Luồng Trạng Thái & Phê Duyệt Của HR:
- **Tự động gán Chờ duyệt (Pending)**: Khi HR thêm mới nhân sự, giao diện hiển thị chú thích ngắn gọn: `Tự động gán: Chờ duyệt (Giám Đốc phê duyệt sẽ tự động chuyển thành 'Đang hoạt động')`.
- **Hiển thị ngay cho HR trong danh sách**: Bản ghi nhân sự được lưu vào hệ thống với trạng thái `Chờ duyệt` kèm theo yêu cầu phê duyệt gửi đến Ban Giám Đốc. HR có thể nhìn thấy ngay nhân sự vừa tạo trên bảng danh sách với huy hiệu `⏳ Chờ duyệt`.
- **Cho phép Hủy đề xuất (Cancel)**: Trên dòng nhân sự có trạng thái `Chờ duyệt`, HR có nút hủy đề xuất (`XCircle`) để hủy ngay lập tức mà không cần tạo yêu cầu xóa phức tạp.
- **Kích hoạt tự động khi phê duyệt**: Khi Ban Giám Đốc phê duyệt yêu cầu, trạng thái nhân sự được chuyển tự động thành `Đang hoạt động`.

#### 5. Loại Bỏ Giả Định Nhị Phân "Khối Vận Hành" & Xóa Toàn Bộ Hardcode Mẫu:
- **Bảng danh sách (`IdolListView.tsx`)**:
  - Huy hiệu dưới Nghệ danh: Gán nhãn trung tính `🏷️ Dịch Vụ Ngoài` cho nhân sự dịch vụ ngoài, không còn tự động gán `💼 Khối Vận Hành`.
  - Cột Phòng ban: Định dạng nhãn `🏷️ Khách dịch vụ ngoài` màu vàng cam, không còn hiển thị icon tòa nhà công ty `🏢`.
  - Cột Chiều cao & Cân nặng: Hiển thị giá trị thực tế nếu có nhập (`height > 0` và `weight > 0`), không còn bị ẩn thành dấu gạch ngang `-`.
  - Bộ đếm & Bộ lọc Khối (`blockCounts`): Tách riêng khách dịch vụ ngoài, không còn cộng dồn họ vào tab "🏢 Khối Vận Hành".
- **Hàm nhận diện phòng ban (`roles.ts`)**:
  - `isStaffDepartment`: Loại trừ rõ ràng các đơn vị dịch vụ ngoài/khách ngoài, chỉ tính đúng các phòng ban vận hành chính thức của công ty.
- **Biểu mẫu Thêm/Sửa (`IdolModal.tsx`)**:
  - Xóa bỏ toàn bộ hardcode: `role: ''`, `hometown: ''`, `currentLiving: ''`.
  - Ô nhập Chiều cao/Cân nặng hiển thị đúng giá trị người dùng nhập (`value={formData.height ?? ''}`), không ép cứng `168/48` hay tự gán fallback `165/50` khi lưu.
#### 6. Chuẩn Hóa Tiêu Đề Hồ Sơ, Thâm Niên & Hiển Thị Chi Tiết (`IdolDetailModal.tsx`, `IdolListView.tsx`, `IdolModal.tsx`):
- **Tiêu đề Modal Chi Tiết Động**:
  - Dịch vụ ngoài: `Hồ Sơ Khách Thuê Dịch Vụ Ngoài`.
  - Streamer Gaming: `Hồ Sơ Streamer & Idol Gaming` (không dùng chung "Nghệ Sĩ").
  - Nghệ sĩ Biểu diễn / PK: `Hồ Sơ Idol & Nghệ Sĩ Biểu Diễn`.
  - Live Commerce: `Hồ Sơ Idol & Host Live Commerce`.
  - Idol/Talent chung: `Hồ Sơ Idol & Talent`.
  - Cán bộ quản lý: `Hồ Sơ Cán Bộ Quản Lý` (chỉ áp dụng cho Ban Giám Đốc).
  - Nhân viên văn phòng: `Hồ Sơ Nhân Viên Công Ty` (thay vì gán bừa "Cán Bộ & Quản Lý").
- **Bỏ Tính Thâm Niên Cho Dịch Vụ Ngoài**:
  - `IdolListView.tsx`: Cột Thâm niên hiển thị dấu gạch `-` đối với nhân sự Dịch vụ ngoài.
  - `IdolModal.tsx`: Ẩn huy hiệu thâm niên, đổi nhãn "Thời điểm vào" thành "Ngày đăng ký dịch vụ" đối với Dịch vụ ngoài.
  - `IdolDetailModal.tsx`: Ẩn thẻ "Thâm niên công tác", đổi nhãn ngày vào thành "Ngày đăng ký dịch vụ:".
- **Làm Sạch Khối Định Hướng Thương Mại**: Chỉ hiển thị khối khi có cấu hình dữ liệu thực tế (`hasCommercialData`), loại bỏ các dòng xám giả định "Chưa cấu hình".
- **Ẩn Lịch Ca Live & Nhiệm Vụ Cho Đối Tượng Không Phù Hợp**:
  - Ẩn toàn bộ khối "Lịch Live Stream & Ca Làm Việc" và nút footer "Lịch Làm Việc" đối với nhân viên công ty (`isIdol === false`) và khách dịch vụ ngoài.
  - Ẩn khối "Nhiệm vụ" đối với khách dịch vụ ngoài.
### [2026-11-02] - Đồng bộ bộ đếm trạng thái giao việc

- Dashboard cá nhân tính “Chưa xong/Đã xong” theo trạng thái của người đang xem.
- Dashboard quản lý tính công việc đã xong khi tất cả người được giao đã hoàn thành hoặc đã được xử lý kết thúc do không tham gia.
- Không còn hiển thị công việc là “Chưa xong” khi từng người đã hoàn tất.

### [2026-11-02] - Sắp xếp lại dashboard cá nhân

- Đưa block tổng quan KPI, tài chính và quỹ nghỉ phép lên trước block giao việc chi tiết.

### [2026-11-02] - Hoàn tất công việc sau khi xác nhận xử phạt

- Người không tham gia nhưng đã được quản lý xác nhận phạt/miễn/giảm phạt không còn bị tính vào “Chưa xong”.
- Yêu cầu giải trình đang `under_review` vẫn tiếp tục chờ xử lý.

## 2026-10-30

- Hoàn tất Stage 3 của kế hoạch đa hoạt động Idol.
- Thêm API danh mục hoạt động và trả activity profiles khi đọc hồ sơ Idol.
- Form thêm/sửa Idol hỗ trợ chọn nhiều hoạt động, vẫn bắt buộc duy nhất một hoạt động chính.
- Verification: browser API/UI, lint, 12/12 unit tests, build và prisma migrate status đều đạt.
- Hoàn tất Stage 4: operational KPI loại hồ sơ không thuộc phạm vi KPI bằng trạng thái “Không áp dụng” và điểm 0; hồ sơ Idol công ty có activity assignment vẫn được tính bình thường.
- Browser API verification đã kiểm tra hồ sơ vận hành và hồ sơ Idol; lint, 12/12 unit tests và build đều đạt.
- Hoàn tất Stage 5: thêm liên kết activity cho task/ca live, API kiểm tra activity phải thuộc đúng hồ sơ, và bổ sung lựa chọn activity trong form giao nhiệm vụ/thiết lập ca đơn/lịch định kỳ. Đã xác minh lưu/xoá qua browser với JWT, gồm lịch định kỳ tạo nhiều ngày; lint, 12/12 unit tests, build và migrate status đều đạt.
- Hoàn tất Stage 6: chuẩn hoá helper xác định đối tượng KPI Idol, loại khách dịch vụ ngoài/nhân viên không phải Idol/Ban Giám Đốc/Idol chưa có activity khỏi KPI cá nhân, đồng thời giữ nguyên doanh thu các giao dịch đó trong P&L công ty. Đã thêm unit tests và xác minh API browser; 16/16 tests, lint và build đều đạt.
- Stage 7 đang triển khai: thêm liên kết tùy chọn KPI-setting ↔ activity, migration/FK/index, API validation theo hồ sơ/nhóm và lựa chọn activity trong form KPI. Phần tính điểm theo target/trọng số riêng từng activity và browser verification sau re-login còn tiếp tục.

## 2026-10-29

- Replaced mocked operational KPI values in the idol dashboard with a backend aggregation API.
- Added `operational_metrics` storage for monthly engagement and gift-point actuals.
- KPI targets now resolve from active KPI settings; GMV uses verified or payroll-synced revenue transactions.
- Added Prisma schema, migration SQL, API client methods, and dashboard loading/error handling.
- Verification: `pnpm.cmd run lint`, `pnpm.cmd run build`, and `pnpm.cmd exec prisma generate` passed. The database migration was not applied automatically.

## 2026-10-29

- Improved schedule calendar visibility by showing the reference month, current week date range, and exact dates/scope for recurring, monthly, and specific-date shifts in both schedule views.

## 2026-10-29

- Synchronized all payroll records linked to personnel ID `7` from the old seed identity to the current Hoàng Minh Khang / Khang visual profile.
- Synchronized payroll identity, bank snapshot, salary base, earnings, deductions, company cost, and affected period totals.
- Updated personal payslip lookup to resolve personnel ownership from the account ID on the server; a client-supplied `idolId` no longer overrides the account relationship.
- Verification: `pnpm.cmd exec prisma migrate deploy`, `pnpm.cmd run lint`, and `pnpm.cmd run build` passed.

## 2026-10-29

- Removed the company actual labor cost explanation block from the personal payslip modal.
- Kept payroll calculations, payroll data, and Finance reporting unchanged.
- Verification: type-check and production build passed; browser preview was opened, but backend interaction remained blocked by the existing Node `uv_os_get_passwd ENOMEM` runtime error.

## 2026-10-29

- Moved roster column-title customization into a dedicated Admin tab, `Hiển Thị Danh Sách`.
- Renamed the general configuration tab to `Thiết Lập Hệ Thống` and separated its save action from column-title persistence.
- Verification: `pnpm.cmd run lint` and `pnpm.cmd run build` passed.

## 2026-10-29

- Completed dynamic personnel-column rollout Stages 0-10: schema/migrations, metadata CRUD, personnel form/profile/roster rendering, sensitivity filtering, API/browser verification, tests, and documentation handoff.
- Added `PersonnelColumn.sensitivity` with `public`, `internal`, and `sensitive` values. Sensitive-field enforcement remains dependent on the current `x-user-id` identity mechanism until JWT/RBAC rollout.

## 2026-10-29

- Top-level `Nghệ Sĩ`, `Vận Hành`, and `Tài Chính` menus now open automatically on hover while retaining click toggling for touch devices.

## 2026-10-29

- Removed the hover gap between navigation buttons and dropdown panels so menus stay open while the pointer moves into the panel.

## 2026-10-29

- Moved the primary `Tạo Phiếu Chi Mới` action from the P&L dashboard header into the `Quản Lý Chi Phí Doanh Nghiệp` tab, aligning the action with its transaction workflow.

## 2026-10-29

- Fixed refresh navigation for Finance, Revenue, Payroll, and KPI pages so a stored active tab is not incorrectly reset to the personnel roster by the generic permission guard.

## 2026-10-29

- Fixed the new live-shift modal so its header stays visible and the form body scrolls within the viewport.
- Added multi-select personnel support when creating a new shift; the same schedule is saved for every selected person.

## 2026-10-29

- Added automatic schedule ordering by weekday, start time, end time, and title in both weekly matrix and per-person views.
- Schedule ordering is presentation-only; stored records and manual data entry order are unchanged.

## 2026-10-29

- Clarified personnel identity on weekly matrix cards by showing stage name, real name, and department for every schedule.

## 2026-10-29

- Fixed personnel commercial-detail inputs so spaces and commas remain editable while typing.
- Comma-separated values are normalized only when the personnel record is saved, preserving the intended list format without interrupting text entry.

## 2026-10-29

- Hoàn tất Stage 1 và Stage 2 của kế hoạch đa hoạt động Idol: Prisma Client đã regenerate, danh mục hoạt động được seed và dữ liệu legacy `idolCategory` được migrate sang quan hệ chuẩn hóa.
- Migration `20261030_seed_personnel_activity_profiles` tạo 5 loại hoạt động, 16 quan hệ cho 11 hồ sơ Idol đủ điều kiện; không có hồ sơ có nhiều hoạt động chính.
- Verification: `prisma migrate status`, lint, 12/12 unit tests và build đạt; Stage 3 đang triển khai.

## 2026-10-29

- Đã triển khai một phần Stage 1 của kế hoạch đa hoạt động Idol: thêm bảng `personnel_activity_types`, `personnel_activities` và ràng buộc một hoạt động chính trên mỗi hồ sơ.
- Migration `20261029_add_personnel_activity_profiles` đã áp dụng thành công; chưa migrate dữ liệu `idolCategory` cũ.
- `prisma validate`, lint, 12/12 unit tests, build và `prisma migrate status` đạt. Prisma Client regenerate còn chờ do query engine bị tiến trình Node khóa trên Windows; Stage 2 chưa bắt đầu.

## 2026-10-29

- Hoàn tất Stage 0 của kế hoạch đa hoạt động Idol và KPI theo hoạt động.
- Chốt phạm vi KPI Idol: chỉ áp dụng cho Idol thuộc công ty, có nhóm/hoạt động KPI và không thuộc Ban Giám đốc.
- Khách dịch vụ ngoài vẫn ghi nhận doanh thu/P&L nhưng không thuộc KPI hoặc thưởng KPI cá nhân.
- Ghi nhận impact hiện trạng: hồ sơ chỉ có một `idolCategory`, KPI dashboard cố định 4 chỉ số, trọng số chưa được áp dụng, và cấu hình kỳ KPI có nguy cơ rơi vào fallback.
- Tạo [PLAN_PERSONNEL_ACTIVITY_KPI.md](../../PLAN_PERSONNEL_ACTIVITY_KPI.md) làm tài liệu triển khai theo stage.
- Verification Stage 0: `pnpm.cmd run lint`, `pnpm.cmd test` (12/12), `pnpm.cmd run build` đều đạt; build còn cảnh báo bundle lớn hiện hữu.

### [2026-10-30] - Personnel Activity/KPI Stage 7: Activity-aware KPI Settings

- Added optional `kpi_settings.activityTypeId` with index and `ON DELETE SET NULL` relation to `personnel_activity_types`.
- Added API/form support for selecting an activity and server-side ownership validation for individual/group assignments.
- Operational KPI resolves activity-specific targets and weights using primary activity precedence, then secondary activities, with generic individual/group fallback.
- Monthly KPI settings are compatible with concrete `YYYY-MM` aggregation periods; concrete-period settings take precedence when present.
- Verification: authenticated browser API create/delete and secondary-activity KPI application passed; reload had no new console/page errors; lint, 16/16 tests, build, and Prisma migration status passed.

### [2026-10-30] - Personnel Activity/KPI Stage 8: Dynamic Idol KPI Dashboard

- Added dynamic KPI item output while preserving the legacy operational KPI metric contract.
- Updated the Idol dashboard to render configured KPI labels, linked activities, actuals, targets, and weights instead of a fixed four-metric description.
- External-service customers continue to show no personal KPI items and `Không áp dụng`.
- Verification: browser JWT/API and Idol Aria dashboard checks passed; reload had no console/page errors; lint, 16/16 tests, build, and Prisma migration status passed.

### [2026-10-30] - Personnel Activity/KPI Stage 9: Activity-aware KPI Administration

- Added activity filtering and activity labels to KPI administration.
- Added per-activity weight summaries with a warning when the total is not 100%.
- Added backend validation for scope, target, weight, activity ownership, and duplicate active configurations.
- Verification: admin browser filter/accessibility and duplicate-configuration API rejection passed; lint, 16/16 tests, and build passed. No new migration was required.

### [2026-10-30] - Personnel Activity/KPI Stage 10: Revenue, P&L and Payroll Reconciliation

- External-service transactions now force personal payout/share values to zero while retaining net revenue as company profit.
- Revenue-to-payroll synchronization ignores external-service customers and does not mark their transactions as payroll-synced.
- P&L classifies external-service revenue from personnel classification and supports current booking/live-commerce category codes.
- Finance P&L explicitly labels external-service revenue as company revenue excluded from personal KPI/payroll.
- Verification: temporary browser/API transaction, P&L and payroll-sync checks passed; lint, 16/16 tests, build, and Prisma migration status passed.

### [2026-10-30] - Personnel Activity/KPI Stages 11–12: Regression and Acceptance Closure

- Verified backward compatibility for legacy personnel activity fields and KPI `metrics` output.
- Added unit coverage for external-service revenue classification; total suite is now 18/18.
- Verified API integration, unauthorized mutation rejection, Prisma migration status, and browser acceptance across seven primary application tabs.
- Updated the implementation plan and project state; no new migration was required.

### [2026-10-30] - Bundle Optimization Stages 0–1: View Code Splitting

- Added [PLAN_BUNDLE_OPTIMIZATION.md](../../PLAN_BUNDLE_OPTIMIZATION.md) with the staged optimization plan and baseline.
- Replaced static imports for 11 large application views with `React.lazy` dynamic imports and a shared `Suspense` loading state in `src/App.tsx`.
- Reduced the entry chunk from 1,668.39 kB minified / 339.58 kB gzip to 712.57 kB minified / 182.01 kB gzip; view chunks are now emitted separately.
- Verification: lint passed, unit tests passed 18/18, build passed, and browser reload acceptance passed for roster, schedule, tasks, KPI, finance, revenue, payroll, and admin. The remaining >500 kB warning is tracked for later modal/dependency chunk stages.

### [2026-10-30] - Bundle Optimization Stage 2: Modal Code Splitting

- Converted the five large modal components in `src/App.tsx` to conditional `React.lazy` imports.
- Modal chunks are not requested on initial roster load and are requested when the corresponding modal is opened.
- Reduced the entry chunk from 712.57 kB minified / 182.01 kB gzip to 531.44 kB minified / 151.40 kB gzip.
- Verification: lint passed, unit tests passed 18/18, build passed, static diagnostics reported no errors, and browser interaction confirmed the Add Personnel modal chunk loads on demand with no alert or runtime error.

### [2026-10-30] - Bundle Optimization Stage 3: Chunk Strategy Review

- Inspected Vite 8/Rolldown `output.codeSplitting` and measured generic vendor and `lucide-react` grouping alternatives.
- Rejected generic vendor grouping because it produced a 425.65 kB React vendor and increased initial loading; icon grouping also did not improve total initial loading enough to justify the extra shared chunk.
- Kept automatic code splitting, with no deprecated `manualChunks` configuration and no warning suppression.
- Verification: final entry chunk is 531.44 kB minified / 151.40 kB gzip; lint, 18/18 unit tests, build, browser reload, and console smoke checks passed. Data-loading and render profiling remain the next optimization stages.

### [2026-10-30] - Bundle Optimization Stage 4: Tab-Scoped Data Loading

- Changed `src/App.tsx` to load roster/core datasets first and defer users, approvals, leave requests, and KPI datasets until their relevant modules are opened.
- Added per-session dataset caching so tab navigation does not refetch already loaded data; explicit refresh/reset/sync paths force reload.
- Browser roster reload measured 11 data endpoints instead of the previous 16, with no console or page errors.
- Final entry chunk is 532.52 kB minified / 151.71 kB gzip. Diagnostics, lint, 18/18 unit tests, build, and browser verification passed.

### [2026-10-30] - Bundle Optimization Stage 5: Render and State Profiling

- Memoized roster filtering and personnel-type fallback calculations.
- Indexed tasks by `idolId` and memoized per-person task statistics, removing repeated full-task scans during summary rendering.
- Browser roster/task smoke checks passed with no console or page errors; diagnostics, lint, 18/18 unit tests, and build passed.
- Entry bundle remains 532.52 kB minified / 151.70 kB gzip; final regression is tracked in Stage 6.

### [2026-10-30] - Bundle Optimization Stage 6: Regression Closure

- Workspace diagnostics, lint/typecheck, 18/18 unit tests, and production build passed.
- Browser smoke tests passed after reload for roster, schedule, tasks, KPI, finance, revenue, payroll, and admin with no console or page errors.
- Bundle optimization plan is complete. The entry chunk warning remains visible at 532.52 kB minified / 151.70 kB gzip and is not suppressed.

### [2026-10-30] - Database Storage Optimization Stage 0: Baseline and Backup

- Added `PLAN_DATABASE_STORAGE_OPTIMIZATION.md` with staged storage-hardening scope.
- Created a PostgreSQL custom-format backup and validated its archive catalog with `pg_restore --list`.
- Verified Prisma schema and migration status; database is up to date.
- Recorded baseline: 27 public tables, 64 indexes, 34 foreign keys, 27 primary keys, and 0 CHECK constraints.
- No application schema or business data was changed. Transaction/concurrency/constraint hardening begins in Stage 1 after explicit confirmation.

### [2026-10-30] - Database Storage Optimization Stage 1: Transaction Boundaries

- Added Prisma transaction boundaries for personnel creation/update, approval handling, resignation/payroll cascade, KPI group membership, and score batch writes.
- Refactored activity replacement and payroll total recalculation to use the active transaction client.
- Added rollback integration tests proving failed member/activity writes do not leave orphan groups, users, or personnel records.
- Verification passed: lint, 20/20 tests, production build, Prisma validation/migration status, browser reload/accessibility smoke, and console check. Stage 2 remains for concurrency/idempotency.

### [2026-10-30] - Database Storage Optimization Stage 2: Concurrency and Idempotency

- Replaced revenue/expense `count + 1` code allocation with PostgreSQL advisory locking and MAX-based next-number allocation inside transactions.
- Added the unique `score_records(personnelId, period)` index after duplicate-data validation.
- Added optimistic locking for personnel JSON/profile updates using `updatedAt`.
- Added concurrency and conflict tests; verification passed with migration deploy, Prisma generate/validate/status, lint, 22/22 tests, build, browser smoke, and console checks.

### [2026-10-30] - Database Storage Optimization Stage 3: Data Integrity Constraints

- Added PostgreSQL CHECK constraints for nonnegative amounts, valid rates/weights, `YYYY-MM` periods, resignation date ordering, and supported statuses/modes across core personnel, payroll, revenue, expense, KPI, score-supporting, and operational tables.
- Audited existing data before deployment; no violations were found, and the legacy revenue status `completed` remains supported.
- Added a negative integration test proving PostgreSQL rejects a negative personnel salary with SQLSTATE `23514`.
- Verification passed: migration deploy, Prisma validate/migration status, lint, 23/23 tests, production build, browser smoke, and console check. Stage 4 remains for index/query optimization.
# 2026-10-31 — Kiểm soát lịch và hồ sơ nhân sự nghỉ việc

- Áp dụng khoảng lịch `joinDate <= ngày lịch < resignedDate` khi nhân sự đã nghỉ.
- Cho phép lịch tương lai của nhân sự đang làm việc, chỉ chặn lịch trước ngày vào.
- Chỉ `system_admin` được xoá nhân sự trực tiếp.
- HR không còn thao tác xoá nhân sự.
- Khoá hồ sơ đã nghỉ ở UI và backend đối với tài khoản không phải `system_admin`.
- Chi tiết: [2026-10-31-personnel-resignation-controls.md](./2026-10-31-personnel-resignation-controls.md)

# HR personnel creation error (2026-10-31)

- Fixed misleading generic errors from `POST /api/idols`; server logs now include the request ID and the client receives the actionable validation message.
- Prevented reusing a username/email already linked to another personnel profile, avoiding a database relation conflict during account provisioning.
- Added a transaction regression test for linked-account reuse.
- Verification: `pnpm.cmd lint` passed and `pnpm.cmd test` passed with 87/87 tests. Local browser access for Kim Ngân was verified; no VM or production synchronization was performed.
- Change record: `docs/changes/2026-10-31-hr-personnel-create-error.md`.

### Pending personnel status constraint (2026-10-31)

- Fixed the PostgreSQL `personnel_status_check` mismatch that rejected HR-created records with status `Chờ duyệt`.
- Added migration `20261031_allow_pending_personnel_status` and a database-backed regression test.
- No production/VM migration was executed.
- Change record: `docs/changes/2026-10-31-pending-personnel-status.md`.

### [2026-11-01] - Chi tiết hóa cảnh báo hồ sơ trên dashboard HR

- Dashboard HR/Kế toán hiển thị danh sách từng hồ sơ thiếu trường bắt buộc hoặc có dữ liệu mâu thuẫn.
- Phân biệt rõ nhóm lỗi “Thiếu” và “Lệch”, kèm tên nhân sự, đơn vị và các trường cần kiểm tra.
- Giữ cảnh báo lịch còn hoạt động sau ngày nghỉ ở nhóm kiểm tra vận hành riêng, tránh đếm trùng hồ sơ.
- Verification: lint, 91/91 tests và production build passed; chưa đồng bộ VM.

### [2026-11-01] - Hiển thị thay đổi trước khi đóng phản ánh bảng lương

- Hộp thư phản ánh lưu thêm snapshot số liệu hệ thống đầy đủ hơn tại thời điểm gửi.
- Sau khi điều chỉnh, chi tiết ticket hiển thị các khoản thay đổi theo dạng trước → sau.
- Người xử lý có thể kiểm tra kết quả điều chỉnh trước khi xác nhận hoàn tất phản ánh.
- Verification: lint, diagnostics, 91/91 tests và production build passed; chưa kiểm tra browser vì không có trang được chia sẻ.

### [2026-11-01] - Thông báo cá nhân và cải thiện form nghỉ phép

- Thêm chuông thông báo trên thanh điều hướng, hiển thị số chưa đọc và lưu trạng thái đã đọc theo tài khoản.
- Thông báo điều hướng trực tiếp tới lịch, nhiệm vụ, dashboard nghỉ phép hoặc phản ánh bảng lương tương ứng.
- Ẩn nội dung “Tự động phê duyệt” khỏi form nghỉ phép; bổ sung màu tương phản tốt hơn cho các nhánh cần phê duyệt ở light/dark mode.
- Verification: lint, 91/91 tests và production build passed; chưa kiểm tra browser vì không có trang được chia sẻ.

### [2026-11-01] - Gửi nghỉ phép cho mọi nhân sự

- Dashboard dùng chung hiển thị nút “Gửi đơn nghỉ phép” cho mọi tài khoản đã liên kết hồ sơ nhân sự, không chỉ Idol.
- Form hỗ trợ loại nghỉ, khoảng ngày, lý do và phân bổ phép năm/nghỉ không lương theo cùng quy tắc hiện có.
- Verification: lint, 91/91 tests và production build passed; chưa kiểm tra browser vì không có trang được chia sẻ.

### [2026-11-01] - Thu gọn nút thêm đơn vị

- Thanh điều khiển cơ cấu đơn vị dùng bố cục co giãn; ô tìm kiếm giữ phần không gian chính.
- Nút thêm đơn vị/nhóm chỉ rộng theo nội dung và tự xuống hàng khi màn hình hẹp.
- Verification: lint, diagnostics và production build passed.

### [2026-11-02] - Bắt buộc xác nhận trước thao tác xóa

- Bổ sung hộp thoại Xác nhận/Hủy cho xóa loại nhân sự, trạng thái, tài khoản, yêu cầu nghỉ phép, lịch sử phê duyệt, nhiệm vụ và công việc nhỏ.
- Các luồng đã có modal riêng (tiêu chí, KPI, lịch đơn và xóa hàng loạt lịch) được giữ một lớp xác nhận duy nhất; thao tác ghi đè lịch cũng cảnh báo trước khi xóa lịch cũ.
- Bổ sung xác nhận cho các modal quản lý đơn vị và trạng thái dùng độc lập.
- Verification: `pnpm.cmd run lint`, `pnpm.cmd test -- --run` (91/91), `pnpm.cmd run build` passed; build vẫn có cảnh báo chunk hiện hữu >500 kB.

### [2026-11-02] - Khôi phục liên kết hồ sơ khi gửi nghỉ phép

- Server xác định hồ sơ nhân sự từ tài khoản đăng nhập thay vì tin vào `idolId` do client gửi lên.
- Dashboard có thêm fallback ghép theo `userId`, nên các tài khoản đã liên kết hồ sơ đều hiển thị form gửi nghỉ phép.
- Đã rà 21 hồ sơ: 19 hồ sơ có tài khoản liên kết; 2 hồ sơ Dịch vụ ngoài chưa có tài khoản nên không có dashboard cá nhân để hiển thị form.
- Verification: lint, 91/91 tests và production build passed; kiểm tra browser chỉ xác minh không gửi đơn nghỉ phép.

### [2026-11-02] - Đồng nhất hiển thị chức danh trong danh sách nhân sự

- Chuyển cột Chức Danh về font thường và màu chữ trung tính, đồng nhất với các ô dữ liệu khác ở cả giao diện sáng và tối.
- Verification: lint, diagnostics và kiểm tra DOM trên browser passed.

# 2026-11-02 — Work assignment acceptance, cancellation and delegated review

- Replaced the ambiguous work-assignment due-date behavior with a server-validated acceptance deadline.
- Added cancellation with reason, pre-start assignee editing, overdue violation recording, employee waiver requests, director/delegate review, and time-bounded delegation with early revoke.
- Applied `20261102_work_assignment_acceptance` directly to the PostgreSQL database because the local migration history is intentionally squashed/partial.
- Verification: TypeScript lint, 105/105 tests, production build, Prisma validation, migration execution, and browser accessibility/UI smoke passed. Build retains the existing large-chunk warning.

### [2026-11-02] - Waiver request visibility

- Managers can now see the employee's waiver reason, submission time, request status, and review actions directly in the work-assignment list.
### [2026-11-02] - Làm mới dữ liệu khi chuyển tài khoản

- Xóa các cờ dữ liệu đã tải khi đăng nhập/chuyển tài khoản hoặc đăng xuất, tránh giữ danh sách công tác của tài khoản trước.
### [2026-11-02] - Gắn phạt công tác vào đúng kỳ lương

- Phạt công tác được phân bổ theo ngày bắt đầu/ngày vi phạm, tránh một công tác kéo qua tháng bị tính lặp ở hai kỳ lương.
- Nếu công tác không có ngày bắt đầu, ngày xác nhận vi phạm được dùng làm ngày dự phòng.
### [2026-11-02] - Khóa phản ánh sau khi Giám đốc duyệt

- Hiển thị rõ kỳ lương theo tháng và trạng thái trong phiếu lương.
- Chỉ cho phép tạo phản ánh khi kỳ đã chốt công và đang chờ Giám đốc duyệt.
- Vô hiệu hóa phản ánh mới sau khi duyệt, chưa chốt công hoặc đã khóa/chi; API cũng kiểm tra cùng điều kiện.
### [2026-11-02] - Gộp bộ lọc khối nhân sự thành dropdown

- Thay ba nút lọc khối trên danh sách nhân sự bằng một dropdown duy nhất.
- Giữ nguyên các lựa chọn, số lượng hiển thị và logic lọc hiện có.
# 2026-11-02 - Lịch sử sử dụng dịch vụ ngoài

- Thêm bảng `service_usage_records` và migration lưu lịch sử từng lượt sử dụng dịch vụ của hồ sơ Dịch vụ ngoài.
- Thêm API và giao diện trong modal hồ sơ: danh sách, tổng giá trị, thêm/sửa, trạng thái, thông tin hợp đồng/hóa đơn và huỷ mềm có xác nhận.
- Giữ liên kết doanh thu ở dạng tuỳ chọn; không tự động đưa hồ sơ dịch vụ ngoài vào payroll/KPI.
- Verification: lint passed, 108/108 tests passed, build passed, Prisma migration status up to date.
- Bổ sung tab riêng “Lịch Sử Dịch Vụ Ngoài” với danh sách người sử dụng, bộ lọc và chi tiết từng lượt; hồ sơ chỉ giữ form nhập nhanh.
- Loại bỏ lựa chọn trạng thái thủ công trong form; trạng thái được tính từ thời gian bắt đầu/kết thúc, còn lượt đã huỷ vẫn giữ `cancelled`.
- Verification bổ sung: lint passed, 111/111 tests passed, build passed, browser smoke/accessibility tree xác nhận tab và form.

# 2026-11-02 - Configurable system date-time and locale-independent inputs

- Added `referenceTime` alongside the configured system reference date for business-time calculations.
- Added shared `DateTimeInput` and Vietnamese date-time parsing/formatting helpers; service and work-assignment forms no longer depend on browser `MM/DD/YYYY` rendering.
- Service usage status reads the effective configured system time when fetched.
- Verification: `pnpm.cmd run lint`, `pnpm.cmd test -- --run` (111/111), `pnpm.cmd run build`, Prisma migration deployment, and browser reload/accessibility verification passed. Prisma client regeneration initially reported a Windows file-lock `EPERM`, but the generated client remained usable after migration deployment.

# 2026-11-02 - External service assignment and payment workflow

- Added assignee, payment totals/status, cancellation audit fields, and `service_usage_payments`; migration `20261102_service_usage_assignment_payment` is applied locally.
- Added accounting and assigned-user API queues, overlap validation, assignee selection, dashboard visibility, and payment confirmation controls.
- Payment confirmation is revenue-idempotent: one service usage creates one linked revenue transaction and subsequent payments do not create another.
- Verification: lint, 111/111 tests, and production build passed; browser verification remains after reloading the running app.

### 2026-11-02 - External service history actions

- Added visible edit and soft-cancel actions to each service-usage row.
- Edit supports schedule, assignee, service, location, amount, discount, and notes; server validation still protects paid records and overlapping assignments.
- Cancel opens an in-app reason form and preserves the historical record as cancelled.
- Verification: lint, 111/111 tests, build, browser DOM/accessibility check, and browser console smoke check passed.

### 2026-11-02 - External service visibility on personnel dashboards

- Added a dashboard section for HR, directors, and talent management to track external-service usages without opening an individual profile.
- The section shows service/customer, assignee, derived execution status, and payment status; rows and "Xem chi tiết" link to the dedicated service-history page for edit, cancellation, and payment actions.
- Verification: lint, 111/111 tests, production build, and browser DOM/accessibility verification passed. Existing scoped dashboard navigation also emitted two 401 API events while the page still rendered the new section.

### 2026-11-02 - External service workflow in dashboard work queue

- Removed the standalone external-service dashboard card.
- Planned/in-progress usages now appear in the HR work queue as tracking items; completed unpaid or partially paid usages appear as accounting tasks to check and confirm payment.
- Fully paid and cancelled usages are excluded from actionable items; selecting a task opens the service-history page.
- Verification: lint, 111/111 tests, production build, and browser accessibility verification passed. Existing scoped dashboard navigation emitted 401 API events, but the work-queue item rendered correctly.

### 2026-11-02 - HR external-service assignment permissions

- Added a protected `/service-usage/assignees` endpoint for active accounts and wired it into both the profile quick-entry form and service-history edit form.
- Allowed service usage mutations for accounts with either `manage_revenue` or `manage_idols`, fixing HR's inability to save new service usages while preserving route authorization.
- Verification: type check, browser accessibility inspection, and authorization regression coverage passed; the assignee dropdown displayed active accounts in the HR session.

### 2026-11-02 - External service multi-assignee entry feedback

- Added success/error toast feedback after adding or editing a service-usage record.
- Service-usage entry now supports searching active accounts by name/username and selecting multiple assignees; overlap validation applies to every selected account.
- Existing single-assignee records remain readable and are migrated into the new assignment relation on write.

### 2026-11-02 - Grouped dashboard external-service actions

- Grouped external-service tracking/payment items on the HR/accounting dashboard into a dedicated section.
- Dashboard actions now carry the exact personnel and usage identifiers; opening a service code selects the corresponding customer record in service history instead of opening an unrelated/default record.

### 2026-11-02 - Personnel dashboard reference date and collapsible service group

- Added the configured system date to the personnel dashboard header.
- Added collapse/expand behavior for the grouped external-service section while retaining its count and direct links.
# [2026-11-02] - Chuẩn hóa trường nhập ngày và ngày giờ

- Thay các trường native `date`/`datetime-local` trong chỉnh sửa dịch vụ ngoài và ủy quyền phê duyệt bằng component dùng chung.
- Chuẩn hóa hiển thị ngày thành `DD/MM/YYYY` và ngày giờ thành `DD/MM/YYYY HH:mm`; giá trị ISO nội bộ/API không thay đổi.
- Giữ nguyên các trường chỉ nhập tháng hoặc chỉ nhập giờ vì chúng có ngữ nghĩa riêng.
- Khôi phục nút mở lịch/ngày-giờ native ẩn phía sau ô nhập chuẩn hóa để người dùng vẫn chọn bằng lịch được.

# [2026-11-02] - Timeline công việc được assign trên dashboard cá nhân

- Dashboard cá nhân lấy các dịch vụ ngoài được assign cho tài khoản hiện tại qua API hiện có và kết hợp với công tác/công việc được assign theo hồ sơ liên kết.
- Timeline hiển thị thời gian bắt đầu/kết thúc, tên công việc/dịch vụ, đối tượng, địa điểm và trạng thái; không thay thế khu vực xử lý xác nhận/hoàn thành.

# [2026-11-02] - Tách trang giao việc khỏi dashboard

- Dashboard cá nhân chuyển thành tổng quan và lối tắt “Giao việc & Công tác”.
- Thêm view `WorkAssignmentsView` với timeline theo ngày/giờ, bộ lọc theo trạng thái và chi tiết công việc/người thực hiện.
- Thêm tab điều hướng `work_assignments`; các thao tác hiện hữu tiếp tục được giữ nguyên.
- Không thay đổi schema hoặc API dữ liệu.
- Lint, build và 112/112 test nghiệp vụ đã đạt.

### [2026-11-02] - Hiển thị dịch vụ ngoài được assign trong trang giao việc

- Khắc phục việc các bản ghi dịch vụ ngoài như Bingsu và Trang Nơ không xuất hiện cùng trang giao việc.
- Trang `WorkAssignmentsView` tải `/service-usage/assigned` và hiển thị nhóm riêng theo mã đơn, đối tượng, lịch thực hiện, người thực hiện, trạng thái và thanh toán.

### [2026-11-02] - Tự động xử lý công tác không phản hồi sau 3 ngày

- Công tác bắt buộc có người chưa phản hồi sau 3 ngày kể từ thời điểm kết thúc tự động áp dụng phạt đủ định mức đã cấu hình.
- Các yêu cầu giải trình đang chờ xử lý không bị tự động phạt.
- Gom xử lý vi phạm chưa có giải trình vào action/modal chung; ẩn nút huỷ khi toàn bộ người thực hiện đã kết thúc.
- Verification: lint passed, 113/113 tests passed, production build passed, browser DOM/accessibility inspection completed.


# [2026-11-03] - Scoped Idol tasks and persistent timer synchronization

- Scope task reads to the authenticated Idol owner at the server and frontend layers; management users remain restricted by allowed departments.
- Added dedicated Start/Stop timer endpoints with ownership checks so an Idol can track only their own task without receiving full task-management permission.
- Persisted timer state through existing `startTime`, `endTime`, `status`, and `loggedDurationMinutes` fields; restored active timers after reload and refreshed management views every five seconds.
- Hid cross-Idol task selection and management-only controls from Idol accounts; preserved task administration for users with `manage_tasks`.
- Verification: `npm.cmd run lint`, `npm.cmd test` (113/113), and `npm.cmd run build` passed. Browser verification covered the authenticated manager task view, Start/Stop, persistence after reload, and restoration of the active timer without a native popup; the manager view showed the scoped personnel list. Idol cross-account interaction was not re-run because the available quick-login Idol session did not expose the task-management route.
- UI follow-up: removed the separate running-timer banner; the active elapsed time and `Dừng & Lưu` action now stay inside the active task card so the task list does not shift vertically.
- Added a guarded `Space` shortcut to stop/resume the most recently timed task without intercepting inputs, selects, buttons, links, or open forms.
- Fixed manager visibility after an Idol starts a task: changing the selected Idol now triggers an immediate task refresh, and active timers are detected from persisted start/end timestamps rather than only the status label.
- Status UI now treats `Đang làm` as a read-only system state driven by Start timer; managers no longer need to select it manually.
- Removed the redundant `Phạm vi truy cập` banner from the personnel list UI while preserving the underlying department-scope filtering.
- [2026-11-04] Added Idol-aware task categories and KPI activity filtering. Shared taxonomy rules now drive the task modal and server-side validation rejects incompatible category/activity pairs; existing task records remain readable.
# [2026-11-09] — Single baseline migration and fresh production deployment

- Consolidated the active Prisma migration set into one baseline generated from the current schema; moved the previous active migration directories into a dated archive outside Prisma's active migration scan.
- Explicitly approved reset removed the two named volumes (`aura-talent_pgdata`, `aura-talent_uploads_data`) without backup; Compose recreated fresh volumes.
- GitLab main `0c72df19bf60b35a0971917127933214b65f8206` deployed under `/data/aura-talent/releases/0c72df1` as `aura-talent`. Corrected the Linux entrypoint shebang line ending through `.gitattributes` after the first app start exposed the issue.
- Verification: exactly one baseline migration applied and Prisma reports up to date; preflight reports one system admin, zero linked personnel profiles, and one applied migration. PostgreSQL/app healthy, Nginx running, HTTPS 200. Browser shows the blank sign-in form; unauthenticated API 401 is expected. No admin-authenticated business-flow test was performed.
# [2026-11-09] — GitLab CI/CD cho staging và production

- Thêm pipeline kiểm tra TypeScript, unit tests và frontend build bằng GitLab Shared Runner; main thành công tự deploy staging, production là job manual sau staging.
- Tạo Compose staging riêng với PostgreSQL/uploads volumes riêng và app chỉ bind `127.0.0.1:13001`; Nginx định tuyến `staging.aura.com` bằng cùng cert, đồng thời xác nhận SAN wildcard trước khi áp dụng.
- Thêm triển khai commit-specific, image tag full SHA dùng chung cho staging/production; production không build lại image và không có thao tác reset/xóa volume.
- Không cấp Docker socket cho `gitlab-runner`; CI deploy qua SSH key/known-hosts file variables bằng tài khoản `aura-talent`.
- Verification ban đầu: chưa chạy GitLab pipeline hoặc deploy. Sáu DB-dependent test suites cần schema/dữ liệu được loại khỏi CI vì CI chưa có disposable seeded DB; prerequisites GitLab/VM và coverage được ghi trong `docs/CI-CD-DEPLOYMENT.md`.

# [2026-11-10] — Chuẩn bị lần deploy staging đầu tiên

- Tạo staging environment file riêng trên VM với secret ngẫu nhiên, mode `600`; không ghi giá trị secret vào repository.
- Điều chỉnh SAN check để đọc chứng thư qua `aura-nginx` container do tài khoản deploy không có quyền đọc file cert trên host; xóa cấu hình pnpm bị lặp.
- Xác minh Docker Compose và quyền Docker của `aura-talent`; production containers đang healthy. Pipeline chưa chạy và staging chưa deploy.
- Verification: lint, production build, YAML/Bash syntax checks, 130 tests và SAN wildcard check qua Nginx container đạt; build vẫn cảnh báo bundle >500 kB. Commit `034dcb6` đã push lên `staging-cicd-20261109`; GitLab MR chưa tạo vì browser đang đăng xuất. Chưa deploy staging; không chạy production job.
- Tiếp theo: đăng nhập GitLab, tạo MR vào `main`, đợi MR verify pass rồi merge để kích hoạt staging deploy; chỉ kiểm tra staging, không chạy production job.
