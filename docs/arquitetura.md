# Arquitetura — Nexus Business Manager

## Visão Geral

Sistema ERP SaaS com arquitetura modular, API REST em Fastify + TypeScript, frontend web em React e mobile em React Native. Banco de dados MySQL com isolamento multiempresa via `company_id`.

## Diagrama da Arquitetura

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│           React + Vite + Tailwind                │
│         (SPA - http://localhost:5173)             │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐ │
│  │  Páginas  │  │ AuthCtx  │  │  Componentes   │ │
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
│  │           Autenticação + JWT                 │ │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────┐ │ │
│  │  │ JWT Verify│  │  Role    │  │  Company   │ │ │
│  │  │          │  │  Check   │  │  Isolation │ │ │
│  │  └──────────┘  └──────────┘  └────────────┘ │ │
│  └─────────────────────────────────────────────┘ │
│                      │                            │
│  ┌─────────────────────────────────────────────┐ │
│  │            Módulos (15)                      │ │
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
│  │  Serviços + Camada de Dados                  │ │
│  │  ┌─────────────────────────────────────────┐ │ │
│  │  │   MySQL (mysql2/promise)                 │ │ │
│  │  │   Tabelas: clients, products, stock,     │ │ │
│  │  │   sales, purchases, transactions, etc    │ │ │
│  │  │   Isolamento: company_id em toda query   │ │ │
│  │  └─────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## Stack

| Camada     | Tecnologia        |
|------------|-------------------|
| Backend    | Node.js + Fastify |
| Frontend   | React + Vite      |
| Mobile     | React Native      |
| Banco      | MySQL             |
| Autenticação | JWT             |

## Fluxo de Dados

```
Cliente (Browser/Mobile)
    │
    ▼
React App (SPA) ──▶ API (Fastify) ──▶ Middleware (JWT/Rate/Helmet)
                                              │
                                              ▼
                                    Controller (Valida Zod)
                                              │
                                              ▼
                                    Service (Regra de Negócio)
                                              │
                                              ▼
                                    Database (MySQL + company_id)
                                              │
                                              ▼
                                    Response (JSON padronizado)
                                              │
                                              ▼
                                    Cliente (Renderiza)
```

## Fluxo de Autenticação

```
1. POST /api/auth { email, password }
2. Zod valida entrada
3. bcrypt.compare(senha, hash)
4. Se OK → gera JWT { userId, companyId, role }
5. Retorna { token, user }
6. Cliente armazena token no localStorage
7. Todas as requisições seguintes: Authorization: Bearer <token>
8. Middleware JWT verifica token a cada request
```

## Multiempresa

O isolamento de dados entre empresas é feito via `company_id`:

- Todas as tabelas de dados possuem coluna `company_id`
- Toda consulta SQL inclui `WHERE company_id = ?`
- O token JWT contém o `companyId` do usuário
- Um usuário de uma empresa nunca vê dados de outra

## Permissões

Hierarquia de cargos validada em cada rota:

```
admin   (4) — Acesso total
manager (3) — Operações gerenciais
operator(2) — Operações do dia a dia
viewer  (1) — Apenas visualização
```

## Segurança

- **Helmet**: Headers HTTP de segurança (XSS, CSP, HSTS)
- **Rate Limit**: 100 req/min global, 5 tentativas/15min no login
- **JWT**: Tokens com expiração configurável
- **bcryptjs**: Hash com salt
- **Zod**: Validação rigorosa de entradas
- **Auditoria**: Log de todas as ações com IP e dados alterados

## Estrutura de Pastas

```
backend/       → API REST (Fastify)
  src/
    modules/   → Módulos (auth, users, clients, ...)
    shared/    → Middlewares, utils, conexão DB
    tests/     → Testes unitários (Vitest)
frontend/      → Frontend web (React + Vite)
mobile/        → App mobile (React Native)
database/      → Migrations e seeds SQL
docs/          → Documentação
assets/        → Recursos estáticos (logo, etc)
```
