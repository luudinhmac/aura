import { PersonnelColumn } from '../types/index.ts';
import { formatDateVN } from './dateUtils.ts';

export function getRosterCustomColumns(columns: PersonnelColumn[]): PersonnelColumn[] {
  return columns
    .filter(column => column.isActive && column.showInRoster && !column.isSystem)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getProfileCustomColumns(columns: PersonnelColumn[]): PersonnelColumn[] {
  return columns
    .filter(column => column.isActive && column.showInProfile && !column.isSystem)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function mergeRosterVisibility(
  previous: Record<string, boolean>,
  columns: PersonnelColumn[]
): Record<string, boolean> {
  const next = { ...previous };
  getRosterCustomColumns(columns).forEach(column => {
    if (next[column.key] === undefined) {
      next[column.key] = column.isVisible;
    }
  });
  return next;
}

export function formatPersonnelColumnValue(column: PersonnelColumn, value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (column.type === 'boolean') return value === true || value === 'true' ? 'Có' : 'Không';
  if (column.type === 'date') return formatDateVN(String(value));
  if (column.type === 'number' && typeof value === 'number') {
    return new Intl.NumberFormat('vi-VN').format(value);
  }
  return String(value);
}
