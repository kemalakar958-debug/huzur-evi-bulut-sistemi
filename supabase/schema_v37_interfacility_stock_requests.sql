-- v37 Kurumlar Arası Stok İstek / Transfer SQL

create table if not exists interfacility_stock_requests (
  id uuid primary key default uuid_generate_v4(),

  requesting_facility_id uuid not null references facilities(id) on delete cascade,
  requesting_facility_name text,

  sending_facility_id uuid references facilities(id) on delete set null,
  sending_facility_name text,

  product_name text not null,
  category text,
  requested_qty numeric not null default 1,

  priority text default 'Normal',

  status text default 'Bekliyor',
  approval_status text default 'Bekliyor',

  note text,

  approved_by uuid references auth.users(id),
  approved_at timestamptz,

  sent_at timestamptz,

  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists interfacility_stock_movements (
  id uuid primary key default uuid_generate_v4(),

  request_id uuid references interfacility_stock_requests(id) on delete set null,

  product_name text not null,
  category text,
  qty numeric not null,

  from_facility_id uuid references facilities(id) on delete set null,
  from_facility_name text,

  to_facility_id uuid references facilities(id) on delete set null,
  to_facility_name text,

  source_before_stock numeric,
  source_after_stock numeric,

  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table interfacility_stock_requests enable row level security;
alter table interfacility_stock_movements enable row level security;

drop policy if exists "interfacility requests read" on interfacility_stock_requests;
create policy "interfacility requests read"
on interfacility_stock_requests
for select
to authenticated
using (
  current_user_role() = 'founder'
  or requesting_facility_id = current_user_facility()
  or sending_facility_id = current_user_facility()
);

drop policy if exists "interfacility requests insert" on interfacility_stock_requests;
create policy "interfacility requests insert"
on interfacility_stock_requests
for insert
to authenticated
with check (
  current_user_role() = 'founder'
  or requesting_facility_id = current_user_facility()
);

drop policy if exists "interfacility requests update founder" on interfacility_stock_requests;
create policy "interfacility requests update founder"
on interfacility_stock_requests
for update
to authenticated
using (
  current_user_role() = 'founder'
)
with check (
  current_user_role() = 'founder'
);

drop policy if exists "interfacility movements read" on interfacility_stock_movements;
create policy "interfacility movements read"
on interfacility_stock_movements
for select
to authenticated
using (
  current_user_role() = 'founder'
  or from_facility_id = current_user_facility()
  or to_facility_id = current_user_facility()
);

drop policy if exists "interfacility movements insert founder" on interfacility_stock_movements;
create policy "interfacility movements insert founder"
on interfacility_stock_movements
for insert
to authenticated
with check (
  current_user_role() = 'founder'
);
