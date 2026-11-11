export type AuthorizationUser = {
  accountType?: 'system_admin' | 'personnel';
  isSuperAdmin?: boolean;
  isBusinessAdmin?: boolean;
  role?: string;
  roleTitle?: string;
  department?: string;
  allowedActions?: string[];
};

export function isSuperAdmin(user: AuthorizationUser | undefined): boolean {
  return user?.accountType === 'system_admin';
}

export function hasAction(user: AuthorizationUser | undefined, action: string): boolean {
  return isSuperAdmin(user) || user?.isBusinessAdmin === true || !!user?.allowedActions?.includes(action);
}

export function isDirector(user: AuthorizationUser | undefined): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  const roleTitle = user.roleTitle?.toLowerCase() || '';
  const department = user.department?.toLowerCase() || '';
  return user.role === 'director' || roleTitle.includes('giám đốc') || department.includes('ban giám đốc');
}

export type RoutePolicy = {
  methods: string[];
  pattern: RegExp;
  action?: string;
  anyActions?: string[];
  superAdminOnly?: boolean;
};

export const routePolicies: RoutePolicy[] = [
  { methods: ['POST'], pattern: /^\/upload$/, action: 'manage_idols' },
  { methods: ['POST', 'PUT'], pattern: /^\/idols(?:\/|$)/, action: 'manage_idols' },
  { methods: ['DELETE'], pattern: /^\/idols\/[^/]+$/, superAdminOnly: true },
  { methods: ['POST'], pattern: /^\/idols\/[^/]+\/salary-history$/, action: 'manage_payroll' },
  { methods: ['POST', 'PUT', 'DELETE'], pattern: /^\/criteria(?:\/|$)/, action: 'manage_criteria' },
  { methods: ['POST'], pattern: /^\/scores(?:\/|$)/, action: 'manage_scores' },
  { methods: ['POST'], pattern: /^\/work-assignments\/[^/]+\/(?:respond|complete|waiver-request)$/, action: undefined },
  { methods: ['POST'], pattern: /^\/work-assignments\/[^/]+\/cancel$/, action: 'manage_work_assignments' },
  { methods: ['POST'], pattern: /^\/work-assignments\/[^/]+\/waiver-review$/, action: undefined },
  { methods: ['POST'], pattern: /^\/work-assignments$/, action: 'manage_work_assignments' },
  { methods: ['PUT'], pattern: /^\/work-assignments\/[^/]+$/, action: 'manage_work_assignments' },
  { methods: ['GET', 'POST', 'DELETE'], pattern: /^\/work-assignment-delegations(?:\/|$)/, action: undefined },
  { methods: ['POST', 'PUT', 'DELETE'], pattern: /^\/departments(?:\/|$)/, action: 'manage_departments' },
  { methods: ['PUT'], pattern: /^\/column-headers$/, superAdminOnly: true },
  { methods: ['POST', 'PUT', 'DELETE'], pattern: /^\/personnel-columns(?:\/|$)/, superAdminOnly: true },
  { methods: ['PUT'], pattern: /^\/settings$/, action: 'manage_settings' },
  { methods: ['POST', 'PUT', 'DELETE'], pattern: /^\/schedules(?:\/|$)/, action: 'manage_schedule' },
  { methods: ['POST', 'PUT', 'DELETE'], pattern: /^\/(?:statuses|personnel-types)(?:\/|$)/, action: 'manage_settings' },
  { methods: ['GET', 'POST', 'PUT', 'DELETE'], pattern: /^\/users(?:\/|$)/, superAdminOnly: true },
  { methods: ['POST'], pattern: /^\/approvals\/[^/]+\/(?:approve|reject)$/, action: 'manage_approvals' },
  { methods: ['DELETE'], pattern: /^\/approvals\/[^/]+$/, action: 'manage_approvals' },
  { methods: ['GET', 'POST'], pattern: /^\/leave-requests$/, action: undefined },
  { methods: ['PUT', 'DELETE'], pattern: /^\/leave-requests\/[^/]+$/, action: 'manage_approvals' },
  { methods: ['POST'], pattern: /^\/reset$/, superAdminOnly: true },
  { methods: ['POST'], pattern: /^\/payrolls\/[^/]+\/(?:sync|submit|lock)$/, action: 'manage_payroll' },
  { methods: ['PUT'], pattern: /^\/payrolls\/[^/]+\/records\/[^/]+\/adjust$/, action: 'adjust_payroll' },
  { methods: ['POST'], pattern: /^\/payrolls\/[^/]+\/records\/[^/]+\/hot-bonus$/, action: 'hot_bonus' },
  { methods: ['POST'], pattern: /^\/payrolls\/[^/]+\/approve$/, action: 'approve_payroll' },
  { methods: ['GET', 'POST'], pattern: /^\/payrolls\/[^/]+\/disputes$/, action: undefined },
  { methods: ['POST'], pattern: /^\/payrolls\/[^/]+\/records\/[^/]+\/disputes$/, action: undefined },
  { methods: ['PUT', 'DELETE'], pattern: /^\/payroll-disputes\/[^/]+$/, action: undefined },
  { methods: ['POST', 'PUT', 'DELETE'], pattern: /^\/kpi-groups(?:\/|$)/, action: 'manage_kpi' },
  { methods: ['POST', 'PUT', 'DELETE'], pattern: /^\/kpi-settings(?:\/|$)/, action: 'manage_kpi' },
  { methods: ['PUT'], pattern: /^\/operational-metrics$/, action: 'manage_kpi' },
  { methods: ['POST', 'PUT', 'DELETE'], pattern: /^\/revenue\/(?:categories|platforms|transactions)(?:\/|$)/, action: 'manage_revenue' },
  { methods: ['GET'], pattern: /^\/service-usage\/assignees$/, anyActions: ['manage_revenue', 'manage_idols'] },
  { methods: ['POST', 'PUT', 'DELETE'], pattern: /^\/service-usage(?:\/|$)/, anyActions: ['manage_revenue', 'manage_idols'] },
  { methods: ['POST'], pattern: /^\/revenue\/sync-to-payroll$/, action: 'manage_revenue' },
  { methods: ['POST', 'PUT', 'DELETE'], pattern: /^\/finance\/expenses(?:\/|$)/, action: 'adjust_payroll' }
];

export function findRoutePolicy(method: string, path: string): RoutePolicy | undefined {
  const normalizedMethod = method.toUpperCase();
  return routePolicies.find((policy) => policy.methods.includes(normalizedMethod) && policy.pattern.test(path));
}
