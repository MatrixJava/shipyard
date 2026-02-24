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
    return <p className="text-sm text-slate-400">No comments yet. Start the thread.</p>;
  }

  return (
    <ul className="space-y-3">
      {comments.map((comment) => (
        <li key={comment.id} className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
          <p className="text-xs uppercase tracking-[0.15em] text-cyan-300">
            {comment.author_display_name ?? comment.author_handle ?? "builder"}
          </p>
          <p className="mt-2 text-sm text-slate-200">{comment.body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onReport(comment.id)}
              className="rounded-full border border-slate-500 px-3 py-1 text-xs font-semibold text-slate-300"
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
