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

### N7 — BAIXO, **corrigido na T4.3**: o tema do produto não é o tema que o AdminLTE olha

Nenhuma linha de `apps/web/src/` escreve `data-bs-theme` (medido com `grep -rn "data-bs-theme" apps/web/src
apps/web/index.html` → zero ocorrências), e o `adminlte.min.css` importado em `main.tsx` tem **17** regras
sob `[data-bs-theme="dark"]` e **4** sob `[data-bs-theme="light"]`. O tema escolhido pela pessoa é escrito só
em `data-theme` no `<html>`, então qualquer peça que o AdminLTE vista por aquela outra chave — modal,
dropdown, tabela do plugin — fica fora do tema. Não foi corrigido nesta rodada porque sincronizar as duas
chaves muda o desenho de todas as telas do painel, e isso obriga a recapturar as seis telas do `README.md` e
as oito provas de navegador: trabalho de rodada própria, com aval do dono. Enquanto isso, o que se vê nas
telas é o que as provas medem, e elas estão verdes.

Fechado na T4/F5 (2026-10-14) pelo caminho reversível, sem pedir escolha nova ao dono: o `ThemeContext`
passou a escrever `data-bs-theme` no `<html>` **junto** com o `data-theme` que já mandava no produto — nada
deixou de funcionar pelo caminho antigo, e o que ganhou foi o conjunto de regras do AdminLTE que estava
morto. O valor é lido do preferido salvo em `apps/web/src/main.tsx`, antes de `createRoot`, para a tela não
piscar o tema errado — e não por *script* inline no html, porque o CSP de produção é o padrão do helmet e sua
`script-src` vale `'self'`. Prova: **6 casos** em `apps/web/src/test/tema-sincronizado.test.tsx`, vermelho primeiro
com as duas chaves desalinhadas, e as duas capturas de tema claro regravadas e conferidas na prova
`tools/verify-sidebar.cjs` (**104 checagens, 0 falhas**), que agora mede luminância da superfície da barra e o
contorno do botão no tema claro. Decisão em `docs/adr/0016-tema-do-painel-com-duas-chaves.md`.

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

## Adenda da execução — F2 (matriz de rotas, opção D do G8 e N14) encerrada — 2026-10-13

### N14 e N15 — FECHADOS

**N14 — MÉDIO, auditoria de plataforma escrita no tenant errado.** Fechado na F2 com a opção D do G8, por
construção e não por convenção: `AuditLog.scope` (`apps/api/prisma/schema.prisma:168`, migração aditiva
`20261013000000_add_escopo_da_auditoria`) decide a trilha, e o `audit()` (`apps/api/src/lib/audit.ts:33-41`)
**anula** o `companyId` de todo evento marcado `platform` — a linha nasce com empresa dona nula e a empresa da
sessão passa a `metadata.empresaDaSessao`, como origem. As 8 escritas de plataforma medidas no `src` (5 em
`modules/cms/cms.service.ts`, 1 em `modules/cms/cms.routes.ts`, 2 em `modules/cron/cron.routes.ts`) carregam o
escopo, e a leitura nova `GET /api/audit/plataforma` (`modules/audit/audit.routes.ts:98-135`) filtra por escopo,
exige `assertPlatformAdmin` conferido no banco e nunca devolve `companyId` — devolve o **nome** da empresa de
origem. Decisão registrada em `docs/adr/0007-escopo-da-auditoria.md`.

**N15 — informação, não é falha.** O campo que faltava ("esta linha é do administrador agindo como plataforma")
existe agora, é a coluna `scope`, e o desenho completo está no ADR-0007.

Também fecha o "NÃO VERIFICADO" que a R3 registrou sobre o CMS: medido por contagem de blocos, as **6** rotas de
escrita do CMS (config, item criar/editar/apagar, texto legal publicar, token de manutenção) têm bloco `audit({`
correspondente, e a regra 9 do guarda estrutural não deixa um módulo de tenant carimbar plataforma nem a leitura
de auditoria gerar auditoria.

### N26 — documento e máquina mediram números diferentes (divergência de doc, nada de código)

- `docs/ESTADO-ATUAL.md:154` diz **105** rotas declaradas, **14** de plataforma e **81** de empresa. Lido do
  próprio Fastify nesta rodada (`onRoute` antes de `ready()`, sem `app.routes`, que não existe na versão 5):
  **158** eventos = 51 GET + 51 HEAD + 27 POST + 19 PATCH + 7 DELETE + 2 PUT + 1 OPTIONS, ou **106** rotas de
  negócio (método + caminho), das quais **10** públicas, **15** de plataforma e **81** de empresa. A diferença é
  exatamente a rota nova desta fase (`GET /api/audit/plataforma`). O `HEAD` espelha todo `GET`
  (`exposeHeadRoutes` do Fastify 5) e o `OPTIONS *` vem do CORS; nenhum dos dois fura o gate, e isso é a regra 2 do
  guarda.
- Defeito de tabela consertado na mesma rodada: em `docs/STATUS-AJUSTES.md` a linha da F0 estava colada na da
  F1.1 (um `|` faltando no fim da linha da F0, que virou `||` no meio do texto), então a tabela renderizava a
  F1.1 como colunas extras da F0. Reparado junto das linhas da F2, do G8 e da F5.
- A opção D do G8 escreveu a tela como `/app/plataforma/auditoria`; a entregue foi **`/app/auditoria-plataforma`**,
  seguindo o padrão de rota do painel (uma segmento por tela, sem subpasta). O documento de decisão foi
  atualizado com a diferença em vez de o código seguir o rascunho calado.
- `docs/ESTADO-ATUAL.md` é retrato de rodada anterior — o próprio arquivo avisa que quem mexer reatualiza. A
  re-medida completa dele está combinada para a F9; aqui fica registrada a diferença conhecida: mais **uma** rota
  de API e mais **uma** tela de painel desde a rodada que o escreveu.

### N27 — a migração é aditiva e a história não foi reescrita (limitação conhecida)

No banco de desenvolvimento, com **45.609** eventos de auditoria, as linhas de entidade de plataforma escritas
**antes** da coluna nova (**3.705** medidas: `landing_config`, `landing_item`, `legal_document` e `cron_job` com
`scope: "tenant"`) continuam na trilha do tenant. Dessas, **800** têm `companyId` preenchido — é o ruído antigo
do N14, e ele continua visível para o dono daquele tenant — e **2.905** já nasciam sem empresa nenhuma (as
corridas do relógio, que não têm sessão). Nada foi corrigido em massa: reescrever auditoria para melhorar a
métrica é justamente o que a trilha existe para impedir, e §0.1 do dono manda não limpar histórico. Hoje há
**195** linhas de plataforma, todas com `companyId` nulo, e a mais antiga delas é desta rodada
(2026-10-13) — ou seja, depois da coluna nenhuma linha de plataforma nasceu com dona, que é a asserção central do
N14. Se um dia houver produção com histórico assim, a decisão de corrigir é do dono e vai para
`docs/decisoes/`, não para um script silencioso.

### N28 — fora do escopo, relatado em vez de corrigido em silêncio: o `intrusao.test.ts` alcança uma minoria das rotas

Lidas as chamadas de `test/intrusao.test.ts` como pares método + caminho com `:param` e `${...}` normalizados,
são **32** pares (o cabeçalho do próprio guarda fala em "33 URLs escolhidas", que conta caminhos e não pares) e
todos os 32 batem em rotas existentes. Contra as **106** rotas medidas, **74** não são atacadas pelo teste de
intrusão A×B. Não foi corrigido aqui: escrever intrusão para 74 rotas é rodada própria, e a F2 prometeu matriz,
N14 e superfície anônima — esta última cobrindo o buraco de outro jeito, ao bater sem token nas **96** rotas não
públicas e exigir 401 em todas (regra 7 do guarda). Vale como candidata da F8 (cobertura) ou de uma rodada de
endurecimento antes da F9.

### O que foi verificado e não é achado

- `POST /api/auth/switch-company` não vaza empresa: exige linha em `company_user` (`auth.service.ts:199-205`) e
  devolve 403 para quem não é membro, provado em `test/multiempresa.test.ts` ("trocar para empresa da qual não se
  é membro → 403"). Na matriz ele aparece na lista `DE_CONTA` do guarda, porque é rota de sessão e não de
  contexto de empresa — não é bypass.
- A régua que ficou de pé é o `test/isolamento-rotas.test.ts`, com **9 regras verdes**: (1) nenhuma rota nasce
  sem `app.authenticate` e sem carimbo de pública; (2) o espelho HEAD e o preflight OPTIONS são só o que o gate
  isenta; (3) as públicas são exatamente a lista declarada, nem uma a mais; (4) a contagem medida bate com a
  contagem declarada nos arquivos de rota; (5) cada rota é plataforma, empresa ou conta, e as de conta são as
  declaradas; (6) toda escrita de tenant pede permissão ou é escrita da própria sessão; (7) toda rota
  autenticada recusa quem não tem token; (8) nenhuma auditoria de plataforma carimba a empresa da sessão (N14);
  (9) só módulo de plataforma carimba evento de plataforma, e quem lê não escreve.

### Portões e provas medidos nesta rodada

- **Vermelho primeiro:** o N14 nasceu vermelho em `test/cms.test.ts:396` e `test/cron.test.ts:252` — as duas
  assersções liam a trilha pelo `companyId` do tenant, comportamento que a fase veio mudar. Reescritas para o
  contrato novo (escopo `platform`, `companyId` nulo e origem no metadata) **sem** enfraquecer: os casos ganharam
  `length > 1` para o guarda não passar em branco.
- **Prova de que as guardas mordem (mutação):** trocar `audit()` para respeitar o `companyId` recebido em evento
  de plataforma devolve **5 falhas** na suíte da API; com o código correto, 0.
- **Verde:** API **35 arquivos / 291 testes** e web **7 arquivos / 46 testes**, ambos com código de saída 0;
  `tsc -p tsconfig.json --noEmit` (API) e `tsc -b --noEmit` (web) limpos; `npm run build` no ar com o mesmo aviso
  conhecido de chunk único (889 kB minificados, 265 kB em gzip — é a F5, não é desta fase).
- **Prova de navegador** `tools/verify-auditoria-plataforma.cjs`: **29 verificações, 0 falhas**, com o banco
  devolvido ao estado anterior (rotina restaurada, 2 eventos da prova removidos, STAFF de prova apagado). A prova
  não deixa captura no repositório, e o motivo está escrito no cabeçalho do arquivo: a trilha mostra nomes reais
  de empresa do banco de desenvolvimento.

---

## Adenda da execução — F3.1 (menu lateral sem página vazia) encerrada — 2026-10-13

Os dois itens `emBreve` que restavam em `AdminShell.tsx` saíram do menu e o tipo `NavItem` passou a exigir
`to: string`: linha sem destino não compila mais. Saíram também o ramo `<span>` do mapa, o estado
`.admin-nav-item.is-soon`, a etiqueta `.admin-nav-soon` e as regras de colapso e peek do CSS. A barra ficou
com **15 linhas em 6 camadas**, todas link de rota existente. Guarda:
`apps/web/src/test/menu-sem-pagina-vazia.test.tsx` (6 casos, vermelho primeiro — com as duas linhas ainda na
árvore, o caso do vocabulário falha e o da barra montada quebra no seletor do item apagado) e
`tools/verify-sidebar.cjs` reescrita para o contrato novo: **102 checagens, 0 falhas**, clicando as quinze
linhas uma a uma e conferindo `location.pathname` e o título de cada tela. Nenhuma página nova foi criada:
construir Ordens de Serviço e Gateways sem o anexo do PROMPT_IDE seria inventar funcionalidade (§1), então a
F3.2 fica parada pedindo o reanexo.

### N29 — fora do escopo, relatado em vez de corrigido em silêncio: nove ferramentas de captura não acompanham a interface de hoje

Para recapturar o painel inteiro com a barra nova seria preciso rodar `tools/shoot-clientes.cjs`,
`shoot-products.cjs`, `shoot-sales.cjs`, `shoot-purchases.cjs`, `shoot-financeiro.cjs`, `shoot-crm.cjs`,
`shoot-modals.cjs`, `shoot-agenda.cjs` e `shoot-tabs.cjs`. Duas param sozinhas: `tools/shoot-sales.cjs:104` e
`tools/shoot-financeiro.cjs:102` esperam o seletor `.nx-dialog .input`, que não existe mais — o diálogo foi
refeito e a ferramenta não foi junto. `tools/shoot-tabs.cjs` roda até o fim, mas fecha com **353 checagens e
10 falhas** (a tabela deste repositório ainda anuncia 447), todas dependentes de dado: a conta com que ela
entra não tem clientes, produtos, fornecedores nem leads no banco de hoje, e as colunas `.col-acao` /
`.col-quando` do histórico não são mais as mesmas. Rodá-las agora produziria captura com "Nenhum cliente
encontrado" no lugar da tela que a família prova — foi exatamente o que aconteceu com as dezoito linhas de
`18-tabs-*.png` nesta rodada, que voltaram para o estado commitado antes do push (`git restore --source=HEAD`,
sem operação proibida). Consertar as nove ferramentas é rodada própria, junto do N13.

### N30 — fora do escopo, relatado: 48 arquivos de captura ainda mostram a barra lateral de antes da F3.1

As famílias `07-*`, `10-*`, `11-*`, `12-*`, `13-*`, `14-*`, `15-*`, `17-*` e `18-*` somam 48 PNGs no
repositório e continuam registrados com as duas linhas apagadas de "Ordens de Serviço" e "Gateways &
Cobranças" — consequência direta do N29. O que elas provam é a tela do módulo, não o menu, e o README declara
isso na nota da galeria. As famílias do painel cuja ferramenta roda limpa foram recapturadas nesta rodada
(`16-*`, `21-*`, `22-*`, `23-*`, `03-*`, `04-*`, `05-*`), e as duas telas de Vendas e Financeiro que estavam na
galeria saíram dela: entraram no lugar as duas capturas de `tools/verify-parcelamento.cjs`, que mostram as
mesmas telas com a barra de hoje. Passada completa na F9.

**Re-medido na T4 (2026-10-14).** As provas de navegador desta rodada regravaram **74** PNGs, e a casa agora tem
como conferir isso sem depender do olho: um comparador decodifica o bitmap do arquivo do `HEAD` e do arquivo da
árvore (IDAT + inflate + unfilter) e compara pixel a pixel, porque um PNG regravado muda de bytes por metadado do
codificador mesmo quando a tela é a mesma. Nenhum dos setenta e quatro voltou byte por byte igual, e a diferença
não é ruína de codificador: `17-agenda.png` e `04-usuarios.png`, por exemplo, mostram no `HEAD` a barra de antes
da F3.1 - sem "Notificações", sem "Ordens de serviço", sem "Cobranças", sem sino no cabeçalho - e na árvore atual
a barra de hoje com as dezessete linhas. `02-login.png` do `HEAD` anuncia o placeholder `voce@exemplo.com`, que
o `Login.tsx:264` não escreve mais desde a T4.2; a regravada mostra `seu@email.com`, que é o que a tela devolve.
Conferidas visualmente, em pares lado a lado e em montagem, as dez capturas estreitas (o piso de 44 px mudou o
tamanho de botão, aba, campo e paginação no celular) e as sessenta e quatro de mesa: nenhuma tela quebrada,
nenhum dado de fora, nenhuma credencial em campo. As setenta e quatro ficam. O N29 continua em aberto - as
ferramentas de captura continuam consertadas por ninguém - e é justamente por isso que a casa dependeu aqui das
provas para recapturar.

### N31 — corrigido nesta rodada porque a recaptura esbarrou nele: `verify-rotinas.cjs` procurava a trilha de plataforma pelo `companyId` da sessão

A F2 (ADR-0007) mudou onde a trilha da plataforma mora: evento com `scope = platform` perde o `companyId`.
`tools/verify-rotinas.cjs:330` continuou filtrando por `companyId: empresa.id` e as duas checagens de auditoria
passaram a devolver zero — a prova fechava 35/37. Lido no banco, o evento está lá e está certo:
`cron.job.run` de 2026-10-13 com empresa nula e escopo `platform`. A busca passou a ser pelo escopo, limitada à
janela da corrida, e a prova voltou a fechar **37 checagens, 0 falhas**. O que a F2 não rodou foi esta família
de prova de navegador — argumento a mais para o `npm run verify` único que a F5 promete.

### N32 — corrigido na T2 (decisão D5 do dono): a casa que o painel mostra no cabeçalho agora é determinística

A casa da vitrine nas capturas de painel era "Nexus Demo". Depois do `admin:criar` da F1.4, o administrador
da plataforma passou a ter vínculo de `OWNER` nas empresas do banco — e `pickMembership`, sem empresa pedida,
devolvia a **primeira** ativa na ordem que o `include` do Prisma entregava, que em MySQL é a ordem do índice
de `company_users`, isto é, a ordem do uuid. Trocar de banco, recriar vínculo ou ganhar uma empresa nova de
teste mudava o cabeçalho da pessoa sem ela pedir.

Fechado com a regra em três passos do ADR-0011: a empresa **pedida** no login manda; sem pedido volta a
empresa **lembrada** no cadastro (`users.last_company_id`, migration aditiva
`20261013030000_add_empresa_lembrada`, escrita por `switch-company` e respeitada pelo refresh de token sem
empresa); sem lembrança, o vínculo **mais antigo**, com desempate por `createdAt` e depois por `id` — ordem
que não depende de uuid nem de índice de banco. Pedir empresa no login não reescreve a lembrança, e uma
lembrança que caiu (vínculo removido ou empresa adormecida) desce para a regra determinística sem derrubar a
sessão. Medido com a mudança aplicada: o administrador de prova tem três vínculos, o mais antigo é
"Nexus Demo", e a ordem por uuid entregaria "Empresa-1791925362473-5-134714" primeiro — a API hoje devolve
"Nexus Demo". A conta fixa de capturas tem **um** vínculo só, então o cabeçalho das telas do README e das
provas continua "Demonstracao (minha empresa)", conferido por login real e não por suposição. Prova em
`apps/api/test/empresa-lembrada.test.ts` (sete casos, incluindo o de três empresas que a decisão pediu).

### O que foi verificado e não é achado

- `tools/verify-cms.cjs` ainda consulta `.admin-nav-item.is-soon` para afirmar que a linha do CMS saiu do
  menu: com o estado extinto, a consulta devolve lista vazia e a asserção continua valendo pelo motivo certo.
- `apps/web/src/test/auditoria-duas-trilhas.test.tsx:213` proíbe `emBreve` na linha do menu que ele lê —
  guarda antiga que o contrato novo só reforça.
- O filtro `.filter((grupo) => grupo.items.length > 0)` continua no `AdminShell`: sem as linhas apagadas, uma
  camada cujo acesso for revogado some inteira, em vez de deixar um título órfão.

---

## Adenda da execução — F3.2 Parte 1 (Ordens de Serviço) encerrada — 2026-10-13

O anexo do PROMPT_IDE voltou a pedido do dono e a F3.2 deixou de estar parada. A Parte 1 está entregue nas
duas pontas: o backend saiu no commit `3a32119` (três tabelas, recurso `service_order` na matriz de
permissões, seis rotas, 35 casos de integração) e a tela sai neste lote — `/app/ordens-de-servico` com duas
abas, oito indicadores, filtros e paginação no servidor, documento para imprimir e a tabela que vira cartão
no celular. Guarda: 10 casos em `apps/web/src/test/ordens-de-servico.test.tsx` e 102 verificações em
`tools/verify-ordens-de-servico.cjs`, que confere estoque no banco antes e depois de cada movimento, mede os
oito indicadores contra o `GET /service-orders/summary`, roda a sessão de um atendente de prova e devolve o
banco ao estado anterior no `finally`. Decisão de produto registrada em
`docs/adr/0008-ordem-de-servico-baixa-estoque-na-conclusao.md`. Portões da rodada: typecheck dos dois lados
limpo, build `914,87 kB / 271,50 kB gzip` de JS e `390,88 kB / 60,01 kB` de CSS, API **36 arquivos / 326
casos** e web **9 arquivos / 62 casos**, zero falha e zero skip.

### N33 — corrigido nesta rodada porque a captura denunciou: a tabela de nove colunas não cabia na janela de 1440

Medido na primeira corrida da prova: a tabela pedia **1244 px** e a área visível do painel entregava
**1126 px**, então a coluna Ações — a que tem os botões de Iniciar, Concluir e Cancelar — ficava fora da
tela em 1440×900, o quadro que o próprio README declara como padrão das capturas. Não foi consertado na
intuição: a largura foi medida com script de bancada, `scrollWidth` da tabela contra `clientWidth` do trilho
que a envolve, antes e depois da mudança. A tabela passou a
ter respiro próprio (`.nx-os-tabela { min-width: 1080px }` com cabeçalho e células em `0.72rem 0.5rem`),
dentro de um trilho que assume o transbordo em vez de cortar o conteúdo (`.nx-os-scroll { overflow-x: auto }`),
e os botões de linha encolheram para `0.74rem`. Hoje a mesma checagem devolve **1126 x 1126** — a tabela
inteira dentro da janela, sem transbordar o painel — e virou asserção permanente na prova: se uma coluna nova
estourar a largura, a corrida falha em vez de sair bonita e cortada.

### N34 — corrigido nesta rodada: o dinheiro quebrava no meio do número, e a pílula quebrava no meio da palavra

Duas regras da casa brigaram com o conteúdo da ordem de serviço. O `td.mono` global tem
`overflow-wrap: anywhere`, que serve para código interno longo e fez "R$ 195,00" virar duas linhas na coluna
Total; a pílula de status, estreita, escreveu "Aguardand / o peça". O dinheiro é a coluna que o dono lê para
bater caixa, e um número partido em duas linhas não é um número. Correção local, sem tocar nas outras
tabelas: `td.mono` volta a `overflow-wrap: normal` com `white-space: nowrap` dentro da tabela de ordens, a
`.status-pill` quebra no espaço e nunca no meio da palavra, e o título da ordem — esse sim texto longo que
precisa caber — mantém `overflow-wrap: anywhere`. As três capturas de lista (escuro, claro e celular) foram
repetidas depois da mudança e conferidas uma a uma.

### N35 — corrigido nesta rodada: as capturas saíam com o aviso da operação anterior por cima da tela

O toastr de sucesso da criação ficava visível quando a prova fotografava a lista logo depois, cobrindo o
cabeçalho da tela que a imagem existe para provar. Entrou `semToast(pagina)` antes de cada `captura()`, que
espera o aviso sair do DOM. Não é maquiagem de print: é a diferença entre uma captura que mostra o produto e
uma que mostra o teste.

### N36 — corrigido na T2 (decisão D4 do dono, mesmo caso do P11): o movimento passou a exigir motivo escrito na tela

A rota `POST /service-orders/:id/status` aceita `note` opcional, o histórico guarda o campo e a tela mostra
`.nx-os-motivo` quando ele vem preenchido. O que faltava era o meio: `mover()` chamava a rota sem nota, porque
o diálogo de confirmação da casa é de sim/não. Na cobrança era pior — `POST /charges/:id/cancel` **exige**
`reason`, e a tela tinha um modal próprio só para digitar aquilo.

Fechado com superfície nova e aditiva (ADR-0012): `confirmActionComMotivo` em `lib/confirm.ts`, montada sobre
o mesmo `Modal` e a mesma trava de duplo clique, com campo de motivo obrigatório, aviso dentro do diálogo
("Diga o motivo do cancelamento." / "Diga o motivo do estorno.") e o texto digitado preservado quando a rota
falha. `confirmAction` continuou exatamente como era — os cinco diálogos padronizados do painel não mudaram de
contrato. Entraram no caminho as três decisões que registram dinheiro ou trabalho: **cancelar ordem**,
**estornar ordem concluída** (o rótulo muda para estorno porque o estoque volta) e **cancelar cobrança** —
esta perdeu o modal próprio, e o que o modal dizia virou `nome`, `detalhe` e `ajudaMotivo` do diálogo novo.
Medido: dois casos novos em `apps/web/src/test/ordens-de-servico.test.tsx` (sem motivo nada sai pela rede;
com motivo a nota chega à rota), o caso de cobrança vazio em `cobrancas.test.tsx`, e as duas provas de
navegador — `tools/verify-ordens-de-servico.cjs` com o estorno tentando o clique vazio antes de escrever e
confirmando que o motivo da tela apareceu no histórico, e `tools/verify-cobrancas.cjs` na seção
"cancelamento com motivo".

### N37 — fora do escopo, relatado: a ordem de serviço concluída não gera lançamento financeiro nem venda

A OS baixa estoque, numera, documenta e audita; não abre conta a receber. Isso é decisão de escopo da
Parte 1, escrita no ADR-0008, e não um buraco esquecido: o anexo coloca o dinheiro do atendimento na Parte 2
(Gateways & Cobranças). Registrado aqui para que ninguém leia a tela nova e ache que o financeiro está
ligado quando não está.

### N38 — armadilha de medição, não defeito do produto: o espaço invisível do `Intl` e o maiúsculo do `innerText`

Dois falsos positivos custaram uma corrida inteira da prova e valem ficar escritos porque vão voltar.
`Intl.NumberFormat('pt-BR')` coloca **U+00A0** entre "R$" e o número, então comparar texto formatado com
literal de espaço comum nunca casa — a normalização `/\u00a0/g` é obrigatória em toda asserção de dinheiro.
E `innerText` reflete `text-transform: uppercase` do CSS: a varredura de "código interno na tela" casou
"URGENT" dentro de "URGENTES" do indicador de prioridade. A varredura passou a ler `textContent`, que é o
texto-fonte, e a checagem continua com diagnóstico de contexto no motivo, para a próxima falha dizer onde
estava e não só que falhou.

### N39 — consequência prevista: a barra lateral ganhou a 16ª linha e as capturas antigas ficaram uma linha mais velhas

O item "Ordens de serviço" entrou no menu, que passou de 15 para **16 linhas em 6 camadas**. As famílias
recapturadas na F3.1 (`16-*`, `21-*`, `22-*`, `23-*`, `03-*`, `04-*`, `05-*`) mostram a barra de 15, e as nove
famílias do N30 seguem mostrando a barra anterior à F3.1. O README dizia "recapturadas com a barra de 15
linhas" sem dizer que a barra mudou de novo — a frase foi corrigida neste lote e o destino é o mesmo:
passada completa das ferramentas de captura na F9, junto do N13.

### O que foi verificado e não é achado

- O isolamento não foi presumido: a prova cria um `STAFF` de prova na mesma empresa, mede 403 nas duas
  portas de escrita (criar e estornar), confere que a aba de criação não aparece, que ele só tem caminho na
  ordem atribuída a ele, que não vê botão de cancelar em estado nenhum e que a tela não bate na porta da
  equipe sem `user:read` — nada de caixa nativa de diálogo na sessão inteira.
- O estorno foi conferido no saldo, não na cara: cancelar uma concluída devolve exatamente o que a
  conclusão tirou, com movimentação `IN` de nota `Estorno da OS n`.
- O `history` de uma OS recém-criada tem uma linha só (`toStatus: OPEN`), e o texto "A ordem ainda não mudou
  de estado" na tela é verdadeiro, não enchimento.
- A numeração por empresa é provada por corrida no `ordens-de-servico.test.ts`, e o `UNIQUE (company_id,
  number)` continua sendo a palavra final: a tela não escolhe número e não pode repetir.
- O piso do teste do menu subiu de 15 para 16 linhas e continua piso, não teto: um item a menos por
  permissão revogada é o comportamento que a outra metade do mesmo teste protege.

## Adenda da execução — F3.2 Parte 2 (Cobranças manuais) encerrada — 2026-10-13

A segunda metade do anexo `PROMPT_IDE_ORDENS_E_COBRANCAS.md` foi aberta pelo dono com um "pode seguir" e está
entregue nas duas pontas. O backend saiu no commit `9f1dd88` (migração aditiva
`20261013020000_add_cobrancas_manuais`, tabela `charges`, recurso `charge` na matriz de permissões, seis
rotas de cobrança mais o catálogo e a configuração de gateway, e o adaptador `MANUAL` atrás de uma porta que
um provedor de mercado implementa sem tocar no serviço), com 22 casos em `apps/api/test/cobrancas.test.ts`. A
tela sai neste lote: `/app/cobrancas` com três abas — o carnê, a nova cobrança e os gateways —, oito
indicadores conferidos contra o resumo do servidor, busca, filtros, ordenação e paginação no servidor,
documento e recibo para imprimir, "Gerar cobrança" dentro da venda e da ordem de serviço, e o menu lateral
que voltou a ter **17 linhas**. Guarda, já com o que a própria rodada acrescentou: **24 casos** em
`apps/api/test/cobrancas.test.ts`, **15** em `apps/web/src/test/cobrancas.test.tsx` e
`tools/verify-cobrancas.cjs` com **137 verificações, 0 falhas** em duas corridas seguidas — o recebimento é
conferido na linha, no estado e no lançamento que nasceu no caixa; a corrida de dois cliques no mesmo
pagamento é medida com duas requisições simultâneas e um único lançamento no banco; a sessão de um atendente
de prova bate nas três portas de escrita e recebe 403; e o banco é devolvido no `finally`. Decisão de produto
registrada em `docs/adr/0009-cobranca-manual-receita-unica-e-vencida-lida.md`.

### N40 — corrigido nesta rodada porque a prova denunciou: a tabela mostrava o dia nu do servidor

A primeira corrida da tela leu `2026-10-20` na coluna Vencimento. O contrato não está errado — o servidor
devolve `dueDateLabel` como dia de calendário justamente para não escolher um fuso por conta própria — mas a
tela também não pode empurrar a decisão para quem lê. A conversão foi feita **sem objeto `Date`**:
`diaLegivel()` recorta `AAAA-MM-DD` e devolve `DD/MM/AAAA`. O motivo é o mesmo que a Fase 3c ensinou:
`new Date("2026-10-20")` é meia-noite UTC, e em `America/Sao_Paulo` isso ainda é dia 19 — um carnê que faz a
própria conta vencer um dia antes do combinado não é exibição, é defeito. A asserção entrou nos dois lados: o
teste unitário confere a célula da linha, e a prova de navegador compara a tabela com o mesmo recorte que o
servidor mede.

### N41 — corrigido nesta rodada: a coluna "Recebimento" mentia depois do pagamento

A linha dizia `PIX` — a forma combinada na emissão — mesmo depois de o dinheiro ter entrado em dinheiro, na
maquininha ou em transferência. É a coluna que o caixa usa para conferir o dia, e ela estava descrevendo a
intenção de quem emitiu em vez do fato de quem recebeu. `rotuloDoRecebimento()` passou a mostrar
`paidMethod` quando existe `paidAt`, e a forma da emissão continua no documento impresso, onde as duas
coisas aparecem separadas: "Forma combinada" e "Recibo de pagamento · Forma".

O conserto expôs uma lacuna do outro lado: a API devolvia `paidMethod` desde o primeiro dia e **nenhum teste
conferia esse campo** — a resposta estava certa por acaso. O caso de pagamento em
`apps/api/test/cobrancas.test.ts` agora emite por `BOLETO` e recebe por `DINHEIRO`, e assere as duas formas
na mesma resposta. Teste vermelho primeiro: antes da correção da tela, a asserção da linha falhou com
`expected "Dinheiro" / received "PIX"`.

### N42 — armadilha de medição, causa NÃO VERIFICADA: o texto agregado do diálogo saiu com espaço entre letras

Em duas corridas seguidas, a leitura de `document.querySelector('[role="dialog"]').textContent` do documento
cancelado devolveu o texto com um espaço entre cada caractere (`C o b r a n ç a  # 1 ...`), e a asserção do
motivo falhou. A mesma frase lida no elemento específico — `.nx-cb-motivo` — saiu limpa nas duas vezes, e uma
sonda de bancada confirmou que na tela o parágrafo estava lá, com o motivo, um único diálogo aberto e o
documento inteiro visível. Ou seja: **a página estava certa e a medição é que estava errada**, e o porquê não
foi determinado — não há explicação verificada para o agregado sair espaçado e o elemento não.

O que mudou foi a régua, não a tela: a asserção passou a ler o parágrafo que carrega o motivo, que é exatamente
a coisa que se quer provar, e a prova imprime `alvos=`, `motivo=`, `situacao=` e `doc=` na própria linha do
resultado. Se voltar a falhar, a próxima corrida já chega com o diagnóstico na saída.

### N43 — flaky da própria prova corrigido: limpar a busca pelo teclado deixava um caractere no campo

A asserção de ordenação limpava o campo de busca com `focus()` + `select()` + `Backspace`. Em uma corrida o
`select()` não pegou o texto inteiro, sobrou um caractere no filtro, a lista chegou ordenada com uma linha só,
e a prova — certa sobre a tela, errada sobre si mesma — acusou o produto. Agora a limpeza usa
`escrevaEm(pagina, seletor, "")`, que escreve pelo setter nativo e dispara `input`/`change` (o rastreador do
React precisa ver o evento), e a prova espera o campo vazio **e** a lista voltar a ter mais de uma linha antes
de tocar no ordenar. A ordem decrescente passou a ser medida com a saída na linha: `350 > 250 > 180 > 90`.

### N44 — fora do escopo, relatado em vez de corrigido em silêncio: o Financeiro ainda formata dia com objeto `Date`

`fmtData` em `apps/web/src/pages/Finance.tsx:40` faz `new Date(iso).toLocaleDateString("pt-BR")`. É a mesma
classe de risco do N40: um `YYYY-MM-DD` lido como UTC pode aparecer um dia antes no fuso do Brasil. Não foi
mexido aqui porque é outra tela, e a regra da casa é reportar achado fora do escopo em vez de consertar por
trás. Fica como pendência de formatação de data a fechar numa rodada própria do Financeiro.

### N45 — limitação de uso declarada: venda automática + cobrança da mesma venda escrevem a receita duas vezes

Uma empresa com a política `autoFinanceSales` ligada já ganha lançamento de receita quando a venda é fechada.
Se o balcão criar uma cobrança pendente para essa mesma venda e registrá-la como recebida, entra **um segundo
lançamento** na categoria "Cobranças". A guarda de pendência única é por documento, não por dinheiro: ela
impede duas cobranças pendentes para a mesma venda, e não pode impedir o que vem de duas portas diferentes.
Relatado aqui e no ADR como regra de operação — quem tem receita automática não cobra no papel o que o caixa
já recebeu — e não consertado em silêncio, porque "qual dos dois é o lançamento verdadeiro" é decisão do dono.

### N46 — o que o carnê de hoje não faz, por decisão e não por descuido

Sem pagamento parcial: o valor recebido é o valor da cobrança, porque meio pagamento deixaria duas verdades no
mesmo papel. Sem juros, multa ou desconto por atraso: a régua de "vencida" é o calendário, e cobrar mais pelo
atraso é política que ainda não foi escrita em lugar nenhum. E `PAID` não cancela — o 409 está na porta, porque
cancelar um recebimento é estorno, e estorno é um movimento do caixa que o produto ainda não tem. As três
limitações estão escritas na tela onde elas importam (o documento mostra a forma recebida, o rodapé conta o
que existe) e não dependem de alguém lembrar deste arquivo.

### N47 — consequência prevista: a 17ª linha da barra e as capturas que ficaram uma linha mais velhas

`Cobranças` entrou na camada Financeiro, logo depois de `Financeiro`, e a barra larga passou de 16 para 17
linhas. `tools/verify-sidebar.cjs` foi atualizado antes da recaptura (contagem, comentário e a lista das
rotas), rodou com **104 checagens e 0 falhas**, e as seis capturas da barra saíram de novo. As seis capturas
das ordens de serviço também: o modal de detalhe ganhou o botão "Gerar cobrança", e uma captura que não mostra
o botão que existe é uma captura de um produto que não existe mais.

### N48 — provas que deixam rastro contaminam a prova vizinha

A corrida de cobranças cria uma ordem de serviço de apoio para provar o "Gerar cobrança" a partir do
atendimento, e desfazia o rastro apenas no **começo** da corrida seguinte. A prova das ordens de serviço busca
um cliente pelo nome e espera uma linha; na primeira execução depois das cobranças ela acordou com duas e
falhou — falha de vizinhança, não do produto. A corrida de cobranças passou a chamar a própria limpeza no
`finally`, como a vizinha já fazia: cada prova devolve o banco como o encontrou, e a ordem em que elas rodam
deixa de importar.

### N49 — divergência de caminho entre o anexo e a casa: o ADR foi para `docs/adr/`

O anexo pede o registro da decisão em `docs/decisoes/`. Nessa pasta moram, desde a Fase 4c, as **lacunas
bloqueadas por decisão do dono** (G1 a G8), numeradas por lacuna e não por data; as decisões de arquitetura
tomadas por quem escreveu o código estão em `docs/adr/`, na série numerada 0001 a 0008. O ADR da cobrança
manual é uma decisão de arquitetura — tabela, porta de adaptador, transação de pagamento — e por isso virou
`docs/adr/0009-...`. A divergência é de caminho, não de conteúdo: o que o anexo queria dizer ("escreva a
decisão em arquivo, não no commit") foi cumprido, e a série existente foi preservada em vez de rachada.

### N50 — corrigido nesta rodada: os oito indicadores das ordens de serviço eram medidos antes de nascerem

Depois que a prova de cobranças passou a devolver o banco no `finally`, a vizinha das ordens de serviço voltou
a correr verde — e acordou vermelha em oito cartões: `kpiDaTela["Abertas"]` valia `undefined` contra o número
certo da API. A tela não está errada: os oito `CartaoKpi` são montados atrás do `sumario ? ... : null`, e a
tabela não espera por eles. A medição é que chegava cedo — `waitForSelector` na tabela, leitura dos cartões na
linha seguinte, e o `GET /service-orders/summary` ainda em voo. A prova agora espera os oito cartões existirem
antes de ler qualquer um, e a espera virou asserção ("os oito cartoes do resumo chegaram antes da leitura"),
para que a próxima pessoa que encurtar a corrida veja o motivo. Saída: 102 checagens com 8 falhas → **103
checagens, 0 falhas**. A mesma armadilha estava escrita no comentário do N43; ela só mudou de tela.

### N51 — corrigido nesta rodada: a resposta atrasada de um filtro antigo pintava por cima da lista

A corrida de cobranças falhou uma vez em "o filtro de situacao deixa so pagas" com a lista inteira na tela
(`Paga | Paga | Pendente | Cancelada`), e passou nas outras quatro. Não foi flaky da medição: a prova limpa o
filtro de vencimento e escolhe a situação no mesmo `evaluate`, dois pedidos saem juntos, e a rede responde na
ordem que quiser. `carregar()` em `Cobrancas.tsx` escrevia `setRows` em qualquer resposta que chegasse — o
pedido da lista cheia, mais lento, chegava por último e apagava o filtro que a pessoa tinha acabado de
escolher. Vermelho primeiro: o caso novo da tela (`a resposta atrasada de um filtro antigo não pinta por cima
da tela`) responde a lista cheia em 90 ms e a filtrada em 5 ms, e acusou `expected <td data-rotulo="Número"
…> to be null` com a linha `#12` de volta. A guarda é um número de pedido em `useRef`: só o mais novo toca
`rows`, `erro` e o spinner. **O mesmo padrão falta em telas que já existiam.** Medido nesta rodada, na página
de procura: `Clients.tsx`, `Products.tsx`, `Finance.tsx`, `CRM.tsx` e `Users.tsx` escrevem `setRows(data)` sem
nenhuma referência a `vivo` ou a número de sequência no arquivo — qualquer um dos pedidos deles pode chegar
fora de ordem; `Sales.tsx`, `Purchases.tsx`, `OrdensDeServico.tsx` e `Audit.tsx` têm guarda `vivo` em pelo
menos um dos pedidos, e conferir um por um é trabalho da F5 (robustez do frontend). Não foram mexidas aqui
porque são fora do escopo desta fase, e a passada nelas fica registrada aqui para não virar caça ao tesouro de
outra rodada.

### N52 — lacuna de escopo fechada na própria rodada: o modal de recebimento não pedia a data

A linha 133 do anexo manda "Marcar como paga (modal pede **data**, forma e observação)". A tela pedia forma e
observação, e o serviço gravava `paidAt = new Date()` — o instante em que alguém abriu o sistema, não o dia em
que o dinheiro entrou. Numa loja que atende sexta e digita segunda, isso empurra receita para o dia errado do
caixa e do relatório. Fechado com teste vermelho antes (`expected '2026-10-13' to be '2026-10-12'` na API,
`Unable to find a label with the text of: Data do recebimento` na tela): `paidAt` é dia de calendário opcional
no `payChargeSchema`; o serviço converte com `meiaNoiteDoDia` no fuso da empresa, recusa com 400 dia que não
existe no calendário e dia que ainda não chegou, grava o mesmo instante na cobrança e no lançamento, e mantém
o `dueDate` do lançamento no dia combinado. O campo nasce com o dia da empresa — lido no fuso cadastrado, não
no relógio do navegador — com esse dia como teto, e o recibo impresso passou a mostrar o **dia** (a hora de um
retroagido sairia "00:00" e seria lida como relógio quebrado). A prova de navegador mede as três pontas: o
padrão do campo, o teto dele e o dia que volta do banco.

### N53 — fonte de verdade fora do repositório: o diretório `.ia/` não existe

O prompt de continuação manda ler primeiro `.ia/REGRAS-DA-IDE.md` e `.ia/PROMPT_MESTRE_PRONTIDAO_PRODUCAO.md`
e mede o ponto de partida no commit `0d80215`. Medido agora, o diretório não está no repositório nem em
`C:/wamp64/www`: `ls .ia` devolve `No such file or directory`, e a busca por `PROMPT_MESTRE` não retorna
arquivo. Os dois textos chegaram colados na conversa pelo dono, e a rodada neles é numerada por tarefas
(T0 a T8), não por subitens. Consequência prática, registrada em vez de improvisada: o contrato exige citar
o número do item do prompt mestre em cada commit e em cada linha de status, e os subitens F4.1 a F4.7,
F5.1 a F5.7 não podem ser citados porque não há arquivo que os sustente — citá-los seria inventar
numeração. A execução desta rodada usa como identificador a tarefa do prompt de continuação (`T1`..`T8`),
o achado já registrado nesta casa (`N...`) e a decisão do dono (`D1`..`D14`). Nada de conteúdo foi
adicionado nem removido por causa disso: quem ler o `docs/STATUS-AJUSTES.md` daqui em diante encontra o
mesmo contrato, só com numeração diferente.

### N54 — a cadeia versionada de migrations não reergue um banco MySQL vazio (FEITO na C1, 2026-10-15)

Medido nesta rodada, com um schema de descarte criado só para isso e apagado no `finally`:
`prisma migrate deploy` contra um banco sem nenhuma tabela encontra as **20 migrations**, aplica
`20261010154418_init_foundation`, e para na segunda com `Error: P3018` — `Database error code: 1826`,
`Duplicate foreign key constraint name 'company_users_user_id_fkey'`, "check the query number 2 from the
migration file". O schema fica com 7 tabelas e a cadeia não continua. A causa é contável no repositório:
**13 das 20 migrations** declaram de novo o mesmo `company_users_company_id_fkey` (e o par com
`user_id`), no formato `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`, que é o molde do Prisma para
banco novo. Em PostgreSQL o nome da constraint é por tabela; em MySQL é **por banco** — então a primeira
migration já criou a constraint, e a segunda não consegue criar uma com o mesmo nome.

Por que isso importa fora do curiosidade: a F8 exige "clone limpo reproduzível", e o caminho publicado no
`README.md` era `npm run db:migrate`. Ele não funciona num MySQL zerado hoje. Também é o motivo pelo qual o
banco de prova da decisão D6 nasceu de `prisma db push --skip-generate` com as vinte migrations marcadas
como aplicadas (`migrate resolve --applied`) — ver `docs/adr/0010-banco-de-prova-separado.md`, item 5.

Re-medido na rodada do README, agora com a cadeia inteira: **23 migrations**, e o `migrate dev` de um clone
novo contra o banco `nexusbusinessmanager_clone` zerado para exatamente no mesmo ponto — `P3006` envolvendo
`P3018`, `Database error code: 1826`, `Duplicate foreign key constraint name 'company_users_user_id_fkey'`,
em `20261010164015_add_clients`. O README deixou de publicar esse caminho: a porta de entrada de um banco
zerado passou a ser `npm run db:push` (script novo na raiz e no `@nexus/api`, que é o mesmo `db push` que a
casa já usa no banco de prova e no job do container), rodada no clone com saída real: estrutura montada,
seed verde, API e Vite no ar, login da conta de desenvolvimento respondendo pelo proxy. Nada aqui fecha o
achado — o fechamento continua sendo o trabalho da T7, com ADR próprio.

O fechamento não foi improvisado aqui por duas razões. A primeira: a §5 do contrato proíbe editar migration
já aplicada, e qualquer remendo na cadeia existente é exatamente isso. A segunda: a tarefa que pede o clone
limpo é a T7, e a decisão de *como* reescrever a cadeia (baseline única, migrations idempotentes com
`DROP FOREIGN KEY` antes de criar, ou caminho de bootstrap separado documentado) merece ADR próprio com a
medição de antes e depois. Fica registrado aqui para a T7 não descobrir isso no escuro.

**Fechado na C1 (2026-10-15).** O histórico recomeçou com um baseline único
(`prisma/migrations/20261015000000_baseline/migration.sql`), gerado por
`prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` (828 linhas,
35 CREATE TABLE). As 23 migrations antigas foram movidas para `docs/legado/migrations-antigas/` — o
conteúdo fica no repositório para consulta histórica, sem participar do deploy. Em banco vazio separado
(`nexusbusinessmanager_c1empty`), `migrate deploy` aplicou o baseline e saiu com código 0; a deriva foi
conferida com `migrate diff --from-migrations ... --exit-code` e devolveu 0. O ADR da decisão está em
[`docs/adr/0024-baseline-de-migrations.md`](adr/0024-baseline-de-migrations.md). O fallback de `db push`
foi removido de `deploy/preparar-banco-de-dados.cjs` e `tools/preparar-banco-de-prova.cjs`; `db:push`
continua na lista de scripts como atalho de desenvolvimento.

### N55 — fechado na T1: as provas de navegador escreviam no banco de desenvolvimento

O §4 do contrato diz que teste e prova nunca usam o banco de desenvolvimento. Medido nesta rodada, no banco
de desenvolvimento: **45 empresas, das quais 42 com o nome do padrão dos helpers de teste**
(`Empresa-<epoch>-<n>-<rand>`), duas casas de demonstração (`Nexus Demo`, `Demonstracao (minha empresa)`) e
uma com nome digitado (`Eliane Eli (minha empresa)`, 2026-10-11) — está feita a investigação de origem que a
D6 pedia, e nada foi apagado dessas linhas. Somado a isso, a prova de ordens de serviço deixou uma linha
órfã no banco errado: usuário "Tecnico de Prova", criado às 20:40:09 de 2026-10-13, sem vínculo, sem sessão,
sem auditoria e sem ordem. Ela apareceu porque a prova abriu o próprio `PrismaClient` lendo o `.env` de
desenvolvimento enquanto a API já respondia pelo banco de prova, e a escrita falhou com
`P2003 Foreign key constraint violated on the fields: (company_id)` — ou seja, a linha nasceu de um erro, e
o erro só existia por causa do endereço errado.

Tratamento, na ordem do contrato: listar antes (`id`, nome, data e as cinco relações conferidas, todas em
zero), fazer o backup do banco inteiro para fora do repositório antes de qualquer limpeza
(`mysqldump` em `C:/Users/<usuario>/backups-nexus/`, ~14 MB, nunca no git), apagar a linha única e medir o
antes e depois (`usuarios antes: 542 | depois: 541`).

Fechamento técnico: `tools/banco-de-prova.cjs` passou a ser a única porta de entrada do banco nas provas —
`clienteDoBancoDeProva()` para as sete que escrevem direto, `conferirServidorDeProva()` nas trinta que
escrevem pela API; os dois carregamentos do `.env` de desenvolvimento que existiam nesses arquivos foram
apagados; `apps/api/vitest.config.ts` injeta o endereço de prova e se recusa a rodar sem ele. Prova de que
fechou, medida nesta rodada: a suíte inteira e duas provas de navegador (`verify-ordens-de-servico.cjs`,
103 checagens com 0 falhas, e `verify-notificacoes.cjs`, 85 checagens com 0 falhas) rodaram com o banco de
desenvolvimento **idêntico tabela por tabela antes e depois** (`diff` das duas medições sem saída), enquanto
o banco de prova crescia (+5 sessões, +17 linhas de auditoria, +4 movimentações de estoque).

Parte do achado que fica em aberto, registrada em vez de escondida: entre 20:30 e 20:34 o banco de
desenvolvimento ganhou duas sessões e quatro linhas de auditoria de logins reais da conta
"Administrador Nexus". **NÃO VERIFICADO** quem foi: as ferramentas rodadas nesta sessão não respondem por
eles, e a linha não foi tocada.

### N56 — corrigido na T2: a documentação sobreviveu à separação dos bancos mandando escrever no banco errado

A T1 moveu a suíte e as provas para `nexusbusinessmanager_teste`, mas deixou para trás três frases do README
que diziam o contrário do código: "Os números que aparecem nas telas saíram do banco local de desenvolvimento"
(hoje as provas que regravam as imagens só sobem contra o banco de prova, conferido pelo login), "rode a suíte
(`npm test`) contra o banco de desenvolvimento: os testes escrevem de verdade" — exatamente a regra que a
decisão D6 apagou — e as duas contagens publicadas (o selo "427 testes em 47 arquivos" e a linha
`npm test # api: 37 arquivos · 350 testes`), que já estavam velhas antes desta rodada: a suíte da T1 media
38 arquivos / 354 casos. Corrigidas com a medição na mão: **39 arquivos / 361 casos** na API e **10 / 79** no
jsdom, 440 testes em 49 arquivos. Achado de documentação, não de código: quem lesse o README ia fazer a prova
escrever no banco de quem está trabalhando, que é o acidente que a T1 existiu para impedir.

## Adenda da execução — T3 (F4: autenticação reforçada — D1, D2, D3) encerrada — 2026-10-13

O que entrou, em uma frase cada: a porta de e-mail com adaptador SMTP genérico, de console e de caixa de
memória (D1); verificação de cadastro atrás de `REQUIRE_EMAIL_VERIFICATION`, obrigatória em produção (D2);
segundo fator TOTP com segredo cifrado em repouso, códigos de recuperação como hash, obrigatório para papel de
plataforma e OWNER em produção, e bloqueio por conta sem diferença mensurável (D3); destino pós-login só para
caminho desta casa; e a guarda da janela de corrida entre duas abas. As dez decisões estão em
`docs/adr/0013-reforco-de-autenticacao-smtp-verificacao-e-totp.md`, e a migration é aditiva
(`20261013040000_reforco_de_autenticacao`: três colunas em `users` — `email_verified_at`,
`totp_secret_ciphertext` e `totp_enabled_at` — mais três tabelas novas, `email_verification_tokens`,
`recovery_codes` e `login_attempts` — com o bloco `-- Reversão:` escrito dentro).

Medição da rodada, no banco de prova (D6), na árvore final: **API 46 arquivos / 434 casos** e
**web 12 arquivos / 87 casos**, zero falha e zero skip — saída guardada e conferida nesta passada: o portão de
`npm test` mediu **447,05 s** (API) e **10,26 s** (web), e a corrida de cobertura do web, **15,39 s**. A
duração da corrida de cobertura da API (**500,83 s**) foi lida no terminal daquela corrida, e a saída não foi
guardada em arquivo, então ela não pode ser re-derivada agora; o que sustenta os percentuais da API é o
`apps/api/coverage/lcov.info` que ficou no disco (87,79% de instruções, 76,01% de ramificações, 87,30% de
funções, 90,62% de linhas, somados arquivo por arquivo por script de bancada). Os dois conjuntos de números
estão em `docs/ESTADO-ATUAL.md` §8 e na tabela de portões da T3 em `docs/STATUS-AJUSTES.md`. A matriz de rotas recontada pela régua da
regra 4 de `isolamento-rotas.test.ts` (o mesmo `grep` do teste, rodado à parte): **129** rotas de negócio em
**19** arquivos — eram 120 na F3.2 Parte 2 —, com **13** públicas declaradas uma a uma (as duas de
verificação e a de desafio do segundo fator entraram na lista), **2** rotas de etapa (`/auth/2fa/setup` e
`/auth/2fa/activate`, que atravessam o gate com token de etapa e não são abertas), **8** de conta e **116**
não públicas varridas anonimamente. `npm audit` continua em **3 high** (B1, o mesmo caminho
`deepmerge-ts` → `@prisma/config` → `prisma`, nenhuma versão corrigida dentro do 6.19); `npm ls otpauth
nodemailer` devolve as duas como folhas, sem transitivo.

### N57 — corrigido nesta rodada: a janela de corrida de dez segundos reabria uma sessão que a troca de senha já tinha encerrado

A janela existe para um caso legítimo: duas abas renovando quase juntas, em que a segunda chega com o token
que a primeira acabou de girar. Dentro de dez segundos ela era atendida sem questionar, e aí morava o buraco
— a revogação por decisão (trocar a senha, recuperar a senha, logout, administrador encerrando sessão) escreve
`revokedAt` só nos tokens **vivos**, e o pai rotacionado já estava revogado pela própria rotação. Resultado:
reapresentar o pai dentro da janela, depois de trocar a senha, **mintava uma sessão nova** pela porta da
conveniência. O `test/settings.test.ts` ("trocar a senha derruba todas as sessões abertas") caiu com
`expected 200 to be 401`; foi o vermelho que achou a regressão — antes da T3 a janela não existia e aquele
teste passava.

Vermelho mostrado antes da correção, medido nesta rodada: os dois casos novos de
`apps/api/test/corrida-de-abas.test.ts` caíram em `:310` e `:328` com `expected 200 to be 401` — a troca de
senha e o logout da aba que girou o token.

Correção na implementação, e não no teste: antes de aceitar pela janela, `refresh()` conta a **linhagem viva**
(`refreshToken.count` do usuário com `revokedAt: null` e `createdAt >= usedAt` do pai). Zero filhos vivos
significa que uma decisão derrubou a família inteira, e o caminho cai no mesmo ramo do reuso — 401,
`auth.refresh_reuse`, nenhuma sessão em pé. Nenhuma asserção herdada foi tocada: `seguranca.test.ts`,
`settings.test.ts` e `guardas-herdadas.test.ts` passaram com os mesmos números, só com o passo de atrasar a
rotação (`atrasarRotacao`) para tirar o caso da corrida legítima. Verde medido: 53 casos nos quatro arquivos
rápidos e 30 nos dois que cobrem as guardas herdadas.

### N58 — corrigido na T5.3: a entrega de e-mail esperava dentro do request HTTP

Os três envios reais eram `await mailer().enviar(...)` chamados de dentro do handler
(`auth.service.ts`, `verificacao.service.ts`, `segundo-fator.service.ts`). A regra 2 do desenho do G1 pedia
fila ("nenhum request HTTP fica esperando provedor de e-mail"); a porta de então não tinha fila, não tinha
re-tentativa e não tinha recuo, e o `nodemailer` do `smtp.ts` rodava com `connectionTimeout`,
`greetingTimeout`, `socketTimeout` e `dnsTimeout` nos padrões dele. Um SMTP que aceita a conexão e demora para
entregar segura a requisição — e no caso da verificação de cadastro, a pessoa está olhando para uma tela de
"criando sua conta". O erro é tratado (vira auditoria `*_entrega_falhou` e a resposta HTTP não muda), então o
risco é de tempo e de fila de conexões, não de consistência.

Não foi corrigido em silêncio por escopo: a D1 pedia "entrega funcionando e código fora da resposta", e isso
está entregue e provado. A assincronização mexe no ciclo de vida do request e pertence à fase de operação
(**T5 / F6**), junto do `docs/PRODUCAO.md` que vai dizer qual SMTP apontar. Registrado aqui para a T5 não
descobrir isso no escuro, do mesmo jeito que o N54 ficou registrado para a T7.

**Correção (T5.3, 2026-10-14).** Vermelho medido antes: com um entregador de 250 ms injetado no lugar do SMTP,
o `POST /api/auth/forgot-password` respondeu em **320 ms** (`expected 320 to be less than 250`). Depois, com a
mesma injeção e o atraso de prova já em 600 ms: **7,43 ms** (o `responseTime` do pino na corrida que fechou o
arquivo verde), e no instante da resposta a caixa do entregador estava vazia com uma mensagem viva na
fila (`vivas: 1`). O que existe agora é `apps/api/src/lib/mail/fila.ts` — fila de memória do processo,
consumidor único, FIFO, três tentativas com recuo exponencial, teto por tentativa e teto de tamanho, com a
auditoria de falha carimbada pelo worker depois da última tentativa (uma linha, com a contagem). Os handlers
passaram a chamar `enfileirarMail(...)`, e o desligue do servidor drena a fila antes de fechar. As quatro
chaves (`MAIL_TENTATIVAS`, `MAIL_BACKOFF_BASE_MS`, `MAIL_TIMEOUT_MS`, `MAIL_FILA_MAXIMA`) têm padrão no código,
nenhuma é obrigatória, e a régua de produção não mudou. O porquê de a fila não ser persistida no banco, e o que
isso custa, está em `docs/adr/0020-entrega-de-email-por-fila-de-memoria.md`; a operação lê o resto em
`docs/PRODUCAO.md` seção 10. Verde medido: 5 casos novos em `test/fila-de-mail.test.ts`, e os quatro arquivos
que leem caixa de e-mail (`recuperacao-por-email`, `verificacao-de-email`, `segundo-fator`, `guardas-herdadas`)
ganharam dreno sem perder nenhuma asserção.

Dois erros registrados aqui porque a linha existe para isso. O primeiro é **meu, não do código**: esta linha
da auditoria citava `dataTimeout` entre os tempos do nodemailer, e esse nome não existe nos tipos da
biblioteca 10.1.0 — a tentativa de usá-lo deu `TS2769`, e o `.env.example` tinha repetido o nome errado. Os
quatro tempos reais (`connectionTimeout`, `greetingTimeout`, `socketTimeout`, `dnsTimeout`) foram conferidos em
`node_modules/nodemailer/dist/cjs/smtp-connection/index.d.ts` e são os que o transporte declara agora. O
segundo é de medição, e virou regra de teste: o primeiro request do processo carrega um custo frio que não é da
fila (medido em 1 269 ms de `responseTime` numa corrida e 1 708 ms em `makeAccount` em outra, com o mesmo
caminho de e-mail já drenado), então o caso de tempo aquece a rota antes de medir e o atraso de prova subiu para
600 ms — com 250 ms um soluço do Windows (259 ms observado) é indistinguível de "o request pagou o provedor".

### N59 — corrigido na T5.4: o sino e o relatório diário continuavam sem chamador de e-mail, e uma frase da tela estava errada

Depois da T3 existem exatamente três caminhos que chamam o mailer, e nenhum deles é de produto comercial:
recuperação de senha, verificação de cadastro e aviso de que o segundo fator foi ligado. relatório diário
(`cron.handlers.ts:94`) e as notificações (`notifications.service.ts:19`) carregam a anotação antiga — "sem
SMTP não há e-mail" — e não importam o mailer. Nada foi ligado por conta própria: escrever o e-mail do
relatório diário é escolher assunto, corpo, frequência e a caixa de quem recebe, e a D1 não autoriza nada
disso.
O G1 em `docs/decisoes/G1-envio-de-email.md` passou a **PARCIALMENTE FECHADO** por causa desta linha, com o
que falta escrito lá.

O achado fino: a tela de notificações mostra o quadro "E-mail" **desabilitado** com a frase "Indisponível: não
há servidor de e-mail (SMTP) configurado nesta instalação" (`Notifications.tsx:396`). Até a T3 a frase era
verdade por construção — não existia SMTP nenhum. Agora existe, escolhida por ambiente, então a instalação
pode ter SMTP configurado e a frase continuar afirmando que não há, com a caixa cinza. É um caso pequeno de
verdade de interface, e é trabalho da **T5** ligá-la ao estado real do `MAIL_TRANSPORT`, não a um `disabled`
fixo.

**Correção (T5.4, 2026-10-14).** Vermelho medido antes, nos dois lados: `apps/api/test/avisos-por-email.test.ts`
**6 failed | 2 passed (8)** — com `expected [] to have a length of 1 but got +0` três vezes,
`expected undefined to be 1`, `TypeError: Cannot read properties of undefined (reading 'disponivel')` e
`expected '11 empresas fechadas · 1 aviso' to match /· \d+ e-mails?/` — e
`apps/web/src/test/avisos-por-email.test.tsx` **3 failed | 1 passed (4)**, com `expected true to be false` duas
vezes (o `disabled` e o `checked` que a tela de hoje escreve em pedra). Verde depois: **8 passed (8)** e
**4 passed (4)**. As duas suítes completas fecharam verdes no banco de prova, medidas depois da mudança:
`apps/api` **49 arquivos / 450 casos** (314 s, código de saída 0) e `apps/web` **19 arquivos / 144 casos**.

O que existe agora, em ordem de grandeza:

1. **o aviso do sino manda cópia por e-mail** (`notificarDetalhado`, em `notifications.service.ts`): primeiro a
   linha do sino nasce, depois a mensagem entra na fila da T5.3, e o assunto é exatamente o título gravado — sino,
   tela e e-mail descrevem o mesmo aviso. Uma pré-consulta de `dedupeKey` antes da escrita é o que garante que o
   e-mail só existe para linha **nova**, porque `createMany({ skipDuplicates: true })` não devolve quais eram
   velhas;
2. **o relatório diário e as duas varreduras têm chamador** (`cron.handlers.ts`): os três handlers passaram a
   `notificarDetalhado`/`varreduraGlobal`, e a coluna "última execução" fecha com `· N e-mail(s)`;
3. **o portão é o que o entregador afirma** (`entregaDeVerdade`, campo **opcional** de `MailerPort`, com
   `estadoDoCanalDeEmail()` por cima): SMTP afirma, console e fake negam com motivo. A ausência significa "não
   afirma", e é por isso que o padrão do contrato é a ausência — um adaptador escrito amanhã já nasce do lado
   seguro;
4. **a rota de preferências devolve `email: { disponivel, transporte, motivo }`**, e `POST /notifications/scan`
   devolve `{ criadas, emails }` (a auditoria `notification.scan` grava os dois);
5. **a tela obedece ao estado**: `disabled={!email.disponivel}`, com o motivo ou o transporte na dica. A caixa
   continua **marcada** quando a pessoa pediu e-mail numa instalação sem SMTP, porque desmarcar por dentro faria
   o próximo clique em "Salvar" jogar fora uma intenção gravada no banco;
6. **falha de entrega é uma linha de auditoria** (`notification.entrega_falhou`, com `mascaraEndereco()`), e
   sucesso não é nenhuma — um aviso por venda encheria a trilha de eventos que não mudam nada.

Provas do portão, não só do caminho feliz: o caso 5 da API amarra "sino desligado + e-mail ligado = nenhuma
mensagem" (o que fecha a porta do spam diário da varredura), o caso 6 prova que um entregador que não afirma
entrega **não recebe mensagem nenhuma** e que a mesma rota devolve o contrário com um entregador que afirma, e o
caso 4 prova os dois contadores na mesma varredura (`criadas: 2`, `emails: 1`) e o zero na segunda rodada.
Decisão e preço em `docs/adr/0021-o-email-e-copia-do-aviso-do-sino.md`; operação na seção 10 de
`docs/PRODUCAO.md`. Dois achados nasceram deste trabalho e estão registrados logo abaixo (**N75**, **N76**) em
vez de corrigidos de graça.

### N60 — resíduo aceito, e por isso registrado: o bloqueio por conta é uma negação de serviço de quinze minutos contra endereço conhecido

A regra que a D3 pediu — "bloqueio com sem diferença mensurável" — foi cumprida: cinco falhas em quinze minutos
trancam por quinze minutos, a contagem mora em `login_attempts` chaveada pelo endereço em minúsculas (sem FK,
sem coluna em `users`), existe linha para endereço que não é de ninguém, e o `HASH_DE_ISCACAO` faz o e-mail
inexistente custar o mesmo tempo de bcrypt que o existente. Essa é a metade defensiva.

A outra metade é inerente ao desenho e ninguém a escreveu em lugar nenhum até agora: quem conhece o endereço de
uma pessoa pode **trancá-la fora de conta dela** com cinco senhas chutadas, e a conta volta sozinha em quinze
minutos. Mitigações que já existem no código: a janela vence com o tempo (`estaTrancada` confere
`lastFailedAt`, não só `lockedUntil`), entrar apaga a contagem, e um `reset-password` bem-sucedido limpa o
bloqueio (`auth.service.ts:671`) — quem tem a caixa postal se livra do ataque sem pedir suporte. O rate-limit
de 10/min por IP (`auth.routes.ts:47`) limita o atacante disperso, não o insistente. É um troca consciente
entre "não vaza quais endereços existem" e "não tranca quem não atacou nada", e a decisão da casa foi a
primeira; precisa constar em `SECURITY.md` (**T6 / F7**) em vez de viver só nesta adenda.

### N61 — corrigido na T5.5: a porta administrativa de confirmação existe, e é da plataforma

A única escrita em `users.email_verified_at` é `confirmarEmail()` (`verificacao.service.ts:118`), disparada
pelo clique no link ou pelo código digitado na tela pública. Medido por grep em `apps/api/src`: nenhum
endpoint, nenhuma rota de plataforma, nenhum script de linha de comando marca a coluna. Enquanto a flag
`REQUIRE_EMAIL_VERIFICATION` estava desligada isto era irrelevante; com a D2 ela é obrigatória em produção, e
o cenário passa a ser real — SMTP que não responde no momento do cadastro (`auth.verificacao_entrega_falhou`
na auditoria), pessoa sem link, sem confirmação, sem painel, e suporte sem botão. A saída operacional hoje é
escrever no banco à mão, que é exatamente o que um runbook existe para evitar.

Fica para a **T5 / F6** com uma decisão de desenho (CLI `npm run` com o mesmo padrão do `admin:criar`, ou rota
de plataforma com auditoria e `assertPlatformAdmin`), registrada aqui em vez de improvisada nesta rodada: o
escopo da T3 era a autenticação, e abrir uma porta de escrita em coluna de identidade sem ela ter sido pedida
seria a maior mudança da rodada — e a mais arriscada — feita às escondidas.

**Fechado na T5.5 (2026-10-14) pela segunda das duas saídas previstas aqui — rota de plataforma com auditoria e
`assertPlatformAdmin`.** `apps/api/src/modules/platform-accounts/` traz `GET
/api/plataforma/contas/sem-confirmacao` (quem espera, com endereço, situação, quantas empresas serve, da conta
mais antiga para a mais nova, busca pelo nome ou pelo endereço) e `POST
/api/plataforma/contas/:userId/confirmar-email` (marca a coluna e gasta, na mesma transação, todo link de
verificação ainda vivo daquela conta). ACLI foi recusada porque suporte não se faz de terminal e a fila
continuaria invisível; o ADMIN de empresa foi recusado porque confirmar endereço é afirmar identidade — a
decisão e as alternativas estão em `docs/adr/0022-a-porta-de-plataforma-que-confirma-um-endereco.md`. O evento
`admin.email_confirmado` nasce na trilha da plataforma (`companyId` nulo por construção, empresa da sessão só em
`metadata.empresaDaSessao`) com o endereço mascarado por `mascaraEndereco()`, e o motivo, opcional no contrato, é
obrigatório na tela — sem motivo escrito a rota não é chamada nenhuma vez. A tela `/app/plataforma-contas` tem o
painel que diz o que a fila não é: confirmar aqui não prova que a pessoa leu mensagem nenhuma. Repetir a
confirmação devolve `alterado: false` e não escreve nem audita nada de novo. O que o fechamento deste achado
revelou no caminho é o **N78** abaixo, e a linha de baixo da superfície muda com ele: **129 → 131 rotas** em 20
arquivos `*.routes.ts`, com 15 → 17 rotas de plataforma.

### N62 — aberto: as duas telas novas da F4 não têm uma linha de teste, e a medição mostra isso

A suíte de navegador cobriu o contrato inteiro da rodada pelo lado da API (46 arquivos / 434 casos) e pelo
`Login.tsx` (71,92% de instruções, com as quatro etapas exercitadas em `src/test/login-com-segundo-fator.test.tsx`,
4 casos). As duas telas que nasceram com a D2 e a D3 ficaram de fora, e a cobertura medida nesta rodada diz isso
com número: `src/pages/VerificarEmail.tsx` **0%** (linhas 25-115 sem instrução), `src/components/settings/SegundoFatorPanel.tsx`
**0%** (28-180), `src/lib/verificacao.ts` **0%** (13-20) e `src/lib/segundoFator.ts` **42,85%** (74-90 de fora).
Ou seja, o painel de segurança que liga e desliga o TOTP, a página pública que recebe o código de seis dígitos e
o cliente que chama `resend-verification` nunca foram montados num jsdom, e nenhuma prova de navegador os abriu.

Por que isso é um achado e não uma nota de rodapé: as três telas são o caminho pelo qual uma pessoa **não
confirmada** sai do estado em que a D2 a deixou. Com `REQUIRE_EMAIL_VERIFICATION` ligado em produção, um erro
nela não é cosmético — é uma conta legítima trancada fora do painel sem recourse, exatamente o cenário que a N61
descreve. O risco é menor do que parece só porque a API por trás delas está coberta: os cinco endpoints de
verificação e os seis de segundo fator têm teste de contrato, e a tela é uma casca fina sobre eles.

Não foi fechado aqui por escopo, e a escolha está registrada em vez de escondida: a rodada tinha como produto a
autenticação reforçada, e cada tela nova que entra sem teste é dívida que a casa já reconheceu no padrão das
outras (Settings, Users, Finance e mais dezoito arquivos em zero na mesma tabela). Fica para a **T4 / F5**, que é
a tarefa de robustez do frontend e já devia recapturar as telas: `VerificarEmail.tsx` e `SegundoFatorPanel.tsx`
entram na lista dela com teste de componente e prova de navegador, e a linha 74-90 do `segundoFator.ts` (o ramo
de erro do cliente) junto. Até lá, `docs/ESTADO-ATUAL.md` §1 item 9, §8 (bullet do web) e §10 (P17) carregam a
mesma medição, para ninguém ler "F4 feita" como "autenticação testada de ponta a ponta no navegador".

### N63 — corrigido na T4.9: acessibilidade mínima não tinha régua nenhuma no repositório

O item 7 da F5 pede cinco coisas medidas — rótulo, foco visível, navegação por teclado, `prefers-reduced-motion`
e alvo de toque de 44 px — e nenhuma delas tinha instrumento. Havia layout responsivo (`verify-responsive.cjs`);
contraste só veio a ter nesta rodada, com `tools/audit-contraste-painel.cjs`, escrito aqui para a dupla chave do
N7 poder ser conferida na tela e não no fonte. "A tela é operável sem mouse" nunca tinha sido afirmado com
número em lugar algum.

A régua agora é `tools/verify-acessibilidade.cjs`: **22 verificações, 0 falhas** no navegador real, varrendo as
telas públicas e as dezessete linhas da barra. O que ela mede, medido na última corrida: **649 controles**
montados, **0** sem rótulo acessível e **0** sustentados só por `placeholder` ou `title`; **68** paradas de `Tab`
com **0** sem anel de foco visível; alvo de toque em janela de 360 px com **0** controles principais abaixo de
44 px; mesma varredura em 1440 px com a régua AA de 24 px, **0** abaixo; teclado sem mouse (abrir o menu com
`Enter`, fechar a gaveta com `Escape`, percorrer abas, abrir e fechar diálogo); e `prefers-reduced-motion` com
**0** elementos ainda em animação na vitrine e **0** no painel. O piso de 44 px entrou no CSS em
`components.css` dentro de `@media (max-width: 820px), (pointer: coarse)` — o `pointer: coarse` é o que pega
notebook com tela de toque em janela larga — e as linhas de ação ganharam permissão de quebrar para dois botões
de 44 px não estourarem os 360 px.

### N64 — corrigido na T4.9: a régua nova mediu o vazio nas três primeiras corridas, e isto é achado porque o resultado era "ok"

Vale registrar porque o erro não era de código de produto, era de instrumento, e o instrumento é o que a casa usa
para dizer a verdade. Três vezes a prova devolveu verde sem ter medido:

1. A janela de 360 px era obtida com `setViewport` numa página montada em 1440 px. O `initialView` do
   FullCalendar é decidido na montagem, então a grade do mês continuava sendo grade do mês dentro de uma janela
   de celular, e o caminho "no celular vira lista" nunca foi exercitado. Corrigido re-navegando depois de
   trocar o viewport.
2. A lista de controles grandes (`alvosGrandes`) não tinha filtro de tamanho. As seis pílulas de 39x25 px da
   grade apareciam cobrindo a si mesmas — "6 cobertas pela lista" era autofagia, não exceção do critério 2.5.8.
   Corrigido filtrando por largura e altura >= 44 px antes de comparar.
3. `dentroDeTexto()` classificava como prosa todo `<a>` sem classe dentro de `<li>`/`<td>`, e a linha da lista
   do FullCalendar é exatamente um `<a>` sem classe dentro de `<td>`: as linhas de 144x44 px estavam invisíveis
   para a prova. Corrigido exigindo texto sobrando na caixa, além do texto do próprio link.

Junto disso a prova deixou de poder medir uma grade vazia: ela cria um compromisso próprio pelo contrato público
da Agenda (`POST /api/agenda/events`), mede, e apaga no fim, imprimindo a contagem antes e depois
(`6 -> 7` e `7 -> 6`, zero sobra). Sem essa dádiva própria, um mês sem evento faria a checagem da grade passar
sem olhar nada.

### N65 — corrigido na T5.0: a pilha de prova tem porta própria, e a 3001/5173 deixa de ser disputada

As duas janelas que ocupam a porta 3001 (`npm run dev:api` e `npm run dev:api:teste`) não podem rodar juntas, e
o Vite de 5173 aponta para a 3001 sem saber qual das duas está lá. Como `tools/senha-admin.cjs` resolve primeiro
a conta de prova (`tools/prova-admin.local.json`), quem abre a tela com o servidor de prova ligado e digita a
conta desta máquina recebe HTTP 401 mudo — medido nesta rodada, foi o primeiro diagnóstico do "admin não está
logando". O produto não tem culpa nenhuma: é topologia de desenvolvimento.

Mitigação feita aqui: `tools/servidor-de-prova.cjs` passou a imprimir, ao subir, um aviso dizendo que o
navegador daquela janela fala com o banco de prova, que a conta de administrador desta máquina não existe nele,
e qual comando usar para voltar. O que continua aberto é a conveniência — as duas janelas ainda disputam a
mesma porta, e nada devolve a 3001 ao servidor de desenvolvimento sozinho quando a prova termina.

Aconteceu de novo nesta rodada, e agora com as três medidas na mão. Às 16:58:52 a conta raiz foi digitada na tela
e o banco de prova registrou `login_attempts` com `failures=1` — no banco de desenvolvimento a mesma conta está
`active=true`, `platformRole=SUPER_ADMIN`, com 37 vínculos `OWNER` sobre 37 empresas ativas e nenhuma trava; ela
simplesmente **não existe** no banco de prova. A causa é a topologia: o servidor de prova tinha tomado a 3001, o
Vite da 5173 aponta para a 3001, e o 401 que a pessoa viu não dizia nada disso. Devolver a porta ao
`npm run dev` resolveu na hora, e a entrada da conta raiz foi reprovada no navegador logo depois — **6
verificações, 0 falhas**, com o painel montando 35 blocos de conteúdo sob o cabeçalho "Olá, Administrador".

O que muda o diagnóstico de "aviso" para "não acontece mais" é a separação de portas, e ela foi promovida para a
primeira tarefa da **T5 / F6** (operação): o servidor de prova passa a subir a API na 3002 e o Vite de prova na
5174, escrevendo um arquivo-ponteiro local ignorado pelo git que as ferramentas de navegador lêem para escolher
a base. Assim a janela 3001/5173 do dono nunca é tocada por prova nenhuma, e a regra de acesso deixa de depender
de alguém lembrar de devolver a porta.

Foi feito na T5.0, e medido. `tools/servidor-de-prova.cjs` agora levanta os dois lados da prova — API na
**3002** e Vite na **5174**, proxy apontando para a 3002 — sob o nome `npm run dev:prova` (o antigo
`dev:api:teste` continua apontando para o mesmo comando), publica `tools/ponteiro-de-prova.local.json`
enquanto está de pé, e as 36 ferramentas de navegador passaram a resolver as duas pontas por
`tools/pilha-de-prova.cjs` (ambiente → ponteiro vivo → casa real). Medida da convivência, com as duas
janelas abertas: 3001 (pid 18816) e 3002 (14500) escutando juntas, 5173 (18972) e 5174 (17192) também, e
`/api/health` devolvendo 200 nas duas. A pilha recusa porta ocupada em vez de subir em outra: a segunda
tentativa devolveu `precisa das portas 3002 (api) e 5174 (navegador) livres, e 3002 e 5174 esta(o)
ocupada(s)` com saída 1. O ponteiro morto não leva ninguém a lugar nenhum: derrubada a árvore da prova à
força, `lePonteiro()` devolveu `null` e as ferramentas voltaram sozinhas para 5173/3001, que é onde o dono
está — a régua `tools/verify-pilha-de-prova.cjs` mede os quatro casos e a varredura das ferramentas, e foi
escrita vermelha antes de verde: **36 falhas em 39 verificações** contra a árvore antiga, **8 verificações e
0 falhas** contra a nova. A prova de navegador refeita contra a pilha: `tools/verify-sidebar.cjs` com
**104 checagens, 0 falhas**, primeira linha do log dizendo `PILHA DE PROVA (banco
nexusbusinessmanager_teste)`. E o banco do dono continuou intocado enquanto isso: fotografia de leitura pura
em **35 tabelas / 70.897 linhas**, o mesmo número do fecho da T4, com a conta raiz ainda `active=true`,
`platformRole=SUPER_ADMIN`, 37 vínculos `OWNER` e nenhum registro de bloqueio. Detalhe que a mudança expôs:
com a pilha no ar, a mesma prova regrava três capturas canônicas com o dado do banco de prova — agora as
capturas de corrida vão para `docs/screenshots-prova/`, ignorada pelo git, e `docs/screenshots/` ficou com
zero arquivos alterados. ADR-0017.

### N66 — corrigido na T4.10: `npm run dev` não existia na raiz

O comando que qualquer pessoa digita ao clonar a casa devolvia `npm ERR! Missing script: "dev"`, porque o
monorepo só expunha `dev:api` e `dev:web`. Agora `package.json` da raiz tem `dev` apontando para
`tools/dev.cjs`, que levanta os dois lados na mesma janela, prefixa cada linha com `[api]` ou `[web]`, mostra o
endereço de cada um, avisa que aquele caminho usa o banco de desenvolvimento e derruba os dois no `Ctrl+C`.

A primeira versão chamava o `npm.cmd` do Windows por `spawn` e morreu na hora com `spawn EINVAL` — desde o
reforço do Node contra o CVE-2024-27980, um `.cmd` do Windows não sobe sem `shell`. Em vez de abrir um `cmd.exe`
no meio do caminho (o que deixaria o processo que escuta a porta órfão no `Ctrl+C`), a ferramenta lança os dois
binários com o mesmo `process.execPath`: `tsx watch src/server.ts` e `vite`, resolvidos na árvore de
`node_modules` e com recusa clara pedindo `npm install` se algum dia faltarem. Medido na máquina: `GET
/api/health` devolve 200, a 5173 devolve 200, e o login do administrador desta máquina no banco de
desenvolvimento devolve HTTP 200 com `accessToken` e `refreshToken` — nenhum valor de segredo impresso em lugar
algum.

# Adenda da execução — T5.1 (F6: Docker, compose com a porta do banco fechada) encerrada — 2026-10-14

A F6 abriu com a topologia de prova (T5.0, N65) e continuou com a topologia de instalação: `Dockerfile.api`,
`Dockerfile.web`, `docker-compose.yml`, `.dockerignore`, `deploy/nginx-painel.conf`,
`deploy/preparar-banco-de-dados.cjs`, `.env.docker.example`, `tools/verify-docker.cjs` e os sete comandos
`npm run docker:*` na raiz. A regra que a tarefa veio escrever é uma só, e ela foi conferida no host: **quem
instala o produto expõe uma porta, e não é a do banco**. Medido com a pilha de pé — `docker port` do `mysql`,
da `api` e do `migracoes` devolve vazio, e o do `web` devolve `80/tcp -> 0.0.0.0:8080`; `netstat -ano` mostra
um único `0.0.0.0:3306` na máquina, com o PID 4296 que já estava lá antes de qualquer container existir (o
MySQL do WAMP), e as portas do dono na mesma: 3001 com o PID 18816, 5173 com o PID 18972. A trilha que o
navegador faz é `painel → nginx → api → mysql` dentro da rede do compose, e a régua nova bate nela pela única
porta publicada: `29 verificações, 0 falhas`, código de saída 0, com a metade B inconclusiva (código 2, com a
frase `NAO VERIFICADO`) quando a pilha não está de pé — ela não fecha verde pela metade.

O resto é achado, e a maioria nasceu do próprio caminho de subida.

### N67 — corrigido nesta rodada: o caminho de entrada da API era um arquivo que o compilador nunca produziu

`apps/api/package.json` declarava `main` e `start` em `dist/server.js`. O `tsconfig.json` da API tem
`rootDir: "."` e inclui `src`, `prisma/seed.ts` e `test`, então o `tsc` despeja a saída em `dist/src/`, e o
arquivo apontado não existe. Medido antes do conserto, dentro da imagem recém-compilada:
`node apps/api/dist/server.js` devolve `MODULE_NOT_FOUND`. Ninguém tinha visto porque a casa sempre rodou a API
por `tsx src/server.ts` — o `start` de produção nunca tinha sido executado, e o item 5 da seção 2 de
`docs/PRODUCAO.md` mandava exatamente esse comando. É o tipo de dívida que só aparece quando alguém tenta
servir o produto de verdade, e a F6 é esse alguém. `main` e `start` passaram a apontar para
`dist/src/server.js`, que é o caminho que o `CMD` do container roda, e a régua de fumaça do painel continua
falando com a 3001 por `tsx`, como sempre.

### N68 — corrigido nesta rodada: uma régua que mede verde e devolve vermelho é pior que uma régua vermelha

`tools/verify-docker.cjs` foi escrita medindo as duas metades e imprimia `ok: 29 verificacoes, 0 falhas` — com
código de saída **127** e um `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` do Node do Windows logo
depois da última linha. A causa é o `fetch` nativo: o undici deixa um socket keep-alive vivo, o `process.exit()`
encontra a alça em fechamento, e o processo aborta **depois** de já ter dito que passou. Um portão que lê o code
de saída não tem como saber em quem acreditar, e o próximo passo seria confiar na frase impressa — que é como
uma régua deixa de ser régua. A leitura de rede da ferramenta passou a `node:http` com `agent: false`, a
conexão morre antes do encerramento, e o código 0 foi conferido duas vezes na mesma máquina (uma com a pilha
original, outra depois de `down -v` e da subida do zero). O registro fica aqui porque a falha não é do Docker e
não está em nenhum arquivo de produção: é da ferramenta de prova, e ferramenta de prova que mente tem que virar
achado.

### N54 recaiu no container, e o conserto agora tem guarda de dado

A cadeia de migrations versionada não reconstitui um MySQL zerado — a T1 descobriu isso no banco de prova, e a
subida da pilha descobriu de novo no banco do container: `P3018 / Database error code: 1826 / Duplicate foreign
key constraint name 'company_users_user_id_fkey'` na `20261010164015_add_clients`, porque em MySQL o nome de
chave é do banco inteiro, não da tabela. O `deploy/preparar-banco-de-dados.cjs` usa o mesmo baseline que a casa
já aplicava no banco de prova (estrutura atual do schema por `db push` + histórico marcado migration por
migration), com uma diferença que importa: **o baseline só roda em banco sem linha de ninguém**, conferido com
`SELECT COUNT(*)` exato tabela por tabela — `information_schema.table_rows` é estimativa do InnoDB e diria
"vazio" num banco com dados. Medido numa subida do zero: `21 marcada(s) nova(s) + 1 ja no historico = 22
migrations`, e `prisma migrate status` dentro do container devolve `Database schema is up to date!`. Nenhuma
migration aplicada foi reescrita para isso; a cadeia continua com o N54 aberto até a F8 (clone limpo), e o
conserto verdadeiro — regenerar a história das migrations — é decisão que a T7 traz.

### N69 — aberto: o nível de log de produção está fixo, e a rama do ternário não muda nada

`apps/api/src/app.ts` escolhe o logger por `isProd ? { level: "info" } : { level: "info" }` — as duas ramas são
idênticas, então a condição não faz nada. Não existe `LOG_LEVEL` no ambiente lido por ali, e a régua de produção
tampouco cobra um. Medido no container: o log é JSON no stdout, nível 30, e uma linha de request traz método,
URL, endereço remoto, porta remota e tempo de resposta — corpo e cabeçalho não entram, e a varredura do log
inteiro da pilha não achou **nenhuma** linha com `authorization`, `password`, `secret` ou `token` (0 batidas).
A parte boa é real e está em `docs/PRODUCAO.md` seção 7. O que fica aberto é a decisão de quem mantém: se
produção queria nível `warn`, ou se o `LOG_LEVEL` deveria vir do ambiente, e qual é a política de rotação e
retenção do arquivo que o Docker administra. Rotação e retenção não estão no repositório, e não foram fingidas:
`docs/PRODUCAO.md` diz `NÃO VERIFICADO` nesse ponto, e a amarração com o roteiro de backup vem na próxima
tarefa da T5 (seção 45 do prompt).
# Adenda da execução — T5.2 (F6: backup do banco com restauração testada) encerrada — 2026-10-14

Segundo item da T5: seção 45 do prompt, sob a regra 1 de `docs/decisoes/G5-hospedagem-e-backup.md` — *backup que
nunca foi restaurado é desejo, não plano*. Agora existem três peças e elas se conferem: `deploy/backup-mysql.cjs`
faz o dump, `deploy/restaurar-mysql.cjs` despeja, `tools/verify-backup.cjs` restaura o dump num banco separado e
compara tabela por tabela. A régua fecha **56 verificações, 0 falhas** (12 de recusa, 13 de retenção, 31 de dump
e restauração reais), código de saída 0 com a pilha de pé e código 2 com `NAO VERIFICADO` sem ela. A linha real
do dump: `35 tabela(s), 24 linha(s), 9 kB gzip em 1683 ms`, no banco `nexusbusinessmanager` do container, com
`sha256` de 64 dígitos no sidecar e no `meta.json`. A senha nunca saiu do ambiente do container — o `mysqldump` e
o `mysql` rodam por `docker compose exec` lendo `MYSQL_PWD` de `$MYSQL_ROOT_PASSWORD` lá dentro — e nada de valor
de segredo é impresso por nenhuma das três. A política é GFS 7/4/12 com **semana ISO** e a trava de nunca deixar
a pasta sem backup; destino padrão fora do repositório, e destino dentro dele é recusa medida (código 1, e o
diretório proibido não chega a ser criado). Decisão em `docs/adr/0019-backup-com-mysqldump-dentro-do-container-e-restauracao-conferida.md`,
roteiro em `docs/PRODUCAO.md` seção 8.

O achado da rodada nasceu da régua, não do produto.

### N70 — corrigido nesta rodada: o backup media o hash do byte errado, e a régua pegou antes do verde

`deploy/backup-mysql.cjs` contava o sha256 sobre os bytes que passavam pelo stream **antes** de o gzip terminar,
e escrevia esse valor no sidecar e no meta. A régua e o restaurador conferem o arquivo `.sql.gz` que está no
disco. As duas contas não batiam, e o resultado medido foi `FALHA o hash do dump confere com o sidecar` seguido
de `restaurar com hash divergente sai com codigo 1 antes de tocar em banco` — ou seja, a ferramenta se recusava
a restaurar o próprio backup. Corrigido: o hash é calculado sobre o arquivo fechado (`sha256DoArquivo(caminho)`),
e a régua passou a conferir o triplo (arquivo, sidecar, meta) na ordem em que o restaurador os lê. O que isto
vale registrar não é o erro de digitação, é o desenho: se a verificação estivesse escrita como log da ferramenta
em vez de medição independente, o verde teria saído com o hash errado dentro.

A régua também tinha uma expectativa minha errada, e ela foi corrigida no teste, não no código: ela pedia que
**dois dumps no mesmo dia** ficassem na pasta. Na política GFS dois dumps do mesmo dia são um bucket só — o
mais velho sai junto do sidecar e do meta. A asserção agora mede isso (`dois dumps no mesmo dia viram um bucket:
ficou o mais novo`), e o comportamento da ferramenta está correto.

### N73 — corrigido nesta rodada: a retenção não tinha motivo para dizer por que apagava

A linha que `deploy/backup-mysql.cjs` mostra a quem opera, medida na terceira execução real da rodada:
`retencao apagou nexus-mysql--2026-10-14--164801.sql.gz (undefined, mais velho que a janela)`. Duas mentiras
numa linha só. O `undefined` vinha de o campo `motivo` só ser escrito na malha de nunca-zero — no caminho
normal os arquivos apagados saíam do `planejarRetencao` sem motivo nenhum. E "mais velho que a janela"
estava fixo no texto, quando aquele arquivo era o **segundo dump do mesmo dia**: não estava fora de janela
alguma, tinha apenas perdido o bucket para o irmão mais novo. Corrigido: quem perde o bucket responde
`repetido-no-bucket`, quem não cabe em diário/semanal/mensal responde `fora-da-janela`, e a frase fixa saiu
da linha. A régua ganhou a asserção que faltava — todo arquivo apagado traz um motivo escrito — e mediu
vermelho (`[null,null,null]`) antes da correção; com ela dentro são **56 verificações, 0 falhas**. O que
isto vale, junto com o N70: as duas falhas da rodada não apareceram olhando o dump, apareceram porque a
verificação foi escrita como medição independente da ferramenta, e não como log dela.

### N71 — aberto: o backup não tem agenda, não tem cópia fora da máquina e não cobre o que o produto ainda não tem

Três limitações honestas, todas com decisão de quem mantém, e nenhuma fingida no repositório:

1. **Nenhum `cron` roda o backup.** `npm run docker:backup` é um comando; a periodicidade é do Agendador de
   Tarefas/cron da máquina que hospeda. O executor de rotinas do painel (`/app/rotinas`) **não** serve para
   isso por construção: ele roda dentro do container da API, não tem o binário
   `docker` nem como escrever na pasta do host. A alternativa seria um serviço extra no compose montando a
   socket do Docker — o que daria a um container o poder de mexer em outro, exatamente o desenho de porta
   fechada que a T5.1 acabou de fechar. Registrado como escolha, não como esquecimento.
2. **Não há cópia off-site.** Um dump na mesma máquina do banco protege de erro de operação (a restauração
   testada cobre isso), não de disco perdido. Isso é a parte de hospedagem do G5, e a decisão é do dono.
3. **Não há arquivos de upload para backup.** A seção 45 fala de "dump lógico + arquivo de uploads"; o produto
   não tem upload em disco hoje — `apps/api/src/modules/companies/companies.schemas.ts:69` recusa logo que não
   seja endereço `http(s)` completo, com a frase "o upload de arquivo ainda não existe". Então a segunda metade
   não tem o que copiar. Quando o upload chegar (seções 26 e 48, tarefa #28), o backup terá de chegar junto, e
   esta linha é o lembrete.

### N72 — aberto: a regra 2 do G5 está escrita sobre uma premissa que o código desmente

`docs/decisoes/G5-hospedagem-e-backup.md` diz, como regra de projeto número 2: *"Dump lógico + arquivo de
uploads — o painel guarda imagem/logo em disco; só o SQL não recupera nada"*. O produto não guarda nada em
disco: `apps/api/src/modules/companies/companies.schemas.ts:69` aceita logo **apenas** como endereço `http(s)`
completo, com a frase "o upload de arquivo ainda não existe", e não existe parser `multipart` em nenhuma rota
da API (varrido em `docs/ESTADO-ATUAL.md`, seção de módulos: *Upload de arquivo — Não iniciado*). Consequência
direta: a segunda metade da regra não tem objeto, e o backup entregue é o dump lógico — que é o que a régua
prova. Não foi fingido um diretório de uploads para backup nem uma pasta vazia no `meta.json`. O achado fica
registrado porque a decisão do dono foi escrita contra uma suposição falsa, e a pergunta de hospedagem (RPO, o
que copiar) muda quando o upload das seções 26 e 48 chegar: nesse momento a regra 2 vira real, e o backup tem
de crescer junto. Não foi corrigido aqui porque criar upload de arquivo não é tarefa da T5.

Também fica declarado aqui o que a restauração **não** foi testada contra: o MySQL do WAMP desta máquina
(3306, banco de desenvolvimento). Por D6 as três peças falam só com o MySQL do container, e a régua mede no
container de pé que o serviço `mysql` não publica porta nenhuma no host — não existe socket por onde um dump
pudesse estar lendo o banco do dono sem alguém querer.

# Adenda da execução — T5.3 (F6: entrega de e-mail fora do request) encerrada — 2026-10-14

Terceiro item da T5: a regra 2 do desenho do G1 — *"nenhum request HTTP fica esperando provedor de e-mail"*.
O achado é o N58, e a correção coube inteira no processo: `apps/api/src/lib/mail/fila.ts` é a fila de memória
do processo (consumidor único, FIFO, recuo exponencial, teto por tentativa, teto de tamanho), os três chamadores
passaram a entregar um código e o worker é que fala com o SMTP. O que a régua do N58 exigiu como prova não é a
ausência de erro — é a **ausência de espera**: com um entregador de 600 ms injetado no lugar do SMTP, o
`POST /api/auth/forgot-password` respondeu em **7,43 ms**, a caixa do entregador estava **vazia** e a fila tinha
**1 mensagem viva** naquele instante. Verde medido nesta árvore: **API 48 arquivos / 442 casos** (os cinco casos
novos de `test/fila-de-mail.test.ts`, mais os quatro arquivos que leem caixa de e-mail —
`recuperacao-por-email`, `verificacao-de-email`, `segundo-fator`, `guardas-herdadas` — adaptados com dreno, sem
uma asserção removida). Decisão em `docs/adr/0020-entrega-de-email-por-fila-de-memoria.md`, operação na seção 10
de `docs/PRODUCAO.md`, e a regra 2 do `docs/decisoes/G1-envio-de-email.md` saiu de "NÃO cumprida".

Três vermelhos apareceram no caminho, e a origem de cada um foi conferida antes de mexer em qualquer um deles.

### O primeiro era do código, e o teste o achou por semântica

`aguardarFilaDeMail()` acordava dentro de `concluir()`, que ainda estava **dentro** do laço do worker. O estado
medido no `expect` foi `{ vivas: 0, naFila: 0, trabalhando: true }` contra o `{ vivas: 0, naFila: 0,
trabalhando: false }` que o teste pedia — ou seja, "a fila esvaziou" era verdade para as mensagens e mentira para
o processo: um teste que passasse nesse estado poderia encerrar enquanto a última entrega ainda estava no
`await` do SMTP. Corrigido no `fila.ts`, não no teste: o aviso aos despertadores agora confere as três condições
(`vivas`, `fila.length`, `trabalhando`) e é chamado também no `finally` do laço. O mesmo `finally` é o que impede
a fila de ficar parada sem avisar quando o worker morre — e ela **não** se religa no mesmo turno, porque um erro
que se repete viraria laço quente; o `aguardarFilaDeMail()` estoura o teto de 5 s e denuncia, que é o
comportamento correto para uma fila parada.

### Os outros dois eram meus, e ficaram escritos para a próxima leitura não repetir

O primeiro é de biblioteca: esta auditoria e o `.env.example` citavam `dataTimeout` entre os tempos do
`nodemailer`, e esse nome **não existe** nos tipos da versão 10.1.0 — a tentativa de usá-lo deu `TS2769`. Os
quatro tempos reais (`connectionTimeout`, `greetingTimeout`, `socketTimeout`, `dnsTimeout`) foram conferidos em
`node_modules/nodemailer/dist/cjs/smtp-connection/index.d.ts` e são os que o transporte declara agora. O segundo
é de medição: o primeiro contato do processo com o Prisma e com o HTTP carrega um custo frio que não tem nada a
ver com a fila — medido em **1 269 ms** de `responseTime` numa corrida e **1 708 ms** em `makeAccount` em outra,
com o mesmo caminho de e-mail já drenado. Um teste de tempo que não tira esse custo da conta é um teste que passa
por motivos errados. O caso de tempo aquece a rota antes de medir, o atraso de prova subiu de 250 ms para
**600 ms** (com 250 ms um soluço de agendamento do Windows — 259 ms observado — é indistinguível de "o request
pagou o provedor"), e a asserção de tempo nunca anda sozinha: ela é acompanhada das duas leituras independentes
de relógio (`recebidas: 0` e `vivas: 1`) e de uma medição de contraste que prova que o entregador injetado
**demora** os 600 ms quando alguém espera por ele.

### N74 — aberto: a fila é do processo, e o preço disso é declarado antes de ser pago

Três limitações que a decisão de não persistir a fila traz junto, nenhuma fingida no repositório:

1. **Processo que morre leva a fila.** Mensagem enfileirada e não entregue no instante de uma queda não chega a
   ser reenviada por ninguém; o desligue limpo drena com teto de 5 s, e o teto existe exatamente para o desligue
   não virar uma segunda falha. O caso é raro e o motivo do "por quê" está no ADR-0020: o conteúdo dessas
   mensagens é código de recuperação e link de verificação — texto puro que não pode virar linha de banco.
2. **Pelo menos uma vez, com duplicata possível.** A retentativa recua depois de a entrega ter sido aceita pelo
   provedor e a resposta ter se perdido no caminho, então um SMTP lento pode gerar duas mensagens iguais na caixa
   de quem pediu recuperação. A escolha declarada é duplicar a perder, e o teto de tentativas limita o estrago.
3. **Uma fila por réplica.** Com mais de uma instância da API, cada processo tem sua fila e seu contador, e o
   teto de tamanho (`MAIL_FILA_MAXIMA`, padrão 200) é por processo, não global. Isto não é um problema hoje
   porque a topologia entregue pela T5.1 é de **uma** réplica da API; no dia em que houver mais de uma, esta
   linha é o que precisa ser lido antes — a alternativa seria a fila no banco ou no provedor, e as duas são
   decisão do dono junto da G1.

As quatro chaves novas (`MAIL_TENTATIVAS`, `MAIL_BACKOFF_BASE_MS`, `MAIL_TIMEOUT_MS`, `MAIL_FILA_MAXIMA`) têm
padrão no código, nenhuma é obrigatória, e a régua de produção (A9) **não** passou a cobrar nenhuma delas: pedir
uma chave que tem padrão seria derrubar a subida por algo que funciona. O que a régua cobra continua sendo
`SMTP_HOST`/`SMTP_PORT`/`MAIL_FROM` — sem servidor de saída não há o que enfileirar.

Fica declarado também o que **não** entrou nesta tarefa, para a linha não parecer mais larga do que foi: o
relatório diário do cron (`apps/api/src/modules/cron/cron.handlers.ts`) e o sino (`notifications.service.ts`)
seguiam sem chamador de e-mail — isso é o N59, que foi o item seguinte da T5 e está fechado lá. E o `connectionTimeout`
do nodemailer não foi tunado por tentativa medida contra um SMTP real: não há credencial viva neste repositório,
e apontar timeout contra um servidor inventado seria escrever um número sem medição.

# Adenda da execução — T5.4 (F6: sino e relatório diário com chamador de e-mail) encerrada — 2026-10-14

Quarto item da T5, e o que estava registrado como N59. A correção inteira cabe em `docs/adr/0021-o-email-e
copia-do-aviso-do-sino.md`, com os números antes/depois na linha do N59 acima. Dois achados apareceram **durante**
o trabalho e entram aqui em vez de virar correção de graça na mesma carona.

### N75 — corrigido nesta rodada: a tela de preferências apontava para um executor que já existia

`apps/web/src/pages/Notifications.tsx:411` descrevia a varredura de contas vencidas assim: *"É o mesmo passo que a
rotina agendada vai chamar **quando o executor existir** — hoje ele só roda daqui ou pela API"*. O executor existe
desde a tarefa #59 (backend de rotinas: `cron.service.ts`, `POST /api/ops/jobs/:slug/run`, tabela `cron_jobs`) e
tem tela própria desde a #61 (`/app/rotinas`), com prova de navegador em `tools/verify-rotinas.cjs`. A frase estava
certa quando foi escrita e continuou no lugar depois de o fato mudar — que é o mesmo formato de defeito do N59:
copy que não depende de estado nenhum. Corrigida junto porque é a mesma tela do mesmo achado, e com uma diferença
que a frase velha escondia: daqui a varredura varre **só a empresa ativa**, e pela rotina varre todas.

Medido, não deduzido: `grep -n "executor existir" apps/web/src` devolve zero depois da mudança, e a suíte web
fechou verde com a frase nova na tela.

### N76 — corrigido na T6.1: as quatro mensagens escapam o nome, e o link sai codificado onde precisa

`apps/api/src/lib/mail/mensagens.ts` ganhou `textoSeguro()` (escapa `& < > "`) porque a mensagem de aviso do sino
carrega nome de produto, de cliente e de fornecedor **digitados por uma pessoa na tela** para ser lida por outra no
e-mail dela. As três mensagens que já existiam — recuperação, verificação de cadastro e aviso de segundo fator —
interpolavam `primeiroNome` cru no `<p>`, e ficaram como estavam até a T6 (F7) ser a tarefa delas.

O risco medido à época é pequeno, e a proporção do conserto também: `primeiroNome` vem do cadastro da própria
pessoa e a mensagem vai para a caixa postal dela mesma, então o pior caso é alguém quebrar o próprio HTML (auto-XSS
de mensagem). Não há terceiro envolvido, e o `codigo` interpolado é gerado pelo servidor. O que faz o conserto
valer a pena não é o pior caso do nome: é o mesmo recorte chegar por outra porta — a tela de equipe cadastra
usuário e o nome digitado ali vai na saudação da mensagem daquela conta — e o HTML ser lido **fora** do produto, no
cliente de e-mail de quem abre.

O que mudou, em `mensagens.ts`:

1. **As três mensagens antigas passam pelo `textoSeguro` que já existia**, só no ramo do HTML. O `text/plain`
   continua com o nome exatamente como foi digitado — escape é regra de markup, e trocar o nome por entidade de
   texto numa mensagem sem markup seria estragar o texto de quem recebe.
2. **O link ganhou escape próprio** (`linkSeguro`), porque dentro de `href="..."` entidade HTML não resolve: o que
   fecha o atributo antes da hora é a aspa. Ela sai como `%22`, e `<`/`>` como `%3C`/`%3E`. Um endereço montado por
   `WEB_BASE_URL` mais caminho fixo — o caso de sempre — passa por aqui byte por byte igual, que é o que a
   segunda e a terceira asserções do teste conferem.
3. **O recorte do primeiro nome virou função** (`primeiroNome()`), em vez de estar escrito quatro vezes. O escape
   acontece na montagem do HTML, não dentro dela, pela razão do item 1.

Vermelho medido antes do conserto, com o módulo da árvore publicada no lugar e o teste novo escrito:
**5 failed | 3 passed (8)** — as três que já passavam são justamente as que não dependiam do escape (texto puro,
aviso do sino, nome vazio). Verde depois: **8 passed (8)**, e a suíte inteira da API fechou
**52 arquivos / 472 casos** sem falha com o módulo consertado. O teste é puro (`test/mensagens-de-email-escapadas.test.ts`,
sem banco e sem servidor): ele mede a string que o módulo devolve, e a última asserção é estrutural — nenhuma tag
fora das seis que o próprio módulo escreve (`div`, `h2`, `p`, `code`, `a`, `strong`) aparece em nenhuma das quatro,
então retirar um escape no futuro quebra a guarda em vez de passar despercebido.

### N77 — corrigido nesta rodada: a tabela de módulos do README dizia que backup não existia, e ele existe desde a T5.2

Medido ao reescrever a tabela para o N59: a linha "Backup e restauração" continuava `a caminho`, três blocos
cinzentos e nada mais, enquanto `deploy/backup-mysql.cjs`, `deploy/restaurar-mysql.cjs` e
`tools/verify-backup.cjs` estão nesta árvore desde a T5.2 — com dump real conferido byte a byte, sidecar de
sha256, metadados, retenção GFS e restauração comparada tabela por tabela (56 verificações, 0 falhas). A tarefa
atualizou `docs/PRODUCAO.md`, o ADR-0019, o CHANGELOG e a árvore de docs, e deixou a tabela de módulos para trás.
Corrigida aqui, na mesma passada em que a tabela foi mexida, e declarada em vez de consertada em silêncio: os três
marcadores continuam corretos (backup não tem tabela, rota nem tela — é ferramenta de operação), o que estava
errado era o resumo. Ficou dito o que existe e o que não existe (agenda embutida e cópia fora da máquina, que é o
N71 já aberto).

### Prova de navegador desta rodada (N59), na pilha de prova

`node tools/verify-notificacoes.cjs` contra 5174/3002: **88 checagens, 0 falhas**. As três checagens novas saíram
verdes com o estado real desta instalação — `{"disponivel":false,"transporte":"console","motivo":"não há servidor
de e-mail (SMTP) configurado nesta instalação: as mensagens são escritas no log do servidor"}` —, com a caixa
acompanhando o `disponivel` e a dica repetindo o motivo que a rota devolveu. A varredura repetida disse "Nenhum
aviso novo neste mês." e, como o canal não entrega, a prova conferiu que a frase não fala de fila de e-mail.
Banco de prova medido antes e depois da corrida, tabela por tabela: `notifications` **12 → 12**,
`notification_preferences` **1 → 1**, `finance_entries` pendentes **0 → 0**, `users` **182 → 182**,
`companies` **3 → 3**, **35 tabelas** nos dois momentos; `audit_logs` de notificação **97 → 99** — as duas linhas
são a auditoria do próprio produto (`notification.scan`), não resíduo da prova, e o `finally` da ferramenta apagou
os 24 avisos e os 12 lançamentos que ela criou (medido na saída: `sobraram 0`).

Capturas: a tela de preferências mudou de verdade (a dica do canal agora é o estado que a API devolve, e a frase
cresceu duas linhas), então `21-notificacoes-preferencias.png` foi atualizada. O grupo das rotinas também — a
coluna "última execução" passou a fechar com `· 0 e-mails` nas três linhas, e isso é texto de tela:
`23-rotinas-tela`, `-executou`, `-confirmacao`, `-claro` e `-celular`. As cinco conferidas uma a uma antes de
entrar, sem dado sensível e sem número de prova no lugar de número de produto. `21-notificacoes-sino.png` **não**
entrou: a diferença entre a captura nova e a canônica é contagem transitória, não interface, e re-captura sem
mudança não é entregável. As quatro demais do grupo das notificações saíram byte a byte iguais à galeria canônica
(mesmo sha256), o que confere que a prova está fotografando a mesma tela de sempre.

## Adenda da execução — T5.5 (F6: porta administrativa de confirmação de e-mail) encerrada — 2026-10-14

### N78 — corrigido nesta rodada: com a régua da D2 ligada, o `admin:criar` criava a conta que não consegue entrar

`verificacao.service.ts:147` devolve sem enviar nada quando a conta já está confirmada, está desativada, ou tem
`platformRole === "SUPER_ADMIN"`. A recusa é de propósito — a conta da plataforma não é conta de cliente, e o
endereço dela é de operação —, mas o lado que ninguém olhou é o do bootstrap: `apps/api/prisma/administrador-
da-plataforma.ts` escrevia papel e senha e nunca tocava `emailVerifiedAt`. Com `REQUIRE_EMAIL_VERIFICATION=1`
(obrigatório em produção desde a D2), o login dessa conta é negado antes da senha, e o `UPDATE` que destranca não
existe em lugar nenhum — que é exatamente o motivo pelo qual o N61 foi aberto. Em resumo: o script que a regra de
acesso do dono manda rodar ("jamais deve ficar sem acesso ao sistema") podia produzir a conta trancada fora do
painel, e a situação só aparece no primeiro boot de produção, que é o pior momento para descobri-la.

Consertado no lugar de origem: a decisão do bootstrap ganhou `confirmaEmail`, que vale **"confirmar se ainda não
estiver confirmada"** (`!conta?.emailVerifiedAt`) e se aplica aos três caminhos que escrevem — criar, promover com
consentimento, reativar com consentimento (e o caminho "nada mudou", que não escreve nada). Reescrever o carimbo
de quem entrou pelo próprio link seria falsificar a data em que a caixa postal foi provada; por isso a coluna só é
escrita quando está vazia, e o resumo do script passou a devolver `emailConfirmado: "marcado agora" | "já
estava"`, sem imprimir nada além disso. O caso está provado no penúltimo teste de
`apps/api/test/confirmacao-administrativa-de-email.test.ts` ("o bootstrap do administrador da plataforma nasce com
o e-mail confirmado"). Fica declarado o que o conserto no código não conserta sozinho: **ambiente onde o
`admin:criar` já rodou com a D2 ligada tem hoje uma conta de plataforma pendente, e o remédio é rodar o script de
novo**, que é idempotente por decisão, não por sorte. Está no runbook de `docs/PRODUCAO.md`. Medido nesta máquina:
a conta de prova (`administrador@exemplo.test`) está entre as pendentes do banco de prova, porque quem a cria é
`tools/preparar-banco-de-prova.cjs`, não o `admin:criar`; com a flag desligada no desenvolvimento isso não morde,
e é por isso que o achado não aparecia antes.

### N79 — aberto: a vitrine anônima escreve no banco, e o aceite herdou essa porta

`GET /api/public/landing` e `GET /api/public/legal/:kind` são as duas rotas sem sessão que leem a prateleira de
textos legais, e a leitura é feita por `obterLegal()`, que é um **upsert** (`cms.service.ts:543`): a primeira
chamada de cada `kind` cria a linha com título padrão, `content` nulo e `published: false`. `listarLegais()` faz
isso para os três de uma vez, e `payloadPublico()` chama `listarLegais()`. Medido no código, não deduzido: uma
visita anônima à vitrine, quando o cache de 10 s (`TTL_PUBLICO`) não segura, resulta em **três upserts** numa
tabela de plataforma.

Por que isto está registrado e não consertado: o dano é limitado por construção — a chave é o enum `LegalKind`,
então não há como um visitante criar linhas indefinidas, e o `update: {}` do upsert não toca em coluna nenhuma
quando a linha já existe. O que incomoda é o desenho, não o incidente: rota de leitura, sem sessão, escrevendo; e
a T6.2 passou a depender dessa mesma função para saber **qual versão oferecer** no cadastro, o que aumenta o
número de caminhos que chegam até ela. O conserto cabível é trocar o upsert por leitura + criação apenas na
escrita autorizada (editor da plataforma) e no bootstrap, com a tela de cadastro aceitando a prateleira ausente —
e isso é mudança no módulo de CMS, fora do item numerado desta tarefa (§1: "sem número, não faça"). Fica para quem
abrir o bloco de CMS depois: o `version` que a linha de aceite guarda não muda com esse conserto, porque criação
por leitura e criação por edição produzem a mesma linha na versão 1.

Enquanto aberto, a consequência prática é uma só e é declarada: numa instalação recém-subida, **quem chega antes
da primeira escrita autorizada** é que cria a prateleira vazia, e não o editor. Isso não afeta prova de aceite
nenhuma — a linha de aceite grava o número que a coluna tinha naquele instante.

### N80 — aberto: com as duas caixas, o cadastro em estado de erro passa da dobra de 900 px

Medido no navegador da prova (1440×900, `http://localhost:5174/cadastro`), antes e depois de clicar em *CRIAR
CONTA* com o formulário vazio:

| estado | altura do cartão | base do botão | cabe em 900 px? |
| --- | --- | --- | --- |
| vazio, sem erros | 837 px | 786 px | sim |
| com os seis erros | 1004 px | 947 px | não — 47 px abaixo da dobra |

As duas caixas novas custam ~112 px de cartão e as suas duas linhas de erro, ~55 px. Nada está perdido: a página
rola. Rodando a roda do mouse a partir do topo, o documento desce 152 px e o botão volta a ficar visível (base em
795 px), então o caminho de consertar o formulário e reenviar existe. O que mudou é a primeira tela de prova: o
`docs/screenshots/08-cadastro.png` desta rodada mostra as duas caixas, as duas frases de erro e o botão cortado no
rodapé da janela — a captura anterior, de cinco campos, cabia inteira.

Por que está registrado e não consertado aqui: o conserto não é do aceite, é do **ritmo do cartão de acesso**, que
as três telas (entrada, cadastro, recuperação) compartilham. Apertar o espaçamento para caber 900 px mexeria nas
duas telas que não mudaram nada nesta tarefa — e a régua da rodada é re-capturar o grupo inteiro quando uma tela do
grupo muda. Também não há porta de saída barata: reduzir as duas frases de erro para uma linha do grupo economiza
28 px dos 136 necessários, e esconder o rodapé de links não é opção, porque ele é a única porta de leitura na tela.
Fica para um item de qualidade de tela (F5/F8), com os números acima como linha de base.

### N61 — o que a porta fez com a superfície

As duas rotas novas (`GET /api/plataforma/contas/sem-confirmacao` e `POST
/api/plataforma/contas/:userId/confirmar-email`) levaram a régua 4 de `isolamento-rotas.test.ts` de **129 para
131** rotas em **20** arquivos `*.routes.ts`, e a partição de **15 para 17** rotas de plataforma (13 públicas + 2
de etapa + 17 plataforma + 91 empresa + 8 de conta = 131). O prefixo `/api/plataforma` entrou na regra 5 ao lado
de `/api/cms` e `/api/ops`, e `platform-accounts/contas.service.ts` entrou na lista de arquivos que carimbam
`ESCOPO_PLATAFORMA` — lista que o teste exige ser exata, nos dois sentidos. Evidência lida no log da suíte desta
rodada: as duas portas aparecem na varredura anônima da regra 8 respondendo **401**, cada uma com o seu
`statusCode` gravado na saída.

### Prova de navegador desta rodada (N61 e N78), na pilha de prova

`node tools/verify-contas-plataforma.cjs` contra 5174/3002: **40 verificações, 0 falhas**, código de saída 0. A
prova cria uma conta pendente com vínculo de empresa e um token de verificação vivo, confere que a fila da tela
bate com a contagem do banco (205 contas, menos a que ela mesma criou), que o endereço e o número de empresas
aparecem, que nenhum identificador interno é impresso no navegador, que o ADMIN de uma empresa recebe **403** nas
duas portas sem escrever nada, que a ausência de motivo bloqueia a escrita antes de sair qualquer requisição
(conferido por `performance.getEntriesByType("resource")`, não pela cara da tela), que a escrita marca a coluna
**e** gasta o link na mesma transação, que o evento nasce com `companyId` nulo, com endereço mascarado e com o
motivo, que ele não aparece na trilha da empresa e aparece na da plataforma, que repetir a chamada devolve
`alterado: false` sem segunda linha de auditoria, e que um `userId` inexistente é 404 honesto. Banco de prova
medido dentro da própria corrida: pendentes **205 → 206 → 205**, eventos desta janela **1 → 0**, duas contas de
prova apagadas no `finally`. A tela mudou de verdade (ganhou um painel, uma fila e um diálogo com motivo), então
a captura de prova foi gravada — em `docs/screenshots-prova/`, pasta fora do repositório, porque a pilha de prova
não pisa a galeria canônica (regra da T5.0).

`node tools/verify-sidebar.cjs`, recontado porque a barra ganhou uma linha — é o mesmo caso do N50: **105
checagens, 0 falhas**, com as 18 linhas clicadas uma a uma e nenhuma rota abrindo tela vazia. A lista esperada de
itens da ferramenta passou a ter "Contas sem confirmação" depois de "Auditoria da plataforma"; a ordem conferida é
a da barra, e a checagem do número de linhas foi re-escrita de 17 para 18 junto com a frase do rótulo.

Duas coisas medidas neste caminho que valem registro justamente porque não são elogio do trabalho:

- **Duas suítes da API rodaram sobrepostas neste turno, e a primeira medida mostra o que isso estraga.** A
  corrida aberta às 20:13:49 e a corrida aberta às 20:20:04 bateram no mesmo banco de prova ao mesmo tempo, e a
  primeira fechou com **3 arquivos / 2 casos em falha** — entre eles o contador "usuário novo nasce com a empresa
  a mais" e a mensagem de verificação que não chegou à caixa. Nenhum dos dois é defeito do produto: contagem
  relativa entre dois processos concorrentes não é medição. A corrida solitária de 20:20 fechou **50 arquivos /
  459 casos, zero falha, zero skip, código de saída 316,16 s depois**, e é essa a número que vale para os
  portões. Fica a regra para as próximas rodadas: **uma suíte por vez no banco de prova**.
- **O banco de prova acumula contas que ninguém limpa.** Medido com leitura simples nesta máquina: **205 usuários,
  todos pendentes**, dos quais **202 com o domínio dos helpers (`@nexus.test`)**. Não é dado de cliente, é resíduo
  de corrida — inclusive de uma suíte interrompida neste turno, que não chegou a rodar o `finally` —, e o banco é
  recriável por decisão (`npm run db:prova`). É exatamente por isso que as provas conferem contagem **antes e
  depois da própria corrida** em vez de conferir número absoluto: a fila mostrando "205 contas" num banco de prova
  é honesta sobre o banco, não sobre o produto.

Portões desta tarefa, na árvore final: typecheck api+web sem erro; build com **38 chunks**, `index` em **355,36 kB
/ 121,78 kB gzip** e o chunk novo `PlataformaContas` em **6,15 kB / 2,49 kB gzip** (a D8 continua de pé: a tela
nova entra sob demanda e não aumenta o carregamento inicial); suíte **API 50 arquivos / 459 casos em 316,16 s** e
**web 20 arquivos / 156 casos em 14,45 s**, zero falha e zero skip contra `nexusbusinessmanager_teste`; guarda de
caracteres (`caracteres-permitidos.test.ts`, 4 casos) verde com os arquivos novos já na árvore; captura desta
corrida conferida antes de registrar, sem dado sensível e sem credencial.

---

### N81 — publicado na Vercel: o painel chama a API num endereço que não existe, e não há backend no host

Medido em 2026-10-17 nos dois deployments que existem hoje, sem mexer em nada antes de conferir.

| O que foi chamado | O que voltou |
| --- | --- |
| `GET https://nexus-business-manager-a6fa.vercel.app/` | 200, o `index.html` do painel — é hospedagem estática, só |
| `GET …/assets/index-JpOCgEsb.js` | 200 (197.121 bytes baixados e lidos) |
| `GET …/health`, `…/public/landing`, `…/api/health` | **404** com `X-Vercel-Error: NOT_FOUND` — não há API naquele projeto |
| `GET …/login` e `…/app` (link direto) | **404** — sem rewrite de SPA, só a raiz serve |
| `GET https://nexus-business-manager.vercel.app/api/health` | **500** com `X-Vercel-Error: FUNCTION_INVOCATION_FAILED`, em `…/` também 500 — a função existe e morre ao nascer |

No bundle publicado a origem está gravada no build: `bh="https://nexus-business-manager.vercel.app"` e
`ct=tt.create({baseURL:bh,…})`. Ou seja, `VITE_API_URL` foi preenchida com a origem da API **sem o `/api`**, e
apontando para o *outro* projeto — por isso o console mostra `/health` e `/public/landing` cross-origin e o
navegador reclama de CORS antes de reclamar do 404. A consequência visível é a da captura do dono: a vitrine não
monta, e o login não tem com quem falar.

O 500 da função tem a mesma causa do resto: a API é um processo Fastify que exige um MySQL alcançável, e a única
string de conexão que existe nesta casa aponta para o `localhost:3306` do WAMP. Dentro da Vercel não há esse
banco, e a régua de produção (`apps/api/src/config/producao.ts`) derruba o processo antes da primeira requisição
— que é exatamente o `FUNCTION_INVOCATION_FAILED` medido acima.

**O que esta rodada consertou no repositório.** (1) `apps/web/src/lib/apiBase.ts` completa a origem nua com o
prefixo que o backend monta, então `VITE_API_URL=https://api.exemplo.test` vira `…/api` no bundle; medido no
build desta árvore, com a função presente no artefato e os cinco casos de `url-base-da-api.test.ts` verdes.
(2) `vercel.json` na raiz declara o build do workspace web, o `apps/web/dist` como saída e o rewrite de SPA, que
é o que devolve `/login` e `/app` em vez de 404.

**O que não é consertável no código.** O produto são dois processos e um banco. Enquanto o backend não tiver onde
rodar com um MySQL de verdade, nenhum valor de variável faz o login funcionar. A trilha escolhida pelo dono foi
`API + MySQL em host de container`, e o painel continua publicado onde já está. Até essa subida existir, a vitrine
publicada fica no estado de erro e o login não tem com quem falar — registrado aqui em vez de escondido atrás de um
`NÃO VERIFICADO`.

**O que mudou no ar, medido depois de publicar (2026-10-17).** O projeto `nexus-business-manager-a6fa` tinha Root
Directory em `apps/web`, e por isso o `vercel.json` da raiz não era lido; a pasta foi trocada para a raiz do
repositório pela API da Vercel (`rootDirectory: null`) e o projeto foi republicado com `vercel deploy --prod`.
Depois da publicação, na mesma URL do dono:

| O que foi chamado | O que voltou |
| --- | --- |
| `GET …/`, `…/login`, `…/app` | **200** nos três — o rewrite de SPA devolve o `index.html`, e antes eram 404 |
| `GET …/api/health` | **404** limpo — o rewrite deixa `/api/*` de fora, para a chamada não receber HTML |
| `GET …/assets/index-C404XGY4.js` | 200, 355.413 bytes, e o artefato traz `Rp="/api"`, `J0=/^https?:\/\//i`, `function Y0(i){…}` e `ct=tt.create({baseURL:Ih` — o normalizador está no que vai ao ar |
| navegador em `…/login` | a tela monta: logo, "Seja bem-vindo", campos de e-mail e senha, "ENTRAR" |
| navegador em `…/` | a vitrine mostra o estado de erro "Não foi possível concluir / Não foi possível carregar o conteúdo do site agora", porque o conteúdo do CMS vem de `/api/public/landing` e não há API atrás |

Sobrou o outro lado da casa, e ele não é uma variável de ambiente do painel: o projeto
`nexus-business-manager` (Root Directory `apps/api`, preset `fastify`) continua sem como nascer, porque função
serverless não tem o MySQL que o processo procura. A peça que falta é a da seção 11 de `docs/PRODUCAO.md`.
