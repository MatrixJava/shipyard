"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createSupabaseBrowserClient,
  OpenSourceCommitRow,
} from "@/lib/supabase/client";

type RepoRank = {
  repoName: string;
  repoUrl: string | null;
  totalSr: number;
  commitCount: number;
  avgQuality: number;
};

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

function mapRpcError(message: string) {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("open_source_commits") &&
    (normalized.includes("schema cache") || normalized.includes("does not exist"))
  ) {
    return "Open-source commits table is missing in this Supabase project. Run `supabase/schema.sql` in the Supabase SQL editor, then refresh.";
  }
  if (normalized.includes("open_source_commit_feed")) {
    return "Repository index functions are missing. Run `supabase/schema.sql` and refresh.";
  }
  return message;
}

export function TopReposPanel() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(
    !supabase ? "Missing Supabase env values. Add .env.local first." : null,
  );
  const [repos, setRepos] = useState<RepoRank[]>([]);

  const refreshRepos = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

    const { data, error: rpcError } = await supabase.rpc("open_source_commit_feed", {
      limit_count: 500,
      offset_count: 0,
    });

    if (rpcError) {
      setError(mapRpcError(rpcError.message));
      setLoading(false);
      return;
    }

    const commits = ((data as Record<string, unknown>[]) ?? []).map(normalizeCommitRow);
    const aggregate = new Map<
      string,
      {
        repoName: string;
        repoUrl: string | null;
        totalSr: number;
        commitCount: number;
        qualitySum: number;
      }
    >();

    commits.forEach((commit) => {
      const current = aggregate.get(commit.repo_name) ?? {
        repoName: commit.repo_name,
        repoUrl: commit.repo_url,
        totalSr: 0,
        commitCount: 0,
        qualitySum: 0,
      };

      current.totalSr += commit.sr_points;
      current.commitCount += 1;
      current.qualitySum += commit.quality_score;
      if (!current.repoUrl && commit.repo_url) {
        current.repoUrl = commit.repo_url;
      }

      aggregate.set(commit.repo_name, current);
    });

    const topRepos = Array.from(aggregate.values())
      .map<RepoRank>((repo) => ({
        repoName: repo.repoName,
        repoUrl: repo.repoUrl,
        totalSr: repo.totalSr,
        commitCount: repo.commitCount,
        avgQuality: Number((repo.qualitySum / Math.max(repo.commitCount, 1)).toFixed(2)),
      }))
      .sort((a, b) => b.totalSr - a.totalSr || b.commitCount - a.commitCount)
      .slice(0, 8);

    setRepos(topRepos);
    setError(null);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    const task = setTimeout(() => {
      void refreshRepos();
    }, 0);
    return () => clearTimeout(task);
  }, [refreshRepos, supabase]);

  return (
    <section className="feature-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold text-sky-50">Top Repositories</h2>
        <p className="rounded-full border border-sky-200/30 px-3 py-1 text-xs font-semibold text-sky-100">
          {repos.length} indexed repos
        </p>
      </div>
      <p className="mt-2 text-sm text-slate-300">
        Highest SR repositories based on recent indexed commits.
      </p>

      {error && (
        <p className="mt-3 rounded-lg border border-rose-300/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-100">
          {error}
        </p>
      )}
      {loading && <p className="mt-3 text-sm text-slate-300">Loading repository index...</p>}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {!loading && repos.length === 0 ? (
          <p className="text-sm text-slate-300">No repository data yet.</p>
        ) : (
          repos.map((repo, index) => (
            <article key={repo.repoName} className="rounded-xl border border-sky-200/20 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-sky-100">#{index + 1}</p>
                <p className="text-sm font-bold text-amber-200">{repo.totalSr} SR</p>
              </div>
              <p className="mt-2 truncate text-sm text-slate-100">
                {repo.repoUrl ? (
                  <a href={repo.repoUrl} target="_blank" rel="noreferrer" className="hover:text-sky-200">
                    {repo.repoName}
                  </a>
                ) : (
                  repo.repoName
                )}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {repo.commitCount} commits • {repo.avgQuality}/10 average quality
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
