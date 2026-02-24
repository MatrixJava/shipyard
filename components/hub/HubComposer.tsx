import { FormEvent, useState } from "react";
import { FeedPostType, IdeaDifficulty, ProjectStatus } from "@/lib/supabase/client";
import { TechStackSelector } from "@/components/tech-stack/TechStackSelector";

export type ComposerPayload = {
  postType: FeedPostType;
  title: string;
  description: string;
  stack: string[];
  isPublic: boolean;
  status: ProjectStatus;
  difficulty: IdeaDifficulty;
  repoUrl: string | null;
  demoUrl: string | null;
};

type HubComposerProps = {
  disabled?: boolean;
  onSubmit: (payload: ComposerPayload) => Promise<void>;
};

const projectStatuses: ProjectStatus[] = ["idea", "in_progress", "completed"];
const ideaDifficulties: IdeaDifficulty[] = ["beginner", "intermediate", "advanced"];

export function HubComposer({ disabled, onSubmit }: HubComposerProps) {
  const [postType, setPostType] = useState<FeedPostType>("project");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedStack, setSelectedStack] = useState<string[]>([]);
  const [status, setStatus] = useState<ProjectStatus>("idea");
  const [difficulty, setDifficulty] = useState<IdeaDifficulty>("beginner");
  const [repoUrl, setRepoUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle || !trimmedDescription) {
      setError("Title and description are required.");
      return;
    }

    if (trimmedTitle.length > 120 || trimmedDescription.length > 2000) {
      setError("Title max 120 chars, description max 2000 chars.");
      return;
    }

    setError(null);

    await onSubmit({
      postType,
      title: trimmedTitle,
      description: trimmedDescription,
      stack: selectedStack,
      isPublic,
      status,
      difficulty,
      repoUrl: repoUrl.trim() || null,
      demoUrl: demoUrl.trim() || null,
    });

    setTitle("");
    setDescription("");
    setSelectedStack([]);
    setRepoUrl("");
    setDemoUrl("");
    setPostType("project");
    setStatus("idea");
    setDifficulty("beginner");
    setIsPublic(true);
  };

  return (
    <section className="feature-card">
      <h2 className="text-xl font-semibold">Create a post</h2>
      <p className="mt-1 text-sm text-slate-300">Publish a project or idea to the community feed.</p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div className="inline-flex rounded-full border border-slate-600 bg-slate-900/70 p-1">
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              postType === "project" ? "bg-cyan-400 text-slate-900" : "text-slate-300"
            }`}
            onClick={() => setPostType("project")}
          >
            Project
          </button>
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              postType === "idea" ? "bg-cyan-400 text-slate-900" : "text-slate-300"
            }`}
            onClick={() => setPostType("idea")}
          >
            Idea
          </button>
        </div>

        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={postType === "project" ? "Project title" : "Idea title"}
          className="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-slate-100"
          required
        />

        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          placeholder={postType === "project" ? "What are you building?" : "Describe your idea"}
          className="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-slate-100"
          required
        />

        <TechStackSelector
          label={postType === "project" ? "Tech stack" : "Desired stack"}
          selected={selectedStack}
          onChange={setSelectedStack}
        />

        {postType === "project" ? (
          <>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as ProjectStatus)}
              className="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-slate-100"
            >
              {projectStatuses.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              placeholder="Repo URL"
              className="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-slate-100"
            />
            <input
              value={demoUrl}
              onChange={(event) => setDemoUrl(event.target.value)}
              placeholder="Demo URL"
              className="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-slate-100"
            />
          </>
        ) : (
          <select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as IdeaDifficulty)}
            className="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-slate-100"
          >
            {ideaDifficulties.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}

        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
          Public post
        </label>

        {error && <p className="text-sm text-rose-300">{error}</p>}

        <button type="submit" disabled={disabled} className="cta-primary border-0 disabled:opacity-60">
          {disabled ? "Publishing..." : "Publish"}
        </button>
      </form>
    </section>
  );
}
