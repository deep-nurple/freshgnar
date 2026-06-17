-- Run this once in the Supabase SQL editor.
-- The Drawboard frontend uses the public/anon (publishable) key with no
-- auth, so RLS policies must explicitly allow public read/insert.

alter table public.threads enable row level security;
alter table public.drawings enable row level security;

create policy "Public can read threads"
  on public.threads for select
  using (true);

create policy "Public can create threads"
  on public.threads for insert
  with check (true);

create policy "Public can read drawings"
  on public.drawings for select
  using (true);

create policy "Public can create drawings"
  on public.drawings for insert
  with check (true);

-- Storage: a "public" bucket only grants public *read* by default.
-- These policies let the anon key upload (insert) into the bucket too.
create policy "Public can read drawing files"
  on storage.objects for select
  using (bucket_id = 'drawings');

create policy "Public can upload drawing files"
  on storage.objects for insert
  with check (bucket_id = 'drawings');
