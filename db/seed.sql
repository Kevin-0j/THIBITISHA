-- Demo venue for Supabase, matching the in-memory demo. Run after schema.sql.
-- Replace the phone numbers with real ones (E.164, exactly as Africa's Talking sends them).
with v as (
  insert into venues (name, owner_phone, plan, code, template, reward_kes)
  values ('Backyard Bar & Motel', '+254711000003', 'plus', '4471', 'lodge', 10)
  returning id
)
insert into staff (venue_id, phone_number, full_name, role)
select v.id, p.phone, p.name, p.role
from v, (values
  ('+254711000001', 'Demo Manager', 'manager'),
  ('+254711000002', 'Demo Cleaner', 'housekeeper'),
  ('+254711000003', 'Demo Owner',   'owner')
) as p(phone, name, role);
