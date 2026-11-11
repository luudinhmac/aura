# TÀI LIỆU ỦY QUYỀN & KIỂM SOÁT TRUY CẬP (AUTHORIZATION)
## Aura Talent Management Platform

Hệ thống quản lý quyền truy cập của Aura Talent được xây dựng trên nguyên tắc **Kiểm soát truy cập dựa trên vai trò (RBAC - Role-Based Access Control)**.

Chi tiết chính sách và ma trận phân quyền chính thức được tài liệu hóa tại:
- 📄 [Chính Sách Phân Quyền Hệ Thống (.md)](file:///d:/DATA/Project/aura-talent-management/docs/security/permission-matrix.md)
- 📄 [Bản Tóm Tắt Tại Thư Mục Gốc (CHINH_SACH_PHAN_QUYEN.md)](file:///d:/DATA/Project/aura-talent-management/CHINH_SACH_PHAN_QUYEN.md)

---

### Mô Hình Thực Thi Trong Mã Nguồn

1. **Định nghĩa kiểu dữ liệu**:
   - `src/types/roles.ts`: Danh mục các vai trò mẫu chuẩn (`ROLE_PRESETS`), khối tổ chức (`ORG_BLOCKS`), danh mục phòng ban và nhóm Idol.
   - `src/types/index.ts`: Định nghĩa danh mục `AppTabPermission`, `AppActionPermission`, và đối tượng `UserAccount`.
2. **Giao diện quản trị phân quyền tập trung**:
   - `src/components/RoleBasedPermissionManager.tsx`: Giao diện 2 cột quản lý vai trò, cấu hình quyền, gán cả phòng ban 1-click và gán nhân sự hàng loạt.
3. **Thực thi phân quyền tại Client**:
   - `src/App.tsx`: Lọc các tab hiển thị dựa trên `currentUser.allowedTabs` và giới hạn phạm vi phòng ban `currentUser.allowedDepartments`.
   - `src/views/AdminPortalView.tsx`: Quản lý tài khoản và phân quyền, ngăn chặn tài khoản không phải Admin truy cập.
