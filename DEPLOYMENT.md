# DEPLOYMENT.md – UniverseByte CRM Production Guide

> **Project:** UniverseByte CRM  
> **Brand:** UniverseByte – Technology Redefined  
> **Target Cloud:** Render (Backend Web Service + Frontend Static Site) & MongoDB Atlas (Database)  
> **Version:** 1.0.0 Production  

---

## 1. Production Architecture Overview

UniverseByte CRM is engineered as a decoupled modern full-stack web application:

```
[Student / Staff Browsers]
           │
           ▼
[Custom Domain: crm.universebyte.com]
           │
           ▼
[Render Static Site (React + Vite SPA)]
     ├── Public Assets & Bundles (dist/)
     └── Client-side Routing (_redirects -> /index.html 200)
           │
           │ (HTTPS / CORS / Credentials)
           ▼
[Custom Domain: api.universebyte.com]
           │
           ▼
[Render Web Service (Node.js + Express + TypeScript)]
     ├── Rate Limiting, Helmet Security Headers, mongoSanitize
     ├── Stateless JWT Access (15m) + HTTP-Only Refresh Cookies (7d)
     ├── Health Check Ping (/api/v1/health)
     └── Server-Side API Handlers (Groq Cloud API, Meta WhatsApp Cloud API)
           │
           ▼
[MongoDB Atlas Cloud Database (Replica Set)]
     ├── Dedicated Collections (users, leads, followups, whatsappmessages)
     ├── Auto-Indexed Invariants & Compounds
     └── Point-in-Time Backups & Continuous Archiving
```

---

## 2. Render Deployment Options

### Option A: Automated Infrastructure via Blueprint (`render.yaml`) - Recommended

The repository includes a production-ready `render.yaml` specification at the repository root.

1. Push your repository to **GitHub** or **GitLab**.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Blueprint**.
4. Connect the `UB_CRM` repository.
5. Render will automatically detect `render.yaml` and provision both services:
   - **`universebyte-crm-backend`** (Node.js Web Service)
   - **`universebyte-crm-frontend`** (Static Site)
6. Supply the required environment secrets (e.g. `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`) in the Render prompt.
7. Click **Apply**. Render will automatically build, deploy, and verify both services.

---

### Option B: Manual Service Configuration

#### 1. Backend Web Service Configuration
In Render Dashboard, click **New +** → **Web Service**:
- **Name:** `universebyte-crm-backend`
- **Region:** Oregon (US West) or Frankfurt (EU) (match MongoDB Atlas region)
- **Branch:** `main`
- **Root Directory:** `backend`
- **Runtime:** `Node`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start`
- **Health Check Path:** `/api/v1/health`
- **Instance Type:** Free or Starter (0.5 CPU / 512 MB RAM or higher)

#### 2. Frontend Static Site Configuration
In Render Dashboard, click **New +** → **Static Site**:
- **Name:** `universebyte-crm-frontend`
- **Branch:** `main`
- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- **Rewrite Rules:**
  - **Source:** `/*`
  - **Destination:** `/index.html`
  - **Action:** `Rewrite` (already supported by `frontend/public/_redirects`)

---

## 3. Environment Variables Configuration

Set these environment variables in your Render Backend Service:

| Variable | Description | Example / Format |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Listening port (assigned by Render) | `10000` |
| `API_PREFIX` | Base API mount path | `/api/v1` |
| `MONGODB_URI` | MongoDB Atlas replica set URI | `mongodb+srv://user:pass@cluster.mongodb.net/universebyte_crm?retryWrites=true&w=majority` |
| `JWT_ACCESS_SECRET` | Secret key for 15-minute access tokens (>= 32 chars) | `crypto.randomBytes(32).toString('hex')` |
| `JWT_ACCESS_EXPIRY` | Access token lifespan | `15m` |
| `JWT_REFRESH_SECRET` | Secret key for 7-day refresh tokens (>= 32 chars) | `crypto.randomBytes(32).toString('hex')` |
| `JWT_REFRESH_EXPIRY` | Refresh token lifespan | `7d` |
| `FRONTEND_URL` | Frontend origin for CORS and cookies | `https://crm.universebyte.com` |
| `CORS_ORIGIN` | Comma-separated allowed origins | `https://crm.universebyte.com,https://universebyte-crm-frontend.onrender.com` |
| `GROQ_API_KEY` | Groq Cloud API key for AI Assistant | `gsk_...` (from console.groq.com) |
| `GROQ_MODEL` | LLM model for AI tasks | `llama-3.3-70b-versatile` |
| `GROQ_TIMEOUT_MS` | AI request timeout | `15000` |
| `META_ACCESS_TOKEN` | Meta WhatsApp Cloud API access token | `EAAB...` (Permanent System User Token) |
| `META_PHONE_NUMBER_ID` | WhatsApp Business Phone Number ID | `100123456789012` |
| `META_WABA_ID` | WhatsApp Business Account ID | `200123456789012` |
| `META_WEBHOOK_VERIFY_TOKEN` | Secret token for incoming Meta webhooks | `universebyte_webhook_verify_token_2026` |
| `META_APP_SECRET` | Meta App Secret (for webhook signature) | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |

Set this environment variable in your Render Frontend Static Site:

| Variable | Description | Example / Value |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Full URL to the Backend API | `https://api.universebyte.com/api/v1` |

---

## 4. Custom Domain Setup (e.g. `crm.universebyte.com`)

### 4.1 Frontend Custom Domain (`crm.universebyte.com`)
1. In Render Dashboard, open **`universebyte-crm-frontend`** → **Settings** → **Custom Domains**.
2. Click **Add Custom Domain** and enter: `crm.universebyte.com`.
3. In your DNS provider (Cloudflare, GoDaddy, Namecheap, AWS Route53), add a CNAME record:
   - **Type:** `CNAME`
   - **Name / Host:** `crm`
   - **Target / Value:** `universebyte-crm-frontend.onrender.com`
   - **TTL:** Auto or 300s
4. Render automatically provisions a free, auto-renewing Let's Encrypt SSL/TLS certificate.

### 4.2 Backend Custom Domain (`api.universebyte.com`)
1. In Render Dashboard, open **`universebyte-crm-backend`** → **Settings** → **Custom Domains**.
2. Click **Add Custom Domain** and enter: `api.universebyte.com`.
3. In your DNS provider, add a CNAME record:
   - **Type:** `CNAME`
   - **Name / Host:** `api`
   - **Target / Value:** `universebyte-crm-backend.onrender.com`
   - **TTL:** Auto or 300s
4. Update `FRONTEND_URL` on the backend to `https://crm.universebyte.com` and `VITE_API_BASE_URL` on the frontend to `https://api.universebyte.com/api/v1`.

---

## 5. Database Initialization & Seeding

After deploying the backend, initialize database indexes and seed the initial Super Admin:

### Option A: From Local Development CLI
Point to the production MongoDB Atlas cluster:
```bash
MONGODB_URI="mongodb+srv://..." INITIAL_SUPER_ADMIN_PASSWORD="YourStrongPassword@2026!" npm run db:init --workspace=backend
```

### Option B: Render One-Off Shell
1. In Render Dashboard, open **`universebyte-crm-backend`** → **Shell**.
2. Run:
```bash
npm run db:init
```
This script will:
- Establish connection to MongoDB Atlas.
- Build unique and compound indexes for all collections.
- Provision the initial Super Admin if not already present.
- **Safety guarantee:** Never overwrites or modifies existing administrative users.

---

## 6. Verifying Production Deployment

Execute the automated smoke test suite against your live deployed URL:

```bash
DEPLOYED_API_URL="https://api.universebyte.com/api/v1" npm run smoke:test
```

The smoke test verifies all 8 production capabilities against your live deployment:
1. `GET /health` operational status.
2. Super Admin login and JWT session validation.
3. Lead creation and duplicate phone blocking.
4. Lead assignment to staff counselors.
5. Follow-up scheduling, synchronization, and completion.
6. Real-time aggregated dashboard KPI cards and charts.
7. Click-to-WhatsApp message synthesis.
8. Database persistence and zero sensitive data leakage.

