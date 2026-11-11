-- The seed payroll rows for personnel 7 were created from the original demo
-- identity (Lưu Đình Mạc). Personnel 7 is now Hoàng Minh Khang (Khang visual),
-- so refresh the complete payroll snapshot from the current personnel profile.

WITH current_personnel AS (
    SELECT
        id AS personnel_id,
        "realName",
        "stageName",
        department,
        "personnelType",
        "isIdol",
        "bankName",
        "bankAccountNumber",
        "bankAccountName",
        "baseSalary"
    FROM "personnel"
    WHERE id = 7
), prepared AS (
    SELECT
        r.id,
        r."periodId",
        c.personnel_id,
        c."realName",
        c."stageName",
        c.department,
        c."personnelType",
        c."isIdol",
        c."bankName",
        c."bankAccountNumber",
        c."bankAccountName",
        c."baseSalary",
        c."baseSalary" AS contract_salary,
        COALESCE((r."earningsDetail" ->> 'allowance')::numeric, 0) AS allowance,
        COALESCE((r."earningsDetail" ->> 'otherBonus')::numeric, 0) AS other_bonus,
        COALESCE(r."overtimePay", 0) AS overtime_pay,
        COALESCE(r."kpiBonus", 0) AS kpi_bonus,
        COALESCE(r."commissionGmv", 0) AS commission_gmv,
        COALESCE(r."giftShare", 0) AS gift_share,
        COALESCE(r."hotBonus", 0) AS hot_bonus,
        COALESCE((r."deductionsDetail" ->> 'liveHoursPenalty')::numeric, 0) AS live_hours_penalty,
        COALESCE((r."deductionsDetail" ->> 'advancePayment')::numeric, 0) AS advance_payment,
        COALESCE((r."deductionsDetail" ->> 'unpaidLeaveDeduction')::numeric, 0) AS unpaid_leave_deduction,
        COALESCE((r."deductionsDetail" ->> 'otherPenalty')::numeric, 0) AS other_penalty
    FROM "payroll_records" r
    CROSS JOIN current_personnel c
    WHERE r."personnelId" = c.personnel_id
), calculated AS (
    SELECT
        *,
        contract_salary + overtime_pay + kpi_bonus + commission_gmv + gift_share + hot_bonus + allowance + other_bonus AS total_gross_new,
        CASE WHEN contract_salary > 11000000 THEN ROUND((contract_salary - 11000000) * 0.1) ELSE 0 END AS tax_new,
        CASE WHEN "personnelType" = 'Công ty' THEN ROUND(contract_salary * 0.105) ELSE 0 END AS insurance_new
    FROM prepared
), final_values AS (
    SELECT
        *,
        tax_new + insurance_new + live_hours_penalty + advance_payment + unpaid_leave_deduction + other_penalty AS total_deductions_new
    FROM calculated
), updated AS (
    UPDATE "payroll_records" r
    SET
        "employeeName" = f."realName",
        "stageName" = f."stageName",
        department = f.department,
        "personnelType" = f."personnelType",
        "isIdol" = f."isIdol",
        "bankInfo" = jsonb_build_object(
            'bankName', COALESCE(f."bankName", ''),
            'accountNumber', COALESCE(f."bankAccountNumber", ''),
            'accountName', COALESCE(f."bankAccountName", '')
        ),
        "baseSalary" = f.contract_salary,
        "totalGross" = f.total_gross_new,
        "totalDeductions" = f.total_deductions_new,
        "netSalary" = GREATEST(0, f.total_gross_new - f.total_deductions_new),
        "companyInsurance" = CASE WHEN f."personnelType" = 'Công ty' THEN ROUND(f.contract_salary * 0.215) ELSE 0 END,
        "companyLaborCost" = f.total_gross_new + CASE WHEN f."personnelType" = 'Công ty' THEN ROUND(f.contract_salary * 0.215) ELSE 0 END,
        "earningsDetail" = jsonb_build_object(
            'baseSalary', f.contract_salary,
            'contractBaseSalary', f.contract_salary,
            'allowance', f.allowance,
            'otherBonus', f.other_bonus,
            'overtimePay', f.overtime_pay,
            'kpiBonus', f.kpi_bonus,
            'commissionGmv', f.commission_gmv,
            'giftShare', f.gift_share,
            'hotBonus', f.hot_bonus,
            'totalGross', f.total_gross_new
        ) || (r."earningsDetail" - 'baseSalary' - 'contractBaseSalary' - 'allowance' - 'otherBonus' - 'overtimePay' - 'kpiBonus' - 'commissionGmv' - 'giftShare' - 'hotBonus' - 'totalGross'),
        "deductionsDetail" = jsonb_build_object(
            'tax', f.tax_new,
            'insurance', f.insurance_new,
            'liveHoursPenalty', f.live_hours_penalty,
            'advancePayment', f.advance_payment,
            'unpaidLeaveDeduction', f.unpaid_leave_deduction,
            'otherPenalty', f.other_penalty,
            'totalDeductions', f.total_deductions_new
        ) || (r."deductionsDetail" - 'tax' - 'insurance' - 'liveHoursPenalty' - 'advancePayment' - 'unpaidLeaveDeduction' - 'otherPenalty' - 'totalDeductions')
    FROM final_values f
    WHERE r.id = f.id
    RETURNING r."periodId"
)
UPDATE "payroll_periods" p
SET
    "totalGross" = totals.total_gross,
    "totalDeductions" = totals.total_deductions,
    "totalNet" = totals.total_net,
    "totalKpiBonus" = totals.total_kpi_bonus,
    "totalHotBonus" = totals.total_hot_bonus,
    "employeeCount" = totals.employee_count
FROM (
    SELECT
        r."periodId",
        SUM(r."totalGross") AS total_gross,
        SUM(r."totalDeductions") AS total_deductions,
        SUM(r."netSalary") AS total_net,
        SUM(r."kpiBonus") AS total_kpi_bonus,
        SUM(r."hotBonus") AS total_hot_bonus,
        COUNT(*)::integer AS employee_count
    FROM "payroll_records" r
    GROUP BY r."periodId"
) totals
WHERE p.id = totals."periodId"
  AND p.id IN (SELECT "periodId" FROM updated);
