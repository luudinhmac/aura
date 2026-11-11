import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import crypto from 'crypto';
import { pgStore as dbStore } from './server/db/pgStore.ts';
import { createAccessToken, createJwtConfig, clearRefreshCookie, readRefreshCookie, serializeRefreshCookie, verifyAccessToken } from './server/auth/jwt.ts';
import { createAuthSession, findActiveAuthSession, revokeAuthSession, rotateAuthSession } from './server/auth/session.ts';
import { findRoutePolicy, hasAction, hasAnyAction, isDirector, isSuperAdmin } from './server/auth/authorization.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProd = process.env.NODE_ENV === 'production';
  const jwtConfig = createJwtConfig(isProd);

  app.use((req: any, res: any, next: any) => {
    const requestId = crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    res.on('finish', () => {
      if (!req.path.startsWith('/api/') || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
      const parts = req.path.split('/').filter(Boolean);
      const resource = parts[1] || 'api';
      const resourceId = parts.find((part: string) => /^\d+$/.test(part) || /^[0-9a-f-]{8,}$/i.test(part));
      void dbStore.createAuditLog({
        requestId,
        actorUserId: req.authUser?.id ? Number(req.authUser.id) : undefined,
        method: req.method,
        path: req.path,
        action: `${req.method} ${req.path}`,
        resource,
        resourceId,
        statusCode: res.statusCode,
        metadata: {
          queryKeys: Object.keys(req.query || {}),
          ...((req as any).auditMetadata || {})
        },
      }).catch((error) => console.error(`[audit:${requestId}]`, error));
    });
    next();
  });

  const authenticateRequest = async (req: any, res: any, next: any) => {
    const authorization = req.header('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      if (!jwtConfig.enforce) return next();
      return res.status(401).json({ error: 'Thiếu access token' });
    }
    try {
      const claims = verifyAccessToken(authorization.slice('Bearer '.length).trim(), jwtConfig);
      const user = (await dbStore.getUsers()).find((item) => Number(item.id) === Number(claims.sub));
      if (!user || user.status === 'Đã khóa' || user.status === 'Tạm khóa') {
        return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ' });
      }
      req.authUser = user;
      return next();
    } catch {
      return res.status(401).json({ error: 'Access token không hợp lệ hoặc đã hết hạn' });
    }
  };

  const requireSuperAdmin = async (req: any, res: any): Promise<boolean> => {
    const requestUser = req.authUser || await getRequestUser(req);
    if (requestUser) {
      if (!isSuperAdmin(requestUser)) {
        res.status(403).json({ error: 'Chỉ Super Admin được phép quản lý cấu hình cột' });
        return false;
      }
      return true;
    }
    const rawUserId = req.header('x-user-id');
    const userId = Number(rawUserId);
    if (!rawUserId || !Number.isInteger(userId)) {
      res.status(401).json({ error: 'Thiếu định danh người dùng' });
      return false;
    }
    const user = (await dbStore.getUsers()).find((item) => Number(item.id) === userId);
    if (!user) {
      res.status(401).json({ error: 'Người dùng không tồn tại' });
      return false;
    }
    if (!isSuperAdmin(user)) {
      res.status(403).json({ error: 'Chỉ Super Admin được phép quản lý cấu hình cột' });
      return false;
    }
    return true;
  };

  const getRequestUser = async (req: any) => {
    if (req.authUser) return req.authUser;
    if (jwtConfig.enforce) return undefined;
    const userId = Number(req.header('x-user-id'));
    if (!Number.isInteger(userId)) return undefined;
    return (await dbStore.getUsers()).find((item) => Number(item.id) === userId);
  };

  const authorizeRoute = async (req: any, res: any, next: any) => {
    if (req.path === '/auth/login' || req.path === '/auth/refresh') return next();
    const policy = findRoutePolicy(req.method, req.path);
    if (!policy) return next();

    const requestUser = req.authUser || await getRequestUser(req);
    if (!requestUser) return res.status(401).json({ error: 'Thiếu định danh người dùng' });
    if (policy.superAdminOnly && !isSuperAdmin(requestUser)) {
      return res.status(403).json({ error: 'Chỉ Super Admin được phép thực hiện thao tác này' });
    }
    if (policy.action && !hasAction(requestUser, policy.action)) {
      return res.status(403).json({ error: `Tài khoản không có quyền: ${policy.action}` });
    }
    if (policy.anyActions && !policy.anyActions.some((action) => hasAction(requestUser, action))) {
      return res.status(403).json({ error: `Tài khoản cần một trong các quyền: ${policy.anyActions.join(', ')}` });
    }
    return next();
  };

  app.use(express.json());
  app.use('/api', (req, res, next) => {
    if (req.path === '/auth/login' || req.path === '/auth/refresh') return next();
    return authenticateRequest(req, res, next);
  });
  app.use('/api', authorizeRoute);

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads', 'idols');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve static files from /uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Multer in-memory storage for content-hash validation & deduplication
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Chỉ chấp nhận file hình ảnh (jpg, png, webp, gif)'));
      }
    }
  });

  // In-memory index of existing upload SHA-256 hashes (loaded lazily once, avoiding O(N) sync disk scans per request)
  let uploadHashIndexPromise: Promise<Map<string, string>> | null = null;
  const getUploadHashIndex = (): Promise<Map<string, string>> => {
    if (!uploadHashIndexPromise) {
      uploadHashIndexPromise = (async () => {
        const index = new Map<string, string>();
        try {
          const files = await fs.promises.readdir(uploadsDir);
          for (const filename of files) {
            const filePath = path.join(uploadsDir, filename);
            try {
              const stat = await fs.promises.stat(filePath);
              if (!stat.isFile()) continue;
              const content = await fs.promises.readFile(filePath);
              const hash = crypto.createHash('sha256').update(content).digest('hex');
              if (!index.has(hash)) index.set(hash, filename);
            } catch {
              // Skip unreadable files
            }
          }
        } catch {
          // Directory may not exist yet
        }
        return index;
      })();
    }
    return uploadHashIndexPromise;
  };

  const hasValidImageSignature = (buf: Buffer): boolean => {
    if (buf.length < 4) return false;
    // JPEG (FF D8 FF), PNG (89 50 4E 47), GIF (47 49 46 38), WebP (RIFF....WEBP)
    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    const isGif = buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38;
    const isWebp = buf.length >= 12
      && buf.subarray(0, 4).toString('ascii') === 'RIFF'
      && buf.subarray(8, 12).toString('ascii') === 'WEBP';
    return isJpeg || isPng || isGif || isWebp;
  };

  // Upload image endpoint với kiểm tra trùng lặp (SHA-256 Content Hash Deduplication)
  app.post('/api/upload', upload.single('avatar'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Không tìm thấy file tải lên' });
    }
    if (!hasValidImageSignature(req.file.buffer)) {
      return res.status(400).json({ error: 'Nội dung file không phải định dạng ảnh hợp lệ (JPG, PNG, WEBP, GIF)' });
    }

    try {
      const fileBuffer = req.file.buffer;
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const hashIndex = await getUploadHashIndex();

      const matchedFilename = hashIndex.get(fileHash) || null;
      if (matchedFilename) {
        const matchedPath = path.join(uploadsDir, matchedFilename);
        if (fs.existsSync(matchedPath)) {
          return res.json({
            success: true,
            url: `/uploads/idols/${matchedFilename}`,
            filename: matchedFilename,
            size: req.file.size,
            isDuplicate: true,
            message: 'Ảnh đã tồn tại trên hệ thống, tự động tái sử dụng file cũ để tiết kiệm bộ nhớ'
          });
        }
        hashIndex.delete(fileHash);
      }

      const rawExt = path.extname(req.file.originalname).toLowerCase();
      const allowedExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
      const ext = allowedExts.has(rawExt) ? rawExt : '.jpg';
      const cleanOriginalName = path.basename(req.file.originalname, rawExt).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
      const newFilename = `idol_${fileHash.slice(0, 12)}_${cleanOriginalName}${ext}`;
      const newFilePath = path.join(uploadsDir, newFilename);

      await fs.promises.writeFile(newFilePath, fileBuffer);
      hashIndex.set(fileHash, newFilename);

      return res.json({
        success: true,
        url: `/uploads/idols/${newFilename}`,
        filename: newFilename,
        size: req.file.size,
        isDuplicate: false,
        message: 'Tải ảnh mới thành công'
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Lỗi khi xử lý lưu trữ ảnh: ' + (err.message || 'Lỗi không xác định') });
    }
  });

  // Idols / Personnel REST APIs
  app.get('/api/personnel-activity-types', async (_req, res) => {
    try {
      res.json(await dbStore.getPersonnelActivityTypes());
    } catch (err) {
      res.status(500).json({ error: 'Lỗi tải danh mục hoạt động' });
    }
  });

  app.get('/api/idols', async (req, res) => {
    try {
      const idols = await dbStore.getIdols(await getRequestUser(req));
      res.json(idols);
    } catch (err) {
      res.status(500).json({ error: 'Lỗi tải danh sách idol' });
    }
  });

  app.get('/api/idols/:id', async (req, res) => {
    try {
      const idol = await dbStore.getIdolById(req.params.id, await getRequestUser(req));
      if (!idol) return res.status(404).json({ error: 'Không tìm thấy idol' });
      res.json(idol);
    } catch (err) {
      res.status(500).json({ error: 'Lỗi lấy thông tin idol' });
    }
  });

  app.get('/api/idols/:id/salary-history', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!requestUser) return res.status(401).json({ error: 'Thiếu định danh người dùng' });
      const isSelf = Boolean(requestUser.idolId && Number(requestUser.idolId) === Number(req.params.id));
      const canReadPayroll = isSuperAdmin(requestUser) || hasAnyAction(requestUser, ['manage_payroll', 'adjust_payroll', 'approve_payroll']);
      if (!isSelf && !canReadPayroll) {
        return res.status(403).json({ error: 'Không có quyền xem lịch sử lương của nhân sự khác' });
      }
      res.json(await dbStore.getPersonnelSalaryHistory(req.params.id));
    } catch (err) {
      res.status(500).json({ error: 'Không thể tải lịch sử lương' });
    }
  });

  app.post('/api/idols/:id/salary-history', async (req, res) => {
    try {
      const history = await dbStore.changePersonnelSalary(req.params.id, req.body, await getRequestUser(req));
      res.status(201).json(history);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Không thể cập nhật lịch sử lương' });
    }
  });

  app.post('/api/idols', async (req, res) => {
    try {
      (req as any).auditMetadata = {
        source: 'personnel_create_request',
        accountProvisioning: req.body?.personnelType === 'Dịch vụ ngoài' ? 'none' : 'automatic_if_missing',
        requestedUsername: req.body?.accountUsername || undefined,
        personnelType: req.body?.personnelType || undefined,
        isIdol: req.body?.isIdol !== false
      };
      const newIdol = await dbStore.createIdol(req.body, await getRequestUser(req));
      res.status(201).json(newIdol);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể thêm nhân sự mới';
      console.error(`[personnel-create:${(req as any).requestId}]`, err);
      const statusCode = Number.isInteger(err?.status) ? err.status : 400;
      res.status(statusCode).json({ error: errorMessage || 'Không thể thêm nhân sự mới' });
    }
  });

  app.put('/api/idols/:id', async (req, res) => {
    try {
      const updated = await dbStore.updateIdol(req.params.id, req.body, await getRequestUser(req));
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy idol để cập nhật' });
      res.json(updated);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Hồ sơ đã nghỉ việc')) {
        return res.status(403).json({ error: err.message });
      }
      res.status(400).json({ error: 'Lỗi cập nhật idol' });
    }
  });

  app.delete('/api/idols/:id', async (req, res) => {
    try {
      const requestUser = await getRequestUser(req);
      if (!isSuperAdmin(requestUser)) return res.status(403).json({ error: 'Chỉ System Admin được phép xoá nhân sự' });
      const success = await dbStore.deleteIdol(req.params.id);
      if (!success) return res.status(404).json({ error: 'Không tìm thấy idol để xóa' });
      res.json({ success: true, message: 'Đã xóa idol thành công' });
    } catch (err) {
      res.status(400).json({ error: 'Lỗi xóa idol' });
    }
  });

  // Criteria REST APIs
  app.get('/api/criteria', async (_req, res) => {
    try {
      const criteria = await dbStore.getCriteria();
      res.json(criteria);
    } catch (err) {
      res.status(500).json({ error: 'Lỗi tải danh sách tiêu chí' });
    }
  });

  app.post('/api/criteria', async (req, res) => {
    try {
      const newCrit = await dbStore.createCriterion(req.body);
      res.status(201).json(newCrit);
    } catch (err) {
      res.status(400).json({ error: 'Không thể thêm tiêu chí mới' });
    }
  });

  app.put('/api/criteria/:id', async (req, res) => {
    try {
      const updated = await dbStore.updateCriterion(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy tiêu chí' });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: 'Lỗi cập nhật tiêu chí' });
    }
  });

  app.delete('/api/criteria/:id', async (req, res) => {
    try {
      const success = await dbStore.deleteCriterion(req.params.id);
      if (!success) return res.status(404).json({ error: 'Không tìm thấy tiêu chí' });
      res.json({ success: true, message: 'Đã xóa tiêu chí' });
    } catch (err) {
      res.status(400).json({ error: 'Lỗi xóa tiêu chí' });
    }
  });

  app.post('/api/criteria/priority', async (req, res) => {
    try {
      const { criterionIds } = req.body;
      if (!Array.isArray(criterionIds)) {
        return res.status(400).json({ error: 'criterionIds phải là một danh sách' });
      }
      const updated = await dbStore.updateCriteriaPriority(criterionIds);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: 'Lỗi cập nhật thứ tự tiêu chí' });
    }
  });

  // Scores REST APIs
  app.get('/api/scores', async (req, res) => {
    try {
      const period = req.query.period as string | undefined;
      const scores = await dbStore.getScores(period);
      res.json(scores);
    } catch (err) {
      res.status(500).json({ error: 'Lỗi tải danh sách điểm' });
    }
  });

  app.post('/api/scores', async (req, res) => {
    try {
      const saved = await dbStore.saveScore(req.body);
      res.json(saved);
    } catch (err) {
      res.status(400).json({ error: 'Không thể lưu điểm' });
    }
  });

  app.post('/api/scores/batch', async (req, res) => {
    try {
      const records = req.body.records;
      if (!Array.isArray(records)) {
        return res.status(400).json({ error: 'records phải là một mảng' });
      }
      const saved = await dbStore.batchSaveScores(records);
      res.json(saved);
    } catch (err) {
      res.status(400).json({ error: 'Không thể cập nhật danh sách điểm' });
    }
  });

  // Tasks REST APIs
  app.get('/api/tasks', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      const idolId = req.query.idolId as string | undefined;
      const tasks = await dbStore.getTasks(idolId, requestUser);
      res.json(tasks);
    } catch (err) {
      res.status(500).json({ error: 'Lỗi tải danh sách nhiệm vụ' });
    }
  });

  const canManageTasks = (user: any) => Boolean(!user?.isIdol && (user?.isSuperAdmin || user?.isBusinessAdmin || user?.allowedActions?.includes('manage_tasks')));
  const canAccessTask = async (req: any, id: string) => {
    const requestUser = req.authUser || await getRequestUser(req);
    const owner = await dbStore.getTaskOwner(id);
    if (!requestUser || !owner) return { requestUser, owner, allowed: false };
    if (canManageTasks(requestUser)) {
      const allowedDepartments = requestUser.allowedDepartments || [];
      const allowed = allowedDepartments.length === 0 || allowedDepartments.includes('*') || allowedDepartments.includes(owner.department);
      return { requestUser, owner, allowed };
    }
    return { requestUser, owner, allowed: Boolean(requestUser.idolId && Number(requestUser.idolId) === owner.personnelId) };
  };

  app.post('/api/tasks/:id/timer/start', async (req, res) => {
    try {
      const access = await canAccessTask(req, req.params.id);
      if (!access.owner) return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ' });
      if (!access.allowed) return res.status(403).json({ error: 'Bạn không có quyền bấm giờ nhiệm vụ này' });
      const updated = await dbStore.startTaskTimer(req.params.id);
      res.json(updated);
    } catch {
      res.status(400).json({ error: 'Không thể bắt đầu bấm giờ nhiệm vụ' });
    }
  });

  app.post('/api/tasks/:id/timer/stop', async (req, res) => {
    try {
      const access = await canAccessTask(req, req.params.id);
      if (!access.owner) return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ' });
      if (!access.allowed) return res.status(403).json({ error: 'Bạn không có quyền dừng nhiệm vụ này' });
      const updated = await dbStore.stopTaskTimer(req.params.id);
      res.json(updated);
    } catch {
      res.status(400).json({ error: 'Không thể dừng và lưu thời gian nhiệm vụ' });
    }
  });

  app.post('/api/tasks', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!canManageTasks(requestUser)) return res.status(403).json({ error: 'Tài khoản không có quyền: manage_tasks' });
      const newTask = await dbStore.createTask(req.body);
      res.status(201).json(newTask);
    } catch (err) {
      res.status(400).json({ error: 'Không thể tạo nhiệm vụ' });
    }
  });

  app.put('/api/tasks/:id', async (req, res) => {
    try {
      const access = await canAccessTask(req, req.params.id);
      if (!access.owner) return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ' });
      if (!access.allowed) return res.status(403).json({ error: 'Bạn không có quyền cập nhật nhiệm vụ này' });
      if (!canManageTasks(access.requestUser)) {
        const allowedKeys = new Set(['status', 'startTime', 'endTime', 'loggedDurationMinutes']);
        if (Object.keys(req.body || {}).some((key) => !allowedKeys.has(key))) {
          return res.status(403).json({ error: 'Idol chỉ được cập nhật trạng thái thời gian của nhiệm vụ của mình' });
        }
      }
      const updated = await dbStore.updateTask(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ' });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: 'Lỗi cập nhật nhiệm vụ' });
    }
  });

  app.delete('/api/tasks/:id', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!canManageTasks(requestUser)) return res.status(403).json({ error: 'Tài khoản không có quyền: manage_tasks' });
      const success = await dbStore.deleteTask(req.params.id);
      if (!success) return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ' });
      res.json({ success: true, message: 'Đã xóa nhiệm vụ' });
    } catch (err) {
      res.status(400).json({ error: 'Lỗi xóa nhiệm vụ' });
    }
  });

  app.post('/api/tasks/:id/subtasks', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!canManageTasks(requestUser)) return res.status(403).json({ error: 'Tài khoản không có quyền: manage_tasks' });
      const { title, timeSpentMinutes } = req.body;
      if (!title) return res.status(400).json({ error: 'Tiêu đề subtask không được để trống' });
      const task = await dbStore.addSubtask(req.params.id, title, Number(timeSpentMinutes) || 30);
      if (!task) return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ' });
      res.json(task);
    } catch (err) {
      res.status(400).json({ error: 'Lỗi thêm công việc phụ' });
    }
  });

  app.put('/api/tasks/:id/subtasks/:subtaskId', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!canManageTasks(requestUser)) return res.status(403).json({ error: 'Tài khoản không có quyền: manage_tasks' });
      const task = await dbStore.updateSubtask(req.params.id, req.params.subtaskId, req.body);
      if (!task) return res.status(404).json({ error: 'Không tìm thấy subtask' });
      res.json(task);
    } catch (err) {
      res.status(400).json({ error: 'Lỗi cập nhật công việc phụ' });
    }
  });

  app.delete('/api/tasks/:id/subtasks/:subtaskId', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!canManageTasks(requestUser)) return res.status(403).json({ error: 'Tài khoản không có quyền: manage_tasks' });
      const task = await dbStore.deleteSubtask(req.params.id, req.params.subtaskId);
      if (!task) return res.status(404).json({ error: 'Không tìm thấy subtask' });
      res.json(task);
    } catch (err) {
      res.status(400).json({ error: 'Lỗi xóa công việc phụ' });
    }
  });

  // Work assignment REST APIs
  app.get('/api/work-assignments', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!requestUser) return res.status(401).json({ error: 'Thiếu định danh người dùng' });
      const canManage = hasAction(requestUser, 'manage_work_assignments');
      const assignments = canManage
        ? await dbStore.getWorkAssignments()
        : requestUser.idolId
          ? await dbStore.getWorkAssignments(String(requestUser.idolId))
          : [];
      res.json(assignments);
    } catch (err) {
      res.status(500).json({ error: 'Lỗi tải danh sách công tác' });
    }
  });

  app.post('/api/work-assignments', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!requestUser) return res.status(401).json({ error: 'Thiếu định danh người dùng' });
      const assigneePersonnelIds = Array.isArray(req.body?.assigneePersonnelIds)
        ? req.body.assigneePersonnelIds.map((id: unknown) => String(id))
        : [];
      if (!String(req.body?.title || '').trim()) return res.status(400).json({ error: 'Tên công tác không được để trống' });
      if (assigneePersonnelIds.length === 0) return res.status(400).json({ error: 'Phải chọn ít nhất một nhân sự' });
      const allowedDepartments = Array.isArray(requestUser.allowedDepartments) ? requestUser.allowedDepartments : [];
      if (!isSuperAdmin(requestUser) && !requestUser.isBusinessAdmin && !allowedDepartments.includes('*')) {
        const targetPersonnel = await dbStore.getIdols();
        const invalidTarget = targetPersonnel.some((personnel) => assigneePersonnelIds.includes(personnel.id) && !allowedDepartments.includes(personnel.department));
        if (invalidTarget) return res.status(403).json({ error: 'Có nhân sự ngoài phạm vi được phép giao công tác' });
      }
      const created = await dbStore.createWorkAssignment(req.body, String(requestUser.id));
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Không thể tạo công tác' });
    }
  });

  app.post('/api/work-assignments/:id/respond', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!requestUser?.idolId) return res.status(403).json({ error: 'Tài khoản chưa được liên kết với hồ sơ nhân sự' });
      const assignments = await dbStore.getWorkAssignments(String(requestUser.idolId));
      if (!assignments.some((assignment) => assignment.id === req.params.id)) return res.status(404).json({ error: 'Không tìm thấy công tác được giao' });
      const updated = await dbStore.respondToWorkAssignment(req.params.id, String(requestUser.idolId), req.body?.responseStatus, req.body?.note);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy công tác được giao' });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Không thể phản hồi công tác' });
    }
  });

  app.put('/api/work-assignments/:id', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!requestUser || !hasAction(requestUser, 'manage_work_assignments')) return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa công việc' });
      const updated = await dbStore.updateWorkAssignment(req.params.id, req.body, String(requestUser.id));
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy công việc' });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Không thể chỉnh sửa công việc' });
    }
  });

  app.post('/api/work-assignments/:id/cancel', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!requestUser || !hasAction(requestUser, 'manage_work_assignments')) return res.status(403).json({ error: 'Bạn không có quyền hủy công việc' });
      const updated = await dbStore.cancelWorkAssignment(req.params.id, String(requestUser.id), req.body?.reason);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy công việc' });
      res.json(updated);
    } catch (err: any) { res.status(400).json({ error: err?.message || 'Không thể hủy công việc' }); }
  });

  app.post('/api/work-assignments/:id/complete', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!requestUser?.idolId) return res.status(403).json({ error: 'Tài khoản chưa được liên kết với hồ sơ nhân sự' });
      const assignments = await dbStore.getWorkAssignments(String(requestUser.idolId));
      if (!assignments.some((assignment) => assignment.id === req.params.id)) return res.status(404).json({ error: 'Không tìm thấy công tác được giao' });
      const updated = await dbStore.completeWorkAssignment(req.params.id, String(requestUser.idolId), req.body?.note);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy công tác được giao' });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Không thể cập nhật hoàn thành công tác' });
    }
  });

  app.post('/api/work-assignments/:id/assignees/:personnelId/violation', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!requestUser || (!isDirector(requestUser) && !(await dbStore.canReviewWorkAssignmentWaiver(String(requestUser.id))))) return res.status(403).json({ error: 'Chỉ Giám đốc hoặc tài khoản được ủy quyền phê duyệt mới được xử lý' });
      const action = req.body?.action === 'waive' ? 'waive' : req.body?.action === 'confirm' ? 'confirm' : null;
      if (!action) return res.status(400).json({ error: 'Hành động vi phạm không hợp lệ' });
      const updated = await dbStore.reviewWorkAssignmentWaiver(req.params.id, req.params.personnelId, action, String(requestUser.id), req.body?.note);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy người được giao công tác' });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Không thể xử lý vi phạm công tác' });
    }
  });

  app.post('/api/work-assignments/:id/waiver-request', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!requestUser?.idolId) return res.status(403).json({ error: 'Tài khoản chưa được liên kết với hồ sơ nhân sự' });
      const updated = await dbStore.requestWorkAssignmentWaiver(req.params.id, String(requestUser.idolId), req.body?.reason);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy công tác' });
      res.json(updated);
    } catch (err: any) { res.status(400).json({ error: err?.message || 'Không thể gửi yêu cầu miễn/giảm phạt' }); }
  });

  app.post('/api/work-assignments/:id/waiver-review', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      const canManageAssignments = requestUser?.allowedActions?.includes('manage_work_assignments') === true;
      const isCreator = requestUser ? await dbStore.isWorkAssignmentCreator(req.params.id, String(requestUser.id)) : false;
      if (!requestUser || (!isDirector(requestUser) && !canManageAssignments && !isCreator && !(await dbStore.canReviewWorkAssignmentWaiver(String(requestUser.id))))) return res.status(403).json({ error: 'Bạn không có quyền xử lý phản hồi công việc này' });
      const action = ['accept', 'no_penalty', 'penalty', 'reduced_penalty'].includes(req.body?.action) ? req.body.action : null;
      if (!action || !req.body?.personnelId) return res.status(400).json({ error: 'Thiếu người được giao hoặc hành động xử lý' });
      const updated = await dbStore.reviewWorkAssignmentWaiver(req.params.id, String(req.body.personnelId), action, String(requestUser.id), req.body?.note, req.body?.penaltyRate);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
      res.json(updated);
    } catch (err: any) { res.status(400).json({ error: err?.message || 'Không thể xử lý yêu cầu miễn/giảm phạt' }); }
  });

  app.get('/api/work-assignment-delegations', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!requestUser || !isDirector(requestUser)) return res.status(403).json({ error: 'Chỉ Giám đốc được quản lý ủy quyền' });
      res.json(await dbStore.getWorkAssignmentDelegations(String(requestUser.id)));
    } catch (err: any) { res.status(400).json({ error: err?.message || 'Không thể tải danh sách ủy quyền' }); }
  });

  app.post('/api/work-assignment-delegations', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!requestUser || !isDirector(requestUser)) return res.status(403).json({ error: 'Chỉ Giám đốc được tạo ủy quyền' });
      res.status(201).json(await dbStore.createWorkAssignmentDelegation(String(requestUser.id), String(req.body?.delegateId), String(req.body?.startsAt), String(req.body?.endsAt)));
    } catch (err: any) { res.status(400).json({ error: err?.message || 'Không thể tạo ủy quyền' }); }
  });

  app.delete('/api/work-assignment-delegations/:id', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!requestUser || !isDirector(requestUser)) return res.status(403).json({ error: 'Chỉ Giám đốc được thu hồi ủy quyền' });
      const result = await dbStore.revokeWorkAssignmentDelegation(req.params.id, String(requestUser.id));
      if (!result.count) return res.status(404).json({ error: 'Không tìm thấy ủy quyền đang hiệu lực' });
      res.json({ success: true });
    } catch (err: any) { res.status(400).json({ error: err?.message || 'Không thể thu hồi ủy quyền' }); }
  });

  // Departments REST APIs
  app.get('/api/departments', async (_req, res) => {
    try {
      const list = await dbStore.getDepartments();
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: 'Lỗi tải danh sách phòng ban' });
    }
  });

  app.post('/api/departments', async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || !name.trim()) return res.status(400).json({ error: 'Tên đơn vị không được để trống' });
      const list = await dbStore.addDepartment(name);
      res.status(201).json(list);
    } catch (err) {
      res.status(400).json({ error: 'Lỗi thêm phòng ban' });
    }
  });

  app.put('/api/departments', async (req, res) => {
    try {
      const { oldName, newName } = req.body;
      if (!oldName || !newName) return res.status(400).json({ error: 'Thiếu tên đơn vị cũ hoặc mới' });
      const list = await dbStore.updateDepartment(oldName, newName);
      res.json(list);
    } catch (err) {
      res.status(400).json({ error: 'Lỗi cập nhật phòng ban' });
    }
  });

  app.delete('/api/departments/:name', async (req, res) => {
    try {
      const list = await dbStore.deleteDepartment(decodeURIComponent(req.params.name));
      res.json(list);
    } catch (err) {
      res.status(400).json({ error: 'Lỗi xóa phòng ban' });
    }
  });

  // Column Headers REST APIs
  app.get('/api/column-headers', async (_req, res) => {
    try {
      const headers = await dbStore.getColumnHeaders();
      res.json(headers);
    } catch (err) {
      res.status(500).json({ error: 'Lỗi tải danh sách cột' });
    }
  });

  app.put('/api/column-headers', async (req, res) => {
    try {
      if (!(await requireSuperAdmin(req, res))) return;
      const updated = await dbStore.updateColumnHeaders(req.body);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: 'Lỗi cập nhật tiêu đề cột' });
    }
  });

  // Dynamic Personnel Columns REST APIs
  app.get('/api/personnel-columns', async (req, res) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      if (includeInactive && !(await requireSuperAdmin(req, res))) return;
      const columns = await dbStore.getPersonnelColumns(includeInactive);
      res.json(columns);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Lỗi tải cấu hình cột nhân sự' });
    }
  });

  app.post('/api/personnel-columns', async (req, res) => {
    try {
      if (!(await requireSuperAdmin(req, res))) return;
      const created = await dbStore.createPersonnelColumn(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(err?.status || 400).json({ error: err?.message || 'Lỗi tạo cột nhân sự' });
    }
  });

  app.put('/api/personnel-columns/reorder', async (req, res) => {
    try {
      if (!(await requireSuperAdmin(req, res))) return;
      const columnIds = Array.isArray(req.body?.columnIds) ? req.body.columnIds.map(String) : [];
      if (columnIds.length === 0) return res.status(400).json({ error: 'columnIds không được để trống' });
      res.json(await dbStore.reorderPersonnelColumns(columnIds));
    } catch (err: any) {
      res.status(err?.status || 400).json({ error: err?.message || 'Lỗi sắp xếp cột nhân sự' });
    }
  });

  app.put('/api/personnel-columns/:id', async (req, res) => {
    try {
      if (!(await requireSuperAdmin(req, res))) return;
      const updated = await dbStore.updatePersonnelColumn(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy cột nhân sự' });
      res.json(updated);
    } catch (err: any) {
      res.status(err?.status || 400).json({ error: err?.message || 'Lỗi cập nhật cột nhân sự' });
    }
  });

  app.delete('/api/personnel-columns/:id', async (req, res) => {
    try {
      if (!(await requireSuperAdmin(req, res))) return;
      const archived = await dbStore.archivePersonnelColumn(req.params.id);
      if (!archived) return res.status(404).json({ error: 'Không tìm thấy cột nhân sự' });
      res.json(archived);
    } catch (err: any) {
      res.status(err?.status || 400).json({ error: err?.message || 'Lỗi archive cột nhân sự' });
    }
  });

  app.post('/api/personnel-columns/:id/restore', async (req, res) => {
    try {
      if (!(await requireSuperAdmin(req, res))) return;
      const restored = await dbStore.restorePersonnelColumn(req.params.id);
      if (!restored) return res.status(404).json({ error: 'Không tìm thấy cột nhân sự' });
      res.json(restored);
    } catch (err: any) {
      res.status(err?.status || 400).json({ error: err?.message || 'Lỗi khôi phục cột nhân sự' });
    }
  });

  // Settings REST APIs
  app.get('/api/settings', async (_req, res) => {
    try {
      const settings = await dbStore.getSettings();
      res.json(settings);
    } catch (err) {
      res.status(500).json({ error: 'Lỗi tải cấu hình' });
    }
  });

  app.put('/api/settings', async (req, res) => {
    try {
      const updated = await dbStore.updateSettings(req.body);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: 'Lỗi cập nhật cấu hình' });
    }
  });

  // Work Schedules (Lịch Live Stream & Ca Làm Việc) REST APIs
  app.get('/api/schedules', async (_req, res) => {
    try {
      const schedules = await dbStore.getSchedules();
      res.json(schedules);
    } catch (err) {
      res.status(500).json({ error: 'Lỗi tải danh sách ca làm việc' });
    }
  });

  app.get('/api/schedules/idol/:idolId', async (req, res) => {
    try {
      const schedules = await dbStore.getSchedulesByIdol(req.params.idolId);
      res.json(schedules);
    } catch (err) {
      res.status(500).json({ error: 'Lỗi tải lịch của nhân sự' });
    }
  });

  app.post('/api/schedules', async (req, res) => {
    try {
      const { idolId, startTime, endTime } = req.body;
      if (!idolId || !startTime || !endTime) {
        return res.status(400).json({ error: 'Thiếu thông tin ca làm việc (idol, giờ bắt đầu, kết thúc)' });
      }
      const created = await dbStore.createSchedule(req.body);
      res.status(201).json(created);
    } catch (err) {
      res.status(400).json({ error: 'Không thể tạo ca làm việc' });
    }
  });

  app.put('/api/schedules/:id', async (req, res) => {
    try {
      const updated = await dbStore.updateSchedule(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy ca làm việc' });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: 'Lỗi cập nhật ca làm việc' });
    }
  });

  app.delete('/api/schedules/:id', async (req, res) => {
    try {
      const success = await dbStore.deleteSchedule(req.params.id);
      if (!success) return res.status(404).json({ error: 'Không tìm thấy ca làm việc' });
      res.json({ success: true, message: 'Đã xóa ca làm việc' });
    } catch (err) {
      res.status(400).json({ error: 'Lỗi xóa ca làm việc' });
    }
  });

  app.post('/api/schedules/batch', async (req, res) => {
    try {
      const { idolId, slots } = req.body;
      if (!idolId || !Array.isArray(slots)) {
        return res.status(400).json({ error: 'Dữ liệu thiết lập lịch không hợp lệ' });
      }
      const list = await dbStore.batchSetIdolSchedules(idolId, slots);
      res.json(list);
    } catch (err) {
      res.status(400).json({ error: 'Không thể cập nhật lịch hàng loạt' });
    }
  });

  // Statuses REST APIs
  app.get('/api/statuses', async (_req, res) => {
    try {
      const statuses = await dbStore.getStatuses();
      res.json(statuses);
    } catch (err) {
      res.status(500).json({ error: 'Lỗi tải danh mục trạng thái' });
    }
  });

  app.post('/api/statuses', async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || !name.trim()) return res.status(400).json({ error: 'Tên trạng thái không được để trống' });
      const list = await dbStore.addStatus(name);
      res.status(201).json(list);
    } catch (err) {
      res.status(400).json({ error: 'Lỗi thêm trạng thái' });
    }
  });

  app.put('/api/statuses', async (req, res) => {
    try {
      const { oldName, newName } = req.body;
      if (!oldName || !newName) return res.status(400).json({ error: 'Thiếu tên trạng thái cũ hoặc mới' });
      const list = await dbStore.updateStatus(oldName, newName);
      res.json(list);
    } catch (err) {
      res.status(400).json({ error: 'Lỗi cập nhật trạng thái' });
    }
  });

  app.delete('/api/statuses/:name', async (req, res) => {
    try {
      const list = await dbStore.deleteStatus(decodeURIComponent(req.params.name));
      res.json(list);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Lỗi xóa trạng thái' });
    }
  });

  // Personnel Types REST APIs
  app.get('/api/personnel-types', async (_req, res) => {
    try {
      const types = await dbStore.getPersonnelTypes();
      res.json(types);
    } catch (err) {
      res.status(500).json({ error: 'Lỗi tải danh mục loại nhân sự' });
    }
  });

  app.post('/api/personnel-types', async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || !name.trim()) return res.status(400).json({ error: 'Tên loại nhân sự không được để trống' });
      const list = await dbStore.addPersonnelType(name);
      res.status(201).json(list);
    } catch (err) {
      res.status(400).json({ error: 'Lỗi thêm loại nhân sự' });
    }
  });

  app.put('/api/personnel-types', async (req, res) => {
    try {
      const { oldName, newName } = req.body;
      if (!oldName || !newName) return res.status(400).json({ error: 'Thiếu tên loại nhân sự cũ hoặc mới' });
      const list = await dbStore.updatePersonnelType(oldName, newName);
      res.json(list);
    } catch (err) {
      res.status(400).json({ error: 'Lỗi cập nhật loại nhân sự' });
    }
  });

  app.delete('/api/personnel-types/:name', async (req, res) => {
    try {
      const list = await dbStore.deletePersonnelType(decodeURIComponent(req.params.name));
      res.json(list);
    } catch (err) {
      res.status(400).json({ error: 'Lỗi xóa loại nhân sự' });
    }
  });

  // Auth REST APIs
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập/email và mật khẩu' });
      }
      const authRes = await dbStore.authenticate(username, password);
      if (!authRes.success || !authRes.user) {
        return res.status(authRes.status || 401).json({ error: authRes.error || 'Tài khoản hoặc mật khẩu không chính xác' });
      }
      // Return user without exposing raw password unnecessarily
      const { password: _, ...safeUser } = authRes.user;
      const { refreshToken } = await createAuthSession(Number(authRes.user.id), jwtConfig.refreshTtlSeconds);
      res.setHeader('Set-Cookie', serializeRefreshCookie(refreshToken, jwtConfig));
      res.json({ success: true, user: safeUser, accessToken: createAccessToken(String(authRes.user.id), jwtConfig) });
    } catch (err) {
      res.status(500).json({ error: 'Lỗi xác thực người dùng' });
    }
  });

  app.post('/api/auth/refresh', async (req, res) => {
    try {
      const refreshToken = readRefreshCookie(req.header('cookie'));
      if (!refreshToken) return res.status(401).json({ error: 'Thiếu refresh token' });
      const currentSession = await findActiveAuthSession(refreshToken);
      if (!currentSession) {
        res.setHeader('Set-Cookie', clearRefreshCookie(jwtConfig));
        return res.status(401).json({ error: 'Refresh session không hợp lệ hoặc đã hết hạn' });
      }
      const user = (await dbStore.getUsers()).find((item) => Number(item.id) === currentSession.userId);
      if (!user || user.status === 'Đã khóa' || user.status === 'Tạm khóa') {
        await revokeAuthSession(refreshToken);
        return res.status(401).json({ error: 'Tài khoản không còn hoạt động' });
      }
      const nextSession = await rotateAuthSession(currentSession.id, currentSession.userId, jwtConfig.refreshTtlSeconds);
      res.setHeader('Set-Cookie', serializeRefreshCookie(nextSession.refreshToken, jwtConfig));
      return res.json({ success: true, user, accessToken: createAccessToken(String(user.id), jwtConfig) });
    } catch {
      return res.status(500).json({ error: 'Lỗi làm mới phiên đăng nhập' });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    const refreshToken = readRefreshCookie(req.header('cookie'));
    if (refreshToken) await revokeAuthSession(refreshToken);
    res.setHeader('Set-Cookie', clearRefreshCookie(jwtConfig));
    res.json({ success: true });
  });

  app.get('/api/auth/me', async (req, res) => {
    const user = await getRequestUser(req);
    if (!user) return res.status(401).json({ error: 'Chưa xác thực' });
    return res.json({ user });
  });

  app.put('/api/auth/profile', async (req, res) => {
    try {
      const {
        userId,
        name,
        realName,
        stageName,
        dob,
        hometown,
        height,
        weight,
        phone,
        address,
        avatarUrl,
        currentPassword,
        newPassword
      } = req.body;
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!requestUser) {
        return res.status(401).json({ error: 'Thiếu định danh người dùng' });
      }
      if (userId !== undefined && userId !== null && String(userId) !== String(requestUser.id)) {
        return res.status(403).json({ error: 'Không có quyền cập nhật hồ sơ của tài khoản khác' });
      }
      const effectiveUserId = String(requestUser.id);
      const result = await dbStore.updateUserProfile(effectiveUserId, {
        name,
        realName,
        stageName,
        dob,
        hometown,
        height,
        weight,
        phone,
        address,
        avatarUrl,
        currentPassword,
        newPassword
      });
      if (!result.success || !result.user) {
        return res.status(400).json({ error: result.error || 'Cập nhật hồ sơ thất bại' });
      }
      const { password: _, ...safeUser } = result.user;
      res.json({ success: true, user: safeUser });
    } catch (err) {
      res.status(500).json({ error: 'Lỗi cập nhật hồ sơ' });
    }
  });

  // Users & Permissions REST APIs
  app.get('/api/users', async (_req, res) => {
    try {
      const users = (await dbStore.getUsers()).map(({ password, ...u }) => u);
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: 'Lỗi tải danh sách người dùng' });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      (req as any).auditMetadata = {
        source: 'manual_admin_create',
        requestedUsername: req.body?.username || undefined,
        accountType: req.body?.accountType === 'system_admin' ? 'system_admin' : 'personnel'
      };
      const newUser = await dbStore.createUser(req.body);
      const { password, ...safeUser } = newUser;
      res.status(201).json(safeUser);
    } catch (err) {
      res.status(400).json({ error: 'Không thể tạo tài khoản mới' });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    try {
      const updated = await dbStore.updateUser(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
      const { password, ...safeUser } = updated;
      res.json(safeUser);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Lỗi cập nhật tài khoản' });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      const success = await dbStore.deleteUser(req.params.id);
      if (!success) return res.status(400).json({ error: 'Không thể xóa tài khoản này' });
      res.json({ success: true, message: 'Đã xóa tài khoản' });
    } catch (err) {
      res.status(400).json({ error: 'Lỗi xóa tài khoản' });
    }
  });

  app.post('/api/users/sync-idols', async (_req, res) => {
    try {
      const result = await dbStore.syncIdolsWithUsers();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Lỗi đồng bộ tài khoản từ danh sách Idol' });
    }
  });

  app.get('/api/admin/audit-logs', async (req, res) => {
    try {
      if (!(await requireSuperAdmin(req, res))) return;
      const statusCodeRaw = req.query.statusCode ? Number(req.query.statusCode) : undefined;
      const categoryRaw = typeof req.query.category === 'string' ? req.query.category : undefined;
      const statusGroupRaw = typeof req.query.statusGroup === 'string' ? req.query.statusGroup : undefined;
      const result = await dbStore.getAuditLogs({
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 25,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        method: typeof req.query.method === 'string' ? req.query.method : undefined,
        resource: typeof req.query.resource === 'string' ? req.query.resource : undefined,
        statusCode: statusCodeRaw && Number.isInteger(statusCodeRaw) ? statusCodeRaw : undefined,
        category: categoryRaw === 'data' || categoryRaw === 'auth' ? categoryRaw : 'all',
        statusGroup: statusGroupRaw === '2xx' || statusGroupRaw === '4xx_5xx' ? statusGroupRaw : 'all',
        fromDate: typeof req.query.fromDate === 'string' ? req.query.fromDate : undefined,
        toDate: typeof req.query.toDate === 'string' ? req.query.toDate : undefined,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Lỗi tải nhật ký hệ thống' });
    }
  });

  // Approvals REST APIs
  app.get('/api/approvals', async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const list = await dbStore.getApprovals(status);
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: 'Lỗi tải danh sách yêu cầu phê duyệt' });
    }
  });

  app.post('/api/approvals', async (req, res) => {
    try {
      const { type, targetName, reason, data } = req.body || {};
      const validTypes = new Set(['create_idol', 'update_idol', 'delete_idol']);
      if (!validTypes.has(type) || typeof targetName !== 'string' || !targetName.trim() || typeof reason !== 'string' || !reason.trim() || !data || typeof data !== 'object') {
        return res.status(400).json({ error: 'Yêu cầu phê duyệt thiếu loại, đối tượng, lý do hoặc dữ liệu' });
      }
      const requester = await getRequestUser(req);
      if (!requester) return res.status(401).json({ error: 'Thiếu định danh người gửi yêu cầu' });
      const created = await dbStore.createApproval({
        ...req.body,
        requestedBy: {
          id: requester.id,
          username: requester.username,
          name: requester.name,
          roleTitle: requester.roleTitle
        }
      });
      res.status(201).json(created);
    } catch (err) {
      res.status(400).json({ error: 'Không thể gửi yêu cầu phê duyệt' });
    }
  });

  app.post('/api/approvals/:id/approve', async (req, res) => {
    try {
      const { reviewer, note } = req.body;
      const reviewerObj = await getRequestUser(req) || reviewer || { id: 'admin', name: 'Ban Quản Trị' };
      const result = await dbStore.approveApproval(req.params.id, reviewerObj, note);
      if (!result) return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
      res.json(result);
    } catch (err: any) {
      console.error('Lỗi duyệt yêu cầu:', err);
      res.status(400).json({ error: err?.message || 'Không thể duyệt yêu cầu' });
    }
  });

  app.post('/api/approvals/:id/reject', async (req, res) => {
    try {
      const { reason } = req.body;
      const reviewerObj = await getRequestUser(req);
      if (!reviewerObj) return res.status(401).json({ error: 'Thiếu định danh người duyệt' });
      const result = await dbStore.rejectApproval(req.params.id, reviewerObj, reason);
      if (!result) return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
      res.json(result);
    } catch (err: any) {
      console.error('Lỗi từ chối yêu cầu:', err);
      res.status(400).json({ error: err?.message || 'Không thể từ chối yêu cầu' });
    }
  });

  app.delete('/api/approvals/:id', async (req, res) => {
    try {
      const success = await dbStore.deleteApproval(req.params.id);
      if (!success) return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
      res.json({ success: true, message: 'Đã hủy yêu cầu' });
    } catch (err) {
      res.status(400).json({ error: 'Lỗi hủy yêu cầu' });
    }
  });

  // Leave Requests REST APIs
  app.get('/api/leave-requests', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!requestUser) return res.status(401).json({ error: 'Thiếu định danh người dùng' });
      const canManageApprovals = hasAction(requestUser, 'manage_approvals');
      const requestedId = req.query.idolId as string | undefined;
      if (!canManageApprovals && requestedId && String(requestedId) !== String(requestUser.idolId || '')) {
        return res.status(403).json({ error: 'Bạn chỉ được xem đơn nghỉ phép của chính mình' });
      }
      const idolId = canManageApprovals ? requestedId : requestUser.idolId;
      const list = await dbStore.getLeaveRequests(idolId);
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: 'Lỗi tải danh sách nghỉ phép' });
    }
  });

  app.post('/api/leave-requests', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      const canManageApprovals = requestUser && hasAction(requestUser, 'manage_approvals');
      if (!requestUser) return res.status(401).json({ error: 'Thiếu định danh người dùng' });
      const linkedPersonnel = canManageApprovals ? null : await dbStore.getPersonnelForUser(requestUser.id);
      if (!canManageApprovals && !linkedPersonnel) {
        return res.status(403).json({ error: 'Tài khoản chưa được liên kết với hồ sơ nhân sự' });
      }
      const leavePayload = canManageApprovals
        ? req.body
        : {
            ...req.body,
            idolId: linkedPersonnel!.id,
            idolName: linkedPersonnel!.stageName || linkedPersonnel!.realName,
            department: linkedPersonnel!.department
          };
      const created = await dbStore.createLeaveRequest(leavePayload);
      res.status(201).json(created);
    } catch (err) {
      if ((err as any)?.message === 'LEAVE_ALLOCATION_CONFIRMATION_REQUIRED') {
        return res.status(409).json({
          code: 'LEAVE_ALLOCATION_CONFIRMATION_REQUIRED',
          error: 'Đơn nghỉ vượt số ngày phép năm còn lại, cần xác nhận chuyển phần còn thiếu sang nghỉ không lương.',
          allocation: (err as any).allocation,
          remainingAnnualDays: (err as any).remainingAnnualDays
        });
      }
      res.status(400).json({ error: 'Không thể gửi đơn nghỉ phép' });
    }
  });

  app.put('/api/leave-requests/:id', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (req.body?.status === 'approved') {
        const leave = (await dbStore.getLeaveRequests()).find((item) => item.id === req.params.id);
        if (Number(leave?.totalDays || 0) >= 3 && !isDirector(requestUser)) {
          return res.status(403).json({ error: 'Đơn nghỉ từ 3 ngày trở lên chỉ được Giám Đốc Điều Hành phê duyệt' });
        }
      }
      const updated = await dbStore.updateLeaveRequest(req.params.id, {
        ...req.body,
        reviewedById: requestUser?.id ? Number(requestUser.id) : undefined
      });
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy đơn nghỉ phép' });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: 'Lỗi cập nhật đơn nghỉ phép' });
    }
  });

  app.delete('/api/leave-requests/:id', async (req, res) => {
    try {
      const success = await dbStore.deleteLeaveRequest(req.params.id);
      if (!success) return res.status(404).json({ error: 'Không tìm thấy đơn nghỉ phép' });
      res.json({ success: true, message: 'Đã xóa đơn nghỉ phép' });
    } catch (err) {
      res.status(400).json({ error: 'Lỗi xóa đơn nghỉ phép' });
    }
  });

  // Reset database API
  app.post('/api/reset', async (_req, res) => {
    if (process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Reset dữ liệu bị vô hiệu hóa trong production' });
    }
    try {
      await dbStore.reset();
      res.json({ success: true, message: 'Đã khôi phục dữ liệu mặc định thành công' });
    } catch (err) {
      res.status(500).json({ error: 'Lỗi khôi phục dữ liệu' });
    }
  });

  // Payroll Management REST APIs
  app.get('/api/payrolls', async (_req, res) => {
    try {
      const periods = await dbStore.getPayrollPeriods();
      res.json(periods);
    } catch (err) {
      res.status(500).json({ error: 'Không thể tải danh sách kỳ lương' });
    }
  });

  // Thống kê tài chính vĩ mô: Theo Quý, Theo Năm, Toàn Thời Gian
  app.get('/api/payrolls/macro-summary', async (_req, res) => {
    try {
      const summary = await dbStore.getMacroPayrollSummary();
      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: 'Không thể tải tổng hợp thống kê vĩ mô bảng lương' });
    }
  });

  // Danh sách nhân sự lũy kế theo Quý / Năm / Toàn Thời Gian
  app.get('/api/payrolls/aggregated-records', async (req, res) => {
    try {
      const { scope, key } = req.query as { scope?: any; key?: string };
      const records = await dbStore.getAggregatedPayrollPersonnel(scope || 'all', key);
      res.json(records);
    } catch (err) {
      res.status(500).json({ error: 'Không thể tải danh sách lương tổng hợp' });
    }
  });

  app.get('/api/payrolls/:periodId', async (req, res) => {
    try {
      const period = await dbStore.getPayrollPeriod(req.params.periodId);
      if (!period) return res.status(404).json({ error: 'Không tìm thấy kỳ lương' });
      res.json(period);
    } catch (err) {
      res.status(500).json({ error: 'Lỗi tải chi tiết kỳ lương' });
    }
  });

  app.get('/api/payrolls/:periodId/records', async (req, res) => {
    try {
      const { department, userId } = req.query as { department?: string; userId?: string };
      const records = await dbStore.getPayrollRecords(req.params.periodId, { department, userId });
      res.json(records);
    } catch (err) {
      res.status(500).json({ error: 'Không thể tải danh sách phiếu lương' });
    }
  });

  app.get('/api/payrolls/:periodId/disputes', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!requestUser) return res.status(401).json({ error: 'Thiếu định danh người dùng' });
      res.json(await dbStore.getPayrollDisputes(req.params.periodId, requestUser));
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Không thể tải phản ánh bảng lương' });
    }
  });

  app.post('/api/payrolls/:periodId/records/:recordId/disputes', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!requestUser) return res.status(401).json({ error: 'Thiếu định danh người dùng' });
      const created = await dbStore.createPayrollDispute(req.params.periodId, req.params.recordId, req.body, requestUser);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Không thể tạo phản ánh bảng lương' });
    }
  });

  app.get('/api/payroll-disputes/inbox', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!requestUser) return res.status(401).json({ error: 'Thiếu định danh người dùng' });
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      res.json(await dbStore.getPayrollDisputeInbox(requestUser, status));
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Không thể tải hộp thư phản ánh bảng lương' });
    }
  });

  app.put('/api/payroll-disputes/:id', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!requestUser) return res.status(401).json({ error: 'Thiếu định danh người dùng' });
      const updated = await dbStore.updatePayrollDispute(req.params.id, req.body, requestUser);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy phản ánh bảng lương' });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Không thể cập nhật phản ánh bảng lương' });
    }
  });

  app.delete('/api/payroll-disputes/:id', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!requestUser) return res.status(401).json({ error: 'Thiếu định danh người dùng' });
      const updated = await dbStore.updatePayrollDispute(req.params.id, { status: 'cancelled' }, requestUser);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy phản ánh bảng lương' });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Không thể hủy phản ánh bảng lương' });
    }
  });

  // Đồng bộ lại nhân sự vào kỳ lương khi có phát hiện không khớp đối soát
  app.post('/api/payrolls/:periodId/sync', async (req, res) => {
    try {
      const result = await dbStore.syncPayrollPeriod(req.params.periodId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Lỗi đồng bộ bảng lương' });
    }
  });

  // Kế toán / HR điều chỉnh phiếu lương
  app.put('/api/payrolls/:periodId/records/:recordId/adjust', async (req, res) => {
    try {
      const { periodId, recordId } = req.params;
      const { earnings, deductions, notes, reason, user } = req.body;
      const editorUser = user || { id: 'user-05', name: 'Lê Thị Mai Hương (HR & Kế toán)' };
      const updated = await dbStore.adjustPayrollRecord(periodId, recordId, { earnings, deductions, notes, reason }, editorUser);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy phiếu lương' });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: 'Lỗi điều chỉnh phiếu lương' });
    }
  });

  // Giám Đốc thưởng nóng cho nhân sự
  app.post('/api/payrolls/:periodId/records/:recordId/hot-bonus', async (req, res) => {
    try {
      const { periodId, recordId } = req.params;
      const { amount, reason, user } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Số tiền thưởng nóng phải lớn hơn 0' });
      }
      if (!reason || !reason.trim()) {
        return res.status(400).json({ error: 'Vui lòng nhập lý do thưởng nóng' });
      }
      const directorUser = user || { id: 'admin', name: 'Gia Huy (Giám Đốc)' };
      const updated = await dbStore.applyHotBonus(periodId, recordId, Number(amount), reason.trim(), directorUser);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy phiếu lương' });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: 'Lỗi ghi nhận thưởng nóng' });
    }
  });

  // Kế toán trình Giám Đốc duyệt
  app.post('/api/payrolls/:periodId/submit', async (req, res) => {
    try {
      const requestUser = await getRequestUser(req);
      if (requestUser) req.body.user = requestUser;
      const user = req.body.user || { id: 'user-05', name: 'Lê Thị Mai Hương', roleTitle: 'Chuyên Viên Nhân Sự & Kế Toán' };
      const result = await dbStore.submitPayrollPeriod(req.params.periodId, user);
      if (!result) return res.status(404).json({ error: 'Không tìm thấy kỳ lương' });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: 'Lỗi gửi duyệt kỳ lương' });
    }
  });

  // Giám Đốc phê duyệt bảng lương
  app.post('/api/payrolls/:periodId/approve', async (req, res) => {
    try {
      const requestUser = await getRequestUser(req);
      if (requestUser) req.body.user = requestUser;
      const user = req.body.user || { id: 'admin', name: 'Gia Huy (Giám Đốc)' };
      const result = await dbStore.approvePayrollPeriod(req.params.periodId, user);
      if (!result) return res.status(404).json({ error: 'Không tìm thấy kỳ lương' });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: 'Lỗi phê duyệt kỳ lương' });
    }
  });

  // Khóa sổ & xác nhận thanh toán
  app.post('/api/payrolls/:periodId/lock', async (req, res) => {
    try {
      const requestUser = await getRequestUser(req);
      if (requestUser) req.body.user = requestUser;
      const user = req.body.user || { id: 'admin', name: 'Gia Huy (Giám Đốc)' };
      const result = await dbStore.lockPayrollPeriod(req.params.periodId, user);
      if (!result) return res.status(404).json({ error: 'Không tìm thấy kỳ lương' });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: 'Lỗi khóa sổ kỳ lương' });
    }
  });

  // Lấy danh sách phiếu lương cá nhân của user đang đăng nhập
  app.get('/api/payrolls/my-payslips/:userId', async (req, res) => {
    try {
      const requestUser = (req as any).authUser || await getRequestUser(req);
      if (!requestUser) return res.status(401).json({ error: 'Thiếu định danh người dùng' });
      const { userId } = req.params;
      const canReadOthers = isSuperAdmin(requestUser) || hasAnyAction(requestUser, ['manage_payroll', 'adjust_payroll', 'approve_payroll']);
      if (!canReadOthers && String(requestUser.id) !== String(userId)) {
        return res.status(403).json({ error: 'Không có quyền xem phiếu lương của tài khoản khác' });
      }
      const payslips = await dbStore.getMyPayslips(userId);
      res.json(payslips);
    } catch (err) {
      res.status(500).json({ error: 'Không thể tải phiếu lương cá nhân' });
    }
  });

  // --- KPI Groups APIs ---
  app.get('/api/kpi-groups', async (_req, res) => {
    try {
      res.json(await dbStore.getKpiGroups());
    } catch (err) {
      res.status(500).json({ error: 'Không thể tải danh sách nhóm KPI' });
    }
  });

  app.post('/api/kpi-groups', async (req, res) => {
    try {
      const created = await dbStore.createKpiGroup(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Lỗi tạo nhóm KPI' });
    }
  });

  app.put('/api/kpi-groups/:id', async (req, res) => {
    try {
      const updated = await dbStore.updateKpiGroup(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy nhóm' });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Lỗi cập nhật nhóm' });
    }
  });

  app.delete('/api/kpi-groups/:id', async (req, res) => {
    try {
      const success = await dbStore.deleteKpiGroup(req.params.id);
      if (!success) return res.status(404).json({ error: 'Không tìm thấy nhóm cần xóa' });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Lỗi xóa nhóm' });
    }
  });

  // --- KPI Settings APIs ---
  app.get('/api/kpi-settings', async (req, res) => {
    try {
      const allSettings = await dbStore.getKpiSettings();
      const { groupId, idolId } = req.query as { groupId?: string; idolId?: string };
      if (groupId) {
        return res.json(allSettings.filter(s => s.groupId === groupId));
      }
      if (idolId) {
        return res.json(allSettings.filter(s => s.assignedIdolId === idolId));
      }
      res.json(allSettings);
    } catch (err) {
      res.status(500).json({ error: 'Không thể tải danh sách chỉ tiêu KPI' });
    }
  });

  app.post('/api/kpi-settings', async (req, res) => {
    try {
      const created = await dbStore.createKpiSetting(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Lỗi tạo chỉ tiêu KPI' });
    }
  });

  app.put('/api/kpi-settings/:id', async (req, res) => {
    try {
      const updated = await dbStore.updateKpiSetting(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy chỉ tiêu KPI' });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Lỗi cập nhật chỉ tiêu KPI' });
    }
  });

  app.delete('/api/kpi-settings/:id', async (req, res) => {
    try {
      const success = await dbStore.deleteKpiSetting(req.params.id);
      if (!success) return res.status(404).json({ error: 'Không tìm thấy chỉ tiêu KPI' });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Lỗi xóa chỉ tiêu KPI' });
    }
  });

  app.get('/api/operational-metrics', async (req, res) => {
    try {
      const { personnelId, period } = req.query as { personnelId?: string; period?: string };
      res.json(await dbStore.getOperationalMetrics(personnelId, period));
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Không thể tải số liệu vận hành' });
    }
  });

  app.put('/api/operational-metrics', async (req, res) => {
    try {
      res.json(await dbStore.upsertOperationalMetric(req.body));
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Không thể lưu số liệu vận hành' });
    }
  });

  app.get('/api/operational-kpi/:personnelId', async (req, res) => {
    try {
      const period = typeof req.query.period === 'string' ? req.query.period : new Date().toISOString().slice(0, 7);
      res.json(await dbStore.getOperationalKpi(req.params.personnelId, period));
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Không thể tổng hợp KPI vận hành' });
    }
  });

  // --- REVENUE MANAGEMENT APIs ---
  // 1. Categories
  app.get('/api/service-usage', async (req, res) => {
    try {
      const personnelId = Number(req.query.personnelId);
      if (!Number.isInteger(personnelId) || personnelId <= 0) return res.status(400).json({ error: 'personnelId không hợp lệ' });
      res.json(await dbStore.getServiceUsageRecords(personnelId));
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Không thể tải lịch sử sử dụng dịch vụ' });
    }
  });

  app.get('/api/service-usage/accounting', async (_req, res) => {
    try {
      res.json(await dbStore.getServiceUsageAccountingRecords());
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Không thể tải dịch vụ ngoài chờ thanh toán' });
    }
  });

  app.get('/api/service-usage/assigned', async (req, res) => {
    try {
      const userId = Number((req as any).authUser?.id || 0);
      if (!userId) return res.status(401).json({ error: 'Chưa xác định tài khoản thực hiện' });
      res.json(await dbStore.getAssignedServiceUsageRecords(userId));
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Không thể tải công việc dịch vụ được giao' });
    }
  });

  app.get('/api/service-usage/assignees', async (_req, res) => {
    try {
      res.json(await dbStore.getServiceUsageAssignees());
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Không thể tải danh sách người thực hiện' });
    }
  });

  app.post('/api/service-usage', async (req, res) => {
    try {
      const created = await dbStore.createServiceUsageRecord({
        ...req.body,
        createdById: Number((req as any).authUser?.id || 0) || undefined
      });
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Không thể tạo lịch sử sử dụng dịch vụ' });
    }
  });

  app.put('/api/service-usage/:id', async (req, res) => {
    try {
      const updated = await dbStore.updateServiceUsageRecord(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy lượt sử dụng dịch vụ' });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Không thể cập nhật lịch sử sử dụng dịch vụ' });
    }
  });

  app.delete('/api/service-usage/:id', async (req, res) => {
    try {
      const success = await dbStore.cancelServiceUsageRecord(req.params.id, req.body?.reason, Number((req as any).authUser?.id || 0) || undefined);
      if (!success) return res.status(404).json({ error: 'Không tìm thấy lượt sử dụng dịch vụ' });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Không thể hủy lượt sử dụng dịch vụ' });
    }
  });

  app.post('/api/service-usage/:id/payments', async (req, res) => {
    try {
      const result = await dbStore.confirmServiceUsagePayment(req.params.id, { ...req.body, paidById: Number((req as any).authUser?.id || 0) || undefined });
      if (!result) return res.status(404).json({ error: 'Không tìm thấy dịch vụ hoặc dịch vụ đã huỷ' });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Không thể xác nhận thanh toán dịch vụ' });
    }
  });

  app.get('/api/revenue/categories', async (_req, res) => {
    try {
      const list = await dbStore.getRevenueCategories();
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: 'Không thể tải danh mục nguồn thu' });
    }
  });

  app.post('/api/revenue/categories', async (req, res) => {
    try {
      const created = await dbStore.createRevenueCategory(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Lỗi tạo danh mục nguồn thu' });
    }
  });

  app.put('/api/revenue/categories/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const updated = await dbStore.updateRevenueCategory(id, req.body);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy danh mục' });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Lỗi cập nhật danh mục' });
    }
  });

  app.delete('/api/revenue/categories/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const success = await dbStore.deleteRevenueCategory(id);
      if (!success) return res.status(404).json({ error: 'Không thể xóa danh mục' });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Lỗi xóa danh mục' });
    }
  });

  // 2. Platforms
  app.get('/api/revenue/platforms', async (_req, res) => {
    try {
      const list = await dbStore.getRevenuePlatforms();
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: 'Không thể tải danh sách nền tảng' });
    }
  });

  app.post('/api/revenue/platforms', async (req, res) => {
    try {
      const created = await dbStore.createRevenuePlatform(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Lỗi tạo nền tảng' });
    }
  });

  app.put('/api/revenue/platforms/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const updated = await dbStore.updateRevenuePlatform(id, req.body);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy nền tảng' });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Lỗi cập nhật nền tảng' });
    }
  });

  app.delete('/api/revenue/platforms/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const success = await dbStore.deleteRevenuePlatform(id);
      if (!success) return res.status(404).json({ error: 'Không thể xóa nền tảng' });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Lỗi xóa nền tảng' });
    }
  });

  // 3. Transactions
  app.get('/api/revenue/transactions', async (req, res) => {
    try {
      const { period, personnelId, categoryId, platformId, status } = req.query;
      const list = await dbStore.getRevenueTransactions({
        period: period as string,
        personnelId: personnelId ? Number(personnelId) : undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        platformId: platformId ? Number(platformId) : undefined,
        status: status as string
      });
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: 'Không thể tải danh sách giao dịch doanh thu' });
    }
  });

  app.get('/api/revenue/transactions/:id', async (req, res) => {
    try {
      const item = await dbStore.getRevenueTransactionById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Không tìm thấy giao dịch' });
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: 'Không thể tải giao dịch' });
    }
  });

  app.post('/api/revenue/transactions', async (req, res) => {
    try {
      const created = await dbStore.createRevenueTransaction(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Lỗi tạo giao dịch doanh thu' });
    }
  });

  app.put('/api/revenue/transactions/:id', async (req, res) => {
    try {
      const updated = await dbStore.updateRevenueTransaction(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy giao dịch' });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Lỗi cập nhật giao dịch doanh thu' });
    }
  });

  app.delete('/api/revenue/transactions/:id', async (req, res) => {
    try {
      const success = await dbStore.deleteRevenueTransaction(req.params.id);
      if (!success) return res.status(404).json({ error: 'Không tìm thấy giao dịch' });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Lỗi xóa giao dịch' });
    }
  });

  // 4. Summary & Payroll Sync
  app.get('/api/revenue/summary/:period', async (req, res) => {
    try {
      const summary = await dbStore.getRevenueSummary(req.params.period);
      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: 'Không thể tải tổng hợp doanh thu' });
    }
  });

  app.post('/api/revenue/sync-to-payroll', async (req, res) => {
    try {
      const { period, userAccountId } = req.body;
      if (!period) return res.status(400).json({ error: 'Vui lòng cung cấp kỳ đối soát (period YYYY-MM)' });
      const result = await dbStore.syncRevenueToPayroll(period, userAccountId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Lỗi đồng bộ doanh thu sang bảng lương' });
    }
  });

  // ==========================================
  // PHÂN HỆ TÀI CHÍNH & CHI PHÍ DOANH NGHIỆP (FINANCE & EXPENSES)
  // ==========================================
  app.get('/api/finance/expenses', async (req, res) => {
    try {
      const { period, category, status, facilityType } = req.query;
      const list = await dbStore.getCompanyExpenses({
        period: period as string,
        category: category as string,
        status: status as string,
        facilityType: facilityType as string
      });
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Lỗi tải danh sách chi phí công ty' });
    }
  });

  app.post('/api/finance/expenses', async (req, res) => {
    try {
      const created = await dbStore.createCompanyExpense(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Lỗi tạo phiếu chi' });
    }
  });

  app.put('/api/finance/expenses/:id', async (req, res) => {
    try {
      const updated = await dbStore.updateCompanyExpense(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy khoản chi' });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Lỗi cập nhật khoản chi' });
    }
  });

  app.delete('/api/finance/expenses/:id', async (req, res) => {
    try {
      const success = await dbStore.deleteCompanyExpense(req.params.id);
      if (!success) return res.status(404).json({ error: 'Không tìm thấy khoản chi' });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Lỗi xóa khoản chi' });
    }
  });

  app.get('/api/finance/pnl-summary', async (req, res) => {
    try {
      const scope = (req.query.scope as any) || 'month';
      const periodRef = (req.query.periodRef as string) || (req.query.period as string) || undefined;
      const summary = await dbStore.getFinancePnLSummary(scope, periodRef);
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Lỗi tổng hợp báo cáo tài chính P&L' });
    }
  });

  app.get('/api/finance/trend-series', async (req, res) => {
    try {
      const periodRef = (req.query.periodRef as string) || undefined;
      const count = Number(req.query.count) || 6;
      const trendData = await dbStore.getFinanceTrendSeries(periodRef, count);
      res.json(trendData);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Lỗi lấy chuỗi số liệu xu hướng tài chính' });
    }
  });

  // Vite middleware in dev or static files in prod
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        watch: process.env.DISABLE_HMR === 'true' ? null : {
          ignored: ['**/server/data/**', '**/uploads/**', '**/prisma/**']
        },
        hmr: process.env.DISABLE_HMR !== 'true'
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);

    // Graceful shutdown — close Vite when process exits to prevent orphaned HMR sockets
    const shutdown = async (signal: string) => {
      console.log(`\n[${signal}] Đang tắt server...`);
      await vite.close();
      process.exit(0);
    };
    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const httpServer = app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Aura Talent Server running at http://0.0.0.0:${PORT} [PostgreSQL Database Mode]`);
  });

  // Also close the HTTP server on SIGINT/SIGTERM (for prod mode)
  if (isProd) {
    const shutdown = (signal: string) => {
      console.log(`\n[${signal}] Đang tắt server...`);
      httpServer.close(() => process.exit(0));
    };
    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
  }
}

startServer().catch(err => {
  console.error('Lỗi khởi động server:', err);
  process.exit(1);
});
