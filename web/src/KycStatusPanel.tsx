
import { useEffect, useState } from "react";
import { ShieldCheck, AlertCircle } from "lucide-react";
import {
  getKycStatus,
  type KycStatusResponse,
} from "./api";

export default function KycStatusPanel({
  token,
}: {
  token: string;
}) {
  const [kyc, setKyc] =
    useState<KycStatusResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getKycStatus(token)
      .then((result) => {
        if (active) setKyc(result);
      })
      .catch(() => {
        if (active) {
          setError("Unable to load verification status.");
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  const verified = kyc?.status === "VERIFIED";

  const title =
    !kyc
      ? "Checking verification status..."
      : verified
        ? "Identity verified"
        : kyc.status === "PENDING"
          ? "Verification pending"
          : kyc.status === "REJECTED"
            ? "Verification rejected"
            : "Identity verification required";

  const description =
    verified
      ? "Your account is eligible to participate in loan agreements."
      : kyc?.status === "PENDING"
        ? "Your verification submission is awaiting review."
        : kyc?.status === "REJECTED"
          ? "Your previous verification was rejected."
          : "You can explore your dashboard, but loan creation requires verified KYC. Identity-document submission is not available in this demo yet.";

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-start gap-4">
        <div className={`rounded-xl p-3 ${
          verified
            ? "bg-teal-50 text-teal-700"
            : "bg-amber-50 text-amber-700"
        }`}>
          {verified
            ? <ShieldCheck size={25} />
            : <AlertCircle size={25} />}
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {title}
          </h2>

          {error ? (
            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {description}
            </p>
          )}

          {kyc?.status === "REJECTED" &&
            kyc.rejectionReason && (
              <p className="mt-2 text-sm text-red-600">
                Reason: {kyc.rejectionReason}
              </p>
            )}
        </div>
      </div>
    </section>
  );
}
