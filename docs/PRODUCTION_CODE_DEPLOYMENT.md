# Triển khai code: local → GitLab → staging → production

Đây là quy trình phát hành thông thường. Chỉ làm việc trong worktree `D:/DATA/Project/aura-talent-management`; tạo branch Git trong chính thư mục này, không tạo một bản checkout ở ổ C:. [Cấu hình pipeline](../.gitlab-ci.yml) là nguồn xác định job thực tế; [chi tiết hạ tầng CI/CD](./CI-CD-DEPLOYMENT.md) giải thích runner, VM và mạng Docker.

Không copy source thủ công vào `/data/aura-talent/`, không chạy `docker compose up -d --build` trong thư mục gốc VM và không push thẳng vào `main` cho một lần phát hành thông thường. Production chỉ được cập nhật khi người có quyền chủ động chạy job manual của đúng pipeline đã kiểm thử trên staging.

## 1. Chuẩn bị branch tại máy local

Mở PowerShell trong `D:/DATA/Project/aura-talent-management`:

```powershell
git status --short
git branch --show-current
git remote -v
```

Nếu có file đã sửa hoặc đã stage từ công việc khác, xác định chủ sở hữu và xử lý riêng trước khi chuyển branch. Không dùng `git reset --hard`, `git clean`, `git stash` hoặc `git add .` để bỏ qua trạng thái này. Chỉ khi worktree sạch và không còn thay đổi cần giữ trên `main` mới đồng bộ rồi tạo branch:

```powershell
git switch main
git fetch origin
git pull --ff-only origin main
git switch -c feat/ten-thay-doi
```

Đặt tên branch theo mục đích, ví dụ `fix/login-session` hoặc `feat/work-assignment-filter`. Nếu `git pull --ff-only` không thể hoàn thành, dừng để kiểm tra divergence; không tự rebase, reset hoặc force-push. Sau khi tạo branch, kiểm tra lại `git branch --show-current` để chắc chắn không sửa nhầm `main`.

## 2. Sửa code và kiểm tra local

Thực hiện thay đổi theo phạm vi được duyệt; cập nhật tài liệu năng lực hệ thống và changelog khi hành vi thay đổi. Trước commit, chạy kiểm tra phù hợp với thay đổi:

```powershell
pnpm.cmd run lint
pnpm.cmd run build
```

Chạy các unit/integration tests liên quan theo hướng dẫn dự án. Nếu có thay đổi Prisma, kiểm tra schema/migration trên database kiểm thử; không dùng production để thử migration. Nếu thay đổi UI, khởi động ứng dụng và kiểm tra thao tác, DOM/accessibility và browser console. CI hiện không chạy sáu bộ test phụ thuộc PostgreSQL; `verify` thành công không thay thế cho kiểm thử DB và kiểm thử thủ công trên staging.

Ghi rõ kiểm tra nào đạt, thất bại hoặc chưa chạy. Không tiếp tục phát hành khi lỗi liên quan chưa được xử lý.

## 3. Chọn file, commit và push branch

Xem tất cả thay đổi trước khi stage. Ví dụ dưới đây dùng đường dẫn minh họa; thay bằng đúng file của lần phát hành:

```powershell
git status --short
git diff -- src/App.tsx
git add -- src/App.tsx docs/system-capabilities.md docs/changes/CHANGELOG.md
git diff --cached --name-only
git diff --cached --check
git diff --cached
git commit -m "feat(ui): show assignment status"
git push -u origin feat/ten-thay-doi
```

Chỉ commit file thuộc phạm vi công việc. Kiểm tra kỹ `git diff --cached` vì `git commit` mặc định sẽ lấy **mọi file đang stage**, kể cả file do người khác stage từ trước. Không commit `.env`, khóa SSH, mật khẩu, dump DB hay backup. Nếu có file đã stage không thuộc commit này, dừng và phối hợp với chủ sở hữu; không tự unstage hoặc xóa thay đổi của họ. Có thể chia nhiều commit nhỏ, mỗi commit có mục đích rõ ràng và thông điệp Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).

Lệnh `push` ở đây chỉ đưa branch lên GitLab, **chưa deploy staging**. Việc commit/push/merge cần được người có quyền cho phép theo [quy tắc Git của repo](../.agents/rules/git-governance.md).

## 4. Tạo Merge Request và merge vào `main`

Trên GitLab, tạo Merge Request từ branch vừa push vào `main`. Mô tả mục tiêu, file/DB bị ảnh hưởng, các kiểm tra local, cách kiểm thử và rủi ro/rollback. Yêu cầu review theo quy định của nhóm.

MR có thay đổi ảnh hưởng tới ứng dụng/cấu hình/hạ tầng sẽ chạy job `verify` (tự hủy job cũ nếu push commit mới liên tiếp nhờ `interruptible: true`); xem log và chỉ merge khi job đạt và các nhận xét review đã được xử lý. Job này chạy lint/typecheck, unit tests không cần DB và build. MR chỉ sửa tài liệu hoặc tệp phi-runtime (`docs/`, Markdown ở root, `prisma/migrations-archive/`, `.agents/`, `.vscode/`, `.gitignore`, `.gitattributes`, `metadata.json`) chạy job `docs_only` rất nhẹ để giữ điều kiện kiểm tra merge, không build/deploy ứng dụng. Nếu MR có commit mới sau review, chờ job của commit mới nhất; không dựa vào kết quả của commit cũ. Merge bằng giao diện GitLab sau khi được phê duyệt, không chạy `git push origin main` để bỏ qua MR.

Sau merge có thay đổi ứng dụng/cấu hình, mở pipeline của `main` mới tạo và ghi lại **full commit SHA**. Pipeline chạy `verify` lần nữa; khi đạt, `deploy_staging` tự chạy (`interruptible: false`). Nếu một trong hai job lỗi, dừng tại staging, đọc log và sửa bằng branch/MR mới; không bấm job production. Nếu merge chỉ thay đổi tài liệu hoặc tệp phi-runtime nêu trên, `workflow:rules` bỏ qua việc tạo pipeline trên `main` và staging giữ bản ứng dụng trước đó; khi cần chạy lại thủ công trên `main`, dùng **Run pipeline** (`web`).

## 5. Kiểm thử staging trước khi phê duyệt production

Mở `https://staging.aura.com/` sau khi job `deploy_staging` báo Passed. Xác nhận trang tải được, đăng nhập bằng tài khoản staging, kiểm tra các luồng vừa thay đổi và luồng hồi quy quan trọng, xem Network/Console trong trình duyệt. Kiểm tra migration và dữ liệu bằng DB **staging** nếu lần phát hành có thay đổi schema. Ghi lại pipeline ID, commit SHA, kết quả và người kiểm thử.

Staging có database, uploads và secret riêng. App staging dùng cổng `127.0.0.1:13001` cho health check trên VM; Nginx truy cập trực tiếp `staging-app:3000` qua Docker network staging. HTTP 200 của trang đăng nhập chỉ là smoke test; nó **không chứng minh** đăng nhập hoặc nghiệp vụ đã đúng. API bảo vệ có thể trả 401 khi chưa đăng nhập, nhưng các lỗi ngoài dự kiến phải được xử lý trước production.

## 6. Phê duyệt và chạy job production

Trước khi bấm deploy, xác nhận lại: staging đã đạt kiểm thử trên **cùng full commit SHA**, phạm vi migration đã được đánh giá, có kế hoạch sao lưu/khôi phục DB phù hợp với dữ liệu production, và người phụ trách đã chấp thuận. Pipeline không tự tạo backup DB; nếu cần backup mà chưa có bản kiểm chứng được, dừng ở bước này.

Trong **chính pipeline `main` đã triển khai staging**, người có quyền bấm Play cho job `deploy_production`. Nếu commit `main` mới nhất chỉ sửa tài liệu, hãy dùng pipeline ứng dụng đã staging và kiểm thử thành công gần nhất, không tìm job production ở commit tài liệu. Không bấm job của pipeline khác chỉ vì nó là pipeline mới nhất. Job production dùng Docker image đã được staging build với tag full commit SHA; script từ chối chạy nếu image đó không còn trên VM. Job chạy Compose `--no-build`, áp dụng migration hiện hành rồi khởi động app; không reset DB hay xóa volume. Đợi job Passed và lưu pipeline ID/commit SHA vào nhật ký phát hành.

Sau deploy, xác nhận `https://aura.com/` trả 200, đăng nhập và kiểm tra nghiệp vụ trọng yếu. Xem log job nếu cần kiểm tra migration/app/Nginx; có thể kiểm tra container trực tiếp trên VM bằng account `aura-talent` **chỉ sau khi được phép truy cập VM**. Trạng thái mong đợi: PostgreSQL và app healthy, Nginx Up, migration hoàn tất. Nếu job báo Passed nhưng trình duyệt có lỗi, chưa coi phát hành hoàn tất.

## 7. Khi có lỗi hoặc cần rollback

- `verify` hoặc staging thất bại: không chạy production; sửa trên branch và MR mới. Staging có thể được deploy lại từ pipeline phù hợp, nhưng phải kiểm tra tương thích với DB staging hiện có.
- Production thất bại: giữ log/pipeline ID và đánh giá trạng thái DB trước khi thử lại. Không tự xóa volume, chạy seed/import hoặc dùng `docker compose down -v`.
- Rollback code: dùng job manual của một pipeline **đã staging thành công** trước đó nếu Docker image đúng SHA vẫn còn trên VM. Kiểm tra staging/production và nhận phê duyệt trước khi chạy. Rollback code **không đảo ngược migration hay dữ liệu**; với thay đổi schema không tương thích phải có phương án DB riêng và bản backup phù hợp.

Không tự ý chỉnh `.env`, certificate, quyền runner hoặc cấu hình Docker trên VM để chữa lỗi pipeline. Quy trình thủ công/khôi phục đặc biệt nằm trong [production runbook](./PRODUCTION_RUNBOOK.md) và cần kế hoạch, phê duyệt riêng; không dùng thay đường CI/CD thường lệ.
