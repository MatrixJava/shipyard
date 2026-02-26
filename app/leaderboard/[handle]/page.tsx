"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createSupabaseBrowserClient,
  OpenSourceCommitRow,
  OpenSourceLeaderboardRow,
} from "@/lib/supabase/client";

type Tier = {
  label: string;
  className: string;
};

type RepoSummary = {
  repo_name: string;
  commit_count: number;
  total_sr: number;
  avg_quality: number;
};

function normalizeLeaderboardRow(row: Record<string, unknown>): OpenSourceLeaderboardRow {
  return {
    rank_position: Number(row.rank_position ?? 0),
    author_id: String(row.author_id ?? ""),
    author_handle: (row.author_handle as string | null) ?? null,
    author_display_name: (row.author_display_name as string | null) ?? null,
    author_avatar_url: (row.author_avatar_url as string | null) ?? null,
    total_sr: Number(row.total_sr ?? 0),
    commit_count: Number(row.commit_count ?? 0),
    avg_quality: Number(row.avg_quality ?? 0),
    verified_commit_count: Number(row.verified_commit_count ?? 0),
    last_commit_at: String(row.last_commit_at ?? ""),
  };
}

function normalizeCommitRow(row: Record<string, unknown>): OpenSourceCommitRow {
  return {
    id: String(row.id ?? ""),
    author_id: String(row.author_id ?? ""),
    repo_name: String(row.repo_name ?? ""),
    repo_url: (row.repo_url as string | null) ?? null,
    commit_hash: String(row.commit_hash ?? ""),
    commit_url: (row.commit_url as string | null) ?? null,
    commit_message: String(row.commit_message ?? ""),
    lines_added: Number(row.lines_added ?? 0),
    lines_deleted: Number(row.lines_deleted ?? 0),
    quality_score: Number(row.quality_score ?? 0),
    is_verified: Boolean(row.is_verified),
    created_at: String(row.created_at ?? ""),
    sr_points: Number(row.sr_points ?? 0),
    author_handle: (row.author_handle as string | null) ?? null,
    author_display_name: (row.author_display_name as string | null) ?? null,
    author_avatar_url: (row.author_avatar_url as string | null) ?? null,
  };
}

function shortHash(hash: string) {
  return hash.length > 7 ? hash.slice(0, 7) : hash;
}

function trendLabel(srPoints: number) {
  if (srPoints >= 120) return "excellent";
  if (srPoints >= 85) return "strong";
  if (srPoints >= 55) return "stable";
  return "warming";
}

function getTier(totalSr: number): Tier {
  if (totalSr >= 2200) return { label: "Master Control", className: "tier-badge tier-badge-master-control" };
  if (totalSr >= 1450) return { label: "Systems Architect", className: "tier-badge tier-badge-systems-architect" };
  if (totalSr >= 900) return { label: "Release Captain", className: "tier-badge tier-badge-release-captain" };
  if (totalSr >= 420) return { label: "Code Specialist", className: "tier-badge tier-badge-code-specialist" };
  return { label: "Associate Engineer", className: "tier-badge tier-badge-associate-engineer" };
}

function normalizeHandleParam(raw: string | string[] | undefined) {
  if (!raw) return "";
  const next = Array.isArray(raw) ? raw[0] : raw;
  return decodeURIComponent(next).trim().replace(/^@/, "");
}

function mapSupabaseError(message: string) {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("open_source_commits") &&
    (normalized.includes("schema cache") || normalized.includes("does not exist"))
  ) {
    return "Open-source commits table is missing in this Supabase project. Run `supabase/schema.sql` in the Supabase SQL editor, then refresh.";
  }
  if (
    normalized.includes("open_source_leaderboard") ||
    normalized.includes("open_source_commit_feed")
  ) {
    return "Supabase ranking functions are missing. Run `supabase/schema.sql` in the Supabase SQL editor, then refresh.";
  }
  return message;
}

export default function LeaderboardPlayerPage() {
  const params = useParams<{ handle: string }>();
  const rawHandle = normalizeHandleParam(params?.handle);
  const normalizedHandle = rawHandle.toLowerCase();

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(
    !supabase ? "Missing Supabase env values. Add .env.local first." : null,
  );
  const [player, setPlayer] = useState<OpenSourceLeaderboardRow | null>(null);
  const [commits, setCommits] = useState<OpenSourceCommitRow[]>([]);

  const refreshData = useCallback(async () => {
    if (!supabase || !normalizedHandle) return;
    setLoading(true);

    const [leaderboardResult, feedResult] = await Promise.all([
      supabase.rpc("open_source_leaderboard", { limit_count: 200 }),
      supabase.rpc("open_source_commit_feed", { limit_count: 250, offset_count: 0 }),
    ]);

    if (leaderboardResult.error) {
      setError(mapSupabaseError(leaderboardResult.error.message));
      setLoading(false);
      return;
    }

    if (feedResult.error) {
      setError(mapSupabaseError(feedResult.error.message));
      setLoading(false);
      return;
    }

    const leaderboardRows = ((leaderboardResult.data as Record<string, unknown>[]) ?? []).map(normalizeLeaderboardRow);
    const feedRows = ((feedResult.data as Record<string, unknown>[]) ?? []).map(normalizeCommitRow);
    const playerByLeaderboard =
      leaderboardRows.find((entry) => (entry.author_handle ?? "").toLowerCase() === normalizedHandle) ?? null;
    const playerCommits = feedRows
      .filter((entry) => (entry.author_handle ?? "").toLowerCase() === normalizedHandle)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

    setPlayer(playerByLeaderboard);
    setCommits(playerCommits);

    if (!playerByLeaderboard && playerCommits.length === 0) {
      setError(`No ranking profile found for @${rawHandle}.`);
    } else {
      setError(null);
    }

    setLoading(false);
  }, [normalizedHandle, rawHandle, supabase]);

  useEffect(() => {
    if (!supabase) return;
    const task = setTimeout(() => {
      void refreshData();
    }, 0);
    return () => clearTimeout(task);
  }, [refreshData, supabase]);

  const headerName = player?.author_display_name ?? commits[0]?.author_display_name ?? (rawHandle || "Engineer");
  const headerHandle = player?.author_handle ?? commits[0]?.author_handle ?? rawHandle;
  const totalSr = player?.total_sr ?? commits.reduce((sum, item) => sum + item.sr_points, 0);
  const commitCount = player?.commit_count ?? commits.length;
  const avgQuality =
    player?.avg_quality ??
    Number((commits.reduce((sum, item) => sum + item.quality_score, 0) / Math.max(commits.length, 1)).toFixed(2));
  const verifiedCount =
    player?.verified_commit_count ?? commits.filter((item) => item.is_verified).length;
  const verifiedRate = Number(((verifiedCount / Math.max(commitCount, 1)) * 100).toFixed(1));
  const tier = getTier(totalSr);

  const recentForm = commits.slice(0, 10).map((commit) => trendLabel(commit.sr_points));

  const topRepos = useMemo(() => {
    const byRepo = new Map<string, { repo_name: string; total_sr: number; commit_count: number; quality_sum: number }>();
    commits.forEach((commit) => {
      const existing = byRepo.get(commit.repo_name) ?? {
        repo_name: commit.repo_name,
        total_sr: 0,
        commit_count: 0,
        quality_sum: 0,
      };

      existing.total_sr += commit.sr_points;
      existing.commit_count += 1;
      existing.quality_sum += commit.quality_score;
      byRepo.set(commit.repo_name, existing);
    });

    return Array.from(byRepo.values())
      .map<RepoSummary>((entry) => ({
        repo_name: entry.repo_name,
        commit_count: entry.commit_count,
        total_sr: entry.total_sr,
        avg_quality: Number((entry.quality_sum / Math.max(entry.commit_count, 1)).toFixed(2)),
      }))
      .sort((a, b) => b.total_sr - a.total_sr || b.commit_count - a.commit_count)
      .slice(0, 8);
  }, [commits]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10 md:px-10 md:py-16">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/" className="legacy-link">
          Home
        </Link>
        <Link href="/hub" className="legacy-link">
          Hub
        </Link>
        <Link href="/projects" className="legacy-link">
          Projects
        </Link>
        <Link href="/leaderboard" className="legacy-link">
          Rankings
        </Link>
      </div>

      <section className="hero-panel rounded-3xl p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">Engineer Profile</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-sky-50 md:text-4xl">{headerName}</h1>
            <p className="mt-1 text-sky-100/80">@{headerHandle}</p>
          </div>
          <div className="text-right">
            <span className={tier.className}>{tier.label}</span>
            <p className="mt-2 text-2xl font-black text-amber-200">{totalSr.toLocaleString()} SR</p>
            {player?.rank_position ? (
              <p className="text-sm text-sky-100/75">Global index #{player.rank_position}</p>
            ) : (
              <p className="text-sm text-sky-100/75">Unranked in current indexed cohort</p>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <div className="mini-stat">
            <p className="text-xs uppercase tracking-[0.14em] text-sky-200">Commits</p>
            <p className="mt-1 text-xl font-bold text-sky-50">{commitCount}</p>
          </div>
          <div className="mini-stat">
            <p className="text-xs uppercase tracking-[0.14em] text-sky-200">Avg Quality</p>
            <p className="mt-1 text-xl font-bold text-sky-50">{avgQuality}/10</p>
          </div>
          <div className="mini-stat">
            <p className="text-xs uppercase tracking-[0.14em] text-sky-200">Verified</p>
            <p className="mt-1 text-xl font-bold text-sky-50">{verifiedCount}</p>
          </div>
          <div className="mini-stat">
            <p className="text-xs uppercase tracking-[0.14em] text-sky-200">Verified Rate</p>
            <p className="mt-1 text-xl font-bold text-sky-50">{verifiedRate}%</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {recentForm.length === 0 ? (
            <span className="text-sm text-sky-100/75">No recent activity.</span>
          ) : (
            recentForm.map((tag, index) => (
              <span key={`${tag}-${index}`} className="form-chip">
                {tag}
              </span>
            ))
          )}
        </div>
      </section>

      {error && <p className="rounded-xl border border-rose-300/50 bg-rose-900/25 px-4 py-2 text-sm text-rose-100">{error}</p>}
      {loading && <p className="text-sky-100/80">Loading engineer profile...</p>}

      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <article className="feature-card">
          <h2 className="text-xl font-semibold text-sky-50">Recent commit entries</h2>
          <p className="mt-1 text-sm text-sky-100/80">Most recent records for this engineer.</p>
          <div className="mt-4 space-y-3">
            {!loading && commits.length === 0 ? (
              <p className="text-sm text-sky-100/75">No commit entries yet.</p>
            ) : (
              commits.map((commit) => (
                <article key={commit.id} className="rounded-2xl border border-sky-200/25 bg-sky-100/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-sky-50">
                      {commit.repo_url ? (
                        <a className="text-sky-100 underline-offset-2 hover:underline" href={commit.repo_url} target="_blank" rel="noreferrer">
                          {commit.repo_name}
                        </a>
                      ) : (
                        commit.repo_name
                      )}
                    </p>
                    <p className="rounded-full border border-amber-200/40 bg-amber-200/10 px-3 py-1 text-xs font-semibold text-amber-100">
                      +{commit.sr_points} SR
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-sky-50/95">{commit.commit_message}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-sky-100/80">
                    <span className="rounded-full border border-sky-200/30 px-2 py-1">+{commit.lines_added}</span>
                    <span className="rounded-full border border-sky-200/30 px-2 py-1">-{commit.lines_deleted}</span>
                    <span className="rounded-full border border-sky-200/30 px-2 py-1">Q {commit.quality_score}/10</span>
                    {commit.is_verified && (
                      <span className="rounded-full border border-emerald-200/40 bg-emerald-200/10 px-2 py-1 text-emerald-100">
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-sky-100/70">
                    {commit.commit_url ? (
                      <a className="text-sky-100 underline-offset-2 hover:underline" href={commit.commit_url} target="_blank" rel="noreferrer">
                        {shortHash(commit.commit_hash)}
                      </a>
                    ) : (
                      <span>{shortHash(commit.commit_hash)}</span>
                    )}
                    <span>{new Date(commit.created_at).toLocaleString()}</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </article>

        <article className="feature-card">
          <h2 className="text-xl font-semibold text-sky-50">Top repositories</h2>
          <p className="mt-1 text-sm text-sky-100/80">Best SR-performing repositories for this engineer.</p>
          <div className="mt-4 space-y-2">
            {!loading && topRepos.length === 0 ? (
              <p className="text-sm text-sky-100/75">No repo breakdown yet.</p>
            ) : (
              topRepos.map((repo, index) => (
                <div key={repo.repo_name} className="rounded-xl border border-sky-200/25 bg-sky-100/10 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-sky-50">
                      #{index + 1} {repo.repo_name}
                    </p>
                    <p className="text-sm font-bold text-amber-200">{repo.total_sr} SR</p>
                  </div>
                  <p className="mt-1 text-xs text-sky-100/75">
                    {repo.commit_count} commits • {repo.avg_quality}/10 avg quality
                  </p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
