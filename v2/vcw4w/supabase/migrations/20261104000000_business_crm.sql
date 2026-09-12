-- ============================================================================
-- 4weird Business CRM — companies, contacts, deals, activities, invoices
--
-- Adds (all scoped to public.orgs):
--  * crm_companies, crm_contacts, crm_deals, crm_activities,
--    crm_invoices, crm_invoice_items
--
-- Rerunnable: CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS /
-- DROP POLICY IF EXISTS + CREATE POLICY / DROP TRIGGER IF EXISTS.
-- NEVER touches coin tables (no coin_ledger / coin_lots / coin_spends here).
-- ============================================================================

-- Ensure the shared updated_at helper exists (same one the timer migration uses).
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

create table if not exists public.crm_companies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  domain text null check (domain is null or char_length(domain) <= 120),
  industry text null check (industry is null or char_length(industry) <= 80),
  size text null check (size is null or char_length(size) <= 40),
  website text null check (website is null or char_length(website) <= 200),
  notes text null check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  company_id uuid null references public.crm_companies(id) on delete set null,
  full_name text not null check (char_length(full_name) between 1 and 120),
  email text null check (email is null or char_length(email) <= 160),
  phone text null check (phone is null or char_length(phone) <= 40),
  title text null check (title is null or char_length(title) <= 120),
  status text not null default 'lead' check (status in ('lead', 'active', 'inactive')),
  notes text null check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_deals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  company_id uuid null references public.crm_companies(id) on delete set null,
  contact_id uuid null references public.crm_contacts(id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  value_coins bigint not null default 0 check (value_coins >= 0),
  stage text not null default 'lead' check (stage in ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  probability integer not null default 10 check (probability between 0 and 100),
  expected_close date null,
  notes text null check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  deal_id uuid null references public.crm_deals(id) on delete cascade,
  contact_id uuid null references public.crm_contacts(id) on delete cascade,
  company_id uuid null references public.crm_companies(id) on delete cascade,
  kind text not null default 'note' check (kind in ('note', 'call', 'email', 'meeting', 'task')),
  body text not null default '' check (char_length(body) <= 2000),
  due_at timestamptz null,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  company_id uuid null references public.crm_companies(id) on delete set null,
  contact_id uuid null references public.crm_contacts(id) on delete set null,
  number text not null default '' check (char_length(number) <= 60),
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'void')),
  subtotal_coins bigint not null default 0 check (subtotal_coins >= 0),
  tax_coins bigint not null default 0 check (tax_coins >= 0),
  total_coins bigint not null default 0 check (total_coins >= 0),
  due_date date null,
  notes text null check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_invoice_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  invoice_id uuid not null references public.crm_invoices(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 200),
  qty numeric not null default 1 check (qty >= 0),
  unit_coins bigint not null default 0 check (unit_coins >= 0),
  line_coins bigint not null default 0 check (line_coins >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- 2. Indexes
-- --------------------------------------------------------------------------

create index if not exists idx_crm_companies_org on public.crm_companies (org_id);
create index if not exists idx_crm_contacts_org on public.crm_contacts (org_id);
create index if not exists idx_crm_contacts_status on public.crm_contacts (status);
create index if not exists idx_crm_contacts_company on public.crm_contacts (company_id);
create index if not exists idx_crm_deals_org on public.crm_deals (org_id);
create index if not exists idx_crm_deals_stage on public.crm_deals (stage);
create index if not exists idx_crm_deals_company on public.crm_deals (company_id);
create index if not exists idx_crm_activities_org on public.crm_activities (org_id);
create index if not exists idx_crm_activities_deal on public.crm_activities (deal_id);
create index if not exists idx_crm_activities_done on public.crm_activities (done);
create index if not exists idx_crm_invoices_org on public.crm_invoices (org_id);
create index if not exists idx_crm_invoices_status on public.crm_invoices (status);
create index if not exists idx_crm_invoice_items_invoice on public.crm_invoice_items (invoice_id);
create index if not exists idx_crm_invoice_items_org on public.crm_invoice_items (org_id);

-- --------------------------------------------------------------------------
-- 3. updated_at triggers
-- --------------------------------------------------------------------------

drop trigger if exists trg_crm_companies_updated on public.crm_companies;
create trigger trg_crm_companies_updated before update on public.crm_companies
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_crm_contacts_updated on public.crm_contacts;
create trigger trg_crm_contacts_updated before update on public.crm_contacts
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_crm_deals_updated on public.crm_deals;
create trigger trg_crm_deals_updated before update on public.crm_deals
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_crm_activities_updated on public.crm_activities;
create trigger trg_crm_activities_updated before update on public.crm_activities
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_crm_invoices_updated on public.crm_invoices;
create trigger trg_crm_invoices_updated before update on public.crm_invoices
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_crm_invoice_items_updated on public.crm_invoice_items;
create trigger trg_crm_invoice_items_updated before update on public.crm_invoice_items
  for each row execute function public.handle_updated_at();

-- --------------------------------------------------------------------------
-- 4. RLS — fail-closed: owner OR org member (via public.org_members).
-- --------------------------------------------------------------------------

alter table public.crm_companies enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.crm_deals enable row level security;
alter table public.crm_activities enable row level security;
alter table public.crm_invoices enable row level security;
alter table public.crm_invoice_items enable row level security;

-- companies
drop policy if exists crm_companies_select on public.crm_companies;
create policy crm_companies_select on public.crm_companies
  for select to authenticated using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.org_members m
      where m.org_id = crm_companies.org_id and m.user_id = auth.uid()
    )
  );

drop policy if exists crm_companies_modify on public.crm_companies;
create policy crm_companies_modify on public.crm_companies
  for all to authenticated using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.org_members m
      where m.org_id = crm_companies.org_id and m.user_id = auth.uid()
    )
  );

-- contacts
drop policy if exists crm_contacts_select on public.crm_contacts;
create policy crm_contacts_select on public.crm_contacts
  for select to authenticated using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.org_members m
      where m.org_id = crm_contacts.org_id and m.user_id = auth.uid()
    )
  );

drop policy if exists crm_contacts_modify on public.crm_contacts;
create policy crm_contacts_modify on public.crm_contacts
  for all to authenticated using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.org_members m
      where m.org_id = crm_contacts.org_id and m.user_id = auth.uid()
    )
  );

-- deals
drop policy if exists crm_deals_select on public.crm_deals;
create policy crm_deals_select on public.crm_deals
  for select to authenticated using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.org_members m
      where m.org_id = crm_deals.org_id and m.user_id = auth.uid()
    )
  );

drop policy if exists crm_deals_modify on public.crm_deals;
create policy crm_deals_modify on public.crm_deals
  for all to authenticated using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.org_members m
      where m.org_id = crm_deals.org_id and m.user_id = auth.uid()
    )
  );

-- activities
drop policy if exists crm_activities_select on public.crm_activities;
create policy crm_activities_select on public.crm_activities
  for select to authenticated using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.org_members m
      where m.org_id = crm_activities.org_id and m.user_id = auth.uid()
    )
  );

drop policy if exists crm_activities_modify on public.crm_activities;
create policy crm_activities_modify on public.crm_activities
  for all to authenticated using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.org_members m
      where m.org_id = crm_activities.org_id and m.user_id = auth.uid()
    )
  );

-- invoices
drop policy if exists crm_invoices_select on public.crm_invoices;
create policy crm_invoices_select on public.crm_invoices
  for select to authenticated using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.org_members m
      where m.org_id = crm_invoices.org_id and m.user_id = auth.uid()
    )
  );

drop policy if exists crm_invoices_modify on public.crm_invoices;
create policy crm_invoices_modify on public.crm_invoices
  for all to authenticated using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.org_members m
      where m.org_id = crm_invoices.org_id and m.user_id = auth.uid()
    )
  );

-- invoice items
drop policy if exists crm_invoice_items_select on public.crm_invoice_items;
create policy crm_invoice_items_select on public.crm_invoice_items
  for select to authenticated using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.org_members m
      where m.org_id = crm_invoice_items.org_id and m.user_id = auth.uid()
    )
  );

drop policy if exists crm_invoice_items_modify on public.crm_invoice_items;
create policy crm_invoice_items_modify on public.crm_invoice_items
  for all to authenticated using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.org_members m
      where m.org_id = crm_invoice_items.org_id and m.user_id = auth.uid()
    )
  );

-- --------------------------------------------------------------------------
-- 5. Grants
-- --------------------------------------------------------------------------

grant select, insert, update, delete on public.crm_companies to authenticated;
grant select, insert, update, delete on public.crm_contacts to authenticated;
grant select, insert, update, delete on public.crm_deals to authenticated;
grant select, insert, update, delete on public.crm_activities to authenticated;
grant select, insert, update, delete on public.crm_invoices to authenticated;
grant select, insert, update, delete on public.crm_invoice_items to authenticated;
