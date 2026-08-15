Supabase migrations - DPDP additions

Files to run for DPDP compliance (order matters):

1. `20260815120000_add_dpdp_tables.sql` — creates two tables:
   - `public.dpdp_consents`
   - `public.dpdp_requests`

How to run

Option A: Use the supplied runner script (recommended)

1. Export your Postgres connection string:

```bash
export DATABASE_URL="postgres://user:pass@host:5432/dbname"
```

2. Run the script from the repo root:

```bash
./scripts/run_supabase_migrations.sh
```

Option B: Use psql directly

```bash
psql "<POSTGRES_CONNECTION_STRING>" -f supabase/migrations/20260815120000_add_dpdp_tables.sql
```

Notes
- The migration enables `pgcrypto` to use `gen_random_uuid()`; if your DB doesn't allow extension creation, replace the `DEFAULT gen_random_uuid()` with server-side uuid generation or use `uuid-ossp` if available.
- After running, verify with:

```bash
psql "<POSTGRES_CONNECTION_STRING>" -c "\dt public.dpdp_*"
```

If you'd like, I can produce a single combined SQL file or generate a Supabase CLI-compatible migration manifest — tell me which format you prefer.
