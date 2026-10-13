# Status dos ajustes — prompt de mercado

Tabela de acompanhamento exigida pelo item A0 do prompt de mercado. Uma linha por tarefa do
contrato, com a situação e a prova que a sustenta.

Situações possíveis: `FEITO` (corrigido e comprovado por teste nesta rodada), `JÁ CORRIGIDO`
(o repositório já fazia, e a prova disso está apontada), `PENDENTE` (falta executar),
`BLOQUEADO POR DECISÃO` (depende de resposta do dono — ver `docs/decisoes/`),
`NÃO VERIFICADA` (não foi possível comprovar).

Atualizada em 2026-10-11, no fim do Bloco A, e de novo na rodada em que o cabeçalho do painel perdeu o texto
da marca (achados N1 a N5 em `docs/AUDITORIA.md`).

## PROMPT MESTRE — fases F0 a F9 (fonte única de verdade desde 2026-10-12)

Este bloco ordena a execução a partir de 2026-10-12: o PROMPT MESTRE consolidou as rodadas anteriores e manda
seguir F0 → F9, encerrando cada fase com commit humanizado e push provado. As tabelas de blocos abaixo continuam
válidas como histórico do que já foi comprovado.

| Tarefa | Situação | Prova |
|---|---|---|
| F0. Retomar e publicar os commits da rodada de segurança | FEITO | Portão de avanço direto reaberto por decisão do dono: `git merge origin/main` (commit `772cc77`, sem force, sem rebase, sem reescrever histórico) com o `README.md` da árvore local vencendo o conteúdo — o do GitHub trazia o e-mail pessoal de volta na linha 633. Depois do merge: 917 linhas, zero marca de conflito, nenhuma ocorrência de domínio pessoal. Push `2cfa2e9..772cc77` e prova `git ls-remote origin HEAD` = `772cc77559bf9f21a1373af5fc9a2f7cfb282ecc` = `git rev-parse HEAD`. Com o MySQL religado pelo dono, a suíte volta a ser medida: API 31 arquivos / 250 casos e web 5 / 27, zero falha. |
| F1.1. Eliminar caracteres não latinos e instalar a guarda permanente | FEITO | Varredura em quatro escopos (284 arquivos de texto, histórico inteiro de mensagens de commit, patch dos commits pendentes, README do `origin/main`): único achado foram 4 ocorrências de U+03A3 em `docs/AUDITORIA.md:462`, `:473` e `:527`, reescritas como "soma das linhas", "soma das parcelas" e `soma(ENTRADAS) − soma(SAIDAS)`. Guarda: `apps/api/test/caracteres-permitidos.test.ts` (4 casos, 35 scripts por propriedade Unicode, varre `--cached --others --exclude-standard` e confere a mensagem do `HEAD`). Vermelho mostrado duas vezes — com o sigma na árvore (`Array(4)`) e com arquivo temporário de prova (`docs/_prova-caractere-proibido.md:3 U+4E00`, apagado em seguida) — e verde final `4 passed (4)`. |
| F1.2. Rodapé único (`AppFooter` + `brand.ts`) | FEITO | Um só rodapé na vitrine, na página legal e no painel; `LandingFooter.tsx` apagado e o `<footer className="admin-footer">` do `AdminShell` junto. Marca em `apps/web/src/lib/brand.ts`; em 2026-10-13, por decisão do dono, o rodapé perdeu o rótulo com o nome do produto ao lado do símbolo e o selo de versão — e a injeção `__APP_VERSION__` saiu junto (`brand.ts` sem o campo, `vite.config.ts` e `vitest.config.ts` sem a leitura do `package.json`, `vite-env.d.ts` sem a declaração e `components.css` sem as duas regras) ano dinâmico; crédito do dono como texto, com link seguro só quando `urlDoAutor` for preenchida; Termos/Privacidade/LGPD apenas quando publicados; indicador de serviço vindo do `GET /api/health` real. Texto saiu de `--text-3` (4,02:1 / 3,14:1) para `--text-2` (8,64:1 / 5,50:1). Colisão com o `.app-footer` do AdminLTE registrada em N19; guarda R2 endurecido em N20. Prova: 12 casos em `apps/web/src/test/rodape-unico.test.tsx`, vermelho primeiro, e captura em 1440x900 dos dois temas no navegador. Na rodada de 2026-10-13 os mesmos 12 casos continuam verdes, e a prova no navegador subiu para 31 verificações nas três telas que montam o rodapé — vitrine nos dois temas, página legal e painel com sessão aberta —, zero falha. |
| F1.3. Garantias da conta de demonstração | FEITO | `ALLOW_DEV_SEED=1` passou a liberar só a subida do seed em produção: administrador da plataforma e rotinas. A conta de desenvolvimento pede `SEED_DEV_ACCOUNT=1` e a casa `nexus-demo` pede `SEED_DEMO_COMPANY=1`, cada uma declarada de propósito; pedir a conta dev sem a casa agora é recusa com motivo. Prova: `test/garantias-conta-de-demonstracao.test.ts` (9 casos — plano de escrita medido com cliente que anota, resumo sem senha, coerência com o validador de produção, e a recusa contada no banco real) e a varredura estrutural nova em `test/identificadores-fora-do-codigo.test.ts` (7 casos). Decisão em `docs/adr/0005-semente-sem-demonstracao-em-producao.md`. Nada foi rotacionado: §0.1 do dono. |
| F1.4. Bootstrap do administrador da plataforma (`admin:criar`) | FEITO | `npm run admin:criar -w @nexus/api` (`apps/api/prisma/administrador-da-plataforma.ts`) criou o administrador da produção sem passar pela semente: endereço de `SUPER_ADMIN_EMAIL`, senha de `ADMIN_CRIAR_SENHA`, régua de acesso aplicada, nenhuma credencial impressa e nada de `admin@nexus.local` ou `nexus-demo` no caminho. Estados provados por `test/administrador-da-plataforma.test.ts` (16 casos com cliente que anota o plano de escrita + recusa medida no banco real): criar, confirmar papel preservando senha, `ADMIN_CRIAR_RENOVAR_SENHA=1` para reescrever, `ADMIN_CRIAR_PROMOVER=1` para promover conta comum (com senha nova), `ADMIN_CRIAR_REATIVAR=1` para conta desativada, e `OWNER` em toda empresa existente sem criar empresa. Chave nova na guarda de `identificadores-fora-do-codigo.test.ts`. Ordem de subida em `docs/PRODUCAO.md` e decisão em `docs/adr/0006-bootstrap-do-administrador-da-plataforma.md`. Prova de CLI na máquina: três recusas com código 1, criação real, segunda rodada com senha preservada, conta de cliente intocada — e o banco devolveu 359 usuários / 37 empresas / 41 vínculos. |
| F2. Matriz de rotas, G8 opção D (N14) e superfície de ataque | FEITO | Matriz lida do próprio Fastify pelo gancho `onRoute` (`apps/api/test/isolamento-rotas.test.ts`, 9 regras verdes): **106** rotas de negócio (158 eventos, contando os 51 `HEAD` que o Fastify 5 espelha e o `OPTIONS *` do CORS), **10** públicas declaradas uma a uma, **15** de plataforma, **81** de empresa e **0** sem gate; a varredura anônima bate nas **96** não públicas e exige 401 em todas. N14 fechado por construção em `lib/audit.ts:33-41` com a coluna `AuditLog.scope` (migração aditiva `20261013000000_add_escopo_da_auditoria`): as 8 escritas de plataforma perdem o `companyId` e ganham `metadata.empresaDaSessao` como origem; a leitura nova `GET /api/audit/plataforma` nunca devolve `companyId` — devolve o nome da empresa de origem. Tela `/app/auditoria-plataforma` com guarda `user.platform === true` (sem o papel, nenhuma chamada sai do navegador) e painel permanente na Auditoria da empresa explicando a outra trilha. Decisão em `docs/adr/0007-escopo-da-auditoria.md`; `docs/decisoes/G8-administrador-da-plataforma.md` ganhou a seção "O que mudou desde a R3". Portões: API 35 arquivos / 291 casos, web 7 arquivos / 46 casos, typecheck dos dois lados e build limpos; mutação em `audit()` devolve 5 falhas (prova de que as guardas mordem); `tools/verify-auditoria-plataforma.cjs` fecha com 29 verificações e 0 falhas, devolvendo o banco ao estado anterior. Achados novos: N26, N27 e N28 em `docs/AUDITORIA.md`. |
| F3.1. Menu lateral sem página vazia e sem "em breve" | FEITO | Os dois itens `emBreve` saíram de `AdminShell.tsx` e o tipo `NavItem` passou a exigir `to: string`: linha sem destino não compila mais. Junto saíram o ramo `<span>` do mapa, o estado `.admin-nav-item.is-soon`, a etiqueta `.admin-nav-soon` e as regras de colapso e peek correspondentes. A barra ficou em 15 linhas em 6 camadas, todas link de rota que existe. Vermelho primeiro, com as duas linhas ainda na árvore: o teste novo pega o `emBreve` no arquivo e a prova de navegador quebra no `querySelector` do item apagado. Guarda nova: `apps/web/src/test/menu-sem-pagina-vazia.test.tsx` (6 casos). Prova reescrita para o contrato novo: `tools/verify-sidebar.cjs` com **102 checagens, 0 falhas**, clicando as quinze linhas e conferindo endereço e título de cada tela; `tools/verify-cms.cjs` (116) e `tools/verify-parcelamento.cjs` (55) seguem verdes com o menu novo, e `tools/verify-notificacoes.cjs` (85), `tools/verify-configuracoes.cjs` (127) e `tools/verify-rotinas.cjs` (37) foram recapturadas com ele. |
| F3.2. Ordens de Serviço e Gateways & Cobranças | PARADA — falta anexo | As duas telas não voltam ao menu sem estarem prontas, e escrevê-las sem o `PROMPT_IDE_ORDENS_E_COBRANCAS.md` no contexto seria inventar funcionalidade — o que o §1 proíbe. Pedir reanexo antes de executar. |
| F4. Autenticação reforçada (SMTP, verificação, bloqueio por conta, 2FA) | PENDENTE | — |
| F5. Robustez do frontend (Problema C, N7, `ErrorBoundary`, `npm run verify`, code splitting) | PENDENTE | Bundle medido na F1.2: 882,31 kB / 262,77 kB gzip; re-medido na F2: **889,73 kB / 264,73 kB gzip**, com o aviso de chunk acima de 500 kB nos dois. |
| F6. Docker, compose com 3306 fechado e `docs/PRODUCAO.md` | PENDENTE | Nenhum `Dockerfile` versionado. |
| F7. LGPD, `SECURITY.md` e licença (só relatar) | PENDENTE | — |
| F8. CI, dependabot, `postinstall` do Prisma (N9), clone limpo, `npm audit`, cobertura, lint, galeria (N13) | PENDENTE | `package-lock.json` não está entre os 393 arquivos rastreados — reproduzibilidade de clone depende de resolver isso nesta fase. |
| F9. Prontidão e pacote de revisão | PENDENTE | — |

### Portões medidos nesta rodada (2026-10-12, F0/F1.1)

```
npm run typecheck   ok (api + web, sem saída)
npm run build       ok (881,04 kB / 262,35 kB gzip; aviso de chunk >500 kB continua)
npm test            API 31 arquivos / 250 casos e web 5 / 27 — zero falha, zero skip (com o MySQL religado
                    pelo dono; antes da F0 fechar, a suíte esteve NÃO VERIFICADO — ver N18)
guarda de caracteres  4 passed (4), sem banco — roda isolada com npx vitest run
caracteres proibidos  0 em 284 arquivos de texto, 0 em mensagens de commit, 0 no patch pendente, 0 no README remoto
BOM                 nenhum arquivo com BOM
CRLF                nenhum arquivo com CRLF
avanço direto       SIM depois do merge 772cc77 — push 2cfa2e9..772cc77 publicado e conferido no ls-remote
```

### Portões medidos na F1.2 (2026-10-12, rodapé único)

```
npm run typecheck   ok (api + web, sem saída)
npm run build       ok (882,31 kB / 262,77 kB gzip de JS e 387,27 kB / 59,26 kB de CSS; aviso de chunk >500 kB continua, é trabalho da F5)
npm test            API 31 arquivos / 250 casos e web 6 / 39 — zero falha, zero skip
                    (web era 5 / 27 antes da fase; os 12 casos novos são os do rodapé)
prova vermelha      Failed to resolve import "../components/layout/AppFooter" (antes de o componente existir)
navegador           vitrine 1440x900 nos dois temas e painel logado pela conta fictícia de captura: texto,
                    links, fundo transparente e "Serviço operacional" vindo do GET /api/health real
contraste medido    --text-2: 8,64:1 (noite) e 5,50:1 (dia) sobre --bg; selo sobre --surface-2: 7,00:1 / 5,26:1
                    --text-3, do rodapé antigo: 4,02:1 / 3,14:1 — reprovado nos dois temas
```

### Portões medidos na F1.3 (2026-10-12, garantias da conta de demonstração)

```
npm run typecheck   ok (api + web, sem saída)
npm run build       ok — inalterado por esta fase: 882,31 kB / 262,77 kB de JS e 387,27 kB / 59,26 kB de CSS
                    (o aviso de chunk >500 kB continua, é trabalho da F5)
npm test            API 32 arquivos / 260 casos e web 6 / 39 — zero falha, zero skip
                    (API era 31 / 250 na F1.2; o arquivo novo traz 9 casos e o guarda R2, +1)
prova vermelha      com o teste escrito antes de qualquer mudança no seed: Test Files 1 failed /
                    Tests 6 failed | 3 passed (9). Replay do vermelho devolvendo só o seed ao HEAD
                    (.env.example já corrigido): 5 failed | 4 passed, com
                    "TypeError: empresaDeDemonstracao is not a function" e
                    "AssertionError: expected [ 'nexus-demo' ] to deeply equal []" — o seed de produção pedia a
                    casa de demonstração. Verde final do arquivo: 9 passed (9)
codificação         400 arquivos rastreados (398 + os dois novos), 290 de texto: BOM 0, CRLF 0, sem quebra final 0
caracteres          0 ocorrências de alfabeto não latino no fonte, no teste, no ADR e nas mensagens de commit
                    (guarda permanente test/caracteres-permitidos.test.ts na suíte da API)
seed real           a recusa de produção continua antes da primeira consulta: contagem de usuários e de
                    empresas idêntica antes e depois do semear() recusado
```


### Portões medidos na F1.4 (2026-10-12, bootstrap do administrador da plataforma)

```
npm run typecheck   ok (api + web, sem saída)
npm run build       ok — inalterado por esta fase: 882,31 kB / 262,77 kB de JS e 387,27 kB / 59,26 kB de CSS
                    (a fase não toca o painel; o aviso de chunk >500 kB continua, é trabalho da F5)
npm test            API 33 arquivos / 276 casos e web 6 / 39 — zero falha, zero skip
                    (API era 32 / 260 na F1.3; o arquivo novo traz 16 casos)
prova vermelha      primeiro com o teste escrito e o módulo ausente: Test Files 1 failed / no tests
                    (Cannot find module '../prisma/administrador-da-plataforma'). Depois, o vermelho real:
                    aplicada a versão ingênua do script (cria sem olhar ambiente), 15 failed (15), com
                    "expected [] to deeply equal [ StringContaining "senha" ]" na régua e, no caso central,
                    "promise resolved { acao: 'upsert', email: 'administrador@exemplo.test',
                    empresasComoOwner: 37 } instead of rejecting" — o script ingênuo criou a conta e virou
                    OWNER das 37 empresas do banco de desenvolvimento (N24). Desfeito em seguida: contagens
                    voltaram a 359 usuários / 37 empresas / 41 vínculos. Verde final do arquivo: 16 passed (16)
prova de CLI        ADMIN_CRIAR_SENHA ausente -> recusa nomeando a chave, código 1; senha "fraca" -> recusa
                    com a regra de acesso, código 1; SUPER_ADMIN_EMAIL=bootstrap@exemplo.test com senha forte
                    -> acao 'criar', senha 'definida agora', empresasComoOwner 37, hash $2a$12$ de 60
                    caracteres conferido no banco (compareSync verdadeiro). Segunda rodada -> acao
                    'confirmar-papel', senha 'preservada', mesma hash. Rodada apontando para uma conta de
                    cliente existente -> recusa pedindo ADMIN_CRIAR_PROMOVER, conta continuou com
                    platformRole null. A conta fictícia da prova foi apagada depois.
codificação         404 arquivos rastreados, 294 de texto: BOM 0, CRLF 0, sem quebra final 0
caracteres          0 ocorrências de alfabeto não latino no fonte novo, nos testes, no ADR-0006, no
                    PRODUCAO.md, nas mensagens de commit e no patch publicado
```


## Bloco A — segurança e isolamento

| Tarefa | Situação | Prova |
|---|---|---|
| A0. Preparação e linha de base | FEITO | Cobertura medida e registrada em `docs/AUDITORIA.md` (seção F): linha de base 84,15% de instruções / 70,4% de ramificações antes do bloco; 85,57% / 72,96% / 83,93% / 88,29% agora, com 28 arquivos e 230 testes. Script `npm run test:coverage` na raiz e na API. |
| A1. Hierarquia de papéis centralizada | FEITO | `lib/rbac.ts` com `podeAtribuirPapel`; `test/rbac-hierarquia.test.ts` percorre os sete casos exigidos (ADMIN cria/rebaixa/promove → 403, ADMIN em outro ADMIN → 403, MANAGER e STAFF em todas as portas de papel → 403, último OWNER rebaixado → 409, ADMIN cria MANAGER/STAFF → 201). |
| A2. Varredura de notificações não escolhe a empresa | JÁ CORRIGIDO | Fechado na Fase 1a da auditoria comercial. `varreduraSchema` não tem `companyId`; `POST /notifications/scan` usa sempre `ctx.companyId` e exige `settings:write`. Prova: `test/intrusao.test.ts` ("varredura: o scan de B ignora companyId no corpo e não gera aviso na empresa de A") e `test/notifications.test.ts` (atendente bloqueado, auditoria registrada na empresa de quem chamou). A varredura global continua só no agendador (`varreduraGlobal`), sem porta HTTP. |
| A3. Estoque atômico, sem venda a descoberto | FEITO | Correção da Fase 3a/3b: baixada com `updateMany` + `count === 1` dentro da transação, mudança de status com o status esperado no `where`, `IN`/`OUT` por incremento no banco. Nesta rodada entraram as duas provas que faltavam no contrato: `test/oversell.test.ts` passou de 5 para 7 casos — "mesmo produto em duas linhas (6+6) sobre saldo 10 → 400, saldo 10, zero movimentação e zero venda" e "depois de entrada, saída e recusa o saldo é exatamente a conta do razão". As corridas (`Promise.all`) já cobriam duas confirmações da mesma nota, duas vendas no mesmo saldo, receber compra duas vezes e dois OUT manuais. |
| A4. O refresh token lembra a empresa ativa | FEITO | Migration `20261012000000_add_refresh_token_empresa` (`company_id` nullable com índice, bloco `-- Reversão:` escrito dentro; `prisma migrate status` atualizado). `issueTokens` grava a empresa e `refresh` reemite para ela, com fallback declarado. Prova: `test/sessoes-empresa.test.ts` — permanecer na B depois de renovar duas vezes, perder o vínculo com B e cair na A, B inativa, nenhuma empresa ativa (403) e token legado sem empresa. |
| A5. Desativou conta ou empresa, perde o acesso | FEITO | `resolveCompanyContext` confere `user.active` e `company.active` na mesma consulta e responde 403. Prova: `test/desativacao-acesso.test.ts` (token em uso cai ao desativar, empresa desativada derruba a todos, reativar devolve sem login novo). |
| A6. Sessões e IPs só da empresa ativa | FEITO | `listSessions(companyId, actorRole)` filtra pelo `company_id` do token, ignora legado sem empresa e mostra o IP só para OWNER/ADMIN. Revogar sessão de outra empresa responde 404. Prova: `test/sessoes-empresa.test.ts` (listas de A e B sem interseção, revogação cruzada 404 e mesma empresa 200, MANAGER com `origem: null`) e `test/intrusao.test.ts` atualizado para o novo 404. |
| A7. `forgot-password` sem queda de sessão e sem vazar token | FEITO | A revogação saiu da solicitação e ficou só no `resetPassword`; o código volta no HTTP apenas com `AUTH_EXPOSE_RESET_TOKEN=1` **e** ambiente não-produtivo. Prova: `test/auth-flows.test.ts` — pedir recuperação não invalida o refresh existente, sem a flag o corpo não traz token, e-mail existente e inexistente respondem igual, reset válido derruba as sessões. |
| A8. Seed seguro | FEITO | `prisma/seed.ts` reescrito como funções exportáveis (`semear`, `errosDoSeed`, `criaContaDev`), aborta em produção sem `ALLOW_DEV_SEED`, conta dev só fora de produção com `SEED_DEV_PASSWORD`, e-mail global por `SUPER_ADMIN_EMAIL` com padrão apenas fora de produção, resumo sem senha. Prova: `test/seed-seguro.test.ts` (6 casos, incluindo o teste que lê o fonte do seed e recusa a senha fixa de volta) e o seed real rodando: saída `contaDev: ... senha definida via SEED_DEV_PASSWORD`. |
| A9. Ambiente de produção que recusa subida errada | FEITO | `src/config/producao.ts` com a validação em função pura + `env.ts` chamando-a quando `NODE_ENV=production`. `TRUST_PROXY` validado (0 / 1 / até 31 saltos) e aplicado no Fastify como função de confiança equivalente. Prova: `test/validador-de-producao.test.ts` (19 casos, incluindo o processo filho que importa `env.ts` e derruba a subida sem escrever o segredo no stderr). |
| A10. Regex sem barra invertida e varredura de codificação | FEITO | O `split(/\s+/)` do cadastro está corrigido e a varredura do repositório inteiro (`ts, tsx, js, cjs, mjs, css, html, sql, prisma, json, md`) não achou nenhum outro `/s+ /d+ /w+ /b` sem escape — o único texto com esse padrão é a linha do CHANGELOG que documenta o defeito. Achado extra da mesma varredura: a classe de acentos combináveis do `slugify` estava escrita com caracteres invisíveis no fonte, agora escapada. Prova: teste do "Marcos Silva" em `test/auth-flows.test.ts` + pente de BOM/CRLF da seção "Portões". |
| A11. Detecção de reuso do refresh token | JÁ CORRIGIDO | Fechado na Fase 2 da auditoria comercial. `refresh` trata token usado **e** revogado como reuso, derruba a família de sessões do usuário e audita `auth.refresh_reuse`; o cadeado do frontend (`apps/web/src/lib/api.ts`) segue tratando as duas renovações simultâneas sem derrubar o usuário. Prova: `test/seguranca.test.ts` — reapresentar token rotacionado devolve 401, zera as sessões vivas e deixa exatamente uma trilha de auditoria; logout normal revoga só a sessão que saiu. |

## Bloco B — dependências

| Tarefa | Situação | Prova |
|---|---|---|
| B1. Corrigir o `npm audit` | PENDENTE | `npm audit` nesta rodada: 3 high, todas no mesmo caminho — `deepmerge-ts <8.0.0` (GHSA-ggr8-5vv4-36mx) puxado por `@prisma/config` → `prisma`. Não existe versão corrigida dentro do Prisma 6.19 que a base usa; o `audit fix --force` está proibido pelo contrato e trocaria o major do Prisma sem a validação da Fase 10. Nada de código de produção depende do `deepmerge-ts`. |

## Bloco C — qualidade e testes

| Tarefa | Situação | Prova |
|---|---|---|
| C1. Cobertura e portão de qualidade | PARCIAL | A medição existe (A0). O portão — threshold por arquivo e quebra de build abaixo dele — depende do CI da Fase 7; sem ele, um threshold alto hoje só quebraria o build sem nada a corrigir. Cobertura atual: 85,57% instruções, 72,96% ramificações, 83,93% funções, 88,29% linhas. Pontos fracos conhecidos: `reports.service.ts` 53,77%, `cron.runner.ts` 0%, `companies.service.ts` 70,37%, `finance.service.ts` 75%. |
| C2. Testes de intrusão A×B em todas as rotas | FEITO | `test/intrusao.test.ts` percorre as portas de negócio com identidades da empresa B (14 casos) e espera 404/403/400 em cada uma. Atualizado nesta rodada para a nova resposta da sessão (A6). |
| C3. Integridade financeira e de dinheiro | FEITO | Fase 3d e 3e: `test/dinheiro-decimal.test.ts`, `test/parcelamento.test.ts`, `test/finance.test.ts` — centavo do banco ao JSON, invariante total = soma das linhas, parcela que fecha o centavo. |

## Bloco D — CI/CD e infraestrutura

| Tarefa | Situação | Prova |
|---|---|---|
| D1. Pipeline de CI que bloqueia merge | PENDENTE | Nenhum `.github/` ou arquivo de pipeline no repositório. Fase 7. |
| D2. Docker e execução reproduzível | PENDENTE | Sem `Dockerfile`/`compose`. Fase 8. |
| D3. Observabilidade e operação | PARCIAL | `/api/health` responde e é lido pelo modo de manutenção; não há checagem de prontidão separada, store de rate-limit compartilhado (o limite atual é por processo) nem Redis. Fase 8. |

## Bloco E — frontend

| Tarefa | Situação | Prova |
|---|---|---|
| E1. Desempenho e limpeza | PENDENTE | O build desta rodada ainda avisa: `dist/assets/index.js` 880 kB (262 kB gzip) num único chunk. Code-splitting é Fase 7. |
| E2. Sessão e tratamento de erros | BLOQUEADO POR DECISÃO | O contrato põe a migração do refresh token de `localStorage` para cookie `httpOnly; Secure; SameSite=Strict` como decisão do dono. Ver `docs/decisoes/` — enquanto não houver resposta, o cadeado atual (`apps/web/src/lib/api.ts`) continua sendo o que protege a renovação. |

## Bloco F — LGPD e auditoria

| Tarefa | Situação | Prova |
|---|---|---|
| F1. Base de conformidade | PENDENTE | Aceite de termos com versão/data/IP, exportação e apagamento de dados do titular e política de retenção de log ainda não existem. Textos jurídicos não serão inventados, conforme o contrato. |

## Bloco G — itens que dependem do dono

| Tarefa | Situação | Prova |
|---|---|---|
| G1. Envio de e-mail (SMTP) | BLOQUEADO POR DECISÃO | `docs/decisoes/G1-envio-de-email.md` |
| G2. Cobrança, planos e assinatura | BLOQUEADO POR DECISÃO | `docs/decisoes/G2-cobranca-e-assinatura.md` |
| G3. Fiscal brasileiro (NF-e) | BLOQUEADO POR DECISÃO | `docs/decisoes/G3-fiscal-nfe.md` |
| G4. Cadastro sem verificação de e-mail | BLOQUEADO POR DECISÃO | `docs/decisoes/G4-cadastro-aberto.md` |
| G5. Hospedagem, domínio, HTTPS e backup | BLOQUEADO POR DECISÃO | `docs/decisoes/G5-hospedagem-e-backup.md` |
| G6. Licença do repositório | BLOQUEADO POR DECISÃO | `docs/decisoes/G6-licenca.md` |
| G8. Administrador da plataforma é OWNER de todas as empresas | PARCIAL — D entregue, A/B/C aguardam | `docs/decisoes/G8-administrador-da-plataforma.md` + `docs/adr/0007-escopo-da-auditoria.md`. As três portas de auto-OWNER (`auth.service.ts:279-293`, `companies.service.ts:34-47`, `seed.ts:107-115`) continuam como o dono decidiu, e a parte tecnicamente indefensável foi fechada na F2: a trilha da plataforma existe, separada por construção, com tela própria e aviso na auditoria do tenant. Falta a parte A (política de privacidade e contrato dizendo a regra) e a decisão de migrar para B (break-glass), ambas com o dono.
| G7. Senha do administrador publicada em captura, com histórico | BLOQUEADO POR DECISÃO | Achado N1 de `docs/AUDITORIA.md`: `docs/screenshots/02-login.png` mostra a senha real revelada, está na galeria do `README.md` e já está no `origin/main`. Exige (a) trocar a senha, (b) recapturar sem o olho ligado e tirar o clique dos dois `tools/shoot*.cjs`, (c) decidir se o histórico é reescrito. O push desta rodada ficou parado por causa disso. |

Nenhum adapter de terceiros foi escrito: o contrato manda entregar porta + adaptador falso +
documento de decisão **depois** da escolha do dono, e proíbe inventar integração sem credencial.

## Bloco H — limpeza e documentação

| Tarefa | Situação | Prova |
|---|---|---|
| H1. Repositório e documentação fiéis ao código | PARCIAL | `README.md`, `CHANGELOG.md` e `docs/AUDITORIA.md` atualizados a cada fase; `docs/STATUS-AJUSTES.md` criado nesta rodada. Faltam o status final de cada achado individual da auditoria e a sugestão de versão/tag, ambos no fim do contrato. |

## Portões desta rodada (fim do Bloco A)

```
npm run typecheck   ok (api + web, sem saída)
npm run build       ok (api tsc + web vite build)
npm test            28 arquivos, 230 testes, zero falha, zero skip
npm run test:coverage  85,57% / 72,96% / 83,93% / 88,29%
BOM                 nenhum arquivo com BOM
CRLF                nenhum arquivo com CRLF
sem \n final        nenhum arquivo
npm audit           3 high (Bloco B, PENDENTE)
```

Repetidos depois de tirar o texto do cabeçalho (2026-10-11): typecheck e build limpos, a suíte nos mesmos
28 arquivos / 230 testes, e `tools/verify-sidebar.cjs` em 88 checagens sem erro de console no navegador. O
**push desta rodada está segurado** pelo achado N1 (`docs/AUDITORIA.md`): a senha do administrador está
publicada nos pixels de uma captura que já está no `origin/main`, e o prompt de fechamento manda parar e
reportar antes de publicar qualquer coisa por cima disso.
