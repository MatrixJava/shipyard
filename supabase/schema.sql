create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) <= 120),
  description text not null check (char_length(description) <= 2000),
  repo_url text,
  demo_url text,
  tech_stack text[] not null default '{}',
  status text not null check (status in ('idea', 'in_progress', 'completed')),
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists is_hidden boolean not null default false;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 2 and 60),
  avatar_url text,
  bio text check (bio is null or char_length(bio) <= 240),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) <= 120),
  description text not null check (char_length(description) <= 2000),
  desired_stack text[] not null default '{}',
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  is_public boolean not null default true,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_type text not null check (post_type in ('project', 'idea')),
  post_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_type, post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_type text not null check (post_type in ('project', 'idea')),
  post_id uuid not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('project', 'idea', 'comment')),
  target_id uuid not null,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) between 5 and 500),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed', 'actioned')),
  created_at timestamptz not null default now()
);

create table if not exists public.open_source_commits (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  repo_name text not null check (char_length(repo_name) between 2 and 120),
  repo_url text,
  commit_hash text not null check (char_length(commit_hash) between 7 and 64),
  commit_url text,
  commit_message text not null check (char_length(commit_message) between 5 and 500),
  lines_added int not null default 0 check (lines_added >= 0 and lines_added <= 20000),
  lines_deleted int not null default 0 check (lines_deleted >= 0 and lines_deleted <= 20000),
  quality_score int not null default 5 check (quality_score between 1 and 10),
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_created_at on public.projects (created_at desc);
create index if not exists idx_projects_owner_id on public.projects (owner_id);
create index if not exists idx_projects_visibility on public.projects (is_public, is_hidden, created_at desc);

create index if not exists idx_ideas_created_at on public.ideas (created_at desc);
create index if not exists idx_ideas_owner_id on public.ideas (owner_id);
create index if not exists idx_ideas_visibility on public.ideas (is_public, is_hidden, created_at desc);

create index if not exists idx_post_likes_post on public.post_likes (post_type, post_id);
create index if not exists idx_post_comments_post on public.post_comments (post_type, post_id, created_at asc);
create index if not exists idx_content_reports_target on public.content_reports (target_type, target_id);
create index if not exists idx_content_reports_status on public.content_reports (status, created_at desc);
create index if not exists idx_open_source_commits_author on public.open_source_commits (author_id, created_at desc);
create index if not exists idx_open_source_commits_created_at on public.open_source_commits (created_at desc);

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid and p.is_admin = true
  );
$$;

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.profiles p
  where p.id = auth.uid();
$$;

grant execute on function public.current_profile() to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_handle text;
  final_handle text;
begin
  base_handle := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1), 'user'), '[^a-z0-9_]', '', 'g'));

  if char_length(base_handle) < 3 then
    base_handle := 'user' || substring(new.id::text, 1, 8);
  end if;

  final_handle := left(base_handle, 20);

  while exists (select 1 from public.profiles where handle = final_handle) loop
    final_handle := left(base_handle, 15) || substring(gen_random_uuid()::text, 1, 5);
  end loop;

  insert into public.profiles (id, handle, display_name, avatar_url)
  values (
    new.id,
    final_handle,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

alter table public.projects enable row level security;
alter table public.profiles enable row level security;
alter table public.ideas enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.content_reports enable row level security;
alter table public.open_source_commits enable row level security;

-- Projects

drop policy if exists "Public projects are readable" on public.projects;
drop policy if exists "Projects visible by policy" on public.projects;
drop policy if exists "Users can insert own projects" on public.projects;
drop policy if exists "Users can update own projects" on public.projects;
drop policy if exists "Users can delete own projects" on public.projects;

create policy "Projects visible by policy"
  on public.projects
  for select
  using (
    (
      is_hidden = false and (is_public = true or auth.uid() = owner_id)
    )
    or public.is_admin(auth.uid())
  );

create policy "Users can insert own projects"
  on public.projects
  for insert
  with check (
    auth.uid() = owner_id
    and is_hidden = false
  );

create policy "Users can update own projects"
  on public.projects
  for update
  using (auth.uid() = owner_id or public.is_admin(auth.uid()))
  with check (
    (
      auth.uid() = owner_id
      and is_hidden = false
      and owner_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

create policy "Users can delete own projects"
  on public.projects
  for delete
  using (auth.uid() = owner_id or public.is_admin(auth.uid()));

-- Profiles

drop policy if exists "Profiles are publicly readable" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Profiles are publicly readable"
  on public.profiles
  for select
  using (true);

create policy "Users can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id and is_admin = false);

create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id or public.is_admin(auth.uid()))
  with check (
    (auth.uid() = id and is_admin = false)
    or public.is_admin(auth.uid())
  );

-- Ideas

drop policy if exists "Ideas visible by policy" on public.ideas;
drop policy if exists "Users can insert own ideas" on public.ideas;
drop policy if exists "Users can update own ideas" on public.ideas;
drop policy if exists "Users can delete own ideas" on public.ideas;

create policy "Ideas visible by policy"
  on public.ideas
  for select
  using (
    (
      is_hidden = false and (is_public = true or auth.uid() = owner_id)
    )
    or public.is_admin(auth.uid())
  );

create policy "Users can insert own ideas"
  on public.ideas
  for insert
  with check (auth.uid() = owner_id and is_hidden = false);

create policy "Users can update own ideas"
  on public.ideas
  for update
  using (auth.uid() = owner_id or public.is_admin(auth.uid()))
  with check (
    (
      auth.uid() = owner_id
      and is_hidden = false
      and owner_id = auth.uid()
    )
    or public.is_admin(auth.uid())
  );

create policy "Users can delete own ideas"
  on public.ideas
  for delete
  using (auth.uid() = owner_id or public.is_admin(auth.uid()));

-- Likes

drop policy if exists "Likes visible for visible content" on public.post_likes;
drop policy if exists "Users can create own likes" on public.post_likes;
drop policy if exists "Users can delete own likes" on public.post_likes;

create policy "Likes visible for visible content"
  on public.post_likes
  for select
  using (
    exists (
      select 1
      from public.projects p
      where post_likes.post_type = 'project'
        and p.id = post_likes.post_id
        and (
          (p.is_hidden = false and (p.is_public = true or p.owner_id = auth.uid()))
          or public.is_admin(auth.uid())
        )
    )
    or exists (
      select 1
      from public.ideas i
      where post_likes.post_type = 'idea'
        and i.id = post_likes.post_id
        and (
          (i.is_hidden = false and (i.is_public = true or i.owner_id = auth.uid()))
          or public.is_admin(auth.uid())
        )
    )
  );

create policy "Users can create own likes"
  on public.post_likes
  for insert
  with check (
    auth.uid() = user_id
    and (
      exists (
        select 1
        from public.projects p
        where post_likes.post_type = 'project'
          and p.id = post_likes.post_id
          and p.is_hidden = false
          and (p.is_public = true or p.owner_id = auth.uid() or public.is_admin(auth.uid()))
      )
      or exists (
        select 1
        from public.ideas i
        where post_likes.post_type = 'idea'
          and i.id = post_likes.post_id
          and i.is_hidden = false
          and (i.is_public = true or i.owner_id = auth.uid() or public.is_admin(auth.uid()))
      )
    )
  );

create policy "Users can delete own likes"
  on public.post_likes
  for delete
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Comments

drop policy if exists "Comments visible for visible content" on public.post_comments;
drop policy if exists "Users can create own comments" on public.post_comments;
drop policy if exists "Users can update own comments" on public.post_comments;
drop policy if exists "Users can delete own comments" on public.post_comments;

create policy "Comments visible for visible content"
  on public.post_comments
  for select
  using (
    (
      is_hidden = false
      and (
        exists (
          select 1
          from public.projects p
          where post_comments.post_type = 'project'
            and p.id = post_comments.post_id
            and p.is_hidden = false
            and (p.is_public = true or p.owner_id = auth.uid() or public.is_admin(auth.uid()))
        )
        or exists (
          select 1
          from public.ideas i
          where post_comments.post_type = 'idea'
            and i.id = post_comments.post_id
            and i.is_hidden = false
            and (i.is_public = true or i.owner_id = auth.uid() or public.is_admin(auth.uid()))
        )
      )
    )
    or auth.uid() = author_id
    or public.is_admin(auth.uid())
  );

create policy "Users can create own comments"
  on public.post_comments
  for insert
  with check (
    auth.uid() = author_id
    and is_hidden = false
    and (
      exists (
        select 1
        from public.projects p
        where post_comments.post_type = 'project'
          and p.id = post_comments.post_id
          and p.is_hidden = false
          and (p.is_public = true or p.owner_id = auth.uid() or public.is_admin(auth.uid()))
      )
      or exists (
        select 1
        from public.ideas i
        where post_comments.post_type = 'idea'
          and i.id = post_comments.post_id
          and i.is_hidden = false
          and (i.is_public = true or i.owner_id = auth.uid() or public.is_admin(auth.uid()))
      )
    )
  );

create policy "Users can update own comments"
  on public.post_comments
  for update
  using (auth.uid() = author_id or public.is_admin(auth.uid()))
  with check (
    (auth.uid() = author_id and is_hidden = false)
    or public.is_admin(auth.uid())
  );

create policy "Users can delete own comments"
  on public.post_comments
  for delete
  using (auth.uid() = author_id or public.is_admin(auth.uid()));

-- Reports

drop policy if exists "Users can create reports" on public.content_reports;
drop policy if exists "Users can read own reports" on public.content_reports;
drop policy if exists "Admins can read all reports" on public.content_reports;
drop policy if exists "Admins can update reports" on public.content_reports;

create policy "Users can create reports"
  on public.content_reports
  for insert
  with check (auth.uid() = reporter_id);

create policy "Users can read own reports"
  on public.content_reports
  for select
  using (auth.uid() = reporter_id);

create policy "Admins can read all reports"
  on public.content_reports
  for select
  using (public.is_admin(auth.uid()));

create policy "Admins can update reports"
  on public.content_reports
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Open source commit ladder

drop policy if exists "Open source commits are publicly readable" on public.open_source_commits;
drop policy if exists "Users can insert own open source commits" on public.open_source_commits;
drop policy if exists "Users can update own open source commits" on public.open_source_commits;
drop policy if exists "Users can delete own open source commits" on public.open_source_commits;

create policy "Open source commits are publicly readable"
  on public.open_source_commits
  for select
  using (true);

create policy "Users can insert own open source commits"
  on public.open_source_commits
  for insert
  with check (
    auth.uid() = author_id
    and is_verified = false
  );

create policy "Users can update own open source commits"
  on public.open_source_commits
  for update
  using (auth.uid() = author_id or public.is_admin(auth.uid()))
  with check (
    (
      auth.uid() = author_id
      and author_id = auth.uid()
      and is_verified = false
    )
    or public.is_admin(auth.uid())
  );

create policy "Users can delete own open source commits"
  on public.open_source_commits
  for delete
  using (auth.uid() = author_id or public.is_admin(auth.uid()));

create or replace function public.commit_sr_points(
  lines_added int,
  lines_deleted int,
  quality_score int,
  is_verified boolean
)
returns int
language sql
immutable
as $$
  select
    (greatest(quality_score, 1) * 12)
    + least(((greatest(lines_added, 0) + greatest(lines_deleted, 0)) / 25), 40)
    + (case when is_verified then 20 else 0 end);
$$;

create or replace function public.open_source_commit_feed(limit_count int default 40, offset_count int default 0)
returns table (
  id uuid,
  author_id uuid,
  repo_name text,
  repo_url text,
  commit_hash text,
  commit_url text,
  commit_message text,
  lines_added int,
  lines_deleted int,
  quality_score int,
  is_verified boolean,
  created_at timestamptz,
  sr_points int,
  author_handle text,
  author_display_name text,
  author_avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.author_id,
    c.repo_name,
    c.repo_url,
    c.commit_hash,
    c.commit_url,
    c.commit_message,
    c.lines_added,
    c.lines_deleted,
    c.quality_score,
    c.is_verified,
    c.created_at,
    public.commit_sr_points(c.lines_added, c.lines_deleted, c.quality_score, c.is_verified) as sr_points,
    p.handle as author_handle,
    p.display_name as author_display_name,
    p.avatar_url as author_avatar_url
  from public.open_source_commits c
  left join public.profiles p on p.id = c.author_id
  order by c.created_at desc
  limit greatest(limit_count, 1)
  offset greatest(offset_count, 0);
$$;

create or replace function public.open_source_leaderboard(limit_count int default 25)
returns table (
  rank_position int,
  author_id uuid,
  author_handle text,
  author_display_name text,
  author_avatar_url text,
  total_sr int,
  commit_count int,
  avg_quality numeric,
  verified_commit_count int,
  last_commit_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with scored as (
    select
      c.author_id,
      c.quality_score,
      c.is_verified,
      c.created_at,
      public.commit_sr_points(c.lines_added, c.lines_deleted, c.quality_score, c.is_verified) as sr_points
    from public.open_source_commits c
  ),
  aggregated as (
    select
      s.author_id,
      sum(s.sr_points)::int as total_sr,
      count(*)::int as commit_count,
      round(avg(s.quality_score)::numeric, 2) as avg_quality,
      count(*) filter (where s.is_verified = true)::int as verified_commit_count,
      max(s.created_at) as last_commit_at
    from scored s
    group by s.author_id
  ),
  ranked as (
    select
      dense_rank() over (order by a.total_sr desc, a.commit_count desc, a.last_commit_at asc)::int as rank_position,
      a.author_id,
      p.handle as author_handle,
      p.display_name as author_display_name,
      p.avatar_url as author_avatar_url,
      a.total_sr,
      a.commit_count,
      a.avg_quality,
      a.verified_commit_count,
      a.last_commit_at
    from aggregated a
    left join public.profiles p on p.id = a.author_id
  )
  select
    r.rank_position,
    r.author_id,
    r.author_handle,
    r.author_display_name,
    r.author_avatar_url,
    r.total_sr,
    r.commit_count,
    r.avg_quality,
    r.verified_commit_count,
    r.last_commit_at
  from ranked r
  order by r.rank_position asc, r.last_commit_at asc
  limit greatest(limit_count, 1);
$$;

grant execute on function public.commit_sr_points(int, int, int, boolean) to anon, authenticated;
grant execute on function public.open_source_commit_feed(int, int) to anon, authenticated;
grant execute on function public.open_source_leaderboard(int) to anon, authenticated;

create or replace view public.hub_feed_base
as
  select
    p.id,
    'project'::text as post_type,
    p.owner_id,
    p.title,
    p.description as body,
    p.status as status_or_difficulty,
    p.tech_stack as stack,
    p.repo_url,
    p.demo_url,
    p.is_public,
    p.created_at,
    coalesce(pl.like_count, 0)::int as like_count,
    coalesce(pc.comment_count, 0)::int as comment_count,
    pr.handle as author_handle,
    pr.display_name as author_display_name,
    pr.avatar_url as author_avatar_url
  from public.projects p
  left join (
    select post_id, count(*) as like_count
    from public.post_likes
    where post_type = 'project'
    group by post_id
  ) pl on pl.post_id = p.id
  left join (
    select post_id, count(*) as comment_count
    from public.post_comments
    where post_type = 'project' and is_hidden = false
    group by post_id
  ) pc on pc.post_id = p.id
  left join public.profiles pr on pr.id = p.owner_id
  where p.is_hidden = false

  union all

  select
    i.id,
    'idea'::text as post_type,
    i.owner_id,
    i.title,
    i.description as body,
    i.difficulty as status_or_difficulty,
    i.desired_stack as stack,
    null::text as repo_url,
    null::text as demo_url,
    i.is_public,
    i.created_at,
    coalesce(pl.like_count, 0)::int as like_count,
    coalesce(pc.comment_count, 0)::int as comment_count,
    pr.handle as author_handle,
    pr.display_name as author_display_name,
    pr.avatar_url as author_avatar_url
  from public.ideas i
  left join (
    select post_id, count(*) as like_count
    from public.post_likes
    where post_type = 'idea'
    group by post_id
  ) pl on pl.post_id = i.id
  left join (
    select post_id, count(*) as comment_count
    from public.post_comments
    where post_type = 'idea' and is_hidden = false
    group by post_id
  ) pc on pc.post_id = i.id
  left join public.profiles pr on pr.id = i.owner_id
  where i.is_hidden = false;

grant select on public.hub_feed_base to anon, authenticated;

create or replace function public.hub_feed_newest(limit_count int default 30, offset_count int default 0)
returns table (
  id uuid,
  post_type text,
  owner_id uuid,
  title text,
  body text,
  status_or_difficulty text,
  stack text[],
  repo_url text,
  demo_url text,
  is_public boolean,
  created_at timestamptz,
  like_count int,
  comment_count int,
  author_handle text,
  author_display_name text,
  author_avatar_url text,
  trending_score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    hf.id,
    hf.post_type,
    hf.owner_id,
    hf.title,
    hf.body,
    hf.status_or_difficulty,
    hf.stack,
    hf.repo_url,
    hf.demo_url,
    hf.is_public,
    hf.created_at,
    hf.like_count,
    hf.comment_count,
    hf.author_handle,
    hf.author_display_name,
    hf.author_avatar_url,
    ((hf.like_count * 2) + (hf.comment_count * 3) - (extract(epoch from (now() - hf.created_at)) / 3600 * 0.1))::numeric as trending_score
  from public.hub_feed_base hf
  where hf.is_public = true or hf.owner_id = auth.uid() or public.is_admin(auth.uid())
  order by hf.created_at desc
  limit greatest(limit_count, 1)
  offset greatest(offset_count, 0);
$$;

create or replace function public.hub_feed_trending(
  limit_count int default 30,
  offset_count int default 0,
  window_hours int default 72
)
returns table (
  id uuid,
  post_type text,
  owner_id uuid,
  title text,
  body text,
  status_or_difficulty text,
  stack text[],
  repo_url text,
  demo_url text,
  is_public boolean,
  created_at timestamptz,
  like_count int,
  comment_count int,
  author_handle text,
  author_display_name text,
  author_avatar_url text,
  trending_score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with scoped as (
    select
      hf.*,
      ((hf.like_count * 2) + (hf.comment_count * 3) - (extract(epoch from (now() - hf.created_at)) / 3600 * 0.1))::numeric as score
    from public.hub_feed_base hf
    where (hf.is_public = true or hf.owner_id = auth.uid() or public.is_admin(auth.uid()))
      and hf.created_at >= greatest(
        now() - interval '14 days',
        now() - make_interval(hours => greatest(window_hours, 1))
      )
  )
  select
    scoped.id,
    scoped.post_type,
    scoped.owner_id,
    scoped.title,
    scoped.body,
    scoped.status_or_difficulty,
    scoped.stack,
    scoped.repo_url,
    scoped.demo_url,
    scoped.is_public,
    scoped.created_at,
    scoped.like_count,
    scoped.comment_count,
    scoped.author_handle,
    scoped.author_display_name,
    scoped.author_avatar_url,
    scoped.score as trending_score
  from scoped
  order by scoped.score desc, scoped.created_at desc
  limit greatest(limit_count, 1)
  offset greatest(offset_count, 0);
$$;

grant execute on function public.hub_feed_newest(int, int) to anon, authenticated;
grant execute on function public.hub_feed_trending(int, int, int) to anon, authenticated;
