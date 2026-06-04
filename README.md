🇧🇷 **Português** | [🇺🇸 English](README.en.md)

---

# Nexus Business Manager

ERP SaaS completo com CRM, Estoque, Financeiro, Agendamento, Dashboard, Controle de Usuários, Relatórios e preparação para Multiempresa.

## Stack

| Camada     | Tecnologia                          |
|------------|-------------------------------------|
| Backend    | Node.js, Fastify, TypeScript        |
| Frontend   | React, Vite, Tailwind CSS           |
| Mobile     | React Native (estrutura inicial)    |
| Banco      | MySQL (mysql2 + migrações SQL)      |
| Autenticação | JWT (bcryptjs)                    |
| Validação  | Zod                                 |

## Estrutura

```
nexusbusinessmanager/
├── backend/          → API REST (Fastify + TypeScript)
│   ├── src/modules/  → Módulos (auth, users, clients, products, etc)
│   ├── src/shared/   → Middlewares, utils, conexão DB
│   └── database/migrations/ → Migrações SQL
├── frontend/         → SPA React (Vite + Tailwind)
│   └── src/pages/    → Páginas por módulo
├── mobile/           → App React Native (estrutura inicial)
├── web/              → Estrutura web alternativa
├── database/         → Schema e seed SQL
├── docs/             → Documentação (roadmap, arquitetura)
└── assets/           → Logo e recursos de branding
```

## Instalação

```bash
# 1. Clonar o repositório
git clone <repo-url>
cd nexusbusinessmanager

# 2. Backend
cd backend
npm install
cp .env.example .env   # Configurar variáveis
npm run migrate        # Executar migrações
npm run seed           # Dados iniciais
npm run dev            # Iniciar API (porta 3000)

# 3. Frontend
cd ../frontend
npm install
npm run dev            # Iniciar (porta 5173)
```

## Variáveis de Ambiente (.env)

```env
PORT=3000
JWT_SECRET=seu_secret_aqui
JWT_EXPIRES_IN=8h
DB_HOST=localhost
DB_PORT=3306
DB_NAME=nexus_business_manager
DB_USER=root
DB_PASSWORD=
```

## Módulos Implementados

| Módulo       | Rotas                          | Descrição                          |
|--------------|--------------------------------|------------------------------------|
| Autenticação | `/api/auth/*`                  | Login JWT + perfil                 |
| Usuários     | `/api/users/*`                 | CRUD com papéis (admin/gerente/operador/visualizador) |
| Clientes     | `/api/clients/*`               | CRM completo com busca e paginação |
| Produtos     | `/api/products/*`              | CRUD com SKU único e imagem        |
| Estoque      | `/api/stock/*`                 | Movimentações (entrada/saída)      |
| Fornecedores | `/api/suppliers/*`             | Cadastro com busca                 |
| Compras      | `/api/purchases/*`             | Pedidos + recebimento + estoque    |
| Vendas       | `/api/sales/*`                 | Vendas com baixa de estoque        |
| Financeiro   | `/api/financial/*`             | Receitas, despesas, fluxo de caixa |
| Agendamentos | `/api/appointments/*`          | Calendário com clientes            |
| Dashboard    | `/api/dashboard`               | Indicadores e gráficos             |
| Relatórios   | `/api/reports/*`               | JSON, PDF (pdfkit) e Excel (exceljs) |
| Notificações | `/api/notifications/*`         | Alertas de estoque, contas, agenda |
| Auditoria    | `/api/audit/*`                 | Logs de ações (CRUD, login, export)|
| Empresas     | `/api/companies/*`             | Gestão de empresas (multi-tenant)  |

## Segurança

- Autenticação JWT em todas as rotas privadas
- Hierarquia de permissões (admin > gerente > operador > visualizador)
- Rate limiting (5 tentativas/15min no login, 100 req/min global)
- Headers de segurança (Helmet: XSS, CSP, HSTS, Frame Guard)
- Validação com Zod em todas as entradas
- Senhas com bcryptjs (hash + salt)
- Isolamento multiempresa via `company_id`

## API Response Padrão

```json
// Sucesso
{ "success": true, "data": { ... } }

// Lista paginada
{ "success": true, "data": [...], "total": 100, "page": 1, "limit": 20, "totalPages": 5 }

// Erro
{ "success": false, "message": "Mensagem amigável", "errorCode": "ERROR_CODE" }
```

## Design System

Paleta oficial:

- Black Cherry: `#1A0D12` (fundo)
- Rose Gold: `#B76E79` (ações primárias)
- Champagne Gold: `#D6B370` (destaques)
- Ivory Smoke: `#F7F2EC` (texto)
- Graphite Wine: `#32252B` (cards/superfícies)

## Licença

MIT
