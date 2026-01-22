create table public.user_property_access (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  property_code text not null,
  role text null,
  constraint user_property_access_pkey primary key (id),
  constraint user_property_access_user_id_property_code_key unique (user_id, property_code),
  constraint user_property_access_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE,
  constraint user_property_access_role_check check (
    (
      role = any (
        array[
          'Owner'::text,
          'Staff'::text,
          'Manager'::text,
          'RPM'::text,
          'Asset'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- Enable Row Level Security
alter table public.user_property_access enable row level security;

-- Policy: Users can view their own access records
create policy "Users can view own access"
  on public.user_property_access
  for select
  using (auth.uid() = user_id);
