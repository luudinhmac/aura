# syntax=docker/dockerfile:1

# ==============================================================================
# STAGE 1: Build Frontend & Prepare Prisma Client
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Cài đặt các gói hệ thống cần thiết cho việc biên dịch và engine của Prisma trên Alpine
RUN apk add --no-cache libc6-compat openssl

# Kích hoạt pnpm phiên bản chuẩn
RUN npm install -g pnpm@10.33.0

# Copy các file quản lý gói dependencies để tận dụng Docker layer cache
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./

# Cài đặt toàn bộ dependencies (bao gồm devDependencies cho Vite & TypeScript)
RUN pnpm install --frozen-lockfile

# Copy toàn bộ mã nguồn vào image builder
COPY . .

# Sinh Prisma Client cho nền tảng Linux Alpine (musl)
RUN pnpm exec prisma generate

# Build ứng dụng frontend sang thư mục tĩnh tối ưu /app/dist
RUN pnpm run build

# ==============================================================================
# STAGE 2: Production Runtime Tinh Gọn & Bảo Mật
# ==============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

# Thiết lập biến môi trường chuẩn sản xuất
ENV NODE_ENV=production
ENV PORT=3000

# Cài đặt dumb-init (xử lý PID 1, chuyển tiếp tín hiệu SIGTERM/SIGINT) và OpenSSL cho Prisma
RUN apk add --no-cache dumb-init openssl

# Kích hoạt pnpm cho runtime
RUN npm install -g pnpm@10.33.0

# Copy các file cấu hình và mã nguồn cần thiết cho backend
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml* ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src/types ./src/types
COPY --from=builder /app/src/utils ./src/utils
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/dist ./dist
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Cài đặt các thư viện production và khởi tạo lại Prisma client cho runtime
RUN pnpm install --prod --frozen-lockfile && \
    pnpm exec prisma generate

# Tạo sẵn thư mục lưu trữ uploads (avatar, tài liệu)
RUN mkdir -p uploads/idols

# Khai báo cổng ứng dụng
EXPOSE 3000

# Kiểm tra tình trạng sức khỏe định kỳ của container (Healthcheck)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

# Sử dụng dumb-init làm entrypoint để đảm bảo graceful shutdown an toàn
RUN chmod +x ./docker-entrypoint.sh

ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Tự động đồng bộ schema CSDL PostgreSQL và khởi chạy server
CMD ["./docker-entrypoint.sh"]
