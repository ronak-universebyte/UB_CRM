# PRODUCTION_CHECKLIST.md – UniverseByte CRM

> **Project:** UniverseByte CRM  
> **Brand:** UniverseByte – Technology Redefined  
> **Purpose:** Pre-Flight, Launch, and Post-Launch Operational Checklist  

---

## 1. Pre-Deployment Verification

### 1.1 Architecture & Code Hygiene
- [x] **No Code Re-Use:** Clean, greenfield codebase without legacy code imports or dependencies.
- [x] **Strict TypeScript Compilation:** Both `backend/` (`tsc`) and `frontend/` (`tsc -b`) compile with 0 errors.
- [x] **Zero Plaintext Secrets:** No passwords, connection strings, or API tokens committed in source control.
- [x] **Layered Architecture Compliance:** Controllers delegate to Services; Services never handle Express `req`/`res`.
- [x] **Production Bundle Sizes:** Frontend assets optimized with gzip compression (< 150 kB initial gzipped JS).

### 1.2 Database & Data Integrity
- [x] **Database Indexes:** All unique, search, and compound indexes built via `npm run db:init`.
- [x] **Super Admin Provisioned:** Initial Super Admin seeded with bcrypt hash (>= 10 rounds).
- [x] **Non-Destructive Seeding:** Seeding logic verified to never overwrite or modify existing records.
- [x] **Data Sanitation:** Recursive `mongoSanitize` middleware active to strip NoSQL operator injections.

### 1.3 Security & OWASP Top 10 Safeguards
- [x] **Cryptographic Hygiene:** Enforced `{ algorithms: ['HS256'] }` on JWT verification; rejects algorithm `none` attacks.
- [x] **Session Security:** Refresh tokens stored in HTTP-only, SameSite cookies with token rotation on refresh.
- [x] **Least Privilege:** Strict RBAC middleware guarding every protected route.
- [x] **Sensitive Field Exclusion:** `passwordHash`, `refreshTokens`, and password reset tokens excluded from API responses.
- [x] **Student PII Protection:** Phone numbers, email addresses, and residential details stripped before AI prompting.
- [x] **Advisory AI Boundaries:** AI outputs flagged as advisory (`isSuggestion: true`); no automated pipeline mutations.

---

## 2. Render Deployment Checklist

### 2.1 Backend Web Service
- [x] Node.js runtime selected with build command: `npm install && npm run build`.
- [x] Start command configured: `npm run start`.
- [x] Health check path configured: `/api/v1/health` (verified returning status `200 OK`).
- [x] Environment variables populated:
  - `NODE_ENV=production`
  - `MONGODB_URI`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `FRONTEND_URL`
  - `CORS_ORIGIN`
  - `GROQ_API_KEY` (optional)
  - `META_ACCESS_TOKEN` (optional)

### 2.2 Frontend Static Site
- [x] Static Site runtime with build command: `npm install && npm run build`.
- [x] Publish directory set to `dist`.
- [x] SPA client routing rewrite rule enabled (`/* -> /index.html 200` via `_redirects`).
- [x] `VITE_API_BASE_URL` pointed to backend API domain (e.g. `https://api.universebyte.com/api/v1`).

### 2.3 Custom Domains & TLS
- [x] DNS CNAME records configured for custom frontend domain (e.g. `crm.universebyte.com`).
- [x] DNS CNAME records configured for custom API domain (e.g. `api.universebyte.com`).
- [x] Let's Encrypt SSL/TLS certificates issued and active on both domains.
- [x] HTTP automatically redirected to HTTPS.

---

## 3. Post-Deployment Verification (Go-Live)

Run these checks immediately following deployment:

### 3.1 Automated Production Smoke Test
Execute from your local machine against the live URL:
```bash
DEPLOYED_API_URL="https://api.universebyte.com/api/v1" npm run smoke:test
```
Verify all 8 checks succeed:
1. `GET /health` endpoint reports status `healthy`.
2. Super Admin logs in, receives JWT tokens, and introspects `/auth/me`.
3. Lead creation functions with auto-generated Lead ID (`UB-LD-2026-xxxx`).
4. Duplicate mobile number insertion is blocked (`409 Conflict`).
5. Lead is assigned to an admission counselor.
6. Follow-up is scheduled and completed with counselling remarks.
7. Real-time aggregated KPI cards and charts populate with accurate database counts.
8. Click-to-WhatsApp message generates correctly and logs manual attempt.

---

## 4. Operational & Monitoring Maintenance

- [x] **Render Auto-Restart:** Unhandled errors or memory anomalies automatically restart the service.
- [x] **Atlas Backup Status:** Automated continuous snapshots confirmed active in MongoDB Atlas dashboard.
- [x] **Audit Trail Verification:** Activity logs actively recording staff interactions and status transitions.
- [x] **Rate Limit Monitoring:** Monitor 429 responses in Render logs to identify abuse or tune thresholds.

