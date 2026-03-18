-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Workspaces: one per user
create table workspaces (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null unique,
  name        text not null default 'My Workspace',
  icon        text not null default '🌿',
  cover_type  text not null default 'silk',
  cover_value text not null default 'Forest',
  created_at  timestamptz not null default now()
);

alter table workspaces enable row level security;

create policy "Users can manage own workspace"
  on workspaces for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Items: folders, notes, canvas
create table items (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  parent_id    uuid references items(id) on delete cascade,
  type         text not null check (type in ('folder','note','canvas')),
  name         text not null,
  content      jsonb,
  color        text not null default '#527160',
  is_pinned    bool not null default false,
  position     int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table items enable row level security;

create policy "Users can manage own items"
  on items for all
  using (
    exists (
      select 1 from workspaces w
      where w.id = workspace_id and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workspaces w
      where w.id = workspace_id and w.user_id = auth.uid()
    )
  );

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger items_updated_at
  before update on items
  for each row execute procedure update_updated_at();

-- Recents: last accessed items per user
create table recents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  item_id     uuid references items(id) on delete cascade not null,
  accessed_at timestamptz not null default now(),
  unique(user_id, item_id)
);

alter table recents enable row level security;

create policy "Users can manage own recents"
  on recents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Storage bucket for cover images
insert into storage.buckets (id, name, public) values ('workspace-covers', 'workspace-covers', true)
  on conflict do nothing;

create policy "Anyone can read covers"
  on storage.objects for select
  using (bucket_id = 'workspace-covers');

create policy "Authenticated users can upload covers"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'workspace-covers');
