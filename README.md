# DashTracker

A dark, DoorDash-inspired personal earnings dashboard for Williamsville, New York.

- Dated shift records: base pay, tips, full shift time, Stride business miles, notes
- Dated gas and maintenance expenses, with an adjustable DoorDash-use percentage
- Weekly, monthly, and yearly reports; pre-tax and estimated after-tax hourly earnings
- Full-year 2026 federal income, self-employment, NY State, mileage and qualified-tips estimates
- Supabase live sync, editing, deletion, CSV export, JSON backup
- Mobile-responsive layout with no account or login

See [DEPLOYMENT.md](DEPLOYMENT.md) for the exact Vercel setup and environment variables, and [TAX-NOTES.md](TAX-NOTES.md) for calculations, limitations, and official sources.

```bash
npm ci
cp .env.example .env.local
# Fill in the publishable key in .env.local
npm run dev
```

```bash
npm test
npm run build
```

Use Node.js >=22.18 (24 recommended). `package-lock.json` pins dependencies.

## Structure

- `src/App.tsx`: dashboard, forms, reports, tax explanations, settings
- `src/styles.css`: responsive dark theme
- `src/domain.ts`: pure date, earnings, allocation, validation, and tax logic
- `src/store.ts`: Supabase CRUD, pagination, live subscriptions and refresh
- `tests/domain.test.ts`: financial and date-boundary tests
- `supabase/schema.sql`: dedicated-project setup with explicit public RLS policies
- `.env.example`: the two frontend environment variable names
- `vercel.json`: Vercel configuration

This project intentionally uses a public single dataset. See the public-access section of the deployment guide. Tax estimates are enabled only for verified 2026 rules and the stated single-filer income scope; tracking supports later years.
