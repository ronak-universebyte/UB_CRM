# API_DOCUMENTATION.md – UniverseByte CRM

> **UniverseByte – Technology Redefined**  
> REST API Specification (Version 1.0)  
> Base URL: `/api/v1`

---

## 1. Global API Standards & Conventions

### 1.1 Content Types & Headers
All requests containing payloads must specify:
```http
Content-Type: application/json
Accept: application/json
```

Authenticated endpoints require the JWT Bearer token:
```http
Authorization: Bearer <access_token>
```

### 1.2 Standard Success Response Envelope
All successful API responses return HTTP status code `200` or `201` wrapped in a uniform JSON envelope:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation completed successfully.",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalRecords": 154,
    "totalPages": 8
  }
}
```

### 1.3 Standard Error Response Envelope
Errors return appropriate HTTP `4xx` or `5xx` codes with structured diagnostic messages:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed for one or more fields.",
  "errors": [
    {
      "field": "phone",
      "message": "Phone number must be a valid 10-digit mobile number"
    }
  ],
  "timestamp": "2026-11-03T12:00:00.000Z"
}
```

---

## 2. Authentication & Session Management (`/api/v1/auth`)

### 2.1 User Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "counselor@universebyte.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Login successful.",
    "data": {
      "user": {
        "id": "6732f91bc9a4b08d2489e101",
        "fullName": "Jane Doe",
        "email": "counselor@universebyte.com",
        "role": "Counselor",
        "permissions": ["leads:read:assigned", "leads:update"]
      },
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```

### 2.2 Token Refresh
- **Endpoint:** `POST /api/v1/auth/refresh-token`
- **Access:** Public (Requires valid Refresh Token in HTTP-only cookie or request body)
- **Request Body:**
  ```json
  {
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Access token refreshed.",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```

### 2.3 Current Authenticated User Profile
- **Endpoint:** `GET /api/v1/auth/me`
- **Access:** Authenticated (All roles)
- **Response `200 OK`:** Returns current user profile object.

### 2.4 User Logout
- **Endpoint:** `POST /api/v1/auth/logout`
- **Access:** Authenticated
- **Response `200 OK`:** Clears refresh token cookie and invalidates session.

---

## 3. User Management & Administration (`/api/v1/users`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/users` | `SuperAdmin`, `Admin` | List staff users with pagination and role filters |
| `POST` | `/api/v1/users` | `SuperAdmin`, `Admin` | Create a new staff account (counselor, trainer, etc.) |
| `GET` | `/api/v1/users/counselors` | `Admin`, `CounselorManager` | Get active counselors for lead assignment dropdowns |
| `GET` | `/api/v1/users/:id` | `SuperAdmin`, `Admin` | Retrieve user profile by ID |
| `PUT` | `/api/v1/users/:id` | `SuperAdmin`, `Admin` | Update user details, role, or active status |
| `PATCH` | `/api/v1/users/:id/toggle-status` | `SuperAdmin` | Activate/Deactivate staff member account |

---

## 4. Courses & Curriculum (`/api/v1/courses`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/courses` | Authenticated | List all active training courses |
| `GET` | `/api/v1/courses/:id` | Authenticated | Get course details and syllabus outline |
| `POST` | `/api/v1/courses` | `SuperAdmin`, `Admin` | Create a new course |
| `PUT` | `/api/v1/courses/:id` | `SuperAdmin`, `Admin` | Update course syllabus, fee, or duration |
| `DELETE` | `/api/v1/courses/:id` | `SuperAdmin` | Soft-deactivate a course |

---

## 5. Batches & Cohorts (`/api/v1/batches`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/batches` | Authenticated | List batches (filters: `courseId`, `status`, `timingSlot`) |
| `GET` | `/api/v1/batches/upcoming` | Authenticated | Quick list of upcoming batches with available seats |
| `GET` | `/api/v1/batches/:id` | Authenticated | Batch detail including trainer and enrolled student count |
| `POST` | `/api/v1/batches` | `SuperAdmin`, `Admin` | Schedule a new batch cohort |
| `PUT` | `/api/v1/batches/:id` | `SuperAdmin`, `Admin` | Update batch dates, timing, trainer, or status |

---

## 6. Lead & Enquiry Management (`/api/v1/leads`)

### 6.1 Endpoints Overview
| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/leads` | Authenticated | List leads with multi-facet filters & database pagination |
| `GET` | `/api/v1/leads/kanban` | Authenticated | Fetch active leads for Kanban board across all 11 stages |
| `GET` | `/api/v1/leads/:id` | Authenticated | Get full 360-degree lead detail with activity history timeline |
| `POST` | `/api/v1/leads` | Authenticated | Create new enquiry lead with auto-generated ID |
| `PUT` | `/api/v1/leads/:id` | Authenticated | Update lead fields with field-level diff logging |
| `PATCH` | `/api/v1/leads/:id/status` | Authenticated | Update lead pipeline stage & record status audit history |
| `GET` | `/api/v1/leads/check-duplicate`| Authenticated | Live duplicate check for mobile number before entry |
| `POST` | `/api/v1/leads/bulk-assign` | `SuperAdmin`, `Admin`, `MarketingManager` | Bulk assign multiple leads to a counsellor |
| `GET` | `/api/v1/leads/export/csv` | Authenticated | Export filtered leads as RFC-compliant CSV |
| `POST` | `/api/v1/leads/import` | `SuperAdmin`, `Admin`, `MarketingManager` | Batch import leads from CSV data |
| `DELETE` | `/api/v1/leads/:id` | Authenticated (Non-telecaller) | Soft delete lead to trash |
| `PATCH` | `/api/v1/leads/:id/restore` | Authenticated | Restore soft-deleted lead from trash |
| `DELETE` | `/api/v1/leads/:id/permanent` | `SuperAdmin` | Permanently remove lead from database |

### 6.2 The 11 Standardized Pipeline Stages
1. `New`
2. `Not Contacted`
3. `Contacted`
4. `Interested`
5. `Counselling Scheduled`
6. `Demo Scheduled`
7. `Follow-up Required`
8. `Negotiation`
9. `Admission Confirmed`
10. `Not Interested`
11. `Lost`

### 6.3 Update Lead Status Request Example (`PATCH /api/v1/leads/:id/status`)
```json
{
  "status": "Admission Confirmed",
  "notes": "Candidate paid token fee of ₹5,000 for upcoming weekend MERN Full Stack cohort."
}
```

### 6.4 Filter Parameters for `GET /api/v1/leads` and `GET /api/v1/leads/kanban`:
- `page` (number, default: `1` - table list only)
- `limit` (number, default: `20` - table list only)
- `search` (string, matches `studentName`, `mobileNumber`, `whatsappNumber`, `email`, `leadId`)
- `status` (string enum matching the 11 pipeline stages)
- `priority` (string enum: `Hot`, `Warm`, `Cold`)
- `leadSource` (string enum: `Website`, `WhatsApp`, `Google Ads`, `Facebook Ads`, `Instagram`, `Phone Call`, `Walk-in`, `Referral`, `Justdial`, `Other`)
- `interestedCourse` (string enum from the 13 supported courses)
- `assignedCounsellor` (ObjectId user id)
- `startDate` & `endDate` (ISO date filter on `createdAt`)
- `isDeleted` (boolean, default: `false`)
- `sortBy` (`newest`, `oldest`, `priority`, `nextFollowUp`)

### 6.3 Create Lead Request Example (`POST /api/v1/leads`)
```json
{
  "fullName": "Rahul Sharma",
  "phone": "9876543210",
  "email": "rahul.sharma@example.com",
  "city": "Bengaluru",
  "educationQualification": "B.Tech Computer Science",
  "graduationYear": 2025,
  "coursesInterested": ["6732f91bc9a4b08d2489e201"],
  "trainingMode": "Classroom",
  "preferredTimingSlot": "Morning",
  "source": "Website",
  "priority": "Hot",
  "notes": "Interested in placement-guaranteed MERN stack course."
}
```

---

## 7. Follow-Ups & Communication Logs (`/api/v1/followups`)

### 7.1 Endpoints Overview
| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/followups` | Authenticated | Schedule a follow-up with date, time, type & notes (with duplicate slot check) |
| `GET` | `/api/v1/followups` | Authenticated | List follow-ups with section filters (`today`, `upcoming`, `overdue`, `completed`), type, date & pagination |
| `GET` | `/api/v1/followups/:id` | Authenticated | Detailed follow-up record with chronological history audit |
| `PATCH` | `/api/v1/followups/:id/complete`| Authenticated | Mark follow-up as completed with discussion remarks (user action required) |
| `PATCH` | `/api/v1/followups/:id/reschedule`| Authenticated | Reschedule follow-up to a new slot with mandatory rescheduling reason |
| `GET` | `/api/v1/followups/reminders` | Authenticated | Dashboard urgency metrics: overdue count, today count, upcoming & completed |
| `GET` | `/api/v1/followups/counsellor-metrics` | Authenticated | Breakdown of follow-up counts per counsellor (today, overdue, upcoming, total) |
| `GET` | `/api/v1/followups/lead/:leadId` | Authenticated | Complete chronological follow-up list for a given lead |

### 7.2 Schedule Follow-up Request Example (`POST /api/v1/followups`)
```json
{
  "leadId": "6732fa1cc9a4b08d2489e305",
  "scheduledAt": "2026-11-04T11:00:00.000Z",
  "type": "Call",
  "counsellingNotes": "Call candidate to discuss weekend MERN Full Stack syllabus and placement assistance."
}
```

### 7.3 Complete Follow-up Request Example (`PATCH /api/v1/followups/:id/complete`)
```json
{
  "completionRemarks": "Connected with candidate. Discussed curriculum and fee installments. Candidate agreed to attend trial demo.",
  "nextFollowUpDate": "2026-11-08T15:00:00.000Z",
  "nextFollowUpType": "Demo",
  "nextFollowUpNotes": "Confirm demo attendance 2 hours prior."
}
```

### 7.4 Reschedule Follow-up Request Example (`PATCH /api/v1/followups/:id/reschedule`)
```json
{
  "newScheduledAt": "2026-11-06T14:30:00.000Z",
  "rescheduledReason": "Student busy in college exams. Requested callback on Friday afternoon.",
  "type": "WhatsApp"
}
```

---

## 8. Admissions & Student Enrollments (`/api/v1/admissions`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admissions` | Authenticated | List enrolled students with fee balance statuses |
| `GET` | `/api/v1/admissions/:id` | Authenticated | Admission record with installments and payment history |
| `POST` | `/api/v1/admissions/convert` | `Admin`, `CounselorManager`, `Counselor` | Convert qualified Lead into an official Admission |
| `PATCH` | `/api/v1/admissions/:id/batch`| `Admin`, `CounselorManager` | Transfer student to another batch cohort |

### 8.1 Convert Lead to Admission Request Example (`POST /api/v1/admissions/convert`)
```json
{
  "leadId": "6732fa1cc9a4b08d2489e305",
  "courseId": "6732f91bc9a4b08d2489e201",
  "batchId": "6732fb1cc9a4b08d2489e401",
  "standardFee": 45000,
  "discountAmount": 5000,
  "discountReason": "Early Bird Diwali Offer",
  "paymentPlan": "TwoInstallments",
  "installmentsSchedule": [
    { "installmentNo": 1, "dueDate": "2026-11-05T00:00:00.000Z", "amount": 20000 },
    { "installmentNo": 2, "dueDate": "2026-12-05T00:00:00.000Z", "amount": 20000 }
  ],
  "initialPayment": {
    "amount": 20000,
    "paymentMethod": "UPI",
    "transactionReference": "UPI/2026/894721"
  }
}
```

---

## 9. Payments & Fee Collection (`/api/v1/payments`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/payments` | `SuperAdmin`, `Admin`, `Accountant` | Filter payment transactions by date, method, or student |
| `GET` | `/api/v1/payments/:id` | Authenticated | Retrieve receipt invoice payload |
| `POST` | `/api/v1/payments` | `SuperAdmin`, `Admin`, `Accountant` | Record an installment payment receipt |

---

## 10. Analytics & Executive Reports (`/api/v1/analytics`)

All endpoints require authentication (`Bearer <token>`). Counsellor and Telecaller roles are automatically scoped to their assigned records.

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/analytics/cards` | All authenticated roles | 10 Core KPI Cards (total, today, new, contacted, interested, followUpDue, overdue, admissionConfirmed, lostLeads, conversionRate) |
| `GET` | `/api/v1/analytics/charts` | All authenticated roles | 6 Aggregated Visualizations (dailyGeneration, monthlyGeneration, sourceDistribution, courseDistribution, counsellorPerformance, admissionConversionTrends) |
| `GET` | `/api/v1/analytics/reports` | All authenticated roles | Domain Report Records (`source`, `course`, `counsellor`, `admission`, `lost`, `followup`, `campaign`) |
| `GET` | `/api/v1/analytics/reports/export` | All authenticated roles | RFC-compliant CSV download for active report & date filter |

### Query Parameters
- `preset`: `today` | `yesterday` | `last7days` | `last30days` | `thismonth` | `custom` (Default: `last30days`)
- `startDate`: ISO Date string (Required when `preset=custom`)
- `endDate`: ISO Date string (Required when `preset=custom`)
- `counsellorId`: ObjectId string (Optional filter for SuperAdmin, Admin, MarketingManager)
- `reportType`: `source` | `course` | `counsellor` | `admission` | `lost` | `followup` | `campaign` (Required for `/reports` and `/reports/export`)

---

## 11. WhatsApp Integration & Cloud API (`/api/v1/whatsapp`)

Dual communication system providing Manual Click-to-WhatsApp (Method A) and Official Meta WhatsApp Cloud API (Method B).

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/whatsapp/config` | Authenticated | Configuration status & Meta credentials check (secrets masked) |
| `GET` | `/api/v1/whatsapp/templates` | Authenticated | Pre-built message templates in English, Hindi, and Hinglish |
| `POST` | `/api/v1/whatsapp/generate-message` | Authenticated | Generates personalized message & `wa.me` Click-to-WhatsApp URL |
| `POST` | `/api/v1/whatsapp/record-attempt` | Authenticated | Records manual Click-to-WhatsApp attempt (`status: 'attempted'`) & logs lead activity |
| `POST` | `/api/v1/whatsapp/send-official` | Authenticated | Dispatches official template message via Meta Cloud API |
| `GET` | `/api/v1/whatsapp/messages/lead/:leadId` | Authenticated | Communication history for a specific lead |
| `GET` | `/api/v1/whatsapp/logs` | Authenticated | Paginated communication audit logs (filter by method, status, phone) |
| `GET` | `/api/v1/whatsapp/webhook` | Public (Meta Hub) | Meta Webhook subscription verification challenge |
| `POST` | `/api/v1/whatsapp/webhook` | Public (Meta Event) | Ingests real-time status updates (`delivered`, `read`) and inbound messages |

---

## 12. UniverseByte AI CRM Assistant (`/api/v1/ai`)

Predictive lead conversion scoring, intelligent counselling recommendations, multilingual message generation, and lost lead conversion analytics powered by Groq Cloud API (`llama-3.3-70b-versatile`) with local intelligent heuristic fallback.

All endpoints require JWT Bearer authentication (`requireAuth`) and are subject to dedicated rate limiting (60 req / 15 min). All AI recommendations are advisory (`isSuggestion: true`) and never mutate lead state automatically. Student PII is strictly stripped before prompting external LLM engines.

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/ai/status` | Authenticated | Configuration status, active model, and supported AI capabilities |
| `GET` | `/api/v1/ai/score/:leadId` | Authenticated | Predictive conversion score (0-100), category (`Hot`/`Warm`/`Cold`), priority, and reasoning |
| `GET` | `/api/v1/ai/followup-advice/:leadId` | Authenticated | Next best action recommendation, contact window timing, and call opening script |
| `POST` | `/api/v1/ai/generate-message` | Authenticated | Multi-lingual message generation in English, Hindi (Devanagari), and Hinglish with customizable tone |
| `GET` | `/api/v1/ai/summary/:leadId` | Authenticated | Executive conversation summary, key counselling notes, and unanswered questions / candidate hesitations |
| `GET` | `/api/v1/ai/lost-analysis` | Authenticated | Dropped lead conversion analysis, objection driver breakdowns with percentages, and AI remediation strategies |

### AI Request / Response Examples

#### 1. Generate Multilingual Message (`POST /api/v1/ai/generate-message`)
**Request Body:**
```json
{
  "studentName": "Aarav Patel",
  "course": "MERN Full Stack",
  "scenario": "followup",
  "language": "hi",
  "tone": "motivational",
  "extraInstructions": "mention weekend batch starts this Saturday"
}
```
**Response `200 OK`:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "AI personalized message generated",
  "data": {
    "messageBody": "नमस्ते Aarav ji! आशा है आप कुशल हैं। आपके MERN Full Stack कोर्स के प्रति उत्साह को देखते हुए, हम आपको बताना चाहते हैं कि हमारा विशेष वीकेंड बैच इस शनिवार से शुरू हो रहा है। क्या हम आपकी सीट आरक्षित करें? – UniverseByte",
    "tone": "motivational",
    "language": "hi",
    "callToAction": "सीट आरक्षित करने हेतु संपर्क करें",
    "studentName": "Aarav Patel",
    "course": "MERN Full Stack",
    "isSuggestion": true,
    "disclaimer": "AI recommendations are suggestions for staff discretion. Lead statuses are never changed automatically."
  }
}
```

#### 2. Lead Scoring (`GET /api/v1/ai/score/:leadId`)
**Response `200 OK`:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Lead scored successfully",
  "data": {
    "score": 88,
    "category": "Hot",
    "reasons": [
      "High intent indicated by active inquiry in in-demand course: MERN Full Stack",
      "Recent follow-up interactions indicate responsive candidate",
      "Academic background aligns directly with course prerequisites"
    ],
    "suggestedPriority": "Hot",
    "isSuggestion": true,
    "disclaimer": "AI recommendations are suggestions for staff discretion. Lead statuses are never changed automatically."
  }
}
```

---

## 13. Health & Readiness (`/api/v1/health`)

- **Endpoint:** `GET /api/v1/health`
- **Access:** Public (Render monitoring ping)
- **Response `200 OK`:**
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-11-03T12:00:00.000Z",
    "uptimeSeconds": 3600,
    "database": {
      "state": "connected",
      "host": "cluster0.xxxxx.mongodb.net"
    },
    "memory": {
      "rssMB": 84,
      "heapUsedMB": 42
    }
  }
  ```

