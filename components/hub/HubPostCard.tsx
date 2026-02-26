import Link from "next/link";
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
  onAddComment: (body: string) => Promise<boolean>;
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
  const authorHref = item.author_handle ? `/leaderboard/${encodeURIComponent(item.author_handle)}` : null;

  return (
    <article className="feature-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">{item.post_type}</p>
        <p className="text-xs text-sky-100/65">{new Date(item.created_at).toLocaleString()}</p>
      </div>
      {authorHref ? (
        <Link href={authorHref} className="mt-2 inline-block text-sm text-sky-100/85 hover:underline">
          {item.author_display_name ?? item.author_handle ?? "builder"} • @{item.author_handle}
        </Link>
      ) : (
        <p className="mt-2 text-sm text-sky-100/75">{item.author_display_name ?? item.author_handle ?? "builder"}</p>
      )}
      <h2 className="mt-2 text-2xl font-semibold text-sky-50">{item.title}</h2>
      <p className="mt-3 text-sky-50/90">{item.body}</p>
      <p className="mt-3 text-sm text-sky-100/70">{item.status_or_difficulty}</p>
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
          className="rounded-full border border-sky-200/40 bg-sky-100/8 px-3 py-1 text-sm font-semibold text-sky-100"
        >
          Comments ({item.comment_count})
        </button>
        <button
          type="button"
          onClick={onReportPost}
          className="rounded-full border border-amber-200/60 px-3 py-1 text-sm font-semibold text-amber-100"
        >
          Report
        </button>
      </div>

      {commentsOpen && (
        <section className="mt-4 space-y-3 rounded-xl border border-sky-200/25 bg-sky-100/8 p-3">
          {commentsLoading ? (
            <p className="text-sm text-sky-100/70">Loading comments...</p>
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
