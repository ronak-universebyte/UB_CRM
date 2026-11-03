# UniverseByte CRM

> **UniverseByte – Technology Redefined**  
> An enterprise-grade IT Training Enquiry & Lead Management System built for precision, speed, and conversion.

[![Stack](https://img.shields.io/badge/Stack-React_18_%7C_Node.js_%7C_TypeScript_%7C_MongoDB-blue.svg)](#technology-stack)
[![Architecture](https://img.shields.io/badge/Architecture-Clean_Layered_Monorepo-green.svg)](#architecture)
[![Deployment](https://img.shields.io/badge/Deployment-Render_Ready-purple.svg)](#deployment)

---

## 1. Project Purpose & Overview

**UniverseByte CRM** is a dedicated, greenfield customer relationship management platform crafted specifically for IT training institutes. It automates the complete student acquisition and enrollment lifecycle:

- **Enquiry & Lead Capture:** Capture inquiries from website landing pages, ads, walk-ins, phone calls, and campus drives.
- **Lead Pipeline & Scoring:** Track leads through distinct stages from initial discovery to enrollment with real-time urgency scoring (Hot, Warm, Cold).
- **Follow-up & Communication Engine:** Schedule calls, demo sessions, and automated counseling reminders with full history logging.
- **Course & Batch Catalog:** Manage curriculum details, batch timings (Morning, Evening, Weekend), seats, and trainer allocations.
- **Admission & Fee Tracking:** Convert qualified leads into enrolled students with structured installment payment plans and receipts.
- **Role-Based Collaboration:** Empower counselors, team leads, accountants, and administrators with granular role-based security.
- **Executive Analytics:** Real-time visibility into conversion funnels, counselor KPIs, course popularity, and marketing channel ROI.

---

## 2. Technology Stack

### Frontend Application
- **Runtime & Bundler:** [Node.js](https://nodejs.org/) & [Vite](https://vitejs.dev/)
- **Framework:** [React 18](https://react.dev/) with [TypeScript 5](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) with CSS variables
- **Component Primitives:** [shadcn/ui](https://ui.shadcn.com/) (built on Radix UI)
- **Icons:** [Lucide React](https://lucide.dev/)
- **State & Form Management:** React Hooks, React Context API, [React Hook Form](https://react-hook-form.com/), and [Zod](https://zod.dev/)
- **Routing:** [React Router](https://reactrouter.com/) (v7) with role-guarded routes
- **HTTP Client:** [Axios](https://axios-http.com/) with automatic token refresh interceptors

### Backend API
- **Runtime:** [Node.js](https://nodejs.org/) (ES2022+ / ESM)
- **Framework:** [Express.js](https://expressjs.com/) with [TypeScript](https://www.typescriptlang.org/)
- **Database & ODM:** [MongoDB Atlas](https://www.mongodb.com/atlas) with [Mongoose](https://mongoosejs.com/)
- **Authentication & Security:** Stateless JWT (Access + Refresh tokens), [bcryptjs](https://github.com/dcodeIO/bcrypt.js), [Helmet](https://helmetjs.github.io/), CORS, and rate limiting
- **Validation:** [Zod](https://zod.dev/) request schema validation middleware
- **Logging:** [Morgan](https://github.com/expressjs/morgan) HTTP logger and custom structured logger

---

## 3. Repository Architecture

The project is structured as an npm monorepo with clean separation between frontend, backend, and documentation:

```
UB_CRM/
├── backend/                      # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── config/               # DB connection, environment schema, app constants
│   │   ├── controllers/          # HTTP request handlers & response mapping
│   │   ├── services/             # Core business logic & database queries
│   │   ├── models/               # Mongoose schemas, types, and indexes
│   │   ├── routes/               # Express router specifications & middleware hooks
│   │   ├── middlewares/          # Auth, RBAC, Zod validation, error handling
│   │   ├── validators/           # Zod validation schemas
│   │   ├── types/                # Domain TypeScript declarations & Express extensions
│   │   ├── utils/                # ApiError, ApiResponse, asyncHandler, logger
│   │   ├── app.ts                # Express application setup
│   │   └── server.ts             # Server entrypoint & graceful shutdown
│   ├── .env.example              # Backend environment template
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                     # React + Vite + TypeScript Client
│   ├── src/
│   │   ├── assets/               # Branding assets and SVG icons
│   │   ├── components/           # UI primitives (shadcn) and common widgets
│   │   ├── context/              # Authentication & UI theme contexts
│   │   ├── features/             # Feature modules (leads, courses, batches, etc.)
│   │   ├── hooks/                # Custom React hooks
│   │   ├── lib/                  # Utilities (shadcn cn helper, axios client)
│   │   ├── routes/               # Protected and role-guarded route definitions
│   │   ├── services/             # Type-safe API consumer services
│   │   ├── types/                # Frontend TypeScript models
│   │   ├── utils/                # Date, currency, and string formatters
│   │   ├── App.tsx               # Main application container
│   │   └── main.tsx              # React DOM root mounting
│   ├── .env.example              # Frontend environment template
│   ├── components.json           # shadcn/ui configuration
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── docs/                         # In-depth architectural & deployment specs
│   ├── ARCHITECTURE.md           # System design, data flow, and layers
│   └── ENV_VARS.md               # Environment variables specification
│
├── AGENTS.md                     # Permanent rules for AI agents and developers
├── DATABASE_SCHEMA.md            # MongoDB collections, relations, and indexes
├── API_DOCUMENTATION.md          # REST API endpoints, schemas, and error codes
├── DEVELOPMENT_ROADMAP.md        # Phased implementation roadmap & milestones
├── render.yaml                   # Infrastructure-as-code for Render deployment
└── package.json                  # Root monorepo workspace configuration
```

---

## 4. Quick Start & Local Setup

### Prerequisites
- Node.js `>= 20.0.0`
- npm `>= 10.0.0`
- MongoDB Atlas cluster URL or local MongoDB instance

### Installation
Clone the repository and install dependencies using workspaces:

```bash
# Clone the repository
git clone <repository-url> UB_CRM
cd UB_CRM

# Install dependencies across all workspaces
npm install
```

### Environment Configuration

1. **Backend Environment Setup:**
   ```bash
   cp backend/.env.example backend/.env
   ```
   Open `backend/.env` and supply:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`: Secure cryptographic strings (32+ chars).
   - `CORS_ORIGIN`: `http://localhost:5173` (for local Vite dev server).

2. **Frontend Environment Setup:**
   ```bash
   cp frontend/.env.example frontend/.env
   ```
   Verify `VITE_API_BASE_URL` is set to `http://localhost:5000/api/v1`.

### Running in Development

Run both backend and frontend concurrently:
```bash
npm run dev
```

Or run each service individually:
```bash
# Start backend API (with hot reload via tsx watch)
npm run dev:backend

# Start frontend Vite server (http://localhost:5173)
npm run dev:frontend
```

---

## 5. Deployment on Render & Production Operations

This repository includes a native [`render.yaml`](./render.yaml) configuration file for automated deployment:

1. **Backend Service (`universebyte-crm-backend`):**
   - **Type:** Web Service (Node.js)
   - **Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Health Check Path:** `/api/v1/health`

2. **Frontend Service (`universebyte-crm-frontend`):**
   - **Type:** Static Site
   - **Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
   - **SPA Routing Rewrite:** `/* -> /index.html 200` (configured via `frontend/public/_redirects`)

### Production Documentation & Runbooks
- **Deployment Guide:** [`DEPLOYMENT.md`](./DEPLOYMENT.md) – Step-by-step Render setup, custom domain mapping (`crm.universebyte.com`), and SSL certificate provisioning.
- **Environment Setup:** [`ENVIRONMENT_SETUP.md`](./ENVIRONMENT_SETUP.md) – Reference for MongoDB Atlas, JWT cryptographic secrets, Groq AI, and Meta WhatsApp Cloud API credentials.
- **Production Checklist:** [`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md) – 30-point pre-flight, launch, and post-launch verification gate.
- **Backup & Disaster Recovery:** [`BACKUP_RESTORE.md`](./BACKUP_RESTORE.md) – Atlas automated backups, PITR, mongodump/mongorestore commands, and emergency recovery runbooks.

### Production Smoke Tests & Database Initialization
```bash
# Initialize production database indexes and provision initial Super Admin (non-destructive)
npm run db:init

# Run automated production smoke tests against local or deployed environment
npm run smoke:test

# Run production smoke tests against a live deployed Render URL
DEPLOYED_API_URL=https://crm-api.universebyte.com/api/v1 npm run smoke:test
```

---

## 6. Testing & Quality Assurance

UniverseByte CRM features an exhaustive automated testing suite with 100% green verification:

```bash
# Run all unit, integration, and security tests (117 tests across 54 suites)
npm test --workspace=backend

# Run production builds for all workspaces
npm run build
```

Full audit results are documented in [`TEST_REPORT.md`](./TEST_REPORT.md).

---

## 7. Project Rules & Collaboration

All contributors and AI agents must review and strictly follow [AGENTS.md](./AGENTS.md) before writing code.
No code from legacy SMS applications or previous CRMs may be inspected, modified, or incorporated into this repository.

