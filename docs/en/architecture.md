# Architecture — Nexus Business Manager

## Overview

SaaS ERP system with modular architecture, REST API built with Fastify + TypeScript, web frontend in React, and mobile app in React Native.

## Tech Stack

| Layer      | Technology        |
|------------|-------------------|
| Backend    | Node.js + Fastify |
| Frontend   | React + Vite      |
| Mobile     | React Native      |
| Database   | MySQL             |
| Auth       | JWT               |

## Folder Structure

```
backend/    → REST API (Fastify)
web/        → Web frontend (React)
mobile/     → Mobile app (React Native)
database/   → Migrations and seeds
docs/       → Documentation
assets/     → Static resources (logo, etc)
```
