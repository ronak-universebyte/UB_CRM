# ENV_VARS.md – Environment Variables Specification

> **UniverseByte CRM**  
> **Brand:** UniverseByte – Technology Redefined  
> Complete configuration guide for Local Development, Staging, and Render Production.

---

## 1. Security Guidelines

- **Never commit `.env` files to git:** Only committed files are `.env.example` templates.
- **Secret Entropy:** `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be high-entropy cryptographically generated strings of at least 32 characters in production.
  ```bash
  # Generate secure random secret
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **MongoDB Credentials:** Use dedicated database users on MongoDB Atlas with least-privilege role permissions (e.g., `readWrite` only on `universebyte_crm`).

---

## 2. Backend Environment Variables (`backend/.env`)

| Variable Name | Type | Default (Local) | Production Example | Description |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | String | `development` | `production` | Execution environment mode |
| `PORT` | Number | `5000` | `10000` (Render default) | Port for Express HTTP server |
| `API_PREFIX` | String | `/api/v1` | `/api/v1` | Global prefix for all REST routes |
| `MONGODB_URI` | String | _Required_ | `mongodb+srv://user:pass@cluster0...` | MongoDB Atlas cluster connection URI |
| `JWT_ACCESS_SECRET` | String | _Required_ | `9f8e7d6c5b4a...` (32+ chars) | Signing key for short-lived access tokens |
| `JWT_ACCESS_EXPIRY` | String | `15m` | `15m` | Time duration for access token validity |
| `JWT_REFRESH_SECRET`| String | _Required_ | `1a2b3c4d5e6f...` (32+ chars) | Signing key for long-lived refresh tokens |
| `JWT_REFRESH_EXPIRY`| String | `7d` | `7d` | Time duration for refresh token validity |
| `CORS_ORIGIN` | String | `http://localhost:5173` | `https://crm.universebyte.com` | Allowed CORS origins (comma-separated for multiple) |
| `RATE_LIMIT_WINDOW_MS` | Number | `900000` (15 mins) | `900000` | Rate limiting sliding time window in milliseconds |
| `RATE_LIMIT_MAX` | Number | `100` | `100` | Maximum requests per IP in the sliding window |
| `INITIAL_SUPER_ADMIN_NAME` | String | `Super Admin` | `Administrator` | Name for initial seed admin account |
| `INITIAL_SUPER_ADMIN_EMAIL` | String | `admin@universebyte.com`| `owner@universebyte.com` | Email for initial seed admin account |
| `INITIAL_SUPER_ADMIN_PASSWORD` | String | `Admin123!` | _Strong password_ | Password for initial seed admin account |

---

## 3. Frontend Environment Variables (`frontend/.env`)

All Vite frontend environment variables must begin with `VITE_` to be exposed to the client bundle:

| Variable Name | Type | Default (Local) | Production Example | Description |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | String | `http://localhost:5000/api/v1` | `https://universebyte-crm-backend.onrender.com/api/v1` | Base URL of the backend REST API |
| `VITE_APP_TITLE` | String | `UniverseByte CRM` | `UniverseByte CRM` | Application title rendered in head & navbar |
| `VITE_APP_TAGLINE` | String | `UniverseByte – Technology Redefined` | `UniverseByte – Technology Redefined` | Application brand tagline |

---

## 4. Setup Instructions by Environment

### 4.1 Local Development
1. In `backend/`:
   ```bash
   cp .env.example .env
   ```
   Fill in your local or free-tier MongoDB Atlas URI.
2. In `frontend/`:
   ```bash
   cp .env.example .env
   ```

### 4.2 Render Cloud Deployment
When deploying via the Render dashboard or through `render.yaml`:
1. In **universebyte-crm-backend** Web Service:
   - Set `MONGODB_URI` under Environment Variables.
   - Set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` using crypto-random strings.
   - Set `CORS_ORIGIN` to your deployed frontend URL (e.g., `https://universebyte-crm-frontend.onrender.com`).
2. In **universebyte-crm-frontend** Static Site:
   - Set `VITE_API_BASE_URL` to your backend URL (e.g., `https://universebyte-crm-backend.onrender.com/api/v1`).

