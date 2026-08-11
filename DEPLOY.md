# Deploy FlowDesk (Netlify + Render + Neon)

## Architecture

```
Netlify (React frontend)
        ↓  VITE_API_URL
Render (Express API)
        ↓  DATABASE_URL
Neon (PostgreSQL)
```

---

## Step 1: Deploy backend on Render

1. Go to [https://render.com](https://render.com) and sign up with GitHub
2. Click **New +** → **Web Service**
3. Connect repo: `AjeyHanamanal/flowdesk`
4. Configure:

| Field | Value |
|-------|-------|
| **Name** | `flowdesk-api` |
| **Root Directory** | `server` |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | Free |

5. Add **Environment Variables**:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Your Neon **pooled** URL |
| `DIRECT_URL` | Your Neon **direct** URL |
| `JWT_SECRET` | A long random string (e.g. generate at random.org) |
| `CLIENT_URL` | Your Netlify site URL, e.g. `https://your-site.netlify.app` |

6. Click **Create Web Service**
7. Wait for deploy — copy your API URL, e.g. `https://flowdesk-api.onrender.com`

8. Test: open `https://flowdesk-api.onrender.com/health` — should return `{"success":true,...}`

> **Note:** Free Render services spin down after inactivity. First request may take ~30 seconds.

---

## Step 2: Connect Netlify frontend to Render API

1. Go to [Netlify Dashboard](https://app.netlify.com) → your FlowDesk site
2. **Site configuration** → **Environment variables**
3. Add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://flowdesk-api.onrender.com/api` |

(Replace with your actual Render URL + `/api`)

4. **Deploys** → **Trigger deploy** → **Clear cache and deploy site**

---

## Step 3: Verify

1. Open your Netlify URL
2. Log in with `admin@flowdesk.demo` / `FlowDesk@2026`
3. Dashboard should load with real data from Neon

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS error in browser | Set `CLIENT_URL` on Render to exact Netlify URL (no trailing slash) |
| Login fails / network error | Check `VITE_API_URL` ends with `/api` and redeploy Netlify |
| API slow on first load | Render free tier cold start — wait 30s and retry |
| 401 on all requests | JWT works — check Neon `DATABASE_URL` is set on Render |

---

## Optional: Seed production database

If Neon is empty, run locally pointing to Neon:

```bash
cd server
npm run db:setup
```

Or set `DEMO_PASSWORD` on Render and run seed once via Render shell.
