[🇧🇷 Português](README.md) | 🇺🇸 **English**

---

<p align="center">
  <img src="assets/logo.png" alt="Nexus Business Manager" width="200"/>
</p>

<h1 align="center">Nexus Business Manager</h1>

<p align="center">
  <strong>Complete SaaS ERP for Business Management</strong>
  <br/>
  CRM • Inventory • Financial • Scheduling • Reports
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="Node"/>
  <img src="https://img.shields.io/badge/typescript-5.5-blue" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/react-18-61dafb" alt="React"/>
  <img src="https://img.shields.io/badge/fastify-4.28-000000" alt="Fastify"/>
  <img src="https://img.shields.io/badge/mysql-8.0-orange" alt="MySQL"/>
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License"/>
  <img src="https://img.shields.io/badge/coverage-20%20tests-brightgreen" alt="Tests"/>
</p>

---

## Overview

**Nexus Business Manager** is a complete SaaS ERP system developed for small and medium businesses. It brings together CRM, inventory control, financial management, scheduling, reports, and more in a single platform.

### Problem Solved

Small businesses need multiple tools to manage clients, inventory, finances, and schedules. Nexus unifies everything in one system with web and mobile access, multi-user support, and centralized data.

### Target Audience

- Retail stores
- Service providers
- Small manufacturers
- Freelance professionals
- Offices and clinics

---

## Tech Stack

| Layer       | Technology                         |
|-------------|------------------------------------|
| **Backend** | Node.js, Fastify, TypeScript       |
| **Frontend**| React 18, Vite, Tailwind CSS       |
| **Mobile**  | React Native (initial structure)   |
| **Database**| MySQL 8+ (mysql2 + Prisma)         |
| **Auth**    | JWT (bcryptjs)                     |
| **Validation** | Zod                             |
| **Tests**   | Vitest                             |
| **CI/CD**   | GitHub Actions                     |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│           React + Vite + Tailwind                │
│         (SPA - http://localhost:5173)             │
└────────────────────┬────────────────────────────┘
                     │  REST API (JSON)
                     ▼
┌─────────────────────────────────────────────────┐
│                   Backend                        │
│        Fastify + TypeScript + Zod                │
│          (API - http://localhost:3333)            │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐ │
│  │  Modules  │  │   JWT    │  │  Permissions   │ │
│  │  (15)     │◄─┤   Auth   │◄─┤  (Hierarchy)   │ │
│  └──────────┘  └──────────┘  └────────────────┘ │
│         │                                         │
│         ▼                                         │
│  ┌─────────────────────────────────────────────┐ │
│  │         MySQL (Multi-tenant)                │ │
│  │   company_id isolation in all queries       │ │
│  │   + audit logging per action                │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Auth Flow

```
Client ──▶ POST /api/auth ──▶ Validate (Zod) ──▶ bcrypt.compare ──▶ JWT
   ▲                                                                │
   └────────────────── Bearer Token ───────────────────────────────┘
```

---

## Features

- **JWT Authentication** — Secure login with renewable tokens
- **Role Hierarchy** — admin > manager > operator > viewer
- **Multi-tenant (SaaS)** — Data isolation via `company_id`
- **Full CRUD** — 15 modules with create, edit, search, pagination
- **Audit** — All actions logged with IP and changed data
- **Reports** — Export in JSON, PDF, and Excel
- **Notifications** — Low stock alerts, due bills, scheduled events
- **Dashboard** — KPIs, revenue/expense charts, sales
- **Rate Limiting** — Abuse protection (5 login attempts, 100 req/min)
- **Security** — Helmet (XSS, CSP, HSTS), Zod validation, bcryptjs

---

## Screenshots

> Screenshots are available at [`docs/screenshots/`](docs/screenshots/README.md).
>
> To generate images, start the project and visit `http://localhost:5173`.

---

## Installation

### Prerequisites

- Node.js >= 20
- MySQL >= 8
- Git

### Step by Step

```bash
# 1. Clone the repository
git clone https://github.com/claytonmarcelo/Nexus-Business-Manager.git
cd nexusbusinessmanager

# 2. Set up the database
mysql -u root -p < database/schema.sql

# 3. Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run migrate
npm run seed
npm run dev            # API at http://localhost:3333

# 4. Frontend
cd ../frontend
npm install
npm run dev            # App at http://localhost:5173
```

### Demo Data

```bash
cd backend
npm run demo-seed
```

Access with:
- **Email:** `admin@nexusdemo.com`
- **Password:** `123456`

---

## Environment Variables (.env)

```env
PORT=3000
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=8h
LOG_LEVEL=debug
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_NAME=nexus_business_manager
DB_USER=root
DB_PASSWORD=
```

---

## Modules

| Module       | Routes                  | Description                          |
|--------------|-------------------------|--------------------------------------|
| Auth         | `/api/auth/*`           | JWT login + profile                  |
| Users        | `/api/users/*`          | CRUD with roles                      |
| Clients      | `/api/clients/*`        | Full CRM with search and pagination  |
| Products     | `/api/products/*`       | CRUD with unique SKU and image       |
| Stock        | `/api/stock/*`          | Movements (in/out)                   |
| Suppliers    | `/api/suppliers/*`      | Registration with search             |
| Purchases    | `/api/purchases/*`      | Orders + receiving + stock           |
| Sales        | `/api/sales/*`          | Sales with stock deduction           |
| Financial    | `/api/financial/*`      | Revenue, expenses, cash flow         |
| Appointments | `/api/appointments/*`   | Calendar with clients                |
| Dashboard    | `/api/dashboard`        | KPIs and charts                      |
| Reports      | `/api/reports/*`        | JSON, PDF, and Excel                 |
| Notifications| `/api/notifications/*`  | Stock alerts, bills, schedule        |
| Audit        | `/api/audit/*`          | Action logs (CRUD, login, export)    |
| Companies    | `/api/companies/*`      | Multi-tenant company management      |

---

## Roadmap

- [x] Phase 1 — Foundation (structure, design system, database)
- [x] Phase 2 — Authentication (login, JWT, permissions)
- [x] Phase 3 — Dashboard (KPIs, charts)
- [x] Phase 4 — CRM (clients, history)
- [x] Phase 5 — Inventory (products, movements)
- [x] Phase 6 — Financial (accounts, cash flow)
- [x] Phase 7 — Scheduling (calendar, events)
- [x] Phase 8 — SaaS (multi-company, plans)
- [ ] Phase 9 — App marketplace
- [ ] Phase 10 — BI and business intelligence

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file and the explanation at [docs/en/license-en.md](docs/en/license-en.md).

---

## Author

**C. Marcelo Dev.**

[![GitHub](https://img.shields.io/badge/GitHub-claytonmarcelo-181717?logo=github)](https://github.com/claytonmarcelo)
[![YouTube](https://img.shields.io/badge/YouTube-CMarceloDev-FF0000?logo=youtube)](https://youtube.com/@cmarcelodev)
[![Portfolio](https://img.shields.io/badge/Portfolio-cmarcelodev.com-000000?logo=vercel)](https://cmarcelodev.com)

---

<p align="center">Built with ❤️ by C. Marcelo Dev. Brazil</p>
