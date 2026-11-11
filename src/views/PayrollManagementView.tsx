import React, { useState, useEffect, useMemo } from 'react';
import { Idol, PayrollDispute, PayrollDisputeStatus, PayrollPeriod, PayrollRecord, UserAccount, MacroPayrollSummary, PayrollScopeType, AggregatedPayrollPersonnel } from '../types/index.ts';
import { api } from '../services/api.ts';
import { PayslipModal } from '../components/PayslipModal.tsx';
import { calculateOvertimePay, getTodayIsoDate } from '../utils/dateUtils.ts';
import { countExpectedPayrollPersonnel } from '../utils/payrollReconciliation.ts';
import { isIdolDepartment } from '../types/roles.ts';
import { canApprovePayroll, canSubmitPayroll, isPayrollDirector } from '../utils/payrollWorkflowPermissions.ts';
import { getPayrollDisplayStatus, PAYROLL_DISPLAY_STATUS_LABELS } from '../utils/payrollDisplayStatus.ts';
import { canLockOrPayPayroll, canSubmitOrApprovePayroll, getPayrollCalendarDates } from '../utils/payrollCalendar.ts';
import { PAYROLL_DISPUTE_CATEGORY_LABELS, PAYROLL_DISPUTE_STATUS_LABELS, formatPayrollCalendarDate } from '../utils/payrollDisputePresentation.ts';
import { notify } from '../utils/uiFeedback.ts';
import { MoneyInput } from '../components/MoneyInput.tsx';
import { calculatePayrollDeductions } from '../utils/payrollDeductions.ts';

interface PayrollManagementViewProps {
  currentUser: UserAccount;
  departments: string[];
  personnelTypes?: string[];
  idols?: Idol[];
  users?: UserAccount[];
  referenceDate?: string;
  initialAdjustmentTarget?: { periodId: string; recordId: string; disputeId?: string } | null;
  onAdjustmentTargetConsumed?: () => void;
  onAdjustmentCompleted?: (disputeId: string) => void;
}

export const PayrollManagementView: React.FC<PayrollManagementViewProps> = ({
  currentUser,
  departments,
  personnelTypes = ['Công ty', 'Cộng tác viên', 'Thực tập sinh', 'Dịch vụ ngoài'],
  idols = [],
  users = [],
  referenceDate,
  initialAdjustmentTarget = null,
  onAdjustmentTargetConsumed,
  onAdjustmentCompleted
}) => {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phạm vi thống kê: 'month' (Theo Tháng) | 'quarter' (Theo Quý) | 'year' (Theo Năm) | 'all' (Toàn Thời Gian)
  const [scope, setScope] = useState<PayrollScopeType>('month');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('2025-Q4');
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [macroSummary, setMacroSummary] = useState<MacroPayrollSummary | null>(null);
  const [aggregatedPersonnel, setAggregatedPersonnel] = useState<AggregatedPayrollPersonnel[]>([]);
  const [aggLoading, setAggLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [snapshotFilter, setSnapshotFilter] = useState<'all' | 'legacy_evidence' | 'missing_snapshot'>('all');

  // Phân tách 3 Nhóm Idol Chuyên Biệt và Khối Phòng Ban Quản Lý Vận Hành
  const { idolTeams, corporateDepts } = useMemo(() => {
    const idol: string[] = [];
    const corporate: string[] = [];
    departments.forEach((dept) => {
      if (isIdolDepartment(dept)) {
        idol.push(dept);
      } else {
        corporate.push(dept);
      }
    });
    return { idolTeams: idol, corporateDepts: corporate };
  }, [departments]);

  // Modals state
  const [viewingRecord, setViewingRecord] = useState<PayrollRecord | null>(null);
  const [hotBonusRecord, setHotBonusRecord] = useState<PayrollRecord | null>(null);
  const [adjustingRecord, setAdjustingRecord] = useState<PayrollRecord | null>(null);
  const [adjustingDisputeId, setAdjustingDisputeId] = useState<string | null>(null);

  // Hot bonus form state
  const [hotBonusAmount, setHotBonusAmount] = useState<number>(2000000);
  const [hotBonusReason, setHotBonusReason] = useState<string>('');

  // Adjust form state
  const [adjustForm, setAdjustForm] = useState<{
    baseSalary: number;
    contractBaseSalary: number;
    standardWorkDays: number;
    actualWorkDays: number;
    otNormalHours: number;
    otWeekendHours: number;
    otHolidayHours: number;
    overtimePay: number;
    workAssignmentBaseHours: number;
    workAssignmentPremiumHours: number;
    workAssignmentBasePay: number;
    workAssignmentPremiumPay: number;
    workAssignmentPay: number;
    workAssignmentRestDay: string;
    kpiBonus: number;
    commissionGmv: number;
    giftShare: number;
    allowance: number;
    liveHoursPenalty: number;
    advancePayment: number;
    tax: number;
    insurance: number;
    notes: string;
    reason: string;
  }>({
    baseSalary: 0,
    contractBaseSalary: 0,
    standardWorkDays: 26,
    actualWorkDays: 26,
    otNormalHours: 0,
    otWeekendHours: 0,
    otHolidayHours: 0,
    overtimePay: 0,
    workAssignmentBaseHours: 0,
    workAssignmentPremiumHours: 0,
    workAssignmentBasePay: 0,
    workAssignmentPremiumPay: 0,
    workAssignmentPay: 0,
    workAssignmentRestDay: '',
    kpiBonus: 0,
    commissionGmv: 0,
    giftShare: 0,
    allowance: 0,
    liveHoursPenalty: 0,
    advancePayment: 0,
    tax: 0,
    insurance: 0,
    notes: '',
    reason: ''
  });

  const adjustmentTaxableIncome = useMemo(
    () =>
      Math.max(
        0,
        (Number(adjustForm.baseSalary) || 0) +
          (Number(adjustForm.overtimePay) || 0) +
          (Number(adjustForm.kpiBonus) || 0) +
          (Number(adjustForm.commissionGmv) || 0) +
          (Number(adjustForm.giftShare) || 0) +
          (Number(adjustForm.allowance) || 0) +
          (Number(adjustingRecord?.earnings.hotBonus) || 0) +
          (Number(adjustingRecord?.earnings.otherBonus) || 0)
      ),
    [adjustForm.baseSalary, adjustForm.overtimePay, adjustForm.kpiBonus, adjustForm.commissionGmv, adjustForm.giftShare, adjustForm.allowance, adjustingRecord?.earnings.hotBonus, adjustingRecord?.earnings.otherBonus]
  );

  const automaticAdjustmentDeductions = useMemo(
    () =>
      calculatePayrollDeductions({
        contractSalary: adjustForm.contractBaseSalary,
        taxableIncome: adjustmentTaxableIncome,
        personnelType: adjustingRecord?.personnelType
      }),
    [adjustForm.contractBaseSalary, adjustmentTaxableIncome, adjustingRecord?.personnelType]
  );

  const adjustmentGross = adjustmentTaxableIncome;

  const adjustmentTotalDeductions = useMemo(
    () =>
      (Number(adjustForm.liveHoursPenalty) || 0) +
      (Number(adjustingRecord?.deductions.unpaidLeaveDeduction) || 0) +
      (Number(adjustForm.advancePayment) || 0) +
      automaticAdjustmentDeductions.tax +
      automaticAdjustmentDeductions.employeeInsurance +
      (Number(adjustingRecord?.deductions.otherPenalty) || 0),
    [adjustForm.liveHoursPenalty, adjustingRecord?.deductions.unpaidLeaveDeduction, adjustForm.advancePayment, automaticAdjustmentDeductions, adjustingRecord?.deductions.otherPenalty]
  );

  const adjustmentNetSalary = Math.max(0, adjustmentGross - adjustmentTotalDeductions);
  const adjustmentNetDelta = adjustmentNetSalary - (adjustingRecord?.netSalary || 0);

  // In-app Action Confirmation Modal State (thay thế window.confirm để không bao giờ bị chặn)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant: 'amber' | 'indigo' | 'emerald';
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: '',
    variant: 'indigo',
    onConfirm: async () => {}
  });

  // In-app Toast Notification (thay thế alert)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Phản ánh được quản lý tại phân hệ riêng; giữ các giá trị tương thích để không hiển thị panel legacy.
  const canReviewDisputes = false;
  const openDisputes: PayrollDispute[] = [];
  const visibleDisputes: PayrollDispute[] = [];
  const disputeListLoading = false;
  const disputeListError = null;
  const disputeStatusFilter = 'open';
  const setDisputeStatusFilter = (_value: React.SetStateAction<'open' | 'all'>) => {};
  const disputeResolutionNotes: Record<string, string> = {};
  const setDisputeResolutionNotes = (_value: React.SetStateAction<Record<string, string>>) => {};
  const disputeActionLoading: string | null = null;
  const handleReviewDispute = async (_dispute: PayrollDispute, _status: PayrollDisputeStatus) => {};

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Permissions detection
  const isDirector = useMemo(() => {
    return isPayrollDirector(currentUser);
  }, [currentUser]);

  const isAccountant = useMemo(() => {
    return (
      canSubmitPayroll(currentUser) ||
      (!isDirector && currentUser.allowedActions?.includes('adjust_payroll'))
    );
  }, [isDirector, currentUser]);

  const isHR = useMemo(() => {
    return (
      isDirector ||
      isAccountant ||
      currentUser.department?.includes('HR') ||
      currentUser.roleTitle?.includes('Nhân Sự') ||
      currentUser.allowedActions?.includes('manage_payroll')
    );
  }, [isDirector, isAccountant, currentUser]);

  // Load periods on mount or when referenceDate changes
  useEffect(() => {
    fetchPeriods();
  }, [referenceDate]);

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, macro] = await Promise.all([
        api.getPayrolls(),
        api.getPayrollMacroSummary().catch(() => null)
      ]);
      setPeriods(data);
      if (macro) setMacroSummary(macro);
      if (data.length > 0) {
        if (!selectedPeriodId || !data.some(p => p.id === selectedPeriodId)) {
          setSelectedPeriodId(data[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách kỳ lương');
    } finally {
      setLoading(false);
    }
  };

  // Danh sách các năm có trong hệ thống
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    periods.forEach(p => {
      if (p.period && p.period.length >= 4) {
        set.add(p.period.slice(0, 4));
      }
    });
    return Array.from(set).sort().reverse();
  }, [periods]);

  // Danh sách các quý có trong hệ thống
  const availableQuarters = useMemo(() => {
    const map = new Map<string, { key: string; label: string; year: string; quarter: string }>();
    periods.forEach(p => {
      const [y, mStr] = p.period.split('-');
      const m = Number(mStr);
      if (y && m) {
        const qNum = Math.ceil(m / 3);
        const qKey = `${y}-Q${qNum}`;
        if (!map.has(qKey)) {
          map.set(qKey, {
            key: qKey,
            label: `Quý ${qNum}/${y}`,
            year: y,
            quarter: `Q${qNum}`
          });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [periods]);

  // Đồng bộ selectedQuarter và selectedYear theo kỳ tháng được chọn ban đầu
  useEffect(() => {
    if (selectedPeriodId) {
      const p = periods.find(p => p.id === selectedPeriodId);
      if (p) {
        const [y, mStr] = p.period.split('-');
        const m = Number(mStr);
        if (y && m) {
          const qNum = Math.ceil(m / 3);
          setSelectedYear(y);
          setSelectedQuarter(`${y}-Q${qNum}`);
        }
      }
    }
  }, [selectedPeriodId, periods]);

  // Tải danh sách nhân sự lũy kế khi đổi scope
  useEffect(() => {
    if (scope !== 'month') {
      fetchAggregatedPersonnel();
    }
  }, [scope, selectedQuarter, selectedYear]);

  const fetchAggregatedPersonnel = async () => {
    try {
      setAggLoading(true);
      const key = scope === 'quarter' ? selectedQuarter : scope === 'year' ? selectedYear : undefined;
      const data = await api.getAggregatedPayrollPersonnel(scope, key);
      setAggregatedPersonnel(data);
    } catch (err: any) {
      console.error('Lỗi tải danh sách nhân sự lũy kế:', err);
    } finally {
      setAggLoading(false);
    }
  };

  // Load records when period changes
  useEffect(() => {
    if (selectedPeriodId) {
      fetchRecords(selectedPeriodId);
    }
  }, [selectedPeriodId]);

  const fetchRecords = async (periodId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPayrollRecords(periodId);
      setRecords(data);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách phiếu lương');
    } finally {
      setLoading(false);
    }
  };

  const currentPeriod = useMemo(() => {
    return periods.find((p) => p.id === selectedPeriodId);
  }, [periods, selectedPeriodId]);


  // Đối soát số lượng nhân sự hợp lệ (Idol & Nhân viên vận hành/quản lý) với số phiếu lương hiện có
  const discrepancyInfo = useMemo(() => {
    if (!currentPeriod) return null;
    // Đối soát theo cùng nguồn dữ liệu với backend: hồ sơ personnel. Không cộng UserAccount
    // độc lập vì system_admin và các tài khoản đăng nhập không phải là bản ghi tính lương.
    const expectedCount = countExpectedPayrollPersonnel(idols || [], currentPeriod.period);
    const actualCount = records.length;
    if (expectedCount !== actualCount) {
      return {
        hasMismatch: true,
        expectedCount,
        actualCount,
        diff: Math.abs(expectedCount - actualCount)
      };
    }
    return { hasMismatch: false, expectedCount, actualCount, diff: 0 };
  }, [currentPeriod, idols, users, records]);

  const snapshotInfo = useMemo(() => {
    const legacyCount = records.filter(r => r.snapshotSource === 'legacy_evidence').length;
    const missingCount = records.filter(r => r.snapshotSource === 'missing_snapshot').length;
    return { legacyCount, missingCount };
  }, [records]);

  const canMutateSelectedPeriod = currentPeriod?.status === 'draft' || currentPeriod?.status === 'pending_approval';
  const effectiveReferenceDate = getTodayIsoDate(referenceDate);
  const payrollCalendar = currentPeriod ? getPayrollCalendarDates(currentPeriod.period) : null;
  const canSubmitOrApproveByCalendar = payrollCalendar ? canSubmitOrApprovePayroll(effectiveReferenceDate, payrollCalendar) : false;
  const canLockOrPayByCalendar = currentPeriod && payrollCalendar
    ? canLockOrPayPayroll(currentPeriod.status, effectiveReferenceDate, payrollCalendar)
    : false;
  const workflowCalendarMessage = currentPeriod && payrollCalendar
    ? currentPeriod.status === 'draft' && !canSubmitOrApproveByCalendar
      ? `Chưa đến ngày trình duyệt (${formatPayrollCalendarDate(payrollCalendar.approvalStartsAt)}).`
      : currentPeriod.status === 'pending_approval' && !canSubmitOrApproveByCalendar
        ? `Chưa đến ngày phê duyệt (${formatPayrollCalendarDate(payrollCalendar.approvalStartsAt)}).`
        : currentPeriod.status === 'approved' && !canLockOrPayByCalendar
          ? `Chỉ được khóa sổ và chi từ ngày ${formatPayrollCalendarDate(payrollCalendar.lockStartsAt)}.`
          : null
    : null;

  const handleManualSync = async () => {
    if (!selectedPeriodId) return;
    try {
      setActionLoading(true);
      const res = await api.syncPayroll(selectedPeriodId);
      setRecords(res.records);
      setPeriods(prev => prev.map(p => p.id === res.period.id ? res.period : p));
    } catch (err: any) {
      setError(err.message || 'Không thể đối soát đồng bộ');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        searchQuery === '' ||
        r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.stageName && r.stageName.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchDept = true;
      if (selectedDept === 'all') {
        matchDept = true;
      } else if (selectedDept === 'block:idol') {
        matchDept = r.isIdol || isIdolDepartment(r.department);
      } else if (selectedDept === 'block:corporate') {
        matchDept = !r.isIdol && !isIdolDepartment(r.department);
      } else {
        matchDept = r.department === selectedDept;
      }

      let matchType = true;
      if (selectedType === 'all') {
        matchType = true;
      } else if (selectedType === 'role:idol') {
        matchType = r.isIdol;
      } else if (selectedType === 'role:staff') {
        matchType = !r.isIdol;
      } else {
        matchType = (r.personnelType || 'Công ty') === selectedType;
      }

      const matchSnapshot = snapshotFilter === 'all' || r.snapshotSource === snapshotFilter;
      return matchSearch && matchDept && matchType && matchSnapshot;
    });
  }, [records, searchQuery, selectedDept, selectedType, snapshotFilter]);

  // Filter aggregated personnel
  const filteredAggPersonnel = useMemo(() => {
    return aggregatedPersonnel.filter((p) => {
      const matchSearch =
        searchQuery === '' ||
        p.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.stageName && p.stageName.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchDept = true;
      if (selectedDept === 'all') {
        matchDept = true;
      } else if (selectedDept === 'block:idol') {
        matchDept = p.isIdol || isIdolDepartment(p.department);
      } else if (selectedDept === 'block:corporate') {
        matchDept = !p.isIdol && !isIdolDepartment(p.department);
      } else {
        matchDept = p.department === selectedDept;
      }

      let matchType = true;
      if (selectedType === 'all') {
        matchType = true;
      } else if (selectedType === 'role:idol') {
        matchType = p.isIdol;
      } else if (selectedType === 'role:staff') {
        matchType = !p.isIdol;
      } else {
        matchType = (p.personnelType || 'Công ty') === selectedType;
      }

      return matchSearch && matchDept && matchType;
    });
  }, [aggregatedPersonnel, searchQuery, selectedDept, selectedType]);

  // Aggregate stats theo scope
  const stats = useMemo(() => {
    let gross = 0;
    let kpi = 0;
    let hot = 0;
    let deductions = 0;
    let net = 0;
    let companyInsurance = 0;
    let companyLaborCost = 0;

    if (scope === 'month') {
      filteredRecords.forEach((r) => {
        gross += r.earnings?.totalGross || 0;
        kpi += (r.earnings?.kpiBonus || 0) + (r.earnings?.commissionGmv || 0) + (r.earnings?.giftShare || 0);
        hot += r.earnings?.hotBonus || 0;
        deductions += r.deductions?.totalDeductions || 0;
        net += r.netSalary || 0;
        const cIns = r.companyInsuranceAmount ?? (r.personnelType === 'Công ty' ? Math.round((r.earnings?.baseSalary || 0) * 0.215) : 0);
        companyInsurance += cIns;
        companyLaborCost += r.totalCompanyLaborCost ?? ((r.earnings?.totalGross || 0) + cIns);
      });
    } else {
      filteredAggPersonnel.forEach((p) => {
        gross += p.totalGross || 0;
        kpi += p.totalKpiBonus || 0;
        hot += p.totalHotBonus || 0;
        deductions += p.totalDeductions || 0;
        net += p.totalNet || 0;
        const estCIns = p.personnelType === 'Công ty' ? Math.round((p.totalBaseSalary || 0) * 0.215) : 0;
        companyInsurance += estCIns;
        companyLaborCost += (p.totalGross || 0) + estCIns;
      });
    }

    return { gross, kpi, hot, deductions, net, companyInsurance, companyLaborCost };
  }, [scope, filteredRecords, filteredAggPersonnel]);

  const scopeInfo = useMemo(() => {
    if (scope === 'month') {
      return {
        title: `Kỳ Tháng ${currentPeriod?.period ? currentPeriod.period.replace('-', '/') : ''}`,
        badge: currentPeriod?.status === 'locked_paid' ? 'Đã chi trả' : currentPeriod?.status === 'approved' ? 'Đã duyệt' : 'Dự thảo',
        subtext: `${filteredRecords.length} nhân sự nhận chuyển khoản`
      };
    } else if (scope === 'quarter') {
      const q = availableQuarters.find(q => q.key === selectedQuarter);
      const qPeriods = periods.filter(p => {
        const [y, mStr] = p.period.split('-');
        const qNum = Math.ceil(Number(mStr) / 3);
        return `${y}-Q${qNum}` === selectedQuarter;
      });
      return {
        title: q ? q.label : selectedQuarter,
        badge: `Lũy kế ${qPeriods.length} tháng`,
        subtext: `${filteredAggPersonnel.length} nhân sự được chi trả (${qPeriods.map(p => 'T' + p.period.slice(5)).join(', ')})`
      };
    } else if (scope === 'year') {
      const yPeriods = periods.filter(p => p.period.startsWith(selectedYear));
      return {
        title: `Cả Năm ${selectedYear}`,
        badge: `Tổng hợp ${yPeriods.length} kỳ lương`,
        subtext: `${filteredAggPersonnel.length} nhân sự hoạt động năm ${selectedYear}`
      };
    } else {
      return {
        title: `Toàn Thời Gian (Lũy Kế)`,
        badge: `Toàn bộ ${periods.length} kỳ lương`,
        subtext: `Từ ngày thành lập (2022) đến nay`
      };
    }
  }, [scope, currentPeriod, selectedQuarter, selectedYear, periods, availableQuarters, filteredRecords.length, filteredAggPersonnel.length]);

  // Submit for approval (Kế toán)
  const handleSubmitApproval = () => {
    if (!currentPeriod) return;
    setConfirmModal({
      isOpen: true,
      title: 'Trình Giám Đốc Phê Duyệt',
      description: `Xác nhận gửi Bảng Lương kỳ ${currentPeriod.period.replace('-', '/')} để Giám Đốc phê duyệt? Sau khi gửi, bảng lương sẽ chuyển sang trạng thái "Chờ Giám Đốc Duyệt".`,
      confirmText: '📤 Xác Nhận Gửi Duyệt',
      variant: 'amber',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await api.submitPayroll(currentPeriod.id, {
            id: currentUser.id,
            name: currentUser.name,
            roleTitle: currentUser.roleTitle
          });
          await fetchPeriods();
          if (selectedPeriodId) await fetchRecords(selectedPeriodId);
          showToast(`Đã gửi bảng lương kỳ ${currentPeriod.period.replace('-', '/')} trình Giám Đốc phê duyệt thành công!`);
        } catch (err: any) {
          showToast(err.message || 'Lỗi khi gửi duyệt', 'error');
        } finally {
          setActionLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Director approve
  const handleApprovePayroll = () => {
    if (!currentPeriod) return;
    setConfirmModal({
      isOpen: true,
      title: 'Giám Đốc Phê Duyệt Bảng Lương',
      description: `XÁC NHẬN PHÊ DUYỆT BẢNG LƯƠNG kỳ ${currentPeriod.period.replace('-', '/')}?\n\nSau khi duyệt, phiếu lương sẽ được mở khóa chính thức cho nhân viên theo dõi.`,
      confirmText: '★ Xác Nhận Phê Duyệt',
      variant: 'indigo',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await api.approvePayroll(currentPeriod.id, {
            id: currentUser.id,
            name: currentUser.name
          });
          await fetchPeriods();
          if (selectedPeriodId) await fetchRecords(selectedPeriodId);
          showToast(`Giám Đốc đã phê duyệt Bảng Lương kỳ ${currentPeriod.period.replace('-', '/')} thành công!`);
        } catch (err: any) {
          showToast(err.message || 'Lỗi khi phê duyệt', 'error');
        } finally {
          setActionLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Lock and mark paid
  const handleLockPayroll = () => {
    if (!currentPeriod) return;
    setConfirmModal({
      isOpen: true,
      title: 'Khóa Sổ Và Xác Nhận Chi Trả Lương',
      description: `XÁC NHẬN KHÓA SỔ VÀ ĐỐI SOÁT CHI TRẢ kỳ ${currentPeriod.period.replace('-', '/')}?\n\nTất cả phiếu lương sẽ được đóng dấu "ĐÃ CHI TRẢ".`,
      confirmText: '🔒 Khóa Sổ & Hoàn Tất Chi',
      variant: 'emerald',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await api.lockPayroll(currentPeriod.id, {
            id: currentUser.id,
            name: currentUser.name
          });
          await fetchPeriods();
          if (selectedPeriodId) await fetchRecords(selectedPeriodId);
          showToast(`Đã khóa sổ và xác nhận hoàn tất chi trả lương kỳ ${currentPeriod.period.replace('-', '/')}!`);
        } catch (err: any) {
          showToast(err.message || 'Lỗi khi khóa sổ', 'error');
        } finally {
          setActionLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Open Hot Bonus Modal
  const openHotBonus = (rec: PayrollRecord) => {
    setHotBonusRecord(rec);
    setHotBonusAmount(rec.earnings.hotBonus || 2000000);
    setHotBonusReason(rec.earnings.hotBonusReason || '');
  };

  // Save Hot Bonus
  const handleSaveHotBonus = async () => {
    if (!hotBonusRecord || !currentPeriod) return;
    if (hotBonusAmount <= 0) {
      notify('Vui lòng nhập số tiền thưởng nóng hợp lệ lớn hơn 0', 'warning');
      return;
    }
    if (!hotBonusReason.trim()) {
      notify('Vui lòng nhập lý do Giám Đốc khen thưởng nóng', 'warning');
      return;
    }

    try {
      setActionLoading(true);
      await api.applyHotBonus(
        currentPeriod.id,
        hotBonusRecord.id,
        hotBonusAmount,
        hotBonusReason.trim(),
        {
          id: currentUser.id,
          name: currentUser.name
        }
      );
      setHotBonusRecord(null);
      await fetchPeriods();
      await fetchRecords(currentPeriod.id);
      notify(`Đã ghi nhận Thưởng Nóng ${hotBonusAmount.toLocaleString('vi-VN')} đ cho ${hotBonusRecord.employeeName}!`, 'success');
    } catch (err: any) {
      notify(err.message || 'Lỗi khi ghi nhận thưởng nóng', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Adjust Modal
  const openAdjustModal = (rec: PayrollRecord) => {
    setAdjustingRecord(rec);
    const contractSalary = rec.earnings.contractBaseSalary || rec.earnings.baseSalary || 0;
    const automaticDeductions = calculatePayrollDeductions({ contractSalary, personnelType: rec.personnelType });
    const stdDays = rec.earnings.standardWorkDays || 26;
    const actDays = rec.earnings.actualWorkDays !== undefined ? rec.earnings.actualWorkDays : stdDays;

    setAdjustForm({
      baseSalary: rec.earnings.baseSalary || 0,
      contractBaseSalary: contractSalary,
      standardWorkDays: stdDays,
      actualWorkDays: actDays,
      otNormalHours: rec.earnings.otNormalHours || 0,
      otWeekendHours: rec.earnings.otWeekendHours || 0,
      otHolidayHours: rec.earnings.otHolidayHours || 0,
      overtimePay: rec.earnings.overtimePay || 0,
      workAssignmentBaseHours: rec.earnings.workAssignmentBaseHours || 0,
      workAssignmentPremiumHours: rec.earnings.workAssignmentPremiumHours || 0,
      workAssignmentBasePay: rec.earnings.workAssignmentBasePay || 0,
      workAssignmentPremiumPay: rec.earnings.workAssignmentPremiumPay || 0,
      workAssignmentPay: rec.earnings.workAssignmentPay || 0,
      workAssignmentRestDay: rec.earnings.workAssignmentRestDay || '',
      kpiBonus: rec.earnings.kpiBonus || 0,
      commissionGmv: rec.earnings.commissionGmv || 0,
      giftShare: rec.earnings.giftShare || 0,
      allowance: rec.earnings.allowance || 0,
      liveHoursPenalty: rec.deductions.liveHoursPenalty || 0,
      advancePayment: rec.deductions.advancePayment || 0,
      tax: automaticDeductions.tax,
      insurance: automaticDeductions.employeeInsurance,
      notes: rec.notes || '',
      reason: ''
    });
  };

  useEffect(() => {
    if (!initialAdjustmentTarget) return;
    if (selectedPeriodId !== initialAdjustmentTarget.periodId) {
      setSelectedPeriodId(initialAdjustmentTarget.periodId);
      return;
    }
    const record = records.find((item) => item.id === initialAdjustmentTarget.recordId);
    if (record) {
      setAdjustingDisputeId(initialAdjustmentTarget.disputeId || null);
      openAdjustModal(record);
      onAdjustmentTargetConsumed?.();
    }
  }, [initialAdjustmentTarget, selectedPeriodId, records]);

  // Save Adjustments
  const handleSaveAdjust = async () => {
    if (!adjustingRecord || !currentPeriod) return;

    try {
      setActionLoading(true);
      await api.adjustPayrollRecord(
        currentPeriod.id,
        adjustingRecord.id,
        {
          earnings: {
            baseSalary: adjustForm.baseSalary,
            contractBaseSalary: adjustForm.contractBaseSalary,
            standardWorkDays: adjustForm.standardWorkDays,
            actualWorkDays: adjustForm.actualWorkDays,
            otNormalHours: adjustForm.otNormalHours,
            otWeekendHours: adjustForm.otWeekendHours,
            otHolidayHours: adjustForm.otHolidayHours,
            overtimePay: adjustForm.overtimePay,
            workAssignmentBaseHours: adjustForm.workAssignmentBaseHours,
            workAssignmentPremiumHours: adjustForm.workAssignmentPremiumHours,
            workAssignmentBasePay: adjustForm.workAssignmentBasePay,
            workAssignmentPremiumPay: adjustForm.workAssignmentPremiumPay,
            workAssignmentPay: adjustForm.workAssignmentPay,
            workAssignmentRestDay: adjustForm.workAssignmentRestDay,
            kpiBonus: adjustForm.kpiBonus,
            commissionGmv: adjustForm.commissionGmv,
            giftShare: adjustForm.giftShare,
            allowance: adjustForm.allowance
          },
          deductions: {
            liveHoursPenalty: adjustForm.liveHoursPenalty,
            advancePayment: adjustForm.advancePayment,
            tax: automaticAdjustmentDeductions.tax,
            insurance: automaticAdjustmentDeductions.employeeInsurance
          },
          notes: adjustForm.notes,
          reason: adjustForm.reason || 'Kế toán điều chỉnh đối soát',
          user: {
            id: currentUser.id,
            name: currentUser.name
          }
        }
      );
      if (adjustingDisputeId) {
        await api.updatePayrollDispute(adjustingDisputeId, { status: 'adjusted' });
        onAdjustmentCompleted?.(adjustingDisputeId);
      }
      setAdjustingDisputeId(null);
      setAdjustingRecord(null);
      await fetchPeriods();
      await fetchRecords(currentPeriod.id);
      notify('Đã cập nhật phiếu lương thành công!', 'success');
    } catch (err: any) {
      notify(err.message || 'Lỗi khi cập nhật phiếu lương', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Export Bank CSV
  const handleExportBankCSV = () => {
    if (scope === 'month') {
      if (!filteredRecords.length || !currentPeriod) return;
      const headers = [
        'STT',
        'Họ và tên',
        'Nghệ danh',
        'Tên Ngân Hàng',
        'Số Tài Khoản (STK)',
        'Chủ Tài Khoản',
        'Số Tiền Thực Nhận (VNĐ)',
        'Nội Dung Chuyển Khoản'
      ];
      headers.splice(7, 0, 'Snapshot Source');
      const rows = filteredRecords.map((r, idx) => [
        idx + 1,
        `"${r.employeeName}"`,
        `"${r.stageName || ''}"`,
        `"${r.bankInfo?.bankName || ''}"`,
        `"${r.bankInfo?.accountNumber || ''}"`,
        `"${r.bankInfo?.accountName || ''}"`,
        r.netSalary,
        `"${r.snapshotSource || 'unknown'}"`,
        `"Aura Talent chi luong T${currentPeriod.period.replace('-', '')} cho ${r.employeeName}"`
      ]);
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Aura_Bang_Ke_Ngan_Hang_${currentPeriod.period}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      if (!filteredAggPersonnel.length) return;
      const headers = [
        'STT',
        'Họ và tên',
        'Nghệ danh',
        'Chức Danh',
        'Phòng Ban',
        'Số Kỳ Tham Gia',
        'Tên Ngân Hàng',
        'Số Tài Khoản (STK)',
        'Chủ Tài Khoản',
        'Tổng Thực Nhận (VNĐ)',
        'Giai Đoạn'
      ];
      const rows = filteredAggPersonnel.map((p, idx) => [
        idx + 1,
        `"${p.employeeName}"`,
        `"${p.stageName || ''}"`,
        `"${p.roleTitle || (p.isIdol ? 'Idol' : 'Nhân sự')}"`,
        `"${p.department}"`,
        p.periodCount,
        `"${p.bankInfo?.bankName || ''}"`,
        `"${p.bankInfo?.accountNumber || ''}"`,
        `"${p.bankInfo?.accountName || ''}"`,
        p.totalNet,
        `"Luy ke ${scopeInfo.title}"`
      ]);
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Aura_Tong_Hop_Chi_Tra_${scope}_${scope === 'quarter' ? selectedQuarter : scope === 'year' ? selectedYear : 'AllTime'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Bộ điều khiển kỳ lương */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 font-black text-sm">
              💳
            </span>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                Quản Lý Bảng Lương & Chi Trả
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  scope === 'month'
                    ? (currentPeriod?.status === 'locked_paid'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : currentPeriod?.status === 'approved'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : currentPeriod?.status === 'pending_approval'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200')
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  {scope === 'month'
                    ? (currentPeriod?.status === 'locked_paid'
                      ? '✓ Đã Chi Trả & Khóa Sổ'
                      : currentPeriod?.status === 'approved'
                      ? '★ Đã Giám Đốc Duyệt'
                      : currentPeriod?.status === 'pending_approval'
                      ? '⏳ Chờ Giám Đốc Duyệt'
                      : '📝 Bản Dự Thảo (Draft)')
                    : scopeInfo.badge}
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Quy trình 4 cấp: HR kiểm tra hợp đồng ➔ Kế toán đối soát & giảm trừ ➔ Giám đốc duyệt & thưởng nóng ➔ Xuất file ngân hàng.
              </p>
            </div>
          </div>
        </div>

        {/* Thao tác quy trình (Duyệt, Khóa sổ, Xuất CSV) */}
        <div className="flex flex-wrap items-center gap-2" aria-label="Thao tác quy trình bảng lương">
          {scope === 'month' && isDirector && currentPeriod?.status === 'draft' && (
            <span className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl">
              Chờ HR/Kế toán trình duyệt
            </span>
          )}
          {scope === 'month' && isDirector && currentPeriod?.status === 'pending_approval' && (
            <span className="px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl">
              Đang chờ Giám đốc phê duyệt
            </span>
          )}
          {/* Nút Kế toán: Gửi duyệt (khi ở view tháng) */}
          {scope === 'month' && isAccountant && !isDirector && currentPeriod?.status === 'draft' && (
            <button
              type="button"
              disabled={actionLoading || !canMutateSelectedPeriod || !canSubmitOrApproveByCalendar}
              title={!canSubmitOrApproveByCalendar && payrollCalendar ? `Chỉ được trình từ ngày ${payrollCalendar.approvalStartsAt}` : undefined}
              onClick={handleSubmitApproval}
              className="px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              📤 Trình Giám Đốc Duyệt
            </button>
          )}

          {/* Nút Giám Đốc: Phê duyệt (khi ở view tháng) */}
          {scope === 'month' && isDirector && canApprovePayroll(currentUser) && currentPeriod?.status === 'pending_approval' && (
            <button
              type="button"
              disabled={actionLoading || !canMutateSelectedPeriod || !canSubmitOrApproveByCalendar}
              title={!canSubmitOrApproveByCalendar && payrollCalendar ? `Chỉ được phê duyệt từ ngày ${payrollCalendar.approvalStartsAt}` : undefined}
              onClick={handleApprovePayroll}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              ★ Giám Đốc Phê Duyệt
            </button>
          )}

          {/* Nút Khóa sổ & chi trả (khi ở view tháng) */}
          {scope === 'month' && isDirector && currentPeriod?.status === 'approved' && (
            <button
              type="button"
              disabled={actionLoading || !canLockOrPayByCalendar}
              title={!canLockOrPayByCalendar && payrollCalendar ? `Chỉ được khóa sổ và chi từ ngày ${payrollCalendar.lockStartsAt} khi kỳ đã phê duyệt` : undefined}
              onClick={handleLockPayroll}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              🔒 Khóa Sổ & Xác Nhận Chi
            </button>
          )}

          {/* Xuất file ngân hàng */}
          <button
            type="button"
            onClick={handleExportBankCSV}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
          >
            📥 Xuất File Ngân Hàng (CSV)
          </button>
          {workflowCalendarMessage && (
            <span className="w-full text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5" role="status">
              ⏳ {workflowCalendarMessage}
            </span>
          )}
        </div>
      </div>

      {/* Thanh Điều Hướng Thời Gian Đa Tầng (Tháng / Quý / Năm / Toàn Thời Gian) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Bộ chuyển đổi phạm vi thống kê */}
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setScope('month')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              scope === 'month'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <span>📅</span> Theo Tháng
          </button>
          <button
            type="button"
            onClick={() => setScope('quarter')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              scope === 'quarter'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <span>📊</span> Theo Quý
          </button>
          <button
            type="button"
            onClick={() => setScope('year')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              scope === 'year'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <span>📈</span> Theo Năm
          </button>
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              scope === 'all'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <span>🌐</span> Toàn Thời Gian (Lũy Kế)
          </button>
        </div>

        {/* Bộ chọn chi tiết theo phạm vi */}
        <div className="flex flex-wrap items-center gap-3">
          {scope === 'month' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Chọn Kỳ:</span>
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    Kỳ Tháng {p.period.replace('-', '/')} ({p.status === 'locked_paid' ? 'Đã chi' : p.status === 'approved' ? 'Đã duyệt' : 'Dự thảo'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {scope === 'quarter' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Chọn Quý:</span>
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {availableQuarters.map((q) => (
                  <option key={q.key} value={q.key}>
                    {q.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {scope === 'year' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Chọn Năm:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    Năm {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {scope === 'all' && (
            <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3.5 py-1.5 rounded-xl border border-indigo-200">
              Tổng hợp toàn diện từ 01/2022 đến nay ({periods.length} kỳ lương đã giải ngân)
            </div>
          )}

          {/* Nút Đối Soát & Đồng Bộ: Chỉ hiển thị khi có sự sai lệch đối soát (trong Month mode) */}
          {scope === 'month' && discrepancyInfo?.hasMismatch && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleManualSync}
              className="px-3.5 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 animate-pulse"
              title="Phát hiện lệch số lượng nhân sự: click để đối soát & đồng bộ lại ngay"
            >
              ⚠️ Lệch Đối Soát: Đồng Bộ Lại ({discrepancyInfo.actualCount}/{discrepancyInfo.expectedCount})
            </button>
          )}
        </div>
      </div>

      {/* Cảnh báo khi có sự sai lệch đối soát nhân sự (chỉ hiện khi có mismatch) */}
      {scope === 'month' && discrepancyInfo?.hasMismatch && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">⚠️</span>
            <div>
              <strong>Cảnh Báo Đối Soát Dữ Liệu:</strong> Hồ sơ nhân sự có <strong>{discrepancyInfo.expectedCount}</strong> người gia nhập trước/trong kỳ này nhưng bảng lương mới ghi nhận <strong>{discrepancyInfo.actualCount}</strong> phiếu lương.
              <div className="text-[11px] text-amber-700 mt-0.5">Nhấn "Đồng Bộ Lại" để hệ thống tự động đưa nhân sự mới vào bảng lương theo hợp đồng.</div>
            </div>
          </div>
          <button
            type="button"
            disabled={actionLoading}
            onClick={handleManualSync}
            className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            🔄 Đồng Bộ Lại Ngay
          </button>
        </div>
      )}

      {/* 5 Thẻ Thống Kê Tài Chính Vĩ Mô */}
      {scope === 'month' && canReviewDisputes && (
        <section className="bg-white rounded-2xl border border-indigo-200 shadow-sm overflow-hidden" aria-labelledby="payroll-disputes-title">
          <div className="p-4 bg-indigo-50/70 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="payroll-disputes-title" className="text-sm font-black text-indigo-950">Phản ánh cần xử lý <span className="ml-1 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px]">{openDisputes.length} đang mở</span></h2>
              <p className="text-[11px] text-indigo-800 mt-1">Kiểm tra phản ánh trước khi phê duyệt; kết quả xử lý được lưu để truy vết.</p>
            </div>
            <select aria-label="Lọc trạng thái phản ánh" value={disputeStatusFilter} onChange={(event) => setDisputeStatusFilter(event.target.value as 'open' | 'all')} className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700">
              <option value="open">Chưa xử lý</option>
              <option value="all">Tất cả</option>
            </select>
          </div>
          <div className="p-4 space-y-3">
            {disputeListLoading && <p className="text-xs text-slate-500">Đang tải danh sách phản ánh...</p>}
            {disputeListError && <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">{disputeListError}</p>}
            {!disputeListLoading && !disputeListError && visibleDisputes.length === 0 && <p className="text-xs text-slate-500">Không có phản ánh {disputeStatusFilter === 'open' ? 'đang chờ xử lý' : 'nào'} trong kỳ này.</p>}
            {visibleDisputes.map((dispute) => (
              <article key={dispute.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm text-slate-900">{records.find((record) => record.id === dispute.recordId)?.employeeName || dispute.submittedByName || 'Nhân sự'}</strong>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">{PAYROLL_DISPUTE_CATEGORY_LABELS[dispute.category]}</span>
                      <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{PAYROLL_DISPUTE_STATUS_LABELS[dispute.status]}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Gửi ngày {formatPayrollCalendarDate(dispute.createdAt.slice(0, 10))} · Phiếu {dispute.recordId}</p>
                  </div>
                  <div className="text-[11px] text-slate-600 md:text-right">Giá trị hệ thống: <strong>{JSON.stringify(dispute.systemValue)}</strong>{Object.keys(dispute.requestedValue || {}).length > 0 && <div>Đề nghị: <strong>{JSON.stringify(dispute.requestedValue)}</strong></div>}</div>
                </div>
                <p className="text-xs text-slate-700 whitespace-pre-wrap">{dispute.reason}</p>
                {dispute.evidenceUrl && <a href={dispute.evidenceUrl} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-700 underline break-all">Mở bằng chứng</a>}
                {dispute.resolutionNote && <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2"><strong>Kết luận:</strong> {dispute.resolutionNote}</p>}
                {(dispute.status === 'submitted' || dispute.status === 'under_review') && (
                  <div className="border-t border-slate-200 pt-2.5 space-y-2">
                    <textarea value={disputeResolutionNotes[dispute.id] || ''} onChange={(event) => setDisputeResolutionNotes((notes) => ({ ...notes, [dispute.id]: event.target.value }))} rows={2} placeholder="Ghi chú kiểm tra / kết luận (bắt buộc khi xử lý hoặc từ chối)..." className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs resize-y" />
                    <div className="flex flex-wrap justify-end gap-2">
                      {dispute.status === 'submitted' && <button type="button" disabled={disputeActionLoading === dispute.id} onClick={() => handleReviewDispute(dispute, 'under_review')} className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-[11px] font-bold disabled:opacity-50">Tiếp nhận xử lý</button>}
                      <button type="button" disabled={disputeActionLoading === dispute.id} onClick={() => handleReviewDispute(dispute, 'rejected')} className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[11px] font-bold disabled:opacity-50">Từ chối</button>
                      <button type="button" disabled={disputeActionLoading === dispute.id} onClick={() => handleReviewDispute(dispute, 'resolved')} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold disabled:opacity-50">{disputeActionLoading === dispute.id ? 'Đang lưu...' : 'Đã xử lý'}</button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        
        {/* 1. Tổng Lương Gộp */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            {scope === 'month' ? 'Tổng Gross Tháng' : scope === 'quarter' ? 'Tổng Gross Quý' : scope === 'year' ? 'Tổng Gross Cả Năm' : 'Tổng Gross Lũy Kế'}
          </span>
          <span className="text-lg font-black text-slate-900 block">
            {stats.gross.toLocaleString('vi-VN')} <span className="text-xs text-slate-400 font-semibold">đ</span>
          </span>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Lương hợp đồng + mọi khoản thưởng
          </span>
        </div>

        {/* 2. Thưởng KPI & Doanh Số */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
            Thưởng KPI & Doanh Số
          </span>
          <span className="text-lg font-black text-emerald-600 block">
            +{stats.kpi.toLocaleString('vi-VN')} <span className="text-xs text-emerald-400 font-semibold">đ</span>
          </span>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Hoa hồng live + Thưởng trụ cột KPI
          </span>
        </div>

        {/* 3. ⚡ Quỹ Thưởng Nóng Giám Đốc */}
        <div className="bg-gradient-to-br from-rose-50 to-amber-50 p-4 rounded-xl border border-rose-200 shadow-sm relative overflow-hidden">
          <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <span>⚡</span> Thưởng Nóng Giám Đốc
          </span>
          <span className="text-lg font-black text-rose-700 block">
            +{stats.hot.toLocaleString('vi-VN')} <span className="text-xs text-rose-400 font-semibold">đ</span>
          </span>
          <span className="text-[10px] text-rose-800/80 mt-1 block font-medium">
            Đặc quyền khen thưởng của CEO
          </span>
        </div>

        {/* 4. Tổng Giảm Trừ & Tạm Ứng */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Tổng Giảm Trừ (Deductions)
          </span>
          <span className="text-lg font-black text-slate-700 block">
            -{stats.deductions.toLocaleString('vi-VN')} <span className="text-xs text-slate-400 font-semibold">đ</span>
          </span>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Thuế TNCN, BHXH & phạt giờ live
          </span>
        </div>

        {/* 5. Tổng Chi Thực Lĩnh (Net) */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-4 rounded-xl text-white shadow-md">
          <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block mb-1">
            {scope === 'month' ? 'Tổng Thực Chi Tháng (Net)' : scope === 'quarter' ? 'Tổng Thực Chi Quý (Net)' : scope === 'year' ? 'Tổng Thực Chi Năm (Net)' : 'Tổng Thực Chi Toàn Bộ (Net)'}
          </span>
          <span className="text-xl font-black text-white block">
            {stats.net.toLocaleString('vi-VN')} <span className="text-xs text-emerald-200 font-semibold">đ</span>
          </span>
          <span className="text-[10px] text-emerald-100/80 mt-1 block">
            {scopeInfo.subtext}
          </span>
        </div>

      </div>

      {/* Banner Đối Soát: Tiền Pay Cho NV vs Chi Phí Thực Tế Công Ty Gánh */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/90 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-amber-100 text-amber-900 border border-amber-300">
              Đối Soát Tài Chính & Nhân Sự
            </span>
            <span className="text-xs font-bold text-slate-800">
              Chi phí lương công ty gánh khác số tiền pay thực tế cho nhân sự
            </span>
          </div>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            Thực tế công ty chi trả <strong>nhiều hơn số tiền chuyển khoản</strong> vì công ty đóng thêm <strong>21.5% bảo hiểm bắt buộc</strong> (BHXH 17.5%, BHYT 3%, BHTN 1%) cho nhân sự chính thức, cộng với thuế TNCN và các nghĩa vụ trích nộp nhà nước.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 text-right shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Tiền Pay Chuyển Khoản (Net)</span>
            <span className="text-sm font-black text-emerald-600">{stats.net.toLocaleString('vi-VN')} đ</span>
          </div>
          <div className="text-slate-400 font-bold">+</div>
          <div className="bg-white px-3.5 py-2 rounded-xl border border-amber-200 text-right shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-amber-600 block">BH 21.5% C.Ty Gánh</span>
            <span className="text-sm font-black text-amber-700">+{stats.companyInsurance.toLocaleString('vi-VN')} đ</span>
          </div>
          <div className="text-slate-400 font-bold">=</div>
          <div className="bg-amber-600 text-white px-4 py-2 rounded-xl text-right shadow-md">
            <span className="text-[10px] uppercase font-bold text-amber-100 block">Tổng Chi Nhân Sự Thực Tế C.Ty</span>
            <span className="text-base font-black text-white">{stats.companyLaborCost.toLocaleString('vi-VN')} đ</span>
          </div>
        </div>
      </div>

      {/* Visual Sub-Breakdown Cards cho Quý, Năm, Toàn Thời Gian */}
      {scope === 'quarter' && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>📊</span> Chi Tiết 3 Tháng Trong {availableQuarters.find(q => q.key === selectedQuarter)?.label || selectedQuarter}
            </h3>
            <span className="text-[11px] text-slate-500">Nhấp vào tháng để mở bảng lương chi tiết</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(() => {
              const [y, qPart] = selectedQuarter.split('-');
              const qNum = Number(qPart.replace('Q', ''));
              const months = [(qNum - 1) * 3 + 1, (qNum - 1) * 3 + 2, qNum * 3];
              return months.map(m => {
                const pStr = `${y}-${String(m).padStart(2, '0')}`;
                const periodObj = periods.find(p => p.period === pStr);
                const hasData = !!periodObj;
                return (
                  <div
                    key={pStr}
                    onClick={() => {
                      if (periodObj) {
                        setSelectedPeriodId(periodObj.id);
                        setScope('month');
                      }
                    }}
                    className={`p-3.5 rounded-xl border transition-all ${
                      hasData
                        ? 'bg-slate-50/70 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 cursor-pointer'
                        : 'bg-slate-50/30 border-dashed border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 text-xs">Tháng {m}/{y}</span>
                      {hasData && (
                        <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                          periodObj.status === 'locked_paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {periodObj.status === 'locked_paid' ? 'Đã chi' : 'Dự thảo'}
                        </span>
                      )}
                    </div>
                    {hasData ? (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-slate-500 text-[11px]">
                          <span>Quy mô:</span>
                          <span className="font-semibold text-slate-700">{periodObj.employeeCount} nhân sự</span>
                        </div>
                        <div className="flex justify-between text-slate-500 text-[11px]">
                          <span>Lương gộp:</span>
                          <span className="font-semibold text-slate-700">{periodObj.totalGross?.toLocaleString('vi-VN')} đ</span>
                        </div>
                        <div className="flex justify-between font-bold text-emerald-600 pt-1 border-t border-slate-200/60">
                          <span>Thực nhận:</span>
                          <span>{periodObj.totalNet?.toLocaleString('vi-VN')} đ</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 py-2 text-center">Chưa có dữ liệu kỳ này</div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {scope === 'year' && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>📈</span> Tổng Hợp 4 Quý Năm {selectedYear}
            </h3>
            <span className="text-[11px] text-slate-500">Nhấp vào quý để xem bảng lương chi tiết của quý đó</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(qNum => {
              const qKey = `${selectedYear}-Q${qNum}`;
              const qPeriods = periods.filter(p => {
                const [y, mStr] = p.period.split('-');
                return y === selectedYear && Math.ceil(Number(mStr) / 3) === qNum;
              });
              const gross = qPeriods.reduce((sum, p) => sum + (p.totalGross || 0), 0);
              const net = qPeriods.reduce((sum, p) => sum + (p.totalNet || 0), 0);
              const hasData = qPeriods.length > 0;

              return (
                <div
                  key={qKey}
                  onClick={() => {
                    if (hasData) {
                      setSelectedQuarter(qKey);
                      setScope('quarter');
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all ${
                    hasData
                      ? 'bg-slate-50/70 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 cursor-pointer'
                      : 'bg-slate-50/30 border-dashed border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-xs">Quý {qNum}/{selectedYear}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{qPeriods.length} kỳ</span>
                  </div>
                  {hasData ? (
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-500 text-[11px]">
                        <span>Tổng Gross:</span>
                        <span className="font-semibold text-slate-700">{gross.toLocaleString('vi-VN')} đ</span>
                      </div>
                      <div className="flex justify-between font-bold text-emerald-600 pt-1 border-t border-slate-200/60">
                        <span>Tổng Net:</span>
                        <span>{net.toLocaleString('vi-VN')} đ</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 py-2 text-center">Chưa phát sinh kỳ lương</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {scope === 'all' && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>🌐</span> Lũy Kế Chi Trả Lương Theo Từng Năm (2022 - Nay)
            </h3>
            <span className="text-[11px] text-slate-500">Nhấp vào từng năm để chuyển sang phân tích chi tiết</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Năm</th>
                  <th className="py-2.5 px-3 text-center">Số Kỳ Đã Chi</th>
                  <th className="py-2.5 px-3 text-center">Quy Mô TB</th>
                  <th className="py-2.5 px-3 text-right">Tổng Lương Gộp (Gross)</th>
                  <th className="py-2.5 px-3 text-right">Thưởng KPI</th>
                  <th className="py-2.5 px-3 text-right">⚡ Thưởng Nóng</th>
                  <th className="py-2.5 px-3 text-right">Tổng Giảm Trừ</th>
                  <th className="py-2.5 px-3 text-right">Tổng Thực Chi (Net)</th>
                  <th className="py-2.5 px-3 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {availableYears.map(year => {
                  const yPeriods = periods.filter(p => p.period.startsWith(year));
                  const gross = yPeriods.reduce((sum, p) => sum + (p.totalGross || 0), 0);
                  const kpi = yPeriods.reduce((sum, p) => sum + (p.totalKpiBonus || 0), 0);
                  const hot = yPeriods.reduce((sum, p) => sum + (p.totalHotBonus || 0), 0);
                  const deduct = yPeriods.reduce((sum, p) => sum + (p.totalDeductions || 0), 0);
                  const net = yPeriods.reduce((sum, p) => sum + (p.totalNet || 0), 0);
                  const avgEmp = yPeriods.length > 0 ? Math.round(yPeriods.reduce((sum, p) => sum + (p.employeeCount || 0), 0) / yPeriods.length) : 0;

                  return (
                    <tr key={year} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">Năm {year}</td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-600">{yPeriods.length} kỳ</td>
                      <td className="py-2.5 px-3 text-center text-slate-500">{avgEmp} người</td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">{gross.toLocaleString('vi-VN')} đ</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 font-medium">+{kpi.toLocaleString('vi-VN')} đ</td>
                      <td className="py-2.5 px-3 text-right text-rose-600 font-medium">{hot > 0 ? `+${hot.toLocaleString('vi-VN')} đ` : '—'}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">-{deduct.toLocaleString('vi-VN')} đ</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{net.toLocaleString('vi-VN')} đ</td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedYear(year);
                            setScope('year');
                          }}
                          className="px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Chi Tiết ➔
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Thanh lọc & tìm kiếm */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex flex-1 items-center gap-2.5 w-full md:w-auto">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Tìm theo tên hoặc nghệ danh..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-2.5 top-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Lọc phòng ban phân nhóm Khối Idol và Khối Vận Hành */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">Tất cả phòng ban</option>
            <option value="block:idol">⭐ Toàn Bộ Khối Idol</option>
            {idolTeams.map((d) => (
              <option key={d} value={d}>
                &nbsp;&nbsp;&nbsp;{d}
              </option>
            ))}
            <option value="block:corporate">🏢 Toàn Bộ Khối Vận Hành</option>
            {corporateDepts.map((d) => (
              <option key={d} value={d}>
                &nbsp;&nbsp;&nbsp;{d}
              </option>
            ))}
          </select>

          {/* Lọc loại nhân sự phân nhóm rõ ràng & lấy động từ CSDL */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">Tất cả nhân sự</option>
            <optgroup label="Theo Vai Trò / Khối">
              <option value="role:idol">⭐ Khối Idol / Nghệ Sĩ</option>
              <option value="role:staff">🏢 Khối Cán Bộ Vận Hành</option>
            </optgroup>
            <optgroup label="Theo Hình Thức Hợp Đồng">
              {personnelTypes.map((pt) => (
                <option key={pt} value={pt}>
                  {pt}
                </option>
              ))}
            </optgroup>
          </select>
          {scope === 'month' && (
            <select
              value={snapshotFilter}
              onChange={(e) => setSnapshotFilter(e.target.value as typeof snapshotFilter)}
              aria-label="Lọc theo nguồn snapshot lương"
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Tất cả nguồn snapshot</option>
              <option value="legacy_evidence">Chỉ legacy evidence</option>
              <option value="missing_snapshot">Chỉ thiếu snapshot</option>
            </select>
          )}
        </div>

        <div className="text-[11px] text-slate-500 shrink-0">
          {scope === 'month' ? (
            <>Hiển thị <strong>{filteredRecords.length}</strong> / {records.length} phiếu lương</>
          ) : (
            <>Hiển thị <strong>{filteredAggPersonnel.length}</strong> / {aggregatedPersonnel.length} nhân sự ({scopeInfo.title})</>
          )}
        </div>
      </div>

      {scope === 'month' && (snapshotInfo.legacyCount > 0 || snapshotInfo.missingCount > 0) && (
        <div className={`rounded-xl border px-4 py-3 text-xs ${snapshotInfo.missingCount > 0 ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          <div className="font-bold">Cảnh báo nguồn snapshot lương</div>
          <div className="mt-1">
            {snapshotInfo.legacyCount > 0 && `${snapshotInfo.legacyCount} phiếu đang dùng bằng chứng legacy. `}
            {snapshotInfo.missingCount > 0 && `${snapshotInfo.missingCount} phiếu chưa có snapshot lương đủ bằng chứng; không tự động thay bằng lương hiện tại của nhân sự.`}
          </div>
        </div>
      )}

      {/* Bảng Chi Tiết Phiếu Lương / Bảng Tổng Hợp Lũy Kế */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {scope === 'month' ? (
            /* BẢNG CHI TIẾT THEO THÁNG */
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3 text-center w-10">STT</th>
                  <th className="py-3 px-4">Nhân Sự / Idol</th>
                  <th className="py-3 px-3">Phòng Ban / Nhóm</th>
                  <th className="py-3 px-3 text-right">Lương Cứng (HĐ)</th>
                  <th className="py-3 px-3 text-right">Thưởng KPI & Live</th>
                  <th className="py-3 px-3 text-right">⚡ Thưởng Nóng</th>
                  <th className="py-3 px-3 text-right">Giảm Trừ</th>
                  <th className="py-3 px-3 text-right">Thực Nhận (Net)</th>
                  <th className="py-3 px-3 text-right bg-amber-50/50">Chi Phí C.Ty</th>
                  <th className="py-3 px-3">Ngân Hàng Thụ Hưởng</th>
                  <th className="py-3 px-3 text-center">Trạng Thái</th>
                  <th className="py-3 px-3 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-400">
                      Không tìm thấy phiếu lương nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r, idx) => {
                    const hasHotBonus = r.earnings.hotBonus && r.earnings.hotBonus > 0;
                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="py-3 px-3 text-center font-semibold text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Họ tên & nghệ danh */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                            <span>{r.employeeName}</span>
                            {r.isIdol ? (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shrink-0">
                                Idol
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200 shrink-0">
                                {r.roleTitle || 'Nhân sự'}
                              </span>
                            )}
                            {r.snapshotSource === 'legacy_evidence' && (
                              <span title="Mức lương được đọc từ bằng chứng legacy đã lưu" className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200 shrink-0">
                                Legacy snapshot
                              </span>
                            )}
                            {r.snapshotSource === 'missing_snapshot' && (
                              <span title="Chưa có snapshot lương đủ bằng chứng" className="text-[9px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200 shrink-0">
                                Thiếu snapshot
                              </span>
                            )}
                          </div>
                          {r.stageName && (
                            <div className="text-[11px] text-indigo-600 font-medium">
                              {r.stageName}
                            </div>
                          )}
                        </td>

                        {/* Đơn vị */}
                        <td className="py-3 px-3 text-slate-600">
                          <span>{r.department}</span>
                          <span className="block text-[10px] text-slate-400">
                            {r.personnelType}
                          </span>
                        </td>

                        {/* Lương cứng (theo ngày công) */}
                        <td className="py-3 px-3 text-right">
                          <span className="font-semibold text-slate-800 block">
                            {r.earnings.baseSalary.toLocaleString('vi-VN')} đ
                          </span>
                          {r.earnings.contractBaseSalary && r.earnings.contractBaseSalary !== r.earnings.baseSalary ? (
                            <span 
                              title={r.earnings.workDaysExplanation || 'Tính theo ngày công thực tế'}
                              className="inline-block text-[9px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold"
                            >
                              {r.earnings.actualWorkDays || 0}/{r.earnings.standardWorkDays || 26} công ({((r.earnings.workRatio || 1) * 100).toFixed(0)}%)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 block">
                              Đủ {r.earnings.standardWorkDays || 26} công
                            </span>
                          )}
                        </td>

                        {/* Thưởng KPI & Hoa hồng & Tăng Ca */}
                        <td className="py-3 px-3 text-right text-emerald-600 font-medium">
                          <div>
                            +{(
                              (r.earnings.kpiBonus || 0) +
                              (r.earnings.commissionGmv || 0) +
                              (r.earnings.giftShare || 0)
                            ).toLocaleString('vi-VN')} đ
                          </div>
                          {r.earnings.overtimePay && r.earnings.overtimePay > 0 ? (
                            <span 
                              title={`Tăng ca: Thường ${r.earnings.otNormalHours || 0}h (150%), Nghỉ ${r.earnings.otWeekendHours || 0}h (200%), Lễ ${r.earnings.otHolidayHours || 0}h (300%)`}
                              className="inline-block text-[9px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold mt-0.5"
                            >
                              ⏰ +{r.earnings.overtimePay.toLocaleString('vi-VN')} đ (OT)
                            </span>
                          ) : null}
                        </td>

                        {/* ⚡ Thưởng Nóng */}
                        <td className="py-3 px-3 text-right">
                          {hasHotBonus ? (
                            <span 
                              title={r.earnings.hotBonusReason}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[11px] shadow-2xs"
                            >
                              <span>⚡</span>+{r.earnings.hotBonus?.toLocaleString('vi-VN')} đ
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Giảm trừ */}
                        <td className="py-3 px-3 text-right text-slate-600">
                          {r.deductions.totalDeductions > 0 ? (
                            <span className="text-rose-600 font-medium">
                              -{r.deductions.totalDeductions.toLocaleString('vi-VN')} đ
                            </span>
                          ) : (
                            <span className="text-slate-400">0 đ</span>
                          )}
                        </td>

                        {/* Thực nhận */}
                        <td className="py-3 px-3 text-right">
                          <span className="text-sm font-black text-emerald-600 block">
                            {r.netSalary.toLocaleString('vi-VN')} đ
                          </span>
                          <span className="text-[10px] text-slate-400">Pay thực nhận</span>
                        </td>

                        {/* Chi phí thực tế C.Ty (Gross + BH 21.5%) */}
                        <td className="py-3 px-3 text-right bg-amber-50/30">
                          {(() => {
                            const cIns = r.companyInsuranceAmount ?? (r.personnelType === 'Công ty' ? Math.round((r.earnings?.baseSalary || 0) * 0.215) : 0);
                            const totalLabor = r.totalCompanyLaborCost ?? ((r.earnings?.totalGross || 0) + cIns);
                            return (
                              <>
                                <span className="text-xs font-black text-amber-900 block">
                                  {totalLabor.toLocaleString('vi-VN')} đ
                                </span>
                                {cIns > 0 ? (
                                  <span className="text-[10px] text-amber-700/80 font-medium" title="Bảo hiểm 21.5% C.Ty đóng thêm nộp quỹ">
                                    +BH 21.5%: {cIns.toLocaleString('vi-VN')} đ
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">Không có BH</span>
                                )}
                              </>
                            );
                          })()}
                        </td>

                        {/* Ngân hàng */}
                        <td className="py-3 px-3 text-slate-600">
                          <span className="font-semibold text-slate-800 block text-[11px]">
                            {r.bankInfo.bankName || '—'}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            STK: {r.bankInfo.accountNumber || '—'}
                          </span>
                        </td>

                        {/* Trạng thái chi trả */}
                        <td className="py-3 px-3 text-center">
                          {(() => {
                            const displayStatus = getPayrollDisplayStatus(currentPeriod?.status, r.paymentStatus);
                            return (
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                displayStatus === 'paid'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : displayStatus === 'pending_payment'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {PAYROLL_DISPLAY_STATUS_LABELS[displayStatus]}
                              </span>
                            );
                          })()}
                        </td>

                        {/* Thao tác */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Nút Xem Phiếu Lương */}
                            <button
                              type="button"
                              onClick={() => setViewingRecord(r)}
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Xem Phiếu Lương Chi Tiết"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>

                            {/* Nút ⚡ Thưởng Nóng (Dành cho Giám Đốc) */}
                            {isDirector && (
                              <button
                                type="button"
                                onClick={() => openHotBonus(r)}
                                disabled={actionLoading || !canMutateSelectedPeriod}
                                className="px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="Giám Đốc Thưởng Nóng Cho Nhân Sự Này"
                              >
                                <span>⚡</span>
                                <span className="hidden sm:inline">Thưởng Nóng</span>
                              </button>
                            )}

                            {/* Nút Điều Chỉnh (Dành cho Kế toán / HR / Giám đốc) */}
                            {isAccountant && (
                              <button
                                type="button"
                                onClick={() => openAdjustModal(r)}
                                disabled={actionLoading || !canMutateSelectedPeriod}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                title="Kế toán điều chỉnh đối soát"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* BẢNG TỔNG HỢP LŨY KẾ THEO QUÝ / NĂM / TOÀN THỜI GIAN */
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3 text-center w-10">STT</th>
                  <th className="py-3 px-4">Nhân Sự / Idol</th>
                  <th className="py-3 px-3">Phòng Ban / Khối</th>
                  <th className="py-3 px-3 text-right">Tổng Lương Cứng</th>
                  <th className="py-3 px-3 text-right">Tổng KPI & Thưởng</th>
                  <th className="py-3 px-3 text-right">⚡ Tổng Thưởng Nóng</th>
                  <th className="py-3 px-3 text-right">Tổng Giảm Trừ</th>
                  <th className="py-3 px-4 text-right">Tổng Thực Nhận (Net)</th>
                  <th className="py-3 px-3 text-center">Số Kỳ Đã Nhận</th>
                  <th className="py-3 px-3">Ngân Hàng Thụ Hưởng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {aggLoading ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      Đang tổng hợp dữ liệu tài chính...
                    </td>
                  </tr>
                ) : filteredAggPersonnel.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      Không tìm thấy nhân sự nào trong giai đoạn {scopeInfo.title}.
                    </td>
                  </tr>
                ) : (
                  filteredAggPersonnel.map((p, idx) => {
                    const hasHot = p.totalHotBonus > 0;
                    return (
                      <tr key={p.userId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-center font-semibold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                            <span>{p.employeeName}</span>
                            {p.isIdol ? (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shrink-0">
                                Idol
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200 shrink-0">
                                {p.roleTitle || 'Nhân sự'}
                              </span>
                            )}
                          </div>
                          {p.stageName && (
                            <div className="text-[11px] text-indigo-600 font-medium">
                              {p.stageName}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <span>{p.department}</span>
                          <span className="block text-[10px] text-slate-400">{p.personnelType}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-800">
                          {p.totalBaseSalary.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-600 font-medium">
                          +{p.totalKpiBonus.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-3 text-right">
                          {hasHot ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[11px]">
                              <span>⚡</span>+{p.totalHotBonus.toLocaleString('vi-VN')} đ
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-500">
                          {p.totalDeductions > 0 ? `-${p.totalDeductions.toLocaleString('vi-VN')} đ` : '0 đ'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm font-black text-emerald-600 block">
                            {p.totalNet.toLocaleString('vi-VN')} đ
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {p.periodCount} kỳ
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <span className="font-semibold text-slate-800 block text-[11px]">
                            {p.bankInfo.bankName || '—'}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            STK: {p.bankInfo.accountNumber || '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal 1: Xem Phiếu Lương Chi Tiết */}
      <PayslipModal
        isOpen={!!viewingRecord}
        onClose={() => setViewingRecord(null)}
        record={viewingRecord}
        currentUser={currentUser}
      />

      {/* Modal 2: ⚡ Giám Đốc Thưởng Nóng */}
      {hotBonusRecord && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-md max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto min-h-0 animate-in zoom-in-95 my-auto">
            <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white p-5">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <div>
                  <h3 className="font-black text-lg tracking-tight">
                    ĐẶC QUYỀN GIÁM ĐỐC: THƯỞNG NÓNG
                  </h3>
                  <p className="text-xs text-rose-100">
                    Khen thưởng đột xuất cho: <strong>{hotBonusRecord.employeeName}</strong> {hotBonusRecord.stageName ? `(${hotBonusRecord.stageName})` : ''}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Số Tiền Thưởng Nóng (VNĐ)
                </label>
                <input
                  type="number"
                  min="500000"
                  step="500000"
                  value={hotBonusAmount}
                  onChange={(e) => setHotBonusAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-sm font-black text-rose-700 bg-rose-50/50 border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <div className="flex gap-1.5 mt-2">
                  {[1000000, 2000000, 5000000, 10000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setHotBonusAmount(amt)}
                      className="px-2 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 cursor-pointer"
                    >
                      +{(amt / 1000000)}Tr
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Lý Do Khen Thưởng (Hiển thị nổi bật trên phiếu lương)
                </label>
                <textarea
                  rows={3}
                  placeholder="VD: Xuất sắc mang về hợp đồng tài trợ 500tr; Phiên live bùng nổ 10.000 mắt xem; Hoàn thành vượt chỉ tiêu..."
                  value={hotBonusReason}
                  onChange={(e) => setHotBonusReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                ></textarea>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                💡 <strong>Ghi chú bảo mật:</strong> Khoản thưởng nóng sẽ được cộng trực tiếp vào tổng thu nhập gộp tháng này và hiển thị huy hiệu vinh danh từ Giám Đốc trên Phiếu Lương của nhân viên.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setHotBonusRecord(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleSaveHotBonus}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>⚡</span> Xác Nhận Thưởng Nóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Kế Toán / HR Điều Chỉnh Phiếu Lương */}
      {adjustingRecord && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-slate-900 text-white p-5 shrink-0">
              <h3 className="font-bold text-base">
                Kế Toán Điều Chỉnh Phiếu Lương: {adjustingRecord.employeeName}
              </h3>
              <p className="text-xs text-slate-300">
                Kỳ {currentPeriod?.period} • Đơn vị: {adjustingRecord.department}
              </p>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Thu nhập */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-2.5">
                <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-emerald-700">
                  I. Các Khoản Thu Nhập (Earnings)
                </h4>

                {/* Nhóm Ngày Công & Lương Cơ Bản */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px]">1. Tính Lương Theo Ngày Công Thực Tế</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      Công chuẩn: {adjustForm.standardWorkDays} ngày
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                        Lương Hợp Đồng (Gốc):
                      </label>
                      <MoneyInput
                        value={adjustForm.contractBaseSalary}
                        onChange={(val) => {
                          const ratio = adjustForm.standardWorkDays > 0 ? Math.min(1, Math.max(0, adjustForm.actualWorkDays / adjustForm.standardWorkDays)) : 1;
                          const newBase = Math.round(val * ratio);
                          const otRes = calculateOvertimePay(val, adjustForm.standardWorkDays, adjustForm.otNormalHours, adjustForm.otWeekendHours, adjustForm.otHolidayHours);
                          const automaticDeductions = calculatePayrollDeductions({ contractSalary: val, personnelType: adjustingRecord.personnelType });
                          setAdjustForm({
                            ...adjustForm,
                            contractBaseSalary: val,
                            baseSalary: newBase,
                            overtimePay: otRes.totalOtPay,
                            tax: automaticDeductions.tax,
                            insurance: automaticDeductions.employeeInsurance
                          });
                        }}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                        Ngày Công Đi Làm:
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={adjustForm.standardWorkDays || 31}
                        value={adjustForm.actualWorkDays}
                        onChange={(e) => {
                          const days = Number(e.target.value) || 0;
                          const ratio = adjustForm.standardWorkDays > 0 ? Math.min(1, Math.max(0, days / adjustForm.standardWorkDays)) : 1;
                          const newBase = Math.round(adjustForm.contractBaseSalary * ratio);
                          setAdjustForm({
                            ...adjustForm,
                            actualWorkDays: days,
                            baseSalary: newBase
                          });
                        }}
                        className="w-full px-2 py-1.5 bg-amber-50 border border-amber-300 rounded text-xs font-bold text-amber-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                        Lương Công Thực Nhận:
                      </label>
                      <MoneyInput
                        value={adjustForm.baseSalary}
                        onChange={(value) => setAdjustForm({ ...adjustForm, baseSalary: value })}
                        className="w-full px-2 py-1.5 bg-white border border-emerald-300 rounded text-xs font-bold text-emerald-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Nhóm Làm Thêm Giờ (Tăng Ca - Overtime) */}
                <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-950 text-[11px] flex items-center gap-1">
                      <span>⏰</span> 2. Tiền Làm Thêm Giờ (Tăng Ca / Overtime)
                      {adjustingRecord.personnelType !== 'Công ty' && (
                        <span className="text-[9px] font-normal text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                          Chỉ áp dụng loại Công ty
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                      +{adjustForm.overtimePay.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-indigo-900 mb-0.5">
                        Ngày Thường (150%):
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={adjustForm.otNormalHours}
                        onChange={(e) => {
                          const hrs = Number(e.target.value) || 0;
                          const otRes = calculateOvertimePay(adjustForm.contractBaseSalary, adjustForm.standardWorkDays, hrs, adjustForm.otWeekendHours, adjustForm.otHolidayHours);
                          setAdjustForm({
                            ...adjustForm,
                            otNormalHours: hrs,
                            overtimePay: otRes.totalOtPay
                          });
                        }}
                        className="w-full px-2 py-1.5 bg-white border border-indigo-300 rounded text-xs font-bold text-indigo-800"
                        placeholder="Số giờ"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-indigo-900 mb-0.5">
                        Ngày Nghỉ CN (200%):
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={adjustForm.otWeekendHours}
                        onChange={(e) => {
                          const hrs = Number(e.target.value) || 0;
                          const otRes = calculateOvertimePay(adjustForm.contractBaseSalary, adjustForm.standardWorkDays, adjustForm.otNormalHours, hrs, adjustForm.otHolidayHours);
                          setAdjustForm({
                            ...adjustForm,
                            otWeekendHours: hrs,
                            overtimePay: otRes.totalOtPay
                          });
                        }}
                        className="w-full px-2 py-1.5 bg-white border border-indigo-300 rounded text-xs font-bold text-indigo-800"
                        placeholder="Số giờ"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-indigo-900 mb-0.5">
                        Ngày Lễ/Tết (300%):
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={adjustForm.otHolidayHours}
                        onChange={(e) => {
                          const hrs = Number(e.target.value) || 0;
                          const otRes = calculateOvertimePay(adjustForm.contractBaseSalary, adjustForm.standardWorkDays, adjustForm.otNormalHours, adjustForm.otWeekendHours, hrs);
                          setAdjustForm({
                            ...adjustForm,
                            otHolidayHours: hrs,
                            overtimePay: otRes.totalOtPay
                          });
                        }}
                        className="w-full px-2 py-1.5 bg-white border border-indigo-300 rounded text-xs font-bold text-indigo-800"
                        placeholder="Số giờ"
                      />
                    </div>
                  </div>
                </div>

                {adjustForm.workAssignmentPay > 0 && (
                  <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-[11px] text-sky-900">
                    <div className="flex items-center justify-between font-bold"><span>🚗 Công tác / đi công việc</span><span>+{adjustForm.workAssignmentPay.toLocaleString('vi-VN')} đ</span></div>
                    <div className="mt-1 grid grid-cols-2 gap-2 text-[10px]"><span>Giờ cơ bản: {adjustForm.workAssignmentBaseHours}h × 1.5 = {adjustForm.workAssignmentBasePay.toLocaleString('vi-VN')} đ</span><span>Giờ vượt chuẩn: {adjustForm.workAssignmentPremiumHours}h × 2.0 = {adjustForm.workAssignmentPremiumPay.toLocaleString('vi-VN')} đ</span></div>
                    {adjustForm.workAssignmentRestDay && <p className="mt-1 font-semibold">Ngày nghỉ bù: {adjustForm.workAssignmentRestDay}</p>}
                    <p className="mt-1 text-[10px]">Khoản này đã được cộng vào tổng thu nhập chịu thuế và thực nhận.</p>
                  </div>
                )}

                {/* Các khoản thưởng và phụ cấp */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Thưởng KPI Vận Hành:
                    </label>
                    <MoneyInput
                      value={adjustForm.kpiBonus}
                      onChange={(value) => setAdjustForm({ ...adjustForm, kpiBonus: value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Hoa Hồng GMV Bán Hàng:
                    </label>
                    <MoneyInput
                      value={adjustForm.commissionGmv}
                      onChange={(value) => setAdjustForm({ ...adjustForm, commissionGmv: value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Chia Sẻ Quà & PK:
                    </label>
                    <MoneyInput
                      value={adjustForm.giftShare}
                      onChange={(value) => setAdjustForm({ ...adjustForm, giftShare: value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Phụ Cấp (Ăn trưa, ca kíp):
                    </label>
                    <MoneyInput
                      value={adjustForm.allowance}
                      onChange={(value) => setAdjustForm({ ...adjustForm, allowance: value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Giảm trừ */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-2.5">
                <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-rose-700">
                  II. Các Khoản Giảm Trừ (Deductions)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Phạt Thiếu Giờ Live:
                    </label>
                    <MoneyInput
                      value={adjustForm.liveHoursPenalty}
                      onChange={(value) => setAdjustForm({ ...adjustForm, liveHoursPenalty: value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-rose-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Tạm Ứng Trong Kỳ:
                    </label>
                    <MoneyInput
                      value={adjustForm.advancePayment}
                      onChange={(value) => setAdjustForm({ ...adjustForm, advancePayment: value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-rose-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Thuế Thu Nhập Cá Nhân (TNCN):
                    </label>
                    <MoneyInput
                      value={automaticAdjustmentDeductions.tax}
                      readOnly
                      title="Tự động tính theo tổng thu nhập chịu thuế, bao gồm thưởng KPI"
                      className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Bảo Hiểm XH / BHYT:
                    </label>
                    <MoneyInput
                      value={automaticAdjustmentDeductions.employeeInsurance}
                      readOnly
                      title="Tự động tính theo lương hợp đồng"
                      className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Lý Do / Căn Cứ Điều Chỉnh Đối Soát:
                </label>
                <input
                  type="text"
                  placeholder="VD: Cập nhật tạm ứng theo phiếu chi số 12; Thêm hoa hồng chiến dịch Mega Live..."
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-900">
                      Tổng hợp sau điều chỉnh
                    </h4>
                    <p className="mt-0.5 text-[10px] text-indigo-700">
                      Tự động cập nhật theo các khoản thu nhập, KPI, TNCN và giảm trừ.
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-black ${
                    adjustmentNetDelta > 0
                      ? 'bg-emerald-100 text-emerald-700'
                      : adjustmentNetDelta < 0
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-slate-100 text-slate-600'
                  }`}>
                    {adjustmentNetDelta > 0 ? '+' : ''}{adjustmentNetDelta.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-indigo-100 bg-white/80 px-2.5 py-2">
                    <div className="text-[10px] font-semibold text-slate-500">Tổng thu nhập</div>
                    <div className="mt-0.5 text-xs font-black text-slate-800">{adjustmentGross.toLocaleString('vi-VN')} đ</div>
                  </div>
                  <div className="rounded-lg border border-indigo-100 bg-white/80 px-2.5 py-2">
                    <div className="text-[10px] font-semibold text-slate-500">Tổng giảm trừ</div>
                    <div className="mt-0.5 text-xs font-black text-rose-700">{adjustmentTotalDeductions.toLocaleString('vi-VN')} đ</div>
                  </div>
                  <div className="rounded-lg border border-indigo-200 bg-white px-2.5 py-2">
                    <div className="text-[10px] font-semibold text-indigo-700">Thực nhận sau chỉnh</div>
                    <div className="mt-0.5 text-xs font-black text-indigo-800">{adjustmentNetSalary.toLocaleString('vi-VN')} đ</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAdjustingDisputeId(null);
                  setAdjustingRecord(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleSaveAdjust}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Thao Tác Bảng Lương (Trình Duyệt / Phê Duyệt / Khóa Sổ) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] shadow-2xl border border-slate-200 overflow-y-auto min-h-0 transform transition-all scale-100 my-auto">
            <div className={`p-5 text-white ${
              confirmModal.variant === 'amber'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700'
                : confirmModal.variant === 'emerald'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700'
                : 'bg-gradient-to-r from-indigo-600 to-indigo-700'
            }`}>
              <h3 className="text-base font-black flex items-center gap-2">
                {confirmModal.title}
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                {confirmModal.description}
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={confirmModal.onConfirm}
                className={`px-5 py-2 text-xs font-black text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  confirmModal.variant === 'amber'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                    : confirmModal.variant === 'emerald'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                } ${actionLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {actionLoading ? 'Đang xử lý...' : confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Thông Báo Kết Quả In-App */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-200">
          <div className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 ${
            toast.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200 shadow-rose-100'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-100'
          }`}>
            <span>{toast.type === 'error' ? '⚠️' : '✓'}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

    </div>
  );
};
