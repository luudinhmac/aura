import assert from 'node:assert/strict';
import test from 'node:test';
import { PersonnelColumn } from '../src/types/index.ts';
import {
  formatPersonnelColumnValue,
  getProfileCustomColumns,
  getRosterCustomColumns,
  mergeRosterVisibility,
} from '../src/utils/personnelColumnUtils.ts';
import { canViewPersonnelColumn, filterPersonnelCustomFields } from '../src/utils/personnelFieldAccess.ts';

const column = (overrides: Partial<PersonnelColumn>): PersonnelColumn => ({
  id: overrides.key || 'test-column',
  key: overrides.key || 'testColumn',
  label: overrides.label || 'Test column',
  type: overrides.type || 'text',
  required: false,
  isVisible: true,
  isActive: true,
  sortOrder: 0,
  showInRoster: true,
  showInProfile: true,
  isSystem: false,
  ...overrides,
});

test('getRosterCustomColumns filters inactive, hidden and system columns, then sorts by sortOrder', () => {
  const columns = [
    column({ key: 'late', sortOrder: 20 }),
    column({ key: 'system', isSystem: true, sortOrder: 1 }),
    column({ key: 'inactive', isActive: false, sortOrder: 2 }),
    column({ key: 'profileOnly', showInRoster: false, sortOrder: 3 }),
    column({ key: 'early', sortOrder: 5 }),
  ];

  assert.deepEqual(getRosterCustomColumns(columns).map(item => item.key), ['early', 'late']);
});

test('getProfileCustomColumns only returns active profile columns in metadata order', () => {
  const columns = [
    column({ key: 'profileLate', sortOrder: 20 }),
    column({ key: 'rosterOnly', showInProfile: false, sortOrder: 1 }),
    column({ key: 'profileEarly', sortOrder: 5 }),
    column({ key: 'systemProfile', isSystem: true, sortOrder: 0 }),
  ];

  assert.deepEqual(getProfileCustomColumns(columns).map(item => item.key), ['profileEarly', 'profileLate']);
});

test('mergeRosterVisibility preserves existing preferences and initializes new columns from metadata', () => {
  const previous = { stageName: true, existing: false };
  const columns = [
    column({ key: 'existing', isVisible: true }),
    column({ key: 'newVisible', isVisible: true }),
    column({ key: 'newHidden', isVisible: false }),
  ];

  assert.deepEqual(mergeRosterVisibility(previous, columns), {
    stageName: true,
    existing: false,
    newVisible: true,
    newHidden: false,
  });
});

test('formatPersonnelColumnValue formats supported custom field types', () => {
  assert.equal(formatPersonnelColumnValue(column({ type: 'text' }), 'Có gia đình'), 'Có gia đình');
  assert.equal(formatPersonnelColumnValue(column({ type: 'select' }), 'Độc thân'), 'Độc thân');
  assert.equal(formatPersonnelColumnValue(column({ type: 'number' }), 1250000), '1.250.000');
  assert.equal(formatPersonnelColumnValue(column({ type: 'date' }), '2025-10-29'), '29/10/2025');
  assert.equal(formatPersonnelColumnValue(column({ type: 'boolean' }), true), 'Có');
  assert.equal(formatPersonnelColumnValue(column({ type: 'boolean' }), false), 'Không');
  assert.equal(formatPersonnelColumnValue(column({ type: 'text' }), null), '-');
});

test('field access denies sensitive values without an authorized viewer', () => {
  const sensitiveColumn = column({ sensitivity: 'sensitive' });
  assert.equal(canViewPersonnelColumn(sensitiveColumn), false);
  assert.equal(canViewPersonnelColumn(sensitiveColumn, { role: 'viewer', isSuperAdmin: false, department: 'Nhóm Idol Gaming & Gear' }), false);
  assert.equal(canViewPersonnelColumn(sensitiveColumn, { role: 'custom', isSuperAdmin: false, department: 'HR & Kế Toán' }), true);
  assert.equal(canViewPersonnelColumn(sensitiveColumn, { role: 'super_admin', isSuperAdmin: true, department: 'Ban Giám Đốc' }), true);
});

test('field access filters only unauthorized custom fields and preserves public values', () => {
  const columns = [
    column({ key: 'publicField', sensitivity: 'public' }),
    column({ key: 'secretField', sensitivity: 'sensitive' })
  ];
  const values = { publicField: 'visible', secretField: 'hidden' };
  assert.deepEqual(filterPersonnelCustomFields(values, columns, { role: 'viewer', isSuperAdmin: false, department: 'Idol' }), { publicField: 'visible' });
  assert.deepEqual(filterPersonnelCustomFields(values, columns, { role: 'custom', isSuperAdmin: false, department: 'HR & Kế Toán' }), values);
});
