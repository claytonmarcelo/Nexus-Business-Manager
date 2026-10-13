# Estado atual do Nexus Business Manager

Documento gerado por medição, não por memória. Cada número abaixo vem de um
comando executado nesta rodada (2026-10-12), listado na seção "Como este arquivo
foi medido" ao final. O que não pôde ser medido está marcado como
`NÃO VERIFICADO`. Este arquivo é o retrato honesto do repositório no commit
atual e o primeiro texto que um revisor externo deve ler.

Nesta rodada (2026-10-13, F3.2 Parte 1 — Ordens de Serviço) as seções 1, 3, 4, 5, 6, 7, 8, 9 e 10
e o bloco "Como este arquivo foi medido" foram re-medidos porque o módulo mudou rotas, tabelas, telas e
contagem de testes — e porque três linhas daquela passada já não descreviam mais o repositório (P1, P2 e D1). O resto do arquivo continua
a medição de 2026-10-12, e a passada completa está marcada para a F9.

---

## 1. Resumo executivo

1. O produto é um ERP SaaS multiempresa que funciona de ponta a ponta no ambiente
   local: 112 rotas de API sobre Fastify 5 + Prisma 6 + MySQL 8.4.7, painel React
   com 25 rotas (16 delas atrás do menu) e uma vitrine pública montada pelo banco.
2. Funciona e tem teste automatizado: autenticação com recuperação e renovação de
   sessão, RBAC com hierarquia de papéis, isolamento multiempresa, clientes,
   produtos e estoque, vendas com parcelas, compras e fornecedores, financeiro,
   CRM, agenda, ordens de serviço com o estoque baixando na conclusão, relatórios
   agregados, notificações, auditoria, rotinas agendadas,
   CMS da vitrine, documentos legais e modo manutenção.
3. A suíte inteira passa nesta rodada: 36 arquivos / 326 casos na API e 9 arquivos
   / 62 casos no web, com banco MySQL real de teste (sem mock).
4. É parcial por escolha, não por esquecimento: os relatórios agregados têm teste
   de acesso e de dinheiro, mas nem cada um dos oito tem asserção de valor
   própria, e o tema escuro do painel ainda é aplicado por nós, não pelo AdminLTE.
5. Não existe: envio de e-mail (SMTP), cobrança/assinatura SaaS, nota fiscal,
   upload real de arquivo (a logo é só uma URL), backup e restauração. Nada disso
   tem botão morto na interface — e a ordem de serviço, que era a última linha
   desta lista, saiu dela na F3.2 Parte 1.
6. Duas tabelas existem só no schema: `email_templates` e `payment_gateways`.
7. Segurança: nenhuma rota nasce aberta (gate estrutural derruba o boot), e a
   senha do administrador não está em arquivo rastreado nem no histórico: o valor mora
   só em `tools/senha-admin.local.cjs` e no `apps/api/.env` (chave `SEED_ADMIN_PASSWORD`), os dois
   ignorados pelo git — medido com `git check-ignore -v`.
8. Risco conhecido e **decidido** pelo dono: uma captura rastreada mostra a
   senha de desenvolvimento nos pixels (`docs/screenshots/02-login.png`,
   `docs/AUDITORIA.md` N1). A decisão de 2026-10-12 (item 1 do PROMPT MESTRE) é
   que a conta é fictícia: não se rotaciona senha, não se reescreve histórico. O
   N1 deixou de travar o push e passou a risco aceito e registrado.
9. Cobertura re-medida nesta rodada: API com **86,88%** de instruções
   (2.597/2.989), 74,97% de ramificações, 85,73% de funções e 89,55% de linhas;
   web com **22,78%** de instruções (912/4.003), contra 8,59% da medição anterior,
   porque os testes de tela chegaram ao painel — 38 dos 82 arquivos mensuráveis
   do web ainda estão em 0%, e na API sobrou um (`cron.runner.ts`).
10. Branch `main` igual ao `origin/main` no começo desta passada: o backend
    das ordens de serviço já está publicado (`3a32119`). O fechamento da F3.2
    Parte 1 são dois commits — interface, teste de tela e prova de navegador num
    lote, documentação no outro — com push em avanço direto, sem force, e a prova
    `git ls-remote origin HEAD` igual a `git rev-parse HEAD` colada no relatório
    da fase.

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
│   │   │   ├── migrations/        (19 migrations + migration_lock.toml)
│   │   │   ├── schema.prisma      (30 models)
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── config/            (env.ts, producao.ts)
│   │   │   ├── lib/               (17 arquivos: audit, auth, brFields,
│   │   │   │                       company-context, errors, installments,
│   │   │   │                       money, pagination, password,
│   │   │   │                       passwordPolicy, platform, prisma, rbac,
│   │   │   │                       stock, time, tokens, tx)
│   │   │   ├── modules/           (17 módulos: auth, companies, users, audit,
│   │   │   │                       clients, products, sales, purchases,
│   │   │   │                       finance, crm, agenda, reports,
│   │   │   │                       notifications, cms, cron, health,
│   │   │   │                       service-orders)
│   │   │   ├── plugins/           (auth, gate, maintenance, security)
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   └── test/                  (36 arquivos .test.ts + helpers.ts)
│   └── web/
│       ├── public/
│       └── src/
│           ├── components/        (12 na raiz + 5 cms/, 12 landing/, 3 layout/,
│           │                       2 settings/)
│           ├── context/           (AuthContext, ThemeContext)
│           ├── lib/               (22 módulos: api, auditLabels, brand,
│           │                       cmsApi, confirm, cronApi, csv, format,
│           │                       landingApi, landingEstilo, landingTypes,
│           │                       masks, metricaVitrine, money, notify,
│           │                       notificationsApi, papeis, settingsApi,
│           │                       statusServico, tokenStore, uiCopy,
│           │                       validators)
│           ├── pages/             (22 arquivos)
│           ├── styles/            (7 arquivos CSS, 3.164 linhas no total)
│           └── test/              (11 arquivos: 9 testes + 2 fábricas;
│                                   o jsdom vem do vitest.config, não de setup.ts)
├── assets/brand/logo/
├── docs/
│   ├── adr/                       (8 ADRs)
│   ├── decisoes/                  (G1–G6 + G8, em 7 arquivos)
│   ├── design/palette.md
│   ├── screenshots/               (108 capturas)
│   ├── ANALISE.md, ANALISE-LACUNAS.md, AUDITORIA.md, PRODUCAO.md,
│   │   STATUS-AJUSTES.md
│   └── ESTADO-ATUAL.md            (este arquivo)
├── tools/                         (37 arquivos rastreados nesta rodada: 12
│                                   shoot-*, 13 verify-*, 4 patch-*,
│                                   3 audit-*, conta-de-captura.cjs,
│                                   senha-admin.cjs, para-innodb.cjs, wf.cjs,
│                                   make-favicon.ps1)
├── README.md, CHANGELOG.md
└── package.json, package-lock.json, .gitignore, .gitattributes, .editorconfig
```

Arquivos da árvore versionada nesta rodada, medidos com
`git ls-files --cached --others --exclude-standard` — ou seja, o que está no commit de
agora mais os arquivos novos deste módulo, que ainda não aparecem no `git ls-files` puro:
**428**, distribuídos em `apps` 253, `docs` 130, `tools` 37, `assets` 1 e 7 na raiz.
Código: 74 arquivos `.ts` em `apps/api/src` e 94 `.ts`/`.tsx` em `apps/web/src`.
Não há `.github/` — ou seja, **nenhum CI versionado**.

---

## 4. Rotas da API

Fonte: leitura estática dos 17 arquivos `*.routes.ts` (`tools` à parte: script
`inventario-rotas.cjs` desta rodada), conferida contra o servidor em execução.

| Recorte | Quantidade |
| --- | --- |
| Rotas declaradas | **112** |
| Públicas de propósito (`config.public`) | 10 |
| Da plataforma (`assertPlatformAdmin`) | 15 |
| De empresa, com `app.authenticate` + permissão RBAC | 87 |
| Registradas sem gate | **0** |

Amostra ao vivo no servidor de dev desta rodada (respostas esperadas):
`GET /api/health` 200, `GET /api/public/landing` 200, `GET /api/leads` 401,
`GET /api/clients` 401, `GET /api/products` 401, `GET /api/sales` 401,
`GET /api/purchases` 401, `GET /api/finance/entries` 401,
`GET /api/agenda/events` 401, `GET /api/cms/config` 401, `GET /api/ops/jobs` 401,
`GET /api/audit` 401, `GET /api/auth/me` 401, `GET /api/reports/overview` 401,
`GET /api/service-orders` 401 (medido com o servidor de dev desta rodada).

Por módulo: agenda 7 · audit 2 · auth 10 · clients 5 · cms 14 · companies 5 ·
crm 6 · cron 3 · finance 9 · health 1 · notifications 7 · products 11 ·
purchases 8 · reports 8 · sales 4 · service-orders 6 · users 6.

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
| GET | /api/audit/plataforma | audit | plataforma |
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
| GET | /api/service-orders | service-orders | service_order:read |
| GET | /api/service-orders/summary | service-orders | service_order:read |
| GET | /api/service-orders/:id | service-orders | service_order:read |
| POST | /api/service-orders | service-orders | service_order:write |
| PATCH | /api/service-orders/:id | service-orders | sessão + alcance do atendente |
| POST | /api/service-orders/:id/status | service-orders | sessão + alcance do atendente |
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
recurso específica (conta própria, notificações da pessoa, empresas do usuário). As
duas rotas de ordem de serviço que não mostram permissão na tabela são as duas que
abrem exceção de propósito: `PATCH /service-orders/:id` e
`POST /service-orders/:id/status` deixam o `STAFF` passar sem `service_order:write`
e apertam o alcance dentro do serviço — ele só mexe na ordem atribuída a ele, só no
andamento, e nunca cancela. Medido na prova de navegador: 403 nas duas portas de
escrita para o atendente sem vínculo com a ordem.

O `registerAuthGate` (`apps/api/src/plugins/gate.ts`) é um hook `onRoute`
registrado antes da primeira rota: se alguém registrar uma rota sem
`app.authenticate` no `preHandler` e sem `config.public = true`, a aplicação não
sobe — o erro cita método e caminho. Isso é o que sustenta o "0 sem gate" acima,
inclusive para rotas futuras.

---

## 5. Tabelas do banco

`schema.prisma` tem **30 models** e o banco físico tem **31 tabelas** (as 30 mais
`_prisma_migrations`), medido por `SELECT COUNT(*) FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()` nesta rodada.
Há **19 migrations** versionadas, de `20261010154418_init_foundation` a
`20261013010000_add_ordens_de_servico` — as duas últimas são aditivas: a coluna
`scope` da auditoria (F2) e as três tabelas do atendimento (F3.2).

Classificação por uso real no código da API (contagem de chamadas
`prisma.<modelo>` / `tx.<modelo>` nos 74 arquivos `.ts` de `src`):

| Tabela | Status | Evidência |
| --- | --- | --- |
| User, Company, CompanyUser, RefreshToken, PasswordResetToken, AuditLog | Em uso | auth, sessões, RBAC, auditoria |
| Client, Product, ProductCategory, StockMovement, Sale, SaleItem, Supplier, Purchase, PurchaseItem | Em uso | cadastros e operações |
| FinanceCategory, FinanceEntry | Em uso | financeiro e carnê da venda |
| Lead, AgendaEvent | Em uso | CRM e agenda |
| Notification, NotificationPreference | Em uso | sino, `/api/notifications` |
| LandingConfig, LandingItem, LegalDocument | Em uso | vitrine e textos legais |
| CronJob | Em uso | `/api/ops/jobs` e o relógio |
| ServiceOrder, ServiceOrderItem, ServiceOrderHistory | Em uso | `/api/service-orders`, a baixa de estoque na conclusão e a linha do tempo |
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
| Sessões e revogação | Implementado e testado | `sessoes-empresa.test.ts`; refresh com empresa lembrada; 8 casos em `sessoes-empresa.test.ts` |
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
| Ordens de serviço (atendimento, peças, baixa de estoque) | Implementado e testado | 6 rotas; `ordens-de-servico.test.ts` (35 casos) e `ordens-de-servico.test.tsx` (10); prova `tools/verify-ordens-de-servico.cjs` (102); decisão em `docs/adr/0008-ordem-de-servico-baixa-estoque-na-conclusao.md` |
| Relatórios agregados | **Parcial** | 8 rotas existem e respondem; asserções de valor cobrem overview, financeiro e dinheiro; os seis demais relatórios só têm teste de acesso/intrusão |
| Notificações e preferências | Implementado e testado | 7 rotas; `notifications.test.ts` |
| Auditoria | Implementado e testado | 2 rotas de leitura (empresa e plataforma); gravação exercitada em 23 dos 36 arquivos de teste |
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
| CI / quality gate | **Não iniciado** | não existe `.github/` nem script de lint |

---

## 7. Frontend

`apps/web/src/App.tsx` declara **25 rotas** React (24 com caminho e o índice do painel):

- públicas: `/` (vitrine montada pelo conteúdo do banco), `/login`, `/cadastro`,
  `/recuperar-senha`, `/legal/:slug`, `/403`, `/401`;
- protegidas por `ProtectedRoute` sob `/app`: `index` (Dashboard), clientes,
  produtos, vendas, ordens-de-servico, compras, financeiro, crm, agenda, usuarios,
  auditoria, configuracoes, cms, notificacoes, rotinas, auditoria-plataforma —
  16 telas atrás do menu;
- catch-all `*` com página de erro.

São **22 arquivos** em `pages/` e **33 arquivos** de componente (12 na raiz de
`components/`, 5 em `components/cms/`, 11 em `components/landing/`, 3 em
`components/layout/`, 2 em `components/settings/`), mais `context/AuthContext` e
`context/ThemeContext`, e 22 módulos em `lib/`.

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
`to: string`, então linha sem rota não compila. A barra ficou com 16 itens em
6 camadas, todos link de página que existe — o 16º entrou na F3.2, com a tela
`OrdensDeServico.tsx` —, e quem garante isso é
`apps/web/src/test/menu-sem-pagina-vazia.test.tsx` (6 casos: destino obrigatório,
vocabulário "em breve" extinto do arquivo, cada destino com `<Route>` e arquivo de
página com título e sem copy de obra, CSS sem o estado apagado, barra montada só com
`<a>` com href e o filtro de camada vazia ainda no lugar) mais as 103 checagens de
`tools/verify-sidebar.cjs`, que clica as dezesseis linhas uma por uma — reexecutado nesta
rodada com a linha nova: **103 checagens, 0 falhas** (eram 102 com quinze linhas).

Bundle medido no `npm run build` desta rodada: `index.js` **914,87 kB** (gzip
271,50 kB) e `index.css` **390,88 kB** (gzip 60,01 kB) num único chunk — o Vite
avisou `Some chunks are larger than 500 kB`. Code-splitting continua por fazer. O
crescimento desde a medição anterior (880,92 kB de JS e 386,28 kB de CSS) é +33,95 kB
e +4,60 kB, e a explicação cabe na tela nova: `OrdensDeServico.tsx` tem 42.701 bytes
de fonte e o estilo da tabela de ordens entrou no `components.css`.

---

## 8. Testes

Medidos no portão de fechamento desta fase (`npm test`, exit 0, saída real colada no
relatório da rodada), com MySQL de teste ativo (a suíte da API não usa mock): zero
falha e zero skip nas duas pontas. As durações variam corrida a corrida — a passada
anterior da mesma suíte levou 339,63 s na API e 8,56 s no web.

| Suíte | Arquivos | Casos | Resultado | Duração |
| --- | --- | --- | --- | --- |
| API (`vitest`, forks, serial) | 36 | 326 | 36 passed (36) | 317,86 s |
| Web (jsdom + Testing Library) | 9 | 62 | 9 passed (9) | 6,30 s |

Cobertura real, medida agora com o mesmo comando de medição das duas pontas:

```
API:  npm run test:coverage --workspace @nexus/api
Web:  npm run test --workspace @nexus/web -- --coverage \
        --coverage.include="src/**" --coverage.exclude="src/test/**"
```

| Suíte | Stmts | Branch | Funcs | Lines | Base medida |
| --- | --- | --- | --- | --- | --- |
| API | **86,88%** | 74,97% | 85,73% | 89,55% | 2.597/2.989 instruções, 1.426/1.902 ramificações, 541/631 funções, 2.374/2.651 linhas; 73 arquivos de `src` no relatório, todos com linhas mensuráveis |
| Web | **22,78%** | 17,26% | 19% | 24,14% | 912/4.003 instruções, 566/3.279 ramificações, 244/1.284 funções, 829/3.434 linhas; 91 arquivos instrumentados, 82 com código mensurável |

O que **não** está coberto, dito sem rodeios:

- **API:** um único arquivo continua em **0%**: `src/modules/cron/cron.runner.ts` (0 de 32 linhas) — os
  casos de `cron.test.ts` exercitam o matcher, o serviço e as rotas, mas o laço que dispara a rotina no
  processo do servidor não roda em teste. O resto do oco relevante é relatório e ambiente:
  `reports.service.ts` **50,41%** de instruções (114/212 linhas) e `reports.routes.ts` **70,9%** (31/47
  linhas) — dos oito relatórios, só `overview`, `finance` e o caminho do dinheiro têm asserção de valor;
  `config/env.ts` **60%** (8/14 linhas) porque as validações exclusivas de produção não disparam na suíte
  (ficaram em `validador-de-producao.test.ts`, que chama o validador direto). Depois vêm
  `companies.service.ts` 38/54 linhas, `finance.service.ts` 54/72, `products.service.ts` 68/83,
  `audit.routes.ts` 31/36, `lib/audit.ts` 8/9 e `app.ts` 40/48 (o handler de erro tem ramos que só
  acontecem em produção). O módulo novo não é oco: `service-orders.routes.ts` fecha em **100%** e
  `service-orders.service.ts` em **93,8%** de instruções. As cinco linhas fora do alcance dele são
  medidas uma por uma: o retry do número duplicado (375-376), o 403 do atendente sem vínculo com a ordem
  (607 — provado no navegador, não na suíte), a troca de cliente na edição (620) e o conflito de status
  quando outra requisição mexeu primeiro (682).
- **Web:** **38 dos 82 arquivos com código mensurável estão em 0%**, e o número caiu de 51 para 38 porque
  cinco arquivos de teste entraram desde a medição de 2026-10-12: rodapé único, menu sem página vazia,
  as duas trilhas de auditoria, métrica da vitrine e ordens de serviço. Eles montam telas de verdade,
  então `OrdensDeServico.tsx` está em **64,11%**, `PlataformaAuditoria.tsx` em **54,54%**, `Audit.tsx`
  em **50,86%**, `AdminShell.tsx` em **58,16%**, `ConfirmationModal` **69,09%**, `Modal` **51,13%**,
  `Pagination` **55,55%**, `Tabs` **52,5%**, `NotificationBell` **44,82%** e `AuthContext` **72,38%**.
  O que continua em 0% são as 13 das 16 telas do menu (Dashboard, Notificações, CRM, Clientes, Vendas,
  Produtos, Compras, Agenda, Financeiro, Usuários, CMS, Rotinas, Configurações), os cinco painéis do
  editor CMS, os dois painéis de Configurações, `Fields`, `PasswordInput`, `ErrorPage`, as páginas de
  autenticação e sete módulos de `lib/` que falam com a API (`cmsApi`, `cronApi`, `settingsApi`,
  `landingApi`, `masks`, `papeis`, `validators`). **Treze páginas de operação do painel seguem sem
  teste automatizado** — a garantia delas hoje são as provas de navegador em `tools/`, que não rodam
  sozinhas.

Limitações da medição que o revisor deve saber:

- No web não existe script `test:coverage`; o escopo foi passado por argumento na
  linha de comando. Sem isso o Vite mediria apenas os arquivos alcançados pelos
  9 testes, o que daria um número bonito e falso.
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

Todas conferidas arquivo por arquivo, e as linhas com número foram re-medidas em
2026-10-13 (F3.2 Parte 1), porque o README mudou de tamanho desde a passada anterior.

| # | Documentação diz | Código faz | Onde |
| --- | --- | --- | --- |
| D1 | "Autenticação, cadastro e recuperação: 8 rotas" | são **10** rotas (login, register, forgot, reset, refresh, logout, me, PATCH me, change-password, switch-company) | **corrigido nesta rodada**: a linha 455 do README agora diz 10 rotas e descreve os destinos; a fonte é `apps/api/src/modules/auth/auth.routes.ts` |
| D2 | `README.md:507` — tabela de tecnologias "react-router-dom 6" | `^7.18.4` no `package.json` do web (conferido nesta rodada) | `apps/web/package.json` — continua aberto: mexer na tabela de tecnologias não é desta fase |
| D3 | `README.md:20` e `README.md:495` dizem "MySQL 8" | o servidor local é **8.4.7** (re-medido por `SELECT VERSION()` nesta rodada: 8.4.7) | a série está certa; falta só o número exato onde o documento descreve o ambiente |
| D4 | Nenhuma tabela do README soma as 112 rotas | re-contado nesta rodada na tabela de módulos (`README.md:451-478`): as linhas com contagem explícita somam **111**, e falta exatamente uma — `GET /api/health`, que não tem linha própria; as linhas de sessão, RBAC, multiempresa, documentos legais, manutenção, modelos de e-mail, gateways, SaaS e backup aparecem sem número | `README.md:451-478` conferido contra a leitura estática dos 17 arquivos `*.routes.ts` |
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
| P1 | Senha de desenvolvimento visível nos pixels de `docs/screenshots/02-login.png`, já publicada no remoto | AUDITORIA N1 / G7 | risco **aceito pelo dono** em 2026-10-12: a conta é fictícia e nada é rotacionado ou reescrito por causa disso; deixou de travar o push |
| P2 | A credencial de desenvolvimento do seed (o valor não é impresso aqui; é o da chave `SEED_DEV_PASSWORD` do `.env` local) **não está em arquivo rastreado nenhum** — varrido nesta rodada: 0 ocorrência nos 307 arquivos de texto do `git ls-files`, e o seed recusa nascer sem a variável de ambiente (`apps/api/test/seed-seguro.test.ts`). O que sobra são 12 diffs do histórico que carregaram o literal antes da limpeza, e o dono decidiu não reescrever histórico | seção D da auditoria + §5 deste prompt | baixa em árvore, média no histórico público; **não vale em produção** |
| P3 | Código de recuperação de senha numa captura rastreada (`09-recuperar-senha.png`) | AUDITORIA N2 | média |
| P4 | Identificador real de empresa/espalhado em arquivos rastreados | AUDITORIA N3 | baixa |
| P5 | Capturas das outras telas do painel não foram reauditadas uma a uma | AUDITORIA N5 | NÃO VERIFICADO |
| P6 | Tema do painel x `data-bs-theme` do AdminLTE | AUDITORIA N7 | baixa, espera decisão |
| P7 | Relatórios sem asserção de valor por relatório | seção F | média |
| P8 | Sem CI, sem lint, sem threshold de cobertura | seção I / Fase 7 | média |
| P9 | Bundle único de 914,87 kB (gzip 271,50 kB) sem code-splitting | Fase 7 / F5 | média |
| P10 | Auditoria segue em parada: Fase 7 e os blocos B–H do prompt de mercado não foram executados | AUDITORIA, seção I | combinado com o dono |
| P11 | O movimento de estado feito pela tela não carrega motivo: a rota aceita `note`, o diálogo de confirmação da casa é de sim/não e o campo só aparece quando a mudança veio pela API | AUDITORIA N36 | média — espera decisão do dono, porque mexe no contrato dos diálogos do painel |
| P12 | Ordem de serviço concluída não gera lançamento financeiro nem venda | AUDITORIA N37 / ADR-0008 | combinado com o dono: é a fronteira com a Parte 2 |

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
npm run db:migrate -w @nexus/api        # 3. aplica as 19 migrations
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
  trabalho os dois servidores estavam de pé nesta rodada e as 15 rotas amostradas
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
node inventario-rotas.cjs      # rotas por método, caminho e exigência (112 na re-medicao)
node inventario-tabelas.cjs    # models x uso do delegate (30 na re-medicao)
node varredura-segredos.cjs    # segredo real x credencial de desenvolvimento
grep -rhcE 'app\.(get|post|patch|put|delete)\(' apps/api/src/modules/*/*.routes.ts
curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/<as 15 rotas da seção 4>

# Re-medicao de 2026-10-13 (F3.2 Parte 1), com saida real:
find apps/api/src -name "*.routes.ts" | wc -l        # 17
find apps/api/src -name "*.ts" | wc -l               # 74
grep -c "^model " apps/api/prisma/schema.prisma      # 30
grep -c "^enum " apps/api/prisma/schema.prisma       # 19
ls apps/api/prisma/migrations | grep -c "^20"        # 19
# rotas por modulo, somando 112:
for f in apps/api/src/modules/*/*.routes.ts; do printf "%s %s\n" "$(basename $f)" "$(grep -cE 'app\.(get|post|put|patch|delete)' $f)"; done
node -e "Prisma.$queryRawUnsafe('SELECT COUNT(*) ...') "   # 31 tabelas fisicas
node -e "Prisma.$queryRawUnsafe('SELECT VERSION()')"       # 8.4.7
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/health           # 200
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/service-orders   # 401
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/audit            # 401
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/audit/plataforma # 401
node tools/verify-ordens-de-servico.cjs   # 102 verificacoes, 0 falha
node tools/verify-sidebar.cjs             # 103 checagens, 0 falhas
# Seção 3, re-medida porque a árvore congelada contradizia as seções 5 a 7:
git ls-files --cached --others --exclude-standard \
  | awk -F/ '{if (NF==1) print "raiz"; else print $1}' | sort | uniq -c   # 428: apps 253, docs 130, tools 37, assets 1, raiz 7
ls -d apps/api/src/modules/*/ | wc -l                   # 17
ls apps/api/src/lib | wc -l                             # 17 (não 13: validate-doc não existe)
ls apps/api/test/*.test.ts | wc -l                      # 36
grep -lIi audit apps/api/test/*.test.ts | wc -l          # 23 arquivos que exercitam a auditoria
find apps/web/src -name '*.ts' -o -name '*.tsx' | wc -l  # 94
ls apps/web/src/lib | wc -l                             # 22
ls apps/web/src/pages/*.tsx | wc -l                     # 22
ls apps/web/src/components/landing | wc -l              # 12 (11 .tsx + copy.ts)
ls apps/web/src/test | wc -l                            # 11 (9 testes + 2 fábricas; sem setup.ts)
cat apps/web/src/styles/*.css | wc -l                   # 3.164
ls docs/adr/*.md | wc -l                                # 8
ls docs/decisoes/*.md | wc -l                           # 7 (G1-G6 + G8)
ls docs/screenshots/*.png | wc -l                       # 108 capturas
# varredura de credencial: 0 litrais nos 307 arquivos de texto rastreados e
# nenhum valor impresso; a contagem do historico (12 diffs) saiu de git log -S
# com o valor lido do .env em memoria, nunca na linha de comando.
```

Atualizar este documento é obrigação de quem mexer no projeto: se ele divergir do
código, o revisor externo foi enganado.
