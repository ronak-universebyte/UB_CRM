# AGENTS.md – Permanent Project Rules & Development Guidelines

> **Project:** UniverseByte CRM  
> **Brand:** UniverseByte – Technology Redefined  
> **Purpose:** IT Training Enquiry and Lead Management System  
> **Target Environment:** Node.js + Express + TypeScript (Backend) | React + Vite + TypeScript (Frontend) | MongoDB Atlas (Database) | Render (Hosting)

---

## 1. Absolute Directives & Boundaries

All AI agents, engineers, and contributors working on **UniverseByte CRM** must adhere strictly to these permanent directives. Failure to comply violates project integrity:

1. **Strict Independence (No Code Re-use):**
   - Under no circumstances shall any agent access, inspect, modify, import, reference, or reuse code from the user's existing SMS application or any legacy/previous CRM.
   - Build a completely clean, independent, and greenfield application.
2. **Explicit Technology Stack:**
   - **Frontend:** React + Vite + TypeScript.
   - **Backend:** Node.js + Express + TypeScript.
   - **Database:** MongoDB Atlas via Mongoose ODM.
   - **Styling & UI:** Tailwind CSS and shadcn/ui.
   - **Authentication:** Stateless JWT tokens + HTTP-only refresh tokens with strict Role-Based Access Control (RBAC).
   - **Hosting / PaaS:** Prepared for Render deployment (`render.yaml`).
3. **No Fake or Dummy Production Code:**
   - Never implement stubbed mocks, hardcoded fake arrays, or mock delays pretending to be working features in place of real backend services or database queries.
   - Provide genuine data persistence, transactions, and robust error handling.
4. **Approval Gate Mandate:**
   - Do not begin building functional modules without analyzing requirements, finalizing the architectural blueprints, and obtaining explicit user approval.
5. **Zero Secrets in Source Control:**
   - No credentials, API keys, JWT secrets, database connection strings, or passwords may be hardcoded.
   - All runtime configurations must reside in `.env` files, validated at startup via schema validation (Zod).

---

## 2. Architecture & Design Principles

### 2.1 Backend: Layered Clean Architecture
The backend follows strict separation of concerns across distinct layers:

```
[HTTP Request]
      │
      ▼
[Express Router] (src/routes/)
      │ ──► [Rate Limiter, Helmet, CORS]
      │ ──► [Authentication & RBAC Middleware]
      │ ──► [Zod Request Validation Middleware]
      ▼
[Controller Layer] (src/controllers/)
      │ ──► Extracts validated DTOs, parameters, and user context
      │ ──► Formats standard HTTP responses (200, 201, 400, 404, etc.)
      ▼
[Service Layer] (src/services/)
      │ ──► Core business logic, domain rules, state machines, transactions
      │ ──► No direct req/res objects passed here!
      ▼
[Model / Data Layer] (src/models/)
      │ ──► Mongoose schemas, indexes, schema hooks, and type definitions
      ▼
[MongoDB Atlas Database]
```

#### Strict Layering Rules:
- **Controllers** must NEVER execute Mongoose queries (`find()`, `save()`, etc.) directly. All database access must be encapsulated inside dedicated **Services**.
- **Services** must NEVER receive Express `req` or `res` objects. They accept and return clean, typed TypeScript data transfer objects (DTOs).
- All asynchronous route handlers and service calls must use the centralized `asyncHandler` wrapper or handle exceptions cleanly.
- Errors must throw instances of `ApiError` with explicit HTTP status codes and operational messages.

### 2.2 Frontend: Feature-Driven Component Architecture
The frontend organizes domain functionality by features rather than flat technical categories:

```
frontend/src/
  ├── assets/             # Brand logos, icons, static illustrations
  ├── components/
  │   ├── ui/             # shadcn/ui primitives (Button, Dialog, Input, etc.)
  │   ├── common/         # App-wide UI (DataTable, StatCard, EmptyState, PageHeader)
  │   └── layout/         # Shell components (Sidebar, TopNavbar, Breadcrumbs)
  ├── context/            # Global contexts (AuthContext, ThemeContext)
  ├── features/           # Domain feature modules:
  │   ├── auth/           # Login, PasswordReset, TokenRefresh
  │   ├── leads/          # LeadList, LeadDetail, LeadForm, LeadKanban, StatusUpdate
  │   ├── followups/      # Calendar, FollowupModal, ReminderList
  │   ├── courses/        # CourseCatalog, CourseDetail, SyllabusModal
  │   ├── batches/        # BatchScheduler, BatchList, StudentEnrollment
  │   ├── admissions/     # AdmissionForm, FeeSchedule, ReceiptViewer
  │   ├── reports/        # LeadFunnelChart, CounselorMetrics, SourceReport
  │   └── users/          # UserManagement, RolePermissionsEditor
  ├── hooks/              # Reusable React hooks (useAuth, useDebounce, etc.)
  ├── lib/                # shadcn/ui utils (cn) and Axios configured instances
  ├── routes/             # App routing, ProtectedRoute, RoleGuard
  ├── services/           # Type-safe API client functions
  ├── types/              # Domain interfaces and shared DTOs
  └── utils/              # Date formatters, currency formatters, constants
```

---

## 3. Data Integrity & Validation Standards

1. **Zod Validation at Boundaries:**
   - Every incoming HTTP request body, query parameter, and route parameter must be validated against a strict Zod schema before reaching service logic.
2. **Schema Invariants:**
   - Mongoose schemas must define explicit TypeScript interfaces (`Document` / `HydratedDocument`).
   - Every collection must define required indexes for high-frequency search fields (e.g., `phone`, `email`, `status`, `assignedTo`, `createdAt`).
   - Compound indexes must be added for lead pipeline queries (e.g., `{ assignedTo: 1, status: 1, nextFollowUpDate: 1 }`).
3. **Audit Trails:**
   - Lead transitions, reassignments, fee adjustments, and user authentications must automatically record an immutable `ActivityLog` entry.

---

## 4. Role-Based Access Control (RBAC) Matrix

Every API endpoint and frontend view must be guarded based on least privilege:

| Role | Description | Key Permissions |
| :--- | :--- | :--- |
| **SuperAdmin** | Full system owner | All actions, user creation, role assignment, system configs, audit logs |
| **Admin** | Operations administrator | Manage courses, batches, assign leads, view all analytics, manage counselors |
| **CounselorManager** | Team Lead / Admissions Lead | Reassign team leads, view counselor team KPIs, approve discounts |
| **Counselor** | Admission Executive / Telecaller | View assigned leads, log calls/follow-ups, schedule demos, submit admissions |
| **Accountant** | Accounts & Finance | View admissions, record fee payments, generate receipts, fee reports |
| **Trainer** | Faculty / Instructor | View assigned batches and enrolled student rosters (read-only) |

---

## 5. Coding & Style Conventions

1. **TypeScript:** Strict mode enabled (`"strict": true`). No `any` types allowed. Use `unknown` with narrowing or define explicit interfaces.
2. **Naming Conventions:**
   - Files: `kebab-case` for backend files (`lead.controller.ts`, `lead.service.ts`), `PascalCase` or `kebab-case` for React components (`LeadCard.tsx`, `LeadList.tsx`).
   - Interfaces / Types: `PascalCase` (`ILead`, `CreateLeadDto`, `UserRole`).
   - Variables / Functions: `camelCase` (`findLeadById`, `handleFollowUpSchedule`).
   - Enums / Constants: `UPPER_SNAKE_CASE` or `as const` object mappings.
3. **Imports:**
   - Use path aliases: `@/...` for both frontend and backend.
   - Clean grouping: Third-party packages first, followed by internal modules.

---

## 6. Deployment & Environment Rules

1. **Render Compatibility:**
   - Backend must listen on `process.env.PORT || 5000`.
   - Provide a clean `/api/v1/health` endpoint for Render health checks that verifies database connectivity.
   - Frontend must produce a production-ready static build (`dist`) compatible with Render Static Sites and client-side SPA routing (`/* -> /index.html`).
2. **Graceful Shutdown:**
   - Backend must gracefully terminate Mongoose connections and Express listeners on `SIGTERM` / `SIGINT`.

