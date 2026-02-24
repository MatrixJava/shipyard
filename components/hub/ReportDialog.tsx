import { FormEvent, useState } from "react";

type ReportDialogProps = {
  open: boolean;
  title: string;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
};

export function ReportDialog({ open, title, busy, onClose, onSubmit }: ReportDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (reason.trim().length < 5) {
      setError("Reason must be at least 5 characters.");
      return;
    }

    setError(null);
    await onSubmit(reason.trim());
    setReason("");
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-5">
        <h3 className="text-lg font-semibold">Report {title}</h3>
        <p className="mt-1 text-sm text-slate-300">Explain what is wrong so moderators can review it.</p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <textarea
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-slate-100"
            placeholder="Spam, harassment, plagiarism, etc."
          />
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="cta-primary border-0 disabled:opacity-60" disabled={busy}>
              {busy ? "Submitting..." : "Submit report"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-500 px-4 py-2 text-sm font-semibold text-slate-200"
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
