import Link from "next/link";

export type HubComment = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  author_handle: string | null;
  author_display_name: string | null;
};

type CommentsListProps = {
  comments: HubComment[];
  currentUserId: string | null;
  onDelete: (commentId: string) => void;
  onReport: (commentId: string) => void;
};

export function CommentsList({ comments, currentUserId, onDelete, onReport }: CommentsListProps) {
  if (comments.length === 0) {
    return <p className="text-sm text-sky-100/75">No comments yet. Start the thread.</p>;
  }

  return (
    <ul className="space-y-3">
      {comments.map((comment) => (
        <li key={comment.id} className="rounded-xl border border-sky-200/30 bg-sky-100/10 p-3">
          {comment.author_handle ? (
            <Link
              href={`/leaderboard/${encodeURIComponent(comment.author_handle)}`}
              className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-100 hover:underline"
            >
              {comment.author_display_name ?? comment.author_handle}
            </Link>
          ) : (
            <p className="text-xs uppercase tracking-[0.15em] text-sky-100/85">
              {comment.author_display_name ?? comment.author_handle ?? "builder"}
            </p>
          )}
          <p className="mt-2 text-sm text-sky-50/95">{comment.body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onReport(comment.id)}
              className="rounded-full border border-sky-200/40 px-3 py-1 text-xs font-semibold text-sky-100"
            >
              Report
            </button>
            {currentUserId === comment.author_id && (
              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                className="rounded-full border border-rose-400/60 px-3 py-1 text-xs font-semibold text-rose-200"
              >
                Delete
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
