# Budget App

Next.js app untuk tracking budget bulanan, pengeluaran harian, versi konfigurasi budget, dan log operasional cash seperti parkir/bensin.

## Development

Install dependencies:

```bash
npm install
```

Create `.env.local`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=your_database
DB_SCHEMA=budget_app
APP_PASSWORD=123456
AUTH_SECRET=long_random_session_secret
```

Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

The app uses a single shared 6-digit PIN. `APP_PASSWORD` is the PIN used on `/login`. The login screen asks for 2 random PIN positions at a time and stores the challenge in an HTTP-only signed cookie. `AUTH_SECRET` signs both the challenge cookie and the session cookie; use a long random value and keep it private.

Login has a small in-memory rate limit. It is enough for a single personal deployment, but use a persistent store such as Redis/Upstash if this app runs on multiple instances.

## Database Setup

There are two supported database paths.

### Fresh Database

Use [lib/schema.sql](./lib/schema.sql). It represents the current full schema and includes default seed rows.

Example:

```bash
psql "$DATABASE_URL" -f lib/schema.sql
```

Or with local connection flags:

```bash
psql -h localhost -U postgres -d your_database -f lib/schema.sql
```

### Existing Database

If the database was created from an older schema, apply migrations in order:

```bash
psql "$DATABASE_URL" -f lib/migration-v2.sql
psql "$DATABASE_URL" -f lib/migration-v3.sql
psql "$DATABASE_URL" -f lib/migration-v4.sql
psql "$DATABASE_URL" -f lib/migration-v5.sql
psql "$DATABASE_URL" -f lib/migration-v6.sql
```

Migration notes:

- `migration-v2.sql`: adds config versioning.
- `migration-v3.sql`: adds custom daily labels/budgets.
- `migration-v4.sql`: adds `other_expenses` for cash operational logs.
- `migration-v5.sql`: adds database constraints that match API validation.
- `migration-v6.sql`: adds initial cash balance for operational cash tracking.

`other_expenses` is intentionally not included in account balance or monthly variance. It is used only to plan and log cash operational spending.

## Quality Checks

```bash
npm.cmd run lint
npm.cmd run build
```

On Windows PowerShell, `npm run ...` may be blocked by execution policy. Use `npm.cmd run ...` if that happens.
