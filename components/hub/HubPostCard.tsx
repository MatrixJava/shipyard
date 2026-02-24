import { HubFeedItem } from "@/lib/supabase/client";
import { LikeButton } from "@/components/hub/LikeButton";
import { CommentForm } from "@/components/hub/CommentForm";
import { CommentsList, HubComment } from "@/components/hub/CommentsList";
import { TechStackPills } from "@/components/tech-stack/TechStackPills";

type HubPostCardProps = {
  item: HubFeedItem;
  liked: boolean;
  likePending?: boolean;
  commentsOpen: boolean;
  commentsLoading?: boolean;
  comments: HubComment[];
  commentSubmitting?: boolean;
  currentUserId: string | null;
  onToggleLike: () => void;
  onToggleComments: () => void;
  onAddComment: (body: string) => Promise<void>;
  onDeleteComment: (commentId: string) => void;
  onReportPost: () => void;
  onReportComment: (commentId: string) => void;
};

export function HubPostCard({
  item,
  liked,
  likePending,
  commentsOpen,
  commentsLoading,
  comments,
  commentSubmitting,
  currentUserId,
  onToggleLike,
  onToggleComments,
  onAddComment,
  onDeleteComment,
  onReportPost,
  onReportComment,
}: HubPostCardProps) {
  return (
    <article className="feature-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">{item.post_type}</p>
        <p className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</p>
      </div>
      <p className="mt-2 text-sm text-slate-400">
        {item.author_display_name ?? item.author_handle ?? "builder"}
        {item.author_handle ? ` • @${item.author_handle}` : ""}
      </p>
      <h2 className="mt-2 text-2xl font-semibold">{item.title}</h2>
      <p className="mt-3 text-slate-300">{item.body}</p>
      <p className="mt-3 text-sm text-slate-400">{item.status_or_difficulty}</p>
      <TechStackPills stack={item.stack ?? []} />

      {(item.repo_url || item.demo_url) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.repo_url && (
            <a className="legacy-link" href={item.repo_url} target="_blank" rel="noreferrer">
              Repo
            </a>
          )}
          {item.demo_url && (
            <a className="legacy-link" href={item.demo_url} target="_blank" rel="noreferrer">
              Demo
            </a>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <LikeButton liked={liked} count={item.like_count} onToggle={onToggleLike} disabled={likePending} />
        <button
          type="button"
          onClick={onToggleComments}
          className="rounded-full border border-slate-500 px-3 py-1 text-sm font-semibold text-slate-200"
        >
          Comments ({item.comment_count})
        </button>
        <button
          type="button"
          onClick={onReportPost}
          className="rounded-full border border-amber-300/60 px-3 py-1 text-sm font-semibold text-amber-200"
        >
          Report
        </button>
      </div>

      {commentsOpen && (
        <section className="mt-4 space-y-3 rounded-xl border border-slate-700 bg-slate-900/40 p-3">
          {commentsLoading ? (
            <p className="text-sm text-slate-300">Loading comments...</p>
          ) : (
            <CommentsList
              comments={comments}
              currentUserId={currentUserId}
              onDelete={onDeleteComment}
              onReport={onReportComment}
            />
          )}
          <CommentForm busy={commentSubmitting} onSubmit={onAddComment} />
        </section>
      )}
    </article>
  );
}
