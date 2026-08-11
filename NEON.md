# Neon → FlowDesk migration checklist

## 1. Create Neon project
- https://console.neon.tech → **New Project** → name: `flowdesk`

## 2. Get connection strings
Neon Dashboard → **Connect** → copy both:

| Type | Env var | Notes |
|------|---------|-------|
| Pooled connection | `DATABASE_URL` | Hostname contains `-pooler` |
| Direct connection | `DIRECT_URL` | Used for schema push & seed |

## 3. Update server/.env

```env
DATABASE_URL=postgresql://...@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://...@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

## 4. Push schema & seed to Neon

```powershell
cd server
npx prisma generate
npm run db:setup
```

## 5. Restart the API

```powershell
npm run dev
```

## 6. Verify

```powershell
npx prisma db execute --stdin --schema prisma/schema.prisma <<< "SELECT COUNT(*) FROM users;"
```

Or log in at http://localhost:5173 with `admin@flowdesk.demo` / `FlowDesk@2026`

---

**Note:** Your old local PostgreSQL data is NOT migrated automatically.  
`npm run db:seed` creates fresh demo data on Neon. To migrate existing data, use `pg_dump` from local and `psql` into Neon.
