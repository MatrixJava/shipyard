"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient, ProjectRow } from "@/lib/supabase/client";
import { TechStackPills } from "@/components/tech-stack/TechStackPills";

export default function ProjectsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
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
        .limit(30);

      if (queryError) {
        setError(queryError.message);
      } else {
        setProjects((data ?? []) as ProjectRow[]);
      }

      setLoading(false);
    };

    void loadProjects();
  }, [supabase]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10 md:px-10 md:py-16">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/" className="legacy-link">
          Home
        </Link>
        <Link href="/hub" className="legacy-link">
          Hub feed
        </Link>
        <Link href="/auth" className="legacy-link">
          Sign in
        </Link>
        <Link href="/projects/new" className="cta-primary">
          New project
        </Link>
      </div>

      <section className="hero-panel rounded-3xl p-8">
        <h1 className="text-3xl font-bold md:text-4xl">Community Projects</h1>
        <p className="mt-2 text-slate-300">Public student builds from the Shipyard community.</p>
      </section>

      {loading && <p className="text-slate-200">Loading projects...</p>}
      {error && <p className="text-rose-300">{error}</p>}

      <section className="grid gap-4 md:grid-cols-2">
        {!loading && projects.length === 0 ? (
          <article className="feature-card md:col-span-2">
            <h2 className="text-xl font-semibold">No projects yet</h2>
            <p className="mt-2 text-slate-300">Create the first project and set it to public.</p>
          </article>
        ) : (
          projects.map((project) => (
            <article key={project.id} className="feature-card">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">{project.status}</p>
              <h2 className="mt-2 text-2xl font-semibold">{project.title}</h2>
              <p className="mt-3 text-slate-300">{project.description}</p>
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
