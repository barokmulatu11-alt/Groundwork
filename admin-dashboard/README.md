# Groundwork Admin Dashboard

A modern admin web dashboard for the Groundwork productivity app, built with Next.js + Tailwind CSS + Supabase.

## Structure

```
Groundwork/
├── app/                 ← Android app (Expo/React Native)
├── admin-dashboard/     ← Admin web app (Next.js) ← THIS FOLDER
├── supabase/            ← Database migrations
└── shared/              ← Shared configs
```

## Pages

| Route | Description |
|---|---|
| `/login` | Admin authentication |
| `/dashboard` | Overview with stats |
| `/dashboard/users` | User management (search, filter, grant Pro, change roles) |
| `/dashboard/subscriptions` | Pro subscription management |
| `/dashboard/flags` | Feature flag toggles |
| `/dashboard/announcements` | Create/manage app announcements |
| `/dashboard/reports` | View and resolve user reports |
| `/dashboard/config` | Remote app configuration |

## Setup

1. **Environment Variables** — already configured in `.env.local` pointing to the live Supabase project.

2. **Run Database Migrations** — apply the SQL migration in `../supabase/migrations/20260515_admin_setup.sql` in your Supabase dashboard SQL editor.

3. **Set Your Admin Role** — in Supabase, run:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE id = '<your-user-id>';
   ```
   Or if the profiles table doesn't auto-populate, insert manually:
   ```sql
   INSERT INTO profiles (id, role) VALUES ('<your-user-id>', 'admin');
   ```

4. **Run locally:**
   ```bash
   cd admin-dashboard
   npm run dev
   # Opens at http://localhost:3000
   ```

5. **Deploy to Vercel:**
   - Connect the `admin-dashboard/` subfolder to a Vercel project
   - Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables

## Security

- Route protection is enforced at the layout level (`/dashboard/layout.tsx`)
- Admin role is verified server-side from the `profiles` table
- Row Level Security (RLS) is enabled on all admin tables
- Only `admin` and `owner` roles can access the dashboard

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS
- **Auth & DB:** Supabase
- **Icons:** Lucide React
- **Deployment:** Vercel
"# Groundwork" 
