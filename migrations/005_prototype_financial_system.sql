-- Prototype financial system: payments, tax, accounting, refunds for the
-- checkout demo. Deliberately isolated from the real merchants/orders schema
-- (001-003) — this is a self-contained "what would the real Payroc/Zamp/
-- accounting integration look like" demo, not a rewrite of the real order
-- flow. Service layers (src/server/financial/*) are swappable: every table
-- here maps 1:1 to what a real processor/tax/accounting provider would need,
-- so MockPaymentService -> real Payroc etc. is a service-layer swap, not a
-- schema migration.
--
-- Every number is actually computed (tax via a jurisdiction-rate lookup,
-- accounting lines that must balance, analytics via SQL aggregation) — none
-- of this is hardcoded display text.

create table demo_customers (
  id uuid primary key default gen_random_uuid(),
  external_ref text not null unique, -- e.g. "cus_demo_10482"
  name text not null,
  email text not null,
  country text not null,
  region text not null, -- state/province
  city text not null,
  postal_code text not null,
  created_at timestamptz not null default now()
);

create table demo_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique, -- e.g. "ORD-2026-10482"
  customer_id uuid not null references demo_customers(id) on delete cascade,
  currency text not null default 'USD',
  items jsonb not null, -- [{ name, sku, quantity, unitPrice }]
  subtotal numeric(12,2) not null,
  shipping numeric(12,2) not null default 0,
  taxable_amount numeric(12,2) not null,
  tax_jurisdiction text not null,
  tax_rate numeric(6,5) not null,
  tax_amount numeric(12,2) not null,
  total numeric(12,2) not null,
  status text not null default 'pending' check (status in ('pending','paid','refunded','partially_refunded','failed')),
  created_at timestamptz not null default now()
);

create table demo_payments (
  id uuid primary key default gen_random_uuid(),
  payment_ref text not null unique, -- e.g. "pi_demo_7H29K4X"
  order_id uuid not null references demo_orders(id) on delete cascade,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  status text not null default 'processing' check (status in ('processing','succeeded','failed')),
  payment_method_brand text,
  payment_method_last4 text,
  authorization_ref text,
  transaction_ref text,
  processor_response text,
  risk_status text,
  settlement_status text not null default 'pending' check (settlement_status in ('pending','settled')),
  refunded_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_demo_payments_order on demo_payments(order_id);
create index idx_demo_payments_created on demo_payments(created_at desc);

-- Step-by-step audit trail the mock PaymentService actually writes as it
-- works — the frontend animates through these real rows, not a fake timer.
create table demo_payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references demo_payments(id) on delete cascade,
  step text not null check (step in (
    'creating_payment','validating_customer','calculating_tax','authorizing_payment',
    'capturing_payment','creating_transaction','updating_accounting','payment_successful','payment_failed'
  )),
  detail jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index idx_demo_payment_events_payment on demo_payment_events(payment_id);

create table demo_refunds (
  id uuid primary key default gen_random_uuid(),
  refund_ref text not null unique, -- e.g. "re_demo_291847"
  payment_id uuid not null references demo_payments(id) on delete cascade,
  amount numeric(12,2) not null,
  reason text,
  status text not null default 'succeeded' check (status in ('succeeded','failed')),
  created_at timestamptz not null default now()
);
create index idx_demo_refunds_payment on demo_refunds(payment_id);

-- Double-entry journal. accounting_lines must sum to zero (debits positive,
-- credits negative) — postJournalEntry() asserts this before committing.
create table demo_accounting_entries (
  id uuid primary key default gen_random_uuid(),
  entry_number text not null unique, -- e.g. "JE-2026-004821"
  entry_date date not null default current_date,
  reference text not null, -- order_number or refund_ref
  description text not null,
  created_at timestamptz not null default now()
);

create table demo_accounting_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references demo_accounting_entries(id) on delete cascade,
  account_name text not null, -- e.g. "Cash / Payment Processor Receivable"
  debit numeric(12,2) not null default 0,
  credit numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create index idx_demo_accounting_lines_entry on demo_accounting_lines(entry_id);

-- Public demo, no user-scoping — same convention as the other /api/demo/*
-- catalog routes (products, etc.), which are also unauthenticated. RLS is
-- still enabled + forced for consistency with every other table in this
-- schema; policy is read/write-all since there is no per-user ownership here.
alter table demo_customers enable row level security;
alter table demo_customers force row level security;
create policy demo_customers_all on demo_customers for all using (true) with check (true);

alter table demo_orders enable row level security;
alter table demo_orders force row level security;
create policy demo_orders_all on demo_orders for all using (true) with check (true);

alter table demo_payments enable row level security;
alter table demo_payments force row level security;
create policy demo_payments_all on demo_payments for all using (true) with check (true);

alter table demo_payment_events enable row level security;
alter table demo_payment_events force row level security;
create policy demo_payment_events_all on demo_payment_events for all using (true) with check (true);

alter table demo_refunds enable row level security;
alter table demo_refunds force row level security;
create policy demo_refunds_all on demo_refunds for all using (true) with check (true);

alter table demo_accounting_entries enable row level security;
alter table demo_accounting_entries force row level security;
create policy demo_accounting_entries_all on demo_accounting_entries for all using (true) with check (true);

alter table demo_accounting_lines enable row level security;
alter table demo_accounting_lines force row level security;
create policy demo_accounting_lines_all on demo_accounting_lines for all using (true) with check (true);
