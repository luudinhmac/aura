import type { PersonnelColumn, PersonnelCustomFields, UserAccount } from '../types/index.ts';

export type PersonnelFieldSensitivity = 'public' | 'internal' | 'sensitive';

const SENSITIVE_ROLES = new Set(['super_admin', 'director', 'hr_accounting']);

export function canViewPersonnelColumn(column: PersonnelColumn, viewer?: Pick<UserAccount, 'role' | 'isSuperAdmin' | 'department'>): boolean {
  const sensitivity = column.sensitivity || 'public';
  if (sensitivity === 'public') return true;
  if (!viewer) return false;
  if (viewer.isSuperAdmin || viewer.role === 'super_admin') return true;
  if (sensitivity === 'internal') return true;
  return SENSITIVE_ROLES.has(viewer.role) || viewer.department?.toLowerCase().includes('hr') === true;
}

export function filterPersonnelCustomFields(
  fields: PersonnelCustomFields | undefined,
  columns: PersonnelColumn[],
  viewer?: Pick<UserAccount, 'role' | 'isSuperAdmin' | 'department'>
): PersonnelCustomFields {
  if (!fields) return {};
  const allowedKeys = new Set(columns.filter((column) => canViewPersonnelColumn(column, viewer)).map((column) => column.key));
  return Object.fromEntries(Object.entries(fields).filter(([key]) => allowedKeys.has(key))) as PersonnelCustomFields;
}

