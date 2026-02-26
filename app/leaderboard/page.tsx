"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createSupabaseBrowserClient,
  OpenSourceCommitRow,
  OpenSourceLeaderboardRow,
} from "@/lib/supabase/client";

type StreamFilter = "all" | "verified" | "high_impact";
type WindowFilter = "7d" | "30d" | "all";
type TierFilter =
  | "all"
  | "master_control"
  | "systems_architect"
  | "release_captain"
  | "code_specialist"
  | "associate_engineer";

type TierName = Exclude<TierFilter, "all">;

type RankingRow = OpenSourceLeaderboardRow & {
  verified_rate: number;
  tier: TierName;
};

type CommitFormState = {
  repoName: string;
  repoUrl: string;
  commitHash: string;
  commitUrl: string;
  commitMessage: string;
  linesAdded: string;
  linesDeleted: string;
  qualityScore: string;
  isVerified: boolean;
};

type RepoMeta = {
  repo_name: string;
  total_sr: number;
  commit_count: number;
};

type FallbackCommitRow = {
  id: string;
  author_id: string;
  repo_name: string;
  repo_url: string | null;
  commit_hash: string;
  commit_url: string | null;
  commit_message: string;
  lines_added: number;
  lines_deleted: number;
  quality_score: number;
  is_verified: boolean;
  created_at: string;
};

type FallbackProfileRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

const DEFAULT_FORM_STATE: CommitFormState = {
  repoName: "",
  repoUrl: "",
  commitHash: "",
  commitUrl: "",
  commitMessage: "",
  linesAdded: "20",
  linesDeleted: "5",
  qualityScore: "7",
  isVerified: false,
};

const WINDOW_BASE_TS = Date.now();

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

function toEpoch(value: string) {
  return Date.parse(value || "1970-01-01T00:00:00.000Z");
}

function toTier(totalSr: number): TierName {
  if (totalSr >= 2200) return "master_control";
  if (totalSr >= 1450) return "systems_architect";
  if (totalSr >= 900) return "release_captain";
  if (totalSr >= 420) return "code_specialist";
  return "associate_engineer";
}

function tierLabel(tier: TierName) {
  if (tier === "master_control") return "Master Control";
  if (tier === "systems_architect") return "Systems Architect";
  if (tier === "release_captain") return "Release Captain";
  if (tier === "code_specialist") return "Code Specialist";
  return "Associate Engineer";
}

function shortHash(hash: string) {
  return hash.length > 7 ? hash.slice(0, 7) : hash;
}

function mapRpcError(message: string) {
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

function createInitials(name: string) {
  const pieces = name.trim().split(/\s+/);
  const first = pieces[0]?.[0] ?? "S";
  const second = pieces[1]?.[0] ?? "";
  return `${first}${second}`.toUpperCase();
}

function toOptionalUrl(value: string) {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hasMissingFunctionError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("open_source_leaderboard") ||
    normalized.includes("open_source_commit_feed")
  );
}

function scoreCommit(row: FallbackCommitRow) {
  const churn = Math.min((Math.max(row.lines_added, 0) + Math.max(row.lines_deleted, 0)) / 25, 40);
  return Math.max(row.quality_score, 1) * 12 + churn + (row.is_verified ? 20 : 0);
}

function normalizeFallbackCommit(
  row: FallbackCommitRow,
  profileMap: Map<string, FallbackProfileRow>,
): OpenSourceCommitRow {
  const profile = profileMap.get(row.author_id);
  return {
    id: row.id,
    author_id: row.author_id,
    repo_name: row.repo_name,
    repo_url: row.repo_url,
    commit_hash: row.commit_hash,
    commit_url: row.commit_url,
    commit_message: row.commit_message,
    lines_added: row.lines_added,
    lines_deleted: row.lines_deleted,
    quality_score: row.quality_score,
    is_verified: row.is_verified,
    created_at: row.created_at,
    sr_points: Number(scoreCommit(row).toFixed(0)),
    author_handle: profile?.handle ?? null,
    author_display_name: profile?.display_name ?? null,
    author_avatar_url: profile?.avatar_url ?? null,
  };
}

function buildLeaderboardFromCommits(commits: OpenSourceCommitRow[]): OpenSourceLeaderboardRow[] {
  const aggregate = new Map<
    string,
    {
      author_id: string;
      author_handle: string | null;
      author_display_name: string | null;
      author_avatar_url: string | null;
      total_sr: number;
      commit_count: number;
      quality_sum: number;
      verified_commit_count: number;
      last_commit_at: string;
    }
  >();

  commits.forEach((commit) => {
    const current = aggregate.get(commit.author_id) ?? {
      author_id: commit.author_id,
      author_handle: commit.author_handle,
      author_display_name: commit.author_display_name,
      author_avatar_url: commit.author_avatar_url,
      total_sr: 0,
      commit_count: 0,
      quality_sum: 0,
      verified_commit_count: 0,
      last_commit_at: commit.created_at,
    };

    current.total_sr += commit.sr_points;
    current.commit_count += 1;
    current.quality_sum += commit.quality_score;
    current.verified_commit_count += commit.is_verified ? 1 : 0;
    if (toEpoch(commit.created_at) > toEpoch(current.last_commit_at)) {
      current.last_commit_at = commit.created_at;
    }
    if (!current.author_handle && commit.author_handle) current.author_handle = commit.author_handle;
    if (!current.author_display_name && commit.author_display_name) {
      current.author_display_name = commit.author_display_name;
    }
    if (!current.author_avatar_url && commit.author_avatar_url) {
      current.author_avatar_url = commit.author_avatar_url;
    }

    aggregate.set(commit.author_id, current);
  });

  const sorted = Array.from(aggregate.values()).sort(
    (a, b) =>
      b.total_sr - a.total_sr ||
      b.commit_count - a.commit_count ||
      toEpoch(a.last_commit_at) - toEpoch(b.last_commit_at),
  );

  let previousKey = "";
  let previousRank = 0;

  return sorted.map((entry, index) => {
    const key = `${entry.total_sr}:${entry.commit_count}:${entry.last_commit_at}`;
    const rank = key === previousKey ? previousRank : index + 1;
    previousKey = key;
    previousRank = rank;

    return {
      rank_position: rank,
      author_id: entry.author_id,
      author_handle: entry.author_handle,
      author_display_name: entry.author_display_name,
      author_avatar_url: entry.author_avatar_url,
      total_sr: entry.total_sr,
      commit_count: entry.commit_count,
      avg_quality: Number((entry.quality_sum / Math.max(entry.commit_count, 1)).toFixed(2)),
      verified_commit_count: entry.verified_commit_count,
      last_commit_at: entry.last_commit_at,
    };
  });
}

export default function LeaderboardPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    !supabase ? "Missing Supabase env values. Add .env.local first." : null,
  );
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [leaderboardRows, setLeaderboardRows] = useState<OpenSourceLeaderboardRow[]>([]);
  const [feedRows, setFeedRows] = useState<OpenSourceCommitRow[]>([]);
  const [streamFilter, setStreamFilter] = useState<StreamFilter>("all");
  const [windowFilter, setWindowFilter] = useState<WindowFilter>("30d");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CommitFormState>(DEFAULT_FORM_STATE);

  const refreshViewer = useCallback(async () => {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setViewerId(user?.id ?? null);
  }, [supabase]);

  const refreshData = useCallback(async () => {
    if (!supabase) return false;
    setLoading(true);

    const [leaderboardResult, feedResult] = await Promise.all([
      supabase.rpc("open_source_leaderboard", { limit_count: 300 }),
      supabase.rpc("open_source_commit_feed", { limit_count: 500, offset_count: 0 }),
    ]);

    if (!leaderboardResult.error && !feedResult.error) {
      setLeaderboardRows(
        ((leaderboardResult.data as Record<string, unknown>[]) ?? []).map(normalizeLeaderboardRow),
      );
      setFeedRows(((feedResult.data as Record<string, unknown>[]) ?? []).map(normalizeCommitRow));
      setNotice(null);
      setError(null);
      setLoading(false);
      return true;
    }

    const missingFunction =
      (leaderboardResult.error && hasMissingFunctionError(leaderboardResult.error.message)) ||
      (feedResult.error && hasMissingFunctionError(feedResult.error.message));

    if (!missingFunction) {
      const nextError = leaderboardResult.error?.message ?? feedResult.error?.message ?? "Unknown Supabase error.";
      setError(mapRpcError(nextError));
      setLoading(false);
      return false;
    }

    const { data: commitsRaw, error: commitsError } = await supabase
      .from("open_source_commits")
      .select(
        "id, author_id, repo_name, repo_url, commit_hash, commit_url, commit_message, lines_added, lines_deleted, quality_score, is_verified, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (commitsError) {
      setError(mapRpcError(commitsError.message));
      setLoading(false);
      return false;
    }

    const commitRows = ((commitsRaw ?? []) as FallbackCommitRow[]).map((row) => ({
      ...row,
      id: String(row.id),
      author_id: String(row.author_id),
      repo_name: String(row.repo_name),
      repo_url: row.repo_url ?? null,
      commit_hash: String(row.commit_hash),
      commit_url: row.commit_url ?? null,
      commit_message: String(row.commit_message),
      lines_added: Number(row.lines_added ?? 0),
      lines_deleted: Number(row.lines_deleted ?? 0),
      quality_score: Number(row.quality_score ?? 0),
      is_verified: Boolean(row.is_verified),
      created_at: String(row.created_at ?? ""),
    }));

    const authorIds = Array.from(new Set(commitRows.map((row) => row.author_id)));
    let profileMap = new Map<string, FallbackProfileRow>();

    if (authorIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, handle, display_name, avatar_url")
        .in("id", authorIds);

      profileMap = new Map(
        ((profileRows ?? []) as FallbackProfileRow[]).map((row) => [String(row.id), row]),
      );
    }

    const normalizedCommits = commitRows.map((row) => normalizeFallbackCommit(row, profileMap));
    setFeedRows(normalizedCommits);
    setLeaderboardRows(buildLeaderboardFromCommits(normalizedCommits));
    setNotice(
      "Running in fallback mode from `open_source_commits`. Re-running `supabase/schema.sql` will restore optimized RPC ranking.",
    );
    setError(null);
    setLoading(false);
    return true;
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    const task = setTimeout(() => {
      void refreshViewer();
      void refreshData();
    }, 0);
    return () => clearTimeout(task);
  }, [refreshData, refreshViewer, supabase]);

  const cutoff = useMemo(() => {
    if (windowFilter === "all") return null;
    const days = windowFilter === "7d" ? 7 : 30;
    return WINDOW_BASE_TS - days * 24 * 60 * 60 * 1000;
  }, [windowFilter]);

  const normalizedSearch = search.trim().toLowerCase();
  const allCommits = useMemo(
    () => [...feedRows].sort((a, b) => toEpoch(b.created_at) - toEpoch(a.created_at)),
    [feedRows],
  );

  const scopedCommits = useMemo(
    () =>
      allCommits.filter((row) => {
        if (streamFilter === "verified" && !row.is_verified) return false;
        if (streamFilter === "high_impact" && row.sr_points < 90) return false;
        if (cutoff !== null && toEpoch(row.created_at) < cutoff) return false;

        if (!normalizedSearch) return true;
        const haystack = [
          row.author_handle ?? "",
          row.author_display_name ?? "",
          row.repo_name,
          row.commit_message,
          row.commit_hash,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      }),
    [allCommits, cutoff, normalizedSearch, streamFilter],
  );

  const rpcRankings = useMemo<RankingRow[]>(
    () =>
      leaderboardRows.map((row) => {
        const verifiedRate =
          row.commit_count === 0
            ? 0
            : Number(((row.verified_commit_count / row.commit_count) * 100).toFixed(1));

        return {
          ...row,
          avg_quality: Number(row.avg_quality ?? 0),
          verified_rate: verifiedRate,
          tier: toTier(row.total_sr),
        };
      }),
    [leaderboardRows],
  );

  const liveRankings = useMemo<RankingRow[]>(() => {
    const byAuthor = new Map<
      string,
      {
        author_id: string;
        author_handle: string | null;
        author_display_name: string | null;
        author_avatar_url: string | null;
        total_sr: number;
        commit_count: number;
        quality_sum: number;
        verified_commit_count: number;
        last_commit_at: string;
      }
    >();

    scopedCommits.forEach((row) => {
      const current = byAuthor.get(row.author_id) ?? {
        author_id: row.author_id,
        author_handle: row.author_handle,
        author_display_name: row.author_display_name,
        author_avatar_url: row.author_avatar_url,
        total_sr: 0,
        commit_count: 0,
        quality_sum: 0,
        verified_commit_count: 0,
        last_commit_at: row.created_at,
      };

      current.total_sr += row.sr_points;
      current.commit_count += 1;
      current.quality_sum += row.quality_score;
      current.verified_commit_count += row.is_verified ? 1 : 0;
      if (toEpoch(row.created_at) > toEpoch(current.last_commit_at)) {
        current.last_commit_at = row.created_at;
      }
      if (!current.author_handle && row.author_handle) {
        current.author_handle = row.author_handle;
      }
      if (!current.author_display_name && row.author_display_name) {
        current.author_display_name = row.author_display_name;
      }
      if (!current.author_avatar_url && row.author_avatar_url) {
        current.author_avatar_url = row.author_avatar_url;
      }

      byAuthor.set(row.author_id, current);
    });

    return Array.from(byAuthor.values())
      .sort(
        (a, b) =>
          b.total_sr - a.total_sr ||
          b.commit_count - a.commit_count ||
          toEpoch(a.last_commit_at) - toEpoch(b.last_commit_at),
      )
      .map((row, index) => {
        const avgQuality =
          row.commit_count === 0 ? 0 : Number((row.quality_sum / row.commit_count).toFixed(2));
        const verifiedRate =
          row.commit_count === 0
            ? 0
            : Number(((row.verified_commit_count / row.commit_count) * 100).toFixed(1));

        return {
          rank_position: index + 1,
          author_id: row.author_id,
          author_handle: row.author_handle,
          author_display_name: row.author_display_name,
          author_avatar_url: row.author_avatar_url,
          total_sr: row.total_sr,
          commit_count: row.commit_count,
          avg_quality: avgQuality,
          verified_commit_count: row.verified_commit_count,
          last_commit_at: row.last_commit_at,
          verified_rate: verifiedRate,
          tier: toTier(row.total_sr),
        };
      });
  }, [scopedCommits]);

  const useRpcRankings =
    streamFilter === "all" && windowFilter === "all" && normalizedSearch.length === 0;
  const rankingSource = useRpcRankings ? rpcRankings : liveRankings;

  const rankedRows = useMemo(
    () =>
      rankingSource.filter((row) => {
        if (tierFilter === "all") return true;
        return row.tier === tierFilter;
      }),
    [rankingSource, tierFilter],
  );

  const visibleHistory = useMemo(() => scopedCommits.slice(0, 14), [scopedCommits]);

  const topRepos = useMemo(() => {
    const byRepo = new Map<string, RepoMeta>();

    scopedCommits.forEach((row) => {
      const current = byRepo.get(row.repo_name) ?? {
        repo_name: row.repo_name,
        total_sr: 0,
        commit_count: 0,
      };
      current.total_sr += row.sr_points;
      current.commit_count += 1;
      byRepo.set(row.repo_name, current);
    });

    return Array.from(byRepo.values())
      .sort((a, b) => b.total_sr - a.total_sr || b.commit_count - a.commit_count)
      .slice(0, 6);
  }, [scopedCommits]);

  const summary = useMemo(() => {
    const srTotal = rankedRows.reduce((sum, row) => sum + row.total_sr, 0);
    const totalCommits = scopedCommits.length;
    const avgQuality =
      totalCommits === 0
        ? 0
        : Number(
            (
              scopedCommits.reduce((sum, row) => sum + row.quality_score, 0) /
              Math.max(totalCommits, 1)
            ).toFixed(2),
          );
    const verifiedRate =
      totalCommits === 0
        ? 0
        : Number(
            (
              (scopedCommits.filter((row) => row.is_verified).length /
                Math.max(totalCommits, 1)) *
              100
            ).toFixed(1),
          );

    return {
      engineers: rankedRows.length,
      srTotal,
      avgQuality,
      verifiedRate,
    };
  }, [rankedRows, scopedCommits]);

  const onFormFieldChange = (key: keyof CommitFormState, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmitCommit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setError("Missing Supabase env values. Add .env.local first.");
      return;
    }
    if (!viewerId) {
      setError("Sign in to submit commit records.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      author_id: viewerId,
      repo_name: form.repoName.trim(),
      repo_url: toOptionalUrl(form.repoUrl),
      commit_hash: form.commitHash.trim(),
      commit_url: toOptionalUrl(form.commitUrl),
      commit_message: form.commitMessage.trim(),
      lines_added: clamp(Number(form.linesAdded || 0), 0, 20000),
      lines_deleted: clamp(Number(form.linesDeleted || 0), 0, 20000),
      quality_score: clamp(Number(form.qualityScore || 5), 1, 10),
      is_verified: form.isVerified,
    };

    const { error: insertError } = await supabase.from("open_source_commits").insert(payload);

    if (insertError) {
      setError(mapRpcError(insertError.message));
      setSubmitting(false);
      return;
    }

    setForm(DEFAULT_FORM_STATE);
    await refreshData();
    setSubmitting(false);
  };

  return (
    <main className="forge-shell">
      <p className="forge-announcement">
        Shipyard ranking index beta is live. Open-source commits now drive SR scoring.
      </p>

      <header className="forge-top-nav">
        <div className="forge-top-nav-inner">
          <div className="flex items-center gap-8">
            <Link href="/" className="forge-brand">
              Shipyard
            </Link>
            <nav className="forge-main-links">
              <Link href="/hub">Hub</Link>
              <Link href="/projects">Projects</Link>
              <Link href="/leaderboard" aria-current="page">
                Rankings
              </Link>
            </nav>
          </div>
          <Link href="/auth" className="forge-signin">
            {viewerId ? "Account" : "Sign in"}
          </Link>
        </div>
      </header>

      <div className="forge-sub-nav">
        <div className="forge-sub-nav-inner">
          <span className="forge-sub-link is-active">Build</span>
          <span className="forge-sub-link">Rank Index</span>
          <span className="forge-sub-link">Commits</span>
          <span className="forge-sub-link">Quality</span>
          <span className="forge-sub-link">Verification</span>
        </div>
      </div>

      <section className="forge-content">
        <div className="forge-header-block">
          <p className="terminal-kicker">~/shipyard/rank-index:v01</p>
          <h1 className="terminal-heading mt-3">commit-ranking --engineers --live</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            Track commit quality, contribution volume, and verification as SR. Search engineers,
            inspect contribution telemetry, and submit new commit records in one flow.
          </p>
        </div>

        <div className="forge-filter-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="forge-input"
            placeholder="Search engineer, handle, repository, or commit text"
          />
          <select
            value={streamFilter}
            onChange={(event) => setStreamFilter(event.target.value as StreamFilter)}
            className="forge-input"
          >
            <option value="all">Stream: All commits</option>
            <option value="verified">Stream: Verified only</option>
            <option value="high_impact">Stream: High impact</option>
          </select>
          <select
            value={windowFilter}
            onChange={(event) => setWindowFilter(event.target.value as WindowFilter)}
            className="forge-input"
          >
            <option value="7d">Window: Last 7 days</option>
            <option value="30d">Window: Last 30 days</option>
            <option value="all">Window: All time</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="forge-chip">{summary.engineers} engineers scoped</span>
          <span className="forge-chip">{summary.srTotal.toLocaleString()} SR total</span>
          <span className="forge-chip">{summary.avgQuality}/10 quality average</span>
          <span className="forge-chip">{summary.verifiedRate}% verification rate</span>
        </div>

        {notice && (
          <p className="mt-3 rounded-lg border border-amber-200/35 bg-amber-950/25 px-3 py-2 text-sm text-amber-100">
            {notice}
          </p>
        )}
        {error && <p className="forge-alert">{error}</p>}
        {loading && <p className="mt-3 text-sm text-sky-100/80">Loading ranking data...</p>}

        <section className="forge-panel mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="terminal-heading terminal-heading-sm">top-engineering-benchmarks</h2>
            <div className="flex items-center gap-2">
              <select
                value={tierFilter}
                onChange={(event) => setTierFilter(event.target.value as TierFilter)}
                className="forge-input min-w-[170px]"
              >
                <option value="all">All tiers</option>
                <option value="master_control">Master Control</option>
                <option value="systems_architect">Systems Architect</option>
                <option value="release_captain">Release Captain</option>
                <option value="code_specialist">Code Specialist</option>
                <option value="associate_engineer">Associate Engineer</option>
              </select>
            </div>
          </div>
          <p className="mt-1 text-sm text-slate-300">
            Live rankings from the selected stream and time window.
          </p>

          <div className="forge-table-wrap">
            <table className="forge-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Engineer</th>
                  <th>Tier</th>
                  <th>SR</th>
                  <th>Commits</th>
                  <th>Quality</th>
                  <th>Verified</th>
                </tr>
              </thead>
              <tbody>
                {rankedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <p className="py-5 text-sm text-slate-300">
                        No engineers fit the selected stream/window yet.
                      </p>
                    </td>
                  </tr>
                ) : (
                  rankedRows.map((row) => {
                    const name = row.author_display_name ?? row.author_handle ?? "Unknown Engineer";
                    const handle = row.author_handle ? `@${row.author_handle}` : "No handle";
                    const initials = createInitials(name);
                    const profileHref = row.author_handle
                      ? `/leaderboard/${encodeURIComponent(row.author_handle)}`
                      : null;

                    return (
                      <tr key={row.author_id}>
                        <td className="font-semibold text-slate-300">{row.rank_position}</td>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-500/50 bg-slate-800 text-xs font-bold text-slate-200">
                              {initials}
                            </span>
                            <div className="min-w-0">
                              {profileHref ? (
                                <Link
                                  href={profileHref}
                                  className="truncate text-sm font-semibold text-slate-100 hover:text-sky-200"
                                >
                                  {name}
                                </Link>
                              ) : (
                                <p className="truncate text-sm font-semibold text-slate-100">{name}</p>
                              )}
                              <p className="truncate text-xs text-slate-400">{handle}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`forge-grade-badge forge-grade-${row.tier}`}>
                            {tierLabel(row.tier)}
                          </span>
                        </td>
                        <td className="font-bold text-sky-100">{row.total_sr.toLocaleString()}</td>
                        <td>{row.commit_count}</td>
                        <td>{row.avg_quality}/10</td>
                        <td>
                          <div className="space-y-1">
                            <p className="text-xs text-slate-200">{row.verified_rate}%</p>
                            <div className="forge-verified-track">
                              <span
                                className="forge-verified-fill"
                                style={{ width: `${Math.min(100, row.verified_rate)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <article className="forge-panel">
            <div className="flex items-center justify-between gap-3">
              <h3 className="terminal-heading terminal-heading-xs">commit-history</h3>
              <span className="forge-chip">{visibleHistory.length} entries</span>
            </div>
            <div className="mt-3 space-y-2">
              {visibleHistory.length === 0 ? (
                <p className="text-sm text-slate-300">No commits for this filter.</p>
              ) : (
                visibleHistory.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-slate-700/90 bg-slate-900/55 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-100">
                          {entry.repo_url ? (
                            <a href={entry.repo_url} target="_blank" rel="noreferrer" className="hover:text-sky-200">
                              {entry.repo_name}
                            </a>
                          ) : (
                            entry.repo_name
                          )}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-400">{entry.commit_message}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-sky-100">+{entry.sr_points} SR</p>
                        <p className="text-xs text-slate-400">
                          +{entry.lines_added} / -{entry.lines_deleted}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      {entry.commit_url ? (
                        <a href={entry.commit_url} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-sky-200">
                          {shortHash(entry.commit_hash)}
                        </a>
                      ) : (
                        <span className="text-slate-300">{shortHash(entry.commit_hash)}</span>
                      )}
                      <span>Q {entry.quality_score}/10</span>
                      {entry.is_verified && <span className="forge-verified-pill">Verified</span>}
                      <span>{new Date(entry.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <aside className="space-y-4">
            <article className="forge-panel">
              <h3 className="terminal-heading terminal-heading-xs">submit-entry</h3>
              <p className="mt-1 text-sm text-slate-300">Add commits and update your SR.</p>
              {!viewerId ? (
                <div className="mt-4 rounded-xl border border-slate-700/90 bg-slate-800/65 p-4">
                  <p className="text-sm text-slate-300">Sign in to submit commit records.</p>
                  <Link href="/auth" className="mt-3 inline-flex items-center rounded-full bg-sky-200 px-5 py-2 font-bold text-slate-900">
                    Sign in to submit
                  </Link>
                </div>
              ) : (
                <form className="mt-4 space-y-2" onSubmit={handleSubmitCommit}>
                  <input
                    value={form.repoName}
                    onChange={(event) => onFormFieldChange("repoName", event.target.value)}
                    className="forge-input"
                    placeholder="Repository name"
                    required
                  />
                  <input
                    value={form.repoUrl}
                    onChange={(event) => onFormFieldChange("repoUrl", event.target.value)}
                    className="forge-input"
                    placeholder="Repository URL (optional)"
                  />
                  <input
                    value={form.commitHash}
                    onChange={(event) => onFormFieldChange("commitHash", event.target.value)}
                    className="forge-input"
                    placeholder="Commit hash"
                    minLength={7}
                    required
                  />
                  <input
                    value={form.commitUrl}
                    onChange={(event) => onFormFieldChange("commitUrl", event.target.value)}
                    className="forge-input"
                    placeholder="Commit URL (optional)"
                  />
                  <textarea
                    value={form.commitMessage}
                    onChange={(event) => onFormFieldChange("commitMessage", event.target.value)}
                    className="forge-input min-h-[86px] resize-y"
                    placeholder="Commit message"
                    minLength={5}
                    required
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      value={form.linesAdded}
                      onChange={(event) => onFormFieldChange("linesAdded", event.target.value)}
                      className="forge-input"
                      min={0}
                      max={20000}
                      placeholder="+lines"
                    />
                    <input
                      type="number"
                      value={form.linesDeleted}
                      onChange={(event) => onFormFieldChange("linesDeleted", event.target.value)}
                      className="forge-input"
                      min={0}
                      max={20000}
                      placeholder="-lines"
                    />
                    <input
                      type="number"
                      value={form.qualityScore}
                      onChange={(event) => onFormFieldChange("qualityScore", event.target.value)}
                      className="forge-input"
                      min={1}
                      max={10}
                      placeholder="quality"
                    />
                  </div>
                  <label className="mt-1 inline-flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.isVerified}
                      onChange={(event) => onFormFieldChange("isVerified", event.target.checked)}
                    />
                    Verified commit
                  </label>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-1 inline-flex items-center rounded-full bg-sky-200 px-5 py-2 font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Submitting..." : "Submit entry"}
                  </button>
                </form>
              )}
            </article>

            <article className="forge-panel">
              <h3 className="terminal-heading terminal-heading-xs">meta-repositories</h3>
              <p className="mt-1 text-sm text-slate-300">Repositories with strongest SR performance.</p>
              <div className="mt-3 space-y-2">
                {topRepos.length === 0 ? (
                  <p className="text-sm text-slate-400">No repository stats in this window.</p>
                ) : (
                  topRepos.map((repo) => (
                    <div key={repo.repo_name} className="rounded-lg border border-slate-700/90 bg-slate-900/55 px-3 py-2">
                      <p className="truncate text-sm font-semibold text-slate-100">{repo.repo_name}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {repo.total_sr} SR • {repo.commit_count} commits
                      </p>
                    </div>
                  ))
                )}
              </div>
            </article>
          </aside>
        </section>
      </section>
    </main>
  );
}
