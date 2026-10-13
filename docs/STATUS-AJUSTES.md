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
| F0. Retomar e publicar os commits da rodada de segurança | FEITO | Portão de avanço direto reaberto por decisão do dono: `git merge origin/main` (commit `772cc77`, sem force, sem rebase, sem reescrever histórico) com o `README.md` da árvore local vencendo o conteúdo — o do GitHub trazia o e-mail pessoal de volta na linha 633. Depois do merge: 917 linhas, zero marca de conflito, nenhuma ocorrência de domínio pessoal. Push `2cfa2e9..772cc77` e prova `git ls-remote origin HEAD` = `772cc77559bf9f21a1373af5fc9a2f7cfb282ecc` = `git rev-parse HEAD`. Com o MySQL religado pelo dono, a suíte volta a ser medida: API 31 arquivos / 250 casos e web 5 / 27, zero falha. || F1.1. Eliminar caracteres não latinos e instalar a guarda permanente | FEITO | Varredura em quatro escopos (284 arquivos de texto, histórico inteiro de mensagens de commit, patch dos commits pendentes, README do `origin/main`): único achado foram 4 ocorrências de U+03A3 em `docs/AUDITORIA.md:462`, `:473` e `:527`, reescritas como "soma das linhas", "soma das parcelas" e `soma(ENTRADAS) − soma(SAIDAS)`. Guarda: `apps/api/test/caracteres-permitidos.test.ts` (4 casos, 35 scripts por propriedade Unicode, varre `--cached --others --exclude-standard` e confere a mensagem do `HEAD`). Vermelho mostrado duas vezes — com o sigma na árvore (`Array(4)`) e com arquivo temporário de prova (`docs/_prova-caractere-proibido.md:3 U+4E00`, apagado em seguida) — e verde final `4 passed (4)`. |
| F1.2. Rodapé único (`AppFooter` + `brand.ts`) | PENDENTE | O crédito hoje está em `apps/web/src/components/layout/AdminShell.tsx:364` e repetido na vitrine. |
| F1.3. Garantias da conta de demonstração | PENDENTE | `test/seed-seguro.test.ts` já cobre parte; falta o pacote da fase. |
| F1.4. Bootstrap do administrador da plataforma (`admin:criar`) | PENDENTE | Não existe o script na raiz nem em `@nexus/api`. |
| F2. Matriz de rotas, G8 opção D (N14) e superfície de ataque | PENDENTE | `isolamento-rotas.test.ts` não existe. |
| F3. Menu sem "em breve" + Ordens de Serviço e Gateways & Cobranças | PENDENTE — e falta anexo | Restam exatamente os dois itens `emBreve` em `AdminShell.tsx:57` e `:65`. O `PROMPT_IDE_ORDENS_E_COBRANCAS.md` não está no contexto desta sessão: pedir reanexo antes de executar a F3.2. |
| F4. Autenticação reforçada (SMTP, verificação, bloqueio por conta, 2FA) | PENDENTE | — |
| F5. Robustez do frontend (Problema C, N7, `ErrorBoundary`, `npm run verify`, code splitting) | PENDENTE | Bundle medido novamente nesta rodada: 881,04 kB / 262,35 kB gzip, com o aviso de chunk acima de 500 kB. |
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
| G8. Administrador da plataforma é OWNER de todas as empresas | BLOQUEADO POR DECISÃO | `docs/decisoes/G8-administrador-da-plataforma.md` — medido na R3: três portas de auto-OWNER (`auth.service.ts:279-293`, `companies.service.ts:34-47`, `seed.ts:107-115`), sem trilha de auditoria separada. Recomendação A+D agora, B como destino.
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
