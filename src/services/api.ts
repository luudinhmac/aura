import { Idol, Criterion, IdolScoreRecord, IdolTask, WorkAssignment, ColumnHeadersConfig, AppSettings, AppSettingsUpdate, UserAccount, ApprovalRequest, WorkScheduleSlot, LeaveRequest, PayrollPeriod, PayrollRecord, MacroPayrollSummary, PayrollScopeType, AggregatedPayrollPersonnel, KpiGroup, KpiSetting, CompanyExpense, FinancePnLSummary, FinanceTrendData, OperationalMetric, OperationalKpiSummary, PersonnelColumn, ServiceUsageRecord } from '../types/index.ts';

const API_BASE = '/api';

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let sessionExpiredHandler: (() => void) | null = null;
const rawFetch = globalThis.fetch.bind(globalThis);

function isAuthEndpoint(input: RequestInfo | URL): boolean {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  return url.includes('/api/auth/login') || url.includes('/api/auth/refresh') || url.includes('/api/auth/logout');
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await rawFetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Refresh session thất bại');
      const body = await res.json() as { accessToken?: string };
      accessToken = body.accessToken || null;
      if (!accessToken) throw new Error('Refresh response thiếu access token');
      return accessToken;
    } catch {
      accessToken = null;
      sessionExpiredHandler?.();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}, retry = true): Promise<Response> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await rawFetch(input, { ...init, headers, credentials: init.credentials || 'include' });
  if (response.status !== 401 || !retry || isAuthEndpoint(input)) return response;
  const refreshed = await refreshAccessToken();
  if (!refreshed) return response;
  const retryHeaders = new Headers(init.headers);
  retryHeaders.set('Authorization', `Bearer ${refreshed}`);
  return rawFetch(input, { ...init, headers: retryHeaders, credentials: init.credentials || 'include' });
}

const fetch = apiFetch;

export const api = {
  setSessionExpiredHandler(handler: (() => void) | null) {
    sessionExpiredHandler = handler;
  },

  async restoreSession(): Promise<UserAccount | null> {
    const token = await refreshAccessToken();
    if (!token) return null;
    const res = await fetch(`${API_BASE}/auth/me`);
    if (!res.ok) return null;
    const body = await res.json() as { user?: UserAccount };
    return body.user || null;
  },

  clearAccessToken() {
    accessToken = null;
  },

  // Idols
  async getIdols(): Promise<Idol[]> {
    const res = await fetch(`${API_BASE}/idols`);
    if (!res.ok) throw new Error('Không thể tải danh sách idol');
    return res.json();
  },

  async getIdolById(id: string): Promise<Idol> {
    const res = await fetch(`${API_BASE}/idols/${id}`);
    if (!res.ok) throw new Error('Không tìm thấy idol');
    return res.json();
  },

  async getPersonnelActivityTypes(): Promise<import('../types/index.ts').PersonnelActivityType[]> {
    const res = await fetch(`${API_BASE}/personnel-activity-types`);
    if (!res.ok) throw new Error('Không thể tải danh mục hoạt động');
    return res.json();
  },

  async createIdol(data: Partial<Idol>): Promise<Idol> {
    const res = await fetch(`${API_BASE}/idols`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Không thể tạo nhân sự mới');
    return body as Idol;
  },

  async updateIdol(id: string, data: Partial<Idol>): Promise<Idol> {
    const res = await fetch(`${API_BASE}/idols/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Không thể cập nhật idol');
    return res.json();
  },

  async getPersonnelSalaryHistory(id: string): Promise<Array<{ id: string; personnelId: number; salaryAmount: number; effectiveFrom?: string; effectiveTo?: string; currency: string; reason?: string; source: string; createdAt: string }>> {
    const res = await fetch(`${API_BASE}/idols/${id}/salary-history`);
    if (!res.ok) throw new Error('Không thể tải lịch sử lương');
    return res.json();
  },

  async changePersonnelSalary(id: string, data: { salaryAmount: number; effectiveFrom: string; reason: string; source?: string }): Promise<unknown> {
    const res = await fetch(`${API_BASE}/idols/${id}/salary-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Không thể cập nhật lịch sử lương');
    return body;
  },

  async deleteIdol(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/idols/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Không thể xóa idol');
  },

  async getServiceUsageRecords(personnelId: string | number): Promise<ServiceUsageRecord[]> {
    const res = await fetch(`${API_BASE}/service-usage?personnelId=${encodeURIComponent(String(personnelId))}`);
    if (!res.ok) throw new Error('Không thể tải lịch sử sử dụng dịch vụ');
    return res.json();
  },

  async getServiceUsageAccountingRecords(): Promise<ServiceUsageRecord[]> {
    const res = await fetch(`${API_BASE}/service-usage/accounting`);
    if (!res.ok) throw new Error('Không thể tải dịch vụ ngoài chờ thanh toán');
    return res.json();
  },

  async getAssignedServiceUsageRecords(): Promise<ServiceUsageRecord[]> {
    const res = await fetch(`${API_BASE}/service-usage/assigned`);
    if (!res.ok) throw new Error('Không thể tải công việc dịch vụ được giao');
    return res.json();
  },

  async getServiceUsageAssignees(): Promise<UserAccount[]> {
    const res = await fetch(`${API_BASE}/service-usage/assignees`);
    if (!res.ok) throw new Error('Không thể tải danh sách người thực hiện');
    return res.json();
  },

  async createServiceUsageRecord(data: Partial<ServiceUsageRecord>): Promise<ServiceUsageRecord> {
    const res = await fetch(`${API_BASE}/service-usage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Không thể tạo lịch sử sử dụng dịch vụ');
    return body;
  },

  async updateServiceUsageRecord(id: string, data: Partial<ServiceUsageRecord>): Promise<ServiceUsageRecord> {
    const res = await fetch(`${API_BASE}/service-usage/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Không thể cập nhật lịch sử sử dụng dịch vụ');
    return body;
  },

  async cancelServiceUsageRecord(id: string, reason: string): Promise<void> {
    const res = await fetch(`${API_BASE}/service-usage/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
    if (!res.ok) throw new Error('Không thể hủy lượt sử dụng dịch vụ');
  },

  async confirmServiceUsagePayment(id: string, data: { amount?: number; categoryId?: number; platformId?: number; reference?: string; note?: string }): Promise<ServiceUsageRecord> {
    const res = await fetch(`${API_BASE}/service-usage/${encodeURIComponent(id)}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Không thể xác nhận thanh toán dịch vụ');
    return body;
  },

  // Upload Avatar to server directory with duplicate detection
  async uploadAvatar(file: File): Promise<{ url: string; filename: string; isDuplicate?: boolean; message?: string }> {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Lỗi khi tải ảnh lên máy chủ');
    }
    return res.json();
  },

  // Criteria
  async getCriteria(): Promise<Criterion[]> {
    const res = await fetch(`${API_BASE}/criteria`);
    if (!res.ok) throw new Error('Không thể tải danh sách tiêu chí');
    return res.json();
  },

  async createCriterion(data: Partial<Criterion>): Promise<Criterion> {
    const res = await fetch(`${API_BASE}/criteria`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Không thể thêm tiêu chí');
    return res.json();
  },

  async updateCriterion(id: string, data: Partial<Criterion>): Promise<Criterion> {
    const res = await fetch(`${API_BASE}/criteria/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Không thể cập nhật tiêu chí');
    return res.json();
  },

  async deleteCriterion(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/criteria/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Không thể xóa tiêu chí');
  },

  async updateCriteriaPriority(criterionIds: string[]): Promise<Criterion[]> {
    const res = await fetch(`${API_BASE}/criteria/priority`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ criterionIds })
    });
    if (!res.ok) throw new Error('Không thể cập nhật thứ tự tiêu chí');
    return res.json();
  },

  // Scores
  async getScores(period?: string): Promise<IdolScoreRecord[]> {
    const url = period ? `${API_BASE}/scores?period=${encodeURIComponent(period)}` : `${API_BASE}/scores`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Không thể tải bảng điểm');
    return res.json();
  },

  async saveScore(record: Partial<IdolScoreRecord>): Promise<IdolScoreRecord> {
    const res = await fetch(`${API_BASE}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (!res.ok) throw new Error('Không thể lưu điểm');
    return res.json();
  },

  async batchSaveScores(records: Partial<IdolScoreRecord>[]): Promise<IdolScoreRecord[]> {
    const res = await fetch(`${API_BASE}/scores/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records })
    });
    if (!res.ok) throw new Error('Không thể lưu nhiều điểm số');
    return res.json();
  },

  // Tasks & Subtasks
  async getTasks(idolId?: string): Promise<IdolTask[]> {
    const url = idolId ? `${API_BASE}/tasks?idolId=${encodeURIComponent(idolId)}` : `${API_BASE}/tasks`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Không thể tải danh sách nhiệm vụ');
    return res.json();
  },

  async createTask(data: Partial<IdolTask>): Promise<IdolTask> {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Không thể tạo nhiệm vụ');
    return res.json();
  },

  async updateTask(id: string, data: Partial<IdolTask>): Promise<IdolTask> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Không thể cập nhật nhiệm vụ');
    return res.json();
  },

  async startTaskTimer(id: string): Promise<IdolTask> {
    const res = await fetch(`${API_BASE}/tasks/${id}/timer/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Không thể bắt đầu bấm giờ nhiệm vụ');
    return res.json();
  },

  async stopTaskTimer(id: string): Promise<IdolTask> {
    const res = await fetch(`${API_BASE}/tasks/${id}/timer/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Không thể dừng và lưu thời gian nhiệm vụ');
    return res.json();
  },

  async deleteTask(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Không thể xóa nhiệm vụ');
  },

  async addSubtask(taskId: string, title: string, timeSpentMinutes = 30): Promise<IdolTask> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, timeSpentMinutes })
    });
    if (!res.ok) throw new Error('Không thể thêm subtask');
    return res.json();
  },

  async updateSubtask(taskId: string, subtaskId: string, data: { completed?: boolean; timeSpentMinutes?: number; title?: string }): Promise<IdolTask> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Không thể cập nhật subtask');
    return res.json();
  },

  async deleteSubtask(taskId: string, subtaskId: string): Promise<IdolTask> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Không thể xóa subtask');
    return res.json();
  },

  // Departments
  async getDepartments(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/departments`);
    if (!res.ok) throw new Error('Không thể tải danh sách đơn vị');
    return res.json();
  },

  async addDepartment(name: string): Promise<string[]> {
    const res = await fetch(`${API_BASE}/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error('Không thể thêm đơn vị');
    return res.json();
  },

  async updateDepartment(oldName: string, newName: string): Promise<string[]> {
    const res = await fetch(`${API_BASE}/departments`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName, newName })
    });
    if (!res.ok) throw new Error('Không thể cập nhật tên đơn vị');
    return res.json();
  },

  async deleteDepartment(name: string): Promise<string[]> {
    const res = await fetch(`${API_BASE}/departments/${encodeURIComponent(name)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Không thể xóa đơn vị');
    return res.json();
  },

  // Column Headers
  async getColumnHeaders(): Promise<ColumnHeadersConfig> {
    const res = await fetch(`${API_BASE}/column-headers`);
    if (!res.ok) throw new Error('Không thể tải tiêu đề cột');
    return res.json();
  },

  async updateColumnHeaders(headers: Partial<ColumnHeadersConfig>, userId?: string): Promise<ColumnHeadersConfig> {
    const res = await fetch(`${API_BASE}/column-headers`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(headers)
    });
    if (!res.ok) throw new Error('Không thể lưu tiêu đề cột');
    return res.json();
  },

  // Dynamic Personnel Columns
  async getPersonnelColumns(includeInactive = false, userId?: string): Promise<PersonnelColumn[]> {
    const query = includeInactive ? '?includeInactive=true' : '';
    const res = await fetch(`${API_BASE}/personnel-columns${query}`);
    if (!res.ok) throw new Error('Không thể tải cấu hình cột nhân sự');
    return res.json();
  },

  async createPersonnelColumn(data: Partial<PersonnelColumn>, userId: string): Promise<PersonnelColumn> {
    const res = await fetch(`${API_BASE}/personnel-columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Không thể tạo cột nhân sự');
    return res.json();
  },

  async updatePersonnelColumn(id: string, data: Partial<PersonnelColumn>, userId: string): Promise<PersonnelColumn> {
    const res = await fetch(`${API_BASE}/personnel-columns/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Không thể cập nhật cột nhân sự');
    return res.json();
  },

  async archivePersonnelColumn(id: string, userId: string): Promise<PersonnelColumn> {
    const res = await fetch(`${API_BASE}/personnel-columns/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Không thể archive cột nhân sự');
    return res.json();
  },

  async restorePersonnelColumn(id: string, userId: string): Promise<PersonnelColumn> {
    const res = await fetch(`${API_BASE}/personnel-columns/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Không thể khôi phục cột nhân sự');
    return res.json();
  },

  async reorderPersonnelColumns(columnIds: string[], userId: string): Promise<PersonnelColumn[]> {
    const res = await fetch(`${API_BASE}/personnel-columns/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columnIds })
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Không thể sắp xếp cột nhân sự');
    return res.json();
  },

  // Settings
  async getSettings(): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Không thể tải cài đặt');
    return res.json();
  },

  async updateSettings(settings: AppSettingsUpdate): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Không thể lưu cài đặt');
    return res.json();
  },

  // Statuses
  async getStatuses(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/statuses`);
    if (!res.ok) throw new Error('Không thể tải danh sách trạng thái');
    return res.json();
  },

  async addStatus(name: string): Promise<string[]> {
    const res = await fetch(`${API_BASE}/statuses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error('Không thể thêm trạng thái');
    return res.json();
  },

  async updateStatus(oldName: string, newName: string): Promise<string[]> {
    const res = await fetch(`${API_BASE}/statuses`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName, newName })
    });
    if (!res.ok) throw new Error('Không thể cập nhật tên trạng thái');
    return res.json();
  },

  async deleteStatus(name: string): Promise<string[]> {
    const res = await fetch(`${API_BASE}/statuses/${encodeURIComponent(name)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể xóa trạng thái');
    }
    return res.json();
  },

  // Personnel Types
  async getPersonnelTypes(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/personnel-types`);
    if (!res.ok) throw new Error('Không thể tải danh sách loại nhân sự');
    return res.json();
  },

  async addPersonnelType(name: string): Promise<string[]> {
    const res = await fetch(`${API_BASE}/personnel-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error('Không thể thêm loại nhân sự');
    return res.json();
  },

  async updatePersonnelType(oldName: string, newName: string): Promise<string[]> {
    const res = await fetch(`${API_BASE}/personnel-types`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName, newName })
    });
    if (!res.ok) throw new Error('Không thể cập nhật tên loại nhân sự');
    return res.json();
  },

  async deletePersonnelType(name: string): Promise<string[]> {
    const res = await fetch(`${API_BASE}/personnel-types/${encodeURIComponent(name)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Không thể xóa loại nhân sự');
    return res.json();
  },

  // Auth
  async login(username: string, password: string): Promise<{ success: boolean; user: UserAccount; accessToken: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Đăng nhập không thành công');
    }
    const body = await res.json() as { success: boolean; user: UserAccount; accessToken: string };
    accessToken = body.accessToken;
    return body;
  },

  async logout(): Promise<void> {
    await apiFetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' }, false);
    accessToken = null;
  },

  async updateProfile(data: {
    userId: string;
    name?: string;
    realName?: string;
    stageName?: string;
    dob?: string;
    hometown?: string;
    height?: number;
    weight?: number;
    phone?: string;
    address?: string;
    avatarUrl?: string;
    currentPassword?: string;
    newPassword?: string;
  }): Promise<{ success: boolean; user: UserAccount }> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Cập nhật hồ sơ thất bại');
    }
    return res.json();
  },

  // Users & Permissions (RBAC)
  async getUsers(): Promise<UserAccount[]> {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error('Không thể tải danh sách tài khoản');
    return res.json();
  },

  async createUser(data: Partial<UserAccount>): Promise<UserAccount> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Không thể tạo tài khoản');
    return res.json();
  },

  async updateUser(id: string, data: Partial<UserAccount>): Promise<UserAccount> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Không thể cập nhật tài khoản');
    return res.json();
  },

  async deleteUser(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Không thể xóa tài khoản');
  },

  async syncUsersWithIdols(): Promise<{ success: boolean; syncedCount: number; users: UserAccount[] }> {
    const res = await fetch(`${API_BASE}/users/sync-idols`, { method: 'POST' });
    if (!res.ok) throw new Error('Không thể đồng bộ tài khoản');
    return res.json();
  },

  // Approvals API
  async getApprovals(status?: string): Promise<ApprovalRequest[]> {
    const url = status ? `${API_BASE}/approvals?status=${encodeURIComponent(status)}` : `${API_BASE}/approvals`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Không thể tải danh sách phê duyệt');
    return res.json();
  },

  async createApproval(data: Partial<ApprovalRequest>): Promise<ApprovalRequest> {
    const res = await fetch(`${API_BASE}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Không thể gửi yêu cầu phê duyệt');
    return res.json();
  },

  async approveRequest(id: string, reviewer: { id: string; name: string }, note?: string): Promise<{ approval: ApprovalRequest; createdIdol?: Idol; deletedIdolId?: string }> {
    const res = await fetch(`${API_BASE}/approvals/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewer, note })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể duyệt yêu cầu');
    }
    return res.json();
  },

  async rejectRequest(id: string, reviewer: { id: string; name: string }, reason?: string): Promise<{ approval: ApprovalRequest }> {
    const res = await fetch(`${API_BASE}/approvals/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewer, reason })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể từ chối yêu cầu');
    }
    return res.json();
  },

  async deleteApproval(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/approvals/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Không thể hủy yêu cầu');
  },

  // Work assignments (Giao công tác / công việc)
  async getWorkAssignments(): Promise<WorkAssignment[]> {
    const res = await fetch(`${API_BASE}/work-assignments`);
    if (!res.ok) throw new Error('Không thể tải danh sách công tác');
    return res.json();
  },

  async createWorkAssignment(data: Partial<WorkAssignment> & { assigneePersonnelIds: string[] }): Promise<WorkAssignment> {
    const res = await fetch(`${API_BASE}/work-assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Không thể tạo công tác');
    }
    return res.json();
  },

  async updateWorkAssignment(id: string, data: Partial<WorkAssignment> & { assigneePersonnelIds?: string[] }): Promise<WorkAssignment> {
    const res = await fetch(`${API_BASE}/work-assignments/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Không thể chỉnh sửa công việc');
    }
    return res.json();
  },

  async cancelWorkAssignment(id: string, reason: string): Promise<WorkAssignment> {
    const res = await fetch(`${API_BASE}/work-assignments/${id}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Không thể hủy công tác');
    return res.json();
  },

  async respondToWorkAssignment(id: string, responseStatus: 'accepted' | 'declined', note?: string): Promise<WorkAssignment> {
    const res = await fetch(`${API_BASE}/work-assignments/${id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responseStatus, note })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Không thể phản hồi công tác');
    }
    return res.json();
  },

  async completeWorkAssignment(id: string, note?: string): Promise<WorkAssignment> {
    const res = await fetch(`${API_BASE}/work-assignments/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Không thể cập nhật hoàn thành công tác');
    }
    return res.json();
  },

  async reviewWorkAssignmentViolation(id: string, personnelId: string, action: 'confirm' | 'waive', note?: string): Promise<WorkAssignment> {
    const res = await fetch(`${API_BASE}/work-assignments/${id}/assignees/${personnelId}/violation`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, note })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Không thể xử lý vi phạm công tác');
    }
    return res.json();
  },

  async requestWorkAssignmentWaiver(id: string, reason: string): Promise<WorkAssignment> {
    const res = await fetch(`${API_BASE}/work-assignments/${id}/waiver-request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Không thể gửi yêu cầu miễn/giảm phạt');
    return res.json();
  },

  async reviewWorkAssignmentWaiver(id: string, personnelId: string, action: 'accept' | 'no_penalty' | 'penalty' | 'reduced_penalty', note?: string, penaltyRate?: number): Promise<WorkAssignment> {
    const res = await fetch(`${API_BASE}/work-assignments/${id}/waiver-review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personnelId, action, note, penaltyRate }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Không thể xử lý yêu cầu miễn/giảm phạt');
    return res.json();
  },

  async getWorkAssignmentDelegations(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/work-assignment-delegations`);
    if (!res.ok) throw new Error('Không thể tải danh sách ủy quyền');
    return res.json();
  },

  async createWorkAssignmentDelegation(data: { delegateId: string; startsAt: string; endsAt: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/work-assignment-delegations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Không thể tạo ủy quyền');
    return res.json();
  },

  async revokeWorkAssignmentDelegation(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/work-assignment-delegations/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Không thể thu hồi ủy quyền');
  },

  // Schedules (Lịch Live Stream & Ca Làm Việc)
  async getSchedules(): Promise<WorkScheduleSlot[]> {
    const res = await fetch(`${API_BASE}/schedules`);
    if (!res.ok) throw new Error('Không thể tải lịch làm việc');
    return res.json();
  },

  async getSchedulesByIdol(idolId: string): Promise<WorkScheduleSlot[]> {
    const res = await fetch(`${API_BASE}/schedules/idol/${idolId}`);
    if (!res.ok) throw new Error('Không thể tải lịch của idol');
    return res.json();
  },

  async createSchedule(data: Partial<WorkScheduleSlot>): Promise<WorkScheduleSlot> {
    const res = await fetch(`${API_BASE}/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Không thể tạo ca làm việc');
    return res.json();
  },

  async updateSchedule(id: string, data: Partial<WorkScheduleSlot>): Promise<WorkScheduleSlot> {
    const res = await fetch(`${API_BASE}/schedules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Không thể cập nhật ca làm việc');
    return res.json();
  },

  async deleteSchedule(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/schedules/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Không thể xóa ca làm việc');
  },

  async batchSetSchedules(idolId: string, slots: Omit<WorkScheduleSlot, 'id' | 'idolId'>[]): Promise<WorkScheduleSlot[]> {
    const res = await fetch(`${API_BASE}/schedules/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idolId, slots })
    });
    if (!res.ok) throw new Error('Không thể cập nhật lịch hàng loạt');
    return res.json();
  },

  // Leave Requests (Hệ thống Xin Nghỉ Phép)
  async getLeaveRequests(idolId?: string): Promise<LeaveRequest[]> {
    const url = idolId ? `${API_BASE}/leave-requests?idolId=${encodeURIComponent(idolId)}` : `${API_BASE}/leave-requests`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Không thể tải danh sách đơn nghỉ phép');
    return res.json();
  },

  async createLeaveRequest(data: Partial<LeaveRequest>): Promise<LeaveRequest> {
    const res = await fetch(`${API_BASE}/leave-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const error = new Error(body?.error || 'Không thể tạo đơn nghỉ phép') as Error & { code?: string; allocation?: unknown; remainingAnnualDays?: number };
      error.code = body?.code;
      error.allocation = body?.allocation;
      error.remainingAnnualDays = body?.remainingAnnualDays;
      throw error;
    }
    return res.json();
  },

  async updateLeaveRequest(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest> {
    const res = await fetch(`${API_BASE}/leave-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Không thể cập nhật đơn nghỉ phép');
    return res.json();
  },

  async deleteLeaveRequest(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/leave-requests/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Không thể xóa đơn nghỉ phép');
  },

  // Payroll Management (Bảng Lương & Phiếu Lương)
  async getPayrolls(): Promise<PayrollPeriod[]> {
    const res = await fetch(`${API_BASE}/payrolls`);
    if (!res.ok) throw new Error('Không thể tải danh sách kỳ lương');
    return res.json();
  },

  async getPayrollMacroSummary(): Promise<MacroPayrollSummary> {
    const res = await fetch(`${API_BASE}/payrolls/macro-summary`);
    if (!res.ok) throw new Error('Không thể tải tổng hợp tài chính vĩ mô');
    return res.json();
  },

  async getAggregatedPayrollPersonnel(scope: PayrollScopeType, key?: string): Promise<AggregatedPayrollPersonnel[]> {
    const params = new URLSearchParams();
    params.append('scope', scope);
    if (key) params.append('key', key);
    const res = await fetch(`${API_BASE}/payrolls/aggregated-records?${params.toString()}`);
    if (!res.ok) throw new Error('Không thể tải danh sách nhân sự lũy kế');
    return res.json();
  },

  async getPayrollById(periodId: string): Promise<PayrollPeriod> {
    const res = await fetch(`${API_BASE}/payrolls/${encodeURIComponent(periodId)}`);
    if (!res.ok) throw new Error('Không thể tải thông tin kỳ lương');
    return res.json();
  },

  async getPayrollRecords(periodId: string, filter?: { department?: string; userId?: string }): Promise<PayrollRecord[]> {
    let url = `${API_BASE}/payrolls/${encodeURIComponent(periodId)}/records`;
    const params = new URLSearchParams();
    if (filter?.department) params.append('department', filter.department);
    if (filter?.userId) params.append('userId', filter.userId);
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Không thể tải danh sách phiếu lương');
    return res.json();
  },

  async getPayrollDisputes(periodId: string): Promise<import('../types/index.ts').PayrollDispute[]> {
    const res = await fetch(`${API_BASE}/payrolls/${encodeURIComponent(periodId)}/disputes`);
    if (!res.ok) throw new Error('Không thể tải phản ánh bảng lương');
    return res.json();
  },

  async getPayrollDisputeInbox(status: 'open' | 'all' = 'open'): Promise<import('../types/index.ts').PayrollDisputeInboxItem[]> {
    const res = await fetch(`${API_BASE}/payroll-disputes/inbox?status=${encodeURIComponent(status)}`);
    if (!res.ok) throw new Error('Không thể tải hộp thư phản ánh bảng lương');
    return res.json();
  },

  async createPayrollDispute(periodId: string, recordId: string, data: {
    category: import('../types/index.ts').PayrollDisputeCategory;
    requestedValue?: Record<string, unknown>;
    reason: string;
    evidenceUrl?: string;
  }): Promise<import('../types/index.ts').PayrollDispute> {
    const res = await fetch(`${API_BASE}/payrolls/${encodeURIComponent(periodId)}/records/${encodeURIComponent(recordId)}/disputes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Không thể tạo phản ánh bảng lương');
    }
    return res.json();
  },

  async updatePayrollDispute(id: string, data: { status: import('../types/index.ts').PayrollDisputeStatus; resolutionNote?: string }): Promise<import('../types/index.ts').PayrollDispute> {
    const res = await fetch(`${API_BASE}/payroll-disputes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Không thể cập nhật phản ánh bảng lương');
    }
    return res.json();
  },

  async cancelPayrollDispute(id: string): Promise<import('../types/index.ts').PayrollDispute> {
    const res = await fetch(`${API_BASE}/payroll-disputes/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Không thể hủy phản ánh bảng lương');
    }
    return res.json();
  },

  async syncPayroll(periodId: string): Promise<{ period: PayrollPeriod; records: PayrollRecord[] }> {
    const res = await fetch(`${API_BASE}/payrolls/${encodeURIComponent(periodId)}/sync`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể đồng bộ bảng lương');
    }
    return res.json();
  },

  async adjustPayrollRecord(
    periodId: string,
    recordId: string,
    data: {
      earnings?: Partial<PayrollRecord['earnings']>;
      deductions?: Partial<PayrollRecord['deductions']>;
      notes?: string;
      reason?: string;
      user?: any;
    }
  ): Promise<PayrollRecord> {
    const res = await fetch(`${API_BASE}/payrolls/${encodeURIComponent(periodId)}/records/${encodeURIComponent(recordId)}/adjust`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể điều chỉnh phiếu lương');
    }
    return res.json();
  },

  async applyHotBonus(
    periodId: string,
    recordId: string,
    amount: number,
    reason: string,
    user?: any
  ): Promise<PayrollRecord> {
    const res = await fetch(`${API_BASE}/payrolls/${encodeURIComponent(periodId)}/records/${encodeURIComponent(recordId)}/hot-bonus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, reason, user })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể ghi nhận thưởng nóng');
    }
    return res.json();
  },

  async submitPayroll(periodId: string, user?: any): Promise<PayrollPeriod> {
    const res = await fetch(`${API_BASE}/payrolls/${encodeURIComponent(periodId)}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user })
    });
    if (!res.ok) throw new Error('Không thể gửi duyệt kỳ lương');
    return res.json();
  },

  async approvePayroll(periodId: string, user?: any): Promise<PayrollPeriod> {
    const res = await fetch(`${API_BASE}/payrolls/${encodeURIComponent(periodId)}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user })
    });
    if (!res.ok) throw new Error('Không thể phê duyệt kỳ lương');
    return res.json();
  },

  async lockPayroll(periodId: string, user?: any): Promise<PayrollPeriod> {
    const res = await fetch(`${API_BASE}/payrolls/${encodeURIComponent(periodId)}/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user })
    });
    if (!res.ok) throw new Error('Không thể khóa sổ kỳ lương');
    return res.json();
  },

  async getMyPayslips(userId: string): Promise<PayrollRecord[]> {
    let url = `${API_BASE}/payrolls/my-payslips/${encodeURIComponent(userId)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Không thể tải phiếu lương của bạn');
    return res.json();
  },

  // KPI Groups
  async getKpiGroups(): Promise<KpiGroup[]> {
    const res = await fetch(`${API_BASE}/kpi-groups`);
    if (!res.ok) throw new Error('Không thể tải danh sách nhóm KPI');
    return res.json();
  },

  async createKpiGroup(data: Partial<KpiGroup>): Promise<KpiGroup> {
    const res = await fetch(`${API_BASE}/kpi-groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể tạo nhóm KPI mới');
    }
    return res.json();
  },

  async updateKpiGroup(id: string, data: Partial<KpiGroup>): Promise<KpiGroup> {
    const res = await fetch(`${API_BASE}/kpi-groups/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể cập nhật nhóm KPI');
    }
    return res.json();
  },

  async deleteKpiGroup(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/kpi-groups/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể xóa nhóm KPI');
    }
  },

  // KPI Settings
  async getKpiSettings(groupId?: string, idolId?: string): Promise<KpiSetting[]> {
    let url = `${API_BASE}/kpi-settings`;
    const params = new URLSearchParams();
    if (groupId) params.append('groupId', groupId);
    if (idolId) params.append('idolId', idolId);
    if (params.toString()) url += `?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Không thể tải danh sách chỉ tiêu KPI');
    return res.json();
  },

  async createKpiSetting(data: Partial<KpiSetting>): Promise<KpiSetting> {
    const res = await fetch(`${API_BASE}/kpi-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể tạo chỉ tiêu KPI');
    }
    return res.json();
  },

  async updateKpiSetting(id: string, data: Partial<KpiSetting>): Promise<KpiSetting> {
    const res = await fetch(`${API_BASE}/kpi-settings/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể cập nhật chỉ tiêu KPI');
    }
    return res.json();
  },

  async deleteKpiSetting(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/kpi-settings/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể xóa chỉ tiêu KPI');
    }
  },

  async getOperationalKpi(personnelId: string, period: string): Promise<OperationalKpiSummary> {
    const res = await fetch(`${API_BASE}/operational-kpi/${encodeURIComponent(personnelId)}?period=${encodeURIComponent(period)}`);
    if (!res.ok) throw new Error('Không thể tải KPI vận hành');
    return res.json();
  },

  async getOperationalMetrics(personnelId: string, period: string): Promise<OperationalMetric[]> {
    const res = await fetch(`${API_BASE}/operational-metrics?personnelId=${encodeURIComponent(personnelId)}&period=${encodeURIComponent(period)}`);
    if (!res.ok) throw new Error('Không thể tải số liệu vận hành');
    return res.json();
  },

  async upsertOperationalMetric(data: Partial<OperationalMetric>): Promise<OperationalMetric> {
    const res = await fetch(`${API_BASE}/operational-metrics`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể lưu số liệu vận hành');
    }
    return res.json();
  },

  // Company Expenses & Finance P&L
  async getCompanyExpenses(filter?: { period?: string; category?: string; status?: string; facilityType?: string }): Promise<CompanyExpense[]> {
    const params = new URLSearchParams();
    if (filter?.period) params.append('period', filter.period);
    if (filter?.category) params.append('category', filter.category);
    if (filter?.status) params.append('status', filter.status);
    if (filter?.facilityType) params.append('facilityType', filter.facilityType);
    const res = await fetch(`${API_BASE}/finance/expenses?${params.toString()}`);
    if (!res.ok) throw new Error('Không thể tải danh sách chi phí công ty');
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return [];
    return res.json();
  },

  async createCompanyExpense(data: Partial<CompanyExpense>): Promise<CompanyExpense> {
    const res = await fetch(`${API_BASE}/finance/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể tạo phiếu chi');
    }
    return res.json();
  },

  async updateCompanyExpense(id: string, data: Partial<CompanyExpense>): Promise<CompanyExpense> {
    const res = await fetch(`${API_BASE}/finance/expenses/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể cập nhật khoản chi');
    }
    return res.json();
  },

  async deleteCompanyExpense(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/finance/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Không thể xóa khoản chi');
  },

  async getFinancePnLSummary(scope: string = 'month', periodRef: string = '2025-10'): Promise<FinancePnLSummary> {
    const res = await fetch(`${API_BASE}/finance/pnl-summary?scope=${encodeURIComponent(scope)}&periodRef=${encodeURIComponent(periodRef)}`);
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || !ct.includes('application/json')) {
      throw new Error('Không thể tải báo cáo tài chính P&L (Máy chủ đang khởi động hoặc chưa có dữ liệu)');
    }
    return res.json();
  },

  async getFinanceTrendSeries(periodRef: string = '2025-10', count: number = 6): Promise<FinanceTrendData> {
    const res = await fetch(`${API_BASE}/finance/trend-series?periodRef=${encodeURIComponent(periodRef)}&count=${count}`);
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || !ct.includes('application/json')) {
      throw new Error('Không thể tải chuỗi số liệu xu hướng tài chính');
    }
    return res.json();
  },

  // Audit Logs (Nhật ký hệ thống cho Super Admin)
  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    search?: string;
    method?: string;
    resource?: string;
    statusCode?: number;
    category?: 'all' | 'data' | 'auth';
    statusGroup?: 'all' | '2xx' | '4xx_5xx';
    fromDate?: string;
    toDate?: string;
  }): Promise<import('../types/index.ts').AuditLogPage> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.method && params.method !== 'ALL') query.set('method', params.method);
    if (params?.resource && params.resource !== 'all') query.set('resource', params.resource);
    if (params?.statusCode) query.set('statusCode', String(params.statusCode));
    if (params?.category && params.category !== 'all') query.set('category', params.category);
    if (params?.statusGroup && params.statusGroup !== 'all') query.set('statusGroup', params.statusGroup);
    if (params?.fromDate) query.set('fromDate', params.fromDate);
    if (params?.toDate) query.set('toDate', params.toDate);
    const qs = query.toString();
    const res = await fetch(`${API_BASE}/admin/audit-logs${qs ? `?${qs}` : ''}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể tải nhật ký hệ thống');
    }
    return res.json();
  },

  // Reset demo data
  async resetDatabase(): Promise<void> {
    const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('Không thể đặt lại dữ liệu');
  }
};


