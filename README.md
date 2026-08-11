# FlowDesk

**Operations Command Center** for wholesale and distribution companies.

> Turn daily operations into clear next actions.

## Overview

FlowDesk is not a generic ERP CRUD dashboard. It is an operations command center that helps Sales, Warehouse, Accounts, and Admin teams understand what requires attention and move business operations forward.

The central operational flow:

```
Customer → Sales Challan → Stock Movement → Accounts / Invoice Readiness
```

## Why FlowDesk?

Traditional ERP dashboards show static counts. FlowDesk surfaces **actionable intelligence**:

- **Operations Pulse** — prioritized actions from real database state
- **Stock Risk Radar** — visual risk indicators for low-stock products
- **Customer Follow-up Queue** — overdue, today, and upcoming follow-ups
- **Operational Journey** — visual order-to-cash progress per challan
- **Role-specific dashboards** — each team sees what matters to them

## Features

- JWT authentication with role-based access (Admin, Sales, Warehouse, Accounts)
- Customer CRM with timeline, notes, and follow-ups
- Product inventory with stock movement audit trail
- Sales challan workflow with guided creation, draft/confirm/cancel
- Transaction-safe stock reduction on challan confirmation
- Product snapshot on challan items (historical accuracy)
- Operations Health score with documented formula
- Global search (Ctrl+K) and command palette
- CSV export for customers, products, and challans
- PDF generation for confirmed challans
- Swagger API documentation at `/api/docs`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite, TanStack Query, Tailwind CSS |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |
| Validation | Zod |
| Docs | Swagger/OpenAPI |
| Testing | Jest + Supertest |

## Architecture

```
React Client (Vite)
     |
     | REST / JWT
     ↓
Express + TypeScript API
     |
     ├── Auth Service
     ├── CRM Service (Customers)
     ├── Inventory Service (Products, Stock Movements)
     ├── Challan Service (Sales Challans)
     ├── Dashboard Service (Operations Pulse, Risk)
     └── Activity Service (Audit Events)
     |
     ↓
PostgreSQL
```

### Why Transactions for Challan Confirmation

Challan confirmation is a business-critical operation that must be atomic:

1. Lock/check product stock levels
2. Verify sufficient stock for all items
3. Update challan status to CONFIRMED
4. Reduce product stock for each item
5. Create OUT stock movement records
6. Create activity audit events

If any step fails, the entire operation rolls back — preventing partial stock deductions or inconsistent state.

## Database Design

| Table | Purpose |
|-------|---------|
| `users` | Authentication and role assignment |
| `customers` | CRM records with follow-up tracking |
| `customer_notes` | Customer interaction notes |
| `customer_followups` | Scheduled follow-up records |
| `products` | Inventory items with stock levels |
| `stock_movements` | Audit trail for all stock changes |
| `challans` | Sales delivery documents |
| `challan_items` | Line items with product snapshots |
| `activity_events` | Business activity audit log |
| `categories` | Product categorization |
| `warehouses` | Warehouse/location tracking |
| `challan_sequences` | Auto-increment challan numbers |

## Business Rules

### Draft vs Confirmed Challan

- **DRAFT**: Does not affect stock. Can be edited or cancelled.
- **CONFIRMED**: Reduces stock atomically. Creates OUT movements. Cannot be edited.
- **CANCELLED**: Cannot be confirmed after cancellation.

### Product Snapshot

Challan items store snapshot data (`product_name_snapshot`, `sku_snapshot`, `unit_price_snapshot`) alongside `product_id`. If product details change later, historical challans remain accurate.

### Insufficient Stock

Returns HTTP 409 with structured error:
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Insufficient stock for Product XYZ",
    "details": { "available": 8, "requested": 12 }
  }
}
```

### Operations Health Score

Formula: `100 - (overdue_followups × 5) - (low_stock × 3) - (draft_challans × 2)`, clamped 0–100.

## Role Permissions

| Module | Admin | Sales | Warehouse | Accounts |
|--------|-------|-------|-----------|----------|
| Command Center | ✓ | ✓ | ✓ | ✓ |
| Customers | ✓ | ✓ | — | ✓ |
| Inventory | ✓ | — | ✓ | — |
| Sales Challans | ✓ | ✓ | ✓ | ✓ |
| Activity | ✓ | ✓ | ✓ | ✓ |
| Reports | ✓ | — | — | ✓ |
| Settings | ✓ | — | — | — |

## Local Setup

### Prerequisites

- Node.js 20+
- A PostgreSQL database — **Neon** (recommended) or local PostgreSQL / Docker

---

## Neon Database Setup (Recommended)

FlowDesk uses [Neon](https://neon.tech) serverless PostgreSQL. Prisma is configured with:

- **`DATABASE_URL`** — pooled connection (for the running API)
- **`DIRECT_URL`** — direct connection (for migrations, push, and seed)

### Step 1: Create a Neon project

1. Go to [https://console.neon.tech](https://console.neon.tech) and sign up / log in
2. Click **New Project** → name it `flowdesk` → choose a region close to you
3. Neon creates a database automatically (default name: `neondb`)

### Step 2: Copy connection strings

In Neon Console → your project → **Connect**:

| Connection type | Use for | Env variable |
|----------------|---------|--------------|
| **Pooled connection** | App runtime | `DATABASE_URL` |
| **Direct connection** | Migrations & seed | `DIRECT_URL` |

Both URLs must include `?sslmode=require` (Neon adds this by default).

### Step 3: Configure `server/.env`

```bash
cp server/.env.neon.example server/.env
```

Edit `server/.env` and paste your Neon URLs:

```env
DATABASE_URL=postgresql://user:pass@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://user:pass@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
```

### Step 4: Push schema & seed

```bash
cd server
npm install
npm run db:setup
```

This runs `prisma db push` (creates all tables on Neon) and seeds demo data.

### Step 5: Start the app

```bash
# Terminal 1 — API
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm install && npm run dev
```

Open http://localhost:5173

---

## Local PostgreSQL (Optional)

If you prefer a local database instead of Neon:

```bash
docker compose -f docker-compose.local.yml up postgres -d
```

Then set in `server/.env`:

```env
DATABASE_URL=postgresql://flowdesk:flowdesk123@localhost:5432/flowdesk
DIRECT_URL=postgresql://flowdesk:flowdesk123@localhost:5432/flowdesk
```

```bash
cd server && npm run db:setup && npm run dev
```

---

### Quick Start (Neon)

```bash
cd flowdesk
cp server/.env.neon.example server/.env
# → paste your Neon DATABASE_URL and DIRECT_URL into server/.env

cd server
npm install
npm run db:setup
npm run dev

cd ../client
npm install
npm run dev
```

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@flowdesk.demo | FlowDesk@2026 |
| Sales | sales@flowdesk.demo | FlowDesk@2026 |
| Warehouse | warehouse@flowdesk.demo | FlowDesk@2026 |
| Accounts | accounts@flowdesk.demo | FlowDesk@2026 |

## Environment Variables

See `.env.example` and `server/.env.neon.example`:

```env
# Neon (recommended)
DATABASE_URL=postgresql://...@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://...@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require

PORT=3001
JWT_SECRET=change-this-to-a-secure-random-string
CLIENT_URL=http://localhost:5173
```

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Pooled Neon URL — used by the API at runtime |
| `DIRECT_URL` | Direct Neon URL — used by Prisma migrate/push/seed |

## API Documentation

- Swagger UI: http://localhost:3001/api/docs
- Postman collection: `postman/FlowDesk.postman_collection.json`

## Testing

```bash
cd server
npm test
```

Tests cover: login, unauthorized access, customer/product creation, draft challan stock behavior, confirmed challan stock reduction, insufficient stock 409, negative stock prevention, double confirmation prevention, cancelled challan confirmation prevention.

## Docker

With Neon, only the app containers run (database is external):

```bash
# Ensure server/.env has your Neon DATABASE_URL and DIRECT_URL
docker compose up -d
```

For local PostgreSQL during development:

```bash
docker compose -f docker-compose.local.yml up postgres -d
```

## Known Limitations

- Single-tenant (no multi-org support)
- No real-time notifications
- Reports are summary-level (not full analytics)
- Settings page is placeholder

## Future Improvements

- Email notifications for follow-ups and low stock
- Purchase order module
- Invoice generation from confirmed challans
- Multi-warehouse transfer workflows
- Advanced reporting with date range filters
