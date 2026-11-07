
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000/api/v1";

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

export interface DashboardStats {
  totalLoansAsLender: number;
  totalLoansAsBorrower: number;
  activeLoans: number;
  totalLent: string;
  totalBorrowed: string;
  totalRepaymentReceived: string;
  totalRepaymentMade: string;
  overduePayments: number;
  upcomingPayments: {
    loanId: string;
    agreementNumber: string;
    dueDate: string;
    amountDue: string;
    counterparty: string | null;
  }[];
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

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

  const result: ApiResponse<T> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Request failed");
  }

  return result.data;
}

export function login(email: string, password: string) {
  return apiRequest<Session>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function getDashboard(token: string) {
  return apiRequest<DashboardStats>(
    "/dashboard/stats",
    { method: "GET" },
    token
  );
}

export function logout(
  accessToken: string,
  refreshToken: string
) {
  return apiRequest<null>(
    "/auth/logout",
    {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    },
    accessToken
  );
}

export function inr(value: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

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
  participants: {
    role: "LENDER" | "BORROWER";
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  }[];
  repaymentSchedule: {
    id: string;
    installmentNumber: number;
    amountDue: string;
    principalPortion: string;
    interestPortion: string;
    paidAmount: string;
    dueDate: string;
    status: string;
  }[];
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

export function getLoans(token: string) {
  return apiRequest<LoanSummary[]>(
    "/loans?limit=100",
    {},
    token
  );
}

export function getLoanDetails(
  token: string,
  loanId: string
) {
  return apiRequest<LoanDetails>(
    `/loans/${encodeURIComponent(loanId)}`,
    {},
    token
  );
}

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
