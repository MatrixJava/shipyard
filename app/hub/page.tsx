"use client";

import Link from "next/link";
import Image from "next/image";
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { HubComposer, ComposerPayload } from "@/components/hub/HubComposer";
import { HubFeedTabs } from "@/components/hub/HubFeedTabs";
import { HubPostCard } from "@/components/hub/HubPostCard";
import { ReportDialog } from "@/components/hub/ReportDialog";
import { HubComment } from "@/components/hub/CommentsList";
import {
  createSupabaseBrowserClient,
  FeedPostType,
  HubFeedItem,
  HubSort,
  ProfileRow,
} from "@/lib/supabase/client";

type ReportTarget = {
  targetType: "project" | "idea" | "comment";
  targetId: string;
  title: string;
};

function keyFor(postType: FeedPostType, postId: string) {
  return `${postType}:${postId}`;
}

function normalizeFeedItem(row: Record<string, unknown>): HubFeedItem {
  return {
    id: String(row.id ?? ""),
    post_type: row.post_type as FeedPostType,
    owner_id: String(row.owner_id ?? ""),
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    status_or_difficulty: String(row.status_or_difficulty ?? ""),
    stack: Array.isArray(row.stack) ? (row.stack as string[]) : [],
    repo_url: (row.repo_url as string | null) ?? null,
    demo_url: (row.demo_url as string | null) ?? null,
    is_public: Boolean(row.is_public),
    created_at: String(row.created_at ?? ""),
    like_count: Number(row.like_count ?? 0),
    comment_count: Number(row.comment_count ?? 0),
    author_handle: (row.author_handle as string | null) ?? null,
    author_display_name: (row.author_display_name as string | null) ?? null,
    author_avatar_url: (row.author_avatar_url as string | null) ?? null,
    trending_score: Number(row.trending_score ?? 0),
  };
}

export default function HubPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [sort, setSort] = useState<HubSort>("newest");
  const [feed, setFeed] = useState<HubFeedItem[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerProfile, setViewerProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [composerBusy, setComposerBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    !supabase ? "Missing Supabase env values. Add .env.local first." : null,
  );
  const [likedKeys, setLikedKeys] = useState<Set<string>>(new Set());
  const [likeBusyKeys, setLikeBusyKeys] = useState<Set<string>>(new Set());
  const [openCommentKeys, setOpenCommentKeys] = useState<Set<string>>(new Set());
  const [loadingCommentKeys, setLoadingCommentKeys] = useState<Set<string>>(new Set());
  const [commentBusyKeys, setCommentBusyKeys] = useState<Set<string>>(new Set());
  const [commentsByPostKey, setCommentsByPostKey] = useState<Record<string, HubComment[]>>({});
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const feedStats = useMemo(() => {
    const projects = feed.filter((item) => item.post_type === "project").length;
    const ideas = feed.filter((item) => item.post_type === "idea").length;
    const avgEngagement =
      feed.length === 0
        ? 0
        : Number(
            (
              feed.reduce((sum, item) => sum + item.like_count + item.comment_count, 0) /
              Math.max(feed.length, 1)
            ).toFixed(1),
          );
    return {
      projects,
      ideas,
      avgEngagement,
      totalPosts: feed.length,
    };
  }, [feed]);

  const setKeyState = (
    setter: Dispatch<SetStateAction<Set<string>>>,
    key: string,
    enabled: boolean,
  ) => {
    setter((previous) => {
      const next = new Set(previous);
      if (enabled) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const refreshViewer = useCallback(async () => {
    if (!supabase) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setViewerId(user?.id ?? null);

    if (!user?.id) {
      setViewerProfile(null);
      setLikedKeys(new Set());
      return;
    }

    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (profileData) {
      setViewerProfile(profileData as ProfileRow);
    }
  }, [supabase]);

  const refreshFeed = useCallback(async () => {
    if (!supabase) return false;

    setLoading(true);

    const rpcName = sort === "trending" ? "hub_feed_trending" : "hub_feed_newest";
    const { data, error: rpcError } = await supabase.rpc(rpcName, {
      limit_count: 30,
      offset_count: 0,
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return false;
    }

    setFeed(((data as Record<string, unknown>[]) ?? []).map(normalizeFeedItem));
    setError(null);
    setLoading(false);
    return true;
  }, [sort, supabase]);

  useEffect(() => {
    if (!supabase) return;
    const task = setTimeout(() => {
      void refreshViewer();
    }, 0);
    return () => clearTimeout(task);
  }, [refreshViewer, supabase]);

  useEffect(() => {
    if (!supabase) return;
    const task = setTimeout(() => {
      void refreshFeed();
    }, 0);
    return () => clearTimeout(task);
  }, [refreshFeed, supabase]);

  useEffect(() => {
    if (!supabase || !viewerId || feed.length === 0) return;

    const syncLikes = async () => {
      const projectIds = feed.filter((item) => item.post_type === "project").map((item) => item.id);
      const ideaIds = feed.filter((item) => item.post_type === "idea").map((item) => item.id);

      const requests = [];

      if (projectIds.length > 0) {
        requests.push(
          supabase
            .from("post_likes")
            .select("post_id")
            .eq("post_type", "project")
            .eq("user_id", viewerId)
            .in("post_id", projectIds)
            .then((result) => ({ data: result.data as { post_id: string }[] | null, error: result.error })),
        );
      }

      if (ideaIds.length > 0) {
        requests.push(
          supabase
            .from("post_likes")
            .select("post_id")
            .eq("post_type", "idea")
            .eq("user_id", viewerId)
            .in("post_id", ideaIds)
            .then((result) => ({ data: result.data as { post_id: string }[] | null, error: result.error })),
        );
      }

      const responses = await Promise.all(requests);

      const next = new Set<string>();
      responses.forEach((response, index) => {
        if (response.error) return;
        if (!response.data) return;

        const type: FeedPostType = projectIds.length > 0 && index === 0 ? "project" : "idea";
        response.data.forEach((row) => next.add(keyFor(type, row.post_id)));
      });

      setLikedKeys(next);
    };

    void syncLikes();
  }, [feed, supabase, viewerId]);

  const ensureAuth = () => {
    if (viewerId) return true;
    setError("Sign in first to interact with the hub.");
    return false;
  };

  const updateFeedCounters = (postType: FeedPostType, postId: string, field: "like_count" | "comment_count", delta: number) => {
    setFeed((previous) =>
      previous.map((item) => {
        if (item.post_type !== postType || item.id !== postId) return item;
        return {
          ...item,
          [field]: Math.max(0, item[field] + delta),
        };
      }),
    );
  };

  const handleComposerSubmit = async (payload: ComposerPayload): Promise<boolean> => {
    if (!supabase || !ensureAuth() || !viewerId) return false;

    setComposerBusy(true);
    setError(null);

    try {
      if (payload.postType === "project") {
        const { error: insertError } = await supabase.from("projects").insert({
          owner_id: viewerId,
          title: payload.title,
          description: payload.description,
          tech_stack: payload.stack,
          status: payload.status,
          repo_url: payload.repoUrl,
          demo_url: payload.demoUrl,
          is_public: payload.isPublic,
        });

        if (insertError) {
          setError(insertError.message);
          return false;
        }
      } else {
        const { error: insertError } = await supabase.from("ideas").insert({
          owner_id: viewerId,
          title: payload.title,
          description: payload.description,
          desired_stack: payload.stack,
          difficulty: payload.difficulty,
          is_public: payload.isPublic,
        });

        if (insertError) {
          setError(insertError.message);
          return false;
        }
      }

      return await refreshFeed();
    } finally {
      setComposerBusy(false);
    }
  };

  const handleToggleLike = async (item: HubFeedItem) => {
    if (!supabase || !ensureAuth() || !viewerId) return;

    const key = keyFor(item.post_type, item.id);
    const currentlyLiked = likedKeys.has(key);
    setKeyState(setLikeBusyKeys, key, true);

    if (currentlyLiked) {
      const { error: deleteError } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_type", item.post_type)
        .eq("post_id", item.id)
        .eq("user_id", viewerId);

      if (deleteError) {
        setError(deleteError.message);
      } else {
        setLikedKeys((previous) => {
          const next = new Set(previous);
          next.delete(key);
          return next;
        });
        updateFeedCounters(item.post_type, item.id, "like_count", -1);
      }
    } else {
      const { error: insertError } = await supabase.from("post_likes").insert({
        post_type: item.post_type,
        post_id: item.id,
        user_id: viewerId,
      });

      if (insertError) {
        setError(insertError.message);
      } else {
        setLikedKeys((previous) => new Set(previous).add(key));
        updateFeedCounters(item.post_type, item.id, "like_count", 1);
      }
    }

    setKeyState(setLikeBusyKeys, key, false);
  };

  const loadComments = async (item: HubFeedItem) => {
    if (!supabase) return;

    const key = keyFor(item.post_type, item.id);
    setKeyState(setLoadingCommentKeys, key, true);

    const { data, error: queryError } = await supabase
      .from("post_comments")
      .select("id, author_id, body, created_at")
      .eq("post_type", item.post_type)
      .eq("post_id", item.id)
      .eq("is_hidden", false)
      .order("created_at", { ascending: true });

    if (queryError) {
      setError(queryError.message);
      setKeyState(setLoadingCommentKeys, key, false);
      return;
    }

    const rows = (data ?? []) as { id: string; author_id: string; body: string; created_at: string }[];
    const authorIds = Array.from(new Set(rows.map((row) => row.author_id)));

    const profileMap = new Map<string, ProfileRow>();
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, handle, display_name, avatar_url, bio, is_admin, created_at")
        .in("id", authorIds);

      ((profiles ?? []) as ProfileRow[]).forEach((profile) => profileMap.set(profile.id, profile));
    }

    const normalized: HubComment[] = rows.map((row) => ({
      id: row.id,
      author_id: row.author_id,
      body: row.body,
      created_at: row.created_at,
      author_handle: profileMap.get(row.author_id)?.handle ?? null,
      author_display_name: profileMap.get(row.author_id)?.display_name ?? null,
    }));

    setCommentsByPostKey((previous) => ({
      ...previous,
      [key]: normalized,
    }));

    setKeyState(setLoadingCommentKeys, key, false);
  };

  const handleToggleComments = async (item: HubFeedItem) => {
    const key = keyFor(item.post_type, item.id);
    const isOpen = openCommentKeys.has(key);

    if (isOpen) {
      setOpenCommentKeys((previous) => {
        const next = new Set(previous);
        next.delete(key);
        return next;
      });
      return;
    }

    setOpenCommentKeys((previous) => new Set(previous).add(key));
    if (!commentsByPostKey[key]) {
      await loadComments(item);
    }
  };

  const handleAddComment = async (item: HubFeedItem, body: string): Promise<boolean> => {
    if (!supabase || !ensureAuth() || !viewerId) return false;

    const key = keyFor(item.post_type, item.id);
    setKeyState(setCommentBusyKeys, key, true);

    try {
      const { data: inserted, error: insertError } = await supabase
        .from("post_comments")
        .insert({
          post_type: item.post_type,
          post_id: item.id,
          author_id: viewerId,
          body,
        })
        .select("id, author_id, body, created_at")
        .single();

      if (insertError || !inserted) {
        setError(insertError?.message ?? "Could not post comment.");
        return false;
      }

      const comment: HubComment = {
        id: inserted.id,
        author_id: inserted.author_id,
        body: inserted.body,
        created_at: inserted.created_at,
        author_handle: viewerProfile?.handle ?? null,
        author_display_name: viewerProfile?.display_name ?? null,
      };

      setCommentsByPostKey((previous) => ({
        ...previous,
        [key]: [...(previous[key] ?? []), comment],
      }));

      updateFeedCounters(item.post_type, item.id, "comment_count", 1);
      return true;
    } finally {
      setKeyState(setCommentBusyKeys, key, false);
    }
  };

  const handleDeleteComment = async (item: HubFeedItem, commentId: string): Promise<boolean> => {
    if (!supabase || !ensureAuth()) return false;

    const key = keyFor(item.post_type, item.id);
    const { error: deleteError } = await supabase.from("post_comments").delete().eq("id", commentId);

    if (deleteError) {
      setError(deleteError.message);
      return false;
    }

    setCommentsByPostKey((previous) => ({
      ...previous,
      [key]: (previous[key] ?? []).filter((comment) => comment.id !== commentId),
    }));
    updateFeedCounters(item.post_type, item.id, "comment_count", -1);
    return true;
  };

  const handleSubmitReport = async (reason: string): Promise<boolean> => {
    if (!supabase || !reportTarget || !ensureAuth() || !viewerId) return false;

    setReportBusy(true);

    try {
      const { error: insertError } = await supabase.from("content_reports").insert({
        target_type: reportTarget.targetType,
        target_id: reportTarget.targetId,
        reporter_id: viewerId,
        reason,
      });

      if (insertError) {
        setError(insertError.message);
        return false;
      }

      setReportTarget(null);
      return true;
    } finally {
      setReportBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10 md:px-10 md:py-16">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/" className="legacy-link">
          Home
        </Link>
        <Link href="/projects" className="legacy-link">
          Project-only view
        </Link>
        <Link href="/leaderboard" className="legacy-link">
          Leaderboard
        </Link>
        <Link href="/auth" className="legacy-link">
          Sign in
        </Link>
      </div>

      <section className="hero-panel rounded-3xl p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-200">Shipyard Hub</p>
        <h1 className="mt-2 text-3xl font-bold text-sky-50 md:text-4xl">Projects + ideas social feed</h1>
        <p className="mt-3 text-sky-100/80">
          Publish builds and ideas, discuss in comments, and discover what students are shipping right now.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <div className="mini-stat">
            <p className="text-xs uppercase tracking-[0.14em] text-sky-200">Posts</p>
            <p className="mt-1 text-xl font-bold text-sky-50">{feedStats.totalPosts}</p>
          </div>
          <div className="mini-stat">
            <p className="text-xs uppercase tracking-[0.14em] text-sky-200">Projects</p>
            <p className="mt-1 text-xl font-bold text-sky-50">{feedStats.projects}</p>
          </div>
          <div className="mini-stat">
            <p className="text-xs uppercase tracking-[0.14em] text-sky-200">Ideas</p>
            <p className="mt-1 text-xl font-bold text-sky-50">{feedStats.ideas}</p>
          </div>
          <div className="mini-stat">
            <p className="text-xs uppercase tracking-[0.14em] text-sky-200">Avg Engagement</p>
            <p className="mt-1 text-xl font-bold text-sky-50">{feedStats.avgEngagement}</p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <HubFeedTabs sort={sort} onChange={setSort} />
        {viewerProfile ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/35 bg-sky-100/10 px-3 py-1.5">
            {viewerProfile.avatar_url ? (
              <Image
                src={viewerProfile.avatar_url}
                alt="Viewer avatar"
                width={28}
                height={28}
                className="h-7 w-7 rounded-full border border-sky-200/50 object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-sky-200/50 bg-sky-100/10 text-xs font-bold text-sky-100">
                {viewerProfile.display_name?.[0]?.toUpperCase() ?? "U"}
              </div>
            )}
            <p className="text-sm text-sky-50">
              {viewerProfile.display_name} <span className="text-sky-200">@{viewerProfile.handle}</span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-sky-100/70">Sign in to post, like, and comment.</p>
        )}
      </div>

      <HubComposer disabled={composerBusy} onSubmit={handleComposerSubmit} />

      {error && <p className="rounded-xl border border-rose-300/50 bg-rose-900/25 px-4 py-2 text-sm text-rose-100">{error}</p>}
      {loading && <p className="text-sky-100/80">Loading hub feed...</p>}

      <section className="grid gap-4">
        {!loading && feed.length === 0 ? (
          <article className="feature-card">
            <h2 className="text-xl font-semibold text-sky-50">No posts yet</h2>
            <p className="mt-2 text-sky-100/80">Be the first to publish a project or idea.</p>
          </article>
        ) : (
          feed.map((item) => {
            const key = keyFor(item.post_type, item.id);
            return (
              <HubPostCard
                key={key}
                item={item}
                liked={likedKeys.has(key)}
                likePending={likeBusyKeys.has(key)}
                commentsOpen={openCommentKeys.has(key)}
                commentsLoading={loadingCommentKeys.has(key)}
                comments={commentsByPostKey[key] ?? []}
                commentSubmitting={commentBusyKeys.has(key)}
                currentUserId={viewerId}
                onToggleLike={() => void handleToggleLike(item)}
                onToggleComments={() => void handleToggleComments(item)}
                onAddComment={(body) => handleAddComment(item, body)}
                onDeleteComment={(commentId) => void handleDeleteComment(item, commentId)}
                onReportPost={() =>
                  setReportTarget({
                    targetType: item.post_type,
                    targetId: item.id,
                    title: `${item.post_type} post`,
                  })
                }
                onReportComment={(commentId) =>
                  setReportTarget({
                    targetType: "comment",
                    targetId: commentId,
                    title: "comment",
                  })
                }
              />
            );
          })
        )}
      </section>

      <ReportDialog
        open={Boolean(reportTarget)}
        busy={reportBusy}
        title={reportTarget?.title ?? "content"}
        onClose={() => setReportTarget(null)}
        onSubmit={handleSubmitReport}
      />
    </main>
  );
}
