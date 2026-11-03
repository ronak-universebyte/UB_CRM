# ENVIRONMENT_SETUP.md – UniverseByte CRM Configuration Guide

> **Project:** UniverseByte CRM  
> **Brand:** UniverseByte – Technology Redefined  
> **Purpose:** Production Environment Variables & Third-Party Integrations Guide  

---

## 1. Environment Variables Reference

UniverseByte CRM enforces strict schema validation at startup via Zod (`backend/src/config/env.ts`). In production, missing required variables halt startup with explicit diagnostics.

### 1.1 Core Backend Environment Variables

| Variable Name | Required | Default / Fallback | Sensitivity | Description |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | **Yes** | `development` | Public | Set to `production` for live deployments to enable secure cookie flags and production logging. |
| `PORT` | **Yes** | `5000` (Render sets `10000`) | Public | TCP port for Express HTTP listener. |
| `API_PREFIX` | No | `/api/v1` | Public | Base route mount path for all API controllers. |
| `MONGODB_URI` | **Yes** | None | **Critical Secret** | MongoDB Atlas connection string including username, password, cluster hostname, and database name. |
| `JWT_ACCESS_SECRET` | **Yes** | None (min 32 chars) | **Critical Secret** | Cryptographic HMAC secret used to sign 15-minute access tokens. |
| `JWT_ACCESS_EXPIRY` | No | `15m` | Low | Lifespan of access tokens before requiring silent refresh. |
| `JWT_REFRESH_SECRET` | **Yes** | None (min 32 chars) | **Critical Secret** | Cryptographic HMAC secret used to sign 7-day refresh tokens. |
| `JWT_REFRESH_EXPIRY` | No | `7d` | Low | Lifespan of refresh session tokens. |
| `FRONTEND_URL` | **Yes** | `http://localhost:5173` | Low | Fully qualified URL of the frontend application (e.g. `https://crm.universebyte.com`). Used for CORS and cookie origin. |
| `CORS_ORIGIN` | No | Derived from `FRONTEND_URL` | Low | Comma-separated list of origins permitted to issue authenticated API requests. |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` (15 min) | Low | Rolling rate limit time window in milliseconds. |
| `RATE_LIMIT_MAX` | No | `100` | Low | Max allowed requests per IP per time window. |

---

### 1.2 AI Assistant Variables (Groq API)

| Variable Name | Required | Default | Sensitivity | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GROQ_API_KEY` | Optional | None | **High Secret** | API key from Groq Cloud Console (`gsk_...`). If omitted, CRM seamlessly activates a local intelligent heuristic rule engine without failing. |
| `GROQ_MODEL` | No | `llama-3.3-70b-versatile` | Low | Groq model name for predictive lead scoring and WhatsApp messaging. |
| `GROQ_TIMEOUT_MS` | No | `15000` (15s) | Low | Timeout limit before aborting and falling back to heuristic engine. |

---

### 1.3 WhatsApp Official Integration (Meta Cloud API)

| Variable Name | Required | Default | Sensitivity | Description |
| :--- | :--- | :--- | :--- | :--- |
| `META_ACCESS_TOKEN` | Optional | None | **High Secret** | Permanent System User Token from Meta Business Suite (`EAAB...`). If omitted, Manual Click-to-WhatsApp remains 100% operational. |
| `META_PHONE_NUMBER_ID` | Optional | None | Medium | Meta Phone Number ID (numerical string, e.g. `100123456789012`). |
| `META_WABA_ID` | Optional | None | Medium | WhatsApp Business Account ID (WABA ID). |
| `META_WEBHOOK_VERIFY_TOKEN` | No | `universebyte_webhook_verify_token_2026` | Medium | Custom secret token string to verify Meta webhook subscriptions. |
| `META_APP_SECRET` | Optional | None | **High Secret** | Meta Developer App Secret for `X-Hub-Signature-256` payload verification. |

---

### 1.4 Frontend Environment Variables

| Variable Name | Required | Default / Example | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | **Yes** | `https://api.universebyte.com/api/v1` | URL where frontend Axios client dispatches API requests. |
| `VITE_APP_TITLE` | No | `UniverseByte CRM` | Application title rendered in browser tabs. |
| `VITE_APP_TAGLINE` | No | `UniverseByte – Technology Redefined` | Institute branding subtitle. |

---

## 2. Generating Cryptographic Secrets

Generate high-entropy 64-character hexadecimal keys using Node.js built-in `crypto`:

```bash
# In your terminal:
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('META_WEBHOOK_VERIFY_TOKEN=' + require('crypto').randomBytes(24).toString('hex'))"
```

---

## 3. Third-Party Service Setup

### 3.1 MongoDB Atlas Database Setup
1. Register at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a **Shared / Dedicated Cluster** (e.g. `cluster0` on AWS or GCP in your closest region).
3. Under **Security** → **Database Access**:
   - Create a database user: `ub_crm_app`.
   - Select **Password Authentication** and generate a strong password.
   - Assign the built-in role: `readWriteAnyDatabase` or `readWrite@universebyte_crm`.
4. Under **Security** → **Network Access**:
   - Since Render dynamically allocates outbound IPs, add IP: `0.0.0.0/0` (Allow Access from Anywhere).
   - *Security Note:* Atlas requires username/password authentication and TLS 1.3 even when `0.0.0.0/0` is allowed.
5. Click **Connect** → **Connect your application**:
   - Copy connection string:
     ```
     mongodb+srv://ub_crm_app:<password>@cluster0.xxxxx.mongodb.net/universebyte_crm?retryWrites=true&w=majority
     ```

---

### 3.2 Groq Cloud AI Assistant Setup
1. Register at [Groq Console](https://console.groq.com).
2. Navigate to **API Keys** → **Create API Key**.
3. Name it: `UniverseByte CRM Production`.
4. Copy the generated key (`gsk_...`) and store it as `GROQ_API_KEY`.
5. *Note:* Groq provides ultra-fast inference (< 400ms) with generous free tier allowances.

---

### 3.3 Meta WhatsApp Cloud API Setup
1. Go to [Meta for Developers](https://developers.facebook.com) and create a **Business App**.
2. Add the **WhatsApp** product to your app.
3. Under **WhatsApp** → **API Setup**:
   - Note down **Phone Number ID** → set as `META_PHONE_NUMBER_ID`.
   - Note down **WhatsApp Business Account ID** → set as `META_WABA_ID`.
4. Under **Business Settings** → **Users** → **System Users**:
   - Create an Admin System User: `ub-crm-integration`.
   - Assign WhatsApp Assets with Full Control.
   - Click **Generate Token**, select scopes `whatsapp_business_messaging` and `whatsapp_business_management`, and choose **Never Expire**.
   - Copy token → set as `META_ACCESS_TOKEN`.
5. Under **WhatsApp** → **Configuration** → **Webhooks**:
   - Callback URL: `https://api.universebyte.com/api/v1/whatsapp/webhook`
   - Verify Token: supply `META_WEBHOOK_VERIFY_TOKEN` (e.g. `universebyte_webhook_verify_token_2026`).
   - Subscribe to field: `messages`.

---

## 4. Secret Rotation Runbook

1. **JWT Access/Refresh Secret Rotation:**
   - Updating `JWT_ACCESS_SECRET` will require logged-in users to re-authenticate or refresh their token.
   - Updating `JWT_REFRESH_SECRET` will terminate existing refresh sessions and prompt users to log in again.
2. **Groq API Key Rotation:**
   - Update `GROQ_API_KEY` in Render environment settings and trigger a redeploy. Zero database changes are needed.
3. **Meta WhatsApp Token Rotation:**
   - Generate a new System User Token in Meta Business Suite, update `META_ACCESS_TOKEN` in Render, and click save.

