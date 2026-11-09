
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000/api/v1";

// ==========================================
// USER AND AUTHENTICATION TYPES
// ==========================================

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "USER" | "ADMIN";
}

export interface Session {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// ==========================================
// DASHBOARD TYPES
// ==========================================

export interface UpcomingPayment {
  loanId: string;
  agreementNumber: string;
  dueDate: string;
  amountDue: string;
  counterparty: string | null;
}

export interface DashboardStats {
  totalLoansAsLender: number;
  totalLoansAsBorrower: number;
  activeLoans: number;
  totalLent: string;
  totalBorrowed: string;
  totalRepaymentReceived: string;
  totalRepaymentMade: string;
  overduePayments: number;
  upcomingPayments: UpcomingPayment[];
}

// ==========================================
// LOAN TYPES
// ==========================================

export interface LoanSummary {
  id: string;
  agreementNumber: string;
  principalAmount: string;
  interestRate: string;
  tenureMonths: number;
  totalRepayable: string | null;
  status: string;
  myRole: "LENDER" | "BORROWER";
  counterparty: {
    id: string;
    name: string;
  } | null;
  nextDueDate: string | null;
  createdAt: string;
}

export interface SignatureRecord {
  userId: string;
  status: string;
  signedAt: string | null;
}

export interface LoanParticipant {
  role: "LENDER" | "BORROWER";
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface LoanInstallment {
  id: string;
  installmentNumber: number;
  amountDue: string;
  principalPortion: string;
  interestPortion: string;
  paidAmount: string;
  dueDate: string;
  status: string;
}

export interface LoanDetails {
  id: string;
  agreementNumber: string;
  principalAmount: string;
  interestRate: string;
  tenureMonths: number;
  repaymentFrequency: string;
  purpose: string | null;
  terms: string | null;
  totalRepayable: string | null;
  status: string;
  createdAt: string;
  signatures: SignatureRecord[];
  participants: LoanParticipant[];
  repaymentSchedule: LoanInstallment[];
}

export interface CreateLoanInput {
  borrowerEmail: string;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  repaymentFrequency: "MONTHLY";
  purpose: string;
  terms: string;
}

// ==========================================
// COMMON API RESPONSE
// ==========================================

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ==========================================
// CENTRAL API REQUEST FUNCTION
// ==========================================

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
      ...options.headers,
    },
  });

  let result: ApiResponse<T>;

  try {
    result = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new Error(
      `Invalid server response (HTTP ${response.status})`
    );
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.message || `Request failed (HTTP ${response.status})`
    );
  }

  return result.data;
}

// ==========================================
// AUTHENTICATION API
// ==========================================

// Login user
export function login(email: string, password: string) {
  return apiRequest<Session>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
    }),
  });
}

// Logout user
export function logout(
  accessToken: string,
  refreshToken: string
) {
  return apiRequest<null>(
    "/auth/logout",
    {
      method: "POST",
      body: JSON.stringify({
        refreshToken,
      }),
    },
    accessToken
  );
}

// ==========================================
// DASHBOARD API
// ==========================================

export function getDashboard(token: string) {
  return apiRequest<DashboardStats>(
    "/dashboard/stats",
    { method: "GET" },
    token
  );
}

// ==========================================
// LOAN MANAGEMENT API
// ==========================================

// Fetch all agreements belonging to the user
export function getLoans(token: string) {
  return apiRequest<LoanSummary[]>(
    "/loans?limit=100",
    { method: "GET" },
    token
  );
}

// Fetch complete details of an agreement
export function getLoanDetails(
  token: string,
  loanId: string
) {
  return apiRequest<LoanDetails>(
    `/loans/${encodeURIComponent(loanId)}`,
    { method: "GET" },
    token
  );
}

// Create a draft loan agreement
export function createLoan(
  token: string,
  loan: CreateLoanInput
) {
  return apiRequest<{
    id: string;
    agreementNumber: string;
    status: string;
  }>(
    "/loans",
    {
      method: "POST",
      body: JSON.stringify(loan),
    },
    token
  );
}

// ==========================================
// AGREEMENT SUBMISSION API
// ==========================================

// Submit draft agreement for signatures
export function submitAgreement(
  token: string,
  loanId: string
) {
  return apiRequest<{ status: string }>(
    `/loans/${encodeURIComponent(loanId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "PENDING_SIGNATURES",
      }),
    },
    token
  );
}

// ==========================================
// OTP SIGNATURE API
// ==========================================

// Request OTP to confirm agreement
export function requestSigningOTP(
  token: string,
  loanId: string
) {
  return apiRequest<{
    message: string;
    expiresIn: number;
    _devOtp?: string;
  }>(
    `/loans/${encodeURIComponent(loanId)}/sign/request-otp`,
    {
      method: "POST",
    },
    token
  );
}

// Verify OTP and record confirmation
export function confirmSigningOTP(
  token: string,
  loanId: string,
  otp: string
) {
  return apiRequest<{
    signedAt: string;
    signatureHash: string;
    loanActivated: boolean;
  }>(
    `/loans/${encodeURIComponent(loanId)}/sign/verify`,
    {
      method: "POST",
      body: JSON.stringify({ otp }),
    },
    token
  );
}

// ==========================================
// AGREEMENT PDF DOWNLOAD
// ==========================================

export async function downloadAgreementPDF(
  token: string,
  loanId: string
): Promise<Blob> {
  const response = await fetch(
    `${BASE_URL}/loans/${encodeURIComponent(loanId)}/pdf`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    let message = "Unable to download agreement PDF.";

    try {
      const error = await response.json();
      message = error.message || message;
    } catch {
      // Keep the default error message.
    }

    throw new Error(message);
  }

  return response.blob();
}

// ==========================================
// CURRENCY FORMATTING
// ==========================================

export function inr(value: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export type PaymentMethod =
  | "UPI"
  | "BANK_TRANSFER"
  | "CASH"
  | "CHEQUE"
  | "OTHER";

export interface RepaymentTransaction {
  id: string;
  amountPaid: string;
  paymentMethod: PaymentMethod;
  transactionRef: string | null;
  paidAt: string;
}

export interface RepaymentInstallment {
  id: string;
  installment: number;
  amountDue: string;
  principalPortion: string;
  interestPortion: string;
  dueDate: string;
  status: string;
  paidAmount: string;
  transactions: RepaymentTransaction[];
}

export interface RepaymentData {
  summary: {
    totalRepayable: string;
    totalPaid: string;
    totalRemaining: string;
    nextDueDate: string | null;
    nextDueAmount: string | null;
    overdueCount: number;
  };
  schedule: RepaymentInstallment[];
}

export interface RecordRepaymentInput {
  amountPaid: number;
  paymentMethod: PaymentMethod;
  transactionRef: string;
  notes: string;
}

export function getRepaymentSchedule(
  token: string,
  loanId: string
) {
  return apiRequest<RepaymentData>(
    `/loans/${encodeURIComponent(loanId)}/repayments`,
    { method: "GET" },
    token
  );
}

export function recordRepayment(
  token: string,
  scheduleId: string,
  payment: RecordRepaymentInput
) {
  return apiRequest<{
    transactionId: string;
    installment: number;
    amountPaid: number;
    status: string;
    remainingBalance: string;
  }>(
    `/repayments/${encodeURIComponent(scheduleId)}/pay`,
    {
      method: "POST",
      body: JSON.stringify(payment),
    },
    token
  );
}

export interface LoanAIResponse {
  answer: string;
  model: string;
}

export function askLoanAI(
  token: string,
  loanId: string,
  question: string
) {
  return apiRequest<LoanAIResponse>(
    `/ai/loans/${encodeURIComponent(loanId)}/ask`,
    {
      method: "POST",
      body: JSON.stringify({ question }),
    },
    token
  );
}
