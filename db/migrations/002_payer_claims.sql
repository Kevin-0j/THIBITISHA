-- Upgrade a database created from the Shadow POS schema (before payer confirmations).
-- New databases: just run db/schema.sql, which already contains all of this.

alter table venues add column if not exists code text unique check (code ~ '^[0-9]{3,6}$');
alter table venues add column if not exists template text not null default 'lodge' check (template in ('lodge', 'rent'));
alter table venues add column if not exists reward_kes integer not null default 0 check (reward_kes >= 0);

create table if not exists payer_claims (
  id               uuid primary key default gen_random_uuid(),
  venue_id         uuid not null references venues(id),
  payer_phone      text not null,
  room_number      text not null,
  amount           bigint not null check (amount > 0),
  mpesa_code       text,
  status           text not null default 'pending' check (status in ('pending', 'matched', 'mismatch', 'unlogged')),
  transaction_id   uuid unique references transactions(id),
  ussd_session_id  text unique,
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz
);

create index if not exists payer_claims_venue_created on payer_claims (venue_id, created_at desc);
create index if not exists payer_claims_pending on payer_claims (created_at) where status = 'pending';
create index if not exists payer_claims_payer on payer_claims (payer_phone, created_at desc);

alter table payer_claims enable row level security;
drop policy if exists owner_reads_payer_claims on payer_claims;
create policy owner_reads_payer_claims on payer_claims
  for select using (venue_id in (select id from venues where owner_user_id = auth.uid()));
