import { usePersistentSession } from "./usePersistentSession";
import SignupPage from "./SignupPage";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import KycStatusPanel from "./KycStatusPanel";
import {
  Link,
  Route,
  Routes,
  Navigate,
  useNavigate,
} from "react-router-dom";

import {
  Landmark,
  ArrowRight,
  ShieldCheck,
  FileText,
  CalendarClock,
  Sparkles,
  LogOut,
  Wallet,
  CheckCircle2,
} from "lucide-react";

import {
  login,
  logout,
  getDashboard,
  inr,
} from "./api";

import type {
  Session,
  DashboardStats,
} from "./api";

// -------------------------------
// Shared brand
// -------------------------------

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white">
        <Landmark size={24} />
      </div>
      <span className="text-2xl font-bold tracking-tight text-slate-900">
        LoanForge
      </span>
    </Link>
  );
}

// -------------------------------
// Landing page
// -------------------------------

function HomePage() {
  const features = [
    {
      icon: <FileText size={25} />,
      title: "Clear agreements",
      description:
        "Turn informal lending arrangements into organized, documented agreements.",
    },
    {
      icon: <CalendarClock size={25} />,
      title: "Repayment tracking",
      description:
        "Keep track of repayment schedules, transaction records, and outstanding amounts.",
    },
    {
      icon: <ShieldCheck size={25} />,
      title: "Organized records",
      description:
        "Maintain agreement records and a clear history of important actions.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Logo />
        <Link
          to="/login"
          className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Sign in
        </Link>
      </nav>

      <main className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-2">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700">
            <Sparkles size={16} />
            A better way to manage personal lending
          </div>

          <h1 className="text-5xl font-bold leading-tight tracking-tight text-slate-950 md:text-6xl">
            Personal lending,
            <span className="block text-teal-600">
              made clear.
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
            Create structured loan agreements, understand
            repayment obligations, and keep lending
            relationships organized in one place.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              to="/signup"
              className="inline-flex items-center gap-3 rounded-xl bg-teal-600 px-7 py-4 font-semibold text-white hover:bg-teal-700"
            >
              Get started <ArrowRight size={19} />
            </Link>

            <a
              href="#features"
              className="rounded-xl border border-slate-200 bg-white px-7 py-4 font-semibold text-slate-800 hover:bg-slate-50"
            >
              Explore features
            </a>
          </div>

          <p className="mt-10 flex items-center gap-2 text-sm text-slate-500">
            <CheckCircle2 size={18} className="text-teal-600" />
            Built for transparent financial relationships
          </p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/60">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-teal-600">
                LoanForge Workspace
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">
                Your lending journey
              </h2>
            </div>
            <div className="rounded-xl bg-teal-50 p-4 text-teal-700">
              <Landmark size={27} />
            </div>
          </div>

          {[
            ["01", "Create an agreement",
              "Enter the participants and financial terms."],
            ["02", "Understand the obligations",
              "Review the repayment schedule and conditions."],
            ["03", "Track every repayment",
              "Maintain an organized transaction history."],
          ].map(([number, title, subtitle]) => (
            <div
              key={number}
              className="mb-3 flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5 last:mb-0"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white font-bold text-teal-700 shadow-sm">
                {number}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  {title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <section id="features" className="bg-white px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Everything you need to stay organized.
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200 p-8"
              >
                <div className="mb-5 text-teal-600">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-3 leading-7 text-slate-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} LoanForge.
        Documentation and repayment management.
        Not legal or financial advice.
      </footer>
    </div>
  );
}

// -------------------------------
// Login page
// -------------------------------

function LoginPage({
  onLogin,
}: {
  onLogin: (session: Session) => void;
}) {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const session = await login(email, password);
      onLogin(session);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col bg-white px-6 py-8 md:px-14">
        <Logo />

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-14">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <ShieldCheck size={28} />
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Welcome back.
          </h1>
          <p className="mt-3 text-slate-500">
            Sign in to your LoanForge account.
          </p>
          
          <form onSubmit={handleSubmit} className="mt-10 space-y-6">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-3.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              disabled={loading}
              type="submit"
              className="w-full rounded-xl bg-teal-600 px-5 py-4 font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            New to LoanForge?{" "}
            <Link
              to="/signup"
              className="font-semibold text-teal-700 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden flex-col justify-center bg-slate-950 px-16 text-white lg:flex">
        <Sparkles className="mb-8 text-teal-400" size={45} />
        <h2 className="max-w-lg text-5xl font-bold leading-tight tracking-tight">
          Better clarity.
          <br />
          Stronger financial relationships.
        </h2>
        <p className="mt-6 max-w-md text-lg leading-8 text-slate-400">
          Keep personal loan agreements and repayment
          information organized in one workspace.
        </p>
      </div>
    </div>
  );
}

// -------------------------------
// Dashboard
// -------------------------------

function DashboardPage({
  session,
  onSignOut,
}: {
  session: Session;
  onSignOut: () => void;
}) {
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getDashboard(session.accessToken)
      .then((data) => {
        if (active) setStats(data);
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Request failed"
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

  async function signOut() {
    try {
      await logout(
        session.accessToken,
        session.refreshToken
      );
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      onSignOut();
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Logo />
          <button
            onClick={signOut}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-sm font-bold uppercase tracking-widest text-teal-700">
          YOUR WORKSPACE
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
          Welcome, {session.user.firstName}.
        </h1>

        <p className="mt-3 text-slate-500">
          Here's an overview of your lending activity.
        </p>
        <KycStatusPanel token={session.accessToken} />
        

    <div className="mt-7 flex flex-wrap gap-3">
      <Link
        to="/agreements"
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-100"
      >
        <FileText size={18} />
        My Agreements
      </Link>

      <Link
        to="/agreements/new"
        className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white hover:bg-teal-700"
      >
        Create Agreement
        <ArrowRight size={18} />
      </Link>
    </div>


        {loading && (
          <p className="mt-10" role="status">
            Loading your dashboard...
          </p>
        )}

        {error && (
          <div role="alert" className="mt-8 rounded-xl bg-red-50 p-5 text-red-700">
            {error}
          </div>
        )}

        {stats && !error && (
          <>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Total principal lent",
                  value: inr(stats.totalLent),
                  icon: <Landmark size={23} />,
                },
                {
                  label: "Total principal borrowed",
                  value: inr(stats.totalBorrowed),
                  icon: <Wallet size={23} />,
                },
                {
                  label: "Repayments received",
                  value: inr(stats.totalRepaymentReceived),
                  icon: <CheckCircle2 size={23} />,
                },
                {
                  label: "Active agreements",
                  value: String(stats.activeLoans),
                  icon: <FileText size={23} />,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
                >
                  <div className="mb-7 flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                      {item.label}
                    </p>
                    <span className="text-teal-600">
                      {item.icon}
                    </span>
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900">
                    {item.value}
                  </h2>
                </div>
              ))}
            </div>

            <div className="mt-7 grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-8 lg:col-span-2">
                <div className="mb-6 flex items-center gap-3">
                  <CalendarClock size={24} className="text-teal-600" />
                  <h2 className="text-xl font-bold">
                    Upcoming repayments
                  </h2>
                </div>

                {stats.upcomingPayments.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 p-10 text-center">
                    <CheckCircle2
                      size={34}
                      className="mx-auto text-teal-600"
                    />
                    <h3 className="mt-4 font-semibold">
                      No upcoming repayments
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Your scheduled payments will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.upcomingPayments.map((payment, index) => (
                      <div
                        key={`${payment.loanId}-${index}`}
                        className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-4"
                      >
                        <div>
                          <p className="font-semibold">
                            {payment.agreementNumber}
                          </p>
                          <p className="text-sm text-slate-500">
                            {new Date(payment.dueDate).toLocaleDateString("en-IN")}
                          </p>
                        </div>
                        <strong>{inr(payment.amountDue)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-slate-950 p-8 text-white">
                <Sparkles className="text-teal-400" size={32} />
                <h2 className="mt-6 text-2xl font-bold">
                  Your agreements
                </h2>

                <p className="mt-4 text-sm text-slate-400">
                  Agreements as lender
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {stats.totalLoansAsLender}
                </p>

                <p className="mt-6 text-sm text-slate-400">
                  Agreements as borrower
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {stats.totalLoansAsBorrower}
                </p>

                <p className="mt-7 text-sm text-slate-400">
                  Loan management features are being
                  integrated into this workspace.
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// -------------------------------
// Application routes
// -------------------------------


export default function App() {
  const [session, setSession] = usePersistentSession();

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      {/* New user registration */}
      <Route
        path="/signup"
        element={
          session ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <SignupPage onLogin={setSession} />
          )
        }
      />

      {/* Existing user login */}
      <Route
        path="/login"

        element={
          session ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage onLogin={setSession} />
          )
        }
      />

      <Route
        path="/dashboard"
        element={
          session ? (
            <DashboardPage
              session={session}
              onSignOut={() => setSession(null)}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
      
<Route
  path="/agreements"
  element={
    session ? (
      <AgreementsPage session={session} />
    ) : (
      <Navigate to="/login" replace />
    )
  }
/>

<Route
  path="/agreements/new"
  element={
    session ? (
      <CreateLoanPage session={session} />
    ) : (
      <Navigate to="/login" replace />
    )
  }
/>

<Route
  path="/agreements/:loanId"
  element={
    session ? (
      <AgreementPage session={session} />
    ) : (
      <Navigate to="/login" replace />
    )
  }
/>

    </Routes>
  );
}
  import {
  AgreementsPage,
  CreateLoanPage,
  AgreementPage,
} from "./LoanPages";


