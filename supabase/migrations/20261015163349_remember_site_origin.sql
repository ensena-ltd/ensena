-- The site address (e.g. https://dev.ensena.co) a booking was made on, and the
-- one each person last used, so emails sent later by scheduled jobs link back
-- to the same site instead of a default domain.
alter table public.private_lessons add column if not exists site_origin text;
alter table public.profiles add column if not exists site_origin text;
