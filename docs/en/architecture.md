# Architecture — Nexus Business Manager

## Overview

SaaS ERP system with modular architecture, REST API built with Fastify + TypeScript, web frontend in React, and mobile app in React Native. MySQL database with multi-tenant isolation via `company_id`.

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│           React + Vite + Tailwind                │
│         (SPA - http://localhost:5173)             │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐ │
│  │  Pages    │  │ AuthCtx  │  │  Components    │ │
│  │  (15)     │  │ (JWT)    │  │  UI (Spinner,  │ │
│  │           │  │          │  │  Skeleton, etc)│ │
│  └──────────┘  └──────────┘  └────────────────┘ │
│         │                                         │
│         ▼ api.get() / fetch()                     │
└─────────┬───────────────────────────────────────┘
          │ HTTP (JSON)
          ▼
┌─────────────────────────────────────────────────┐
│                   Backend                        │
│        Fastify + TypeScript + Zod                │
│          (API - http://localhost:3333)            │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │              Middlewares                      │ │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────┐ │ │
│  │  │Rate Limit│  │  Helmet  │  │    CORS    │ │ │
│  │  └──────────┘  └──────────┘  └────────────┘ │ │
│  └─────────────────────────────────────────────┘ │
│                      │                            │
│  ┌─────────────────────────────────────────────┐ │
│  │           Authentication + JWT               │ │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────┐ │ │
│  │  │ JWT Verify│  │  Role    │  │  Company   │ │ │
│  │  │          │  │  Check   │  │  Isolation │ │ │
│  │  └──────────┘  └──────────┘  └────────────┘ │ │
│  └─────────────────────────────────────────────┘ │
│                      │                            │
│  ┌─────────────────────────────────────────────┐ │
│  │            Modules (15)                      │ │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────┐ │ │
│  │  │   Auth   │  │  Users   │  │  Clients   │ │ │
│  │  ├──────────┤  ├──────────┤  ├────────────┤ │ │
│  │  │ Products │  │  Stock   │  │  Suppliers │ │ │
│  │  ├──────────┤  ├──────────┤  ├────────────┤ │ │
│  │  │Purchases │  │  Sales   │  │  Financial │ │ │
│  │  ├──────────┤  ├──────────┤  ├────────────┤ │ │
│  │  │Appointm. │  │Dashboard │  │  Reports   │ │ │
│  │  ├──────────┤  ├──────────┤  ├────────────┤ │ │
│  │  │Notific.  │  │  Audit   │  │  Companies │ │ │
│  │  └──────────┘  └──────────┘  └────────────┘ │ │
│  └─────────────────────────────────────────────┘ │
│                      │                            │
│  ┌─────────────────────────────────────────────┐ │
│  │  Services + Data Layer                       │ │
│  │  ┌─────────────────────────────────────────┐ │ │
│  │  │   MySQL (mysql2/promise)                 │ │ │
│  │  │   Tables: clients, products, stock,      │ │ │
│  │  │   sales, purchases, transactions, etc    │ │ │
│  │  │   Isolation: company_id in every query   │ │ │
│  │  └─────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## Tech Stack

| Layer      | Technology        |
|------------|-------------------|
| Backend    | Node.js + Fastify |
| Frontend   | React + Vite      |
| Mobile     | React Native      |
| Database   | MySQL             |
| Auth       | JWT               |

## Data Flow

```
Client (Browser/Mobile)
    │
    ▼
React App (SPA) ──▶ API (Fastify) ──▶ Middleware (JWT/Rate/Helmet)
                                              │
                                              ▼
                                    Controller (Zod validation)
                                              │
                                              ▼
                                    Service (Business Logic)
                                              │
                                              ▼
                                    Database (MySQL + company_id)
                                              │
                                              ▼
                                    Response (Standardized JSON)
                                              │
                                              ▼
                                    Client (Renders)
```

## Auth Flow

```
1. POST /api/auth { email, password }
2. Zod validates input
3. bcrypt.compare(password, hash)
4. If OK → generate JWT { userId, companyId, role }
5. Return { token, user }
6. Client stores token in localStorage
7. All subsequent requests: Authorization: Bearer <token>
8. JWT middleware verifies token on every request
```

## Multi-tenancy

Data isolation between companies is achieved via `company_id`:

- All data tables have a `company_id` column
- Every SQL query includes `WHERE company_id = ?`
- The JWT token contains the user's `companyId`
- A user from one company never sees data from another

## Permissions

Role hierarchy validated on every route:

```
admin   (4) — Full access
manager (3) — Managerial operations
operator(2) — Day-to-day operations
viewer  (1) — View only
```

## Security

- **Helmet**: Security HTTP headers (XSS, CSP, HSTS)
- **Rate Limit**: 100 req/min global, 5 attempts/15min on login
- **JWT**: Tokens with configurable expiration
- **bcryptjs**: Hashing with salt
- **Zod**: Strict input validation
- **Audit**: All actions logged with IP and changed data

## Folder Structure

```
backend/       → REST API (Fastify)
  src/
    modules/   → Modules (auth, users, clients, ...)
    shared/    → Middlewares, utils, DB connection
    tests/     → Unit tests (Vitest)
frontend/      → Web frontend (React + Vite)
mobile/        → Mobile app (React Native)
database/      → Migrations and SQL seeds
docs/          → Documentation
assets/        → Static resources (logo, etc)
```
