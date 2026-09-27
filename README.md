# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Supabase Setup

This app now uses Supabase Auth for login and registration. Set these environment variables in your Expo app:

```bash
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_PASSWORD_RESET_REDIRECT=hydroalertmobile://reset-password
```

Password reset on mobile:
- Avoid `http://localhost` in Supabase Auth Site URL/redirects when testing on phones.
- On mobile browsers, `localhost` points to the phone itself, so reset links will fail.
- Add `hydroalertmobile://reset-password` in Supabase Auth -> Redirect URLs.

Create a `users` profile table in Supabase and enable Row Level Security. Run this SQL in the Supabase SQL editor:

```sql
create table if not exists public.users (
   user_id uuid primary key references auth.users(id) on delete cascade,
   first_name text not null,
   middle_name text default '',
   last_name text not null,
   full_name text,
   birthday text,
   email text unique not null,
   phone_number text default '',
   province text default 'Cavite',
   city text,
   barangay text,
   street text default '',
   role_id int,
   barangay_id int,
   fcm_token text,
   created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read their own profile"
   on public.users for select
   using (auth.uid() = user_id);

create policy "Users can insert their own profile"
   on public.users for insert
   with check (auth.uid() = user_id);

create policy "Users can update their own profile"
   on public.users for update
   using (auth.uid() = user_id)
   with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
   insert into public.users (
      user_id,
      first_name,
      middle_name,
      last_name,
      full_name,
      birthday,
      email,
      phone_number,
      province,
      city,
      barangay,
      street,
      role_id,
      barangay_id,
      fcm_token
   ) values (
      new.id,
      coalesce(new.raw_user_meta_data->>'first_name', ''),
      coalesce(new.raw_user_meta_data->>'middle_name', ''),
      coalesce(new.raw_user_meta_data->>'last_name', ''),
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      coalesce(new.raw_user_meta_data->>'birthday', ''),
      coalesce(new.email, ''),
      coalesce(new.raw_user_meta_data->>'phone_number', ''),
      coalesce(new.raw_user_meta_data->>'province', 'Cavite'),
      coalesce(new.raw_user_meta_data->>'city', ''),
      coalesce(new.raw_user_meta_data->>'barangay', ''),
      coalesce(new.raw_user_meta_data->>'street', ''),
      nullif(new.raw_user_meta_data->>'role_id', '')::int,
      nullif(new.raw_user_meta_data->>'barangay_id', '')::int,
      coalesce(new.raw_user_meta_data->>'fcm_token', '')
   )
   on conflict (user_id) do update set
      first_name = excluded.first_name,
      middle_name = excluded.middle_name,
      last_name = excluded.last_name,
      full_name = excluded.full_name,
      birthday = excluded.birthday,
      email = excluded.email,
      phone_number = excluded.phone_number,
      province = excluded.province,
      city = excluded.city,
      barangay = excluded.barangay,
      street = excluded.street,
      role_id = excluded.role_id,
      barangay_id = excluded.barangay_id,
      fcm_token = excluded.fcm_token;

   return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
   after insert on auth.users
   for each row execute procedure public.handle_new_user();
```

If your database already has `v_roles` and `v_barangays`, the app will use them to resolve `role_id` and `barangay_id` during registration. If the lookup fails, the signup still works and keeps the name fields.

If email confirmation is enabled in Supabase, the auth user is created first and the profile row is created from the signup metadata when the auth row is inserted.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
