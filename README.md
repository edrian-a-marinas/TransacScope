# TransacScope
**Role-Based Business Finance & Transaction Management System**
> A finance management web app built for small businesses on a local network (LAN) — track income and expenses, manage staff access, generate reports, and stay in control of your cash flow.

🔗 **Live:** [transacscope.vercel.app](https://transacscope.vercel.app) &nbsp;·&nbsp; 🎬 **Demo Video:** [Watch here](https://drive.google.com/file/d/1fXCICTBrgaCmMWBpuK1JLUi5SkQ1x5tR/view?usp=sharing)

---

## What It Does

TransacScope gives businesses a centralized system to record every income and expense, control who can do what based on their role, and generate financial reports — daily, weekly, or monthly. Built around a real role hierarchy so owners, managers, and staff each see and do exactly what they're supposed to.

---

## Roles

| Role | What They Can Do |
|------|-----------------|
| **Super Admin** | Full control — users, roles, categories, and all transactions |
| **Admin** | Manages categories, views all transactions, handles deletion requests |
| **Standard User** | Manages their own transactions only, can request deletions |

---

## Features

### 💰 Transactions
- Record income and expenses with category, amount, date, and description
- Edit your own transactions; admins can view everyone's
- Full edit history — every change is logged with who did it and when
- Staff request deletions instead of deleting directly — admins approve or decline
- Soft delete only — nothing is permanently lost, records stay for audit

### 📊 Dashboard & Reports
- Live KPI cards — total income, expenses, net profit, and transaction count
- Charts (Bar, Line and pie charts) — Income vs Expense, Net Profit trend, Category Breakdown
- Recent transactions panel
- Generate reports filtered by date range, type, and user — downloadable as PDF
- Role-aware: admins see everyone, standard users see only their own

### 🗂️ Categories
- Fully customizable income and expense categories
- Admins and Super Admins can add, edit, and delete categories anytime
- Default categories included out of the box for both income and expenses

### 👥 User Management
- View all users with account status and transaction count
- View full transaction history for any specific user
- Super Admin can promote/demote users and deactivate accounts
- Deactivated users are locked to Settings only until they delete their account or get reactivated

### 🔔 Notifications
- Admins get notified when a deletion request comes in
- Users get notified when their request is approved or declined
- Click a notification to jump directly to that request — no hunting around

### 🔒 Security & Backend Hardening
- Email verification on registration — 6-digit code with resend cooldown and max send limit
- JWT authentication on all protected endpoints
- Rate limiting on all critical routes (login, register, create, update, delete) via SlowAPI
- Frontend lockout after 5 failed login attempts — 3-minute countdown timer
- Passwords expire every 90 days — forced change gate before dashboard access
- 7-day password reuse prevention via password history table
- CORS restrictions — only the frontend origin is whitelisted
- Trusted host validation, security headers (HSTS, X-Frame-Options, CSP)
- Environment-based debug gating — no stack traces or internal errors exposed in production

### ⚙️ Settings
- Update profile name and phone number
- Change password with live expiry date shown
- Delete account with a 10-second safety countdown
- Password expiry warning toast appears in the dashboard up to 7 days before expiry

### 🖥️ UX & Interface
- Light and dark mode
- 13 modal components covering every user interaction
- Server status topbar — shows when backend is down and when it reconnects
- Clean role-gated navigation — each role only sees what's relevant to them

---

## Docker

```bash
docker build -t transacscope .
docker run -p 8000:8000 transacscope
```

---

## API Endpoints

37 endpoints across 6 routers — all JWT-protected except `/health` and auth routes.

### Auth `/api/auth`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | Login — returns JWT token |
| POST | `/register` | Register new account with verified code |
| POST | `/send-code` | Send email verification code |
| GET | `/me` | Get current authenticated user |

### Transactions `/api/transactions`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List transactions (own or all, by role) |
| POST | `/` | Create a transaction |
| GET | `/{id}` | Get transaction by ID |
| PUT | `/{id}` | Update a transaction |
| DELETE | `/{id}` | Soft delete a transaction |
| GET | `/history` | Full edit audit log |
| POST | `/request-deletion` | Request deletion (Standard User) |
| GET | `/deletion-requests` | List pending deletion requests (Admin+) |
| PATCH | `/deletion-requests/{id}` | Approve or decline a request |
| DELETE | `/deletion-requests/{id}` | Cancel a deletion request |
| GET | `/deletion-requests/my-history` | Own deletion request history |
| GET | `/count-by-category/{id}` | Transaction count per category |

### Categories `/api/categories`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all categories |
| POST | `/` | Create a category |
| PUT | `/{id}` | Update a category |
| DELETE | `/{id}` | Delete a category |

### Users `/api/users`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all users with transaction count |
| GET | `/me` | Get own profile |
| PATCH | `/me` | Update own profile |
| PATCH | `/me/password` | Change password |
| GET | `/me/password-expiry` | Get password expiry date |
| GET | `/{id}` | Get user by ID |
| PUT | `/{id}/role` | Promote or demote user (Super Admin) |
| PATCH | `/{id}/status` | Activate or deactivate user (Super Admin) |
| DELETE | `/me` | Delete own account |

### Reports `/api/reports`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List generated reports |
| POST | `/generate` | Generate a report |
| GET | `/{id}/download` | Download report as PDF |

### Notifications `/api/notifications`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List notifications |
| PATCH | `/{id}/read` | Mark notification as read |
| PATCH | `/read-all` | Mark all as read |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Backend health check |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python, FastAPI, PostgreSQL, asyncpg, Pydantic, SlowAPI |
| Frontend | React, TypeScript, Vite, Tailwind CSS, Zod, Axios |
| Auth | JWT, bcrypt, email verification |
| Testing | pytest — 42 tests covering auth, transactions, and user management |
| Deployed | Render · Vercel · Supabase |

---

*Built by Edrian Mariñas — 2026*
