-- Tabla subscriptions: mirror local del estado de Stripe.
-- Aplicada via MCP.

create table public.subscriptions (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text,                                  -- trialing|active|past_due|canceled|incomplete
  plan text check (plan in ('starter','pro','business')),
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  updated_at timestamptz default now()
);

create index idx_subscriptions_customer on public.subscriptions(stripe_customer_id);
create index idx_subscriptions_subscription on public.subscriptions(stripe_subscription_id);

alter table public.subscriptions enable row level security;

create policy sub_member_read on public.subscriptions for select to authenticated
  using (org_id = any(public.auth_org_ids()));
-- writes únicamente via service_role (webhook + checkout endpoint)
