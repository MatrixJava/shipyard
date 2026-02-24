"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient, ProjectStatus } from "@/lib/supabase/client";
import { TechStackSelector } from "@/components/tech-stack/TechStackSelector";

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [selectedStack, setSelectedStack] = useState<string[]>([]);
  const [status, setStatus] = useState<ProjectStatus>("idea");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      setError("Missing Supabase env values. Add .env.local first.");
      return;
    }

    setSaving(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      setError("You must sign in first.");
      return;
    }

    const { error: insertError } = await supabase.from("projects").insert({
      owner_id: user.id,
      title,
      description,
      repo_url: repoUrl || null,
      demo_url: demoUrl || null,
      tech_stack: selectedStack,
      status,
      is_public: isPublic,
    });

    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    router.push("/projects");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-10 md:px-10 md:py-16">
      <div className="flex flex-wrap gap-3">
        <Link href="/projects" className="legacy-link">
          Back to projects
        </Link>
        <Link href="/auth" className="legacy-link">
          Sign in
        </Link>
      </div>

      <section className="hero-panel rounded-3xl p-8">
        <h1 className="text-3xl font-bold md:text-4xl">New project</h1>
        <p className="mt-2 text-slate-300">Share what you are building with the Shipyard community.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="title" className="mb-2 block text-sm font-medium text-slate-200">
              Title
            </label>
            <input
              id="title"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="description" className="mb-2 block text-sm font-medium text-slate-200">
              Description
            </label>
            <textarea
              id="description"
              required
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="repo" className="mb-2 block text-sm font-medium text-slate-200">
              Repo URL
            </label>
            <input
              id="repo"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              placeholder="https://github.com/user/repo"
              className="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="demo" className="mb-2 block text-sm font-medium text-slate-200">
              Demo URL
            </label>
            <input
              id="demo"
              value={demoUrl}
              onChange={(event) => setDemoUrl(event.target.value)}
              placeholder="https://my-demo.app"
              className="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-slate-100"
            />
          </div>

          <TechStackSelector label="Tech stack" selected={selectedStack} onChange={setSelectedStack} />

          <div>
            <label htmlFor="status" className="mb-2 block text-sm font-medium text-slate-200">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(event) => setStatus(event.target.value as ProjectStatus)}
              className="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-slate-100"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
            Make this project public
          </label>

          {error && <p className="text-sm text-rose-300">{error}</p>}

          <button type="submit" disabled={saving} className="cta-primary border-0 disabled:opacity-60">
            {saving ? "Saving..." : "Publish project"}
          </button>
        </form>
      </section>
    </main>
  );
}
