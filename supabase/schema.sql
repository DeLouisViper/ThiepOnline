-- =====================================================================
-- Thiệp cưới Thanh Hải & Ánh Minh — Supabase setup
-- Run this WHOLE file once in: Supabase Dashboard > SQL Editor > New query > Run.
-- It is safe to re-run (idempotent).
--
-- Security model (summary — see README for the long version):
--   * Guests (role "anon") can: INSERT a wish (validated by constraints + a trigger),
--     SELECT only wishes with status = 'approved', SELECT gallery photos, and read the
--     view public_wedding_settings. Nothing else.
--   * Administrators (role "authenticated" AND listed in public.admins) can do everything.
--   * A logged-in user who is NOT in public.admins has exactly the same rights as a guest.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Admin allow-list
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- No policies on purpose: nobody can read/write this table through the API.
-- It is only consulted through is_admin() below. Add admins from the SQL Editor.
revoke all on public.admins from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. wedding_settings (single row, id = 1)
-- ---------------------------------------------------------------------
create table if not exists public.wedding_settings (
  id                    smallint primary key default 1 check (id = 1),

  -- music
  music_enabled         boolean not null default false,
  music_url             text check (music_url is null or char_length(music_url) <= 1000),

  -- animation / moderation / guest uploads
  petals_enabled        boolean not null default true,
  require_approval      boolean not null default true,   -- safe default: moderate first
  allow_guest_photos    boolean not null default false,  -- safe default: text-only wishes

  -- groom gift QR
  groom_qr_path         text check (groom_qr_path is null or char_length(groom_qr_path) <= 300),
  groom_bank_name       text check (groom_bank_name is null or char_length(groom_bank_name) <= 80),
  groom_account_number  text check (groom_account_number is null or char_length(groom_account_number) <= 40),
  groom_account_holder  text check (groom_account_holder is null or char_length(groom_account_holder) <= 80),
  groom_show_bank       boolean not null default false,

  -- bride gift QR
  bride_qr_path         text check (bride_qr_path is null or char_length(bride_qr_path) <= 300),
  bride_bank_name       text check (bride_bank_name is null or char_length(bride_bank_name) <= 80),
  bride_account_number  text check (bride_account_number is null or char_length(bride_account_number) <= 40),
  bride_account_holder  text check (bride_account_holder is null or char_length(bride_account_holder) <= 80),
  bride_show_bank       boolean not null default false,

  updated_at            timestamptz not null default now()
);

insert into public.wedding_settings (id) values (1) on conflict (id) do nothing;

-- editable invitation text (names, families, venue, timeline…); JSON, size-capped
alter table public.wedding_settings add column if not exists content jsonb;
alter table public.wedding_settings drop constraint if exists wedding_settings_content_size;
alter table public.wedding_settings
  add constraint wedding_settings_content_size
  check (content is null or octet_length(content::text) <= 20000);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists trg_settings_touch on public.wedding_settings;
create trigger trg_settings_touch before update on public.wedding_settings
  for each row execute function public.touch_updated_at();

alter table public.wedding_settings enable row level security;
revoke all on public.wedding_settings from anon, authenticated;
grant select, insert, update on public.wedding_settings to authenticated;

drop policy if exists settings_admin_all on public.wedding_settings;
create policy settings_admin_all on public.wedding_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Public, read-only projection of the settings.
-- Bank fields are returned ONLY when the admin switched "show bank details" on.
-- (The view runs with its owner's rights on purpose — that is how guests can read
--  this projection without being able to read the table itself.)
create or replace view public.public_wedding_settings as
select
  music_enabled,
  music_url,
  petals_enabled,
  require_approval,
  allow_guest_photos,
  groom_qr_path,
  case when groom_show_bank then groom_bank_name end      as groom_bank_name,
  case when groom_show_bank then groom_account_number end as groom_account_number,
  case when groom_show_bank then groom_account_holder end as groom_account_holder,
  bride_qr_path,
  case when bride_show_bank then bride_bank_name end      as bride_bank_name,
  case when bride_show_bank then bride_account_number end as bride_account_number,
  case when bride_show_bank then bride_account_holder end as bride_account_holder,
  content
from public.wedding_settings
where id = 1;

revoke all on public.public_wedding_settings from anon, authenticated;
grant select on public.public_wedding_settings to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. wishes
-- ---------------------------------------------------------------------
create table if not exists public.wishes (
  id          uuid primary key default gen_random_uuid(),
  guest_name  text not null,
  message     text not null,
  photo_path  text,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  created_at  timestamptz not null default now(),
  constraint wishes_name_len  check (char_length(guest_name) between 1 and 40),
  constraint wishes_msg_len   check (char_length(message)    between 1 and 300),
  constraint wishes_photo_fmt check (
    photo_path is null or
    photo_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  )
);
create index if not exists wishes_status_created_idx on public.wishes (status, created_at desc);
create index if not exists wishes_created_idx        on public.wishes (created_at desc);

-- Private table used only by the trigger below for rate limiting (stores a salted hash, never the IP).
create table if not exists public.wish_rate_log (
  id         bigint generated always as identity primary key,
  ip_hash    text not null,
  created_at timestamptz not null default now()
);
create index if not exists wish_rate_log_ip_idx on public.wish_rate_log (ip_hash, created_at desc);
create index if not exists wish_rate_log_time_idx on public.wish_rate_log (created_at desc);
alter table public.wish_rate_log enable row level security;
revoke all on public.wish_rate_log from anon, authenticated;

-- BEFORE INSERT: trim, force the moderation status server-side, enforce the guest-photo
-- switch and rate-limit. The browser can NEVER choose its own status.
create or replace function public.wishes_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_require boolean;
  v_photos  boolean;
  v_ip      text := '';
  v_hash    text;
  v_recent  integer;
begin
  new.guest_name := btrim(new.guest_name);
  new.message    := btrim(new.message);

  select s.require_approval, s.allow_guest_photos
    into v_require, v_photos
    from public.wedding_settings s where s.id = 1;
  v_require := coalesce(v_require, true);
  v_photos  := coalesce(v_photos, false);

  new.status := case when v_require then 'pending' else 'approved' end;

  if new.photo_path is not null and not v_photos then
    raise exception 'photos_disabled' using errcode = 'P0001';
  end if;

  -- Rate limiting. PostgREST exposes the caller's IP via the x-forwarded-for header.
  begin
    v_ip := btrim(split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1));
  exception when others then
    v_ip := '';
  end;

  delete from public.wish_rate_log where created_at < now() - interval '1 day';

  -- global flood guard: max 30 wishes per minute for the whole site
  select count(*) into v_recent from public.wish_rate_log where created_at > now() - interval '1 minute';
  if v_recent >= 30 then
    raise exception 'rate_limit' using errcode = 'P0001';
  end if;

  -- per-visitor guard: max 5 wishes per 10 minutes (only when an IP is known)
  if v_ip <> '' then
    v_hash := md5(v_ip || ':thiep-cuoi-hai-minh');
    select count(*) into v_recent
      from public.wish_rate_log
     where ip_hash = v_hash and created_at > now() - interval '10 minutes';
    if v_recent >= 5 then
      raise exception 'rate_limit' using errcode = 'P0001';
    end if;
    insert into public.wish_rate_log (ip_hash) values (v_hash);
  else
    insert into public.wish_rate_log (ip_hash) values ('unknown');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_wishes_before_insert on public.wishes;
create trigger trg_wishes_before_insert
  before insert on public.wishes
  for each row execute function public.wishes_before_insert();

alter table public.wishes enable row level security;
revoke all on public.wishes from anon, authenticated;
grant select on public.wishes to anon;
grant insert (guest_name, message, photo_path) on public.wishes to anon;  -- guests may only fill these columns
grant select, insert, update, delete on public.wishes to authenticated;

drop policy if exists wishes_public_read   on public.wishes;
drop policy if exists wishes_admin_read    on public.wishes;
drop policy if exists wishes_public_insert on public.wishes;
drop policy if exists wishes_admin_update  on public.wishes;
drop policy if exists wishes_admin_delete  on public.wishes;

-- guests: only approved wishes
create policy wishes_public_read on public.wishes
  for select to anon, authenticated
  using (status = 'approved');
-- admins: everything
create policy wishes_admin_read on public.wishes
  for select to authenticated
  using (public.is_admin());
-- anyone: submit (status is overwritten by the trigger; length/format by constraints)
create policy wishes_public_insert on public.wishes
  for insert to anon, authenticated
  with check (status in ('pending', 'approved'));
-- only admins: change or delete
create policy wishes_admin_update on public.wishes
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy wishes_admin_delete on public.wishes
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- 4. gallery_photos
-- ---------------------------------------------------------------------
create table if not exists public.gallery_photos (
  id           uuid primary key default gen_random_uuid(),
  storage_path text not null unique check (char_length(storage_path) <= 300),
  caption      text check (caption is null or char_length(caption) <= 200),
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists gallery_photos_order_idx on public.gallery_photos (sort_order, created_at);

alter table public.gallery_photos enable row level security;
revoke all on public.gallery_photos from anon, authenticated;
grant select on public.gallery_photos to anon;
grant select, insert, update, delete on public.gallery_photos to authenticated;

drop policy if exists gallery_public_read on public.gallery_photos;
drop policy if exists gallery_admin_all   on public.gallery_photos;
create policy gallery_public_read on public.gallery_photos
  for select to anon, authenticated using (true);
create policy gallery_admin_all on public.gallery_photos
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 5. Storage buckets + policies
--    wedding-media : admin uploads (gallery, QR codes, music). Public read.
--    guest-photos  : optional photos attached to wishes. Public read, guests may
--                    ONLY insert new files (no overwrite, no delete) and only while
--                    the admin has switched "allow guest photos" on.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('wedding-media', 'wedding-media', true, 10485760,
    array['image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','audio/ogg','audio/wav','audio/x-m4a']),
  ('guest-photos', 'guest-photos', true, 2097152,
    array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.guest_photos_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select s.allow_guest_photos from public.wedding_settings s where s.id = 1), false);
$$;
revoke all on function public.guest_photos_enabled() from public;
grant execute on function public.guest_photos_enabled() to anon, authenticated;

drop policy if exists "wedding-media admin read"   on storage.objects;
drop policy if exists "wedding-media admin insert" on storage.objects;
drop policy if exists "wedding-media admin update" on storage.objects;
drop policy if exists "wedding-media admin delete" on storage.objects;
drop policy if exists "guest-photos guest insert"  on storage.objects;
drop policy if exists "guest-photos admin read"    on storage.objects;
drop policy if exists "guest-photos admin delete"  on storage.objects;

create policy "wedding-media admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'wedding-media' and public.is_admin());
create policy "wedding-media admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'wedding-media' and public.is_admin());
create policy "wedding-media admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'wedding-media' and public.is_admin())
  with check (bucket_id = 'wedding-media' and public.is_admin());
create policy "wedding-media admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'wedding-media' and public.is_admin());

create policy "guest-photos guest insert" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'guest-photos'
    and public.guest_photos_enabled()
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  );
create policy "guest-photos admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'guest-photos' and public.is_admin());
create policy "guest-photos admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'guest-photos' and public.is_admin());

-- ---------------------------------------------------------------------
-- 6. AFTER you created your admin user in Authentication > Users, run (once):
--
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'YOUR-ADMIN-EMAIL@example.com';
--
-- (Replace the e-mail. Add more admins the same way. Remove one with: delete from public.admins where user_id = '...';)
-- ---------------------------------------------------------------------
