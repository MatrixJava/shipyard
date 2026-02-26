import { createClient } from "@supabase/supabase-js";

export type ProjectStatus = "idea" | "in_progress" | "completed";
export type IdeaDifficulty = "beginner" | "intermediate" | "advanced";
export type FeedPostType = "project" | "idea";
export type Visibility = "public" | "private";
export type HubSort = "newest" | "trending";

export type ProjectRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  repo_url: string | null;
  demo_url: string | null;
  tech_stack: string[];
  status: ProjectStatus;
  is_public: boolean;
  is_hidden?: boolean;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_admin: boolean;
  created_at: string;
};

export type IdeaRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  desired_stack: string[];
  difficulty: IdeaDifficulty;
  is_public: boolean;
  is_hidden: boolean;
  created_at: string;
};

export type HubFeedItem = {
  id: string;
  post_type: FeedPostType;
  owner_id: string;
  title: string;
  body: string;
  status_or_difficulty: string;
  stack: string[];
  repo_url: string | null;
  demo_url: string | null;
  is_public: boolean;
  created_at: string;
  like_count: number;
  comment_count: number;
  author_handle: string | null;
  author_display_name: string | null;
  author_avatar_url: string | null;
  trending_score: number;
};

export type PostLikeRow = {
  id: string;
  post_type: FeedPostType;
  post_id: string;
  user_id: string;
  created_at: string;
};

export type PostCommentRow = {
  id: string;
  post_type: FeedPostType;
  post_id: string;
  author_id: string;
  body: string;
  is_hidden: boolean;
  created_at: string;
};

export type ContentReportRow = {
  id: string;
  target_type: "project" | "idea" | "comment";
  target_id: string;
  reporter_id: string;
  reason: string;
  status: "open" | "reviewed" | "dismissed" | "actioned";
  created_at: string;
};

export type OpenSourceCommitRow = {
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
  sr_points: number;
  author_handle: string | null;
  author_display_name: string | null;
  author_avatar_url: string | null;
};

export type OpenSourceLeaderboardRow = {
  rank_position: number;
  author_id: string;
  author_handle: string | null;
  author_display_name: string | null;
  author_avatar_url: string | null;
  total_sr: number;
  commit_count: number;
  avg_quality: number;
  verified_commit_count: number;
  last_commit_at: string;
};

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function createSupabaseBrowserClient() {
  const env = getSupabaseEnv();

  if (!env) {
    return null;
  }

  return createClient(env.url, env.anonKey);
}
