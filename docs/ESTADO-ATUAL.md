# Estado atual do Nexus Business Manager

Documento gerado por medição, não por memória. Cada número abaixo vem de um
comando executado nesta rodada (2026-10-12), listado na seção "Como este arquivo
foi medido" ao final. O que não pôde ser medido está marcado como
`NÃO VERIFICADO`. Este arquivo é o retrato honesto do repositório no commit
atual e o primeiro texto que um revisor externo deve ler.

---

## 1. Resumo executivo

1. O produto é um ERP SaaS multiempresa que funciona de ponta a ponta no ambiente
   local: 105 rotas de API sobre Fastify 5 + Prisma 6 + MySQL 8.4.7, painel React
   com 24 rotas e uma vitrine pública montada pelo banco.
2. Funciona e tem teste automatizado: autenticação com recuperação e renovação de
   sessão, RBAC com hierarquia de papéis, isolamento multiempresa, clientes,
   produtos e estoque, vendas com parcelas, compras e fornecedores, financeiro,
   CRM, agenda, relatórios agregados, notificações, auditoria, rotinas agendadas,
   CMS da vitrine, documentos legais e modo manutenção.
3. A suíte inteira passa nesta rodada: 28 arquivos / 230 casos na API e 4 arquivos
   / 20 casos no web, com banco MySQL real de teste (sem mock).
4. É parcial por escolha, não por esquecimento: os relatórios agregados têm teste
   de acesso e de dinheiro, mas nem cada um dos oito tem asserção de valor
   própria, e o tema escuro do painel ainda é aplicado por nós, não pelo AdminLTE.
5. Não existe: envio de e-mail (SMTP), cobrança/assinatura SaaS, nota fiscal,
   upload real de arquivo (a logo é só uma URL), backup e restauração, ordens de
   serviço. Nada disso tem botão morto na interface.
6. Duas tabelas existem só no schema: `email_templates` e `payment_gateways`.
7. Segurança: nenhuma rota nasce aberta (gate estrutural derruba o boot), e a
   senha real do administrador não está em arquivo rastreado nem no histórico.
8. Risco em aberto e conhecido pelo dono: uma captura rastreada mostra a senha
   real do administrador nos pixels, e ela já está publicada no remoto
   (`docs/AUDITORIA.md` N1). Isso mantém o push bloqueado.
9. Cobertura medida agora: API com 85,57% de instruções (2.301/2.689), 73,02%
   de ramificações, 83,93% de funções e 88,29% de linhas; web com 8,59% de
   instruções (309/3.597) — 51 dos 77 arquivos instrumentados estão em 0%.
10. Branch `main` a 7 commits do `origin/main`, árvore limpa, sem push
    nesta rodada.

---

## 2. Stack e versões reais

Lidas dos `package.json` do monorepo neste momento (`npm ls` não é fonte aqui; a
fonte é o arquivo e o `node --version` executado agora).

| Camada | O que está no package.json | Versão instalada / executada |
| --- | --- | --- |
| Runtime | `engines.node` | `>=20` declarado; Node v24.18.0 executando |
| Gerenciador | — | npm 11.16.0 |
| API | `fastify` | ^5.1.0 |
| API | `@prisma/client`, `prisma` | ^6.1.0 |
| API | `zod` | ^3.23.8 |
| API | `@fastify/jwt` | ^10.2.4 |
| API | `@fastify/helmet` | ^13.0.0 |
| API | `@fastify/cors` | ^10.0.1 |
| API | `@fastify/rate-limit` | ^10.1.1 |
| API | `bcryptjs` | ^2.4.3 |
| API | `dotenv` | ^16.4.5 |
| API | `typescript` | ^5.6.3 |
| API | `vitest`, `@vitest/coverage-v8` | ^5.0.3 |
| API | `tsx` | ^4.19.2 |
| Banco | MySQL do WAMP | 8.4.7, schema `nexusbusinessmanager` |
| Web | `react`, `react-dom` | ^18.3.1 |
| Web | `vite` | ^7.3.7 |
| Web | `react-router-dom` | ^7.18.4 |
| Web | `admin-lte` | ^4.10.0 |
| Web | `tailwindcss`, `@tailwindcss/vite` | ^4.3.3 |
| Web | `@fullcalendar/*` | 6.1.21 (fixa, sem range) |
| Web | `axios` | ^1.7.7 |
| Web | `jquery` | ^3.7.1 |
| Web | `sweetalert2` | ^11.26.0 |
| Web | `toastr` | ^2.1.4 |
| Web | `jsdom`, `@testing-library/react` | ^27.4.0 / ^16.3.3 |
| Raiz | `puppeteer-core` | ^25.13.0 (provas de navegador em `tools/`) |

A raiz expõe as portas de script: `typecheck`, `build`, `test`, `test:api`,
`test:web`, `test:coverage`, `db:migrate`, `db:seed`. Não há script de lint nem
de format, e não há ESLint nem Prettier instalado em nenhum dos dois workspaces
— "código padronizado" aqui é convenção de arquivo, não ferramenta.

---

## 3. Estrutura de pastas

Nível 3, sem `node_modules`, `dist` nem `coverage`.

```
nexusbusinessmanager/
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   │   ├── migrations/        (17 migrations + migration_lock.toml)
│   │   │   ├── schema.prisma      (27 models)
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── config/            (env.ts, producao.ts)
│   │   │   ├── lib/               (errors, rbac, money, time, installments,
│   │   │   │                       audit, pagination, password, tokens,
│   │   │   │                       company-context, platform, validate-doc)
│   │   │   ├── modules/           (16 módulos: auth, companies, users, audit,
│   │   │   │                       clients, products, sales, purchases,
│   │   │   │                       finance, crm, agenda, reports,
│   │   │   │                       notifications, cms, cron, health)
│   │   │   ├── plugins/           (auth, gate, maintenance, security)
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   └── test/                  (28 arquivos .test.ts + helpers.ts)
│   └── web/
│       ├── public/
│       └── src/
│           ├── components/        (12 na raiz + cms/, landing/, layout/,
│           │                       settings/)
│           ├── context/           (AuthContext, ThemeContext)
│           ├── lib/               (18 módulos: api, csv, format, money,
│           │                       masks, validators, tokenStore, notify,
│           │                       confirm, auditLabels, uiCopy, papeis,
│           │                       cmsApi, landingApi, landingEstilo,
│           │                       landingTypes, notificationsApi, cronApi,
│           │                       settingsApi)
│           ├── pages/             (20 arquivos)
│           ├── styles/            (7 arquivos CSS, 3.027 linhas no total)
│           └── test/              (setup do jsdom)
├── assets/brand/logo/
├── docs/
│   ├── adr/                       (3 ADRs)
│   ├── decisoes/                  (G1–G6)
│   ├── design/palette.md
│   ├── screenshots/               (101 capturas)
│   ├── ANALISE.md, ANALISE-LACUNAS.md, AUDITORIA.md, STATUS-AJUSTES.md
│   └── ESTADO-ATUAL.md            (este arquivo)
├── tools/                         (34 arquivos rastreados: 13 shoot-*,
│                                   11 verify-*, 4 patch-*, 3 audit-*,
│                                   senha-admin.cjs, para-innodb.cjs,
│                                   make-favicon.ps1)
├── README.md, CHANGELOG.md
└── package.json, package-lock.json, .gitignore, .gitattributes, .editorconfig
```

Arquivos rastreados no commit: **386** (`git ls-files | wc -l`), distribuídos em
`apps` 229, `docs` 115, `tools` 34 e 7 na raiz. Código: 71 arquivos `.ts` na API
e 84 `.ts`/`.tsx` no web. Não há `.github/` — ou seja, **nenhum CI versionado**.

---

## 4. Rotas da API

Fonte: leitura estática dos 16 arquivos `*.routes.ts` (`tools` à parte: script
`inventario-rotas.cjs` desta rodada), conferida contra o servidor em execução.

| Recorte | Quantidade |
| --- | --- |
| Rotas declaradas | **105** |
| Públicas de propósito (`config.public`) | 10 |
| Da plataforma (`assertPlatformAdmin`) | 14 |
| De empresa, com `app.authenticate` + permissão RBAC | 81 |
| Registradas sem gate | **0** |

Amostra ao vivo no servidor de dev desta rodada (respostas esperadas):
`GET /api/health` 200, `GET /api/public/landing` 200, `GET /api/leads` 401,
`GET /api/clients` 401, `GET /api/products` 401, `GET /api/sales` 401,
`GET /api/purchases` 401, `GET /api/finance/entries` 401,
`GET /api/agenda/events` 401, `GET /api/cms/config` 401, `GET /api/ops/jobs` 401,
`GET /api/audit` 401, `GET /api/auth/me` 401, `GET /api/reports/overview` 401.

Por módulo: agenda 7 · audit 1 · auth 10 · clients 5 · cms 14 · companies 5 ·
crm 6 · cron 3 · finance 9 · health 1 · notifications 7 · products 11 ·
purchases 8 · reports 8 · sales 4 · users 6.

A lista completa, rota por rota:

| Método | Caminho | Módulo | Exigência |
| --- | --- | --- | --- |
| GET | /api/agenda/events | agenda | agenda:read |
| GET | /api/agenda/summary | agenda | agenda:read |
| POST | /api/agenda/events | agenda | agenda:write |
| GET | /api/agenda/events/:id | agenda | agenda:read |
| PATCH | /api/agenda/events/:id | agenda | agenda:write |
| PATCH | /api/agenda/events/:id/status | agenda | agenda:write |
| DELETE | /api/agenda/events/:id | agenda | agenda:write |
| GET | /api/audit | audit | audit:read |
| POST | /api/auth/login | auth | pública |
| POST | /api/auth/register | auth | pública |
| POST | /api/auth/forgot-password | auth | pública |
| POST | /api/auth/reset-password | auth | pública |
| POST | /api/auth/refresh | auth | pública |
| POST | /api/auth/logout | auth | pública |
| GET | /api/auth/me | auth | autenticada |
| PATCH | /api/auth/me | auth | autenticada |
| POST | /api/auth/change-password | auth | autenticada |
| POST | /api/auth/switch-company | auth | autenticada |
| GET | /api/clients | clients | client:read |
| POST | /api/clients | clients | client:write |
| GET | /api/clients/:id | clients | client:read |
| PATCH | /api/clients/:id | clients | client:write |
| DELETE | /api/clients/:id | clients | client:write |
| GET | /api/public/landing | cms | pública |
| GET | /api/public/legal/:kind | cms | pública |
| POST | /api/public/bypass | cms | pública |
| GET | /api/cms/config | cms | plataforma |
| PATCH | /api/cms/config | cms | plataforma |
| GET | /api/cms/seo/score | cms | plataforma |
| POST | /api/cms/maintenance/token | cms | plataforma |
| GET | /api/cms/items | cms | plataforma |
| POST | /api/cms/items | cms | plataforma |
| PATCH | /api/cms/items/:id | cms | plataforma |
| DELETE | /api/cms/items/:id | cms | plataforma |
| GET | /api/cms/legal | cms | plataforma |
| PUT | /api/cms/legal/:kind | cms | plataforma |
| GET | /api/cms/kinds | cms | plataforma |
| POST | /api/companies | companies | autenticada |
| GET | /api/companies | companies | autenticada |
| GET | /api/companies/current | companies | company:read |
| PATCH | /api/companies/current | companies | settings:write |
| GET | /api/companies/settings/opcoes | companies | autenticada |
| GET | /api/leads/pipeline | crm | crm:read |
| GET | /api/leads | crm | crm:read |
| POST | /api/leads | crm | crm:write |
| GET | /api/leads/:id | crm | crm:read |
| PATCH | /api/leads/:id | crm | crm:write |
| PATCH | /api/leads/:id/status | crm | crm:write |
| GET | /api/ops/jobs | cron | plataforma |
| PATCH | /api/ops/jobs/:slug | cron | plataforma |
| POST | /api/ops/jobs/:slug/run | cron | plataforma |
| GET | /api/finance/categories | finance | finance:read |
| POST | /api/finance/categories | finance | finance:write |
| DELETE | /api/finance/categories/:id | finance | finance:write |
| GET | /api/finance/summary | finance | finance:read |
| GET | /api/finance/entries | finance | finance:read |
| POST | /api/finance/entries | finance | finance:write |
| GET | /api/finance/entries/:id | finance | finance:read |
| PATCH | /api/finance/entries/:id | finance | finance:write |
| PATCH | /api/finance/entries/:id/status | finance | finance:write |
| GET | /api/health | health | pública |
| GET | /api/notifications | notifications | autenticada |
| GET | /api/notifications/count | notifications | autenticada |
| PATCH | /api/notifications/:id/read | notifications | autenticada |
| POST | /api/notifications/read-all | notifications | autenticada |
| GET | /api/notifications/preferences | notifications | autenticada |
| PUT | /api/notifications/preferences | notifications | autenticada |
| POST | /api/notifications/scan | notifications | settings:write |
| GET | /api/product-categories | products | product:read |
| POST | /api/product-categories | products | product:write |
| PATCH | /api/product-categories/:id | products | product:write |
| GET | /api/products | products | product:read |
| GET | /api/products/stock-summary | products | product:read |
| POST | /api/products | products | product:write |
| GET | /api/products/:id | products | product:read |
| PATCH | /api/products/:id | products | product:write |
| DELETE | /api/products/:id | products | product:write |
| POST | /api/products/:id/movements | products | product:write |
| GET | /api/products/:id/movements | products | product:read |
| GET | /api/suppliers | purchases | supplier:read |
| POST | /api/suppliers | purchases | supplier:write |
| PATCH | /api/suppliers/:id | purchases | supplier:write |
| DELETE | /api/suppliers/:id | purchases | supplier:write |
| GET | /api/purchases | purchases | purchase:read |
| POST | /api/purchases | purchases | purchase:write |
| GET | /api/purchases/:id | purchases | purchase:read |
| PATCH | /api/purchases/:id/status | purchases | purchase:write |
| GET | /api/reports/overview | reports | autenticada |
| GET | /api/reports/clients | reports | client:read |
| GET | /api/reports/products | reports | product:read |
| GET | /api/reports/movements | reports | product:read |
| GET | /api/reports/sales | reports | sale:read |
| GET | /api/reports/purchases | reports | purchase:read |
| GET | /api/reports/finance | reports | finance:read |
| GET | /api/reports/crm | reports | crm:read |
| GET | /api/sales | sales | sale:read |
| POST | /api/sales | sales | sale:write |
| GET | /api/sales/:id | sales | sale:read |
| PATCH | /api/sales/:id/status | sales | sale:write |
| GET | /api/users | users | user:read |
| GET | /api/users/permissions | users | user:read |
| GET | /api/users/sessions | users | user:read |
| DELETE | /api/users/sessions/:sessionId | users | user:write |
| POST | /api/users | users | user:write |
| PATCH | /api/users/:userId/role | users | user:write |

Como ler a coluna "Exigência": `pública` é a rota com `config.public = true` no
registro; `plataforma` exige a conta global da plataforma
(`assertPlatformAdmin`), não o papel da empresa; o resto carrega
`preHandler: [app.authenticate]` e depois `assertPermission` com o recurso e a
ação. A coluna "autenticada" significa sessão obrigatória sem permissão de
recurso específica (conta própria, notificações da pessoa, empresas do usuário).

O `registerAuthGate` (`apps/api/src/plugins/gate.ts`) é um hook `onRoute`
registrado antes da primeira rota: se alguém registrar uma rota sem
`app.authenticate` no `preHandler` e sem `config.public = true`, a aplicação não
sobe — o erro cita método e caminho. Isso é o que sustenta o "0 sem gate" acima,
inclusive para rotas futuras.

---

## 5. Tabelas do banco

`schema.prisma` tem **27 models** e o banco físico tem **28 tabelas** (as 27 mais
`_prisma_migrations`), medido por `SELECT TABLE_NAME FROM information_schema`.
Há **17 migrations** versionadas, de `20261010154418_init_foundation` a
`20261012000000_add_refresh_token_empresa`.

Classificação por uso real no código da API (contagem de chamadas
`prisma.<modelo>` / `tx.<modelo>` nos 71 arquivos `.ts` de `src`):

| Tabela | Status | Evidência |
| --- | --- | --- |
| User, Company, CompanyUser, RefreshToken, PasswordResetToken, AuditLog | Em uso | auth, sessões, RBAC, auditoria |
| Client, Product, ProductCategory, StockMovement, Sale, SaleItem, Supplier, Purchase, PurchaseItem | Em uso | cadastros e operações |
| FinanceCategory, FinanceEntry | Em uso | financeiro e carnê da venda |
| Lead, AgendaEvent | Em uso | CRM e agenda |
| Notification, NotificationPreference | Em uso | sino, `/api/notifications` |
| LandingConfig, LandingItem, LegalDocument | Em uso | vitrine e textos legais |
| CronJob | Em uso | `/api/ops/jobs` e o relógio |
| **EmailTemplate** | **Sem uso** | só schema + migration; nenhum delegate, nenhuma rota, nenhuma tela |
| **PaymentGateway** | **Sem uso** | só schema + migration; provedores citados no README sem integração |

Ressalva honesta sobre a medição: `PurchaseItem` tem o delegate gravado por
escrita aninhada (`items: { create: itens }` em
`apps/api/src/modules/purchases/purchases.service.ts:168`), então um grep por
`prisma.purchaseItem` devolve zero e ainda assim a tabela é usada. `SaleItem`
mistura os dois caminhos. É por isso que a classificação acima foi conferida
linha a linha em vez de sair direto do contador.

---

## 6. Módulos

Cinco estados possíveis: **Implementado e testado**, **Implementado sem teste**,
**Parcial**, **Só tabela**, **Não iniciado**. Evidência é arquivo, não adjetivo.

| Módulo | Estado | Evidência |
| --- | --- | --- |
| Autenticação, cadastro, recuperação | Implementado e testado | 10 rotas; `auth.test.ts`, `auth-flows.test.ts`, `seguranca.test.ts`; prova `tools/verify-logout.cjs` |
| Sessões e revogação | Implementado e testado | `sessoes-empresa.test.ts`; refresh com empresa lembrada; `8 casos em `sessoes-empresa.test.ts`` |
| Papéis, permissões e hierarquia | Implementado e testado | `lib/rbac.ts`; `rbac.test.ts`, `rbac-hierarquia.test.ts`; aba Permissões |
| Multiempresa (isolamento e troca) | Implementado e testado | `multiempresa.test.ts`, `intrusao.test.ts` (varredura rota a rota), `desativacao-acesso.test.ts` |
| Empresa (cadastro, moeda/fuso/idioma, meta) | Implementado e testado | 5 rotas; `settings.test.ts` |
| Clientes | Implementado e testado | 5 rotas; `clients.test.ts`, `pagination.test.ts` |
| Produtos, categorias e estoque | Implementado e testado | 11 rotas; `products.test.ts`, `estoque-politica.test.ts`, `oversell.test.ts` |
| Vendas (pedido, itens, baixa, parcelas) | Implementado e testado | 4 rotas; `sales.test.ts`, `parcelamento.test.ts` |
| Fornecedores e compras | Implementado e testado | 8 rotas; `purchases.test.ts` |
| Financeiro (lançamentos, resumo, carnê) | Implementado e testado | 9 rotas; `finance.test.ts`, `dinheiro-decimal.test.ts` |
| CRM (leads e funil) | Implementado e testado | 6 rotas; `crm.test.ts` |
| Agenda (janela, recorrência, FullCalendar) | Implementado e testado | 7 rotas; `agenda.test.ts`; fuso em `fuso-dia.test.ts` |
| Relatórios agregados | **Parcial** | 8 rotas existem e respondem; asserções de valor cobrem overview, financeiro e dinheiro; os seis demais relatórios só têm teste de acesso/intrusão |
| Notificações e preferências | Implementado e testado | 7 rotas; `notifications.test.ts` |
| Auditoria | Implementado e testado | 1 rota de leitura; gravação exercitada em 19 dos 28 arquivos de teste |
| Rotinas agendadas (cron) | Implementado e testado | 3 rotas de plataforma; `cron.test.ts`; prova `tools/verify-rotinas.cjs` |
| CMS da vitrine | Implementado e testado | 14 rotas; `cms.test.ts`; provas `tools/verify-cms.cjs` e `tools/verify-landing-cms.cjs` |
| Documentos legais | Implementado e testado | `cms.test.ts` (11 casos, incluindo textos legais) e `settings.test.ts` (21 casos) |
| Modo manutenção | Implementado e testado | `plugins/maintenance.ts`, bypass público com rate-limit próprio |
| Painel/Dashboard | Implementado e testado pela API | `/api/reports/overview` + meta de receita; tela `Dashboard.tsx` |
| Gateways e cobranças | **Só tabela** | `payment_gateways` no schema; sem rota, sem serviço, sem tela funcional |
| Modelos de e-mail | **Só tabela** | `email_templates` no schema; sem SMTP |
| Upload de arquivo (logo, anexos) | **Não iniciado** | nenhum parser `multipart` na API; `logoUrl` é `VarChar(255)` de URL |
| SaaS: planos, assinaturas, faturas | **Não iniciado** | sem tabela, sem rota |
| Backup e restauração | **Não iniciado** | sem código |
| Ordens de serviço / campo | **Não iniciado** | sem tabela, sem rota e sem linha no menu desde a F3.1 |
| CI / quality gate | **Não iniciado** | não existe `.github/` nem script de lint |

---

## 7. Frontend

`apps/web/src/App.tsx` declara **24 rotas** React:

- públicas: `/` (vitrine montada pelo conteúdo do banco), `/login`, `/cadastro`,
  `/recuperar-senha`, `/legal/:slug`, `/403`, `/401`;
- protegidas por `ProtectedRoute` sob `/app`: `index` (Dashboard), clientes,
  produtos, vendas, compras, financeiro, crm, agenda, usuarios, auditoria,
  configuracoes, cms, notificacoes, rotinas;
- catch-all `*` com página de erro.

São **20 arquivos** em `pages/` e **34 arquivos** de componente (12 na raiz de
`components/`, 5 em `components/cms/`, 13 em `components/landing/`, 2 em
`components/layout/`, 2 em `components/settings/`), mais `context/AuthContext` e
`context/ThemeContext`, e 18 módulos em `lib/`.

Componentes globais de uso transversal: `ProtectedRoute`, `AdminShell`,
`NotificationBell`, `Tabs`, `Pagination`, `Modal`, `ConfirmationModal`,
`StateView`, `PageLoader`, `PasswordInput`, `Logo`, `ThemeToggle`, `ErrorPage` e
a biblioteca de campos `Fields.tsx`.

O que é apenas visual hoje: (a) o seletor de tema do painel escreve o atributo no
elemento, mas o AdminLTE 4 olha `data-bs-theme` — divergência registrada como N7
em `docs/AUDITORIA.md`, à espera de decisão; (b) as abas Gateways e Modelos de
e-mail não existem como funcionalidade — o que aparece na tela é o que a API
realmente devolve.

Desde a F3.1 não existe linha de menu apenas visual: o tipo `NavItem` exige
`to: string`, então linha sem rota não compila. A barra ficou com 15 itens em
6 camadas, todos link de página que existe, e quem garante isso é
`apps/web/src/test/menu-sem-pagina-vazia.test.tsx` (6 casos: destino obrigatório,
vocabulário "em breve" extinto do arquivo, cada destino com `<Route>` e arquivo de
página com título e sem copy de obra, CSS sem o estado apagado, barra montada só com
`<a>` com href e o filtro de camada vazia ainda no lugar) mais as 102 checagens de
`tools/verify-sidebar.cjs`, que clica as quinze linhas uma por uma.

Bundle medido no `npm run build` desta rodada: `index.js` **880,92 kB** (gzip
262,33 kB) e `index.css` **386,28 kB** (gzip 59,06 kB) num único chunk — o Vite
avisou `Some chunks are larger than 500 kB`. Code-splitting continua por fazer.

---

## 8. Testes

Medidos nesta rodada, com MySQL de teste ativo (a suíte da API não usa mock):

| Suíte | Arquivos | Casos | Resultado | Duração |
| --- | --- | --- | --- | --- |
| API (`vitest`, forks, serial) | 28 | 230 | 28 passed (28) | 232,52 s |
| Web (jsdom + Testing Library) | 4 | 20 | 4 passed (4) | 4,11 s |

Cobertura real, medida agora com o mesmo comando de medição das duas pontas:

```
API:  npm run test:coverage --workspace @nexus/api
Web:  npm run test --workspace @nexus/web -- --coverage \
        --coverage.include="src/**" --coverage.exclude="src/test/**"
```

| Suíte | Stmts | Branch | Funcs | Lines | Base medida |
| --- | --- | --- | --- | --- | --- |
| API | **85,57%** | 73,02% | 83,93% | 88,29% | 2.301/2.689 instruções, 1.175/1.609 ramificações, 486/579 funções, 2.113/2.393 linhas; 70 dos 71 arquivos de `src` com linhas mensuráveis |
| Web | **8,59%** | 5,48% | 7,01% | 9,19% | 309/3.597 instruções, 161/2.939 ramificações, 81/1.155 funções, 285/3.101 linhas; 77 arquivos instrumentados |

O que **não** está coberto, dito sem rodeios:

- - **API:** `src/modules/cron/cron.runner.ts` está em **0%** (32 linhas) — os 11 casos de `cron.test.ts`
  exercitam o matcher, o serviço e as rotas, mas o laço que dispara a rotina no processo do servidor não
  roda em teste. `reports.service.ts` em **53,8%** (114/212) e `reports.routes.ts` em **66%** são o resto
  do oco relevante: dos oito relatórios, só `overview`, `finance` e o caminho do dinheiro têm asserção de
  valor. `config/env.ts` em **57,1%** porque as validações exclusivas de produção não disparam na suíte
  (ficaram em `validador-de-producao.test.ts`, que chama o validador direto). Depois vêm
  `companies.service.ts` 70,4%, `audit.routes.ts` 72,2%, `lib/audit.ts` 75%, `finance.service.ts` 75%,
  `companies.routes.ts` 77,8%, `products.service.ts` 81,9% e `app.ts` 83% (o handler de erro tem ramos
  que só acontecem em produção).
- **Web:** **51 dos 77 arquivos instrumentados estão em 0%**, incluindo as 17 páginas de painel
  (`Agenda` 203 statements, `Purchases` 220, `Finance` 198, `CRM` 192, `Products` 186, `Sales` 166,
  `Audit` 114, `Users` 111, `Notifications` 106, `Clients` 99, `Dashboard` 42 e as demais), os cinco
  painéis do editor CMS, os dois painéis de Configurações, `AdminShell`, `NotificationBell`, os
  componentes globais (`Modal` 88, `ConfirmationModal` 55, `Pagination` 45, `Tabs` 40, `Fields` 19) e os
  11 módulos de `lib/` que falam com a API. O que os 4 arquivos de teste cobrem é a vitrine (tema, paleta
  e estilo de landing) e o encerramento de sessão. **Nenhuma página de operação do painel tem teste
  automatizado** — a garantia dessas telas hoje são as provas de navegador em `tools/`, que não rodam
  sozinhas.

Limitações da medição que o revisor deve saber:

- No web não existe script `test:coverage`; o escopo foi passado por argumento na
  linha de comando. Sem isso o Vite mediria apenas os arquivos alcançados pelos
  4 testes, o que daria um número bonito e falso.
- A API não tem threshold de cobertura configurado; fixar meta é decisão da
  Fase 7 do plano de auditoria e depende do dono.
- Nenhum teste sobe o servidor HTTP da API com TLS nem valida cabeçalhos em
  ambiente de produção real; `validador-de-producao.test.ts` exercita o
  validador de `.env`, não a hospedagem.
- As provas de navegador (`tools/verify-*.cjs`, `tools/shoot-*.cjs`) rodam contra
  o Chrome local com `puppeteer-core` e não fazem parte do `npm test`; elas
  provam interface, não regressão automática.

---

## 9. Divergências entre documentação e código

Todas conferidas arquivo por arquivo nesta rodada.

| # | Documentação diz | Código faz | Onde |
| --- | --- | --- | --- |
| D1 | `README.md:424` — "Autenticação, cadastro e recuperação: 8 rotas" | são **10** rotas (login, register, forgot, reset, refresh, logout, me, PATCH me, change-password, switch-company) | `apps/api/src/modules/auth/auth.routes.ts` |
| D2 | `README.md:475` — tabela de tecnologias "react-router-dom 6" | `^7.18.4` no `package.json` do web | `apps/web/package.json` |
| D3 | `README.md:18` e texto do projeto dizem "MySQL 8" | o servidor local é **8.4.7** | medido por `SELECT VERSION()` |
| D4 | Nenhuma tabela do README soma as 105 rotas | as linhas com contagem explícito somam 101, e audit/health/legal/manutenção aparecem sem número | `README.md:420-452` |
| D5 | `docs/ANALISE-LACUNAS.md` e tarefas antigas citam "Módulo Relatórios + exportações" como pendente | os 8 relatórios agregados existem na API e 6 telas exportam CSV pelo navegador | `apps/api/src/modules/reports`, `apps/web/src/pages/*.tsx` |
| D6 | O passo a passo de instalação do README não mandava gerar o cliente Prisma (`README.md:649-656`) | um clone novo não compila sem `npm run prisma:generate -w @nexus/api` — 217 erros de tipo por cliente não gerado | **corrigido nesta rodada**; registrado como N9 em `docs/AUDITORIA.md` |
| D7 | `docs/ANALISE.md` e `docs/ANALISE-LACUNAS.md` são retratos de rodadas anteriores | rotas, tabelas e contagens mudaram desde então | `docs/ANALISE.md`, `docs/ANALISE-LACUNAS.md` — vale neles o mesmo aviso deste arquivo: quem mexer reatualiza |

Nada no README promete integração de pagamento, SMTP ou nota fiscal como
existente — a linha de gateways diz explicitamente "**nenhuma integração
inventada** enquanto não houver credencial real" (`README.md:445`), e o código
confirma: `payment_gateways` não é lida por nenhum serviço.

---

## 10. Pendências conhecidas

Ligadas ao item correspondente de `docs/AUDITORIA.md`.

| # | Pendência | Ligação | Severidade |
| --- | --- | --- | --- |
| P1 | Senha real do administrador visível nos pixels de `docs/screenshots/02-login.png`, já publicada no remoto | AUDITORIA N1 / G7 | **CRÍTICA** — trava o push |
| P2 | A credencial de desenvolvimento do seed (o valor não é impresso aqui; é o mesmo do `SEED_DEV_PASSWORD` do `.env` local) está em `apps/api/.env.example:37`, `apps/api/test/seed-seguro.test.ts:56` e `tools/shoot-clients.cjs:17`, e em linhas de patch do histórico — a contagem de linhas sobe a cada correção porque o próprio diff carrega o literal | seção D da auditoria + §5 deste prompt | alta para o repositório público; **não vale em produção** |
| P3 | Código de recuperação de senha numa captura rastreada (`09-recuperar-senha.png`) | AUDITORIA N2 | média |
| P4 | Identificador real de empresa/espalhado em arquivos rastreados | AUDITORIA N3 | baixa |
| P5 | Capturas das outras telas do painel não foram reauditadas uma a uma | AUDITORIA N5 | NÃO VERIFICADO |
| P6 | Tema do painel x `data-bs-theme` do AdminLTE | AUDITORIA N7 | baixa, espera decisão |
| P7 | Relatórios sem asserção de valor por relatório | seção F | média |
| P8 | Sem CI, sem lint, sem threshold de cobertura | seção I / Fase 7 | média |
| P9 | Bundle único de 880,92 kB sem code-splitting | Fase 7 | média |
| P10 | Auditoria segue em parada: Fase 7 e os blocos B–H do prompt de mercado não foram executados | AUDITORIA, seção I | combinado com o dono |

---

## 11. Decisões que dependem do dono

Nada aqui foi inventado; está bloqueado por escolha registrada.

1. **SMTP** (`docs/decisoes/G1-envio-de-email.md`) — escolha do provedor e
   credenciais reais; sem isso, recuperação de senha continua entregando o código
   pela API e `email_templates` segue sem uso.
2. **Cobrança e assinatura** (`G2`) — gateway, contas, ambiente; sem credencial,
   `payment_gateways` continua só tabela e o SaaS de planos não começa.
3. **Fiscal / NF-e** (`G3`) — emissão depende de certificado e município.
4. **Cadastro aberto** (`G4`) — se a autoinscrição continua pública ou passa a
   convite.
5. **Hospedagem e backup** (`G5`) — onde roda, quem faz dump, com que frequência.
6. **Licença** (`G6`) — o `package.json` hoje declara `UNLICENSED`; publicar o
   repositório como público sem licença definida é decisão do dono.
7. **Tema do painel** (N7) — padronizar em `data-bs-theme` ou manter o nosso.
8. **Publicação do histórico** — o repositório remoto é público e já contém a
   captura da seção 1; qualquer decisão de trocar a senha, apagar a imagem ou
   manter o histórico é do dono (reescrever histórico é proibido neste prompt).

---

## 12. Como rodar o projeto do zero

Ordem testada nesta rodada; o que não pude testar está dito logo abaixo.

```bash
git clone <url> && cd nexusbusinessmanager
npm ci
npm run prisma:generate -w @nexus/api   # 1. SEM ESTE PASSO NADA COMPILA (N9)
cp apps/api/.env.example apps/api/.env  # 2. ajuste DATABASE_URL, JWT_* e SEED_*
npm run db:migrate -w @nexus/api        # 3. aplica as 17 migrations
npm run db:seed   -w @nexus/api         # 4. admin global + conta de desenvolvimento
npm run typecheck && npm run build && npm test   # 5. os três portões
npm run dev:api                         # 6. http://localhost:3001/api
npm run dev:web                         # 7. painel em http://localhost:5173
```

O que foi executado nesta rodada, em `C:/wamp64/www/nexus-verificacao` (clone de
`git clone . ../nexus-verificacao`, feito a partir do commit `2355f05`, ou seja,
sem este arquivo e sem os três arquivos ignorados do trabalho (`apps/api/.env`, `CREDENCIAIS.md`, `tools/senha-admin.local.cjs`)):

| Passo | Resultado medido |
| --- | --- |
| `git clone` | 386 arquivos no checkout, sem `.env`, sem `CREDENCIAIS.md`, sem `node_modules` |
| `npm ci` | concluiu; o npm bloqueou por política de scripts o `preinstall` do Prisma e o `postinstall` do esbuild |
| `npm run typecheck` (sem gerar o cliente) | **falhou com 217 erros TS**, todos de símbolo ausente do Prisma (`Role`, `Decimal`, `PrismaClientKnownRequestError`) |
| `npm run prisma:generate -w @nexus/api` | ok |
| `npm run typecheck` (depois) | **0 erros** |
| `npm run build` | **ok**, `vite` em 3,81 s |
| `npm test` | **28 arquivos / 230 casos verdes** na API e **4 arquivos / 20 casos** no web. Nota honesta: a suíte só roda com um `.env` apontando para um MySQL de teste, e esse arquivo não é versionado — para medir isso copiamos o `.env` do diretório de trabalho para o clone (fora do repositório, nunca commitado). Ou seja: o código do clone é suficiente; a configuração continua sendo do dono, como sempre. |
| BOM e CRLF nos 386 arquivos rastreados | **nenhum** (`OK`) |
| conferência final na árvore do pacote (`394edbe`, com este arquivo) | o mesmo clone foi atualizado para o commit empacotado e medido de novo: `npm run typecheck` com **0 erros**, `npm run build` **ok** (Vite em 8,75 s), `npm test` com **28 arquivos / 230 casos** e **4 arquivos / 20 casos** verdes. A varredura de codificação refeita sobre os **387 arquivos rastreados** (277 textos, 110 binários) deu **0 BOM e 0 CR**. |

- **Não testável no clone limpo por desenho:** `db:migrate`, `db:seed` e o boot
  do servidor pedem o `.env`, que não é versionado de propósito. No diretório de
  trabalho os dois servidores estavam de pé nesta rodada e as 14 rotas amostradas
  da seção 4 responderam.
- **Não verificado:** montagem em máquina sem WAMP, `npm ci` em Linux, e
  qualquer deploy real (a hospedagem é a decisão 5 da seção 11).
- A linha extra `npm run prisma:generate` acima está registrada como achado **N9**
  em `docs/AUDITORIA.md` e foi adicionada à seção de instalação do README nesta
  mesma rodada — é a correção mínima permitida pelo prompt, porque sem ela o
  portão de build não passa num clone novo.

---

## Como este arquivo foi medido

Comandos executados nesta rodada, todos com saída real:

```bash
git status --short && git branch -vv && git rev-list --count origin/main..HEAD
git ls-files | wc -l
npm run typecheck; npm run build; npm test
npm run test:coverage --workspace @nexus/api
npm run test --workspace @nexus/web -- --coverage \
  --coverage.include="src/**" --coverage.exclude="src/test/**"
node --version && npm --version
node -e "... Prisma \$queryRawUnsafe('SELECT VERSION()') ..."   # MySQL e tabelas
node inventario-rotas.cjs      # 105 rotas por método, caminho e exigência
node inventario-tabelas.cjs    # 27 models x uso do delegate
node varredura-segredos.cjs    # segredo real x credencial de desenvolvimento
grep -rhcE 'app\.(get|post|patch|put|delete)\(' apps/api/src/modules/*/*.routes.ts
curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/<14 rotas>
```

Atualizar este documento é obrigação de quem mexer no projeto: se ele divergir do
código, o revisor externo foi enganado.
