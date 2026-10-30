-- Private application schema; never expose these tables to the Supabase Data API.
create schema if not exists agentfc_online;
create table if not exists agentfc_online.accounts (
 id text primary key, username text not null unique, name text not null,
 password_hash text not null, locale text not null default 'fr', created_at bigint not null,
 wallet jsonb not null default '{"gems":0,"cosmetics":[],"xp":0,"claimed":[],"paidUntil":0,"preferences":{"offers":true,"matches":true,"goals":true,"chat":false}}'
);
create table if not exists agentfc_online.sessions (
 token_hash text primary key, account_id text not null references agentfc_online.accounts(id) on delete cascade,
 expires_at bigint not null, created_at bigint not null
);
create index if not exists sessions_expiry on agentfc_online.sessions(expires_at);
create table if not exists agentfc_online.leagues (
 id text primary key, code text not null unique, state jsonb not null, version integer not null default 1, updated_at bigint not null
);
create table if not exists agentfc_online.memberships (
 account_id text primary key references agentfc_online.accounts(id) on delete cascade,
 league_id text not null references agentfc_online.leagues(id)
);
alter table agentfc_online.leagues add column if not exists next_tick_at bigint default 0;
create index if not exists leagues_next_tick on agentfc_online.leagues(next_tick_at);
create index if not exists league_discovery on agentfc_online.leagues((state->>'phase'),(state->>'private'),updated_at);
create index if not exists memberships_league on agentfc_online.memberships(league_id);
create table if not exists agentfc_online.commands (
 account_id text not null references agentfc_online.accounts(id) on delete cascade,
 request_id text not null, fingerprint text not null, result jsonb not null, created_at bigint not null,
 primary key(account_id,request_id)
);
create table if not exists agentfc_online.purchases (
 transaction_id text primary key, account_id text not null references agentfc_online.accounts(id),
 product_id text not null, purchased_at bigint not null, revoked_at bigint, payload_hash text not null
);
create table if not exists agentfc_online.devices (
 account_id text not null references agentfc_online.accounts(id) on delete cascade,
 token text not null, environment text not null check(environment in ('sandbox','production')), locale text not null,
 primary key(account_id,token)
);
create table if not exists agentfc_online.push_deliveries (
 event_id text not null, token_hash text not null, delivered_at bigint, attempts integer not null default 0,
 primary key(event_id,token_hash)
);
alter table agentfc_online.push_deliveries add column if not exists last_attempt_at bigint;
create table if not exists agentfc_online.ad_intents (
 id text primary key, account_id text not null references agentfc_online.accounts(id), expires_at bigint not null,
 transaction_id text unique, rewarded_at bigint
);
create table if not exists agentfc_online.global_awards (
 cycle integer not null, account_id text not null references agentfc_online.accounts(id), rank integer not null,
 awarded_at bigint not null, primary key(cycle,account_id)
);
create table if not exists agentfc_online.support_tickets (
 id text primary key,account_id text not null references agentfc_online.accounts(id),message text not null,
 created_at bigint not null,status text not null default 'pending',response text
);
alter table agentfc_online.accounts add column if not exists recovery_hash text;
alter table agentfc_online.accounts add column if not exists state_version bigint not null default 1;
create or replace function agentfc_online.bump_account_version() returns trigger
language plpgsql set search_path='' as $$begin new.state_version=old.state_version+1;return new;end$$;
revoke all on function agentfc_online.bump_account_version() from public;
drop trigger if exists account_version on agentfc_online.accounts;
create trigger account_version before update on agentfc_online.accounts for each row execute function agentfc_online.bump_account_version();
create table if not exists agentfc_online.apple_challenges (
 id text primary key, nonce_hash text not null, expires_at bigint not null
);
create index if not exists apple_challenges_expiry on agentfc_online.apple_challenges(expires_at);
create table if not exists agentfc_online.apple_identities (
 subject text primary key, account_id text not null unique references agentfc_online.accounts(id),
 refresh_token text not null, created_at bigint not null
);
alter table agentfc_online.apple_identities add column if not exists last_auth_at bigint not null default 0;
create table if not exists agentfc_online.apple_events(id text primary key,received_at bigint not null);
create table if not exists agentfc_online.apple_revocations (
 id text primary key, refresh_token text not null, created_at bigint not null, attempts integer not null default 0
);
-- Defense in depth if this schema is later hosted in managed Postgres.
alter table agentfc_online.accounts enable row level security;
alter table agentfc_online.sessions enable row level security;
alter table agentfc_online.leagues enable row level security;
alter table agentfc_online.memberships enable row level security;
alter table agentfc_online.commands enable row level security;
alter table agentfc_online.purchases enable row level security;
alter table agentfc_online.devices enable row level security;
alter table agentfc_online.push_deliveries enable row level security;
alter table agentfc_online.ad_intents enable row level security;
alter table agentfc_online.global_awards enable row level security;
alter table agentfc_online.support_tickets enable row level security;
alter table agentfc_online.apple_challenges enable row level security;
alter table agentfc_online.apple_identities enable row level security;
alter table agentfc_online.apple_events enable row level security;
alter table agentfc_online.apple_revocations enable row level security;
revoke all on schema agentfc_online from public;
revoke all on all tables in schema agentfc_online from public;
