-- Kids Mode preference + age-rating policy notes.
--
-- kids_mode is a parental-control FLAG only: it hides Adults-rated games and
-- adds a 13+ date-of-birth check to Teens games. It stores no birth date and
-- no age — date of birth entered in an age gate is checked on-device and
-- never sent to any API or table (see lib/age-gate.ts).
alter table public.account_settings
  add column if not exists kids_mode boolean not null default false;
