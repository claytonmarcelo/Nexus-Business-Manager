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

Na rodada seguinte (2026-10-13, F3.2 Parte 2 — Cobranças manuais e catálogo de gateways) as mesmas seções
foram medidas de novo, porque o módulo trouxe uma tabela, dois enums, oito rotas, uma tela, a 17ª linha do
menu e 39 casos de teste novos (24 na API, 15 no web), mais a prova de navegador
`tools/verify-cobrancas.cjs` com 137 verificações. Três linhas que aquela passada deixou desatualizadas foram corrigidas aqui, e não
em silêncio: o fecho da Parte 1 (item 10), a divergência D2 do `react-router-dom` e a pendência P12, que a
própria Parte 2 encerrou.

---

## 1. Resumo executivo

1. O produto é um ERP SaaS multiempresa que funciona de ponta a ponta no ambiente
   local: 120 rotas de API sobre Fastify 5 + Prisma 6 + MySQL 8.4.7, painel React
   com 26 rotas (17 delas atrás do menu) e uma vitrine pública montada pelo banco.
2. Funciona e tem teste automatizado: autenticação com recuperação e renovação de
   sessão, RBAC com hierarquia de papéis, isolamento multiempresa, clientes,
   produtos e estoque, vendas com parcelas, compras e fornecedores, financeiro,
   CRM, agenda, ordens de serviço com o estoque baixando na conclusão, cobranças
   manuais com o recebimento registrado por pessoa e uma única receita no caixa,
   relatórios agregados, notificações, auditoria, rotinas agendadas,
   CMS da vitrine, documentos legais e modo manutenção.
3. A suíte inteira passa nesta rodada: 37 arquivos / 350 casos na API e 10 arquivos
   / 77 casos no web, com banco MySQL real de teste (sem mock).
4. É parcial por escolha, não por esquecimento: os relatórios agregados têm teste
   de acesso e de dinheiro, mas nem cada um dos oito tem asserção de valor
   própria, e o tema escuro do painel ainda é aplicado por nós, não pelo AdminLTE.
5. Não existe: envio de e-mail (SMTP), cobrança automática por gateway com
   credencial real, assinatura SaaS, nota fiscal, upload real de arquivo (a logo é
   só uma URL), backup e restauração. Nada disso tem botão morto na interface — e a
   ordem de serviço saiu da lista na Parte 1; a cobrança saiu na Parte 2, porque o
   carnê hoje emite, registra o recebimento, cancela e imprime.
6. Uma tabela existe só no schema: `email_templates`. `payment_gateways` passou a
   ter serviço, duas rotas e aba no carnê — gravando só a configuração do MANUAL,
   com as três colunas de credencial nulas por construção e fora da resposta.
7. Segurança: nenhuma rota nasce aberta (gate estrutural derruba o boot), e a
   senha do administrador não está em arquivo rastreado nem no histórico: o valor mora
   só em `tools/senha-admin.local.cjs` e no `apps/api/.env` (chave `SEED_ADMIN_PASSWORD`), os dois
   ignorados pelo git — medido com `git check-ignore -v`.
8. Risco conhecido e **decidido** pelo dono: uma captura rastreada mostra a
   senha de desenvolvimento nos pixels (`docs/screenshots/02-login.png`,
   `docs/AUDITORIA.md` N1). A decisão de 2026-10-12 (item 1 do PROMPT MESTRE) é
   que a conta é fictícia: não se rotaciona senha, não se reescreve histórico. O
   N1 deixou de travar o push e passou a risco aceito e registrado.
9. Cobertura re-medida nesta rodada: API com **87,23%** de instruções
   (2.871/3.291), 75,40% de ramificações, 86,81% de funções e 90,08% de linhas;
   web com **27,83%** de instruções (1.217/4.372), contra 22,78% da passada
   anterior, porque o carnê entrou no navegador de tela — 38 dos 83 arquivos
   mensuráveis do web ainda estão em 0%, e na API sobrou um (`cron.runner.ts`).
10. Branch `main` igual ao `origin/main` no começo desta passada: o backend das
    cobranças já está publicado (`9f1dd88`). O fechamento da F3.2 Parte 2 são dois
    commits — interface, teste de tela, prova de navegador e capturas num lote,
    documentação no outro — com push em avanço direto, sem force, e a prova
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
| Banco | MySQL do WAMP | 8.4.7, schema `nexusbusinessmanager` (desenvolvimento) e `nexusbusinessmanager_teste` (prova) |
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
│   │   │   ├── migrations/        (20 migrations + migration_lock.toml)
│   │   │   ├── schema.prisma      (31 models, 21 enums)
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── config/            (env.ts, producao.ts)
│   │   │   ├── lib/               (18 arquivos: audit, auth, brFields,
│   │   │   │                       company-context, errors, installments,
│   │   │   │                       money, pagination, password,
│   │   │   │                       passwordPolicy, pix, platform, prisma,
│   │   │   │                       rbac, stock, time, tokens, tx)
│   │   │   ├── modules/           (19 módulos: auth, companies, users, audit,
│   │   │   │                       clients, products, sales, purchases,
│   │   │   │                       finance, charges, gateways, crm, agenda,
│   │   │   │                       reports, notifications, cms, cron, health,
│   │   │   │                       service-orders)
│   │   │   ├── plugins/           (auth, gate, maintenance, security)
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   └── test/                  (37 arquivos .test.ts + helpers.ts)
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
│           ├── pages/             (23 arquivos)
│           ├── styles/            (7 arquivos CSS, 3.321 linhas no total)
│           └── test/              (12 arquivos: 10 testes + 2 fábricas;
│                                   o jsdom vem do vitest.config, não de setup.ts)
├── assets/brand/logo/
├── docs/
│   ├── adr/                       (9 ADRs)
│   ├── decisoes/                  (G1–G6 + G8, em 7 arquivos)
│   ├── design/palette.md
│   ├── screenshots/               (116 capturas)
│   ├── ANALISE.md, ANALISE-LACUNAS.md, AUDITORIA.md, PRODUCAO.md,
│   │   STATUS-AJUSTES.md
│   └── ESTADO-ATUAL.md            (este arquivo)
├── tools/                         (38 arquivos rastreados nesta rodada: 11
│                                   shoot-* + shoot.cjs, 14 verify-*, 4 patch-*,
│                                   3 audit-*, conta-de-captura.cjs,
│                                   senha-admin.cjs, para-innodb.cjs, wf.cjs,
│                                   make-favicon.ps1)
├── README.md, CHANGELOG.md
└── package.json, package-lock.json, .gitignore, .gitattributes, .editorconfig
```

Arquivos da árvore versionada nesta rodada, medidos com
`git ls-files --cached --others --exclude-standard` — ou seja, o que está no commit de
agora mais os arquivos novos deste módulo, que ainda não aparecem no `git ls-files` puro:
**450**, distribuídos em `apps` 265, `docs` 139, `tools` 38, `assets` 1 e 7 na raiz.
Código: 82 arquivos `.ts` em `apps/api/src` e 96 `.ts`/`.tsx` em `apps/web/src`.
Não há `.github/` — ou seja, **nenhum CI versionado**.

---

## 4. Rotas da API

Fonte: leitura estática dos 19 arquivos `*.routes.ts`, conferida contra o servidor em
execução e contra a regra 4 de `apps/api/test/isolamento-rotas.test.ts`, que exige que a
contagem medida pelo gancho `onRoute` do Fastify bata com a contagem declarada nos
arquivos de rota. Não existe `tools/inventario-rotas.cjs` no repositório: a medição da
passada anterior foi feita com um script de momento, fora do versionamento, e esta linha
foi corrigida para apontar no comando que qualquer um repete.

| Recorte | Quantidade |
| --- | --- |
| Rotas declaradas | **120** |
| Públicas de propósito (`config.public`) | 10 |
| Da plataforma (`assertPlatformAdmin`) | 15 |
| De empresa, com `app.authenticate` + permissão RBAC | 95 |
| Registradas sem gate | **0** |

Amostra ao vivo no servidor de dev desta rodada (respostas esperadas):
`GET /api/health` 200, `GET /api/public/landing` 200, `GET /api/leads` 401,
`GET /api/clients` 401, `GET /api/products` 401, `GET /api/sales` 401,
`GET /api/purchases` 401, `GET /api/finance/entries` 401,
`GET /api/agenda/events` 401, `GET /api/cms/config` 401, `GET /api/ops/jobs` 401,
`GET /api/audit` 401, `GET /api/auth/me` 401, `GET /api/reports/overview` 401,
`GET /api/service-orders` 401, `GET /api/charges` 401, `GET /api/charges/summary` 401 e
`GET /api/gateways` 401 (as três últimas saíram sem token contra o servidor de dev
desta rodada, com o serviço no ar).

Por módulo: agenda 7 · audit 2 · auth 10 · charges 6 · clients 5 · cms 14 ·
companies 5 · crm 6 · cron 3 · finance 9 · gateways 2 · health 1 ·
notifications 7 · products 11 · purchases 8 · reports 8 · sales 4 ·
service-orders 6 · users 6 — somando 120.

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
| GET | /api/charges | charges | charge:read |
| GET | /api/charges/summary | charges | charge:read |
| GET | /api/charges/:id | charges | charge:read |
| POST | /api/charges | charges | charge:write |
| POST | /api/charges/:id/pay | charges | charge:write |
| POST | /api/charges/:id/cancel | charges | charge:write |
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
| GET | /api/gateways | gateways | settings:read |
| PUT | /api/gateways/:provider | gateways | settings:write |
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

`schema.prisma` tem **31 models**, **21 enums**, e o banco físico tem **32 tabelas** (os 31
mais `_prisma_migrations`), medido por `SELECT COUNT(*) FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()` nesta rodada. A tabela nova é `charges`, e ela foi contada
com 0 linhas no fim das provas — o carnê devolve o banco como o encontrou.
Há **20 migrations** versionadas, de `20261010154418_init_foundation` a
`20261013020000_add_cobrancas_manuais` — as três últimas são aditivas: a coluna
`scope` da auditoria (F2), as três tabelas do atendimento (F3.2 Parte 1) e o carnê
(F3.2 Parte 2).

Classificação por uso real no código da API (contagem de chamadas
`prisma.<modelo>` / `tx.<modelo>` nos 82 arquivos `.ts` de `src`):

| Tabela | Status | Evidência |
| --- | --- | --- |
| User, Company, CompanyUser, RefreshToken, PasswordResetToken, AuditLog | Em uso | auth, sessões, RBAC, auditoria |
| Client, Product, ProductCategory, StockMovement, Sale, SaleItem, Supplier, Purchase, PurchaseItem | Em uso | cadastros e operações |
| FinanceCategory, FinanceEntry, Charge | Em uso | financeiro, carnê da venda e a receita única da cobrança |
| Lead, AgendaEvent | Em uso | CRM e agenda |
| Notification, NotificationPreference | Em uso | sino, `/api/notifications` |
| LandingConfig, LandingItem, LegalDocument | Em uso | vitrine e textos legais |
| CronJob | Em uso | `/api/ops/jobs` e o relógio |
| ServiceOrder, ServiceOrderItem, ServiceOrderHistory | Em uso | `/api/service-orders`, a baixa de estoque na conclusão e a linha do tempo |
| **EmailTemplate** | **Sem uso** | só schema + migration; nenhum delegate, nenhuma rota, nenhuma tela |
| PaymentGateway | Em uso | `gateways.service.ts` lê e grava só a configuração do MANUAL; as três colunas de credencial ficam nulas e não aparecem na resposta |

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
| Ordens de serviço (atendimento, peças, baixa de estoque) | Implementado e testado | 6 rotas; `ordens-de-servico.test.ts` (35 casos) e `ordens-de-servico.test.tsx` (10); prova `tools/verify-ordens-de-servico.cjs` (103); decisão em `docs/adr/0008-ordem-de-servico-baixa-estoque-na-conclusao.md` |
| Relatórios agregados | **Parcial** | 8 rotas existem e respondem; asserções de valor cobrem overview, financeiro e dinheiro; os seis demais relatórios só têm teste de acesso/intrusão |
| Notificações e preferências | Implementado e testado | 7 rotas; `notifications.test.ts` |
| Auditoria | Implementado e testado | 2 rotas de leitura (empresa e plataforma); gravação exercitada em 24 dos 37 arquivos de teste (`grep -l "audit\|AuditLog"` em `apps/api/test/*.test.ts`) |
| Rotinas agendadas (cron) | Implementado e testado | 3 rotas de plataforma; `cron.test.ts`; prova `tools/verify-rotinas.cjs` |
| CMS da vitrine | Implementado e testado | 14 rotas; `cms.test.ts`; provas `tools/verify-cms.cjs` e `tools/verify-landing-cms.cjs` |
| Documentos legais | Implementado e testado | `cms.test.ts` (11 casos, incluindo textos legais) e `settings.test.ts` (21 casos) |
| Modo manutenção | Implementado e testado | `plugins/maintenance.ts`, bypass público com rate-limit próprio |
| Painel/Dashboard | Implementado e testado pela API | `/api/reports/overview` + meta de receita; tela `Dashboard.tsx` |
| Cobranças manuais e catálogo de gateways | Implementado e testado | 6 rotas de cobrança + 2 de gateway; `cobrancas.test.ts` (24 casos) e `cobrancas.test.tsx` (15); prova `tools/verify-cobrancas.cjs` (137); decisão em `docs/adr/0009-cobranca-manual-receita-unica-e-vencida-lida.md`. Os três provedores de mercado param no catálogo com `available: false` e o motivo por escrito — nenhuma chamada de saída |
| Modelos de e-mail | **Só tabela** | `email_templates` no schema; sem SMTP |
| Upload de arquivo (logo, anexos) | **Não iniciado** | nenhum parser `multipart` na API; `logoUrl` é `VarChar(255)` de URL |
| SaaS: planos, assinaturas, faturas | **Não iniciado** | sem tabela, sem rota |
| Backup e restauração | **Não iniciado** | sem código |
| CI / quality gate | **Não iniciado** | não existe `.github/` nem script de lint |

---

## 7. Frontend

`apps/web/src/App.tsx` declara **26 rotas** React (25 com caminho e o índice do painel):

- públicas: `/` (vitrine montada pelo conteúdo do banco), `/login`, `/cadastro`,
  `/recuperar-senha`, `/legal/:slug`, `/403`, `/401`;
- protegidas por `ProtectedRoute` sob `/app`: `index` (Dashboard), clientes,
  produtos, vendas, ordens-de-servico, compras, financeiro, cobrancas, crm, agenda,
  usuarios, auditoria, configuracoes, cms, notificacoes, rotinas,
  auditoria-plataforma — 17 telas atrás do menu;
- catch-all `*` com página de erro.

São **23 arquivos** em `pages/` e **33 arquivos** de componente (12 na raiz de
`components/`, 5 em `components/cms/`, 11 em `components/landing/`, 3 em
`components/layout/`, 2 em `components/settings/`), mais `context/AuthContext` e
`context/ThemeContext`, e 22 módulos em `lib/`.

Componentes globais de uso transversal: `ProtectedRoute`, `AdminShell`,
`NotificationBell`, `Tabs`, `Pagination`, `Modal`, `ConfirmationModal`,
`StateView`, `PageLoader`, `PasswordInput`, `Logo`, `ThemeToggle`, `ErrorPage` e
a biblioteca de campos `Fields.tsx`.

O que é apenas visual hoje: (a) o seletor de tema do painel escreve o atributo no
elemento, mas o AdminLTE 4 olha `data-bs-theme` — divergência registrada como N7
em `docs/AUDITORIA.md`, à espera de decisão; (b) a aba Modelos de e-mail não existe
como funcionalidade, e na aba Gateways os três provedores de mercado aparecem
marcados como indisponíveis, com o motivo — o que aparece na tela é o que a API
realmente devolve.

Desde a F3.1 não existe linha de menu apenas visual: o tipo `NavItem` exige
`to: string`, então linha sem rota não compila. A barra está com 17 itens em
6 camadas, todos link de página que existe — o 16º entrou na F3.2 Parte 1, com a tela
`OrdensDeServico.tsx`, e o 17º na Parte 2, com `Cobrancas.tsx` —, e quem garante isso é
`apps/web/src/test/menu-sem-pagina-vazia.test.tsx` (6 casos: destino obrigatório,
vocabulário "em breve" extinto do arquivo, cada destino com `<Route>` e arquivo de
página com título e sem copy de obra, CSS sem o estado apagado, barra montada só com
`<a>` com href e o filtro de camada vazia ainda no lugar) mais as 103 checagens de
`tools/verify-sidebar.cjs`, que clica as dezessete linhas uma por uma — reexecutado nesta
rodada com a linha nova: **104 checagens, 0 falhas** (eram 103 com dezesseis).

Bundle medido no `npm run build` desta rodada, refeito no portão de encerramento: `index.js`
**946,30 kB** (gzip 278,06 kB) e `index.css` **395,16 kB** (gzip 60,53 kB) num único chunk — o Vite
avisou `Some chunks are larger than 500 kB`. Code-splitting continua por fazer. O
crescimento desde a medição anterior (914,87 kB de JS e 390,88 kB de CSS) é +31,43 kB
e +4,28 kB, e a explicação cabe na tela nova: `Cobrancas.tsx` é o maior arquivo de
tela do painel, com 53.488 bytes de fonte, e o estilo do carnê, do documento e do
recibo entrou no `components.css` (+157 linhas).

---

## 8. Testes

Medidos no portão de fechamento desta fase (`npm test`, exit 0, saída real colada no
relatório da rodada), com MySQL de teste ativo (a suíte da API não usa mock): zero
falha e zero skip nas duas pontas. As durações variam corrida a corrida — a mesma
suíte, com o contador de cobertura ligado, levou 386,96 s na API e 16,70 s no web.

| Suíte | Arquivos | Casos | Resultado | Duração |
| --- | --- | --- | --- | --- |
| API (`vitest`, forks, serial) | 37 | 350 | 37 passed (37) · 350 passed (350) | 341,60 s |
| Web (jsdom + Testing Library) | 10 | 77 | 10 passed (10) · 77 passed (77) | 8,73 s |

Cobertura real, medida agora com o mesmo comando de medição das duas pontas:

```
API:  npm run test:coverage --workspace @nexus/api
Web:  npm run test --workspace @nexus/web -- --coverage \
        --coverage.include="src/**" --coverage.exclude="src/test/**"
```

| Suíte | Stmts | Branch | Funcs | Lines | Base medida |
| --- | --- | --- | --- | --- | --- |
| API | **87,23%** | 75,40% | 86,81% | 90,08% | 2.871/3.291 instruções, 1.631/2.163 ramificações, 599/690 funções, 2.625/2.914 linhas — as quatro somas vêm do `lcov.info` gerado pelo portão, e os percentuais são os mesmos impressos no terminal; 81 arquivos `.ts` de `src` no relatório, um deles com zero linhas alcançadas |
| Web | **27,83%** | 22,24% | 23,90% | 29,40% | percentuais impressos pelo relatório; as bases contadas arquivo por arquivo em `apps/web/coverage/coverage-final.json` são 1.217/4.372 instruções, 802/3.606 ramificações, 334/1.397 funções e 1.099/3.738 linhas (a conta de instruções dá 27,84% e o relatório arredonda para 27,83%); 92 arquivos no JSON, 83 com código mensurável |

O que **não** está coberto, dito sem rodeios:

- **API:** um único arquivo continua em **0%**: `src/modules/cron/cron.runner.ts` (0 de 32 linhas) — os
  casos de `cron.test.ts` exercitam o matcher, o serviço e as rotas, mas o laço que dispara a rotina no
  processo do servidor não roda em teste. O resto do oco relevante é relatório e ambiente:
  `reports.service.ts` **50,41%** de instruções (114/212 linhas) e `reports.routes.ts` **70,9%** (31/47
  linhas) — dos oito relatórios, só `overview`, `finance` e o caminho do dinheiro têm asserção de valor;
  `config/env.ts` **60%** (8/14 linhas) porque as validações exclusivas de produção não disparam na suíte
  (ficaram em `validador-de-producao.test.ts`, que chama o validador direto). Depois vêm
  `companies.service.ts` 38/54 linhas, `finance.service.ts` 54/72, `products.service.ts` 68/83,
  `audit.routes.ts` 31/36, `lib/audit.ts` 8/9 e `app.ts` 42/50 (o handler de erro tem ramos que só
  acontecem em produção). Os módulos das duas partes da F3.2 não são ocos. Ordens de serviço:
  `service-orders.routes.ts` fecha em **100%** e `service-orders.service.ts` em **93,8%** de instruções
  (174/179 linhas); as cinco linhas fora do alcance dele são medidas uma por uma — o retry do número
  duplicado (375-376), o 403 do atendente sem vínculo com a ordem (607, provado no navegador, não na
  suíte), a troca de cliente na edição (620) e o conflito de status quando outra requisição mexeu
  primeiro (682). Cobranças: o módulo inteiro em **91,21%** de instruções e **94,47%** de linhas;
  `charges.routes.ts` em **100%** (32/32) e `charges.service.ts` em 99/105, com as seis linhas de fora
  listadas uma por uma no `lcov.info`; `charge-adapters.ts` em 22/25 (fora: 79, 97 e 159 — três ramos
  do catálogo que só disparam com provedor real, e por isso mesmo o MANUAL nunca os percorre) e
  `charges.schemas.ts` em 18/19. Gateways: `gateways.service.ts` com **100%** de linhas (33/33) e
  `gateways.routes.ts` com 14/15. A ramificação do módulo de cobranças (75,14%) é a mais oca dos dois,
  e é ela que a suíte ainda não bate dos dois lados nos validadores condicionais — nada ali está
  escondido: o número está na tabela acima.
- **Web:** **38 dos 83 arquivos com código mensurável estão em 0%** — o mesmo número da passada anterior,
  com um arquivo a mais no denominador. Desde a medição de 2026-10-12 entraram seis arquivos de teste
  (rodapé único, menu sem página vazia, as duas trilhas de auditoria, métrica da vitrine, ordens de
  serviço e o carnê), e eles montam telas de verdade: `Cobrancas.tsx` está em **83,19%** de instruções
  (89,59% de linhas), `OrdensDeServico.tsx` em **64,14%**, `PlataformaAuditoria.tsx` em **54,54%**,
  `Audit.tsx` em **50,86%**, `AdminShell.tsx` em **58,16%**, `ConfirmationModal` **69,09%**, `Modal`
  **51,13%**, `Pagination` **55,55%**, `Tabs` **55%**, `NotificationBell` **44,82%** e `AuthContext`
  **72,38%**. O que continua em 0% são as **13 das 17 linhas do menu** (Dashboard, Notificações, CRM,
  Clientes, Vendas, Produtos, Compras, Agenda, Financeiro, Usuários, CMS, Rotinas, Configurações) — as
  quatro restantes (Ordens de serviço, Cobranças, Auditoria e Auditoria da plataforma) têm teste de tela.
  Fora do menu, seguem em 0% os cinco painéis do editor CMS, os dois painéis de Configurações, `Fields`,
  `PasswordInput`, `ErrorPage`, as páginas de autenticação e sete módulos de `lib/` que falam com a API
  (`cmsApi`, `cronApi`, `settingsApi`, `landingApi`, `masks`, `papeis`, `validators`). **Treze telas de
  operação do painel seguem sem teste automatizado** — a garantia delas hoje são as provas de navegador
  em `tools/`, que não rodam sozinhas.

Limitações da medição que o revisor deve saber:

- No web não existe script `test:coverage`; o escopo foi passado por argumento na
  linha de comando. Sem isso o Vite mediria apenas os arquivos alcançados pelos
  10 arquivos de teste, o que daria um número bonito e falso.
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

Todas conferidas arquivo por arquivo. As linhas com número foram re-medidas em
2026-10-13 (F3.2 Parte 1) e outra vez na Parte 2, porque o README cresce a cada rodada
e referência de linha velha é a primeira mentira deste arquivo.

| # | Documentação diz | Código faz | Onde |
| --- | --- | --- | --- |
| D1 | "Autenticação, cadastro e recuperação: 8 rotas" | são **10** rotas (login, register, forgot, reset, refresh, logout, me, PATCH me, change-password, switch-company) | **corrigido**: a linha 464 do README (re-medida nesta passada) diz 10 rotas e descreve os destinos; a fonte é `apps/api/src/modules/auth/auth.routes.ts`, onde as dez foram contadas |
| D2 | `README.md:517` — a tabela de tecnologias dizia "react-router-dom 6" | `^7.18.4` no `package.json` do web | **corrigido nesta rodada**: a linha agora diz 7, conferido no `package.json` e no `node_modules` instalado (7.18.4) |
| D3 | `README.md:20` e `README.md:505` dizem "MySQL 8" | o servidor local é **8.4.7** (re-medido por `SELECT VERSION()` nesta rodada: 8.4.7) | a série está certa; falta só o número exato onde o documento descreve o ambiente |
| D4 | Nenhuma tabela do README somava as rotas | **fechado nesta rodada**: re-contado na tabela de módulos (`README.md:462-489`), as linhas com contagem explícita somam **119** — as 111 de antes, mais 6 de cobrança e 2 de gateway —, e falta exatamente uma, `GET /api/health`, que não tem linha própria. 119 + 1 = **120**, a contagem medida | `README.md:462-489` conferido contra a leitura estática dos 19 arquivos `*.routes.ts` (120) e contra a regra 4 de `isolamento-rotas.test.ts` |
| D5 | `docs/ANALISE-LACUNAS.md` e tarefas antigas citam "Módulo Relatórios + exportações" como pendente | os 8 relatórios agregados existem na API e 6 telas exportam CSV pelo navegador | `apps/api/src/modules/reports`, `apps/web/src/pages/*.tsx` |
| D6 | O passo a passo de instalação do README não mandava gerar o cliente Prisma (hoje manda: `README.md:703-715`, re-medido nesta passada) | um clone novo não compila sem `npm run prisma:generate -w @nexus/api` — 217 erros de tipo por cliente não gerado | **corrigido nesta rodada**; registrado como N9 em `docs/AUDITORIA.md` |
| D7 | `docs/ANALISE.md` e `docs/ANALISE-LACUNAS.md` são retratos de rodadas anteriores | rotas, tabelas e contagens mudaram desde então | `docs/ANALISE.md`, `docs/ANALISE-LACUNAS.md` — vale neles o mesmo aviso deste arquivo: quem mexer reatualiza |

Nada no README promete integração de pagamento, SMTP ou nota fiscal como
existente — a linha de gateways diz explicitamente "**nenhuma chamada de saída**
enquanto não houver credencial real e a decisão G2", e o código confirma as duas
partes: `payment_gateways` hoje é lida e escrita só pela configuração do MANUAL, e
`charge-adapters.ts` não conhece URL, chave ou SDK de provedor nenhum.

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
| P9 | Bundle único de 946,30 kB (gzip 278,06 kB) sem code-splitting | Fase 7 / F5 | média |
| P10 | Auditoria segue em parada: Fase 7 e os blocos B–H do prompt de mercado não foram executados | AUDITORIA, seção I | combinado com o dono |
| P11 | O movimento de estado feito pela tela não carregava motivo: a rota aceita `note`, o diálogo de confirmação da casa é de sim/não e o campo só aparecia quando a mudança veio pela API | AUDITORIA N36 | **fechado na T2** (decisão D4): `confirmActionComMotivo` — superfície aditiva, contrato dos cinco diálogos existentes intocado — obrigou motivo no cancelamento de ordem, no estorno de ordem concluída e no cancelamento de cobrança (ADR-0012) |
| P12 | Ordem de serviço concluída não gera lançamento financeiro sozinha | AUDITORIA N37 / ADR-0008 | **fechado na F3.2 Parte 2**: a tela de ordens tem o botão "Gerar cobrança", e a receita entra quando uma pessoa registra o recebimento. O lançamento automático continua não existindo, agora por decisão registrada (N45: com receita automática na venda, a mesma venda cobrada no papel entraria duas vezes no caixa) |
| P13 | O Financeiro formata coluna de dia a partir de objeto `Date`, a mesma classe de risco do vencimento lido no fuso | AUDITORIA N44 | média — é outra tela, e a passada dela não é desta fase |
| P14 | Cinco telas ainda pintam a resposta atrasada de uma busca antiga por cima da busca nova (`Clients.tsx`, `Products.tsx`, `Finance.tsx`, `CRM.tsx`, `Users.tsx`) | AUDITORIA N51 | média — a guarda existe em Cobranças, Vendas, Compras, Ordens de serviço e Auditoria; a passada completa é da F5 |
| P15 | Cobrança sem pagamento parcial, sem juros e sem estorno; `PAID` não cancela | AUDITORIA N46 | combinado com o dono: estorno é movimento do caixa e o produto ainda não tem |

---

## 11. Decisões que dependem do dono

Nada aqui foi inventado; está bloqueado por escolha registrada.

1. **SMTP** (`docs/decisoes/G1-envio-de-email.md`) — escolha do provedor e
   credenciais reais; sem isso, recuperação de senha continua entregando o código
   pela API e `email_templates` segue sem uso.
2. **Cobrança e assinatura** (`G2`) — gateway, contas, ambiente. A cobrança manual
   já está no ar (carnê, PIX por chave, boleto, transferência, dinheiro e cartão de
   maquininha, com o recebimento registrado por pessoa); o que a falta de credencial
   trava é a cobrança automática pelo provedor e o SaaS de planos.
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

Ordem testada na rodada do pacote, e não re-executada nesta passada; o que não pude
testar está dito logo abaixo. As contagens de arquivos e casos daquela tabela são as
da suíte de então (28 arquivos / 230 casos na API e 4 / 20 no web) — as medidas desta
rodada estão na seção 8.

```bash
git clone <url> && cd nexusbusinessmanager
npm ci
npm run prisma:generate -w @nexus/api   # 1. SEM ESTE PASSO NADA COMPILA (N9)
cp apps/api/.env.example apps/api/.env  # 2. ajuste DATABASE_URL, JWT_* e SEED_*
npm run db:migrate -w @nexus/api        # 3. aplica as 20 migrations
npm run db:seed   -w @nexus/api         # 4. admin global + conta de desenvolvimento
npm run typecheck && npm run build && npm test   # 5. os três portões
npm run dev:api                         # 6. http://localhost:3001/api
npm run dev:web                         # 7. painel em http://localhost:5173
```

O que foi executado naquela rodada, em `C:/wamp64/www/nexus-verificacao` (clone de
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
  trabalho os dois servidores estavam de pé, e as 15 rotas amostradas da seção 4
  responderam. Nesta passada a amostra chegou a 18 rotas e as três novas
  (`/api/charges`, `/api/charges/summary` e `/api/gateways`) foram medidas sem
  sessão: as três devolvem 401, que é a resposta correta para quem não tem token.
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
# Nota desta rodada: inventario-rotas.cjs e inventario-tabelas.cjs nunca estiveram
# na arvore versionada - a contagem anterior saiu de script solto, fora do git. Desde
# aqui a matriz de rotas e o inventario de tabelas tem fonte dentro do repo: a regra 4
# de apps/api/test/isolamento-rotas.test.ts (roda no npm test) para as rotas, e a
# secao 5 deste arquivo, medida com SHOW TABLES no MySQL, para as tabelas.
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
node tools/verify-ordens-de-servico.cjs   # 102 verificacoes, 0 falha (Parte 1)
node tools/verify-sidebar.cjs             # 103 checagens, 0 falhas (Parte 1)

# Re-medicao de 2026-10-13 (F3.2 Parte 2 - Cobrancas manuais e catalogo de gateways),
# toda linha com saida real guardada em log desta rodada:
npm run typecheck                          # api + web, zero erro
npm run build                              # index.js 946,30 kB / 278,06 kB gzip
                                           # index.css 395,16 kB / 60,53 kB gzip
npm test                                   # api 37 arquivos / 350 casos / 341,60 s
                                           # web 10 arquivos / 77 casos / 8,73 s
npm run test:coverage --workspace @nexus/api
   # stmts 87,23% (2.871/3.291) · branch 75,40% (1.631/2.163) · funcs 86,81% (599/690)
   # lines 90,08% (2.625/2.914) · 81 arquivos no relatorio · duracao 386,96 s
node conta-cobertura.cjs          # script de bancada desta rodada (fora do repo, em Temp):
                                  # lê apps/web/coverage/coverage-final.json e soma
                                  # instrucoes 1.217/4.372 · ramificacoes 802/3.606
                                  # funcoes 334/1.397 · linhas 1.099/3.738
                                  # 92 arquivos no JSON, 83 mensuraveis, 38 em 0%
node tools/verify-cobrancas.cjs             # 137 verificacoes, 0 falhas
node tools/verify-sidebar.cjs               # 104 checagens, 0 falhas (17 linhas)
node tools/verify-ordens-de-servico.cjs     # 103 verificacoes, 0 falhas (recapturado)
find apps/api/src -name "*.routes.ts" | wc -l        # 19
grep -rhE 'app\.(get|post|put|patch|delete)\(' apps/api/src/modules \
  --include="*.routes.ts" | wc -l                    # 120 rotas declaradas
ls apps/api/test/isolamento-rotas.test.ts            # a regra 4 bate onRoute com os 120
find apps/api/src -name "*.ts" | wc -l               # 82
ls -d apps/api/src/modules/*/ | wc -l                # 19
ls apps/api/src/lib | wc -l                          # 18 (pix.ts entrou nesta rodada)
ls apps/api/test/*.test.ts | wc -l                   # 37
grep -c "^model " apps/api/prisma/schema.prisma      # 31
grep -c "^enum " apps/api/prisma/schema.prisma       # 21
ls apps/api/prisma/migrations | grep -c "^20"        # 20
node -e "... SHOW TABLES ..."                        # 32 tabelas fisicas; charges em 0 linhas
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/charges          # 401
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/charges/summary  # 401
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/gateways         # 401
find apps/web/src -name '*.ts' -o -name '*.tsx' | wc -l   # 96
ls apps/web/src/pages/*.tsx | wc -l                      # 23
ls apps/web/src/test | wc -l                             # 12 (10 testes + 2 fabricas)
cat apps/web/src/styles/*.css | wc -l                    # 3.321
grep -c 'to: "/app' apps/web/src/components/layout/AdminShell.tsx   # 17 linhas de menu
ls docs/adr/*.md | wc -l                                 # 9
ls docs/screenshots/*.png | wc -l                        # 116 capturas
ls tools/*.cjs | wc -l                                   # 38
git ls-files --cached --others --exclude-standard | wc -l  # 450 arquivos da arvore
# varredura de credencial literal desta rodada: zero literais nos arquivos rastreados
# e zero no patch origin/main..HEAD, com nenhum valor impresso em parte alguma.
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
