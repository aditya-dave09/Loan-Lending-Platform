
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Landmark,
  Plus,
  CalendarDays,
  AlertCircle,
} from "lucide-react";

import {
  getLoans,
  createLoan,
  getLoanDetails,
  inr,
} from "./api";

import type {
  Session,
  LoanSummary,
  LoanDetails,
} from "./api";

// --------------------------------------
// Shared layout
// --------------------------------------

function LoanLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <Link
            to="/dashboard"
            className="flex items-center gap-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
              <Landmark size={21} />
            </span>
            <span className="text-xl font-bold text-slate-900">
              LoanForge
            </span>
          </Link>

          <nav className="flex items-center gap-5 text-sm font-semibold text-slate-600">
            <Link
              to="/dashboard"
              className="hover:text-teal-700"
            >
              Dashboard
            </Link>
            <Link
              to="/agreements"
              className="hover:text-teal-700"
            >
              Agreements
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700",
    PENDING_SIGNATURES: "bg-amber-100 text-amber-800",
    ACTIVE: "bg-teal-100 text-teal-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-700",
    DEFAULTED: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      <AlertCircle size={19} className="shrink-0" />
      <p>{message}</p>
    </div>
  );
}

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// --------------------------------------
// My Agreements
// --------------------------------------

export function AgreementsPage({
  session,
}: {
  session: Session;
}) {
  const [loans, setLoans] = useState<LoanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getLoans(session.accessToken)
      .then((result) => {
        if (active) setLoans(result);
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load agreements."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.accessToken]);

  return (
    <LoanLayout>
      <div className="mb-9 flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-teal-700">
            YOUR WORKSPACE
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
            My Agreements
          </h1>
          <p className="mt-3 text-slate-500">
            Manage the loans you're involved in.
          </p>
        </div>

        <Link
          to="/agreements/new"
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white hover:bg-teal-700"
        >
          <Plus size={19} />
          New Agreement
        </Link>
      </div>

      {loading && (
        <p role="status" className="text-slate-500">
          Loading agreements...
        </p>
      )}

      {error && <ErrorMessage message={error} />}

      {!loading && !error && loans.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
          <FileText
            size={42}
            className="mx-auto text-teal-600"
          />
          <h2 className="mt-5 text-2xl font-bold">
            No agreements yet
          </h2>
          <p className="mx-auto mt-3 max-w-md text-slate-500">
            Your loan agreements will appear here once
            you create or participate in one.
          </p>
          <Link
            to="/agreements/new"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white"
          >
            Create first agreement
            <ArrowRight size={17} />
          </Link>
        </div>
      )}

      {!loading && !error && loans.length > 0 && (
        <div className="grid gap-4">
          {loans.map((loan) => (
            <Link
              key={loan.id}
              to={`/agreements/${loan.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-teal-300 hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-bold text-slate-900">
                      {loan.agreementNumber}
                    </h2>
                    <StatusBadge status={loan.status} />
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {loan.myRole === "LENDER"
                      ? "Lending to"
                      : "Borrowing from"}{" "}
                    {loan.counterparty?.name || "Counterparty"}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-2xl font-bold text-slate-900">
                    {inr(loan.principalAmount)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {loan.interestRate}% annual interest
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 text-sm text-slate-500">
                <span>
                  Tenure: {loan.tenureMonths} months
                </span>
                <span>
                  Created {dateLabel(loan.createdAt)}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-teal-700">
                  View details <ArrowRight size={16} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </LoanLayout>
  );
}

// --------------------------------------
// Create Agreement
// --------------------------------------

export function CreateLoanPage({
  session,
}: {
  session: Session;
}) {
  const navigate = useNavigate();

  const [borrowerEmail, setBorrowerEmail] = useState("");
  const [principal, setPrincipal] = useState("50000");
  const [rate, setRate] = useState("10");
  const [months, setMonths] = useState("12");
  const [purpose, setPurpose] = useState("");
  const [terms, setTerms] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const p = Number(principal);
  const annualRate = Number(rate);
  const n = Number(months);
  const monthlyRate = annualRate / 1200;

  const estimatedEMI =
    p > 0 && n > 0 && annualRate >= 0
      ? monthlyRate === 0
        ? p / n
        : (p * monthlyRate) /
          (1 - Math.pow(1 + monthlyRate, -n))
      : NaN;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const created = await createLoan(
        session.accessToken,
        {
          borrowerEmail: borrowerEmail.trim(),
          principalAmount: p,
          interestRate: annualRate,
          tenureMonths: n,
          repaymentFrequency: "MONTHLY",
          purpose: purpose.trim(),
          terms: terms.trim(),
        }
      );

      navigate(`/agreements/${created.id}`, {
        replace: true,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create agreement."
      );
    } finally {
      setBusy(false);
    }
  }

  const inputStyle =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

  return (
    <LoanLayout>
      <Link
        to="/agreements"
        className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-teal-700"
      >
        <ArrowLeft size={17} />
        Back to agreements
      </Link>

      <div className="mb-9">
        <p className="text-sm font-bold uppercase tracking-widest text-teal-700">
          NEW AGREEMENT
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
          Create a loan agreement
        </h1>
        <p className="mt-3 text-slate-500">
          Enter the details agreed between you and
          the borrower.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <form
          onSubmit={handleSubmit}
          className="space-y-7 rounded-2xl border border-slate-200 bg-white p-7 lg:col-span-2"
        >
          <div>
            <h2 className="text-xl font-bold">
              Borrower details
            </h2>

            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Borrower email
              <input
                type="email"
                required
                value={borrowerEmail}
                onChange={(e) =>
                  setBorrowerEmail(e.target.value)
                }
                placeholder="borrower@example.com"
                className={inputStyle}
              />
            </label>

            <p className="mt-2 text-xs text-slate-500">
              The borrower must already have a
              verified LoanForge account.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-7">
            <h2 className="text-xl font-bold">
              Financial terms
            </h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Principal amount (INR)
                <input
                  type="number"
                  required
                  min="1000"
                  max="10000000"
                  step="0.01"
                  value={principal}
                  onChange={(e) =>
                    setPrincipal(e.target.value)
                  }
                  className={inputStyle}
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Annual interest rate (%)
                <input
                  type="number"
                  required
                  min="0"
                  max="36"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className={inputStyle}
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Tenure (months)
                <input
                  type="number"
                  required
                  min="1"
                  max="60"
                  step="1"
                  value={months}
                  onChange={(e) => setMonths(e.target.value)}
                  className={inputStyle}
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Repayment frequency
                <input
                  value="Monthly"
                  readOnly
                  className={inputStyle + " bg-slate-50"}
                />
              </label>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-7">
            <h2 className="text-xl font-bold">
              Additional details
            </h2>

            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Loan purpose (optional)
              <input
                value={purpose}
                maxLength={500}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g., Education expenses"
                className={inputStyle}
              />
            </label>

            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Additional agreed terms (optional)
              <textarea
                value={terms}
                maxLength={5000}
                onChange={(e) => setTerms(e.target.value)}
                rows={4}
                placeholder="Enter any additional terms..."
                className={inputStyle}
              />
            </label>
          </div>

          {error && <ErrorMessage message={error} />}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-7 py-4 font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {busy ? "Creating..." : "Create draft agreement"}
            {!busy && <ArrowRight size={19} />}
          </button>
        </form>

        <aside>
          <div className="sticky top-6 rounded-2xl bg-slate-950 p-7 text-white">
            <div className="mb-5 flex items-center gap-3">
              <CalendarDays
                size={25}
                className="text-teal-400"
              />
              <h2 className="text-xl font-bold">
                Loan preview
              </h2>
            </div>

            <p className="text-sm text-slate-400">
              Principal
            </p>
            <p className="mt-1 text-3xl font-bold">
              {Number.isFinite(p) && p >= 0
                ? inr(p)
                : "—"}
            </p>

            <div className="my-6 border-t border-white/10" />

            <p className="text-sm text-slate-400">
              Estimated monthly installment
            </p>

            <p className="mt-2 text-3xl font-bold text-teal-300">
              {Number.isFinite(estimatedEMI)
                ? inr(estimatedEMI)
                : "—"}
            </p>

            <p className="mt-4 text-sm text-slate-400">
              Tenure: {months || "—"} months
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Annual interest: {rate || "0"}%
            </p>

            <div className="mt-7 rounded-xl border border-white/10 p-4 text-xs leading-6 text-slate-300">
              Illustrative monthly reducing-balance EMI.
              The server generates the final schedule and
              adjusts rounding when the agreement is created.
            </div>
          </div>
        </aside>
      </div>
    </LoanLayout>
  );
}

// --------------------------------------
// Agreement Details
// --------------------------------------

export function AgreementPage({
  session,
}: {
  session: Session;
}) {
  const { loanId } = useParams<{ loanId: string }>();

  const [loan, setLoan] = useState<LoanDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loanId) {
      setError("Agreement ID is missing.");
      setLoading(false);
      return;
    }

    let active = true;

    getLoanDetails(session.accessToken, loanId)
      .then((data) => {
        if (active) setLoan(data);
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load agreement."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.accessToken, loanId]);

  const lender = loan?.participants.find(
    (p) => p.role === "LENDER"
  );

  const borrower = loan?.participants.find(
    (p) => p.role === "BORROWER"
  );

  return (
    <LoanLayout>
      <Link
        to="/agreements"
        className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-teal-700"
      >
        <ArrowLeft size={17} />
        Back to agreements
      </Link>

      {loading && (
        <p role="status">Loading agreement...</p>
      )}

      {error && <ErrorMessage message={error} />}

      {loan && !error && (
        <>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-teal-700">
                AGREEMENT DETAILS
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {loan.agreementNumber}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Created {dateLabel(loan.createdAt)}
              </p>
            </div>

            <StatusBadge status={loan.status} />
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              ["Principal amount", inr(loan.principalAmount)],
              ["Annual interest", `${loan.interestRate}%`],
              ["Total scheduled repayment",
                inr(loan.totalRepayable || "0")],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <p className="text-sm text-slate-500">
                  {label}
                </p>
                <p className="mt-3 text-2xl font-bold">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-7 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-7">
              <h2 className="text-xl font-bold">
                Participants
              </h2>

              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Lender
                  </p>
                  <p className="mt-1 font-semibold">
                    {lender
                      ? `${lender.user.firstName} ${lender.user.lastName}`
                      : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Borrower
                  </p>
                  <p className="mt-1 font-semibold">
                    {borrower
                      ? `${borrower.user.firstName} ${borrower.user.lastName}`
                      : "—"}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-7">
              <h2 className="text-xl font-bold">
                Agreement terms
              </h2>

              <div className="mt-6 space-y-3 text-sm">
                <p>
                  <strong>Tenure:</strong>{" "}
                  {loan.tenureMonths} months
                </p>
                <p>
                  <strong>Frequency:</strong>{" "}
                  {loan.repaymentFrequency}
                </p>
                <p>
                  <strong>Purpose:</strong>{" "}
                  {loan.purpose || "Not specified"}
                </p>
                <div className="border-t border-slate-100 pt-3">
                  <strong>Additional terms:</strong>
                  <p className="mt-2 whitespace-pre-wrap break-words text-slate-600">
                    {loan.terms || "None specified"}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 p-7">
              <h2 className="text-xl font-bold">
                Repayment schedule
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Schedule calculated by the LoanForge backend.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Due date</th>
                    <th className="px-6 py-4">Principal</th>
                    <th className="px-6 py-4">Interest</th>
                    <th className="px-6 py-4">Amount due</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loan.repaymentSchedule.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-6 py-4">
                        {item.installmentNumber}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {dateLabel(item.dueDate)}
                      </td>
                      <td className="px-6 py-4">
                        {inr(item.principalPortion)}
                      </td>
                      <td className="px-6 py-4">
                        {inr(item.interestPortion)}
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        {inr(item.amountDue)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="mt-6 text-sm text-slate-500">
            This is a draft agreement management system.
            Signing and payment recording will be
            integrated in the next milestone.
          </p>
        </>
      )}
    </LoanLayout>
  );
}
