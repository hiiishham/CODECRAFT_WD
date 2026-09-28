# StaffPulse — Production Architecture & Implementation Plan

StaffPulse is a modern, enterprise-grade Employee Management SaaS (MERN stack) providing role-based workforce management, live operational analytics, attendance tracking, leave workflows, task pipelines, confidential payroll management, and real-time Socket.IO notifications.

---

## 1. System Architecture

```
                    ┌─────────────────────────┐
                    │    React Client (Vite)  │
                    │  TailwindCSS / Lucide   │
                    └───────────┬─────────────┘
                                │ HTTP / WebSocket
                                ▼
                    ┌─────────────────────────┐
                    │  Node.js / Express API  │
                    │  JWT Auth & RBAC Guard  │
                    └─────┬─────────────┬─────┘
                          │             │
              Mongoose    │             │ Real-time Events
                          ▼             ▼
       ┌────────────────────────┐  ┌───────────────────────┐
       │     MongoDB Atlas      │  │     Socket.IO Hub     │
       │ (10+ Indexed Schemas)  │  │ (Role-scoped rooms)   │
       └────────────────────────┘  └───────────────────────┘
```

- **Frontend**: Single Page Application built with React 19, Vite, React Router 7, Context API, Recharts, and Vanilla/TailwindCSS design system.
- **Backend API**: Node.js & Express RESTful API with modular route controllers, rate limiting, and security middleware.
- **Database**: MongoDB with Mongoose ODM utilizing indexed schemas, aggregation pipelines, and referential integrity.
- **Real-Time Communication**: Socket.IO server emitting event-driven updates for tasks, leave approvals, announcements, and notifications.
- **File Storage**: Multi-tier storage with local disk streaming fallback and Cloudinary cloud integration.

---

## 2. Role-Based Access Control (RBAC)

The application enforces strict three-tier authorization across API endpoints and client routes:

| Capability / Resource | Super Admin | Department Manager | Employee |
| :--- | :---: | :---: | :---: |
| **Global Dashboard & Metrics** | Full Access (`/dashboard`) | Team-Scoped (`/manager/dashboard`) | Self-Scoped (`/employee/dashboard`) |
| **Employee Management** | Full CRUD, Role Assignment | Read Team Members | View Own Profile |
| **Department Management** | Full CRUD | Read-Only | Read-Only |
| **Attendance Tracking** | Org-wide logs & live monitor | Team check-in status | Check-in / Check-out, Own logs |
| **Leave Management** | View all, Final override | Approve / Reject team requests | Apply, cancel own pending leaves |
| **Tasks & Submissions** | Assign any, review any | Assign to team, review work | Update progress, submit deliverables |
| **Performance & Goals** | Org-wide reviews & goals | Review team, assign team goals | View personal goals & reviews |
| **Confidential Payroll** | Full access to salary records | No access | View own confidential salary slips |
| **Document Vault** | Upload, manage all documents | View team documents | Upload & view own documents |
| **System Settings & Audit** | Full configuration & logs | No access | No access |

---

## 3. Database Schema Architecture

The database schema models genuine enterprise HR workflows:

1. **Admin / Auth Account (`Admin.js`)**: Handles authentication, bcrypt passwords (rounds = 10), roles (`admin`, `manager`, `employee`), `mustChangePassword` state, and OTP reset cooldowns.
2. **Employee (`Employee.js`)**: Stores professional profiles, employee IDs (`EMP-xxx`), department, designation, salary, joining date, and manager reference (`manager` ObjectId ref to `Admin`).
3. **Department (`Department.js`)**: Tracks organizational departments, heads of department, and active status.
4. **Attendance (`Attendance.js`)**: Records check-in, check-out, duration, and status (`Present`, `Late`, `Half Day`, `Absent`) with daily compound indexing (`{ employee: 1, date: 1 }`).
5. **Leave (`Leave.js`)**: Tracks leave type (`Annual`, `Casual`, `Medical`, `Unpaid`), date ranges, status, and manager approval audit trails.
6. **Task (`Task.js`)**: Manages title, description, priority, progress percentage, assigned employee, creator, due date, and attachments.
7. **WorkSubmission (`WorkSubmission.js`)**: Handles employee work submissions, revision requests, review notes, and file attachments.
8. **Salary (`Salary.js`)**: Confidential payroll records tracking base salary, allowances, deductions, net salary, pay period, and payment status.
9. **Goal (`Goal.js`) & Performance (`Performance.js`)**: Tracks measurable milestones, target deadlines, performance ratings, and appraisal notes.
10. **Notification (`Notification.js`)**: Real-time persisted alerts with recipient binding, read receipts, and priority levels.
11. **Announcement (`Announcement.js`)**: Organization-wide or department-targeted broadcasts.
12. **AuditLog (`AuditLog.js`)**: Immutable audit trail capturing actor, action, IP, user-agent, and metadata.

---

## 4. Key Security Implementations

- **Password Protection**: Passwords hashed using `bcryptjs` with auto-salt generation; pre-save hooks prevent double-hashing.
- **Stateless JWT**: Signed with `JWT_SECRET`, verified on every private request via `protect` middleware.
- **IDOR Protection**: Controllers enforce that employees cannot read or manipulate records belonging to other employees.
- **Sensitive Data Scrubbing**: Audit logs strip credentials and passwords before persistence.
- **Rate Limiting**: `express-rate-limit` prevents brute-force login attempts and API abuse.
- **Security Headers**: `helmet` enforces strict HTTP headers.
- **CORS Allowlist**: Configured origins with credentials support for local and production domains.

---

## 5. Deployment & Execution Workflow

### Backend (`server/`)
```bash
# Install dependencies
npm install

# Run database seed (idempotent, preserves Super Admin)
node src/utils/seedStaffPulse.js

# Start production server
npm start
```

### Frontend (`client/`)
```bash
# Install dependencies
npm install

# Compile production bundle
npm run build

# Preview build
npm run preview
```

### Environment Configuration
- Backend requires: `PORT`, `NODE_ENV`, `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
- Frontend requires: `VITE_API_URL` (defaults to `/api` or custom backend domain).
