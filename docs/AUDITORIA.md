# AUDITORIA — Preparação para uso comercial (Fase 0)

Data: 2026-10-11 · Escopo: código real do repositório, working tree de 11/10-11 · Método: leitura de
todos os 63 arquivos TS de `apps/api/src` (246 operações Prisma + 3 `$queryRaw`), das 16 rotas de
módulo, do schema Prisma, do seed, da suíte de testes, do `apps/web` e da raiz do repositório; checagens
diretas de codificação (`BOM/CRLF`), `npm audit` e `git ls-files`. **Nenhum arquivo de código foi
alterado nesta fase.** Cada achado tem severidade — **CRÍTICO / ALTO / MÉDIO / BAIXO** — e localização `arquivo:linha`.

> Regra de ouro da Fase 0 aplicada: nada aqui vem do README. Onde o README diz algo, o código foi aberto
> e conferido; onde o prompt externo de auditoria afirma algo sobre o projeto, a afirmação foi testada
> contra o repositório (seção H) — e a maioria não se sustenta: o brief descreve outro software.

---

## Sumário de severidades

| Severidade | Qtd | Onde bate |
|---|---|---|
| CRÍTICO | 4 (+1 de processo) | escalada de privilégio por papel ×2, escrita cross-tenant, corrida de estoque; + suíte de testes gravando no banco de dev |
| ALTO | 14 | escopo global do CMS/cron, seed com senha fixa, token de reset exposto fora de produção, financeiro solto das vendas, float em dinheiro, npm audit, ausência de CI/cobertura, lote sem commit, bundle sem split |
| MÉDIO | 12 | rate-limit local, trustProxy, reuso de refresh, datas UTC×local, deletes sem guarda, relatórios carregando tabelas inteiras |
| BAIXO | 12 | enumeração por tempo, PII na auditoria, dependências mortas, documentação desatualizada, TOCTOU com UUID |

---

## A. Mapa real dos módulos (código × README)

Backend Fastify 5 + Prisma 6 + MySQL, monorepo npm workspaces (`apps/api`, `apps/web`) — **não** o
`backend/` com `mysql2` descrito no brief externo. 16 módulos registrados em `src/app.ts:90-105`:
auth, companies, users, audit, clients, products, sales, purchases, finance, crm, agenda, reports,
notifications, cms, cron, health. `PaymentGateway` e `EmailTemplate` existem **só como tabela** (sem
service nem rota) — o README diz isso.

Verificações numéricas do README contra o código:

| Claim do README | Veredito | Evidência |
|---|---|---|
| 27 models, 15 enums | CONFIRMADO | `grep -c '^model ' schema.prisma` = 27; `^enum ` = 15 |
| 12 migrations | CONFIRMADO | `apps/api/prisma/migrations/` (não 24 SQL em `backend/`) |
| Clientes 5 / Vendas 4 / Financeiro 9 / CMS 14 rotas | CONFIRMADO | contagem de registradoras nos `*.routes.ts` |
| Auth "8 rotas" | DIVERGÊNCIA MENOR | `auth.routes.ts` tem 10 registradoras; metodologia de contagem |
| 16 arquivos · 113 testes | CONFIRMADO **no working tree** | HEAD rastreado tem 15/102 — o lote cron está sem commit (ver G3) |
| Exportação CSV | CONFIRMADO, com nuance | gerada no navegador (`apps/web/src/lib/csv.ts`, botões em Vendas/Financeiro/Clientes/Compras); não é endpoint da API |
| "Sem Dockerfile nem pipeline" | CONFIRMADO | não existe `.github/`, nem Docker, nem CI de nenhuma espécie |

---

## B. Isolamento multiempresa

O esqueleto é honesto: `company-context.ts:14-31` resolve a empresa do token e **revalida o vínculo
`CompanyUser` no banco a cada requisição**; todas as listagens/leituras de tenant filtram por `companyId`
(0 exceções em ~249 operações revisadas); `switchCompany` exige o vínculo (`auth.service.ts:150-163`);
IDs vindos da requisição (`clientId`, `productId`, `saleId`, `leadId`…) são pré-checados com
`findFirst { id, companyId }` (`sales.service.ts:70-77`, `purchases.service.ts:117-123`,
`finance.service.ts:111-125`, `agenda.service.ts:211-220`). As `$queryRaw` existentes são parametrizadas
e filtram empresa (`products.service.ts:100-104, 221-224`).

Onde o isolamento falha é na **escrita autorizada por papel**, não no filtro de leitura:

- **[CRÍTICO] `users.routes.ts:37-43` + `users.service.ts:53-55` — ADMIN cria OWNER.**
  `POST /users` exige só `user:write` (papel ADMIN possui — `rbac.ts:11`) e grava `role: input.role` sem
  qualquer guarda; `addMemberSchema` aceita o enum completo, inclusive `OWNER`
  (`users.schemas.ts:11-16`). Um ADMIN adiciona a si mesmo (ou a um laranja) como OWNER da empresa e
  herda `*` — incluindo o caminho para o alcance global do CMS (ver B-B). O PATCH de papel tem a guarda
  ("Apenas o proprietário transfere propriedade", `users.routes.ts:51`); o POST não tem nenhuma.
- **[CRÍTICO] `users.routes.ts:45-52` + `users.service.ts:61-76` — ADMIN rebaixa o OWNER existente.**
  A guarda só cobre o **novo** valor `OWNER` e o e-mail do super admin
  (`SUPER_ADMIN_EMAIL`, `users.service.ts:68-70`). Nada impede `PATCH /users/:dono/role {role:"STAFF"}`
  feito por um ADMIN: o proprietário perde a empresa para quem deveria servir.
- **[CRÍTICO] `notifications.routes.ts:59` + `notifications.schemas.ts:24-26` — varredura cross-tenant.**
  `POST /notifications/scan` aceita `companyId` livre no corpo
  (`varreduraEmpresa(q.companyId ?? ctx.companyId)`) sem verificar que o caller tem vínculo com essa
  empresa. Qualquer OWNER/ADMIN varre e grava avisos de contas vencidas na empresa de terceiro.
- **[ALTO] O CMS da vitrine é global com chave por papel de qualquer tenant.**
  `LandingConfig`/`LandingItem`/`LegalDocument` não têm `companyId` (por design: a vitrine é uma só), mas
  o guard é `content:write` = **OWNER de qualquer empresa** (`rbac.ts:9`), e o auto-cadastro
  (`auth.service.ts:203-231`) torna todo cadastrado OWNER da própria empresa. Consequência comercial:
  qualquer usuário que crie uma conta pode reescrever a página pública da plataforma, os textos legais e
  fechar a plataforma inteira em modo manutenção. É o mesmo balcão que deveria ser só do super admin.
- **[ALTO] `cron.routes.ts:21-54` — jobs de sistema manipulados por qualquer ADMIN.**
  `settings:write` é de OWNER **e ADMIN** de qualquer empresa; com ele se pausa/reativa a varredura de
  todos os tenants e se dispara `varreduraGlobal`, cuja resposta traz contagem agregada da plataforma
  ("N avisos em M empresas", `cron.handlers.ts:37`).
- **[MÉDIO] `users.service.ts:120-125` — revogar sessão vaza entre empresas.**
  O `findFirst` da sessão exige vínculo do alvo com **qualquer** empresa em comum com o caller; o update
  final é por `{ id: sessionId }` puro. Compartilhando uma empresa, um ADMIN derruba sessões do usuário
  nas outras empresas dele.
- **[MÉDIO] Agregações de sistema expostas a requisitante de tenant** — `varreduraGlobal`
  (`notifications.service.ts:242-247`) e os handlers cron iteram todas as empresas: correto como job,
  errado como rota chamada por inquilino (mesmo achado do item anterior, raiz diferente).
- **[BAIXO] TOCTOU generalizado**: `update`/`delete` por `{ id }` puro após um `findFirst { id, companyId }`
  (`clients.service.ts:46-47`, `finance.service.ts:167,176-178`, `crm.service.ts:123,151`,
  `agenda.service.ts:275-295` …). Sem exploração prática com UUID, mas `updateMany({ where: { id, companyId } })`
  fecharia a classe inteira por construção.
- **[BAIXO] `audit.routes.ts:28`**: `AuditLog.companyId` é nullable e falhas de login globais gravam sem
  empresa — ficam invisíveis para qualquer tenant (consequência do modelo, não bug).

Super admin: implementado **sem flag no token** — e-mail fixo (`passwordPolicy.ts:9`) + upsert como OWNER
em toda empresa no seed (`seed.ts:44-52`) e em todo `POST /companies` (`companies.service.ts:36-43`).
Funciona, mas é um caso especial espalhado em 3 lugares; a Fase 1 pede a separação explícita
plataforma × empresa (ver recomendação R1).

---

## C. Endpoints sem autenticação ou sem checagem de permissão

Não há hook global de auth — a proteção é `preHandler: [app.authenticate]` rota a rota
(`plugins/auth.ts:19-32`). Todas as rotas de negócio conferidas têm authenticate; a maioria tem
`assertPermission`. Lista completa do que dispensa login:

| Rota | Onde | Julgamento |
|---|---|---|
| GET /api/health | health.routes.ts:5 | legítimo; expõe `db: up/down` [BAIXO] |
| GET /api/public/landing · /api/public/legal/:kind | cms.routes.ts:41,43 | legítimo (só devolve publicado) |
| POST /api/public/bypass | cms.routes.ts:52-61 | oráculo sim/não, 30/min, token 9 bytes ~2^72, `timingSafe` — aceitável |
| POST /api/auth/login · register · forgot · reset · refresh · logout | auth.routes.ts:18-49 | legítimos, com rate-limit próprio |

Autenticadas sem `assertPermission` (propositais e corretos): bootstrap `POST /companies`, listagem das
próprias empresas, `settings/opcoes` (listas estáticas), `/auth/me`, `/change-password`,
`/switch-company`, notificações em escopo `userId+cid`, `GET /reports/overview` (filtrado bloco a bloco
por `can()`). Risco de processo: **[MÉDIO] rota nova esquecida fica aberta por default** — só um gate
estrutural (hook global com allowlist, como o de manutenção já faz) elimina essa classe.

---

## D. Valores padrão inseguros e segredos

- **[ALTO] `auth.service.ts:255` + `auth.routes.ts:35` — token de reset no HTTP fora de produção.**
  `return isProd ? { ok: true } : { ok: true, devToken: token }` e a rota monta
  "Código gerado (modo desenvolvimento): <token>" na resposta. Em produção o gate desliga, mas qualquer
  instância de homologação/dev exposta permite resetar a senha de **qualquer** conta — inclusive a do
  super admin, que não tem exceção no fluxo de recuperação. Verificado por leitura direta do código.
- **[ALTO] `seed.ts:22-23` — conta de desenvolvimento com senha hardcoded e OWNER**, criada
  incondicionalmente (sem gate de `NODE_ENV`). Rodar o seed num ambiente comercial entrega uma porta
  aberta documentada no próprio repositório. (O admin global, este sim, exige `SEED_ADMIN_PASSWORD` e o
  seed falha cedo sem ele — `seed.ts:14-19`. Correto.)
- **[BAIXO] `seed.ts:73` imprime a senha do admin no console** — vaza para log de CI quando houver pipeline.
- **[MÉDIO] Rate-limit in-memory** (`security.ts:19-23`, sem `store`): multi-processo/multi-instância
  multiplica os limites e a proteção de login não é compartilhada. O brief pede Redis — não há Redis.
- **[MÉDIO] `trustProxy` não configurado** (`app.ts:27`): atrás de proxy reverso, `req.ip` vira o IP do
  proxy — rate-limit vira global e o IP da auditoria/bypass de manutenção mente.
- **[MÉDIO] Sem detecção de reuso de refresh rotacionado** (`auth.service.ts:119-121`): token roubado e
  rotacionado rende só 401 para o ladrão; a família não é revogada (roubo passa despercebido).
- **[MÉDIO] `forgotPassword` revoga todas as sessões do usuário** (`auth.service.ts:253`) sem prova de
  posse — DoS de logout remoto contra qualquer e-mail conhecido (limitado a 5/min por IP).
- **[BAIXO] Enumeração de usuário por tempo** (login sem bcrypt quando o e-mail não existe,
  `auth.service.ts:84-98`); **[BAIXO] política de senha fraca por padrão** (8+ com 1 maiúscula e 1
  especial, `passwordPolicy.ts:11-18` — é a regra de acesso DEFINIDA pelo dono do produto, não mudar sem
  ordem); sem bloqueio por tentativas falhas além do rate-limit; **[BAIXO] CSP só em produção**
  (`security.ts:8-11`); body limit = default 1 MB do Fastify (não configurado).
- **[ALTO] `npm audit`: 13 vulnerabilidades (4 críticas, 4 altas, 5 moderadas)** — diretas:
  `@fastify/jwt <=9.1.0` (crítica, com `fast-jwt` transitiva), `vitest`/`vite` (dev-only), `prisma`
  (alta), `react-router-dom` (moderada). Sem fix automático indolor (`fixAvailable` não reportado).
- Positivo verificado: **nenhum segredo hardcoded em código rastreado**; `.env` ignorado; `CREDENCIAIS.md`
  e `tools/senha-admin.local.cjs` fora do git (confirmado por `git ls-files`/`git check-ignore`); JWT
  secrets sem default — a app não sobe sem segredo (`env.ts:10-11`); logs não gravam senha/token
  (únicos `log.*`: boot/shutdown e jobs); bcrypt rounds=12; refresh opaco persistido como HMAC.

---

## E. Integridade de negócio (transações, estoque, dinheiro, datas)

As 10 chamadas `prisma.$transaction` existentes: `users:41`, `companies:30`, `sales:96,149`,
`purchases:133,172`, `auth:215,273,362`, `products:187`. O problema não é a ausência da transação — é o
padrão **read-modify-write fora/unlockado dentro dela**:

- **[CRÍTICO] Estoque: corrida de oversell em venda.** `sales.service.ts:75-115` (criação): produtos
  lidos fora da tx (linha 75), validação de saldo (88-94) e gravação de **valor absoluto** derivado da
  leitura (`stockQuantity: Number(prod.stockQuantity) - i.quantity`, linha 115). `:149-173` (confirmação):
  a venda é lida fora da tx (143) e o status **não é reconfereado com lock dentro dela** — dois "confirmar"
  simultâneos passam os dois e baixam estoque duas vezes. Não existe `FOR UPDATE`, `updateMany` condicional
  por `stockQuantity >=`, nem decremento atômico em lugar algum do repo (grep confirmado). Os testes de
  venda/compra provam o fluxo **sequencial** (`app.inject`); concorrência nunca foi exercida.
- **[ALTO] Mesma classe em movimentação manual** (`products.service.ts:173-191` — guarda de saldo antes
  da tx, `newStock` calculado de leitura velha) **e em recebimento/estorno de compra**
  (`purchases.service.ts:116-196`), incluindo `costPrice` gravado por último-escritor-vence.
- **[ALTO] Venda não conversa com financeiro.** Nenhum caminho de venda/compra cria lançamento de contas a
  receber/pagar (grep: `financeEntry` só é tocado por finance/reports/notifications/cron). Confirmar venda
  não gera receita a receber; cancelar não reverte nada. Não é corrida — é feature ausente (Fase 3 do
  plano; o financeiro hoje é 100% manual e pode divergir silenciosamente).
- **[ALTO] Dinheiro em `Number()` no JS.** O schema é limpo (tudo `Decimal`, zero `Float` em valores —
  conferido campo a campo), mas a aritmética converte: `sales.schemas.ts:12-13`/`finance.schemas.ts:26`
  coagem a float; `sales.service.ts:82-83` e `purchases.service.ts:128-129` arredondam linha a linha em
  float; `finance.service.ts:197-203` faz saldo como subtração de floats; o pior está em
  `reports.service.ts:13-20,534,669-675` — acumulação float **antes** do arredondamento único final, que
  pode fechar centavos diferente do `_sum` SQL do resumo. Parcelamento não existe (ausência confirmada).
- **[MÉDIO] Meia-noite UTC × local convivendo.** `FinanceEntry.dueDate` é `@db.Date`; relatórios usam
  início de dia UTC (`reports.service.ts:34-38`), a varredura de avisos e o cron usam local
  (`notifications.service.ts:210-211`, `cron.handlers.ts:92-93`). Em UTC-3, um lançamento pode estar vencido
  para o sino e não estar para o relatório. `Company.timezone` existe mas nunca é consultado.
- **[MÉDIO] `finance.service.ts:72` exclui categoria com histórico** — `onDelete: SetNull` silencia a
  categoria de lançamentos passados. Cadastros-core (cliente/fornecedor/produto) são soft-delete corretos.
- **[MÉDIO] Relatórios carregam tabelas inteiras em JS** (`reports.service.ts:296,479,485,623`) — é o
  design documentado de agregação no servidor, mas é o risco de memória/latência que cresce com o cliente.
- **[MÉDIO] Duas duplas de escrita sem tx nenhuma**: criar produto + movimento inicial
  (`products.service.ts:127-132`) e conversão de lead em cliente (`crm.service.ts:144-151`) — crash no meio
  órfã registro.
- **[MÉDIO] Estoque negativo não é barrado no banco**: as guardas são JS fora da unidade atômica
  (`sales.service.ts:90,154`, `products.service.ts:180`, `purchases.service.ts:190`), sem `CHECK` no MySQL
  e sem política configurável por empresa (`Company` não tem campo de política de estoque).
- **[BAIXO] `products.service.ts:100-105` — filtro de estoque baixo com `LIMIT 500`** silencioso: do
  produto 501 em diante ele para de listar. **[BAIXO] recorrência de agenda cruza DST** (aritmética local,
  `agenda.service.ts:91-107` — latente sem DST no Brasil hoje). **[BAIXO] cron é wall-clock local por
  decisão documentada** — frágil se o servidor mudar de fuso.
- Positivo: paginação no servidor com teto de 100 em todas as listas de rota
  (`lib/pagination.ts:4-8`); fan-out de notificação deliberadamente fora da tx de negócio com o motivo
  escrito no código (`notifications.service.ts:20-21,110-117`).

---

## F. Cobertura de testes real

- A suíte é honesta e ativa. Na foto da auditoria eram **16 arquivos, 113 casos**, com **zero
  `.skip/.only/.todo`** e escrita real no MySQL. Depois das Fases 1 a 3 e do Bloco A do prompt de mercado,
  são **28 arquivos e 230 casos** — continua sem skip, sem mock de banco.
- **[ALTO → RESOLVIDO na A0] Cobertura nunca foi medida**: `@vitest/coverage-v8` não estava instalado,
  `vitest.config.ts` não definia nada e nenhum script rodava coverage. Desde 2026-10-11 existe
  `npm run test:coverage` (raiz e API) e a linha de base ficou registrada aqui: **84,15% de instruções,
  70,4% de ramificações, 83,03% de funções, 86,93% de linhas** antes do Bloco A; **85,57% / 72,96% /
  83,93% / 88,29%** ao fim dele (2 301 de 2 689 instruções, 1 174 de 1 609 ramificações, 486 de 579
  funções, 2 113 de 2 393 linhas). Onde ainda dói: `reports.service.ts` 53,77% de linhas,
  `cron.runner.ts` 0%, `companies.service.ts` 70,37%, `finance.service.ts` 75%. O portão mínimo por
  arquivo (threshold que quebra o build) fica na Fase 7, junto com o CI — sem CI, threshold só atrapalha.
- **[ALTO] Buracos de integração**: `users` (criar membro, permissions, sessions/revoke — só cai de
  raspão em settings.test.ts), `reports` (7 dos 8 endpoints nunca chamados), `audit` (filtros/paginação),
  `companies` (sem arquivo próprio), `health` (uma asserção incidental). Frontend: **zero testes** — nem
  vitest configurado em `apps/web`.
- **[CRÍTICO de processo] Os testes só rodam no MySQL do dev**: `helpers.ts` grava e apaga dados no mesmo
  banco da aplicação (`DATABASE_URL` do `.env` aponta para `nexusbusinessmanager`), com pool `singleFork`
  serial declarado no config. Sem container/serviço isolado, a suíte não é portável nem CI-ready.
- **[ALTO] Nenhuma CI existe** (não há `.github/`, nem `.gitlab-ci.yml`, nem qualquer `.yml` de pipeline):
  build, typecheck, testes e audit dependem de disciplina manual. As 33 provas puppeteer em `tools/` são
  ricas (ex.: `verify-rotinas.cjs` 37 checagens, `verify-cms.cjs` 115) mas exigem servidores de dev
  ligados, Chrome em caminho Windows fixo e conta admin real — não substituem pipeline.
- **[ALTO] `tools/patch-schema-*.cjs`**: quatro scripts que mutavam `schema.prisma` in-place na gênese do
  projeto — risco histórico de divergência schema×migration; devem ser arquivados com nota.

---

## G. Arquivos soltos e inconsistências do repositório

1. Raiz **limpa**: sem `.py`, sem `estrutura.txt`, sem `README.en.backup.md`, sem `mobile/`; o
   `package-lock.json` da raiz é o lockfile legítimo dos workspaces. Nenhum `*.log/*.tmp/.DS_Store/dist/`
   rastreado (322 arquivos no git).
2. **[BAIXO] `docs/ANALISE-LACUNAS.md` desatualizado** (datado 10/10): linha 44 marca Notificações como
   PENDENTE quando o módulo está completo; linha 56 fala em 12 arquivos/62 testes contra os 16/113 reais.
3. **[ALTO] Lote "rotinas agendadas" inteiro fora do git** (consequência da regra do dono do projeto de
   commitar ao final): `src/modules/cron/`, `cron.test.ts`, `pages/Rotinas.tsx`, `lib/cronApi.ts`,
   `tools/verify-rotinas.cjs`, 6 prints e mais 17 arquivos modificados estão só no working tree. O HEAD
   commitado **não builda o seed atual** (seed.ts importa `cron.handlers`). Entre agora e o commit final,
   qualquer perda de disco perde a etapa inteira.
4. **[BAIXO] Dependências mortas confirmadas no código**: `jquery`, `sweetalert2` e `@types/jquery` sem
   um único import em `src/` (o README já admite); `admin-lte` usado só pelo CSS.
5. **[ALTO] Bundle**: zero `React.lazy`, zero `manualChunks`; chunk único de **858 kB JS** (+387 kB CSS) —
   o "1,6 MB" do brief não é verificável, mas o alerta do Vite (>500 kB) é real e FullCalendar é o maior
   contribuinte. Code-splitting por rota é ganho fácil.
6. Codificação: **0 BOM, 0 CRLF** nos 219 textos rastreados; `.editorconfig` e `.gitattributes` (eol=lf)
   já existem — a regra 9 do brief está satisfeita hoje. Nota: `core.autocrlf=true` no git local do dev é
   atenuado pelo `.gitattributes`, não é risco ativo.

---

## H. Premissas do prompt externo × este repositório

O brief de auditoria descreve outro software. Conferidas uma a uma:

| Premissa do brief | Veredito |
|---|---|
| mysql2 com SQL direto; Prisma só na auth | **FALSO** — Prisma é a camada única (ADR-0001); `mysql2` não existe no repo; 2 `$queryRaw` pontuais e documentadas |
| 24 migrations SQL em `backend/database/migrations/` | **FALSO** — 12 migrations Prisma em `apps/api/prisma/migrations/`; não existe `backend/` |
| pasta `mobile/` citada | **FALSO** — não existe nem é mencionada |
| demo `admin@nexusdemo.com / 123456` | **FALSO** — nenhuma dessas strings no código; as contas reais estão no item D (e sim, a conta de desenvolvimento `admin@nexus.local` com senha fixa no seed era um problema análogo, este real — resolvido na A8, onde a senha passou a vir de `SEED_DEV_PASSWORD`) |
| `.py`/`estrutura.txt`/lockfile órfão na raiz | **FALSO** — raiz limpa (seção G) |
| CI em `.github/workflows/` | **FALSO** — não existe CI (F) |
| Tailwind + Recharts | **PARCIAL** — Tailwind 4 real; Recharts não existe (FullCalendar + KPIs próprios) |
| bundle ~1,6 MB | **NÃO VERIFICÁVEL** — medido: 858 kB JS + 387 kB CSS |
| licença MIT | **FALSO** — `UNLICENSED` (`package.json:6`); para comercializar, a decisão de licenciamento está aberta (R9) |

Consequência prática: as Fases 1-10 do brief **continuam válidas como plano** (isolamento, segurança,
transações, SaaS, fiscal, LGPD, testes, infra, frontend, docs), mas cada correção tem de mirar o código
deste repo — os `arquivo:linha` deste relatório são o ponto de partida, não os do brief.

---

## I. Recomendações por fase (o que a auditoria implica)

- **R1 (Fase 1 — isolamento)**: criar camada única de autorização — `updateMany/deleteMany` com
  `{ id, companyId }` por construção; fechar os três CRÍTICOS (guarda de papel em `addMember`/`updateRole`
  espelhando a do PATCH; `companyId` do scan sempre do contexto); separar super admin de verdade (flag no
  token ou tabela própria, em vez de e-mail comparado em 3 lugares); mover CMS/cron para permissões de
  **plataforma**; teste automatizado de intrusão A×B em todos os endpoints, travando o CI.
- **R2 (Fase 2 — segurança)**: `devToken` só com flag explícita `AUTH_EXPOSE_RESET_TOKEN=1` e nunca por
  ambiente; gate de `NODE_ENV` no seed da conta dev (ou removê-la e gerar credencial efêmera para os
  testes); proteção do super admin no fluxo de recuperação; store compartilhada de rate-limit (Redis) e
  `trustProxy` antes de qualquer multi-instância; atualizar `@fastify/jwt`/`vitest`/`vite`/`prisma` e
  re-rodar audit; body limit explícito; detecção de reuso de refresh.
- **R3 (Fase 3 — integridade)**: decremento atômico condicional (`updateMany where stockQuantity >= q`
  com contagem de linhas afetadas, ou `FOR UPDATE` dentro da tx) em venda/confirmar/cancelar/estorno/
  movimento/recebimento; revalidar status da venda dentro da tx; link venda↔financeiro com parcelamento
  (feature nova, decisão de layout de contas); `Decimal` até o fim do cálculo (arithmetic em centavos
  inteiros ou lib decimal) nos relatórios; política de estoque por empresa; meia-noite única (fuso da
  empresa) para vencimentos.
- **R4 (Fases 4-6 — SaaS/fiscal/LGPD)**: nada existe; `PaymentGateway`/`EmailTemplate` são tabelas
  mudas. Decisões do dono antes de código: provedor (Asaas/MP/Stripe), API fiscal (Focus NFe/eNotas/
  PlugNotas), SMTP. O produto tem a regra registrada de **não inventar integração sem credencial**.
- **R5 (Fase 7 — qualidade)**: container MySQL no CI (GitHub Actions cobrindo build+typecheck+test+audit),
  `@vitest/coverage-v8` com threshold progressivo até 70%, testes dos buracos de `users/reports/audit`,
  code-splitting por rota no web (lazy nas rotas pesadas: Agenda/FullCalendar primeiro).
- **R6 (Fase 8 — infra)**: Dockerfile multi-stage + compose com MySQL e Redis; health/ready separados
  (o `/health` atual cai junto com o banco porque `estadoManutencao()` roda antes do allowlist sem
  try/catch — `plugins/maintenance.ts:22-25`); logs JSON com requestId; backup com restauração testada.
- **R7 (Fase 9 — front)**: além do split, tratamento global de sessão expirada já existe (refresh com
  rotação); falta E2E de verdade (Playwright) — as provas puppeteer atuais são ricas mas acopladas ao
  disco do dev.
- **R8 (Fase 10 — docs)**: atualizar `ANALISE-LACUNAS.md` ou arquivá-lo; arquivar `patch-schema-*.cjs`;
  OpenAPI gerado das schemas Zod/Fastify; guia de deploy/backup; remover jquery/sweetalert2.
- **R9 (decisão pendente do dono)**: licença comercial (UNLICENSED atual protege o código, mas não define
  o contrato de assinatura), provedores, e **quando** o lote sem commit entra no git.

---

*Relatório produzido na Fase 0 sem alterar código. Aprovado pelo dono com instrução de executar
todas as fases sem nova escolha de opções.*

## Adenda da execução — Fase 1 (isolamento) encerrada

- Os três CRÍTICOS da seção B estão fechados: ADMIN criar OWNER, ADMIN rebaixar OWNER e varredura
  cross-tenant do sino. Somou-se ainda o encerramento de sessão de terceiro pela rota de tenant.
- O administrador da plataforma passou a ser uma coluna (`users.platform_role`), não um e-mail no
  código; CMS e `/ops/jobs` exigem esse alcance, conferido no banco a cada request (R1 completo).
- **Achado ao vivo, não previsto no relatório**: o banco de desenvolvimento inteiro era **MyISAM**
  (padrão do WAMP no `my.ini`), com os 41 foreign keys do schema existindo no papel e valendo zero,
  ~22 mil linhas órfãs e transações sem atomicidade. Reparado por `tools/para-innodb.cjs`
  (InnoDB + FKs + limpeza conforme a semântica de cada constraint) e pelo `my.ini` com InnoDB. A
  corrida de oversell da Fase 3 agora tem onde existir — sem InnoDB não havia transação de fato.
- Suíte verde com FKs valendo (16 arquivos, 113 testes), typecheck e build limpos, provas de
  navegador rerodadas (CMS 115, rotinas 37, notificações 85, configurações 108).
- **Camada de escrita por construção (sub-fase 1c)**: todos os `update`/`delete` dos serviços de
  tenant agora filtram pelo `companyId` dentro do próprio `where` (notificação amarra `userId` +
  `companyId`; papel de membro e sessão fazem o mesmo pela linha própria). A proteção antes só
  existia na leitura de confirmação logo acima de cada escrita — um chamamento futuro sem essa
  leitura atravessava empresas. O P2025 do Prisma virou 404 no handler central. Auth (conta da
  própria pessoa) e CMS/Rotinas (plataforma, `assertPlatformAdmin`) ficaram fora por desenho.
  Suíte 16/113 verde com a camada ativa; prova de notificações 85/85 rerodada. Falta agora a
  varredura sistemática de intrusão A×B por endpoint (sub-fase 1d).
- **Intrusão A×B automatizada (sub-fase 1d)**: `apps/api/test/intrusao.test.ts` — duas empresas
  reais, um OWNER cria a documentação viva pela API e o OWNER da outra empresa ataca todas as
  rotas de escrita/leitura por id com payloads válidos. Resultados esperados e provados: 404 em
  toda linha de terceiro, 403 ao tentar derrubar sessão alheia pela rota da própria empresa, 400
  em referências cruzadas (categoria/produto/fornecedor de A num cadastro de B) e o scan de
  avisos de B não gera nada na empresa de A mesmo pedindo o `companyId` dela no corpo. A última
  checagem confere linha por linha no banco que nenhuma linha de A foi tocada. Com a Fase 1,
  todos os CRÍTICOS e ALTOS de isolamento da seção B estão fechados e blindados por teste.
  Suíte agora em 17 arquivos e 127 testes verdes.

## Adenda da execução — Fase 2 (segurança de produção) encerrada — 2026-10-11

- **devToken (ALTO)**: o código de recuperação só sai pela resposta com
  `AUTH_EXPOSE_RESET_TOKEN=1` escrito no `.env` — o `NODE_ENV` perdeu o poder de abrir a porta.
  A suíte prova a ausência do campo e a existência do token no banco (hash).
- **Seed (ALTO + BAIXO)**: a conta `admin@nexus.local` não nasce mais em produção sem
  `SEED_DEV_ACCOUNT=1`, e o log final parou de imprimir a senha do administrador — hoje ele
  nomeia as contas e diz se a dev foi criada, sem valor secreto.
- **Recuperação × administrador da plataforma (MÉDIO)**: `forgotPassword` para um
  `SUPER_ADMIN` não gera token nem revoga sessões — devolve o mesmo 200 genérico e grava
  `auth.forgot_password_bloqueado` na auditoria. `resetPassword` recusa token de SUPER_ADMIN
  mesmo forjado direto no banco (cinto extra para código antigo).
- **Reuso de refresh (MÉDIO)**: nova coluna `refresh_tokens.used_at` (migration
  `20261011200000_add_refresh_used_at`, reversível). Reapresentar um token já rotacionado
  derruba **todas** as sessões vivas daquela pessoa e grava `auth.refresh_reuse`; revogação
  por decisão (logout, admin, troca/recuperação de senha) marca só `revokedAt` e continua
  sem reação em cadeia — logout de uma aba não derruba a outra.
- **trustProxy e body limit (MÉDIO)**: `TRUST_PROXY` (default 0) e `BODY_LIMIT_BYTES`
  (default 1 MiB) declarados no `env.ts` e aplicados na subida do Fastify. Sem proxy
  declarado, header forjado não engana rate-limit, auditoria nem o pulso da manutenção.
- **Gate estrutural**: `plugins/gate.ts` — gancho `onRoute` que derruba a subida se qualquer
  rota nascer sem `app.authenticate` no preHandler e sem o carimbo `config.public = true`.
  A superfície aberta do projeto passou a ser exatamente 10 rotas carimbadas (6 de auth,
  3 da vitrine, 1 health); o preflight `OPTIONS` do CORS é rota de framework e não pede
  carimbo. Testado nos dois sentidos, incluindo o boot real.
- **Dependências (ALTO, 13 vulnerabilidades)**: `@fastify/jwt` 9→10.2.4 (crítica),
  `vitest` 2→5 (crítica do tinypool; configurada `fileParallelism: false` + folga do
  rate-limit global no ambiente de teste — o limitador por rota continua nos valores reais),
  `vite` 5.4→7.3 com `@vitejs/plugin-react` 5 (alta; escolhido 7 em vez do 8.3.4 mais novo
  porque o range vulnerável vai até 6.4.2 e o peer do `@tailwindcss/vite` pede casamento
  conservador), `react-router-dom` 6→7.18.4 (moderada) e `npm audit fix` no resto.
  **Restam 3 ALTAS**: a cadeia `prisma`/`@prisma/config` → `deepmerge-ts`, que só tem correção
  no Prisma 8 (ainda RC) e vive no CLI de desenvolvimento — nada dela entra no runtime da API.

**Pendências declaradas desta fase:**
- Store compartilhado de rate-limit em Redis (parte do R2): levado de propósito para a
  Fase 8, é onde o Docker/compose apresenta o Redis ao stack; em instância única — como o
  projeto roda hoje — o contador em memória é exato. Comentado em `plugins/security.ts`.
- Migração para Prisma 8 estável fecha os 3 altos restantes (revalidar schema + suíte na volta).

Validação da fase: typecheck da API limpo; suíte 18 arquivos / 135 testes verdes duas rodadas
seguidas (novo `test/seguranca.test.ts` com 8; `auth-flows` reescrito sem o devToken); typecheck
e build do web OK contra Vite 7 + RR 7; provas de navegador rerodadas contra o servidor com gate:
configurações 108/108, CMS 115/115, notificações 85/85, rotinas 37/37.

## Adenda da execução — Fase 3 em andamento — sub-fase 3a (estoque atômico) encerrada — 2026-10-11

A sub-fase 3a fecha o CRÍTICO de oversell e os ALTO de escrita absoluta de estoque/custo da seção E.
- `lib/stock.ts` (novo): baixarEstoque é `UPDATE ... WHERE stock >= q` na transação, count 0 → 400 com saldo re-lido; subirEstoque é `increment`, com custo da última compra no mesmo update; `trackStock` no where mantém o combinado de produto sem rastreamento.
- `permitirNegativo` já existe como parâmetro do helper — a política por empresa (Company) chega na sub-fase 3b e só liga esse fio.
- Vendas e compras: status reivindicado dentro da transação (`updateMany where status = lido`); confirmação, cancelamento e estorno não correm mais dois vezes no mesmo documento.
- `moveStock`/estoque inicial em transação; ADJUST continua absoluto por decisão declarada (inventário é declaração, não cálculo).
- CRM: lead→cliente (WON) agora numa `$transaction` única — dupla sem tx da seção E encerrada.
- Achado novo durante os testes de corrida: deadlock InnoDB P2034 (FK do item segura lock S no produto; decremento pede X) virava 500 em clique duplo. `lib/tx.ts` re-tenta até 3× com recuo progressivo; a vencida recebe o 400 honesto.
- `test/oversell.test.ts`: 5 cenários de concorrência real (mesma venda 2×, duas vendas pelo mesmo saldo, compra recebida 2×, OUT manual duplo, receber×cancelar) — saldo final sempre coerente com o status, nunca negativo.

Pendências declaradas da Fase 3: 3b política de estoque por empresa (UI + campo), 3c meia-noite no fuso da empresa, 3d dinheiro em Decimal/centavos nos relatórios, 3e vínculo venda↔financeiro com parcelamento.

Validação da sub-fase: typecheck da API limpo; suíte 19 arquivos / 140 testes verdes (5 novos). Backend-only — nenhuma tela alterada, provas de navegador não afetadas.

## Adenda da execução — Fase 3 em andamento — sub-fase 3b (política de estoque por empresa) encerrada — 2026-10-11

A sub-fase 3b transforma o `permitirNegativo` que a 3a deixou como parâmetro morto em decisão da empresa, guardada no cadastro dela e escrita na tela de Configurações.
- Coluna `companies.allow_negative_stock` (`BOOLEAN NOT NULL DEFAULT false`, migration `20261011210000_add_company_allow_negative_stock`, reversível) — o default preserva exatamente o comportamento da 3a, nenhuma empresa acordou com o estoque destrancado.
- `permiteEstoqueNegativo(companyId)` em `lib/stock.ts` é a fonte única: lida uma vez antes de abrir a transação, nunca por item.
- A chave liga só as três portas de saída (`baixarEstoque`): confirmar venda, estorno de compra recebida-cancelada e OUT manual. `subirEstoque` e ADJUST continuam fora — política de saldo não é política de entrada.
- No `createSale`, ligado o permissivo, o pré-check em JS é pulado de propósito: com saldo negativo autorizado ele seria uma porta falsa. Desligado, continua dando o nome do produto na cara antes de a transação começar.
- Count-0 do `baixarEstoque` passou a diferenciar "não pertence à empresa" de "não controla estoque" — com a política ligada, produto sem rastreamento ainda não aceita OUT.
- Escrita parcial de Configurações ganhou o primeiro booleano do pipeline (`companies.schemas.ts`, `mudancas` widening para `string | number | boolean | null`); sem chave extra de validação, sem campo novo fora da guarda.
- Painel: bloco "Política de estoque" na aba Empresa com a peça `CampoLigado` e gravação própria, como os outros cinco; `settingsApi.ts` espelha o campo nos dois sentidos.
- Achado da prova: o `toastr` do botão desligar no componente tinha redação antiga enquanto a prova esperava a nova — divergência escrita à mão entre tela e prova, descoberta com diagnóstico em navegador real e normalizada nos dois lados.

Pendências declaradas da Fase 3: 3c meia-noite no fuso da empresa, 3d dinheiro em Decimal/centavos nos relatórios, 3e vínculo venda↔financeiro com parcelamento.

Validação da sub-fase: typecheck da API limpo; typecheck e build do painel limpos; suíte 20 arquivos / 145 testes verdes (novos `test/estoque-politica.test.ts` com 5); prova de navegador de Configurações 115 checagens / 0 falhas, com o switch provado nos dois sentidos e as capturas da aba Empresa renovadas.

## Adenda da execução — Fase 3 em andamento — sub-fase 3c (meia-noite no fuso da empresa) encerrada — 2026-10-11

A sub-fase 3c fecha o achado de que `Company.timezone` era escrito na tela de Configurações e lido em nenhum lugar: todas as bordas de dia do sistema de leitura passaram a ser o dia da empresa, não o do datacenter.
- `apps/api/src/lib/time.ts` (novo) é a única casa da regra: `meiaNoiteNoFuso`, `ontemNoFuso`, `calendarioDaEmpresa`, `diaNoFuso`, `mesNoFuso`, `fusoDaEmpresa`. Nenhum módulo de leitura soma `setHours`/`setUTCHours` no relógio do processo.
- A regra tem duas bordas porque há duas espécies de coluna. Instante da meia-noite local para `createdAt`/`startAt`/`paidAt`; dia de calendário ancorado à meia-noite UTC para as `@db.Date` (`dueDate`), que guardam o dia que a pessoa digitou. Trocar uma pela outra é o regressivo que o teste cobre: com a meia-noite de Brasília como borda de `dueDate`, todo lançamento do dia nascia vencido.
- O deslocamento é lido pelo `Intl.DateTimeFormat` com o `timeZone` duas vezes (a segunda confere o instante que a primeira devolveu), então horário de verão e fuso de meia hora são respeitados; o dia de transição tem a largura que ele tem. Fuso inválido no cadastro cai em UTC de propósito — escrita já é barrada em `fusoValido`, e uma coluna envelhecida não derruba painel nem sino.
- `recortesDaEmpresa(companyId)` em `reports.service.ts` virou a origem de mês corrente, mês anterior e dia corrente para `overview`, `clientes`, `vendas` e `financeiro`. Encerrados os três pontos da seção E que liam o UTC do processo (`mesCorrente()`, `hoje()`, `slice(0,10)` de `new Date()`).
- Série diária de vendas: baldes e etiquetas `de`/`ate` no fuso da empresa. Fluxo de caixa: numerado em calendário, janela de `dias` dias terminando no hoje da empresa, chave `diaDeCalendario` — um dia de transição não se repete nem falta.
- `finance.summary` (vencido e rótulo do mês) e a varredura de avisos de vencidos usam a borda de calendário; o "venceu em dd/mm/aaaa" do corpo saiu do dia gravado no banco, e a contagem de dias de atraso voltou a ser inteira.
- Rotinas: `estoque-baixo` deduplica pelo dia da empresa e `relatorio-diario` fecha a janela entre as duas viradas dela (`ontemNoFuso`), por empresa, no fuso de cada uma.
- Decisão declarada: a *agenda* do cron (`cron.parse.ts`, "rodar às 07:00") continuou no relógio do servidor — é o horário do operador da máquina, e cada empresa recebe o conteúdo do próprio dia. Levar a agenda para o fuso da empresa exigiria coluna de fuso por job e reescrita do executor; fica para quando houver mais de um fuso de operação real no deploy.
- Achado fora do escopo, não corrigido aqui: `agenda.service.ts:94-99` monta recorrência com `setHours` do servidor, então um "todo dia às 09:00" de uma empresa em Asia/Tokyo hoje é calculado no fuso da máquina. É a mesma família da decisão acima, mas envolve reescrever a expansão de recorrência de eventos já gravados — levado para a lista de pendências da Fase 3.
- `test/fuso-dia.test.ts` (11): meia-noite de São Paulo/Tóquio/Calcutá calculadas à mão, ontem de cada fuso, borda de calendário contra borda de instante, série de vendas em duas empresas de fusos opostos, mês do painel, vencidas do resumo, varredura com antiduplicação e a rotina de relatório diário — mais o fuso quebrado que não pode derrubar nada.

Pendências declaradas da Fase 3: 3d dinheiro em Decimal/centavos nos relatórios, 3e vínculo venda↔financeiro com parcelamento, e a recorrência da Agenda no fuso da empresa (achado acima).

Validação da sub-fase: typecheck da API e do painel limpos, build Vite OK; suíte completa 21 arquivos / 156 testes verdes (eram 20 / 145). Backend-only — nenhuma tela alterada, provas de navegador das sub-fases anteriores não afetadas.

## Adenda da execução — Fase 3 em andamento — sub-fase 3d (dinheiro em Decimal/centavos) encerrada — 2026-10-11

A sub-fase 3d fecha o [ALTO] "Dinheiro em `Number()` no JS" da seção E: entre a leitura do banco e a escrita no banco, valor monetário passou a andar em centavo inteiro ou `Prisma.Decimal`, e `Number` só existe na última linha antes do JSON.
- `apps/api/src/lib/money.ts` (novo) é a única casa: `centavos`, `somarCentavos`, `moedaDeCentavos`, `decimalDeCentavos`, `linhaDecimal`, `porcentagem`, `variacaoPercentual`, `mediaPorUnidade` + a porta `moeda()`. Os cinco pontos apontados no achado (`sales.schemas.ts:12-13`, `finance.schemas.ts:26`, `sales.service.ts:82-83`, `purchases.service.ts:128-129`, `finance.service.ts:197-203`, `reports.service.ts:13-20,534,669-675`) estão fechados.
- Honestidade sobre o que era defeito e o que era risco: os painéis que somavam doubles eram quase sempre resgatados pelo `arredonda` final — 2026 parcelas de R$ 0,10 chegam 202,5999999999927752 e a etiqueta saía 202,60. O defeito demonstrável e escrito em disco estava na aritmética da nota: `Math.round(3 * 1.005 * 100)/100` = 3,01 porque `1.005 * 100` em double é 100,49999999999999 — meio centavo para baixo, gravado como valor cobrado. E na porta: `z.coerce.number()` recusava `"1.290,50"` (NaN), transformava `""` em lançamento de zero e deixava `12,3456` passar para o MySQL arredondar sozinho.
- `moeda()` substituiu a coação nos seis campos de valor (preço de produto, preço/custo unitário de venda e compra, valor de lançamento, valor de lead, meta de receita): aceita o que o teclado brasileiro digita, devolve texto de duas casas igual ao que a coluna `DECIMAL(x,2)` guarda, e arredonda uma vez em `ROUND_HALF_UP` na base 10. Teto por coluna respeitado: `99.999.999,99` nos campos DECIMAL(14,2)/(12,2), `9.999.999.999,99` na meta.
- Armadilha registrada em teste: no decimal.js-light que o Prisma embute, `round(dp, rm)` ignora `dp` — `(0,07 × 3).round(2, HALF_UP)` devolve `"0"`. Todo arredondamento do projeto usa `toDecimalPlaces`.
- Venda e compra ganharam a invariante: linha = `quantidade × preço` sobre o preço JÁ normalizado pela porta (1,01 × 3 = 3,03, não 3,01), total = soma dos centavos das linhas, escrito como Decimal. A nota passa a bater com o próprio preço unitário que ela exibe.
- `finance.summary` faz saldo por subtração de centavos (o `Math.round(...*100)/100` da cola saiu do código); os painéis de `reports.service.ts` acumulam baldes, curva ABC, ticket, participação e saldo corrido em inteiro e convertem uma vez no `return`; `arredonda` ficou restrito a medidas (`DECIMAL(12,3)`) e razões de contagem.
- CRM compara "mudou o valor?" em centavo antes de escrever o registro de alteração do lead. `lib/stock.ts` aceitou o texto de duas casas no campo `custo`, que o Prisma escreve direto em DECIMAL.
- Decidido e declarado, não mexido: quantidades continuam números (coluna de medida); `cron.handlers.ts:118` (`Number(vendas._sum.total ?? 0)`) e `pipeline()` do CRM (`num(_sum.value)`) são conversões ÚNICAS de um `_sum` já calculado pelo banco na borda do JSON — é o padrão que a regra permite, não um acumulado.
- Achado fora do escopo, não corrigido aqui: o painel pré-converte o texto do formulário com `parseFloat(valor.replace(",", "."))` em `Sales.tsx`, `Purchases.tsx` e `Finance.tsx` (~12 ocorrências), e o `replace` só troca a primeira vírgula — "1.290,50" vira 1,29 ANTES de sair do navegador, e nenhuma porta da API pode consertar o que chegou mastigado. Precisa de um parse compartilhado (seção 63 do plano proíbe a cópia campo a campo) e a tela de venda vai ser reescrita na 3e de qualquer forma: levado como item da sub-fase 3e.
- `test/dinheiro-decimal.test.ts` (10): base 10 meio-centavo, armadilha do `round`, 2026×R$0,10 em centavo, percentual/variação/média, porta nos três formatos e recusa de vazio/texto/negativo/teto, e as portas HTTP de produto, venda, compra, fluxo de caixa e meta do Dashboard — com a invariante total = Σ linhas amarrada em nota real.

Pendências declaradas da Fase 3: 3e vínculo venda↔financeiro com parcelamento (e o parse de dinheiro do painel, achado acima), e a recorrência da Agenda no fuso da empresa (3c).

Validação da sub-fase: typecheck da API e do painel limpos, build Vite OK; suíte completa 22 arquivos / 166 testes verdes (eram 21 / 156); prova de navegador de Configurações re-rodada com a porta nova no campo de meta — 115 checagens / 0 falhas, capturas renovadas. Backend-only: nenhuma tela alterada nesta sub-fase.

## Adenda da execução — Fase 3 (integridade) encerrada — sub-fase 3e (vínculo venda↔financeiro com parcelamento) — 2026-10-11

A sub-fase 3e fecha os dois últimos [ALTO] da seção E que restavam da Fase 3: "Venda não conversa com financeiro" e "Parcelamento não existe" — a linha que a auditoria escreveu dentro do achado do dinheiro, já resolvido na 3d.
- `installments` em `sales` e `purchases` (`INTEGER NOT NULL DEFAULT 1`), `auto_finance_sales`/`auto_finance_purchases` em `companies` (`false` nas duas pontas) e `sale_id`/`purchase_id` em `finance_entries` com índice e FK `SET NULL`, na migration `20261011230000_add_documento_vinculo_financeiro` — reversível, com o `-- Revert:` no próprio arquivo, e aplicada sem editar migration anterior.
- `apps/api/src/lib/installments.ts` (novo) é a casa única: `gerarParcelasDoDocumento` e `removerParcelasDoDocumento` chamados só por vendas e compras. Gera no CONFIRMAR/RECEBER, dentro da MESMA transação que baixou o estoque — não existe nota confirmada com metade do carnê no caixa, e rascunho não inflige receita que não aconteceu.
- Divisão em centavo com a ÚLTIMA parcela fechando a conta: `dividirCentavos` (novo em `lib/money.ts`). R$ 100,00 em 3 = 33,33 + 33,33 + 33,34, e a igualdade Σ parcelas = total da nota é o que o teste amarra — três valores de 33,3333 truncariam em R$ 99,99 e o cliente cobraria a diferença do caixa.
- Vencimento é calendário, não soma de trinta dias: `mesesDepoisNoCalendario` (novo em `lib/time.ts`) anda meses a partir do dia da empresa (Fase 3c) e clampa no último dia do mês-alvo. Dia 31 parcela em 28/29 de fevereiro, 31 de março, 30 de abril; `Date.UTC(y, m+3, 31)` inventaria um dia 3 de março.
- Política por empresa e desligada por padrão nas duas pontas, com as duas chaves separadas porque o hábito é diferente em cada lado; `SET NULL` e não `Cascade` na procedência porque lançamento é escrituração — o pedido sai do sistema, a despesa já paga não sai junto.
- Cancelar apaga apenas `PENDING` geradas, e a limpeza NÃO é condicionada à política continuar ligada: quem desligou a chave depois de gerar ainda vê o carnê da nota anulada sair do caixa. Parcela paga ou cancelada fica — apagar em silêncio seria o sistema inventando um passado diferente do que aconteceu.
- Nota de valor zero não gera linha nenhuma; a categoria "Vendas"/"Compras" é `upsert` na chave `(companyId, name, type)` — uma por empresa, não uma por documento. Porta do parcelamento: `z.coerce.number().int().min(1).max(120).default(1)` nos dois documentos; ausente é à vista, então a tela anterior, os integradores e os testes de isolamento não são barrados.
- O painel ganhou `apps/web/src/lib/money.ts` com `lerNumero`/`valorNumerico`, fechando o achado levado da 3d: `parseFloat(valor.replace(",", "."))` só trocava a primeira vírgula, e "1.290,50" virava 1,29 ANTES de sair do navegador — nenhuma porta de API conserta o que chegou mastigado. A regra é byte a byte a mesma da porta `moeda()` do servidor, e o CRM manteve o rigor antigo (texto que não é dinheiro continua texto, para a porta responder em vez de um `NaN` virar 0).
- Vendas e Compras têm seletor de parcelas (À vista, 2×…12×) com a nota dizendo onde o dinheiro cai; o detalhe dos dois documentos mostra o parcelamento; Configurações → Empresa ganhou o sétimo bloco, "Lançamento automático no financeiro", com dois switches independentes e a escrita parcial de sempre.
- `test/parcelamento.test.ts` (10): política desligada escreve zero, à vista gera uma linha no dia da empresa, 3× fecha o centavo com vencimento mensal clampado, rascunho não lança e confirmar escreve o carnê, cancelar tira as pendentes e preserva a paga, compra recebida gera despesa em Compras, a categoria automática nasce uma vez, uma empresa não enxerga o carnê da outra, a porta recusa parcela inválida, e as duas contas puras.
- `tools/verify-parcelamento.cjs` (novo): 55 checagens / 0 falhas com empresa de prova criada e apagada pelo próprio script — o seletor na tela, o preço brasileiro lido certo (R$ 2.581,00 e não R$ 2,58), pendente que escreve zero, confirmar que escreve três, o financeiro mostrando as parcelas, cancelar esvaziando o caixa e estornando o estoque, e a compra em 2× como despesa. Capturas `24-parcelamento-formulario/financeiro/compra.png`.

Itens de R3 (seção I) — decremento atômico, revalidação de status na transação, vínculo venda↔financeiro com parcelamento, Decimal até o fim do cálculo, política de estoque por empresa e meia-noite única no fuso da empresa: **todos entregues**. Fase 3 encerrada.

Pendência levada da Fase 3: a recorrência da Agenda construída com `setHours` do servidor (`agenda.service.ts:94-99`, achado da 3c) — é [BAIXO] da seção E e não estava em R3; passa para a Fase 9 (front), junto do E2E que vai exercitar a Agenda de verdade.

Validação da sub-fase: typecheck da API e do painel limpos; suíte completa 23 arquivos / 176 testes verdes (eram 22 / 166); prova de Configurações re-rodada com o bloco novo — 127 checagens / 0 falhas (eram 115), capturas da aba Empresa renovadas mais `22-configuracoes-lancamento-automatico.png`; prova nova de parcelamento 55 / 0.

## Adenda da execução — Bloco A do prompt de mercado (segurança e isolamento) encerrado — 2026-10-11

Onze tarefas de contrato (A0 a A11) mais o fechamento da A3. A tabela com a situação de cada uma, tarefa por
tarefa, está em `docs/STATUS-AJUSTES.md`; as decisões que travam os blocos restantes estão em `docs/decisoes/`.
Abaixo, o que este documento de auditoria precisa registrar como mudado.

- **Seção B (isolamento).** A6 mudou de forma o que "sessão da empresa" significa: `refresh_tokens` passou a
  ter `company_id` (migration `20261012000000_add_refresh_token_empresa`, nullable, com índice e sem FK de
  propósito — sessão curta não pode travar exclusão de empresa). `listSessions` filtra por essa empresa,
  token legado sem empresa não aparece na lista, revogação de sessão de outra empresa responde **404** em vez
  de 403 (não confirma existência), e o IP de origem virou dado de segurança: só OWNER e ADMIN leem. O teste
  de intrusão foi atualizado para a nova resposta esperada, não afrouxado.
- **Seção B (papéis).** A1 tirou a regra de papel de dentro de cada rota e criou `podeAtribuirPapel` em
  `lib/rbac.ts`, a única que decide. ADMIN não cria, não rebaixa e não toca OWNER nem outro ADMIN; ninguém
  muda o próprio papel; rebaixar o último OWNER responde 409. O espelho da hierarquia entrou no painel
  (`apps/web/src/lib/papeis.ts`) para a tela parar de oferecer opção que a API recusa.
- **Seção B (acesso vivo).** A5: `resolveCompanyContext` agora confere `user.active` e `company.active` na
  mesma consulta. O buraco de 15 minutos (access token sobrevivendo à desativação) fechou.
- **Seção D (valores padrão inseguros).** A9 criou `src/config/producao.ts` com a régua em função pura: em
  `NODE_ENV=production` o processo não sobe com segredo abaixo de 32 caracteres, com `troque`/`change`/
  `secret`/`exemplo` no valor, com os dois segredos iguais, com CORS apontando para `localhost`, `127.0.0.1`
  ou coringa, com `DATABASE_URL` de `root` sem senha, ou com `AUTH_EXPOSE_RESET_TOKEN=1` ligado. `TRUST_PROXY`
  passou a ser validado (0, 1 ou até 31 saltos) e aplicado no Fastify — o Fastify 5 não aceita número de
  saltos como opção, então a tradução é a função de confiança equivalente. O `.env.example` foi reescrito com
  cada chave comentada, porque era ele que ensinava o erro. A prova inclui um processo filho que importa o
  `env.ts` real e derruba a subida sem escrever o segredo no stderr.
- **Seção D (seed e credencial).** A8: `prisma/seed.ts` virou função exportável que recebe o ambiente. Em
  produção sem `ALLOW_DEV_SEED` ele aborta antes da primeira consulta; a conta de desenvolvimento só nasce
  fora de produção e a senha vem de `SEED_DEV_PASSWORD`; o resumo final nunca imprime senha; o e-mail do
  administrador global passou a vir de `SUPER_ADMIN_EMAIL`, com o valor histórico valendo só fora de
  produção. **A regra definitiva de acesso não mudou** — a conta existe, é protegida e continua descrita em
  `CREDENCIAIS.md`, que segue fora do git e fora de qualquer hipótese de remoção. O que mudou é que o
  repositório não guarda mais segredo nem presumi endereço em produção.
- **Seção D (recuperação).** A7: pedir recuperação parou de revogar as sessões do usuário (era uma porta de
  negação de serviço para quem soubesse o e-mail) e o código deixou de voltar no HTTP só por o ambiente não
  ser produção — agora exige a flag explícita **e** ambiente não-produtivo.
- **Seção E (integridade).** A3 recebeu as duas provas que faltavam: nota com o mesmo produto em duas linhas
  (6+6 sobre saldo 10 → 400, saldo intocado, zero movimentação, nenhuma venda criada) e a invariante de que o
  saldo final é exatamente `Σ IN − Σ OUT` do razão. ADJUST fica fora da soma por desenho — é declaração de
  inventário, não movimento.
- **Seção F (testes e codificação).** A10: varredura do repositório inteiro por regex sem a barra invertida
  (`/s+ /d+ /w+ /b`) não achou nenhum outro caso além da linha do CHANGELOG que documenta o defeito original.
  O mesmo pente achou a classe de acentos combináveis do `slugify` escrita com caracteres **invisíveis** no
  fonte; agora é `/[\u0300-\u036f]/g`. `.gitattributes` da raiz ganhou `.sql`, `.yml`, `.yaml` e `.txt` com
  `eol=lf`, porque o `core.autocrlf=true` da máquina ia converter a migration nova para CRLF no checkout.
- **JÁ CORRIGIDO, provado agora:** A2 (varredura de notificação nunca aceitou `companyId` depois da Fase 1a —
  `intrusao.test.ts` e `notifications.test.ts` confirmam) e A11 (reuso de refresh derruba a família de sessões
  e audita `auth.refresh_reuse`, com o cadeado do frontend preservando o uso normal — `seguranca.test.ts`).

Validação do bloco: typecheck da API e do painel limpos, build Vite OK, suíte completa **28 arquivos / 230
testes** verdes, cobertura 85,57% / 72,96% / 83,93% / 88,29% (linha de base do bloco: 84,15% / 70,4% / 83,03% /
86,93%), pente de BOM/CRLF/`\n` final sem nenhum arquivo fora do padrão. `npm audit` segue com 3 high no mesmo
caminho `prisma → @prisma/config → deepmerge-ts <8.0.0` (GHSA-ggr8-5vv4-36mx), sem versão corrigida dentro do
Prisma 6.19 em uso e sem `audit fix --force` — é o Bloco B, registrado como PENDENTE na tabela.

Nada de integração externa foi escrito: SMTP, cobrança, fiscal, verificação de cadastro, hospedagem e licença
estão como documento de decisão com opções, custo e recomendação em `docs/decisoes/`, esperando resposta do
dono (Bloco G).

## Novos achados — registrados fora do escopo das fases (2026-10-11)

Estes achados nasceram na rodada de fechamento e na mudança visual do cabeçalho. Nenhum deles renumera a
tabela de severidades da Fase 0; a contagem de lá (4 CRÍTICO + 1 de processo, 14 ALTO, 12 MÉDIO, 12 BAIXO)
continua valendo para o que foi auditado ali.

### N1 — CRÍTICO, segredo real publicado: a senha do administrador está nos pixels de uma captura rastreada

`docs/screenshots/02-login.png` (blob `c377aa4e1e956858bebc5f41d723337321e1dd1c`, a mesma coisa no `HEAD` e no
`origin/main`) mostra o formulário de login com o botão do olho clicado e a **senha definitiva do
administrador global em texto legível**. Não é texto no repositório — `git grep` pela senha não acha nada,
porque a limpeza que tirou a senha dos arquivos rastreados funcionou; ela voltou em imagem. A captura está embutida na
galeria da primeira página do `README.md` (linha 60), então quem abre o repositório público vê o par
e-mail/senha sem precisar procurar.

- **Como entrou:** `tools/shoot.cjs:41` e `tools/shoot-auth.cjs:22` digitam a senha real vinda de
  `tools/senha-admin.cjs` e clicam `.eye-toggle` antes de fotografar, para a tela sair "preenchida". Os dois
  scripts escrevem no mesmo arquivo `02-login.png`.
- **Alcance medido:** seis commits tocaram esse PNG (`7534a7a` foi o primeiro, `25610a9` o último). A reescrita
  de histórico que já foi feita uma vez neste projeto tirou a senha dos **textos**, não das **imagens** — o
  `git log -S` por string não acha, mas o pixel está lá em todas as versões do arquivo.
- **Por que não foi corrigido em silêncio:** a regra do prompt de fechamento manda parar e reportar segredo
  real rastreado ou no histórico, e reescrever histórico está na lista de proibidos. Além disso, a senha é a
  regra de acesso definitiva do dono.
- **O que a correção exige, na ordem:** (1) trocar a senha do administrador global e atualizar
  `SEED_ADMIN_PASSWORD` / `tools/senha-admin.local.cjs` / `CREDENCIAIS.md` — sem isso, qualquer outra ação é
  cosmética, porque a senha já é pública; (2) recapturar `02-login.png` sem revelar a senha (digitar texto de
  exemplo antes de clicar no olho, ou fotografar com os pontinhos); (3) tirar o clique do `.eye-toggle` dos
  dois scripts de captura, senão a próxima recaptura vaza de novo; (4) decidir, com o dono, se o histórico é
  reescrito (`filter-repo`) ou se aceitamos que a versão antiga continua acessível em forks e no cache do
  GitHub. O passo 4 é decisão dele, não minha.
- **Estado desta rodada:** o push foi **segurado**. As quatro telas de painel que precisavam ser recapturadas
  foram, e nenhuma delas mostra credencial.

### N2 — MÉDIO, credencial de desenvolvimento publicada: código de recuperação em `09-recuperar-senha.png`

A mesma família de captura (`tools/shoot-auth.cjs:40`) fotografa a etapa de código com o aviso de
"Modo desenvolvimento (sem e-mail configurado)" e o **código de 64 caracteres preenchido no campo**. É
credencial de uma conta de desenvolvimento de 2026-10-10 e, depois da A7, o código é de uso único e vence,
então o valor prático para um atacante é baixo — mas a forma é de segredo, está num repositório público, e a
mesma galeria que expõe o `02-login.png` ao lado prova que essas capturas não foram escolhidas com esse cuidado. Sai
limpa a `08-cadastro.png` (nome e e-mail fictícios, senhas vazias).

### N3 — BAIXO, identificador real espalhado por arquivos rastreados

O e-mail do administrador global (`nexusbussiness.admin@gmail.com`) aparece em **26 arquivos rastreados**:
`README.md`, `CHANGELOG.md`, `apps/api/.env.example`, `apps/api/prisma/seed.ts`, `apps/api/src/lib/passwordPolicy.ts`,
`apps/api/test/seed-seguro.test.ts` e os 20 scripts de `tools/`. Sozinho é um identificador, não uma credencial,
e ele é necessário no `.env.example`/na documentação da regra de acesso. O que muda o peso dele é o N1: com a
senha na imagem ao lado, o par fecha. Se o dono autorizar, os scripts de prova podem ler o e-mail de
`tools/senha-admin.local.cjs` junto com a senha, em vez de repetir a string.

### N4 — BAIXO, prova de navegador desatualizada falhando antes da mudança

`tools/verify-sidebar.cjs` tinha duas listas de itens do menu sem "Rotinas agendadas", que entrou na tela em
`AdminShell.tsx` bem antes desta rodada. A volta já estava vermelha (2 falhas) antes de qualquer edição
nossa — foi consertada aqui porque a mudança do cabeçalho exigia rodar a prova de qualquer jeito, e ela é a
mesa onde a tela é conferida. Ficou registrada para que a falha antiga não pareça causada pela mudança nova.

### N5 — NÃO VERIFICADO, as outras capturas do painel

Só as quatro telas da galeria do `README.md` foram recapturadas nesta rodada (`03-dashboard`, `11-vendas`,
`13-financeiro`, `20-cms-conteudo-dark`). As demais capturas de painel em `docs/screenshots/` não foram
conferidas uma a uma: elas devem mostrar o texto que saiu do cabeçalho, e a renovação completa delas é
trabalho da Fase 9, quando as provas de navegador passam a rodar em CI.

