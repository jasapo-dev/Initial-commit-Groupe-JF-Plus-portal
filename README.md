# Groupe JF Plus — Container Tracking Portal

Production-grade container tracking system built on React + Vite + Supabase + Netlify.

---

## 🏗 Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS |
| Auth | Supabase Auth (JWT, session persistence) |
| Database | Supabase PostgreSQL + Row Level Security |
| Realtime | Supabase Realtime WebSocket |
| SMS Alerts | Twilio |
| Email Alerts | Resend |
| PDF Reports | jsPDF + jsPDF-AutoTable |
| Scheduled Jobs | Supabase Edge Functions (Deno) |
| CI/CD | GitHub Actions → Netlify |
| Hosting | Netlify (groupejf-portal.netlify.app) |

---

## 🚀 Initial Setup

### 1. Clone & install

```bash
git clone https://github.com/YOUR_ORG/groupejf-portal.git
cd groupejf-portal
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
# Fill in your Supabase anon key from:
# https://supabase.com/dashboard/project/jcrgbjckjtsjwrmgacxm/settings/api
```

### 3. Apply database migration

```bash
# Option A — Supabase CLI
npx supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.jcrgbjckjtsjwrmgacxm.supabase.co:5432/postgres"

# Option B — Dashboard
# Copy supabase/migrations/001_initial_schema.sql
# Paste into Supabase Dashboard → SQL Editor → Run
```

### 4. Set Supabase Edge Function secrets

In Supabase Dashboard → Edge Functions → Secrets, add:

```
SUPABASE_SERVICE_ROLE_KEY   = <from API settings>
TWILIO_ACCOUNT_SID          = <from Twilio console>
TWILIO_AUTH_TOKEN           = <from Twilio console>
TWILIO_FROM_NUMBER          = +1XXXXXXXXXX
RESEND_API_KEY              = re_XXXXXXXXXX
RESEND_FROM_EMAIL           = alerts@groupejfplus.com
OWNER_EMAIL                 = info@groupejfplus.com
CRON_SECRET                 = <generate a random secret>
```

### 5. Deploy Edge Functions

```bash
npx supabase functions deploy send-alerts --project-ref jcrgbjckjtsjwrmgacxm
npx supabase functions deploy generate-report --project-ref jcrgbjckjtsjwrmgacxm
```

### 6. Set up cron schedules

In Supabase Dashboard → Edge Functions → each function → Schedule:

| Function | Cron Expression | Description |
|----------|----------------|-------------|
| `send-alerts` | `*/15 * * * *` | Alert check every 15 min |
| `generate-report` | `0 6 * * *` | Daily report at 06:00 UTC |

### 7. GitHub Actions secrets

In your GitHub repo → Settings → Secrets:

```
VITE_SUPABASE_URL          = https://jcrgbjckjtsjwrmgacxm.supabase.co
VITE_SUPABASE_ANON_KEY     = <anon key>
NETLIFY_AUTH_TOKEN         = <from Netlify user settings>
NETLIFY_SITE_ID            = <from Netlify site settings>
SUPABASE_ACCESS_TOKEN      = <from supabase.com account settings>
```

### 8. Create admin user

In Supabase Dashboard → Auth → Users → Invite user:
- Email: info@groupejfplus.com
- Then in SQL Editor:
```sql
update public.profiles set role = 'admin' where email = 'info@groupejfplus.com';
```

---

## 🛡 Security Features

- **Row Level Security** on all tables — users only see/edit their own data
- **Admin-only writes** — only users with `role = 'admin'` can update containers
- **No public signup** — users are invited by admin only
- **Security headers** — CSP, X-Frame-Options, etc. via netlify.toml
- **Service role key** — only used in Edge Functions (server-side), never exposed to frontend
- **Anon key** — safe to expose in frontend (only permits RLS-filtered queries)

---

## 📋 Local Development

```bash
npm run dev         # Start Vite dev server on http://localhost:5173
npm run build       # Production build
npx tsc --noEmit    # Type check
```

---

## 📦 Project Structure

```
src/
├── components/
│   ├── StatusBadge.tsx       # Status pill with color coding
│   └── ContainerDrawer.tsx   # Side drawer with container detail + history
├── hooks/
│   ├── useAuth.tsx           # Auth context + hook
│   └── useContainers.ts      # Container CRUD + realtime subscription
├── lib/
│   ├── supabase.ts           # Supabase client + TypeScript types
│   └── reports.ts            # PDF + CSV generation
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx     # Main table + stats + export
│   ├── AlertsPage.tsx        # SMS/email rule management
│   └── ReportsPage.tsx       # Report generation UI
└── App.tsx                   # Router + protected routes

supabase/
├── migrations/
│   └── 001_initial_schema.sql
├── functions/
│   ├── send-alerts/index.ts   # Twilio + Resend dispatcher
│   └── generate-report/index.ts  # Daily email report
└── config.toml

.github/workflows/
└── deploy.yml                # Build → Netlify + Edge Functions
```

---

## Owner

Jonathan Fainacci — info@groupejfplus.com  
Groupe JF Plus
