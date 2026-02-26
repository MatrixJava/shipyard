"use client";

import Link from "next/link";
import { useState } from "react";

type ProjectTemplate = {
  name: string;
  stack: string;
  scope: string;
  outcome: string;
};

type IdeaStarter = {
  name: string;
  prompt: string;
  deliverable: string;
};

const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    name: "Commit Risk Radar",
    stack: "Next.js • Supabase • Tailwind",
    scope: "2-3 day build",
    outcome: "Visualize risky commits by churn, quality score, and verification.",
  },
  {
    name: "PR Readiness Checker",
    stack: "Node.js • TypeScript • GitHub API",
    scope: "Weekend build",
    outcome: "Score pull requests for docs, tests, and maintainability before merge.",
  },
  {
    name: "Issue Intake Triage",
    stack: "Next.js • Postgres • Background jobs",
    scope: "4-5 day build",
    outcome: "Auto-tag and prioritize incoming issues by component and severity.",
  },
];

const IDEA_STARTERS: IdeaStarter[] = [
  {
    name: "Readme Drift Detector",
    prompt: "Compare README claims against repo structure and CI scripts.",
    deliverable: "CLI + markdown report that highlights missing docs coverage.",
  },
  {
    name: "Refactor Heatmap",
    prompt: "Track modules with repeated high-churn commits over rolling windows.",
    deliverable: "Dashboard that flags refactor candidates and dependency hotspots.",
  },
  {
    name: "Test Debt Notifier",
    prompt: "Find changed files without adjacent test edits across recent commits.",
    deliverable: "Bot comment template for pull requests with test debt guidance.",
  },
];

export function QuickStarterPanel() {
  const [ideaIndex, setIdeaIndex] = useState(0);
  const activeIdea = IDEA_STARTERS[ideaIndex];

  const cycleIdea = () => {
    setIdeaIndex((current) => (current + 1) % IDEA_STARTERS.length);
  };

  return (
    <section className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
      <article className="feature-card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-sky-50">Quick Project Templates</h2>
          <Link href="/projects/new" className="legacy-link">
            Start new project
          </Link>
        </div>
        <p className="mt-2 text-sm text-slate-300">
          Pick a scoped template, ship quickly, then publish it to your portfolio.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {PROJECT_TEMPLATES.map((template) => (
            <article key={template.name} className="rounded-2xl border border-sky-200/20 bg-slate-900/50 p-4">
              <p className="text-sm font-semibold text-sky-100">{template.name}</p>
              <p className="mt-1 text-xs text-slate-400">{template.stack}</p>
              <p className="mt-3 text-xs text-sky-200">{template.scope}</p>
              <p className="mt-2 text-sm text-slate-300">{template.outcome}</p>
            </article>
          ))}
        </div>
      </article>

      <article className="feature-card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-sky-50">Idea Starter</h2>
          <button
            type="button"
            onClick={cycleIdea}
            className="rounded-full border border-sky-200/40 bg-sky-900/30 px-3 py-1 text-xs font-semibold text-sky-100"
          >
            Next idea
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-300">Use this to bootstrap a build thread in the Hub.</p>
        <div className="mt-4 rounded-2xl border border-sky-200/20 bg-slate-900/55 p-4">
          <p className="text-sm font-semibold text-sky-100">{activeIdea.name}</p>
          <p className="mt-3 text-sm text-slate-200">{activeIdea.prompt}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">Deliverable</p>
          <p className="mt-1 text-sm text-slate-300">{activeIdea.deliverable}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/hub" className="legacy-link">
            Post in hub
          </Link>
          <Link href="/projects/new" className="legacy-link">
            Build from idea
          </Link>
        </div>
      </article>
    </section>
  );
}
