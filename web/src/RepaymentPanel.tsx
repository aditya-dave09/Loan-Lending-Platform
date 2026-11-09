
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  CheckCircle2,
  CreditCard,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import {
  getRepaymentSchedule,
  recordRepayment,
  inr,
} from "./api";

import type {
  LoanDetails,
  PaymentMethod,
  RepaymentData,
  Session,
} from "./api";

interface Props {
  loan: LoanDetails;
  session: Session;
  onChanged: () => void;
}

export default function RepaymentPanel({
  loan,
  session,
  onChanged,
}: Props) {
  const [data, setData] = useState<RepaymentData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);

  const [amount, setAmount] = useState("");
  const [method, setMethod] =
    useState<PaymentMethod>("UPI");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isBorrower = loan.participants.some(
    (participant) =>
      participant.role === "BORROWER" &&
      participant.user.id === session.user.id
  );

  useEffect(() => {
    let active = true;
    setLoading(true);

    getRepaymentSchedule(
      session.accessToken,
      loan.id
    )
      .then((result) => {
        if (active) {
          setData(result);
          setError("");
        }
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load repayments."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.accessToken, loan.id, reload]);

  const payable = data?.schedule.find(
    (item) =>
      item.status === "DUE" ||
      item.status === "PARTIALLY_PAID" ||
      item.status === "OVERDUE"
  );

  const remainingForInstallment = payable
    ? Math.max(
        0,
        Number(payable.amountDue) -
          Number(payable.paidAmount)
      )
    : 0;

  async function handlePayment(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!payable || busy) return;

    const paymentAmount = Number(amount);

    if (
      !Number.isFinite(paymentAmount) ||
      paymentAmount <= 0 ||
      !/^\d+(\.\d{1,2})?$/.test(amount.trim()) ||
      paymentAmount > remainingForInstallment + 0.000001
    ) {
      setError(
        "Enter a valid amount greater than zero, with no more than two decimal places, within the outstanding installment balance."
      );
      return;
    }

    const confirmed = window.confirm(
      `Record a reported payment of ${inr(paymentAmount)}? ` +
      "This does not actually transfer or verify money."
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const result = await recordRepayment(
        session.accessToken,
        payable.id,
        {
          amountPaid: paymentAmount,
          paymentMethod: method,
          transactionRef: reference.trim(),
          notes: notes.trim(),
        }
      );

      setMessage(
        `${inr(result.amountPaid)} recorded against ` +
        `installment #${result.installment}.`
      );

      setAmount("");
      setReference("");
      setNotes("");

      // Refresh repayment figures and the agreement page.
      setReload((value) => value + 1);
      onChanged();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not record payment."
      );
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-300 " +
    "bg-white px-4 py-3 text-slate-900 outline-none " +
    "focus:border-teal-600";

  return (
    <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-7">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-teal-50 p-3 text-teal-700">
            <CreditCard size={25} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Repayment tracking
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Review recorded payments and remaining dues.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setReload((value) => value + 1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {loading && (
        <p className="text-slate-500">
          Loading repayment details...
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="mb-5 flex gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={19} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              [
                "Total scheduled",
                data.summary.totalRepayable,
              ],
              [
                "Recorded as paid",
                data.summary.totalPaid,
              ],
              [
                "Outstanding",
                data.summary.totalRemaining,
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl bg-slate-50 p-5"
              >
                <p className="text-sm text-slate-500">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {inr(value)}
                </p>
              </div>
            ))}
          </div>

          {loan.status !== "ACTIVE" &&
            loan.status !== "COMPLETED" && (
              <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                Payments can be recorded only after both
                participants confirm the agreement.
              </p>
            )}

          {loan.status === "ACTIVE" &&
            !isBorrower && (
              <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Only the borrower can record a payment.
                You can review the amounts recorded here.
              </p>
            )}

          {loan.status === "ACTIVE" &&
            isBorrower &&
            payable && (
              <form
                onSubmit={handlePayment}
                className="mt-7 border-t border-slate-100 pt-7"
              >
                <h3 className="text-lg font-bold text-slate-900">
                  Record an installment payment
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Installment #{payable.installment}
                  {" · "}
                  Remaining due:{" "}
                  <strong>
                    {inr(remainingForInstallment)}
                  </strong>
                </p>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Amount paid (INR)
                    <input
                      type="number"
                      min="0.01"
                      max={remainingForInstallment}
                      step="0.01"
                      required
                      value={amount}
                      onChange={(event) =>
                        setAmount(event.target.value)
                      }
                      placeholder="Enter amount"
                      className={inputClass}
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-700">
                    Payment method
                    <select
                      value={method}
                      onChange={(event) =>
                        setMethod(
                          event.target.value as PaymentMethod
                        )
                      }
                      className={inputClass}
                    >
                      <option value="UPI">UPI</option>
                      <option value="BANK_TRANSFER">
                        Bank transfer
                      </option>
                      <option value="CASH">Cash</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </label>

                  <label className="block text-sm font-semibold text-slate-700">
                    Transaction reference (optional)
                    <input
                      value={reference}
                      maxLength={100}
                      onChange={(event) =>
                        setReference(event.target.value)
                      }
                      placeholder="e.g., DEMO-TXN-001"
                      className={inputClass}
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-700">
                    Notes (optional)
                    <input
                      value={notes}
                      maxLength={500}
                      onChange={(event) =>
                        setNotes(event.target.value)
                      }
                      placeholder="Payment notes"
                      className={inputClass}
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-6 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {busy
                    ? "Recording..."
                    : "Record payment"}
                </button>
              </form>
            )}

          {loan.status === "COMPLETED" && (
            <div className="mt-6 flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-800">
              <CheckCircle2 size={20} />
              All installments have been recorded as paid.
            </div>
          )}

          {message && (
            <p
              role="status"
              className="mt-5 rounded-xl bg-teal-50 p-4 text-sm font-medium text-teal-800"
            >
              {message}
            </p>
          )}

          <p className="mt-6 text-xs leading-5 text-slate-500">
            LoanForge records borrower-reported payments.
            These entries do not independently verify
            receipt of funds or initiate a transfer.
          </p>
        </>
      )}
    </section>
  );
}
