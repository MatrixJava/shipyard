"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient, ProjectRow } from "@/lib/supabase/client";
import { TechStackPills } from "@/components/tech-stack/TechStackPills";

type StatusFilter = "all" | "idea" | "in_progress" | "completed";

function statusBadgeClass(status: ProjectRow["status"]) {
  if (status === "completed") return "tier-badge tier-badge-spark";
  if (status === "in_progress") return "tier-badge tier-badge-comet";
  return "tier-badge tier-badge-nebula";
}

export default function ProjectsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [error, setError] = useState<string | null>(
    !supabase ? "Missing Supabase env values. Add .env.local first." : null,
  );

  useEffect(() => {
    if (!supabase) return;

    const loadProjects = async () => {
      const { data, error: queryError } = await supabase
        .from("projects")
        .select("*")
        .eq("is_public", true)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(80);

      if (queryError) {
        setError(queryError.message);
      } else {
        setProjects((data ?? []) as ProjectRow[]);
      }

      setLoading(false);
    };

    void loadProjects();
  }, [supabase]);

  const filteredProjects = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return projects.filter((project) => {
      if (statusFilter !== "all" && project.status !== statusFilter) {
        return false;
      }

      if (!query) return true;
      return [project.title, project.description, ...(project.tech_stack ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [projects, searchText, statusFilter]);

  const projectStats = useMemo(() => {
    const completed = filteredProjects.filter((project) => project.status === "completed").length;
    const withDemo = filteredProjects.filter((project) => Boolean(project.demo_url)).length;
    const avgStack = Number(
      (
        filteredProjects.reduce((sum, project) => sum + (project.tech_stack?.length ?? 0), 0) /
        Math.max(filteredProjects.length, 1)
      ).toFixed(1),
    );

    return {
      total: filteredProjects.length,
      completed,
      withDemo,
      avgStack,
    };
  }, [filteredProjects]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10 md:px-10 md:py-16">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/" className="legacy-link">
          Home
        </Link>
        <Link href="/hub" className="legacy-link">
          Hub feed
        </Link>
        <Link href="/leaderboard" className="legacy-link">
          Leaderboard
        </Link>
        <Link href="/auth" className="legacy-link">
          Sign in
        </Link>
        <Link href="/projects/new" className="cta-primary">
          New project
        </Link>
      </div>

      <section className="hero-panel rounded-3xl p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-200">Shipyard Projects</p>
        <h1 className="mt-2 text-3xl font-bold text-sky-50 md:text-4xl">Community project index</h1>
        <p className="mt-2 text-sky-100/80">
          Browse build logs, check stack composition, and scout what people are shipping right now.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <div className="mini-stat">
            <p className="text-xs uppercase tracking-[0.14em] text-sky-200">Visible Projects</p>
            <p className="mt-1 text-xl font-bold text-sky-50">{projectStats.total}</p>
          </div>
          <div className="mini-stat">
            <p className="text-xs uppercase tracking-[0.14em] text-sky-200">Completed</p>
            <p className="mt-1 text-xl font-bold text-sky-50">{projectStats.completed}</p>
          </div>
          <div className="mini-stat">
            <p className="text-xs uppercase tracking-[0.14em] text-sky-200">With Demo</p>
            <p className="mt-1 text-xl font-bold text-sky-50">{projectStats.withDemo}</p>
          </div>
          <div className="mini-stat">
            <p className="text-xs uppercase tracking-[0.14em] text-sky-200">Avg Stack Size</p>
            <p className="mt-1 text-xl font-bold text-sky-50">{projectStats.avgStack}</p>
          </div>
        </div>
      </section>

      <section className="feature-card">
        <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search title, description, or tech stack"
            className="pastel-input"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="pastel-select"
          >
            <option value="all">Status: All</option>
            <option value="idea">Status: Idea</option>
            <option value="in_progress">Status: In progress</option>
            <option value="completed">Status: Completed</option>
          </select>
        </div>
      </section>

      {loading && <p className="text-sky-100/80">Loading projects...</p>}
      {error && <p className="rounded-xl border border-rose-300/50 bg-rose-900/25 px-4 py-2 text-rose-100">{error}</p>}

      <section className="grid gap-4 md:grid-cols-2">
        {!loading && filteredProjects.length === 0 ? (
          <article className="feature-card md:col-span-2">
            <h2 className="text-xl font-semibold text-sky-50">No projects found</h2>
            <p className="mt-2 text-sky-100/80">Try a different filter or create a new public project.</p>
          </article>
        ) : (
          filteredProjects.map((project) => (
            <article key={project.id} className="feature-card">
              <div className="flex items-center justify-between gap-2">
                <span className={statusBadgeClass(project.status)}>{project.status.replace("_", " ")}</span>
                <p className="text-xs text-sky-100/65">{new Date(project.created_at).toLocaleDateString()}</p>
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-sky-50">{project.title}</h2>
              <p className="mt-3 text-sky-100/90">{project.description}</p>
              <div className="mt-2">
                <TechStackPills stack={project.tech_stack ?? []} />
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {project.repo_url && (
                  <a className="legacy-link" href={project.repo_url} target="_blank" rel="noreferrer">
                    Repo
                  </a>
                )}
                {project.demo_url && (
                  <a className="legacy-link" href={project.demo_url} target="_blank" rel="noreferrer">
                    Demo
                  </a>
                )}
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
