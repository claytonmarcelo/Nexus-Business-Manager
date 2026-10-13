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
- `test/dinheiro-decimal.test.ts` (10): base 10 meio-centavo, armadilha do `round`, 2026×R$0,10 em centavo, percentual/variação/média, porta nos três formatos e recusa de vazio/texto/negativo/teto, e as portas HTTP de produto, venda, compra, fluxo de caixa e meta do Dashboard — com a invariante total = soma das linhas amarrada em nota real.

Pendências declaradas da Fase 3: 3e vínculo venda↔financeiro com parcelamento (e o parse de dinheiro do painel, achado acima), e a recorrência da Agenda no fuso da empresa (3c).

Validação da sub-fase: typecheck da API e do painel limpos, build Vite OK; suíte completa 22 arquivos / 166 testes verdes (eram 21 / 156); prova de navegador de Configurações re-rodada com a porta nova no campo de meta — 115 checagens / 0 falhas, capturas renovadas. Backend-only: nenhuma tela alterada nesta sub-fase.

## Adenda da execução — Fase 3 (integridade) encerrada — sub-fase 3e (vínculo venda↔financeiro com parcelamento) — 2026-10-11

A sub-fase 3e fecha os dois últimos [ALTO] da seção E que restavam da Fase 3: "Venda não conversa com financeiro" e "Parcelamento não existe" — a linha que a auditoria escreveu dentro do achado do dinheiro, já resolvido na 3d.
- `installments` em `sales` e `purchases` (`INTEGER NOT NULL DEFAULT 1`), `auto_finance_sales`/`auto_finance_purchases` em `companies` (`false` nas duas pontas) e `sale_id`/`purchase_id` em `finance_entries` com índice e FK `SET NULL`, na migration `20261011230000_add_documento_vinculo_financeiro` — reversível, com o `-- Revert:` no próprio arquivo, e aplicada sem editar migration anterior.
- `apps/api/src/lib/installments.ts` (novo) é a casa única: `gerarParcelasDoDocumento` e `removerParcelasDoDocumento` chamados só por vendas e compras. Gera no CONFIRMAR/RECEBER, dentro da MESMA transação que baixou o estoque — não existe nota confirmada com metade do carnê no caixa, e rascunho não inflige receita que não aconteceu.
- Divisão em centavo com a ÚLTIMA parcela fechando a conta: `dividirCentavos` (novo em `lib/money.ts`). R$ 100,00 em 3 = 33,33 + 33,33 + 33,34, e a igualdade soma das parcelas = total da nota é o que o teste amarra — três valores de 33,3333 truncariam em R$ 99,99 e o cliente cobraria a diferença do caixa.
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
  saldo final é exatamente `soma(ENTRADAS) − soma(SAIDAS)` do razão. ADJUST fica fora da soma por desenho — é declaração de
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

### N3 — BAIXO, resolvido na R2: identificador real espalhado por arquivos rastreados

Medido na abertura da R2: **32 ocorrências em 25 arquivos rastreados** — `README.md`, `CHANGELOG.md`,
`apps/api/.env.example`, `apps/api/prisma/seed.ts`, `apps/api/src/lib/passwordPolicy.ts`,
`apps/api/test/seed-seguro.test.ts` e 16 ferramentas de `tools/`. Sozinho é um identificador, não uma
credencial; o que fechava o par era o N1 — a senha ao lado do endereço, na mesma galeria.

**Fechado na R2 (2026-10-12).** O endereço não está mais em arquivo rastreado nenhum: o padrão fora de
produção passou a ser a conta fictícia `admin@exemplo.test` (`passwordPolicy.ts` e `seed.ts`), o
`.env.example` traz a mesma fictícia com o aviso de que em produção a variável é obrigatória, as 16
ferramentas que repetiam a string passaram a usar `EMAIL_ADMIN` de `tools/senha-admin.cjs` (que lê
`NEXUS_ADMIN_EMAIL`, depois o arquivo local ignorado, depois o `SUPER_ADMIN_EMAIL` do `.env` da API),
e a documentação descreve a conta como "a definida em `SUPER_ADMIN_EMAIL`". O comportamento é o mesmo —
a conta continua protegida contra rebaixamento e exclusão; mudou só de onde o endereço chega. A porta que
impede a string de voltar é `apps/api/test/identificadores-fora-do-codigo.test.ts`, que varre todos os
arquivos rastreados.

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

### N6 — ALTO, resolvido nesta rodada: o alternador Dark/Light "parava" na página de boas-vindas

Relato do dono: em 360×640 (Moto G4) o alternador da vitrine não fazia nada. Antes de mexer em arquivo
nenhum, a página foi medida em três visuais (360×640, Moto G4 412×915 DPR 2,75 com toque, 1440×900), com o
payload real do `/api/public/landing`. As respostas:

- **O toque chegava ao botão?** Sim. `document.elementFromPoint` no centro do alternador devolvia
  `button.theme-switch` nos três visuais; `pointer-events` era `auto`; o cabeçalho não empilhava nada por
  cima (z-index `auto`, posição `static`).
- **O estado trocava?** Sim. `data-theme` no `<html>` ia de `dark` para `light` e voltava no terceiro toque,
  e `localStorage["nexus.theme"]` acompanhava nos dois sentidos. **Nenhum erro de console** em nenhum visual.
- **A cor trocava?** Não — e aqui está o defeito. O fundo pintado da vitrine continuava `rgb(11, 13, 16)` com
  o tema claro ligado. Em `/login`, no mesmo navegador e com o mesmo alternador, o corpo ia de
  `rgb(11, 13, 16)` para `rgb(245, 241, 234)`. Ou seja: o alternador nunca esteve parado; a vitrine é que não
  escutava.
- **Causa raiz:** `aplicarCores` (`apps/web/src/lib/landingEstilo.ts`) escrevia a paleta cadastrada no CMS
  como propriedades *inline* de `--bg`, `--surface`, `--text` etc. no elemento `.landing`. Uma variável
  customizada inline naquele elemento vence qualquer valor vindo de `[data-theme="light"]` no `<html>` para a
  resolução de `var()` dentro da subtree. A página pública, portanto, vestia sempre as cores do banco — que
  são o esquema escuro do produto — nos dois temas. O painel (`/app`) não recebe essas variáveis, então ele
  sempre trocou corretamente.
- **Consertado com ela:** (1) `.theme-switch` tinha área sensível de 54×27, abaixo dos 44×44 exigidos em
  toque; um `::before` transparente de `-9px` vertical leva o alvo a 54×45 sem mudar o desenho, provado por
  clique a 6 px acima e abaixo do botão nos três visuais. (2) `.landing-hero-veil` usava `background: #000`
  — preto fixo sobre a foto deixaria o texto do tema claro ilegível; agora usa `var(--bg)`. (3) O
  `index.html` traz `data-theme="dark"` fixo, então quem salvou o tema claro via a página um *flash* do
  escuro antes do primeiro paint; `aplicaTemaSalvo()` passou a rodar em `main.tsx` antes de `createRoot`.
  Script inline no HTML foi descartado porque o CSP de produção é o padrão do helmet
  (`apps/api/src/plugins/security.ts:9` → `script-src 'self'`).
- **Decisão registrada:** o CMS guarda **um** esquema de cores, sem par claro/escuro no schema. A paleta
  cadastrada agora veste só o tema a que pertence, classificado pela luminância relativa do fundo (corte 0,179
  da própria WCAG); no outro tema as variáveis são retiradas e os tokens do produto agem. Cadastrar duas
  paletas no editor é a alternativa que resolve o problema de outra forma, e mexe no schema e no formulário —
  fica como decisão do dono, não foi inventada aqui (§46).
- **Contraste medido depois da correção:** vitrine com o tema claro em `rgb(245, 241, 234)` sobre texto
  `rgb(42, 35, 32)` = **13,72:1**; subtítulo suave no mesmo tema = **5,5:1**; texto do herói no escuro =
  **7,15:1**. Todos acima de 4,5:1.

### N7 — BAIXO, fora do escopo: o tema do produto não é o tema que o AdminLTE olha

Nenhuma linha de `apps/web/src/` escreve `data-bs-theme` (medido com `grep -rn "data-bs-theme" apps/web/src
apps/web/index.html` → zero ocorrências), e o `adminlte.min.css` importado em `main.tsx` tem **17** regras
sob `[data-bs-theme="dark"]` e **4** sob `[data-bs-theme="light"]`. O tema escolhido pela pessoa é escrito só
em `data-theme` no `<html>`, então qualquer peça que o AdminLTE vista por aquela outra chave — modal,
dropdown, tabela do plugin — fica fora do tema. Não foi corrigido nesta rodada porque sincronizar as duas
chaves muda o desenho de todas as telas do painel, e isso obriga a recapturar as seis telas do `README.md` e
as oito provas de navegador: trabalho de rodada própria, com aval do dono. Enquanto isso, o que se vê nas
telas é o que as provas medem, e elas estão verdes.

### N8 — ALTO, resolvido nesta rodada: sessões encerradas caiam no login, e duas portas não encerravam nada

Regra do projeto: toda sessão que termina — pelo botão, por expiração, por revogação, por conta desativada ou
por logout em outra aba — devolve a pessoa à página de boas-vindas (`/`). Antes de mexer em arquivo nenhum, o
caminho foi lido e medido com os sete casos de `apps/web/src/test/fim-de-sessao.test.tsx` montando a sessão
pelo interceptor de verdade (rede parada no adaptador do axios, nada trocado por imitação). A primeira
rodada: **5 falhas, 1 verde**. As respostas:

- **Para onde ia quem saía pelo botão?** Para `/login`. `ProtectedRoute.tsx` tinha um único destino para
  `status === "anonymous"` — `<Navigate to="/login">` — e não tinha como saber se aquela pessoa tinha uma
  sessão ou se era um visitante que nunca entrou. A vitrine só aparecia porque `handleLogout` chamava
  `navigate("/", { replace: true })` depois do `await logout()`: o destino certo dependia de um chamada na
  mão do botão, e não do portão.
- **A sessão expirada no meio do trabalho encerrava alguma coisa?** Não, se o refresh token tivesse sumido do
  disco. `lib/api.ts` só despachava `nexus:session-expired` quando `tokenStore.getRefresh()` devolvia um
  token **e** a chamada ainda não tinha sido repetida. Sem token de renovação, o 401 virava uma rejeição
  silenciosa: medido no caso verde-depois-vermelho, a tela continuava em `/app/vendas` com o painel pintado
  (`Expected: "/" / Received: "/app/vendas"`).
- **Logout em outra aba chegava nesta aba?** Não. Não existia nenhum ouvinte de `storage` no app inteiro, e a
  chave do refresh token nem era exportada de `tokenStore.ts`. O caso mediu a mesma coisa: `/app/vendas`
  para sempre, com o painel no ar e a sessão já morta no disco.
- **E a porta silenciosa — a pessoa fecha o navegador e volta semanas depois?** Também ia ao login. No
  bootstrap, renovação recusada (`refreshSession()` devolvendo `null`) só fazia `setStatus("anonymous")`, o
  mesmo caminho de quem nunca teve sessão: a revogação e o vencimento não tinham destino nem aviso.
- **O logout apagava preferências?** Não, e isso já estava certo: `tokenStore.clear()` tira só
  `nexus.refresh` e `nexus.pulso`. Foi mantido, e o caso que mede o tema (`nexus.theme = light` antes de
  entrar, depois de sair) verde dos dois lados — no jsdom e no navegador.
- **Havia `alert()` no caminho?** Não, em nenhuma das cinco portas. A prova de navegador agora instrumenta
  `window.alert`/`window.confirm` em cada aba antes do primeiro documento e exige que sigam intocados; o
  aviso de sessão expirada é Toastr (`lib/notify.ts`), medido pelo texto na tela.
- **Causa raiz:** não era um bug de destino, era a falta de um estado. O app sabia *que* a sessão tinha
  acabado, mas não sabia *por quê*, e sem essa informação o portão (`ProtectedRoute`) e o botão
  (`handleLogout`) discordavam: um mandava ao login, o outro à vitrine, e quem chegava depois do outro
  vencia.
- **Consertado com isso:** o `AuthContext` passou a registrar o motivo (`"logout" | "expirada" |
  "outra-aba"`) num ref lido uma única vez por quem decide o destino, `ProtectedRoute` usa esse motivo para
  escolher entre `/` (com `replace`, para o "voltar" não reabrir painel morto) e `/login` (com a rota de
  origem no estado), `lib/api.ts` trata o 401 de rota de negócio como fim de sessão tenha havido renovação
  tentada ou não — as rotas `/auth/login`, `/auth/refresh` e `/auth/logout` continuam julgadas por quem as
  chamou —, o `storage` da chave do refresh token encerrou a aba, e o `handleLogout` perdeu o `navigate()`:
  o destino é garantia do portão, não do botão.
- **A prova estava errada também:** `tools/verify-logout.cjs` procurava o botão "Sair" no instante em que a
  URL virava `/app` e achava `null` — o painel monta ~1,5 s depois, quando o bootstrap termina — e ainda
  registrava `ok(true, ...)` fixo no login. Foi reescrita: espera a `.admin-shell` existir, empurra uma rota
  real para o histórico antes de sair (para o "voltar" ter o que reabrir), e percorre as cinco portas com
  duas abas de verdade e um 401 respondido pela própria prova. Ficou em **22 checagens, 0 falhas**.
- **O que a rodada não tocou:** o servidor continua decidindo a autorização; nada aqui mudou validação,
  tempo de sessão ou revogação. O aviso de "outra aba" e o de "logout" não ganharam texto — a regra pede
  mensagem só para a expiração, e inventar frase sem pedido é o caminho para a tela mentir.

### N9 — BAIXO, corrigido nesta rodada: um clone novo não compila sem gerar o cliente Prisma

O portão de fechamento mandou provar que quem clona o repositório consegue montar o projeto sozinho, na
ordem `git clone . ../nexus-verificacao` → `npm ci` → `npm run typecheck` → `npm run build`. Foi exatamente
isso que se rodou, e a primeira passada quebrou:

- **O `npm ci` não gerou o cliente.** Ele concluiu, mas o npm bloqueou por política de scripts o
  `preinstall` do `prisma` e o `postinstall` do `esbuild` — a saída traz o aviso
  `npm warn allow-scripts` e sugere `npm approve-scripts`. Sem o generate, `node_modules/.prisma/client`
  fica sem os tipos do schema.
- **O typecheck então devolveu 217 erros**, e todos dizem a mesma coisa: o `@prisma/client` não exporta
  `Role`, `Prisma.Decimal` não existe, `PrismaClientKnownRequestError` não existe. Nenhum deles é defeito
  de código — é cliente gerado que falta.
- **Depois de `npm run prisma:generate -w @nexus/api`**, o mesmo clone passou em tudo: typecheck com
  **0 erros**, build **ok** (Vite em 3,81 s) e a suíte inteira verde — **28 arquivos / 230 casos** na API e
  **4 arquivos / 20 casos** no web. Para rodar a suíte foi preciso copiar um `.env` para o clone, e isso é
  o esperado: o arquivo é ignorado de propósito, e a suíte fala com o MySQL de verdade.
- **Causa raiz:** buraco de receita de bolo, não de código. O README mandava `npm install` e ia direto para
  `db:migrate`; num ambiente em que a política de scripts do npm está ligada — que é o comportamento padrão
  de hoje — o generate não acontece sozinho, e a primeira coisa que a pessoa vê são 217 erros sem relação
  nenhuma com o que ela escreveu.
- **Corrigido com isso:** a seção "Instalação → Passo a passo" do `README.md` ganhou
  `npm run prisma:generate -w @nexus/api` logo depois da instalação, com o aviso de que sem aquilo nada
  compila. É texto: nenhuma linha de código, script ou configuração mudou.
- **O que a rodada não fez:** não adicionou um `postinstall` ao `package.json`. Isso mudaria o que roda no
  `npm install` de todo mundo, e o prompt de fechamento proíbe funcionalidade nova nesta fase. Fica
  registrado como opção da Fase 7, junto de CI e threshold de cobertura.

## Adenda da execução — Rodada R (segurança antes do push) — Bloco 1, tarefa R1 encerrada — 2026-10-12

### R1 — As 109 imagens do repositório, conferidas uma a uma

**O que foi medido.** `git ls-files` devolve **101** PNGs em `docs/screenshots/` — todos rastreados, nenhum
arquivo solto na pasta — e mais **8** imagens de marca (`assets/brand/logo/logo.png`,
`apps/web/src/assets/brand/logo.png` e seis ícones em `apps/web/public/`): **109** arquivos ao todo. As 101
capturas foram abertas e lidas uma a uma, em oito lotes, com veredito individual. As oito de marca são o mesmo
logotipo e seus recortes de favicon; a única palavra escrita nelas é "NEXUS BUSINESS MANAGER".

A classificação tem três degraus: **contém** (dado sensível real — credencial, código, e-mail ou nome de
pessoa), **resíduo** (texto de desenvolvimento, inofensivo mas não é copy de produto) e **limpa**.

**Nove imagens foram classificadas `contém`, e as nove foram recapturadas.** Nenhuma outra captura precisou
mudar: 92 arquivos seguem byte a byte como estavam, porque as ferramentas de prova ganharam filtros de
recaptura (`NEXUS_PROVA_FOTOS` e `NEXUS_PROVA_PAGINAS`) justamente para não gerar ruído de diff onde não há
problema.

| Arquivo | O que expunha | O que mostra agora |
| --- | --- | --- |
| `02-login.png` | a senha definitiva do administrador global em texto legível, com o botão do olho clicado (N1) | formulário vazio, `localStorage` limpo antes do clique, olho nunca tocado |
| `09-recuperar-senha.png` | o código de recuperação de 64 caracteres preenchido no campo (N2) | etapa 2 com o campo de código vazio; o e-mail fotografado (`solicitante@exemplo.test`) não existe no banco, então a API não devolve `devToken` nenhum |
| `04-usuarios.png` | o e-mail pessoal do dono e a conta de desenvolvimento, na lista de membros | a conta fictícia `demo@exemplo.test`, com a busca da própria tela filtrada em `exemplo.test` |
| `18-tabs-usuarios.png` | os mesmos dois e-mails reais | idem acima |
| `18-tabs-usuarios-celular.png` | os mesmos dois e-mails reais | idem acima |
| `06-configuracoes-claro.png` | o gmail real no campo "E-mail de acesso" | "Demonstracao Ficticia" / `demo@exemplo.test` |
| `22-configuracoes-conta.png` | o gmail real no campo "E-mail de acesso" | idem acima |
| `22-configuracoes-limpo.png` | o gmail real no cabeçalho e na conta | idem acima |
| `22-configuracoes-empresas.png` | "Eliane Eli (minha empresa)" e ~7 empresas `Empresa-<timestamp>` da conta real | uma única empresa, "Demonstracao (minha empresa)" |

**Como as capturas deixaram de usar a conta real.** Nasceu `tools/conta-de-captura.cjs`: uma conta de
demonstração fictícia (`demo@exemplo.test` / "Demonstracao Ficticia", sobrenome de empresa
"Demonstracao (minha empresa)") que a própria ferramenta cria no primeiro uso via `POST /auth/register`. A
senha dela tem 24 caracteres, é gerada com `crypto.randomInt` (garantindo maiúscula e caractere especial, com
embaralhamento Fisher-Yates), vem de `NEXUS_CAPTURA_SENHA` quando a variável existe, e é guardada em
`tools/conta-de-captura.local.json` — arquivo **ignorado** no `.gitignore` desta rodada. Não há literal de
senha em código nenhum. O e-mail pode ser trocado por `NEXUS_CAPTURA_EMAIL`.

`tools/shoot.cjs` passou a declarar a conta dentro da própria lista de telas: `03-dashboard` e
`05-auditoria` são as duas capturas que precisam do administrador global (são telas de plataforma, e o
roteiro as fotografa com a busca/trilha vazia de dado de terceiro); `04-usuarios`, `06-configuracoes-claro`
vão para a conta de captura; `01-landing` e `02-login` não entram em lugar nenhum. `tools/shoot-auth.cjs`,
`tools/shoot-tabs.cjs`, `tools/shoot-clients.cjs` e `tools/verify-configuracoes.cjs` abandonaram o
`require("./senha-admin.cjs")` e a digitação de credencial real.

**Prova de que nenhum script carrega credencial.** `apps/api/test/capturas-sem-credencial.test.ts` varre todos
os `tools/*.cjs` rastreados e exige: nenhuma digitação de senha com literal no segundo argumento; nenhuma
ocorrência da senha de desenvolvimento nem da credencial `admin@nexus.local`; nenhum clique em `.eye-toggle`;
os cinco scripts de identidade sem o e-mail do administrador e sem importar `./senha-admin.cjs`;
`conta-de-captura.cjs` lendo as duas variáveis de ambiente, usando `crypto`, sem atribuição literal de senha e
com domínio `exemplo.test`; o trecho do `02-login` sem `page.type(` e com `localStorage.clear()`; o roteiro de
recuperação com a guarda de sequência hexadecimal e o e-mail inexistente; e o mapa de contas do `shoot.cjs`
exatamente como acima. **8 casos, todos verdes.** Antes da mudança, os mesmos padrões rodados contra o
conteúdo de `git show HEAD:` acusaram **7 ofensas** em cinco arquivos — a volta estava vermelha de propósito.

**As corridas que geraram os nove PNGs novos**, com o banco de desenvolvimento de sempre:
`node tools/shoot-auth.cjs` (com as duas asserções de tela vazia e de ausência de código em `[ok]`),
`NEXUS_PROVA_PAGINAS=usuarios node tools/shoot-tabs.cjs` (**50 checagens, todas passaram**),
`NEXUS_PROVA_FOTOS=22-configuracoes-conta,22-configuracoes-limpo,22-configuracoes-empresas,06-configuracoes-claro node tools/verify-configuracoes.cjs`
(**127 checagens · 0 falhas**, empresa e conta devolvidas ao estado anterior, usuário de prova apagado, nenhum
erro de JavaScript no caminho) e `node tools/shoot.cjs` para as duas telas de mesa.

**N5 está encerrada.** O "não verificado" que ela registrava não existe mais: as 101 capturas foram conferidas
uma a uma nesta passada, e as nove com problema foram refeitas.

### N10 — MÉDIO, consequência da regra de administração: toda empresa nova nasce com o administrador global como OWNER

Não é falha de isolamento — é a regra de administração da plataforma escrita em
`apps/api/src/modules/auth/auth.service.ts`, no `register`: ao criar a conta, todo usuário com
`platformRole: "SUPER_ADMIN"` é adicionado como `OWNER` da empresa recém-criada. O efeito prático apareceu
durante a R1: a primeira versão da `04-usuarios.png` recapturada continuou mostrando
o e-mail pessoal do dono e a conta de desenvolvimento na lista de membros da conta fictícia, porque a conta
fictícia acabou de nascer com o administrador dentro.

**Como a R1 contornou sem tocar na autorização:** as telas de usuários passaram a ser fotografadas com o
filtro que a própria tela oferece (busca por `exemplo.test`), que é o mesmo gesto que um usuário real faria.
Nenhuma permissão mudou, nenhum teste de autorização foi enfraquecido. **O que fica para a decisão do dono
vai para `docs/decisoes/G8-administrador-da-plataforma.md` (tarefa R3)**, junto do risco de LGPD e das
alternativas. Até lá, vale registrar: em qualquer demonstração pública do painel, a tela de Usuários de uma
empresa nova sempre lista o administrador global.

### N11 — BAIXO, o nome do dono no rodapé de todas as telas

`apps/web/src/components/layout/AdminShell.tsx:370` escreve "Desenvolvido por Clayton Marcelo" no rodapé do
painel, e `apps/web/src/components/landing/copy.ts:40` repete a frase no rodapé da vitrine pública
(`LandingFooter.tsx:26`). Por isso a assinatura aparece legível em praticamente toda captura de mesa — as
oito conferidas nesta revisão citaram 22 arquivos, e as recapturas de agora também a mostram. Não é dado
pessoal de terceiro e não é credencial: é o crédito do próprio dono, publicado por escolha dele. **Nada foi
alterado**, e a imagem não foi regerada por isso. Fica registrado porque a R1 pedia exatamente essa
distinção, e porque numa vitrine pública o nome aparece para qualquer visitante — se isso um dia for
indesejado, é uma linha de copy, não uma recaptura.

### N12 — BAIXO, resíduo de banco de desenvolvimento nas capturas

Um conjunto de imagens mostra dados de teste que o banco de desenvolvimento acumula, sem valor para um
atacante e sem dado de terceiro: nomes de empresa no formato `Empresa-1791738059301-35-368033` (famílias
`16-`, `20-`, `21-` e `22-`), rótulos de prova como `PROVA-SINO 01..08`, "Teste Direto XYZ", "Prova Rotinas",
"Prova Leitura" e "Prova Parcela", o endereço `http://localhost:5173/favicon-512.png` dentro do `og:image`
fotografado em `20-cms-seo.png`, `127.0.0.1` repetido na tela de Auditoria e a frase que cita
`tools/verify-landing-cms.cjs` dentro de `19-legal-termos.png`. Nada disso foi recapturado: a R1 só mexe em
imagem classificada `contém`. **A limpeza desses dados é trabalho de banco, não de pixel** — enquanto o
ambiente de desenvolvimento tiver essas linhas, qualquer recaptura futura vai trazê-las de volta. Fica
registrado para a rodada que decidir o seed de demonstração.

## Adenda da execução — Rodada R (segurança antes do push) — Bloco 1, tarefa R2 encerrada — 2026-10-12

### R2 — O endereço pessoal do dono e a senha de desenvolvimento saíram do repositório

**R2.1 — onde cada coisa estava escrita (medição antes de mexer).** A varredura dos 391 arquivos
rastreados por `git ls-files`, no commit `bedf661`, deu **32 ocorrências do endereço do administrador
global em 25 arquivos** e **3 ocorrências da senha de desenvolvimento do seed em 3 arquivos**. O
endereço é o único domínio de e-mail pessoal do repositório: as duas listas batem linha a linha.
Nunca se
imprimiu valor — só arquivo e linha:

| Onde | Arquivo:linha |
| --- | --- |
| documentação | `README.md:696` · `CHANGELOG.md:575` · `CHANGELOG.md:693` · `docs/AUDITORIA.md:593` · `:763` · `:812` |
| modelo de ambiente | `apps/api/.env.example:29` (endereço) e `:37` (senha de desenvolvimento) |
| código | `apps/api/prisma/seed.ts:23` · `apps/api/src/lib/passwordPolicy.ts:16` |
| testes | `apps/api/test/seed-seguro.test.ts:26` · `:72` · `:77` · `apps/api/test/capturas-sem-credencial.test.ts:19` · `:55` (senha) |
| ferramentas de prova | `tools/senha-admin.cjs:31` · `audit-responsive.cjs:13` · `audit-responsive2.cjs:34` · `audit-sweep.cjs:12` · `shoot-agenda.cjs:98` e `:128` · `shoot-compras.cjs:26` · `shoot-crm.cjs:85` · `shoot-financeiro.cjs:26` · `shoot-modal.cjs:31` · `shoot-products.cjs:23` · `shoot-sales.cjs:27` · `shoot-sidebar.cjs:12` · `verify-acoes-confirm.cjs:19` · `verify-logout.cjs:19` · `verify-remember.cjs:21` e `:38` · `verify-responsive.cjs:19` · `verify-sidebar.cjs:33` |

A senha de desenvolvimento estava só em `.env.example:37`, `capturas-sem-credencial.test.ts:55` e
`seed-seguro.test.ts:56`. Diferente do que o prompt supunha, `tools/shoot-clients.cjs` **já não** a
carregava: a R1 tinha reescrito aquele script, e a varredura de agora confirma (nenhum `tools/*.cjs`
cita a senha). O que as ferramentas ainda carregavam era o endereço — **19 ocorrências em 17 arquivos
de `tools/`**, todas removidas e sem nenhuma de volta: as 16 ferramentas que faziam login com a string
passaram a usar o `EMAIL_ADMIN` importado de `tools/senha-admin.cjs`, e o próprio `senha-admin.cjs`
deixou de conhecê-la.

**R2.2 — de onde o endereço chega agora.** `passwordPolicy.ts` e `prisma/seed.ts` perderam o literal e
ganharam o padrão fictício `admin@exemplo.test`, que não casa com usuário nenhum. Em produção a
ausência de `SUPER_ADMIN_EMAIL` derruba a API na inicialização (regra nova em
`apps/api/src/config/producao.ts:91-95`) e derruba o seed (`errosDoSeed`, que já a exigia). Fora de
produção o valor vem do `.env` da máquina; sem ele, fica a fictícia. O ponto de comparação
(`users.service.ts:121`, que confere `membership.user.email === SUPER_ADMIN_EMAIL`) não mudou de
lógica nenhuma: continua lendo a mesma constante exportada.

**Prova de que o comportamento é o mesmo.** Rodada real de navegador com a conta do administrador:
`NEXUS_PROVA_FOTOS=05-auditoria node tools/shoot.cjs` devolveu `sessao aberta com a conta administrador`
e `capturado 05-auditoria`, com o endereço resolvido por `tools/senha-admin.cjs` (30 caracteres, lido de
`SUPER_ADMIN_EMAIL` no `.env` da API — a ordem é `NEXUS_ADMIN_EMAIL` → `tools/senha-admin.local.cjs` →
`.env` da API, e sem os três o ferramenta para com aviso em vez de mandar credencial errada). O print
saiu diferente do commitado por um motivo que não é a R2 — ver N13 — e foi **descartado**: a imagem está
byte a byte como no `bedf661`.

**R2.3 — a credencial de desenvolvimento.** `apps/api/.env.example` passou a trazer
`SEED_DEV_PASSWORD=defina-uma-senha-forte` e `SUPER_ADMIN_EMAIL=admin@exemplo.test`, cada um com o
comentário que diz onde o valor real mora. `seed-seguro.test.ts` não conhece mais senha nenhuma: sorteia
`SEGREDO` com `randomBytes(9)` a cada corrida e confere que o texto do seed lê `ambiente.SEED_*_PASSWORD`
sem valor escrito ao lado.

**R2.4 — o `.env` do dono.** `SUPER_ADMIN_EMAIL` foi acrescentado ao `apps/api/.env` local (arquivo
ignorado pelo git), lendo o endereço da linha 9 do `CREDENCIAIS.md`. Nada foi impresso: a gravação registrou
só o comprimento do valor (30) e o arquivo de origem, e a conferência final do `.env` é 855 bytes, sem BOM,
sem CRLF.

> **Aviso ao dono — trocar a senha de desenvolvimento.** A senha da conta `admin@nexus.local`
> (`SEED_DEV_PASSWORD`) esteve escrita em arquivo rastreado e portanto está no histórico público do
> `origin/main`. Ela não é a senha do administrador global e não é a de nenhuma empresa real, mas é uma
> credencial que qualquer pessoa que clone o repositório consegue ler no histórico. Antes de qualquer
> uso público do ambiente de desenvolvimento, defina uma senha nova só para a conta dev no `.env` local e
> rode o seed de novo; a R2 não trocou essa senha porque ela é do dono, e troca de senha sem pedido é
> mudança que ele não autorizou.

**R2.5 — a porta que impede o literal de voltar.** `apps/api/test/identificadores-fora-do-codigo.test.ts`
(6 casos) varre todo arquivo rastreado e falha se reaparecer o endereço, qualquer domínio de e-mail
pessoal ou a senha
de desenvolvimento; os valores procurados são montados por fragmentos, porque um teste que caça um literal
não pode escrevê-lo. O validador de produção ganhou 2 casos (21 no arquivo): produção sem `SUPER_ADMIN_EMAIL`
recusa a subida, e com ele definido sobe — o caso negativo passa a variável vazia de propósito, senão o
`dotenv` da máquina contaminaria a prova.

**O vermelho, medido antes do ajuste.** Com as ferramentas e os documentos ainda no estado da R1 e só os
testes novos em pé, a suíte da API devolveu **10 arquivos falhando em 33** (`10 failed | 23 passed`), e o
arquivo de varredura caiu nos 6 casos, com a primeira lista saindo como `expected [ 'CHANGELOG.md:575', …(28) ] to
deeply equal []`. Depois do patch: os quatro arquivos da R2 passam juntos (**41 casos**, `4 passed (4)`).

**Um ajuste honesto dentro do próprio teste.** A primeira versão da afirmação anti-literal do seed —
"qualquer aspas a menos de uma linha do nome da chave" — pegava também a mensagem de erro
"`SEED_ADMIN_PASSWORD não está definida`", que não escreve senha nenhuma. Em vez de afrouxar o teste, o
recorte foi apertado para o que é violação de verdade: uma senha valendo o padrão depois de `??` ou `||`
na leitura da chave, e um valor escrito depois de `SEED_*_PASSWORD:` num mapa. A mordida foi conferida à
parte, com quatro frases sintéticas: as duas primeiras são pegas, a mensagem de erro e a leitura correta
`?? ""` não.

**Portões da tarefa.** `npm run typecheck` limpo nos dois workspaces (o caçador de literais precisou de uma
linha para passar no `noUncheckedIndexedAccess`); `npm run build` ok (API + web, com o aviso de chunk único
que é da R9); suíte completa **API 30 arquivos / 246 casos** e **web 5 arquivos / 27 casos**, todos
passando; codificação **281 arquivos de texto rastreados, 0 com BOM e 0 com CRLF**; varredura de segredos
local — **0** para o endereço pessoal, **0** para o domínio de e-mail pessoal e **0** para a senha de
 desenvolvimento, e as
28 atribuições de senha que os demais padrões acharam foram conferidas uma a uma: **24** estão em arquivos
de `apps/api/test/` e são fixtures de teste (`SenhaForte2026`, `abcdef12`, `Trocada@2026`), **3** são a senha
de contas sintéticas que a própria prova cria e apaga (`tools/verify-configuracoes.cjs:217`,
`verify-parcelamento.cjs:177`, `verify-rotinas.cjs:133`), e **1** (`ContaPanel.tsx:123`) não é senha nenhuma
é o texto "Informe a senha atual." de validação. Nenhum valor foi impresso nesta conferência — só arquivo,
linha e comprimento.

### N3 — encerrada

O item aberto da Fase 0 ("identificador real espalhado por arquivos rastreados") está fechado acima, com a
medição de antes (32/25) e a de depois (0/0).

### N13 — MÉDIO (achado fora do escopo, nada foi corrigido), a galeria do repositório tem imagem mais antiga que a interface

Ao rodar a prova de administrador da R2, a `05-auditoria.png` commitada se revelou de outra época: sem os
group headers da sidebar, sem a coluna "Quem", sem as abas "Logs do Sistema / Alterações Sensíveis /
Exportação", e com o nome da empresa `Nexus Demo` onde hoje aparece o identificador interno. A tela atual,
fotografada agora, tem todas essas peças. A R1 não viu isso porque a pergunta dela era "esta imagem expõe
dado sensível?" — e não expõe, nem antes nem agora; a imagem nova foi descartada justamente para não misturar
recaptura de vitrine com tarefa de segurança.

O que fica registrado: **a galeria precisa de uma passada de atualização antes do push** (é trabalho da R11,
de documentação), e só esta imagem foi medida — as outras 100 não foram reabertas para comparar com a
interface de hoje, então não se sabe quantas estão no mesmo estado. **NÃO VERIFICADO** fora deste arquivo.

### R3 — O que a leitura provou, e o que ela deixou registrado (relatório, sem código)

A R3 não mudou autorização nenhuma: foram cinco arquivos lidos (`companies.service.ts`, `prisma/seed.ts`,
`lib/passwordPolicy.ts`, `users.service.ts`, `lib/company-context.ts`) mais os três que a regra toca de fato
(`auth.service.ts`, `lib/audit.ts`, `lib/platform.ts`) e as rotas que lêem a auditoria. As respostas, com
linha, estão em `docs/decisoes/G8-administrador-da-plataforma.md`. Resumo do que ficou de fora das perguntas:

- **N14 — MÉDIO, auditoria de plataforma escrita no tenant errado.** As rotas reservadas da plataforma gravam
  `companyId: ctx.companyId` (`modules/cron/cron.routes.ts:27-35` e `:44-46`), isto é, a empresa ativa na
  sessão de quem clicou. Uma ação que é da plataforma inteira aparece no log de um tenant específico: sobra
  registro no lugar errado e falta no lugar certo. Não foi corrigido — a R3 é relatório, e mexer nisso é
  mudança de comportamento que depende da decisão do G8.
- **N15 — informação, não é falha.** O `companyId` da auditoria de plataforma não é o único ruído do tipo: a
  trilha não tem campo nenhum que diga "esta linha é do administrador agindo como plataforma". É o item (b)
  da terceira pergunta da R3, e é o que a opção D do G8 resolve.
- **NÃO VERIFICADO:** se cada escrita de CMS gera auditoria. Contei 1 chamada em `cms.routes.ts` e 5 em
  `cms.service.ts`, mas nenhuma rota foi conferida individualmente.
- **Divergência do próprio prompt, registrada:** a tabela de blocos diz "Bloco 1 = R1 a R4", e a seção 7 manda
  executar "o Bloco 1 (R1 a R3)" e parar na PARADA 1. Fui pela seção 7, que é a ordem explícita de execução e
  a que define o ponto de parada — a R4 (privacidade do login) ficou de fora desta parada de propósito.


---

## Adenda da execução — PROMPT MESTRE: F0 (retomada) e F1.1 (caracteres) encerradas — 2026-10-12

### N16 — CRÍTICO (estado do remoto, não é falha de código): o `origin/main` ainda publica o que a árvore local já não tem

Medido na retomada, comparando ref por ref com o valor lido do `.env` local — nenhum valor foi impresso em
nenhuma etapa, só arquivo, linha e contagem:

| ref | ocorrências do e-mail pessoal + da senha de desenvolvimento | linhas |
|---|---|---|
| `origin/main` (`2cfa2e9`) | 30 | 36 |
| `HEAD` local (`65e97f5`) | 0 | 0 |

O que está exposto lá e já não existe aqui:

- **E-mail pessoal do administrador global** em 27 arquivos (README, CHANGELOG, `.env.example`, `prisma/seed.ts`,
  `lib/passwordPolicy.ts`, `test/seed-seguro.test.ts`, `docs/AUDITORIA.md` e 16 ferramentas de `tools/`);
- **senha de desenvolvimento** em três: `apps/api/.env.example:37`, `apps/api/test/seed-seguro.test.ts:56` e
  `tools/shoot-clients.cjs:17`;
- **9 capturas** com dado real (`git diff --name-only HEAD origin/main -- '*.png'` conta nove; ao todo 46
  arquivos diferem entre os dois refs).

A correção já está commitada localmente (`bedf661` e `ecb3f28`) e é exatamente o que a F0 manda publicar. Ela
não foi publicada porque o portão de avanço direto falhou — ver N17.

### N17 — BLOQUEIO DE PUBLICAÇÃO: o dono escreveu no GitHub em cima do README antigo

`git fetch origin` nesta retomada trouxe três commits do próprio dono (`7a34167`, `150581f`, `2cfa2e9`, todos
"Update README.md", 2026-10-12 entre 13:16 e 13:21, só `README.md`). O estado medido:

```
## main...origin/main [ahead 3, behind 3]
--- avanço direto? ---
NÃO
```

O README que chegou tem 888 linhas; o local, 917. A edição foi feita a partir da versão **anterior** à R2, e por
isso a linha 633 do README remoto traz de volta o endereço pessoal do administrador — o mesmo que o teste
`apps/api/test/identificadores-fora-do-codigo.test.ts` proíbe. Nada foi resolvido por conta própria: o item 4 do
PROMPT MESTRE veda pull, merge, rebase e force quando um portão falha, e a decisão de qual README vale é do dono.

**Encerrada na mesma rodada, por decisão do dono.** A opção autorizada foi "merge e fico com
o README local": `git merge origin/main` gerou o commit `772cc77`, o conflito de `README.md`
foi resolvido com a versão da árvore local, e o portão de avanço direto voltou a existir.
Medido no arquivo resolvido: 917 linhas, zero marca de conflito, nenhum endereço de domínio
pessoal (`/@gmail/` não casa), e a conta fictícia `admin@exemplo.test` no lugar. O push
saiu: `2cfa2e9..772cc77`, com `git ls-remote origin HEAD` devolvendo o mesmo hash do `git
rev-parse HEAD`. Consequência prática da publicação: a **ponta** do `main` no GitHub deixa
de ter as 30 ocorrências de N16 e as 9 capturas com dado real. O histórico anterior continua
com elas, e o dono decidiu (item 1 do PROMPT MESTRE) que não se reescreve histórico nem se
rotaciona nada por causa disso.

**O que o merge não trouxe, registrado sem corrigir:** o README do GitHub tem um índice
"Sumário" de 16 entradas e uma seção "Estado atual" que o README local não tem. É conteúdo
escrito pelo dono, pode voltar a pedido — mas não voltou aqui, porque a decisão foi manter o
texto da vitrine.

### N18 — NÃO VERIFICADO (ambiente): o MySQL do WAMP parou no meio da fase

O portão `npm test` não pôde ser corrido nesta rodada. A saída medida:

```
Can't reach database server at `localhost:3306`
```

Tentativa de subir o serviço por conta própria falhou por permissão do próprio disco do WAMP
(`mysqld: Can't sync file '.\binlog.index' to disk (OS errno 13 - Permission denied)`), e não há serviço do
Windows instalado para isso. A suíte da API (30 arquivos / 246 casos) depende do banco real por contrato, então
o estado dela nesta rodada é **NÃO VERIFICADO — banco parado**, e nada foi dado por aprovado. Typecheck e build
foram corridos e passaram. O guarda novo da F1.1 não usa banco e foi validado isoladamente.

**Encerrada na mesma rodada.** O dono iniciou o MySQL do WAMP, a porta 3306 voltou a
escutar, e a suíte foi corrida de ponta a ponta: `npm test -w @nexus/api` → `Test Files 31
passed (31) / Tests 250 passed (250)`; `npm test` no workspace web → `Test Files 5 passed
(5) / Tests 27 passed (27)`. O contador da API subiu de 30 arquivos / 246 casos para 31 /
250 porque o guarda da F1.1 entrou na suíte.

### F1.1 encerrada: varredura, correção e guarda permanente

- **Varredura** (`apps/api/test/caracteres-permitidos.test.ts`, 4 casos): 284 arquivos de texto — os 283 que o
  git já acompanha mais o próprio guarda, que ainda não está indexado —, além das mensagens de commit de todo o
  histórico (`git log --format=%B`), do patch dos três commits pendentes e do `README.md` que está no
  `origin/main`. Na árvore já corrigida, o resultado é **zero caractere de script não latino** nos quatro
  escopos; o que a primeira passada achou está no item seguinte.
- **Único achado**: quatro ocorrências de U+03A3 (sigma grego) em `docs/AUDITORIA.md:462`, `:473` e `:527`
  (duas), usadas como símbolo de somatória. Reescritas em português: "soma das linhas", "soma das parcelas =
  total da nota" e `soma(ENTRADAS) − soma(SAIDAS)`. O sentido matemático não mudou; a notação passou a ser
  texto latino, que é a regra do projeto.
- **Prova vermelha e verde**, na ordem exigida: com o guarda instalado e a árvore ainda com o sigma, o teste
  falhou assim —

```
AssertionError: docs/AUDITORIA.md:462 U+03A3 | docs/AUDITORIA.md:473 U+03A3 | docs/AUDITORIA.md:527 U+03A3 | docs/AUDITORIA.md:527 U+03A3: expected [ Array(4) ] to deeply equal []
Tests  1 failed | 3 passed (4)
```

  — depois, com um arquivo temporário criado só para provar o detector (`docs/_prova-caractere-proibido.md`,
  montado por code point, nunca por literal), a falha foi `docs/_prova-caractere-proibido.md:3 U+4E00`, e o
  arquivo foi apagado. Verde final: `Test Files 1 passed (1) / Tests 4 passed (4)`.
- **Como o guarda se mantém honesto**: a lista cobre 35 scripts não latinos e é escrita com propriedades Unicode
  (`\p{Script=Han}`, `\p{Script=Cyrillic}` e mais 33), então o próprio teste não carrega caractere proibido; o
  quarto caso lê o fonte do guarda e falha se ele passar a carregar. A varredura usa
  `git ls-files --cached --others --exclude-standard` — pega inclusive arquivo novo ainda não indexado, que é
  justamente como um caractere desses entraria. Símbolos de `Script=Common` (travessão, seta, moeda, º) ficam
  fora de propósito: não são alfabeto. Grego e copta entram.

### F1.2 encerrada: rodapé único, versão lida do pacote e uma colisão de classe com o AdminLTE

- **O que a fase pediu e o que foi entregue.** Um só rodapé para vitrine e painel (`AppFooter`), alimentado por um
  arquivo de marca (`brand.ts`), com versão lida do `package.json` no build, ano dinâmico, crédito do dono, links
  legais condicionados à publicação e indicador de estado do serviço só com dado real. Os dois rodapés antigos
  (`LandingFooter.tsx` e o `<footer className="admin-footer">` do `AdminShell`) saíram de cena, junto com as regras
  CSS e com a chave `footer` do `copy.ts`, que ficou órfã.
- **N19 — MÉDIO (estilo, resolvido dentro da própria fase): o AdminLTE 4 já é dono da classe `.app-footer`.**
  `node_modules/admin-lte/dist/css/adminlte.css:14034` define `.app-footer { padding: 1rem; min-height: 3rem;
  color: var(--bs-secondary-color); background-color: var(--bs-body-bg); border-top: 1px solid
  var(--bs-border-color); }`, e o `main.tsx` importa essa folha. O nome escolhido para o rodapé único colidiu: a
  primeira captura em 1440x900 mostrou uma faixa branca no pé da vitrine, contra o creme `#f5f1ea` do tema dia.
  Medido no navegador antes da correção: `backgroundColor` resolvido em `rgb(255, 255, 255)` sem nenhuma regra do
  projeto definindo fundo. Depois da renomeada para `.nexus-footer`: `rgba(0, 0, 0, 0)`, com a cor vindo do
  `--bg`/`--surface` de cada tema. **Fica a lição de escopo:** antes de batizar classe nova neste projeto, conferir
  o CSS do AdminLTE — a colisão não quebra nada visualmente óbvio no painel, onde o shell já é do framework.
- **N20 — BAIXO (ferramenta de teste, resolvido na hora): o guarda R2 não sobrevivia a apagada ainda não
  indexada.** `apps/api/test/identificadores-fora-do-codigo.test.ts` varre `git ls-files -z` e lê cada arquivo.
  Apagar `LandingFooter.tsx` sem indexar a apagada deixou o arquivo na lista do índice e ausente no disco: três
  casos falharam com `ENOENT`. O guarda foi endurecido com o mesmo critério que a F1.1 já usava — filtra por
  `existsSync` e segue varrendo o que existe; o que saiu do disco não carrega dado nenhum, e o histórico publicado
  continua coberto pela varredura de patch (`git log -p`). Verde: `6 passed (6)`.
- **Contraste, medido e não estimado.** Texto do rodapé `--text-2`: 8,64:1 sobre `--bg` e 7,67:1 sobre
  `--surface` no tema noite; 5,50:1 e 5,84:1 no tema dia. O `--text-3` que estava lá reprova nos dois (4,02:1 e
  3,14:1). O selo de versão vive sobre `--surface-2`: 7,00:1 no tema noite e 5,26:1 no dia, medidos com a mesma fórmula. O ponto verde/âmbar do indicador de serviço
  é decorativo (`aria-hidden`), porque o texto acompanha o estado — cor não é a única portadora da informação.
- **Prova vermelha e verde, na ordem.** Vermelho 1 (antes de qualquer componente): `Failed to resolve import
  "../components/layout/AppFooter"`. Vermelho 2 (colisão do AdminLTE capturada na prova de navegador): faixa
  branca no rodapé, `rgb(255, 255, 255)` medido. Verde final: `Test Files 6 passed (6) / Tests 39 passed (39)` no
  web e `31 passed (31) / 250 passed (250)` na API, com os 12 casos novos cobrindo os dois temas, ano dinâmico,
  versão igual à do `package.json`, links legais ausentes quando não publicados e presentes quando publicados,
  crédito como texto sem endereço configurado, link seguro com endereço, e nenhum link vazio.
- **Prova de navegador (Temp, não publicada):** vitrine em 1440x900 nos dois temas e painel logado pela conta
  fictícia de captura, conferindo texto, links, fundo transparente e o indicador vindo do `GET /api/health` real
  (`{"status":"ok","db":"up"}`). Nenhuma imagem nova com dado real entrou no repositório; as capturas publicadas do
  README são de topo de tela e não mostram rodapé, então não houve recaptura obrigatória.

### F1.3 encerrada: o seed em produção deixou de levar a demonstração junto — 2026-10-12

- **N21 — MÉDIO (configuração, resolvido dentro da própria fase): `ALLOW_DEV_SEED=1` era licença para a vitrine
  inteira.** A chave nasceu na Fase 2 como a única maneira de o seed rodar em `NODE_ENV=production`, mas o
  `semear()` criava a empresa `nexus-demo` em todo caminho que passasse por ele. Resultado: um operador que
  liberava o seed para cadastrar o administrador da plataforma, num banco de cliente, recebia junto uma empresa
  de demonstração vazia e sem uso. Agora cada peça tem a sua escrita — `SEED_DEMO_COMPANY=1` para a casa,
  `SEED_DEV_ACCOUNT=1` para a conta — e a recusa nova amarra as duas: pedir a conta dev sem a casa devolve
  motivo pronto, porque a conta é `OWNER` justamente daquela empresa. Nada foi rotacionado nem apagado (§0.1 do
  dono): as contas fictícias continuam as mesmas fora de produção.
- **N22 — BAIXO (fora do escopo, relatado sem mexer): a varredura estrutural não alcança os segredos de JWT.**
  O guarda novo de `identificadores-fora-do-codigo.test.ts` cobre `SEED_ADMIN_PASSWORD`, `SEED_DEV_PASSWORD` e
  `NEXUS_CAPTURA_SENHA`. Ele não inclui `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` porque
  `test/validador-de-producao.test.ts` escreve o placeholder documentado do `.env.example` entre aspas, de
  propósito, para provar que o validador recusa valor de tutorial (`"troque-por-um-segredo-forte-de-32-mais-bytes"`,
  linhas 180, 181, 220 e 221). Incluir as duas chaves obrigaria a lista a abrir exceção para o único caso que é
  exemplo legítimo, e um guarda com exceção para o caso principal não guarda. Nenhum segredo real está nesse
  range — a régua de 32 caracteres e o teste de processo filho (`config/env.ts` recusando a subida) ficam na F2,
  onde a matriz de rotas já exige varrer superfície inteira.
- **N23 — BAIXO (informativo, nada corrigido): em produção a recusa chega antes do seed abrir a boca.**
  Rodar `NODE_ENV=production npm run db:seed` na máquina do desenvolvimento não imprime o `Seed recusado —` de
  `errosDoSeed`: o processo morre em `src/config/env.ts` (a régua A9 roda na importação, via
  `src/lib/prisma.ts`), porque o `.env` local carrega segredo de exemplo, CORS de localhost e banco `root` sem
  senha. É defesa em camada funcionando, não defeito — e a mensagem nomeia variáveis e motivos sem imprimir valor
  nenhum, conferido na saída: seis problemas listados, nenhum segredo. Fica registrado porque muda o que o
  operador vê (primeiro o erro de configuração, depois o do seed) e porque a F1.4 precisa subir o
  `admin:criar` com configuração válida de produção, onde aí sim `ALLOW_DEV_SEED` e as travas de demonstração
  são a segunda porta.
- **Seed real, fora de produção (medido na CLI, não só em teste):** `npm run db:seed` no `.env` da máquina
  devolveu `empresaDemo: 'nexus-demo'`, `contaDev: 'admin@nexus.local (senha definida via SEED_DEV_PASSWORD,
  só para desenvolvimento)'` e as rotinas — ou seja, a trava nova não quebrou o caminho de desenvolvimento, e o
  resumo continua sem senha nenhuma. O endereço do administrador global impresso nessa saída vem do `.env` local
  e não é copiado para documento nenhum.
- **Verificado e limpo:** `tools/conta-de-captura.local.json` guarda a senha gerada da conta fictícia de captura
  (24 caracteres, `demo@exemplo.test`) e está no `.gitignore` linha 41 — `git ls-files` não o devolve, então
  nenhum valor de credencial de ferramenta de prova entra no repositório.
- **Prova vermelha e verde, na ordem.** Vermelho com o teste escrito antes de qualquer mudança no seed:
  `Test Files 1 failed / Tests 6 failed | 3 passed (9)` — as importações que ainda não existiam, mais a trava
  ausente no `.env.example`. Replays honestos: devolvendo só o `prisma/seed.ts` ao HEAD (e deixando o
  `.env.example` já corrigido), a mesma suíte dá `5 failed | 4 passed (9)`, com
  `TypeError: empresaDeDemonstracao is not a function` e, no caso central,
  `AssertionError: expected [ 'nexus-demo' ] to deeply equal []` — o seed de produção ainda pedia a casa de
  demonstração no plano de escrita. Restaurada a correção, o arquivo devolve `9 passed (9)`. Verde da rodada:
  `7 passed (7)` no guarda R2, `6 passed (6)` no `seed-seguro.test.ts`, e a suíte inteira em
  `32 passed (32) / 260 passed (260)` na API com `6 passed (6) / 39 passed (39)` no web. O teste que injeta um
  cliente que só anota é o que permite provar o plano de escrita sem encostar no banco do desenvolvedor; a
  recusa sem `ALLOW_DEV_SEED` continua medida no banco real, contando usuários e empresas antes e depois.
- **Codificação medida, já no estado commitado:** 400 arquivos rastreados (os 398 de antes mais o teste
  novo e o ADR-0005), 290 de texto — BOM 0, CRLF 0, sem quebra final 0, e 0 ocorrências de alfabeto não latino
  no fonte novo, no teste, no ADR, nas mensagens de commit e no patch `origin/main..HEAD`.

### F1.4 encerrada: o administrador da produção ganhou porta própria, e ela não abre sozinha — 2026-10-12

- **N24 — sem a régua de ambiente, o bootstrap virou chave-mestra do banco.** O vermelho desta fase não foi
  escrito de propósito para perder: a primeira versão do script é a que qualquer um escreveria ("só cria o
  administrador se ele não existir", um `upsert` com `passwordHash` vindo do ambiente). Chamada pelo teste com
  `{ NODE_ENV: "production", SUPER_ADMIN_EMAIL: ... }` e **sem** `ADMIN_CRIAR_SENHA`, ela não recusou nada —
  resolveu o `promise` e devolveu `{ acao: 'upsert', email: 'administrador@exemplo.test', empresasComoOwner: 37 }`:
  criou o usuário com hash de senha vazia, deu-lhe `platformRole SUPER_ADMIN` e `OWNER` das 37 empresas do banco
  do desenvolvedor. Uma senha ausente virou credencial válida, e o script que deveria instalar um administrador
  instalou uma porta. A suíte inteira dessa versão ingênua deu `15 failed (15)`. O desenho correto ficou em
  `docs/adr/0006-bootstrap-do-administrador-da-plataforma.md`: recusa de ambiente **antes** da primeira consulta,
  régua de acesso na senha, e três consentimentos escritos porque reescrever credencial, promover conta alheia e
  reativar acesso são três efeitos diferentes.
- **N25 — fora do escopo, relatado em vez de corrigido em silêncio:** a "regra definitiva de acesso" do dono
  (mínimo 8, uma maiúscula, um especial) está implementada em `passwordPolicy.ts` como
  `length >= 8 && length <= 128 && /[A-Z]/ && /[^A-Za-z0-9]/`. O último teste aceita **qualquer** caractere
  não alfanumérico — underline, hífen e **espaço** contam como especial. Dois dados de teste desta fase caíram
  por isso: `SEM_CARACTER_ESPECIAL` passa (o underline é especial) e `todasminusculas1!` foi escrito com "L"
  maiúsculo sem querer. Nada foi alterado: a régua é decisão do dono, e mudar o que conta como especial agora
  quebraria senhas já aceitas em desenvolvimento. Se a intenção for exigir pontuação de verdade (ou excluir
  espaço), é linha nova em `docs/decisoes/`, não correção silenciosa.
- **Prova de CLI, medida na máquina com conta fictícia (`bootstrap@exemplo.test`), e desfeita depois:**
  senha ausente → `Bootstrap recusado — ADMIN_CRIAR_SENHA não está definida — ...`, código de saída `1`;
  senha `fraca` → `... não atende à regra de acesso do projeto — A senha deve ter no mínimo 8 caracteres,
  incluindo uma letra maiúscula e um caractere especial`, código `1`; senha forte → `acao: 'criar'`,
  `senha: 'definida agora'`, `empresasComoOwner: 37`, nenhum valor de senha no console. Conferido no banco:
  `platformRole SUPER_ADMIN`, `active: true`, 37 vínculos `OWNER`, hash `$2a$12$` de 60 caracteres com
  `compareSync` verdadeiro. Segunda rodada com a mesma senha → `acao: 'confirmar-papel'`,
  `senha: 'preservada'` e a mesma hash — rodar duas vezes não troca credencial. Rodada apontando o endereço para
  uma conta de cliente existente → `Bootstrap recusado — já existe uma conta com este endereço e ela não é
  administradora da plataforma ... declare ADMIN_CRIAR_PROMOVER=1`, e a conta continuou com
  `platformRole: null`, `active: true`. A conta fictícia foi apagada em seguida com os 37 vínculos; o banco
  voltou exatamente à medida anterior: **359 usuários, 37 empresas, 41 vínculos**.
- **A guarda estrutural da F1.3 passou a cobrir a chave nova:** `ADMIN_CRIAR_SENHA` entrou no vetor de chaves de
  `identificadores-fora-do-codigo.test.ts`, então nenhum arquivo rastreado pode atribuir valor literal a ela — e
  o placeholder do `.env.example` é fraco de propósito, conferido em teste: copiá-lo não instala conta nenhuma.
