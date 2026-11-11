import { UserAccount } from '../types/index.ts';

export type DashboardPersona =
  | 'system_admin'
  | 'director'
  | 'talent_management'
  | 'team_leader'
  | 'hr_finance'
  | 'commercial'
  | 'content_production'
  | 'livestream_operations'
  | 'idol'
  | 'staff';

const normalize = (value?: string) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const hasRole = (user: UserAccount, ...roles: string[]) =>
  roles.some((role) => user.roleCodes?.includes(role));

/** Selects the primary dashboard without treating an unrelated staff account as an Idol. */
export const getDashboardPersona = (user: UserAccount): DashboardPersona => {
  const department = normalize(user.department);
  const title = normalize(user.roleTitle);

  if (user.accountType === 'system_admin' || user.isSuperAdmin || hasRole(user, 'system_admin')) return 'system_admin';
  if (hasRole(user, 'director') || department.includes('ban giam doc') || title.includes('giam doc')) return 'director';
  if (hasRole(user, 'talent_head', 'talent_executive') || department.includes('quan ly') || department.includes('phat trien idol')) return 'talent_management';
  if (hasRole(user, 'leader_gaming_gear', 'leader_performance_donate', 'leader_live_commerce') || title.includes('truong nhom')) return 'team_leader';
  if (department.includes('hr') || department.includes('ke toan') || title.includes('nhan su') || title.includes('ke toan')) return 'hr_finance';
  if (department.includes('kinh doanh') || department.includes('marketing') || department.includes('booking') || title.includes('booking')) return 'commercial';
  if (department.includes('noi dung') || department.includes('san xuat') || department.includes('truyen thong')) return 'content_production';
  if (department.includes('van hanh') || department.includes('livestream') || title.includes('ky thuat')) return 'livestream_operations';
  if (user.idolId) return 'idol';
  return 'staff';
};
