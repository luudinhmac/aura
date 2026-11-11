--
-- PostgreSQL database dump
--


-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    id text DEFAULT 'global_settings'::text NOT NULL,
    "referenceYear" integer DEFAULT 2026 NOT NULL,
    "referenceDate" text,
    "brandName" text,
    "brandTagline" text,
    "brandLogoUrl" text,
    "tieBreakerEnabled" boolean DEFAULT true NOT NULL,
    "tieBreakerCriteriaIds" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "scoreCalculationMode" text DEFAULT 'sum'::text NOT NULL,
    "departmentParentMap" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "departmentLeaders" jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: approval_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_requests (
    id uuid NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    "targetPersonnelId" integer,
    "targetName" text NOT NULL,
    reason text,
    data jsonb,
    "requestedById" integer NOT NULL,
    "reviewedById" integer,
    "reviewNote" text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reviewedAt" timestamp with time zone
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid NOT NULL,
    "requestId" text NOT NULL,
    "actorUserId" integer,
    method text NOT NULL,
    path text NOT NULL,
    action text NOT NULL,
    resource text NOT NULL,
    "resourceId" text,
    "statusCode" integer NOT NULL,
    metadata jsonb,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: auth_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_sessions (
    id text NOT NULL,
    "userId" integer NOT NULL,
    "refreshTokenHash" text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastUsedAt" timestamp with time zone,
    "revokedAt" timestamp with time zone,
    "replacedBySessionId" text
);


--
-- Name: company_expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_expenses (
    id uuid NOT NULL,
    "expenseCode" text NOT NULL,
    period text NOT NULL,
    "expenseDate" date NOT NULL,
    category text NOT NULL,
    "categoryLabel" text,
    title text NOT NULL,
    amount numeric(15,2) DEFAULT 0 NOT NULL,
    "facilityType" text,
    "paymentMethod" text DEFAULT 'bank_transfer'::text NOT NULL,
    recipient text,
    "invoiceRef" text,
    "proofUrl" text,
    status text DEFAULT 'paid'::text NOT NULL,
    notes text,
    "createdById" integer,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT expense_nonnegative_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT expense_period_format_check CHECK ((period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'::text)),
    CONSTRAINT expense_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'paid'::text, 'cancelled'::text])))
);


--
-- Name: criteria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.criteria (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "maxScore" numeric(5,2) NOT NULL,
    weight numeric(5,2) NOT NULL,
    description text,
    "priorityOrder" integer DEFAULT 1 NOT NULL,
    CONSTRAINT criterion_positive_max_score_check CHECK (("maxScore" > (0)::numeric)),
    CONSTRAINT criterion_weight_range_check CHECK (((weight > (0)::numeric) AND (weight <= (100)::numeric)))
);


--
-- Name: criteria_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.criteria_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: criteria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.criteria_id_seq OWNED BY public.criteria.id;


--
-- Name: kpi_group_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kpi_group_members (
    "groupId" integer NOT NULL,
    "personnelId" integer NOT NULL,
    "roleInGroup" text DEFAULT 'member'::text NOT NULL,
    "joinedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: kpi_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kpi_groups (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    type text NOT NULL,
    category text DEFAULT 'mixed'::text NOT NULL,
    department text,
    "leaderId" integer,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: kpi_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kpi_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kpi_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kpi_groups_id_seq OWNED BY public.kpi_groups.id;


--
-- Name: kpi_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kpi_settings (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    unit text NOT NULL,
    "customUnitLabel" text,
    "scopeType" text NOT NULL,
    "groupId" integer,
    "assignedPersonnelId" integer,
    period text NOT NULL,
    "targetValue" numeric(15,2) NOT NULL,
    "minThreshold" numeric(15,2),
    weight numeric(5,2) NOT NULL,
    "bonusIncentive" jsonb,
    status text DEFAULT 'active'::text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "activityTypeId" integer,
    CONSTRAINT kpi_scope_type_check CHECK (("scopeType" = ANY (ARRAY['group'::text, 'individual'::text]))),
    CONSTRAINT kpi_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text]))),
    CONSTRAINT kpi_target_nonnegative_check CHECK ((("targetValue" >= (0)::numeric) AND (("minThreshold" IS NULL) OR ("minThreshold" >= (0)::numeric)))),
    CONSTRAINT kpi_weight_range_check CHECK (((weight > (0)::numeric) AND (weight <= (100)::numeric)))
);


--
-- Name: kpi_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kpi_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kpi_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kpi_settings_id_seq OWNED BY public.kpi_settings.id;


--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_requests (
    id uuid NOT NULL,
    "personnelId" integer NOT NULL,
    "personnelName" text NOT NULL,
    department text NOT NULL,
    "leaveType" text NOT NULL,
    "startDate" date NOT NULL,
    "endDate" date NOT NULL,
    "totalDays" numeric(4,1) NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    "approverRoleRequired" text,
    "autoApproved" boolean DEFAULT false NOT NULL,
    "reviewedById" integer,
    "reviewNote" text,
    "reviewedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "annualLeaveDays" numeric(4,1) DEFAULT 0 NOT NULL,
    "unpaidLeaveDays" numeric(4,1) DEFAULT 0 NOT NULL,
    "allocationConfirmed" boolean DEFAULT false NOT NULL,
    CONSTRAINT leave_nonnegative_days_check CHECK (("totalDays" >= (0)::numeric))
);


--
-- Name: operational_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operational_metrics (
    id uuid NOT NULL,
    "personnelId" integer NOT NULL,
    period text NOT NULL,
    "metricCode" text NOT NULL,
    "actualValue" numeric(15,2) NOT NULL,
    source text,
    note text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT operational_metric_nonnegative_value_check CHECK (("actualValue" >= (0)::numeric))
);


--
-- Name: payroll_disputes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_disputes (
    id uuid NOT NULL,
    "periodId" text NOT NULL,
    "recordId" uuid NOT NULL,
    "personnelId" integer NOT NULL,
    "submittedById" integer,
    category text NOT NULL,
    "systemValue" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "requestedValue" jsonb DEFAULT '{}'::jsonb NOT NULL,
    reason text NOT NULL,
    "evidenceUrl" text,
    status text DEFAULT 'submitted'::text NOT NULL,
    "reviewedById" integer,
    "reviewedAt" timestamp(3) without time zone,
    "resolutionNote" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: payroll_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_periods (
    id text NOT NULL,
    period text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    "totalGross" numeric(15,2) DEFAULT 0 NOT NULL,
    "totalKpiBonus" numeric(15,2) DEFAULT 0 NOT NULL,
    "totalHotBonus" numeric(15,2) DEFAULT 0 NOT NULL,
    "totalDeductions" numeric(15,2) DEFAULT 0 NOT NULL,
    "totalNet" numeric(15,2) DEFAULT 0 NOT NULL,
    "employeeCount" integer DEFAULT 0 NOT NULL,
    "submittedById" integer,
    "submittedAt" timestamp with time zone,
    "approvedById" integer,
    "approvedAt" timestamp with time zone,
    "lockedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "feedbackStartsAt" date,
    "approvalStartsAt" date,
    "lockStartsAt" date
);


--
-- Name: payroll_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_records (
    id uuid NOT NULL,
    "periodId" text NOT NULL,
    period text NOT NULL,
    "personnelId" integer NOT NULL,
    "employeeName" text NOT NULL,
    "stageName" text,
    department text NOT NULL,
    "personnelType" text NOT NULL,
    "isIdol" boolean DEFAULT false NOT NULL,
    "bankInfo" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "baseSalary" numeric(15,2) DEFAULT 0 NOT NULL,
    "overtimePay" numeric(15,2) DEFAULT 0 NOT NULL,
    "kpiBonus" numeric(15,2) DEFAULT 0 NOT NULL,
    "commissionGmv" numeric(15,2) DEFAULT 0 NOT NULL,
    "giftShare" numeric(15,2) DEFAULT 0 NOT NULL,
    "hotBonus" numeric(15,2) DEFAULT 0 NOT NULL,
    "totalGross" numeric(15,2) DEFAULT 0 NOT NULL,
    "totalDeductions" numeric(15,2) DEFAULT 0 NOT NULL,
    "netSalary" numeric(15,2) DEFAULT 0 NOT NULL,
    "earningsDetail" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "deductionsDetail" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "paymentStatus" text DEFAULT 'pending'::text NOT NULL,
    "paidAt" timestamp with time zone,
    "paymentRef" text,
    "adjustmentLogs" jsonb DEFAULT '[]'::jsonb NOT NULL,
    notes text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "companyInsurance" numeric(15,2) DEFAULT 0 NOT NULL,
    "companyLaborCost" numeric(15,2) DEFAULT 0 NOT NULL,
    "contractSalarySnapshot" numeric(15,2),
    "salaryEffectiveFromSnapshot" date,
    "salarySnapshotAt" timestamp(3) without time zone,
    "salaryHistoryId" uuid,
    CONSTRAINT payroll_nonnegative_amounts_check CHECK ((("baseSalary" >= (0)::numeric) AND ("overtimePay" >= (0)::numeric) AND ("kpiBonus" >= (0)::numeric) AND ("commissionGmv" >= (0)::numeric) AND ("giftShare" >= (0)::numeric) AND ("hotBonus" >= (0)::numeric) AND ("totalGross" >= (0)::numeric) AND ("totalDeductions" >= (0)::numeric) AND ("netSalary" >= (0)::numeric) AND ("companyInsurance" >= (0)::numeric) AND ("companyLaborCost" >= (0)::numeric))),
    CONSTRAINT payroll_period_format_check CHECK ((period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'::text))
);


--
-- Name: personnel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personnel (
    id integer NOT NULL,
    "userId" integer,
    stt integer,
    "stageName" text,
    "realName" text NOT NULL,
    dob date,
    "joinDate" date,
    "resignedDate" date,
    role text NOT NULL,
    weight numeric(5,2) DEFAULT 0 NOT NULL,
    height numeric(5,2) DEFAULT 0 NOT NULL,
    hometown text,
    "currentLiving" text,
    department text NOT NULL,
    "personnelType" text NOT NULL,
    status text DEFAULT 'Đang hoạt động'::text NOT NULL,
    "avatarUrl" text,
    bio text,
    "socialLinks" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "isIdol" boolean DEFAULT false NOT NULL,
    "cooperationType" text DEFAULT 'internal'::text NOT NULL,
    "serviceNotes" text,
    "assignedRole" text,
    phone text,
    "citizenId" text,
    "bankName" text,
    "bankAccountNumber" text,
    "bankAccountName" text,
    "baseSalary" numeric(15,2) DEFAULT 0 NOT NULL,
    "idolCategory" text,
    "commercialDetails" jsonb,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "customFields" jsonb,
    CONSTRAINT personnel_nonnegative_measurements_check CHECK (((weight >= (0)::numeric) AND (height >= (0)::numeric) AND ("baseSalary" >= (0)::numeric))),
    CONSTRAINT personnel_resignation_after_join_check CHECK ((("joinDate" IS NULL) OR ("resignedDate" IS NULL) OR ("resignedDate" >= "joinDate"))),
    CONSTRAINT personnel_status_check CHECK ((status = ANY (ARRAY['Đang hoạt động'::text, 'Đã nghỉ việc'::text])))
);


--
-- Name: personnel_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personnel_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "personnelId" integer NOT NULL,
    "activityTypeId" integer NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    metadata jsonb,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: personnel_activity_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personnel_activity_types (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: personnel_activity_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.personnel_activity_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: personnel_activity_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.personnel_activity_types_id_seq OWNED BY public.personnel_activity_types.id;


--
-- Name: personnel_columns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personnel_columns (
    id text NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    type text NOT NULL,
    options jsonb,
    required boolean DEFAULT false NOT NULL,
    "isVisible" boolean DEFAULT true NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "showInRoster" boolean DEFAULT true NOT NULL,
    "showInProfile" boolean DEFAULT true NOT NULL,
    "isSystem" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    sensitivity text DEFAULT 'public'::text NOT NULL
);


--
-- Name: personnel_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.personnel_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: personnel_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.personnel_id_seq OWNED BY public.personnel.id;


--
-- Name: personnel_salary_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personnel_salary_history (
    id uuid NOT NULL,
    "personnelId" integer NOT NULL,
    "salaryAmount" numeric(15,2) NOT NULL,
    "effectiveFrom" date NOT NULL,
    "effectiveTo" date,
    currency text DEFAULT 'VND'::text NOT NULL,
    reason text,
    source text DEFAULT 'manual'::text NOT NULL,
    "createdById" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT personnel_salary_history_date_order_check CHECK ((("effectiveTo" IS NULL) OR ("effectiveTo" >= "effectiveFrom"))),
    CONSTRAINT personnel_salary_history_nonnegative_check CHECK (("salaryAmount" >= (0)::numeric))
);


--
-- Name: personnel_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personnel_tasks (
    id uuid NOT NULL,
    "personnelId" integer NOT NULL,
    title text NOT NULL,
    description text,
    category text NOT NULL,
    status text DEFAULT 'todo'::text NOT NULL,
    "startTime" timestamp with time zone,
    "endTime" timestamp with time zone,
    "loggedDurationMinutes" integer DEFAULT 0 NOT NULL,
    subtasks jsonb DEFAULT '[]'::jsonb NOT NULL,
    "dueDate" date,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "activityTypeId" integer
);


--
-- Name: revenue_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.revenue_categories (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    "defaultIdolShareRate" numeric(5,2) DEFAULT 70.0 NOT NULL,
    color text DEFAULT 'rose'::text,
    icon text DEFAULT 'DollarSign'::text,
    "isActive" boolean DEFAULT true NOT NULL,
    "displayOrder" integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: revenue_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.revenue_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: revenue_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.revenue_categories_id_seq OWNED BY public.revenue_categories.id;


--
-- Name: revenue_deduction_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.revenue_deduction_items (
    id uuid NOT NULL,
    "transactionId" uuid NOT NULL,
    name text NOT NULL,
    "deductionType" text DEFAULT 'platform_fee'::text NOT NULL,
    amount numeric(15,2) DEFAULT 0 NOT NULL,
    "proofUrl" text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT revenue_deduction_nonnegative_amount_check CHECK ((amount >= (0)::numeric))
);


--
-- Name: revenue_platforms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.revenue_platforms (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "defaultFeeRate" numeric(5,2) DEFAULT 0.0 NOT NULL,
    "feeType" text DEFAULT 'percentage'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: revenue_platforms_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.revenue_platforms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: revenue_platforms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.revenue_platforms_id_seq OWNED BY public.revenue_platforms.id;


--
-- Name: revenue_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.revenue_transactions (
    id uuid NOT NULL,
    "transactionCode" text NOT NULL,
    "personnelId" integer NOT NULL,
    period text NOT NULL,
    "transactionDate" date NOT NULL,
    "categoryId" integer NOT NULL,
    "platformId" integer NOT NULL,
    title text NOT NULL,
    "contractRef" text,
    "payoutMode" text DEFAULT 'percentage'::text NOT NULL,
    "grossAmount" numeric(15,2) DEFAULT 0 NOT NULL,
    "totalDeductions" numeric(15,2) DEFAULT 0 NOT NULL,
    "netAmount" numeric(15,2) DEFAULT 0 NOT NULL,
    "idolShareRate" numeric(5,2) DEFAULT 70.0 NOT NULL,
    "fixedPayoutAmount" numeric(15,2) DEFAULT 0 NOT NULL,
    "idolPayoutAmount" numeric(15,2) DEFAULT 0 NOT NULL,
    "companyProfitAmount" numeric(15,2) DEFAULT 0 NOT NULL,
    "rateOverrideReason" text,
    status text DEFAULT 'draft'::text NOT NULL,
    "proofUrl" text,
    notes text,
    "createdById" integer,
    "approvedById" integer,
    "syncedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT revenue_nonnegative_amounts_check CHECK ((("grossAmount" >= (0)::numeric) AND ("totalDeductions" >= (0)::numeric) AND ("netAmount" >= (0)::numeric) AND ("fixedPayoutAmount" >= (0)::numeric) AND ("idolPayoutAmount" >= (0)::numeric) AND ("companyProfitAmount" >= (0)::numeric))),
    CONSTRAINT revenue_payout_mode_check CHECK (("payoutMode" = ANY (ARRAY['percentage'::text, 'fixed'::text, 'hybrid'::text]))),
    CONSTRAINT revenue_period_format_check CHECK ((period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'::text)),
    CONSTRAINT revenue_share_rate_check CHECK ((("idolShareRate" >= (0)::numeric) AND ("idolShareRate" <= (100)::numeric))),
    CONSTRAINT revenue_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'verified'::text, 'synced_to_payroll'::text, 'cancelled'::text, 'completed'::text])))
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "roleTitle" text NOT NULL,
    department text,
    category text NOT NULL,
    description text NOT NULL,
    "isSystemRole" boolean DEFAULT false NOT NULL,
    "defaultTabs" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "defaultActions" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "defaultDepartments" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: score_record_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.score_record_items (
    id integer NOT NULL,
    "scoreRecordId" uuid NOT NULL,
    "criterionId" integer NOT NULL,
    score numeric(5,2) NOT NULL
);


--
-- Name: score_record_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.score_record_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: score_record_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.score_record_items_id_seq OWNED BY public.score_record_items.id;


--
-- Name: score_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.score_records (
    id uuid NOT NULL,
    "personnelId" integer NOT NULL,
    period text NOT NULL,
    "totalScore" numeric(6,2) NOT NULL,
    "averageScore" numeric(5,2) NOT NULL,
    "evaluatorNotes" text,
    "evaluatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: system_lookups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_lookups (
    id integer NOT NULL,
    type text NOT NULL,
    value text NOT NULL,
    "orderIndex" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: system_lookups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_lookups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_lookups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_lookups_id_seq OWNED BY public.system_lookups.id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    "userId" integer NOT NULL,
    "roleId" integer NOT NULL,
    "assignedById" integer,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role text NOT NULL,
    "roleTitle" text NOT NULL,
    "isSuperAdmin" boolean DEFAULT false NOT NULL,
    "allowedTabs" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "allowedDepartments" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "allowedActions" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "avatarUrl" text,
    status text DEFAULT 'Đang hoạt động'::text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "accountType" text DEFAULT 'personnel'::text NOT NULL,
    "isBusinessAdmin" boolean DEFAULT false NOT NULL,
    CONSTRAINT "users_accountType_check" CHECK (("accountType" = ANY (ARRAY['system_admin'::text, 'personnel'::text])))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: work_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_schedules (
    id uuid NOT NULL,
    "personnelId" integer NOT NULL,
    "dayOfWeek" integer NOT NULL,
    "shiftType" text NOT NULL,
    "startTime" text NOT NULL,
    "endTime" text NOT NULL,
    platform text NOT NULL,
    title text NOT NULL,
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "repeatType" text,
    "specificMonth" text,
    "specificDate" date,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "activityTypeId" integer
);


--
-- Name: criteria id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criteria ALTER COLUMN id SET DEFAULT nextval('public.criteria_id_seq'::regclass);


--
-- Name: kpi_groups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_groups ALTER COLUMN id SET DEFAULT nextval('public.kpi_groups_id_seq'::regclass);


--
-- Name: kpi_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_settings ALTER COLUMN id SET DEFAULT nextval('public.kpi_settings_id_seq'::regclass);


--
-- Name: personnel id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personnel ALTER COLUMN id SET DEFAULT nextval('public.personnel_id_seq'::regclass);


--
-- Name: personnel_activity_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personnel_activity_types ALTER COLUMN id SET DEFAULT nextval('public.personnel_activity_types_id_seq'::regclass);


--
-- Name: revenue_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_categories ALTER COLUMN id SET DEFAULT nextval('public.revenue_categories_id_seq'::regclass);


--
-- Name: revenue_platforms id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_platforms ALTER COLUMN id SET DEFAULT nextval('public.revenue_platforms_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: score_record_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.score_record_items ALTER COLUMN id SET DEFAULT nextval('public.score_record_items_id_seq'::regclass);


--
-- Name: system_lookups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_lookups ALTER COLUMN id SET DEFAULT nextval('public.system_lookups_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- Name: approval_requests approval_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: auth_sessions auth_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (id);


--
-- Name: company_expenses company_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_expenses
    ADD CONSTRAINT company_expenses_pkey PRIMARY KEY (id);


--
-- Name: criteria criteria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criteria
    ADD CONSTRAINT criteria_pkey PRIMARY KEY (id);


--
-- Name: kpi_group_members kpi_group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_group_members
    ADD CONSTRAINT kpi_group_members_pkey PRIMARY KEY ("groupId", "personnelId");


--
-- Name: kpi_groups kpi_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_groups
    ADD CONSTRAINT kpi_groups_pkey PRIMARY KEY (id);


--
-- Name: kpi_settings kpi_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_settings
    ADD CONSTRAINT kpi_settings_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: operational_metrics operational_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operational_metrics
    ADD CONSTRAINT operational_metrics_pkey PRIMARY KEY (id);


--
-- Name: payroll_disputes payroll_disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_disputes
    ADD CONSTRAINT payroll_disputes_pkey PRIMARY KEY (id);


--
-- Name: payroll_periods payroll_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_periods
    ADD CONSTRAINT payroll_periods_pkey PRIMARY KEY (id);


--
-- Name: payroll_records payroll_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT payroll_records_pkey PRIMARY KEY (id);


--
-- Name: personnel_activities personnel_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personnel_activities
    ADD CONSTRAINT personnel_activities_pkey PRIMARY KEY (id);


--
-- Name: personnel_activity_types personnel_activity_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personnel_activity_types
    ADD CONSTRAINT personnel_activity_types_pkey PRIMARY KEY (id);


--
-- Name: personnel_columns personnel_columns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personnel_columns
    ADD CONSTRAINT personnel_columns_pkey PRIMARY KEY (id);


--
-- Name: personnel personnel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personnel
    ADD CONSTRAINT personnel_pkey PRIMARY KEY (id);


--
-- Name: personnel_salary_history personnel_salary_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personnel_salary_history
    ADD CONSTRAINT personnel_salary_history_pkey PRIMARY KEY (id);


--
-- Name: personnel_tasks personnel_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personnel_tasks
    ADD CONSTRAINT personnel_tasks_pkey PRIMARY KEY (id);


--
-- Name: revenue_categories revenue_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_categories
    ADD CONSTRAINT revenue_categories_pkey PRIMARY KEY (id);


--
-- Name: revenue_deduction_items revenue_deduction_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_deduction_items
    ADD CONSTRAINT revenue_deduction_items_pkey PRIMARY KEY (id);


--
-- Name: revenue_platforms revenue_platforms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_platforms
    ADD CONSTRAINT revenue_platforms_pkey PRIMARY KEY (id);


--
-- Name: revenue_transactions revenue_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_transactions
    ADD CONSTRAINT revenue_transactions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: score_record_items score_record_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.score_record_items
    ADD CONSTRAINT score_record_items_pkey PRIMARY KEY (id);


--
-- Name: score_records score_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.score_records
    ADD CONSTRAINT score_records_pkey PRIMARY KEY (id);


--
-- Name: system_lookups system_lookups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_lookups
    ADD CONSTRAINT system_lookups_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY ("userId", "roleId");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: work_schedules work_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_schedules
    ADD CONSTRAINT work_schedules_pkey PRIMARY KEY (id);


--
-- Name: approval_requests_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "approval_requests_status_createdAt_idx" ON public.approval_requests USING btree (status, "createdAt");


--
-- Name: approval_requests_targetPersonnelId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "approval_requests_targetPersonnelId_status_idx" ON public.approval_requests USING btree ("targetPersonnelId", status);


--
-- Name: audit_logs_action_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "audit_logs_action_createdAt_idx" ON public.audit_logs USING btree (action, "createdAt");


--
-- Name: audit_logs_actorUserId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "audit_logs_actorUserId_createdAt_idx" ON public.audit_logs USING btree ("actorUserId", "createdAt");


--
-- Name: audit_logs_requestId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "audit_logs_requestId_key" ON public.audit_logs USING btree ("requestId");


--
-- Name: audit_logs_resource_resourceId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "audit_logs_resource_resourceId_createdAt_idx" ON public.audit_logs USING btree (resource, "resourceId", "createdAt");


--
-- Name: auth_sessions_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "auth_sessions_expiresAt_idx" ON public.auth_sessions USING btree ("expiresAt");


--
-- Name: auth_sessions_refreshTokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "auth_sessions_refreshTokenHash_key" ON public.auth_sessions USING btree ("refreshTokenHash");


--
-- Name: auth_sessions_userId_revokedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "auth_sessions_userId_revokedAt_idx" ON public.auth_sessions USING btree ("userId", "revokedAt");


--
-- Name: company_expenses_expenseCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "company_expenses_expenseCode_key" ON public.company_expenses USING btree ("expenseCode");


--
-- Name: company_expenses_expenseDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "company_expenses_expenseDate_idx" ON public.company_expenses USING btree ("expenseDate");


--
-- Name: company_expenses_period_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX company_expenses_period_category_idx ON public.company_expenses USING btree (period, category);


--
-- Name: company_expenses_period_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX company_expenses_period_status_idx ON public.company_expenses USING btree (period, status);


--
-- Name: criteria_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX criteria_code_key ON public.criteria USING btree (code);


--
-- Name: kpi_group_members_personnelId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "kpi_group_members_personnelId_idx" ON public.kpi_group_members USING btree ("personnelId");


--
-- Name: kpi_settings_activityTypeId_period_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "kpi_settings_activityTypeId_period_status_idx" ON public.kpi_settings USING btree ("activityTypeId", period, status);


--
-- Name: kpi_settings_groupId_period_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "kpi_settings_groupId_period_status_idx" ON public.kpi_settings USING btree ("groupId", period, status);


--
-- Name: kpi_settings_scopeType_status_period_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "kpi_settings_scopeType_status_period_idx" ON public.kpi_settings USING btree ("scopeType", status, period);


--
-- Name: leave_requests_personnelId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "leave_requests_personnelId_status_idx" ON public.leave_requests USING btree ("personnelId", status);


--
-- Name: leave_requests_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "leave_requests_status_createdAt_idx" ON public.leave_requests USING btree (status, "createdAt");


--
-- Name: operational_metrics_personnelId_period_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "operational_metrics_personnelId_period_idx" ON public.operational_metrics USING btree ("personnelId", period);


--
-- Name: operational_metrics_personnelId_period_metricCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "operational_metrics_personnelId_period_metricCode_key" ON public.operational_metrics USING btree ("personnelId", period, "metricCode");


--
-- Name: payroll_disputes_periodId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_disputes_periodId_status_idx" ON public.payroll_disputes USING btree ("periodId", status);


--
-- Name: payroll_disputes_personnelId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_disputes_personnelId_createdAt_idx" ON public.payroll_disputes USING btree ("personnelId", "createdAt");


--
-- Name: payroll_disputes_recordId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_disputes_recordId_status_idx" ON public.payroll_disputes USING btree ("recordId", status);


--
-- Name: payroll_disputes_submittedById_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_disputes_submittedById_status_idx" ON public.payroll_disputes USING btree ("submittedById", status);


--
-- Name: payroll_periods_period_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payroll_periods_period_key ON public.payroll_periods USING btree (period);


--
-- Name: payroll_records_periodId_personnelId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "payroll_records_periodId_personnelId_key" ON public.payroll_records USING btree ("periodId", "personnelId");


--
-- Name: payroll_records_personnelId_period_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_records_personnelId_period_idx" ON public.payroll_records USING btree ("personnelId", period);


--
-- Name: payroll_records_salaryHistoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payroll_records_salaryHistoryId_idx" ON public.payroll_records USING btree ("salaryHistoryId");


--
-- Name: personnel_activities_activityTypeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "personnel_activities_activityTypeId_idx" ON public.personnel_activities USING btree ("activityTypeId");


--
-- Name: personnel_activities_one_primary_per_personnel_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX personnel_activities_one_primary_per_personnel_idx ON public.personnel_activities USING btree ("personnelId") WHERE ("isPrimary" = true);


--
-- Name: personnel_activities_personnelId_activityTypeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "personnel_activities_personnelId_activityTypeId_key" ON public.personnel_activities USING btree ("personnelId", "activityTypeId");


--
-- Name: personnel_activities_personnelId_isPrimary_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "personnel_activities_personnelId_isPrimary_idx" ON public.personnel_activities USING btree ("personnelId", "isPrimary");


--
-- Name: personnel_activity_types_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX personnel_activity_types_code_key ON public.personnel_activity_types USING btree (code);


--
-- Name: personnel_activity_types_isActive_displayOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "personnel_activity_types_isActive_displayOrder_idx" ON public.personnel_activity_types USING btree ("isActive", "displayOrder");


--
-- Name: personnel_columns_isActive_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "personnel_columns_isActive_sortOrder_idx" ON public.personnel_columns USING btree ("isActive", "sortOrder");


--
-- Name: personnel_columns_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX personnel_columns_key_key ON public.personnel_columns USING btree (key);


--
-- Name: personnel_isIdol_personnelType_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "personnel_isIdol_personnelType_status_idx" ON public.personnel USING btree ("isIdol", "personnelType", status);


--
-- Name: personnel_salary_history_createdById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "personnel_salary_history_createdById_idx" ON public.personnel_salary_history USING btree ("createdById");


--
-- Name: personnel_salary_history_personnelId_effectiveFrom_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "personnel_salary_history_personnelId_effectiveFrom_idx" ON public.personnel_salary_history USING btree ("personnelId", "effectiveFrom");


--
-- Name: personnel_salary_history_personnelId_effectiveFrom_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "personnel_salary_history_personnelId_effectiveFrom_key" ON public.personnel_salary_history USING btree ("personnelId", "effectiveFrom");


--
-- Name: personnel_tasks_activityTypeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "personnel_tasks_activityTypeId_idx" ON public.personnel_tasks USING btree ("activityTypeId");


--
-- Name: personnel_tasks_personnelId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "personnel_tasks_personnelId_status_idx" ON public.personnel_tasks USING btree ("personnelId", status);


--
-- Name: personnel_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "personnel_userId_key" ON public.personnel USING btree ("userId");


--
-- Name: revenue_categories_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX revenue_categories_code_key ON public.revenue_categories USING btree (code);


--
-- Name: revenue_deduction_items_transactionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "revenue_deduction_items_transactionId_idx" ON public.revenue_deduction_items USING btree ("transactionId");


--
-- Name: revenue_platforms_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX revenue_platforms_code_key ON public.revenue_platforms USING btree (code);


--
-- Name: revenue_transactions_period_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX revenue_transactions_period_status_idx ON public.revenue_transactions USING btree (period, status);


--
-- Name: revenue_transactions_personnelId_period_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "revenue_transactions_personnelId_period_idx" ON public.revenue_transactions USING btree ("personnelId", period);


--
-- Name: revenue_transactions_transactionCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "revenue_transactions_transactionCode_key" ON public.revenue_transactions USING btree ("transactionCode");


--
-- Name: roles_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX roles_code_key ON public.roles USING btree (code);


--
-- Name: score_record_items_scoreRecordId_criterionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "score_record_items_scoreRecordId_criterionId_key" ON public.score_record_items USING btree ("scoreRecordId", "criterionId");


--
-- Name: score_records_personnelId_period_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "score_records_personnelId_period_idx" ON public.score_records USING btree ("personnelId", period);


--
-- Name: score_records_personnelId_period_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "score_records_personnelId_period_key" ON public.score_records USING btree ("personnelId", period);


--
-- Name: system_lookups_type_orderIndex_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "system_lookups_type_orderIndex_idx" ON public.system_lookups USING btree (type, "orderIndex");


--
-- Name: system_lookups_type_value_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX system_lookups_type_value_key ON public.system_lookups USING btree (type, value);


--
-- Name: user_roles_assignedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_roles_assignedById_idx" ON public.user_roles USING btree ("assignedById");


--
-- Name: user_roles_roleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_roles_roleId_idx" ON public.user_roles USING btree ("roleId");


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_username_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);


--
-- Name: work_schedules_activityTypeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "work_schedules_activityTypeId_idx" ON public.work_schedules USING btree ("activityTypeId");


--
-- Name: work_schedules_personnelId_dayOfWeek_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "work_schedules_personnelId_dayOfWeek_idx" ON public.work_schedules USING btree ("personnelId", "dayOfWeek");


--
-- Name: approval_requests approval_requests_requestedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT "approval_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: approval_requests approval_requests_reviewedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT "approval_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: approval_requests approval_requests_targetPersonnelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT "approval_requests_targetPersonnelId_fkey" FOREIGN KEY ("targetPersonnelId") REFERENCES public.personnel(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_actorUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: auth_sessions auth_sessions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: company_expenses company_expenses_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_expenses
    ADD CONSTRAINT "company_expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: kpi_group_members kpi_group_members_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_group_members
    ADD CONSTRAINT "kpi_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public.kpi_groups(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: kpi_group_members kpi_group_members_personnelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_group_members
    ADD CONSTRAINT "kpi_group_members_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES public.personnel(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: kpi_groups kpi_groups_leaderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_groups
    ADD CONSTRAINT "kpi_groups_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES public.personnel(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: kpi_settings kpi_settings_activityTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_settings
    ADD CONSTRAINT "kpi_settings_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES public.personnel_activity_types(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: kpi_settings kpi_settings_assignedPersonnelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_settings
    ADD CONSTRAINT "kpi_settings_assignedPersonnelId_fkey" FOREIGN KEY ("assignedPersonnelId") REFERENCES public.personnel(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: kpi_settings kpi_settings_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_settings
    ADD CONSTRAINT "kpi_settings_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public.kpi_groups(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: leave_requests leave_requests_personnelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT "leave_requests_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES public.personnel(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_reviewedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT "leave_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: operational_metrics operational_metrics_personnelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operational_metrics
    ADD CONSTRAINT "operational_metrics_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES public.personnel(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_disputes payroll_disputes_periodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_disputes
    ADD CONSTRAINT "payroll_disputes_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES public.payroll_periods(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_disputes payroll_disputes_personnelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_disputes
    ADD CONSTRAINT "payroll_disputes_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES public.personnel(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_disputes payroll_disputes_recordId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_disputes
    ADD CONSTRAINT "payroll_disputes_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES public.payroll_records(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_disputes payroll_disputes_reviewedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_disputes
    ADD CONSTRAINT "payroll_disputes_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payroll_disputes payroll_disputes_submittedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_disputes
    ADD CONSTRAINT "payroll_disputes_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payroll_periods payroll_periods_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_periods
    ADD CONSTRAINT "payroll_periods_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payroll_periods payroll_periods_submittedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_periods
    ADD CONSTRAINT "payroll_periods_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payroll_records payroll_records_periodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT "payroll_records_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES public.payroll_periods(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_records payroll_records_personnelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT "payroll_records_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES public.personnel(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_records payroll_records_salaryHistoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT "payroll_records_salaryHistoryId_fkey" FOREIGN KEY ("salaryHistoryId") REFERENCES public.personnel_salary_history(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: personnel_activities personnel_activities_activityTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personnel_activities
    ADD CONSTRAINT "personnel_activities_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES public.personnel_activity_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: personnel_activities personnel_activities_personnelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personnel_activities
    ADD CONSTRAINT "personnel_activities_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES public.personnel(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: personnel_salary_history personnel_salary_history_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personnel_salary_history
    ADD CONSTRAINT "personnel_salary_history_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: personnel_salary_history personnel_salary_history_personnelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personnel_salary_history
    ADD CONSTRAINT "personnel_salary_history_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES public.personnel(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: personnel_tasks personnel_tasks_activityTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personnel_tasks
    ADD CONSTRAINT "personnel_tasks_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES public.personnel_activity_types(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: personnel_tasks personnel_tasks_personnelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personnel_tasks
    ADD CONSTRAINT "personnel_tasks_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES public.personnel(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: personnel personnel_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personnel
    ADD CONSTRAINT "personnel_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: revenue_deduction_items revenue_deduction_items_transactionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_deduction_items
    ADD CONSTRAINT "revenue_deduction_items_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES public.revenue_transactions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: revenue_transactions revenue_transactions_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_transactions
    ADD CONSTRAINT "revenue_transactions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: revenue_transactions revenue_transactions_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_transactions
    ADD CONSTRAINT "revenue_transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.revenue_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: revenue_transactions revenue_transactions_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_transactions
    ADD CONSTRAINT "revenue_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: revenue_transactions revenue_transactions_personnelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_transactions
    ADD CONSTRAINT "revenue_transactions_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES public.personnel(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: revenue_transactions revenue_transactions_platformId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_transactions
    ADD CONSTRAINT "revenue_transactions_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES public.revenue_platforms(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: score_record_items score_record_items_criterionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.score_record_items
    ADD CONSTRAINT "score_record_items_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES public.criteria(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: score_record_items score_record_items_scoreRecordId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.score_record_items
    ADD CONSTRAINT "score_record_items_scoreRecordId_fkey" FOREIGN KEY ("scoreRecordId") REFERENCES public.score_records(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: score_records score_records_personnelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.score_records
    ADD CONSTRAINT "score_records_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES public.personnel(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_roles user_roles_assignedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "user_roles_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: user_roles user_roles_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_roles user_roles_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: work_schedules work_schedules_activityTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_schedules
    ADD CONSTRAINT "work_schedules_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES public.personnel_activity_types(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: work_schedules work_schedules_personnelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_schedules
    ADD CONSTRAINT "work_schedules_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES public.personnel(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--




-- Seed only the built-in system role. Business roles are synchronized by
-- scripts/migrate-rbac-roles.ts and no personnel/demo data is created here.
INSERT INTO public.roles
  ("code", "name", "roleTitle", "category", "description", "isSystemRole", "defaultTabs", "defaultActions", "defaultDepartments")
VALUES
  ('system_admin', 'System Admin', 'System Administrator', 'leadership',
   'Toàn quyền quản trị hệ thống, độc lập với phòng ban và chức danh nghiệp vụ.',
   true,
   '["roster","scoring","leaderboard","schedule","tasks","analytics","admin","my_dashboard","payroll","payroll_disputes","kpi","revenue","finance"]'::jsonb,
   '["manage_idols","manage_scores","manage_criteria","manage_schedule","manage_tasks","manage_departments","manage_settings","manage_approvals","manage_payroll","adjust_payroll","approve_payroll","hot_bonus","manage_kpi","manage_revenue"]'::jsonb,
   '["*"]'::jsonb)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO public.user_roles ("userId", "roleId")
SELECT u."id", r."id"
FROM public.users u
JOIN public.roles r ON r."code" = 'system_admin'
WHERE u."accountType" = 'system_admin'
ON CONFLICT ("userId", "roleId") DO NOTHING;

