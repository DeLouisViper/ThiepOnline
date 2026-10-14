-- =====================================================================
-- MIGRATION: editable invitation content (names, families, venue, timeline…)
-- Run ONCE in Supabase > SQL Editor if you already ran schema.sql before.
-- (Fresh installs already get this from schema.sql. Safe to re-run.)
-- =====================================================================

alter table public.wedding_settings add column if not exists content jsonb;

alter table public.wedding_settings drop constraint if exists wedding_settings_content_size;
alter table public.wedding_settings
  add constraint wedding_settings_content_size
  check (content is null or octet_length(content::text) <= 20000);

-- Same view as before, with "content" appended as the LAST column.
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
