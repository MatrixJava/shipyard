import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-16 px-6 py-10 md:px-10 md:py-16">
      <section className="hero-panel rounded-3xl p-8 md:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Shipyard.dev</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
          The project platform for student builders and future engineers.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-200 md:text-lg">
          Upload projects, share ideas, find collaborators, and build a portfolio that proves what you can ship.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="cta-primary" href="/hub">
            Open hub
          </Link>
          <Link className="cta-primary" href="/projects">
            Explore projects
          </Link>
          <Link className="cta-secondary" href="/auth">
            Sign in
          </Link>
        </div>
      </section>

      <section id="mvp" className="grid gap-4 md:grid-cols-3">
        <article className="feature-card">
          <h2 className="text-xl font-semibold">Project Profiles</h2>
          <p className="mt-2 text-slate-300">
            Showcase GitHub repos, live demos, screenshots, tech stack, and project status.
          </p>
        </article>
        <article className="feature-card">
          <h2 className="text-xl font-semibold">Idea Board</h2>
          <p className="mt-2 text-slate-300">
            Post ideas, tag difficulty, and let students join open build teams.
          </p>
        </article>
        <article className="feature-card">
          <h2 className="text-xl font-semibold">Open Source Focus</h2>
          <p className="mt-2 text-slate-300">
            Encourage contribution history and community feedback that helps junior devs stand out.
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-700/80 bg-slate-900/50 p-6">
        <h2 className="text-2xl font-semibold">Phase 1 is live</h2>
        <p className="mt-2 text-slate-300">You can sign in, create a project, and browse public projects.</p>
        <ul className="mt-4 flex flex-wrap gap-3">
          <li>
            <Link href="/auth" className="legacy-link">
              Auth
            </Link>
          </li>
          <li>
            <Link href="/projects" className="legacy-link">
              Projects
            </Link>
          </li>
          <li>
            <Link href="/projects/new" className="legacy-link">
              New Project
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
