import { FormEvent, useState } from "react";

type ReportDialogProps = {
  open: boolean;
  title: string;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<boolean>;
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
    const submitSucceeded = await onSubmit(reason.trim());
    if (submitSucceeded) {
      setReason("");
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#080d1f]/78 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-sky-200/30 bg-[#111b36]/92 p-5">
        <h3 className="text-lg font-semibold text-sky-50">Report {title}</h3>
        <p className="mt-1 text-sm text-sky-100/80">Explain what is wrong so moderators can review it.</p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <textarea
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="pastel-textarea"
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
              className="rounded-full border border-sky-200/45 px-4 py-2 text-sm font-semibold text-sky-50"
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
