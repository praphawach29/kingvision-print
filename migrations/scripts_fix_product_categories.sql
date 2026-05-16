-- Normalize legacy/incorrect printer categories to homepage taxonomy.
-- Run this in Supabase SQL Editor.

begin;

update products
set category = case
  when coalesce(short_description, '') ilike '%Dot Matrix%' then 'Dot Matrix'
  when coalesce(short_description, '') ilike '%Thermal Receipt%' then 'Slip Printer'
  when coalesce(short_description, '') ilike '%Multifunction%' then 'MULTIFUNCTION'
  when coalesce(short_description, '') ilike '%Laser Printer%' then 'Laser Printer'
  else category
end
where
  category is null
  or category in ('', '????????????', '?????????????????', 'Printer');

-- Optional safety net: infer from title keywords for remaining legacy printer rows.
update products
set category = 'Dot Matrix'
where (category in ('????????????', '?????????????????', 'Printer') or category is null or category = '')
  and coalesce(title, '') ilike any (array['%LQ-%', '%Dot Matrix%', '%TM-U220%']);

update products
set category = 'Slip Printer'
where (category in ('????????????', '?????????????????', 'Printer') or category is null or category = '')
  and coalesce(title, '') ilike any (array['%TM-T82%', '%Thermal%']);

update products
set category = 'MULTIFUNCTION'
where (category in ('????????????', '?????????????????', 'Printer') or category is null or category = '')
  and coalesce(title, '') ilike any (array['%MFP%', '%DCP-%', '%MFC-%']);

update products
set category = 'Laser Printer'
where (category in ('????????????', '?????????????????', 'Printer') or category is null or category = '')
  and coalesce(title, '') ilike any (array['%LaserJet%', '%LBP%', '%HL-%']);

commit;

-- Verify counts after update
select category, count(*) as total
from products
group by category
order by total desc, category asc;
