-- SplitNest Phase 3 - profile display names
--
-- Never derive a person's display name from their email address. Earlier
-- versions filled full_name with the email local part when no name was
-- supplied, which then appeared in shared screens such as "Paid by".

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Repair existing rows: prefer the name captured at signup in auth metadata.
-- Google stores its display name under `name`, not `full_name`.
update public.profiles p
set full_name = coalesce(
  nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
  nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
  ''
)
from auth.users u
where u.id = p.id
  and (
    trim(p.full_name) = ''
    or lower(trim(p.full_name)) = lower(split_part(p.email, '@', 1))
  );

-- Any remaining email-handle placeholders become empty so the app can ask
-- the person for a real name instead of showing the handle.
update public.profiles
set full_name = ''
where lower(trim(full_name)) = lower(split_part(email, '@', 1));
