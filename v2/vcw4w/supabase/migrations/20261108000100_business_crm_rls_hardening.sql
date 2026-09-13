-- ============================================================================
-- 4weird Business CRM — RLS + grants + uniqueness hardening (re-assertion).
--
-- Re-asserts, idempotently, what the base + v2 CRM migrations establish:
--  * RLS enabled on all 11 CRM tables
--  * select + modify policies scoped to owner_id = auth.uid() OR org member
--    (rerunnable: DROP POLICY IF EXISTS + CREATE POLICY)
--  * grants to authenticated only; explicitly revoked from anon + public
--    (explicit authenticated grants survive the PUBLIC revoke)
--  * unique indexes on tag joins per (parent, tag) + tags per (org, name)
--  * missing FK indexes for columns used in scoped deletes
--
-- Rerunnable: ENABLE RLS / DROP+CREATE POLICY / GRANT+REVOKE /
-- CREATE INDEX IF NOT EXISTS. No ADD COLUMN here (columns live in the
-- base + v2 + follow-up CRM files). NEVER touches coin tables.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. RLS on all 11 CRM tables (idempotent)
-- --------------------------------------------------------------------------

alter table public.crm_companies enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.crm_deals enable row level security;
alter table public.crm_activities enable row level security;
alter table public.crm_invoices enable row level security;
alter table public.crm_invoice_items enable row level security;
alter table public.crm_tags enable row level security;
alter table public.crm_company_tags enable row level security;
alter table public.crm_contact_tags enable row level security;
alter table public.crm_deal_tags enable row level security;
alter table public.crm_notes enable row level security;

-- --------------------------------------------------------------------------
-- 2. Policies — fail-closed: owner OR org member (via public.org_members).
-- --------------------------------------------------------------------------

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
-- 3. Grants — authenticated only; anon + public explicitly revoked.
-- --------------------------------------------------------------------------

grant select, insert, update, delete on public.crm_companies to authenticated;
grant select, insert, update, delete on public.crm_contacts to authenticated;
grant select, insert, update, delete on public.crm_deals to authenticated;
grant select, insert, update, delete on public.crm_activities to authenticated;
grant select, insert, update, delete on public.crm_invoices to authenticated;
grant select, insert, update, delete on public.crm_invoice_items to authenticated;
grant select, insert, update, delete on public.crm_tags to authenticated;
grant select, insert, update, delete on public.crm_company_tags to authenticated;
grant select, insert, update, delete on public.crm_contact_tags to authenticated;
grant select, insert, update, delete on public.crm_deal_tags to authenticated;
grant select, insert, update, delete on public.crm_notes to authenticated;

revoke all on public.crm_companies from anon, public;
revoke all on public.crm_contacts from anon, public;
revoke all on public.crm_deals from anon, public;
revoke all on public.crm_activities from anon, public;
revoke all on public.crm_invoices from anon, public;
revoke all on public.crm_invoice_items from anon, public;
revoke all on public.crm_tags from anon, public;
revoke all on public.crm_company_tags from anon, public;
revoke all on public.crm_contact_tags from anon, public;
revoke all on public.crm_deal_tags from anon, public;
revoke all on public.crm_notes from anon, public;

-- --------------------------------------------------------------------------
-- 4. Unique indexes — one tag link per (parent, tag); tag names per org.
-- --------------------------------------------------------------------------

create unique index if not exists idx_crm_tags_org_name_unique
  on public.crm_tags (org_id, name);
create unique index if not exists idx_crm_company_tags_unique
  on public.crm_company_tags (company_id, tag_id);
create unique index if not exists idx_crm_contact_tags_unique
  on public.crm_contact_tags (contact_id, tag_id);
create unique index if not exists idx_crm_deal_tags_unique
  on public.crm_deal_tags (deal_id, tag_id);

-- --------------------------------------------------------------------------
-- 5. Missing FK indexes for columns used in scoped deletes.
-- --------------------------------------------------------------------------

create index if not exists idx_crm_deals_contact on public.crm_deals (contact_id);
create index if not exists idx_crm_activities_contact on public.crm_activities (contact_id);
create index if not exists idx_crm_activities_company on public.crm_activities (company_id);
create index if not exists idx_crm_invoices_company on public.crm_invoices (company_id);
create index if not exists idx_crm_invoices_contact on public.crm_invoices (contact_id);
