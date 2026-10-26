# Validation

Completed October 26, 2026:

- 21 financial, date-range, allocation, validation, and tax boundary tests passed with `npm test`.
- TypeScript checks and the Vite production build passed with `npm run build`.
- Anonymous Supabase insert, read, update, and delete were tested against the connected project.
- A second independent client received a Realtime insert event.
- Expense and settings records were read by a second client; expense updates were observed across clients.
- A zero-minute shift was rejected by the database constraint.
- Temporary records created for verification were removed.
- Row level security and intentional anonymous-access policies were verified on all three tables.
- Supabase's security advisor returned no findings.

Browser/layout verification could not run because the managed preview service was unavailable. Responsive styles and interaction code were reviewed, but desktop and phone browser behavior have not been visually verified. No Vercel deployment was performed; deployment is left to the owner as requested.
