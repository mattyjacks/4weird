-- ============================================================================
-- 4weird Business CRM v2 — tags, notes, activity timestamps
--
-- Adds (all scoped to public.orgs):
--  * crm_tags, crm_company_tags, crm_contact_tags, crm_deal_tags, crm_notes
--
-- Extends (ADD COLUMN IF NOT EXISTS only):
--  * crm_deals: lost_reason, last_activity_at
--    (expected_close already exists — see 20261104000000_business_crm.sql;
--    lost_reason may already exist via 20261105000000_business_crm_lost_reason.sql,
--    in which case its ADD COLUMN IF NOT EXISTS is a no-op)
--  * crm_contacts: last_contacted_at
--  * crm_invoices: paid_at, payment_ref
--
-- Rerunnable: CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS /
-- DROP POLICY IF EXISTS + CREATE POLICY / DROP TRIGGER IF EXISTS /
-- ADD COLUMN IF NOT EXISTS.
-- NEVER touches coin tables (no coin_ledger / coin_lots / coin_spends here).
-- ============================================================================

-- Ensure the shared updated_at helper exists (same one the base CRM migration uses).
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --------------------------------------------------------------------------
-- 1. Tables
-- --------------------------------------------------------------------------

create table if not exists public.crm_tags (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(name) between 1 and 60),
  color text null check (color is null or char_length(color) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_company_tags (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  company_id uuid not null references public.crm_companies(id) on delete cascade,
  tag_id uuid not null references public.crm_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_contact_tags (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  tag_id uuid not null references public.crm_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_deal_tags (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  deal_id uuid not null references public.crm_deals(id) on delete cascade,
  tag_id uuid not null references public.crm_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  company_id uuid null references public.crm_companies(id) on delete cascade,
  contact_id uuid null references public.crm_contacts(id) on delete cascade,
  deal_id uuid null references public.crm_deals(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- 2. New columns on base CRM tables (ADD COLUMN IF NOT EXISTS only)
-- --------------------------------------------------------------------------

alter table public.crm_deals add column if not exists lost_reason text
  check (lost_reason is null or char_length(lost_reason) <= 500);
alter table public.crm_deals add column if not exists last_activity_at timestamptz null;
alter table public.crm_contacts add column if not exists last_contacted_at timestamptz null;
alter table public.crm_invoices add column if not exists paid_at timestamptz null;
alter table public.crm_invoices add column if not exists payment_ref text
  check (payment_ref is null or char_length(payment_ref) <= 120);

-- --------------------------------------------------------------------------
-- 3. Indexes
-- --------------------------------------------------------------------------

create index if not exists idx_crm_tags_org on public.crm_tags (org_id);
create unique index if not exists idx_crm_tags_org_name_unique on public.crm_tags (org_id, name);
create index if not exists idx_crm_company_tags_org on public.crm_company_tags (org_id);
create index if not exists idx_crm_company_tags_company on public.crm_company_tags (company_id);
create index if not exists idx_crm_company_tags_tag on public.crm_company_tags (tag_id);
create unique index if not exists idx_crm_company_tags_unique on public.crm_company_tags (company_id, tag_id);
create index if not exists idx_crm_contact_tags_org on public.crm_contact_tags (org_id);
create index if not exists idx_crm_contact_tags_contact on public.crm_contact_tags (contact_id);
create index if not exists idx_crm_contact_tags_tag on public.crm_contact_tags (tag_id);
create unique index if not exists idx_crm_contact_tags_unique on public.crm_contact_tags (contact_id, tag_id);
create index if not exists idx_crm_deal_tags_org on public.crm_deal_tags (org_id);
create index if not exists idx_crm_deal_tags_deal on public.crm_deal_tags (deal_id);
create index if not exists idx_crm_deal_tags_tag on public.crm_deal_tags (tag_id);
create unique index if not exists idx_crm_deal_tags_unique on public.crm_deal_tags (deal_id, tag_id);
create index if not exists idx_crm_notes_org on public.crm_notes (org_id);
create index if not exists idx_crm_notes_company on public.crm_notes (company_id);
create index if not exists idx_crm_notes_contact on public.crm_notes (contact_id);
create index if not exists idx_crm_notes_deal on public.crm_notes (deal_id);
create index if not exists idx_crm_deals_last_activity on public.crm_deals (last_activity_at);
create index if not exists idx_crm_contacts_last_contacted on public.crm_contacts (last_contacted_at);
create index if not exists idx_crm_invoices_paid_at on public.crm_invoices (paid_at);

-- --------------------------------------------------------------------------
-- 4. updated_at triggers
-- --------------------------------------------------------------------------

drop trigger if exists trg_crm_tags_updated on public.crm_tags;
create trigger trg_crm_tags_updated before update on public.crm_tags
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_crm_company_tags_updated on public.crm_company_tags;
create trigger trg_crm_company_tags_updated before update on public.crm_company_tags
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_crm_contact_tags_updated on public.crm_contact_tags;
create trigger trg_crm_contact_tags_updated before update on public.crm_contact_tags
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_crm_deal_tags_updated on public.crm_deal_tags;
create trigger trg_crm_deal_tags_updated before update on public.crm_deal_tags
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_crm_notes_updated on public.crm_notes;
create trigger trg_crm_notes_updated before update on public.crm_notes
  for each row execute function public.handle_updated_at();

-- --------------------------------------------------------------------------
-- 5. RLS — fail-closed: owner OR org member (via public.org_members).
-- --------------------------------------------------------------------------

alter table public.crm_tags enable row level security;
alter table public.crm_company_tags enable row level security;
alter table public.crm_contact_tags enable row level security;
alter table public.crm_deal_tags enable row level security;
alter table public.crm_notes enable row level security;

-- tags
drop policy if exists crm_tags_select on public.crm_tags;
create policy crm_tags_select on public.crm_tags
  for select to authenticated using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.org_members m
      where m.org_id = crm_tags.org_id and m.user_id = auth.uid()
    )
  );

drop policy if exists crm_tags_modify on public.crm_tags;
create policy crm_tags_modify on public.crm_tags
  for all to authenticated using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.org_members m
      where m.org_id = crm_tags.org_id and m.user_id = auth.uid()
    )
  );

-- company tags
drop policy if exists crm_company_tags_select on public.crm_company_tags;
create policy crm_company_tags_select on public.crm_company_tags
  for select to authenticated using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.org_members m
      where m.org_id = crm_company_tags.org_id and m.user_id = auth.uid()
    )
  );

drop policy if exists crm_company_tags_modify on public.crm_company_tags;
create policy crm_company_tags_modify on public.crm_company_tags
  for all to authenticated using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.org_members m
      where m.org_id = crm_company_tags.org_id and m.user_id = auth.uid()
    )
  );

-- contact tags
drop policy if exists crm_contact_tags_select on public.crm_contact_tags;
create policy crm_contact_tags_select on public.crm_contact_tags
  for select to authenticated using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.org_members m
      where m.org_id = crm_contact_tags.org_id and m.user_id = auth.uid()
    )
  );

drop policy if exists crm_contact_tags_modify on public.crm_contact_tags;
create policy crm_contact_tags_modify on public.crm_contact_tags
  for all to authenticated using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.org_members m
      where m.org_id = crm_contact_tags.org_id and m.user_id = auth.uid()
    )
  );

-- deal tags
drop policy if exists crm_deal_tags_select on public.crm_deal_tags;
create policy crm_deal_tags_select on public.crm_deal_tags
  for select to authenticated using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.org_members m
      where m.org_id = crm_deal_tags.org_id and m.user_id = auth.uid()
    )
  );

drop policy if exists crm_deal_tags_modify on public.crm_deal_tags;
create policy crm_deal_tags_modify on public.crm_deal_tags
  for all to authenticated using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.org_members m
      where m.org_id = crm_deal_tags.org_id and m.user_id = auth.uid()
    )
  );

-- notes
drop policy if exists crm_notes_select on public.crm_notes;
create policy crm_notes_select on public.crm_notes
  for select to authenticated using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.org_members m
      where m.org_id = crm_notes.org_id and m.user_id = auth.uid()
    )
  );

drop policy if exists crm_notes_modify on public.crm_notes;
create policy crm_notes_modify on public.crm_notes
  for all to authenticated using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.org_members m
      where m.org_id = crm_notes.org_id and m.user_id = auth.uid()
    )
  );

-- --------------------------------------------------------------------------
-- 6. Grants
-- --------------------------------------------------------------------------

grant select, insert, update, delete on public.crm_tags to authenticated;
grant select, insert, update, delete on public.crm_company_tags to authenticated;
grant select, insert, update, delete on public.crm_contact_tags to authenticated;
grant select, insert, update, delete on public.crm_deal_tags to authenticated;
grant select, insert, update, delete on public.crm_notes to authenticated;
