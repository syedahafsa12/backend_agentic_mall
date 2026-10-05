-- Merchant-managed discovery keywords. A keyword only ever helps the Agent
-- discover a merchant's existing products for a query that already implies
-- one of that merchant's real product types (resolved_type, computed
-- server-side from the same deterministic synonym map search already uses)
-- — it never creates a new product-type match on its own. See
-- src/server/merchants/keywords.ts.

create table merchant_keywords (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  keyword text not null,
  resolved_type text, -- null if the phrase doesn't resolve to any known product type (kept for display only, inert in search)
  created_at timestamptz not null default now(),
  unique (merchant_id, keyword)
);
create index idx_merchant_keywords_merchant on merchant_keywords(merchant_id);

alter table merchant_keywords enable row level security;
alter table merchant_keywords force row level security;

-- Public read (the search path needs to read any authorized merchant's
-- keywords while searching on the shopper's behalf, via withPlatformScope,
-- same as merchants/products/auctions) + owner-only write.
create policy merchant_keywords_read_all on merchant_keywords for select using (true);
create policy merchant_keywords_owner_write on merchant_keywords for insert with check (
  current_setting('app.bypass_rls', true) = 'true'
  or exists (select 1 from merchants m where m.id = merchant_keywords.merchant_id and m.owner_id::text = current_setting('app.current_user_id', true))
);
create policy merchant_keywords_owner_update on merchant_keywords for update using (
  current_setting('app.bypass_rls', true) = 'true'
  or exists (select 1 from merchants m where m.id = merchant_keywords.merchant_id and m.owner_id::text = current_setting('app.current_user_id', true))
);
create policy merchant_keywords_owner_delete on merchant_keywords for delete using (
  current_setting('app.bypass_rls', true) = 'true'
  or exists (select 1 from merchants m where m.id = merchant_keywords.merchant_id and m.owner_id::text = current_setting('app.current_user_id', true))
);
