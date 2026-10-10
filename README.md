# Nexus Business Manager

ERP SaaS empresarial multiempresa, reconstruído do zero com arquitetura coerente, segurança real e identidade visual Premium Gourmet. Código novo: nenhuma linha do repositório anterior foi transportada; a marca (logo, cores, tipografia de contexto) foi preservada a partir dos assets oficiais.

## Telas reais do sistema

| | |
|---|---|
| Página pública (tema noite) | Login real (JWT + refresh) |
| ![Landing](docs/screenshots/01-landing.png) | ![Login](docs/screenshots/02-login.png) |

| | |
|---|---|
| Dashboard com KPIs reais | Usuários (RBAC + paginação global) |
| ![Dashboard](docs/screenshots/03-dashboard.png) | ![Usuarios](docs/screenshots/04-usuarios.png) |

| | |
|---|---|
| Auditoria corporativa | Configurações em tema dia |
| ![Auditoria](docs/screenshots/05-auditoria.png) | ![Config](docs/screenshots/06-configuracoes-claro.png) |

## Stack

- **Backend:** Node.js 20+, TypeScript (strict), Fastify 5, Prisma 6 (camada única de persistência — ADR-0001), MySQL 8, JWT (@fastify/jwt), bcryptjs, Zod, helmet, @fastify/cors, @fastify/rate-limit.
- **Frontend:** React 18 + Vite 5 + TypeScript, AdminLTE 4 como base administrativa (ADR-0003), Tailwind 4 sem preflight (convive com Bootstrap sem conflito), Toastr global, SweetAlert2 para confirmações, design system próprio com tokens CSS.
- **Identidade:** paleta extraída da logo oficial (`docs/design/palette.md`) — cobre, ouro e rosé sobre "noite sofisticada" (`#0B0D10`) e "dia elegante" (`#F5F1EA`), sem preto/branco puros.

## Arquitetura

```text
apps/
  api/            Fastify + Prisma
    prisma/       schema, migrations, seed
    src/
      config/     env validado com Zod (fail-fast)
      lib/        erros, tokens, paginação, RBAC, contexto de empresa, auditoria
      plugins/    segurança, autenticação
      modules/    auth, companies, users, audit, health
    test/         integração contra MySQL real (vitest)
  web/            React + Vite
    src/
      styles/     tokens.css (temas), tailwind.css, global.css, components.css
      lib/        api (axios + refresh single-flight), notify, confirm, format
      context/    AuthContext, ThemeContext
      components/ AdminShell, Logo, Pagination, StateView, PageLoader, ErrorPage…
      pages/      Landing, Login, Dashboard, Users, Audit, Settings, erros
docs/
  ANALISE.md      matriz de análise da fase 1 (evidências)
  adr/            decisões arquiteturais 0001–0003
  design/         paleta oficial extraída da logo
```

Convenções: uma única persistência (Prisma), nomenclatura consistente, contratos `{data, meta}` para listagens paginadas no servidor, erros centralizados sem vazamento de stack em produção.

## Segurança e multiempresa

- Senhas com bcrypt (12 rounds); refresh tokens HMAC-SHA256 armazenados hasheados, com rotação e revogação.
- RBAC (OWNER/ADMIN/MANAGER/STAFF) aplicado **no backend** por mapa central de permissões `recurso:ação`.
- Isolamento multiempresa validado **no backend**: o contexto vem do token e é revalidado contra `company_users` a cada requisição (ADR-0002); `company_id` vindo do frontend nunca é confiável.
- Helmet, CORS restrito por env, rate-limit, validação Zod em todas as entradas, trilha de auditoria por empresa.

## Como rodar

Pré-requisitos: Node.js 20+, MySQL 8 (desenvolvimento: `localhost:3306`, banco `nexusbusinessmanager`).

```bash
npm install
cp apps/api/.env.example apps/api/.env    # preencha DATABASE_URL e segredos
npm run db:migrate -w @nexus/api
npm run db:seed -w @nexus/api             # cria admin@nexus.local / empresa demo
npm run dev:api                           # http://localhost:3001
npm run dev:web                           # http://localhost:5173 (proxy /api)
```

Conta de desenvolvimento criada pelo seed: `admin@nexus.local` / `Nexus@2026` (troque em produção).

## Verificação

```bash
npm run typecheck          # api + web
npm run test -w @nexus/api # 14 testes de integração (auth, RBAC, multiempresa, paginação)
npm run build              # produção (tsc + vite build)
```

## Documentação

- `docs/ANALISE.md` — análise da fase 1 com evidências (repositório de referência vazio; reconstrução 100% do zero aprovada).
- `docs/adr/` — decisões arquiteturais.
- `docs/design/palette.md` — paleta oficial extraída da logo.
- `CHANGELOG.md` — histórico de mudanças (mais novo primeiro).

## Roadmap de módulos

Fundação vertical concluída (auth, RBAC, multiempresa, auditoria, usuários, tema, estados globais, paginação, Toastr/SweetAlert2, páginas de erro). Próximas increments: Clientes, Produtos/Estoque, Vendas, Compras, Financeiro, CRM, Agenda (FullCalendar 6) e textos enriquecidos (Summernote) — cada um com testes desde a primeira entrega.

---

Desenvolvido por Clayton Marcelo.
