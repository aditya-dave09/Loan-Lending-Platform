import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import type { FormEvent } from "react";
import { Sparkles, Send, ShieldAlert } from "lucide-react";

import { askLoanAI } from "./api";
import type { Session } from "./api";

interface Props {
  session: Session;
  loanId: string;
}

const REVIEW_PROMPT =
  "Review this agreement in simple language. Explain the loan terms, the repayment obligations, possible risks, and any missing or unclear conditions.";

export default function LoanAI({
  session,
  loanId,
}: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function runAI(text: string) {
    if (loading || !text.trim()) return;

    setLoading(true);
    setAnswer("");
    setError("");

    try {
      const result = await askLoanAI(
        session.accessToken,
        loanId,
        text.trim()
      );

      setAnswer(result.answer);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reach LoanForge AI."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    await runAI(question);
  }

  return (
    <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="bg-slate-950 p-7 text-white">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-teal-600 p-3">
            <Sparkles size={25} />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-300">
              Intelligent Agreement Assistant
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              LoanForge AI
            </h2>
          </div>
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
          Understand your agreement, explore repayment
          obligations, and identify unclear terms.
        </p>

        <button
          onClick={() => runAI(REVIEW_PROMPT)}
          disabled={loading}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          <Sparkles size={18} />
          Review this agreement
        </button>
      </div>

      <div className="p-7">
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <label className="block text-sm font-semibold text-slate-700">
            Ask a question about this agreement
          </label>

          <textarea
            rows={3}
            maxLength={700}
            value={question}
            onChange={(event) =>
              setQuestion(event.target.value)
            }
            placeholder="Example: What happens if I miss a repayment?"
            className="w-full rounded-xl border border-slate-300 p-4 outline-none focus:border-teal-600"
          />

          <button
            type="submit"
            disabled={loading || question.trim().length < 3}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Send size={17} />
            {loading ? "Analyzing..." : "Ask LoanForge AI"}
          </button>
        </form>

        {loading && (
          <p role="status" className="mt-6 text-sm text-teal-700">
            Analyzing the agreement...
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 flex gap-3 rounded-xl bg-amber-50 p-5 text-sm text-amber-800"
          >
            <ShieldAlert size={20} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {answer && (
          <div className="mt-7 rounded-xl border border-teal-100 bg-teal-50 p-6">
            <h3 className="mb-4 font-bold text-slate-900">
              LoanForge AI Response
            </h3>
            
        <div className="break-words text-sm leading-7 text-slate-700">
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            skipHtml
            components={{
            h1: ({ children }) => (
                <h3 className="mb-4 mt-6 text-xl font-bold text-slate-900">
                {children}
                </h3>
            ),
            h2: ({ children }) => (
                <h4 className="mb-3 mt-6 text-lg font-bold text-slate-900">
                {children}
                </h4>
            ),
            h3: ({ children }) => (
                <h5 className="mb-2 mt-4 font-bold text-slate-900">
                {children}
                </h5>
            ),
            p: ({ children }) => (
                <p className="my-3">{children}</p>
            ),
            ul: ({ children }) => (
                <ul className="my-3 list-disc space-y-1 pl-6">
                {children}
                </ul>
            ),
            ol: ({ children }) => (
                <ol className="my-3 list-decimal space-y-1 pl-6">
                {children}
                </ol>
            ),
            li: ({ children }) => (
                <li>{children}</li>
            ),
            strong: ({ children }) => (
                <strong className="font-bold text-slate-900">
                {children}
                </strong>
            ),
            }}
        >
            {answer}
        </ReactMarkdown>
        </div>

          </div>
        )}

        <p className="mt-6 text-xs leading-5 text-slate-500">
          AI-generated explanations may be inaccurate.
          They do not replace the actual agreement or
          professional legal and financial advice.
        </p>
      </div>
    </section>
  );
}
