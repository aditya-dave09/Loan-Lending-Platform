
import { useState } from "react";
import type { FormEvent } from "react";

import {
  CheckCircle2,
  Download,
  Send,
  ShieldCheck,
} from "lucide-react";

import {
  submitAgreement,
  requestSigningOTP,
  confirmSigningOTP,
  downloadAgreementPDF,
} from "./api";

import type { LoanDetails, Session } from "./api";

interface Props {
  loan: LoanDetails;
  session: Session;
  onChanged: () => void;
}

export default function AgreementActions({
  loan,
  session,
  onChanged,
}: Props) {
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [consent, setConsent] = useState(false);

  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Identify the currently logged-in participant.
  const me = loan.participants.find(
    (p) => p.user.id === session.user.id
  );

  const isLender = me?.role === "LENDER";

  const mySignature = loan.signatures.find(
    (s) => s.userId === session.user.id
  );

  const alreadySigned = mySignature?.status === "SIGNED";

  const buttonClass =
    "inline-flex items-center justify-center gap-2 " +
    "rounded-xl bg-teal-600 px-5 py-3 font-semibold " +
    "text-white hover:bg-teal-700 disabled:opacity-50";

  function getError(err: unknown) {
    return err instanceof Error
      ? err.message
      : "Something went wrong. Please try again.";
  }

  // Submit the draft for both participants to sign.
  async function handleSubmit() {
    const confirmed = window.confirm(
      "Submit this agreement for both parties to review?"
    );

    if (!confirmed) return;

    setBusy("submit");
    setError("");
    setMessage("");

    try {
      await submitAgreement(
        session.accessToken,
        loan.id
      );

      setMessage("Agreement submitted successfully.");
      onChanged();
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy("");
    }
  }

  // Request a signing code.
  async function handleRequestOTP() {
    setBusy("otp");
    setError("");
    setMessage("");
    setDevOtp("");

    try {
      const result = await requestSigningOTP(
        session.accessToken,
        loan.id
      );

      setMessage(result.message);
      setDevOtp(result._devOtp || "");
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy("");
    }
  }

  // Confirm the agreement.
  async function handleSign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!consent) {
      setError("Please accept the agreement terms first.");
      return;
    }

    setBusy("sign");
    setError("");
    setMessage("");

    try {
      const result = await confirmSigningOTP(
        session.accessToken,
        loan.id,
        otp
      );

      setMessage(
        result.loanActivated
          ? "Agreement activated successfully."
          : "Your confirmation has been recorded."
      );

      setOtp("");
      setDevOtp("");
      setConsent(false);

      // Reload agreement details from the backend.
      onChanged();
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy("");
    }
  }

  // Download the real PDF from Express.
  async function handleDownload() {
    setBusy("pdf");
    setError("");
    setMessage("");

    try {
      const pdf = await downloadAgreementPDF(
        session.accessToken,
        loan.id
      );

      const url = URL.createObjectURL(pdf);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${loan.agreementNumber}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 30000);

      setMessage("PDF downloaded successfully.");
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-7">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-teal-50 p-3 text-teal-700">
          <ShieldCheck size={25} />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Agreement Confirmation
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Review and confirm your loan agreement.
          </p>
        </div>
      </div>

      {/* Draft agreement */}
      {loan.status === "DRAFT" && (
        <div className="rounded-xl bg-slate-50 p-5">
          <p className="mb-4 text-sm text-slate-600">
            The agreement is currently a draft.
          </p>

          {isLender ? (
            <button
              onClick={handleSubmit}
              disabled={busy !== ""}
              className={buttonClass}
            >
              <Send size={18} />
              {busy === "submit"
                ? "Submitting..."
                : "Submit for signatures"}
            </button>
          ) : (
            <p className="text-sm text-slate-500">
              Waiting for the lender to submit this agreement.
            </p>
          )}
        </div>
      )}

      {/* Agreement waiting for signatures */}
      {loan.status === "PENDING_SIGNATURES" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {loan.participants.map((participant) => {
              const signed = loan.signatures.some(
                (s) =>
                  s.userId === participant.user.id &&
                  s.status === "SIGNED"
              );

              return (
                <div
                  key={participant.user.id}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <p className="text-xs font-bold uppercase text-slate-500">
                    {participant.role}
                  </p>

                  <p className="mt-2 font-semibold text-slate-900">
                    {participant.user.firstName}{" "}
                    {participant.user.lastName}
                  </p>

                  <p
                    className={`mt-3 text-sm font-medium ${
                      signed
                        ? "text-green-700"
                        : "text-amber-700"
                    }`}
                  >
                    {signed
                      ? "Confirmed"
                      : "Awaiting confirmation"}
                  </p>
                </div>
              );
            })}
          </div>

          {alreadySigned ? (
            <div className="flex items-center gap-3 rounded-xl bg-green-50 p-5 text-green-800">
              <CheckCircle2 size={22} />
              Your confirmation is recorded.
              Waiting for the other participant.
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 p-6">
              <button
                disabled={busy !== ""}
                onClick={handleRequestOTP}
                className={buttonClass}
              >
                {busy === "otp"
                  ? "Generating code..."
                  : "Request signing code"}
              </button>

              {devOtp && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-xs font-bold uppercase text-amber-800">
                    Local development code
                  </p>

                  <p className="mt-3 text-3xl font-bold tracking-widest text-slate-900">
                    {devOtp}
                  </p>

                  <p className="mt-2 text-xs text-amber-800">
                    For local testing only.
                    Never expose signing codes in production.
                  </p>
                </div>
              )}

              <form
                onSubmit={handleSign}
                className="mt-6 space-y-5"
              >
                <label className="block text-sm font-semibold text-slate-700">
                  Six-digit signing code

                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(event) => {
                      setOtp(
                        event.target.value.replace(/\D/g, "")
                      );
                    }}
                    placeholder="Enter the code"
                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-teal-600"
                  />
                </label>

                <label className="flex items-start gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={consent}
                    onChange={(event) =>
                      setConsent(event.target.checked)
                    }
                  />

                  <span>
                    I have reviewed this agreement and
                    consent to the displayed terms.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={
                    busy !== "" ||
                    otp.length !== 6 ||
                    !consent
                  }
                  className={buttonClass}
                >
                  {busy === "sign"
                    ? "Confirming..."
                    : "Confirm agreement"}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Activated or completed agreement */}
      {(loan.status === "ACTIVE" ||
        loan.status === "COMPLETED") && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl bg-green-50 p-5 text-green-800">
            <CheckCircle2 size={23} />
            Both participants have confirmed the agreement.
          </div>

          <button
            disabled={busy !== ""}
            onClick={handleDownload}
            className={buttonClass}
          >
            <Download size={18} />

            {busy === "pdf"
              ? "Generating PDF..."
              : "Download Agreement PDF"}
          </button>
        </div>
      )}

      {message && (
        <p
          role="status"
          className="mt-5 text-sm font-medium text-teal-700"
        >
          {message}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <p className="mt-7 text-xs leading-6 text-slate-500">
        This is an application-level agreement confirmation
        process. It is not a certified electronic signature
        or a guarantee of legal enforceability.
      </p>
    </section>
  );
}
