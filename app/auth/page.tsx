"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient, ProfileRow } from "@/lib/supabase/client";

type AuthState = "idle" | "loading" | "done" | "error";
type EmailAuthMode = "magic_link" | "password";

type SignedInIdentity = {
  email: string;
  provider: "github" | "email";
  name: string;
  handle: string | null;
  avatarUrl: string | null;
};

function getMetadataValue(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}

export default function AuthPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const defaultMessage = !supabase
    ? "Missing Supabase env values. Add .env.local first."
    : "Sign in to create and manage projects.";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailMode, setEmailMode] = useState<EmailAuthMode>("magic_link");
  const [state, setState] = useState<AuthState>("idle");
  const [message, setMessage] = useState(defaultMessage);
  const [identity, setIdentity] = useState<SignedInIdentity | null>(null);

  useEffect(() => {
    const recoverStuckLoadingState = () => {
      setState((previous) => (previous === "loading" ? "idle" : previous));
      setMessage((previous) =>
        previous === "Opening provider sign-in..." || previous === "Redirecting to provider..."
          ? defaultMessage
          : previous
      );
    };

    window.addEventListener("pageshow", recoverStuckLoadingState);
    window.addEventListener("focus", recoverStuckLoadingState);

    return () => {
      window.removeEventListener("pageshow", recoverStuckLoadingState);
      window.removeEventListener("focus", recoverStuckLoadingState);
    };
  }, [defaultMessage]);

  useEffect(() => {
    if (!supabase) return;

    const syncUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id || !user.email) {
        setIdentity(null);
        return;
      }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      const profile = (profileData as ProfileRow | null) ?? null;

      const metadata = (user.user_metadata as Record<string, unknown> | undefined) ?? undefined;
      const providers = (user.app_metadata?.providers as string[] | undefined) ?? [];
      const githubLogin = getMetadataValue(metadata, "user_name") ?? getMetadataValue(metadata, "preferred_username");

      const provider: SignedInIdentity["provider"] = providers.includes("github") ? "github" : "email";
      const name =
        profile?.display_name ??
        getMetadataValue(metadata, "full_name") ??
        getMetadataValue(metadata, "name") ??
        githubLogin ??
        user.email.split("@")[0];

      setIdentity({
        email: user.email,
        provider,
        name,
        handle: profile?.handle ?? githubLogin,
        avatarUrl: profile?.avatar_url ?? getMetadataValue(metadata, "avatar_url"),
      });
    };

    void syncUser();
  }, [supabase]);

  const handleEmailSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    setState("loading");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });

    if (error) {
      setState("error");
      setMessage(error.message);
      return;
    }

    setState("done");
    setMessage("Check your email for a magic link.");
  };

  const handlePasswordSignIn = async () => {
    if (!supabase) return;
    if (!email || !password) {
      setState("error");
      setMessage("Enter email and password.");
      return;
    }

    setState("loading");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setState("error");
      setMessage(error.message);
      return;
    }

    setState("done");
    setMessage("Signed in with email and password.");
  };

  const handlePasswordSignUp = async () => {
    if (!supabase) return;
    if (!email || !password) {
      setState("error");
      setMessage("Enter email and password.");
      return;
    }

    setState("loading");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });

    if (error) {
      setState("error");
      setMessage(error.message);
      return;
    }

    setState("done");
    setMessage("Account created. Check your email if confirmation is enabled.");
  };

  const handleOAuthSignIn = async (provider: "github" | "google") => {
    if (!supabase) return;

    setState("loading");
    setMessage("Opening provider sign-in...");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth`,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      setState("error");
      setMessage(error.message);
      return;
    }

    if (!data?.url) {
      setState("error");
      setMessage("Unable to open provider sign-in. Check provider settings and try again.");
      return;
    }

    setMessage("Redirecting to provider...");
    window.location.assign(data.url);
  };

  const handleSignOut = async () => {
    if (!supabase) return;

    await supabase.auth.signOut();
    setIdentity(null);
    setState("done");
    setMessage("Signed out.");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10 md:px-10 md:py-16">
      <Link href="/" className="legacy-link w-fit">
        Back to home
      </Link>

      <section className="auth-grid">
        <article className="hero-panel auth-hero rounded-3xl p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">Shipyard Auth</p>
          <h1 className="mt-3 text-3xl font-bold md:text-5xl">Build your dev identity</h1>
          <p className="mt-4 text-slate-300">{message}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="auth-chip">Portfolio-first</span>
            <span className="auth-chip">GitHub-ready</span>
            <span className="auth-chip">Community feed</span>
          </div>
        </article>

        <article className="feature-card auth-panel">
          {identity ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Connected account</h2>
              <div className="rounded-2xl border border-emerald-400/40 bg-emerald-900/20 p-4">
                <div className="flex items-center gap-3">
                  {identity.avatarUrl ? (
                    <Image
                      src={identity.avatarUrl}
                      alt="Profile avatar"
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full border border-emerald-300/40 object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-300/40 bg-slate-900 text-lg font-bold text-emerald-200">
                      {identity.name[0]?.toUpperCase() ?? "U"}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-emerald-100">{identity.name}</p>
                    <p className="text-sm text-emerald-200">{identity.email}</p>
                    {identity.handle && <p className="text-sm text-sky-200">@{identity.handle}</p>}
                  </div>
                </div>
                <p className="mt-3 inline-flex rounded-full border border-emerald-300/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">
                  {identity.provider === "github" ? "GitHub OAuth" : "Email Magic Link"}
                </p>
              </div>

              <button
                onClick={handleSignOut}
                className="rounded-full border border-rose-300/40 px-4 py-2 text-sm font-semibold text-rose-100"
              >
                Sign out
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-semibold">Sign in</h2>

              <form onSubmit={handleEmailSignIn} className="mt-4 space-y-3">
                <div className="inline-flex rounded-full border border-slate-600 bg-slate-900/70 p-1">
                  <button
                    type="button"
                    onClick={() => setEmailMode("magic_link")}
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${
                      emailMode === "magic_link" ? "bg-sky-400 text-slate-900" : "text-slate-300"
                    }`}
                  >
                    Magic Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailMode("password")}
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${
                      emailMode === "password" ? "bg-sky-400 text-slate-900" : "text-slate-300"
                    }`}
                  >
                    Password
                  </button>
                </div>

                <label className="block text-sm font-medium text-slate-200" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-slate-100"
                />

                {emailMode === "password" && (
                  <>
                    <label className="block text-sm font-medium text-slate-200" htmlFor="password">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-slate-100"
                    />
                  </>
                )}

                {emailMode === "magic_link" ? (
                  <button
                    type="submit"
                    disabled={state === "loading"}
                    className="cta-primary border-0 disabled:opacity-60"
                  >
                    Send magic link
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handlePasswordSignIn}
                      disabled={state === "loading"}
                      className="cta-primary border-0 disabled:opacity-60"
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      onClick={handlePasswordSignUp}
                      disabled={state === "loading"}
                      className="cta-secondary disabled:opacity-60"
                    >
                      Create account
                    </button>
                  </div>
                )}
              </form>

              <div className="my-4 h-px bg-slate-700" />

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void handleOAuthSignIn("github")}
                  disabled={state === "loading"}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-500 px-4 py-2 font-semibold text-slate-100 disabled:opacity-60"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-slate-900">
                    GH
                  </span>
                  Continue with GitHub
                </button>

                <button
                  onClick={() => void handleOAuthSignIn("google")}
                  disabled={state === "loading"}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-500 px-4 py-2 font-semibold text-slate-100 disabled:opacity-60"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-slate-900">
                    G
                  </span>
                  Continue with Google
                </button>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                OAuth buttons work after enabling those providers in Supabase Auth settings.
              </p>
            </>
          )}
        </article>
      </section>
    </main>
  );
}
