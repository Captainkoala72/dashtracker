# Deploy DashTracker to Vercel

DashTracker is a React + TypeScript + Vite app. Supabase stores your shifts, car expenses, and year-specific settings. You deploy the frontend to your own Vercel account.

## 1. Source code

The source is committed at https://github.com/Captainkoala72/dashtracker on `main`. The repository root is the app root: it contains `package.json`, `vercel.json`, `src/`, `.env.example`, and `supabase/schema.sql`. You can also extract the original `DashTracker-source.zip`; its `dashtracker` folder has the same structure.

Use Node.js 22.18 or later (Node 24 recommended). From the project root:

```bash
npm ci
```

The source and `package-lock.json` are already committed. Keep `node_modules`, `dist`, and `.env.local` out of Git; `.gitignore` is included.

## 2. Supabase

The existing **dashtracker** project is already configured:

- Project reference: `rijdchpsjkjsgihemnlv`
- Project URL: `https://rijdchpsjkjsgihemnlv.supabase.co`
- Tables: `dash_shifts`, `dash_expenses`, `dash_settings`
- Indexes on shift and expense dates
- Row level security enabled, with intentionally public access limited to these tracker tables
- Realtime enabled for the three tables

You do not need to run the schema again for this project. `supabase/schema.sql` is included to reproduce the setup in a different, dedicated project.

Open the project's API Keys settings:

https://supabase.com/dashboard/project/rijdchpsjkjsgihemnlv/settings/api-keys

Copy the **publishable** key beginning `sb_publishable_`. Do not use a secret key, service-role key, database password, or access token. This app requires none of those.

## 3. Vercel environment variables

In Vercel, choose **Add New → Project**, import **Captainkoala72/dashtracker**, and leave the Root Directory at the repository root (`./`). Framework preset: **Vite**.

Add these two variables before deploying:

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://rijdchpsjkjsgihemnlv.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your `sb_publishable_...` key from the Supabase API Keys page |

Enable them for **Production** and, if desired, **Preview** and **Development**. Preview deployments using this same project will share your real data.

Vercel settings:

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js | 24.x, or a supported 22.x release at least 22.18 |

`vercel.json` already declares the framework, build command, output directory, and basic response headers. No functions, server, database connection string, login redirect, or Supabase Auth setup is needed.

Deploy, then open the same Vercel URL on your phone and PC. An optional custom domain does not change the database setup.

**After changing an environment variable, redeploy.** Vite embeds these values at build time. Adding them without a new build will not update the deployed frontend.

Both `VITE_` values are browser-visible by design. The publishable key identifies the project; it is not a password.

## 4. Local development

Copy `.env.example` to `.env.local` and replace the key placeholder:

```bash
cp .env.example .env.local
npm run dev
```

To verify and build:

```bash
npm test
npm run build
npm run preview
```

The app shows a setup notice if the environment variables are missing. Sample preview data is kept in memory and is never saved to Supabase.

## 5. First use

1. In Settings, choose your default DoorDash share of personal-car expenses. It starts at 100% to count the whole purchase; use a lower percentage if you only want the business portion to affect hourly earnings.
2. Enter any other annual ordinary income. The default is $0. It affects the income-tax estimate, even though it is not added to your DoorDash earnings.
3. Log a shift with **Dash pay before tips**, **Customer tips**, **Total shift time**, and **Stride business miles**. Total earnings are pay plus tips.
4. Add gas and maintenance purchases separately. Each gets its own payment date and DoorDash share.
5. Switch between week, month, and year. Weeks start Monday. The reporting date picker can jump to any date from 2026 onward; new records default to today's date in Eastern Time.
6. Enter any estimated tax payments specifically allocated to DoorDash. They reduce the remaining tax reserve, not net earnings.
7. Use Export CSV for the selected period or download a full JSON backup in Settings.

A failed save leaves the form open with the entered values. There is no offline write queue; reconnect and save again. The app uses Realtime plus a 15-second visible-page refresh and refresh on focus. Simultaneous edits to different records remain independent; simultaneous edits to the same record use the last successful save.

## 6. Public-access design

As requested, this is one public shared dataset with no login. Anyone with the URL or project API details can read, add, edit, or delete tracker records. There is no private user boundary. `noindex` discourages search-engine indexing but is not access control. Do not store Social Security numbers, account numbers, or secrets in notes. If you later want private access, add authentication and replace the public policies before relying on privacy.

## 7. How earnings and tax work

See `TAX-NOTES.md` for the formulas, verified 2026 rules, official source links, assumptions, and future-year limitations. The Taxes page also explains the model.

## Troubleshooting

- **Setup needed:** verify both Vercel variables and redeploy.
- **Sync error:** confirm the project is active; check the project URL and publishable key. The three tables need both table grants and RLS policies.
- **Different numbers on two devices:** make sure both deployments use the same project URL and date filter. Click the cloud status to refresh. Sample preview mode is local and intentionally does not sync.
- **No tax estimate for 2027 or later:** records work for later years; verified future-year tax rules have not been loaded. The app deliberately shows a pending-rules message instead of applying 2026 rates as if they were current.
- **A shift's net hourly rate changes with the date filter:** independent expenses are dated cash outflows. Within each selected period, expenses are allocated across that period's shifts by miles (or time if no miles are recorded). This is a reporting allocation, not a claim that a purchase was consumed by that shift.

Official deployment references:

- https://vercel.com/docs/frameworks/frontend/vite
- https://vite.dev/guide/env-and-mode
- https://supabase.com/docs/guides/getting-started/api-keys
