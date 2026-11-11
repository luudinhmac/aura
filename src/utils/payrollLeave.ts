/** Calculate the unpaid-leave deduction from the contract monthly salary. */
export function calculateUnpaidLeaveDeduction(
  contractMonthlySalary: number,
  standardWorkDays: number,
  unpaidLeaveDays: number
): number {
  const salary = Number.isFinite(contractMonthlySalary) ? Math.max(0, contractMonthlySalary) : 0;
  const workDays = Number.isFinite(standardWorkDays) ? Math.max(0, standardWorkDays) : 0;
  const leaveDays = Number.isFinite(unpaidLeaveDays) ? Math.max(0, unpaidLeaveDays) : 0;

  if (salary === 0 || workDays === 0 || leaveDays === 0) return 0;
  return Math.round((salary / workDays) * leaveDays);
}
