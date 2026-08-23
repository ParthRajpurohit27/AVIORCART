-- Run this once in Supabase → SQL Editor

-- 1. Enable Row Level Security on orders
alter table public.orders enable row level security;

-- 2. Allow only logged-in (authenticated) users to READ orders
create policy "Authenticated users can read orders"
on public.orders
for select
to authenticated
using (true);

-- 3. Enable Realtime broadcasts for orders table
alter publication supabase_realtime add table public.orders;

-- 4. Create your admin/owner login(s):
--    Go to Authentication → Users → Add User (email + password) for each admin.
--    No SQL needed for this step.
