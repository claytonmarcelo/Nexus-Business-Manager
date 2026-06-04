[🇧🇷 Português](README.md) | 🇺🇸 **English**

---

# Nexus Business Manager

Complete SaaS ERP with CRM, Inventory, Financial, Scheduling, Dashboard, User Management, Reports, and Multi-company support.

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Backend    | Node.js, Fastify, TypeScript      |
| Frontend   | React, Vite, Tailwind CSS         |
| Mobile     | React Native (initial structure)  |
| Database   | MySQL (mysql2 + SQL migrations)   |
| Auth       | JWT (bcryptjs)                    |
| Validation | Zod                               |

## Structure

```
nexusbusinessmanager/
├── backend/          → REST API (Fastify + TypeScript)
│   ├── src/modules/  → Modules (auth, users, clients, products, etc)
│   ├── src/shared/   → Middlewares, utils, DB connection
│   └── database/migrations/ → SQL migrations
├── frontend/         → SPA React (Vite + Tailwind)
│   └── src/pages/    → Pages by module
├── mobile/           → React Native app (initial structure)
├── web/              → Alternative web structure
├── database/         → Schema and SQL seed
├── docs/             → Documentation (roadmap, architecture)
└── assets/           → Logo and branding resources
```

## Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd nexusbusinessmanager

# 2. Backend
cd backend
npm install
cp .env.example .env   # Configure variables
npm run migrate        # Run migrations
npm run seed           # Initial data
npm run dev            # Start API (port 3000)

# 3. Frontend
cd ../frontend
npm install
npm run dev            # Start (port 5173)
```

## Environment Variables (.env)

```env
PORT=3000
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=8h
DB_HOST=localhost
DB_PORT=3306
DB_NAME=nexus_business_manager
DB_USER=root
DB_PASSWORD=
```

## Implemented Modules

| Module       | Routes                         | Description                          |
|--------------|--------------------------------|--------------------------------------|
| Auth         | `/api/auth/*`                  | JWT login + profile                  |
| Users        | `/api/users/*`                 | CRUD with roles (admin/manager/operator/viewer) |
| Clients      | `/api/clients/*`               | Full CRM with search and pagination  |
| Products     | `/api/products/*`              | CRUD with unique SKU and image       |
| Stock        | `/api/stock/*`                 | Movements (in/out)                   |
| Suppliers    | `/api/suppliers/*`             | Registration with search             |
| Purchases    | `/api/purchases/*`             | Orders + receiving + stock           |
| Sales        | `/api/sales/*`                 | Sales with stock deduction           |
| Financial    | `/api/financial/*`             | Revenue, expenses, cash flow         |
| Appointments | `/api/appointments/*`          | Calendar with clients                |
| Dashboard    | `/api/dashboard`               | KPIs and charts                      |
| Reports      | `/api/reports/*`               | JSON, PDF (pdfkit) and Excel (exceljs) |
| Notifications| `/api/notifications/*`         | Alerts for stock, bills, schedule    |
| Audit        | `/api/audit/*`                 | Action logs (CRUD, login, export)    |
| Companies    | `/api/companies/*`             | Company management (multi-tenant)    |

## Security

- JWT authentication on all private routes
- Role hierarchy (admin > manager > operator > viewer)
- Rate limiting (5 attempts/15min on login, 100 req/min global)
- Security headers (Helmet: XSS, CSP, HSTS, Frame Guard)
- Zod validation on all inputs
- bcryptjs password hashing
- Multi-tenant isolation via `company_id`

## Standard API Response

```json
// Success
{ "success": true, "data": { ... } }

// Paginated list
{ "success": true, "data": [...], "total": 100, "page": 1, "limit": 20, "totalPages": 5 }

// Error
{ "success": false, "message": "User-friendly message", "errorCode": "ERROR_CODE" }
```

## Design System

Official palette:

- Black Cherry: `#1A0D12` (background)
- Rose Gold: `#B76E79` (primary actions)
- Champagne Gold: `#D6B370` (highlights)
- Ivory Smoke: `#F7F2EC` (text)
- Graphite Wine: `#32252B` (cards/surfaces)

## License

MIT
