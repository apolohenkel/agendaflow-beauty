-- Tablas WhatsApp + recordatorios. Aplicada via MCP.

create extension if not exists pgcrypto;

create table public.whatsapp_accounts (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  phone_number_id text unique not null,
  display_phone text,
  access_token text not null,
  verify_token text not null,
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  customer_phone text not null,
  client_id uuid references public.clients(id) on delete set null,
  state jsonb default '{}',
  last_message_at timestamptz default now(),
  unique (org_id, customer_phone)
);
create index idx_wa_conv_org_phone on public.whatsapp_conversations(org_id, customer_phone);
create index idx_wa_conv_last on public.whatsapp_conversations(last_message_at);

create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.whatsapp_conversations(id) on delete cascade,
  direction text check (direction in ('in','out')),
  body text,
  meta jsonb,
  created_at timestamptz default now()
);
create index idx_wa_msg_conv on public.whatsapp_messages(conversation_id, created_at);

alter table public.appointments add column if not exists reminder_24h_sent_at timestamptz;
alter table public.appointments add column if not exists reminder_2h_sent_at timestamptz;

alter table public.whatsapp_accounts enable row level security;
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;

create policy wa_acc_member on public.whatsapp_accounts for all to authenticated
  using (org_id = any(public.auth_org_ids()))
  with check (org_id = any(public.auth_org_ids()));

create policy wa_conv_member on public.whatsapp_conversations for select to authenticated
  using (org_id = any(public.auth_org_ids()));

create policy wa_msg_member on public.whatsapp_messages for select to authenticated
  using (conversation_id in (
    select id from public.whatsapp_conversations where org_id = any(public.auth_org_ids())
  ));
