-- Phase 2 schema for Supabase (Postgres). Paste into the Supabase SQL editor.
-- Names are lowercase snake_case so you never have to quote them ("Shift_Liabilities" would need quotes forever).
-- Money is stored as whole shillings in bigint: no floating point, no rounding surprises.

create extension if not exists pgcrypto;

-- A bar, motel, or both. One row per paying site.
create table venues (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,                  -- shown on the USSD main menu
  owner_user_id   uuid references auth.users(id), -- the absentee owner who logs into the dashboard
  owner_phone     text not null,                  -- E.164, e.g. +254711000000; gets SMS alerts
  plan            text not null default 'standard'
                  check (plan in ('small', 'standard', 'plus', 'site')),  -- see UNIT_ECONOMICS.md
  county          text,
  paid_until      date,                           -- Ksh 100/day pass: block USSD logging once this lapses
  created_at      timestamptz not null default now()
);

-- Who may dial in: managers and bartenders log cash, housekeepers report rooms used, owners view.
-- The USSD webhook resolves phoneNumber -> staff -> venue; unknown numbers are refused.
create table staff (
  id              uuid primary key default gen_random_uuid(),
  venue_id        uuid not null references venues(id),
  phone_number    text not null unique,           -- E.164, exactly as Africa's Talking sends it
  full_name       text not null,
  role            text not null check (role in ('manager', 'bartender', 'housekeeper', 'owner')),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- A shift is the unit of accountability: whoever holds the open shift owes the cash logged in it.
create table shifts (
  id              uuid primary key default gen_random_uuid(),
  venue_id        uuid not null references venues(id),
  staff_id        uuid not null references staff(id),
  opened_at       timestamptz not null default now(),
  closed_at       timestamptz,
  opening_float   bigint not null default 0 check (opening_float >= 0),
  declared_cash   bigint check (declared_cash >= 0),  -- what the manager hands over at close
  status          text not null default 'open' check (status in ('open', 'closed', 'disputed'))
);

-- One open shift per person at a time.
create unique index shifts_one_open_per_staff on shifts (staff_id) where closed_at is null;
create index shifts_venue_opened on shifts (venue_id, opened_at desc);

-- Append-only ledger. Never update or delete a row: a mistake is fixed with a 'void' row that
-- points at the original. This is what makes the ledger trustworthy to owners and, later, lenders.
create table transactions (
  id                    uuid primary key default gen_random_uuid(),
  venue_id              uuid not null references venues(id),
  shift_id              uuid not null references shifts(id),
  staff_id              uuid not null references staff(id),
  type                  text not null check (type in ('room_cash', 'bar_tab', 'void')),
  amount                bigint not null check (amount > 0),
  room_number           text,
  voids_transaction_id  uuid references transactions(id),
  channel               text not null default 'ussd',
  ussd_session_id       text unique,             -- idempotency: an AT retry cannot double-log
  phone_number          text not null,           -- raw caller number, kept for audit
  created_at            timestamptz not null default now(),
  check (type <> 'room_cash' or room_number is not null),
  check ((type = 'void') = (voids_transaction_id is not null))
);

create index transactions_shift on transactions (shift_id);
create index transactions_venue_created on transactions (venue_id, created_at desc);

create or replace function forbid_ledger_edits() returns trigger language plpgsql as $$
begin
  raise exception 'transactions is append-only; insert a void instead';
end $$;

create trigger transactions_append_only
  before update or delete on transactions
  for each row execute function forbid_ledger_edits();

-- Housekeeping cross-check: rooms the cleaner says were slept in, compared with room payments logged.
create table housekeeping_reports (
  id               uuid primary key default gen_random_uuid(),
  venue_id         uuid not null references venues(id),
  staff_id         uuid not null references staff(id),
  rooms_used       integer not null check (rooms_used >= 0),
  ussd_session_id  text unique,
  created_at       timestamptz not null default now()
);

create index housekeeping_venue_created on housekeeping_reports (venue_id, created_at desc);

-- Shift liability is computed, not stored, so it can never drift from the ledger.
-- If it ever gets slow, add a running-total column on shifts maintained by an insert trigger.
create or replace view shift_liabilities as
select
  s.id                                            as shift_id,
  s.venue_id,
  s.staff_id,
  s.opened_at,
  s.closed_at,
  s.status,
  s.opening_float,
  coalesce(sum(case when t.type = 'void' then -t.amount else t.amount end), 0)        as logged_cash,
  s.opening_float
    + coalesce(sum(case when t.type = 'void' then -t.amount else t.amount end), 0)    as cash_liability,
  s.declared_cash,
  s.declared_cash - (s.opening_float
    + coalesce(sum(case when t.type = 'void' then -t.amount else t.amount end), 0))   as variance  -- negative = short
from shifts s
left join transactions t on t.shift_id = s.id
group by s.id;

-- Row Level Security: owners read only their own venues. The USSD server uses the service role key,
-- which bypasses RLS, so it can write on behalf of staff who never log in.
alter table venues       enable row level security;
alter table staff        enable row level security;
alter table shifts       enable row level security;
alter table transactions enable row level security;
alter table housekeeping_reports enable row level security;

create policy owner_reads_venue on venues
  for select using (owner_user_id = auth.uid());
create policy owner_reads_staff on staff
  for select using (venue_id in (select id from venues where owner_user_id = auth.uid()));
create policy owner_reads_shifts on shifts
  for select using (venue_id in (select id from venues where owner_user_id = auth.uid()));
create policy owner_reads_transactions on transactions
  for select using (venue_id in (select id from venues where owner_user_id = auth.uid()));
create policy owner_reads_housekeeping on housekeeping_reports
  for select using (venue_id in (select id from venues where owner_user_id = auth.uid()));

-- Make the view respect the RLS of the tables underneath it (Postgres 15+, which Supabase runs).
alter view shift_liabilities set (security_invoker = true);
