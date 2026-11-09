
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Landmark,
  ShieldCheck,
  UserPlus,
  CheckCircle2,
} from "lucide-react";

import { registerUser, login } from "./api";
import type { Session } from "./api";

type FormFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

export default function SignupPage({
  onLogin,
}: {
  onLogin: (session: Session) => void;
}) {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormFields>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(field: keyof FormFields, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const strongPassword =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).{8,128}$/;

    if (!strongPassword.test(form.password)) {
      setError(
        "Password needs 8+ characters, uppercase, lowercase, a number and a special character."
      );
      return;
    }

    if (!/^\+?[1-9]\d{9,14}$/.test(form.phone.trim())) {
      setError("Enter a valid phone number, for example +919876543210.");
      return;
    }

    setLoading(true);

    const email = form.email.trim().toLowerCase();

    try {
      await registerUser({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email,
        phone: form.phone.trim(),
        password: form.password,
      });

      // Account has been created.
      // Sign the user in automatically.
      try {
        const session = await login(email, form.password);
        onLogin(session);
        navigate("/dashboard", { replace: true });
      } catch {
        // Registration succeeded, but automatic login failed.
        // Let the user sign in normally.
        navigate("/login?registered=1", { replace: true });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create account."
      );
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    {
      key: "firstName",
      label: "First name",
      type: "text",
      placeholder: "John",
      autoComplete: "given-name",
    },
    {
      key: "lastName",
      label: "Last name",
      type: "text",
      placeholder: "Doe",
      autoComplete: "family-name",
    },
    {
      key: "email",
      label: "Email address",
      type: "email",
      placeholder: "you@example.com",
      autoComplete: "email",
    },
    {
      key: "phone",
      label: "Phone number",
      type: "tel",
      placeholder: "+919876543210",
      autoComplete: "tel",
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      placeholder: "Create a strong password",
      autoComplete: "new-password",
    },
    {
      key: "confirmPassword",
      label: "Confirm password",
      type: "password",
      placeholder: "Enter password again",
      autoComplete: "new-password",
    },
  ] as const;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col bg-white px-6 py-8 md:px-14">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white">
            <Landmark size={24} />
          </div>
          <span className="text-2xl font-bold text-slate-900">
            LoanForge
          </span>
        </Link>

        <main className="mx-auto w-full max-w-md py-12">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <UserPlus size={28} />
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Create your account.
          </h1>

          <p className="mt-3 text-slate-500">
            Join LoanForge and manage personal lending
            agreements in one workspace.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
          >
            {fields.map((field) => (
              <div key={field.key}>
                <label
                  htmlFor={field.key}
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  {field.label}
                </label>

                <input
                  id={field.key}
                  type={field.type}
                  required
                  autoComplete={field.autoComplete}
                  value={form[field.key]}
                  onChange={(event) =>
                    update(field.key, event.target.value)
                  }
                  placeholder={field.placeholder}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </div>
            ))}

            <p className="text-xs leading-5 text-slate-500">
              Use a password with at least 8 characters,
              uppercase and lowercase letters, a number,
              and a special character.
            </p>

            {error && (
              <div
                role="alert"
                className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-teal-600 px-5 py-4 font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {loading
                ? "Creating your account..."
                : "Create account"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-teal-700 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </main>
      </div>

      <aside className="hidden flex-col justify-center bg-slate-950 px-16 text-white lg:flex">
        <ShieldCheck
          className="mb-8 text-teal-400"
          size={46}
        />

        <h2 className="max-w-lg text-5xl font-bold leading-tight">
          Lending made
          <br />
          simpler and clearer.
        </h2>

        <p className="mt-6 max-w-md text-lg leading-8 text-slate-400">
          Create agreements, manage repayments and
          understand your financial obligations.
        </p>

        <div className="mt-12 space-y-5">
          {[
            "Structured loan agreements",
            "Repayment schedules and records",
            "AI-powered agreement explanations",
          ].map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-3 text-slate-200"
            >
              <CheckCircle2
                size={21}
                className="text-teal-400"
              />
              {feature}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
