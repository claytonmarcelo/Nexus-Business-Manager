🇧🇷 **Português** | [🇺🇸 English](README.en.md)

---

<p align="center">
  <img src="assets/logo.png" alt="Nexus Business Manager" width="200"/>
</p>

<h1 align="center">Nexus Business Manager</h1>

<p align="center">
  <strong>ERP SaaS completo para gestão empresarial</strong>
  <br/>
  CRM • Estoque • Financeiro • Agendamento • Relatórios
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

## Visão Geral

O **Nexus Business Manager** é um sistema ERP SaaS completo, desenvolvido para pequenas e médias empresas. Reúne em uma única plataforma módulos de CRM, controle de estoque, gestão financeira, agendamento, relatórios e muito mais.

### Problema Resolvido

Pequenas empresas precisam de múltiplas ferramentas para gerir clientes, estoque, finanças e agenda. O Nexus unifica tudo em um sistema só, com acesso web e mobile, multiusuário e dados centralizados.

### Público-Alvo

- Lojas de varejo
- Prestadores de serviço
- Pequenas indústrias
- Profissionais autônomos
- Escritórios e consultórios

---

## Tecnologias

| Camada      | Tecnologia                          |
|-------------|-------------------------------------|
| **Backend** | Node.js, Fastify, TypeScript        |
| **Frontend**| React 18, Vite, Tailwind CSS        |
| **Mobile**  | React Native (estrutura inicial)    |
| **Banco**   | MySQL 8+ (mysql2 + Prisma)          |
| **Autenticação** | JWT (bcryptjs)                 |
| **Validação** | Zod                                |
| **Testes**  | Vitest                              |
| **CI/CD**   | GitHub Actions                      |

---

## Arquitetura

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│           React + Vite + Tailwind                │
│         (SPA - http://localhost:5173)             │
└────────────────────┬────────────────────────────┘
                     │  API REST (JSON)
                     ▼
┌─────────────────────────────────────────────────┐
│                   Backend                        │
│        Fastify + TypeScript + Zod                │
│          (API - http://localhost:3333)            │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐ │
│  │  Módulos  │  │   JWT    │  │  Permissões    │ │
│  │  (15)     │◄─┤   Auth   │◄─┤  (Hierarquia)  │ │
│  └──────────┘  └──────────┘  └────────────────┘ │
│         │                                         │
│         ▼                                         │
│  ┌─────────────────────────────────────────────┐ │
│  │         MySQL (Multi-tenant)                │ │
│  │   Isolamento por company_id em todas as     │ │
│  │   consultas + auditoria por ação            │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Fluxo de Autenticação

```
Cliente ──▶ POST /api/auth ──▶ Valida (Zod) ──▶ bcrypt.compare ──▶ JWT
   ▲                                                                    │
   └────────────────── Bearer Token ───────────────────────────────────┘
```

---

## Funcionalidades

- **Autenticação JWT** — Login seguro com tokens renováveis
- **Hierarquia de Permissões** — admin > manager > operator > viewer
- **Multiempresa (SaaS)** — Dados isolados por `company_id`
- **CRUD Completo** — 15 módulos com criação, edição, busca e paginação
- **Auditoria** — Todas as ações registradas com IP e dados alterados
- **Relatórios** — Exportação em JSON, PDF e Excel
- **Notificações** — Alertas de estoque baixo, contas a vencer e agenda
- **Dashboard** — Indicadores, gráficos de receitas/despesas e vendas
- **Rate Limiting** — Proteção contra abuso (5 tentativas de login, 100 req/min)
- **Segurança** — Helmet (XSS, CSP, HSTS), validação Zod, bcryptjs

---

## Screenshots

> As capturas de tela estão disponíveis em [`docs/screenshots/`](docs/screenshots/README.md).
>
> Para gerar as imagens, inicie o projeto e acesse `http://localhost:5173`.

---

## Instalação

### Pré-requisitos

- Node.js >= 20
- MySQL >= 8
- Git

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/claytonmarcelo/Nexus-Business-Manager.git
cd nexusbusinessmanager

# 2. Configure o banco de dados
mysql -u root -p < database/schema.sql

# 3. Backend
cd backend
npm install
cp .env.example .env
# Edite .env com suas credenciais
npm run migrate
npm run seed
npm run dev            # API em http://localhost:3333

# 4. Frontend
cd ../frontend
npm install
npm run dev            # App em http://localhost:5173
```

### Dados de Demonstração

```bash
cd backend
npm run demo-seed
```

Acesse com:
- **E-mail:** `admin@nexusdemo.com`
- **Senha:** `123456`

---

## Configuração

### Variáveis de Ambiente (.env)

```env
PORT=3000
JWT_SECRET=seu_secret_aqui
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

## Módulos

| Módulo       | Rotas                  | Descrição                          |
|--------------|------------------------|------------------------------------|
| Autenticação | `/api/auth/*`          | Login JWT + perfil                 |
| Usuários     | `/api/users/*`         | CRUD com papéis                    |
| Clientes     | `/api/clients/*`       | CRM completo com busca e paginação |
| Produtos     | `/api/products/*`      | CRUD com SKU único e imagem        |
| Estoque      | `/api/stock/*`         | Movimentações (entrada/saída)      |
| Fornecedores | `/api/suppliers/*`     | Cadastro com busca                 |
| Compras      | `/api/purchases/*`     | Pedidos + recebimento + estoque    |
| Vendas       | `/api/sales/*`         | Vendas com baixa de estoque        |
| Financeiro   | `/api/financial/*`     | Receitas, despesas, fluxo de caixa |
| Agendamentos | `/api/appointments/*`  | Calendário com clientes            |
| Dashboard    | `/api/dashboard`       | Indicadores e gráficos             |
| Relatórios   | `/api/reports/*`       | JSON, PDF e Excel                  |
| Notificações | `/api/notifications/*` | Alertas de estoque, contas, agenda |
| Auditoria    | `/api/audit/*`         | Logs de ações (CRUD, login, export)|
| Empresas     | `/api/companies/*`     | Gestão de empresas (multi-tenant)  |

---

## Roadmap

- [x] Fase 1 — Fundação (estrutura, design system, banco)
- [x] Fase 2 — Autenticação (login, JWT, permissões)
- [x] Fase 3 — Dashboard (indicadores, gráficos)
- [x] Fase 4 — CRM (clientes, histórico)
- [x] Fase 5 — Estoque (produtos, movimentações)
- [x] Fase 6 — Financeiro (contas, fluxo de caixa)
- [x] Fase 7 — Agendamento (calendário, eventos)
- [x] Fase 8 — SaaS (multiempresa, planos)
- [ ] Fase 9 — Marketplace de aplicativos
- [ ] Fase 10 — BI e inteligência de negócios

---

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) e a explicação em [docs/license-pt-br.md](docs/license-pt-br.md).

---

## Autor

**C. Marcelo Dev.**

[![GitHub](https://img.shields.io/badge/GitHub-claytonmarcelo-181717?logo=github)](https://github.com/claytonmarcelo)
[![YouTube](https://img.shields.io/badge/YouTube-CMarceloDev-FF0000?logo=youtube)](https://youtube.com/@cmarcelodev)
[![Portfolio](https://img.shields.io/badge/Portfolio-cmarcelodev.com-000000?logo=vercel)](https://cmarcelodev.com)

---

<p align="center">Desenvolvido com ❤️ por C. Marcelo Dev. Brasil</p>
