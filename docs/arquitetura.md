# Arquitetura — Nexus Business Manager

## Visão Geral

Sistema ERP SaaS com arquitetura modular, API REST em Fastify + TypeScript, frontend web em React e mobile em React Native.

## Stack

| Camada     | Tecnologia        |
|------------|-------------------|
| Backend    | Node.js + Fastify |
| Frontend   | React + Vite      |
| Mobile     | React Native      |
| Banco      | MySQL             |
| Autenticação | JWT             |

## Estrutura de Pastas

```
backend/    → API REST (Fastify)
web/        → Frontend web (React)
mobile/     → Aplicativo mobile (React Native)
database/   → Migrations e seeds
docs/       → Documentação
assets/     → Recursos estáticos (logo, etc)
```
