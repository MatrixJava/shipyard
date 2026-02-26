import { FormEvent, useState } from "react";

type CommentFormProps = {
  busy?: boolean;
  onSubmit: (body: string) => Promise<boolean>;
};

export function CommentForm({ busy, onSubmit }: CommentFormProps) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = body.trim();
    if (!trimmed) {
      setError("Comment cannot be empty.");
      return;
    }

    if (trimmed.length > 500) {
      setError("Comment cannot exceed 500 characters.");
      return;
    }

    setError(null);
    const submitSucceeded = await onSubmit(trimmed);
    if (submitSucceeded) {
      setBody("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        rows={2}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Reply..."
        className="pastel-textarea text-sm"
      />
      {error && <p className="text-xs text-rose-300">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-full border border-sky-200/45 bg-sky-100/10 px-3 py-1 text-sm font-semibold text-sky-50 disabled:opacity-60"
      >
        {busy ? "Posting..." : "Post comment"}
      </button>
    </form>
  );
}
