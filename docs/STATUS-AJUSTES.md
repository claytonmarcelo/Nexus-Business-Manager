# Status dos ajustes — prompt de mercado

Tabela de acompanhamento exigida pelo item A0 do prompt de mercado. Uma linha por tarefa do
contrato, com a situação e a prova que a sustenta.

Situações possíveis: `FEITO` (corrigido e comprovado por teste nesta rodada), `JÁ CORRIGIDO`
(o repositório já fazia, e a prova disso está apontada), `PENDENTE` (falta executar),
`BLOQUEADO POR DECISÃO` (depende de resposta do dono — ver `docs/decisoes/`),
`NÃO VERIFICADA` (não foi possível comprovar).

Atualizada em 2026-10-11, no fim do Bloco A, de novo na rodada em que o cabeçalho do painel perdeu o texto
da marca (achados N1 a N5 em `docs/AUDITORIA.md`), e de novo em 2026-10-13, no encerramento da F3.2 Parte 2
(cobranças manuais — achados N40 a N52). A abertura da rodada F4 → F9, no mesmo dia, registrou o achado N53.
A linha das fases ganhou a T4 em 2026-10-14, com a F5 inteira publicada: os achados N63 a N66 entraram na
auditoria e N7, N51 e N62 saíram dela. A abertura da T5, no mesmo dia, fechou o N65: a pilha de prova passou a
viver na 3002/5174 e a linha da F6 deixou de ser `PENDENTE`.

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
| F3.2 Parte 1. Ordens de Serviço | FEITO | Backend no `3a32119`: três tabelas na migração aditiva `20261013010000_add_ordens_de_servico` (banco físico medido em 31 tabelas, 30 models no schema), recurso `service_order` na matriz de permissões e seis rotas atrás do gate de sessão, com 35 casos em `apps/api/test/ordens-de-servico.test.ts`. Frontend neste lote: `/app/ordens-de-servico` com duas abas, oito indicadores conferidos contra o resumo do servidor, busca, filtro, ordenação e paginação no servidor, documento para impressão, tabela que vira cartão em 390px e alcance de STAFF aplicado no serviço — o menu voltou a ter **16 linhas em 6 camadas**. As quatro regras do módulo (estoque na conclusão, estorno de OWNER/ADMIN, número por empresa, dinheiro em centavo no servidor) estão em `docs/adr/0008-ordem-de-servico-baixa-estoque-na-conclusao.md`. Guarda: 10 casos em `apps/web/src/test/ordens-de-servico.test.tsx` e `tools/verify-ordens-de-servico.cjs` com **102 verificações, 0 falhas** — saldo lido no banco antes e depois de cada movimento, os oito indicadores batidos contra a API, sessão de um atendente de prova (403 nas duas portas de escrita, sem aba de criação, sem botão de cancelar, sem chamada à equipe, sem caixa nativa) e o banco devolvido no `finally`. `tools/verify-sidebar.cjs` reexecutado com a linha nova: **103 checagens, 0 falhas**. Portões: typecheck dos dois lados, build `914,87 kB / 271,50 kB gzip`, API 36 arquivos / 326 casos e web 9 / 62, zero falha e zero skip. Achados novos: N33 a N39 em `docs/AUDITORIA.md`. |
| F3.2 Parte 2. Cobranças manuais e catálogo de gateways | FEITO | O dono respondeu "pode seguir pra parte 2" em 2026-10-13, e a linha 133 do anexo — o diálogo pedindo data, forma e observação — foi cumprida. Backend no `9f1dd88`: tabela `charges` na migração aditiva `20261013020000_add_cobrancas_manuais` (banco físico medido em 32 tabelas, 31 models e 21 enums no schema), recurso `charge` na matriz de permissões, seis rotas de cobrança mais duas de gateway atrás do gate de sessão, adaptador `MANUAL` único e catálogo com os três provedores indisponíveis. Frontend neste lote: `/app/cobrancas` com três abas — o carnê, a nova cobrança e os gateways —, oito indicadores conferidos contra o resumo do servidor, busca, filtros, ordenação e paginação no servidor, recebimento com **data, forma e observação**, cancelamento com motivo escrito, documento e recibo para imprimir, tabela que vira cartão em 390px, botão "Gerar cobrança" dentro da venda e da ordem de serviço, e o menu de **17 linhas em 6 camadas**. Regras em `docs/adr/0009-cobranca-manual-receita-unica-e-vencida-lida.md`. Guarda: 24 casos em `apps/api/test/cobrancas.test.ts`, 15 em `apps/web/src/test/cobrancas.test.tsx` e `tools/verify-cobrancas.cjs` com **137 verificações, 0 falhas** em duas corridas seguidas — os dois pagamentos disparados juntos para conferir um só lançamento no caixa, o recebimento retroagido conferido na cobrança, no lançamento e no recibo, os 403 do atendente nas três portas de escrita, `window.print` interceptado e o banco devolvido no `finally`. `tools/verify-sidebar.cjs` reexecutado com a linha nova: **104 checagens, 0 falhas**; `tools/verify-ordens-de-servico.cjs` recontado depois de a barra mudar: **103, 0 falhas** (N50). Portões do encerramento, refeitos na árvore final: typecheck dos dois lados, build `946,30 kB / 278,06 kB gzip`, API 37 arquivos / 350 casos em 341,60 s e web 10 arquivos / 77 casos em 8,73 s, zero falha e zero skip; as três provas de navegador reexecutadas verdes (137, 104 e 103). Matriz de rotas recontada pela regra 4 de `isolamento-rotas.test.ts`: **120** rotas de negócio — as 106 medidas na F2, mais 6 das ordens de serviço e 8 de cobranças e gateways. Achados novos: N40 a N52 em `docs/AUDITORIA.md`. Nada de integração inventada: as três colunas de credencial ficam nulas por construção, não aparecem em resposta alguma e nenhuma chamada de saída existe; o G2 (`docs/decisoes/G2-cobranca-e-assinatura.md`) segue pedindo a palavra do dono. |
| F4. Autenticação reforçada (SMTP, verificação, bloqueio por conta, 2FA) | FEITO | Entregue na T3 da rodada de continuação (2026-10-13), com as decisões D1, D2 e D3 do dono aplicadas sem nova pergunta. Porta `MailerPort` com adaptador SMTP (`nodemailer` 10.1.0), console fora de produção e caixa em memória na suíte; verificação de cadastro atrás de `REQUIRE_EMAIL_VERIFICATION` com tela pública `/verificar-e-mail`; TOTP com segredo cifrado em repouso (AES-256-GCM, `otpauth` 9.5.2) e dez códigos de recuperação só em hash; bloqueio por conta sem diferença mensurável; destino pós-login só de caminho interno. A superfície foi de 120 para **129 rotas**, a suíte para **46 arquivos / 434 casos** na API e **12 / 87** no web. Achados N57 a N62 em `docs/AUDITORIA.md`; a tela nova sem teste (N62) e o chunk de 961 kB (D8) ficam para a T4. |
| F5. Robustez do frontend (Problema C, N7, `ErrorBoundary`, `npm run verify`, code splitting) | FEITA | Entregue na T4 da rodada de continuação (2026-10-14), item por item, com a medição antes e depois de cada mudança. O Problema C saiu da tela de entrada (`privacidade-do-login.test.tsx` 15 casos + `verify-privacidade-login.cjs` **44 verificações em Chrome e Edge, 0 falhas**); N51/P14 virou guarda de resposta atrasada nas cinco telas de lista (`resposta-atrasada.test.tsx` 5 casos); N7 virou `data-bs-theme` sincronizado com o tema do painel (`tema-sincronizado.test.tsx` 6 casos); `ErrorBoundary` na raiz e por rota com `registro-erros.ts` (`limite-de-erro.test.tsx` 9 casos); `npm run verify` atravessa **63 telas em 3 larguras com 0 problemas**; a varredura de placeholder não encontrou nenhum (`zero-placeholder.test.ts` 3 casos); N62/P17 fechou com as duas telas da F4 montadas em jsdom e provadas no navegador (`verify-verificacao-e-2fa.cjs` **56 verificações, 0 falhas**, banco devolvido a zero). Bundle: era **964,31 kB / 283,61 kB gzip** num chunk só; virou **37 pedaços**, com `index` em **354,85 kB / 121,62 kB gzip** e o maior pedaco de rota em **286,34 kB / 83,52 kB** (Agenda, FullCalendar) — o aviso de chunk acima de 500 kB desapareceu do build. Régua de acessibilidade instalada (`verify-acessibilidade.cjs`, **22 telas / 649 controles / 22 verificações / 0 falhas**) e decisão registrada em `docs/adr/0014` e `docs/adr/0015`. Suíte: **API 47 arquivos / 437 casos** e **web 18 / 140**, zero falha e zero skip. |
| F6. Docker, compose com 3306 fechado e `docs/PRODUCAO.md` | EM ANDAMENTO | Três tarefas da F6 estão FEITAS e registradas na tabela da rodada. T5.0: a pilha de prova vive na 3002/5174 e a porta do dono (3001/5173) deixou de ser disputada. T5.1: `Dockerfile.api`, `Dockerfile.web`, `docker-compose.yml` e a régua `tools/verify-docker.cjs` existem, o banco e a API não publicam porta nenhuma, o painel é a única porta do host, e `docs/PRODUCAO.md` foi reescrito com números medidos. T5.2: o backup do banco da pilha existe como `deploy/backup-mysql.cjs`, a restauração como `deploy/restaurar-mysql.cjs`, e a prova de que um restaura o outro como `tools/verify-backup.cjs` — 56 verificações, 0 falhas — com o roteiro na seção 8 de `docs/PRODUCAO.md` e a decisão no ADR-0019. T5.3: a entrega de e-mail saiu de dentro do request — `apps/api/src/lib/mail/fila.ts` é a fila de memória do processo com retentativa, recuo, timeout e teto, os três chamadores entregam um código e o worker fala com o SMTP (7,43 ms de resposta medida contra os 600 ms do entregador injetado; N58 fechado, ADR-0020, seção 10 de `docs/PRODUCAO.md`). O que falta da F6: sino que chama alguém (N59) e porta administrativa de confirmação (N61). |
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
avanço direto              SIM depois do merge 772cc77 — push 2cfa2e9..772cc77 publicado e conferido no ls-remote
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
codificação                400 arquivos rastreados (398 + os dois novos), 290 de texto: BOM 0, CRLF 0, sem quebra final 0
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
codificação                404 arquivos rastreados, 294 de texto: BOM 0, CRLF 0, sem quebra final 0
caracteres          0 ocorrências de alfabeto não latino no fonte novo, nos testes, no ADR-0006, no
                    PRODUCAO.md, nas mensagens de commit e no patch publicado
```


## Rodada F4 → F9 — prompt de continuação de 2026-10-13

O dono mandou executar T0 → T8 de uma vez, sem esperar "pode seguir", e colou na conversa o contrato
permanente de execução (`REGRAS-DA-IDE.md`). Desta linha para frente os registros seguem o formato da
seção 7 do contrato: `<ID> | SITUAÇÃO | commit | evidência | achados`.

**Divergência (N53)**: `.ia/` não está no repositório e os subitens do prompt mestre (F4.1 a F4.7,
F5.1 a F5.7) não são citáveis. Numeração adotada: tarefa do prompt de continuação (`T1`..`T8`) + achado
(`N...`) + decisão do dono (`D1`..`D14`).

| Tarefa | Situação | Commit | Evidência | Achados |
|---|---|---|---|---|
| T0. Retomada: ler o contrato, conferir a árvore, registrar o ponto de partida | FEITA | base publicada `0d80215`; o commit que traz esta linha fecha a T0 | `git status --porcelain` vazio; `git rev-parse HEAD` = `git ls-remote origin HEAD` = `0d802154461cc8ce53018131ea6e3250a24c4986`; tabela F0→F9 lida em `docs/STATUS-AJUSTES.md:32-37` com F4, F5, F6, F7, F8 e F9 em `PENDENTE`; `ls .ia` sem diretório | N53 |
| T1. Banco de teste separado, com as provas fora do banco de desenvolvimento (D6) | FEITA | dois commits desta rodada; o que traz esta linha fecha a T1 | Vermelho medido antes da mudança: `apps/api/test/banco-de-teste-separado.test.ts` caiu com `expected { users: 542, companies: 46, ... } to deeply equal { users: 541, companies: 45, ... }` — a suíte escrevia no banco de desenvolvimento. Verde depois: suíte inteira no banco de prova, e as duas provas de navegador regravadas (`tools/verify-ordens-de-servico.cjs` 103 checagens / 0 falhas, `tools/verify-notificacoes.cjs` 85 / 0) com `diff` das medições do banco de desenvolvimento **sem saída** e o banco de prova crescendo (+5 sessões, +17 auditorias, +4 movimentações). Conferência vermelha contra servidor de desenvolvimento (HTTP 401 com a instrução do comando), verde contra `npm run dev:api:teste`. Backup do banco de desenvolvimento feito antes de qualquer limpeza, fora do repositório (`mysqldump`, ~14 MB). Investigação de origem pedida pela D6: das 45 empresas do banco de desenvolvimento, 42 com nome do padrão dos helpers, 2 casas de demonstração, 1 com nome digitado; uma linha órfã deixada por prova listada e apagada (`542 → 541`) | N54, N55 |
| T2. N32 e P11: a casa do login com regra determinística (D5) e o motivo obrigatório nos movimentos (D4) | FEITA | dois commits desta rodada (backend com a lembrança, frontend com o diálogo); o que traz esta linha fecha a T2 | Vermelho medido dos dois lados antes do verde, com o fonte novo guardado e reposto em seguida: `apps/api/test/empresa-lembrada.test.ts` contra o `auth.service.ts` do HEAD caiu **6 de 7** — `expected 'aa-empresa-8g5d76' to be 'zz-empresa-8g5d76'` no desempate e `expected 'xx-casa-8g67x7-c' to be 'yy-casa-8g67x7-b'` na renovação sem empresa gravada; os três casos novos do navegador caíram contra o frontend do HEAD (`3 failed | 24 passed`), com `getByLabelText("Motivo do cancelamento")` sem achar campo nenhum. Verde: 7/7, 27/27 nas duas telas, suíte inteira **API 39 arquivos / 361 casos** e **web 10 / 79** sem falha nem skip. Migration aditiva `20261013030000_add_empresa_lembrada` aplicada nos dois bancos. Medição da consequência, no banco de prova: o administrador de prova tem três vínculos, o mais antigo é "Nexus Demo" e a ordem por uuid entregaria "Empresa-1791925362473-5-134714" primeiro — a API hoje devolve "Nexus Demo"; a conta fixa de capturas tem **um** vínculo, então o cabeçalho das telas do README continua "Demonstracao (minha empresa)", conferido por login real e não por suposição. Provas de navegador refeitas: `verify-ordens-de-servico.cjs` **107 checagens / 0 falhas** (eram 103) e `verify-cobrancas.cjs` **137 / 0**, com o clique vazio barrado antes da rede e o motivo da tela aparecendo no histórico. Banco de desenvolvimento medido depois da rodada inteira: `usuarios=541 empresas=45 vinculos=49 sessoes=2186 auditorias=67722 tabelas=32` — os mesmos números da T1, linha por linha. As cinco capturas de cobrança que a prova regravou foram descartadas uma a uma: mesmas pixels | N32 e N36 fechados; N56 |
| T3. F4 inteira: entrega de e-mail, verificação de cadastro, segundo fator, bloqueio por conta, destino seguro e as guardas re-aprovadas (D1, D2, D3) | FEITA | os commits desta tarefa; o que traz esta linha fecha a T3 | Sete arquivos novos de teste na API (`recuperacao-por-email`, `verificacao-de-email`, `bloqueio-de-conta`, `segundo-fator`, `criptografia`, `corrida-de-abas`, `guardas-herdadas`) e dois no web (`login-com-segundo-fator`, `destino-pos-login`), cada regra com vermelho antes do verde. Exemplo medido: `settings.test.ts` ("trocar a senha derruba todas as sessões abertas") caiu com `expected 200 to be 401`, e os dois casos novos de `corrida-de-abas.test.ts` caíram em `:310` e `:328` com a mesma frase (N57) — o buraco era a janela de dez segundos reabrindo sessão revogada por decisão. Banco: migration aditiva `20261013040000_reforco_de_autenticacao` (três colunas em `users`, três tabelas novas, bloco `-- Reversão:` dentro) aplicada nos dois bancos; superfície de **120 → 129 rotas** em 19 arquivos (a régua 4 de `isolamento-rotas.test.ts` rodada à parte: 13 públicas, 2 de etapa, 15 de plataforma, 91 de empresa, 8 de conta, 0 sem cadeado); **32 → 35 tabelas** físicas nos dois bancos; **22 migrations**. Portões na árvore final: typecheck sem erro, build **961,19 kB / 282,12 kB gzip** de JS e **396,43 kB / 60,78 kB** de CSS, suíte **API 46 arquivos / 434 casos em 447,05 s** e **web 12 / 87 em 10,26 s**, zero falha e zero skip contra `nexusbusinessmanager_teste`. Cobertura: API 87,79 / 76,01 / 87,30 / 90,62 e web 29,67 / 24,73 / 25,36 / 31,37. Prova de interface reexecutada: `tools/verify-sidebar.cjs` **104 checagens / 0 falhas**, nenhum erro de console — a barra continua com 17 linhas, e as telas novas não mudaram o menu; as três provas que entram pelo login novo também rodaram na árvore final (`verify-ordens-de-servico.cjs` **107 / 0**, `verify-cobrancas.cjs` **137 / 0**, `verify-rotinas.cjs` **37 / 0**), com as mesmas contagens da rodada passada, e as catorze capturas que elas regravaram foram conferidas e descartadas por mostrarem a mesma tela. `npm ls otpauth nodemailer` devolve as duas como folhas; `npm audit` continua em 3 high (B1, mesmo caminho). O que a T3 **não** entrega está declarado: SMTP sem fila (N58 / P16), as duas telas novas sem teste de componente nem prova de navegador (N62 / P17), a negação de serviço de quinze minutos do bloqueio (N60 / P18), a falta de porta administrativa de confirmação (N61) e o `email_templates` sem leitor (N59) | N57, N58, N59, N60, N61, N62 · D1, D2, D3 aplicados |
| T4. F5 inteira: robustez do frontend, fumaça verificável, divisão do JavaScript e régua de acessibilidade (D8) | FEITA | `3bc022f` (T4.1), `68f0d0d` (T4.2) e os dois commits deste lote; o que traz esta linha fecha a T4 | Item por item, com vermelho antes do verde onde o item tinha código. **T4.1 / N51 / P14** — contador de corrida nas cinco telas de lista (clientes, produtos, financeiro, CRM, usuários) mais as quatro listas que nascem em `useEffect`; varredura de todos os blocos de rede do front: 4 escritas de lista sem guarda no início, **0** no fim; 5 casos em `resposta-atrasada.test.tsx`, que caíram contra as telas de antes com a linha velha ainda na tabela. **T4.2 / Problema C** — senha zerada nos três momentos (fim do envio, desmontagem, `pageshow` com `persisted`), `new-password`, `name`/`id` neutros, `PasswordInput` com `<label htmlFor>`; 15 casos em `privacidade-do-login.test.tsx` e `tools/verify-privacidade-login.cjs` com **44 verificações em Chrome e Edge, 0 falhas**. **T4.3 / N7** — `data-bs-theme` escrito no `<html>` junto com o tema, pela mesma porta em `ThemeContext.tsx`, com a preferência lida em `main.tsx` antes de `createRoot` (sem *script* inline, porque o CSP de produção vale `'self'`), 6 casos em `tema-sincronizado.test.tsx`, e decisão em `docs/adr/0016`. **T4.4** — `ErrorBoundary` na raiz e por rota com `registro-erros.ts`; 9 casos em `limite-de-erro.test.tsx`; a prova de code splitting confere o carregamento de pedaco, o erro e a recuperação sem recarregar. **T4.5** — `npm run verify` (`tools/verify-fumaca.cjs`): **63 telas** atravessadas em 360, 1024 e 1440 px com **0 problema**, incluindo as quatro páginas de erro e as três linhas do menu da plataforma. **T4.6** — `apps/api/test/zero-placeholder.test.ts` (3 casos) varre o front e a API procurando "em breve", "não implementado", "TODO" e rota que devolve `null` de propósito: nenhum. **T4.7 / N62 / P17** — `VerificarEmail.tsx` saiu de 0% para **97,22%** de instruções, `SegundoFatorPanel.tsx` para **96,15%**, `lib/verificacao.ts` e `lib/segundoFator.ts` para **100%** (o ramo de erro que estava de fora entrou), com 8 + 9 casos novos e a prova `tools/verify-verificacao-e-2fa.cjs` fechando **56 verificações, 0 falhas** e o `finally` devolvendo o banco a zero linha por conta de prova. **T4.8 / D8** — antes **964,31 kB / 283,61 kB gzip** num chunk só; depois **37 pedaços**, `index` em **354,85 kB / 121,62 kB gzip**, maior pedaço de rota (Agenda, FullCalendar) em **286,34 kB / 83,52 kB**, CSS único em 398,54 kB / 61,29 kB — dívida declarada em `docs/adr/0014`; `tools/verify-code-splitting.cjs` com **44 verificações, 0 falhas**, provando no navegador que abrir `/app/dashboard` não baixa o pedaço da Agenda nem o do CMS. **T4.9** — régua nova `tools/verify-acessibilidade.cjs`: **22 telas, 649 controles lidos, 22 verificações, 0 falhas** — rótulo, foco visível, parada de teclado, alvo de toque (44 px no celular e 24 px AA no desktop, com a exceção de equivalência conferida no elemento) e `prefers-reduced-motion` nos dois sentidos; o achado N64 registra que as três primeiras corridas mediram vazio e fecharam com "ok". **T4.10** — `npm run dev` na raiz (N66), banner do servidor de prova dizendo que a porta 3001 é do banco de prova (N65), as 74 capturas conferidas por comparador de pixels e os docs re-medidos. Portões na árvore final: typecheck sem erro, build sem aviso de chunk, suíte **API 47 / 437** e **web 18 / 140** (eram 46 / 434 e 12 / 87 na T3), zero falha e zero skip contra `nexusbusinessmanager_teste`, e as seis provas de navegador verdes na tabela de portões abaixo. O que a T4 **não** fecha está declarado: SMTP sem fila (N58 / P16, fica na T5), sino e relatório diário sem chamar ninguém (N59, idem), porta administrativa de confirmação (N61, idem), a negação de serviço de quinze minutos do bloqueio (N60 / P18, vira `SECURITY.md` na T6), o CSS de 398 kB em arquivo único e as nove ferramentas de captura quebradas (N29 / N30, ficam para a T7 / F8) e o fim da disputa de porta (N65, que recidiu nesta rodada com o dono ficando de fora do próprio sistema: o conserto definitivo vira a primeira tarefa da T5, com prova na 3002/5174) | N7, N51 e N62 fechados · N63, N64, N65 e N66 abertos e tratados · D8 aplicado |
| T5.0. Topologia de prova: a pilha ganha porta própria e a 3001/5173 deixa de ser disputada (N65) | FEITA | os dois commits desta tarefa; o que traz esta linha fecha a T5.0 | Vermelho medido antes da mudança: `tools/verify-pilha-de-prova.cjs` devolveu **36 falhas em 39 verificações** contra a árvore antiga. Verde, medido duas vezes — com a pilha de prova no ar e depois de derrubá-la: **8 verificações, 0 falhas**. A janela nova (`npm run dev:prova`, com o `dev:api:teste` virado alias) sobe a api na **3002** e o navegador na **5174** e publica `tools/ponteiro-de-prova.local.json` com `{web, api, pid, banco}`. Recusa conferida na porta ocupada: com um servidor segurando a 3002, o `dev:prova` saiu com código **1** e a frase 'a pilha de prova precisa das portas 3002 (api) e 5174 (navegador) livres'; a API do produto na 3001 seguiu devolvendo **200**, e nenhum ponteiro ficou em disco. O ponteiro morto se auto-cura: derrubada a pilha por fora, a leitura seguinte apaga o arquivo e a régua volta a medir a casa (5173/3001) — foi o estado com que a tarefa fechou. As **36** ferramentas de navegador (`verify-*`, `shoot-*`, `audit-*`) passaram a resolver endereço por `tools/pilha-de-prova.cjs`, na ordem env > ponteiro vivo > casa, com zero porta escrita a mão fora do resolvedor e dos arquivos que definem a topologia. As **20** ferramentas que gravam captura escreveram em `docs/screenshots-prova/` enquanto a pilha esteve no ar; a galeria canônica `docs/screenshots/` fechou com **0 arquivos modificados**. Prova de interface refeita contra 5174/3002: `tools/verify-sidebar.cjs` **104 checagens / 0 falhas**, nenhum erro de console. O `/app/cms`, que caía por esperar 420 ms fixos, agora espera o pedaço da rota carregar. Banco de desenvolvimento medido antes e depois da rodada inteira (leitura pura): **35 tabelas / 70.897 linhas**, linha por linha igual; o de prova em 35 tabelas / 26.631 depois da suíte. Regra de acesso do dono conferida no banco de desenvolvimento: `active=true`, `platformRole=SUPER_ADMIN`, **37** vínculos `OWNER` e nenhuma linha de tentativa de login — que é o estado que o login bem-sucedido deixa, porque `zerarTentativas` apaga a linha (`auth.service.ts:211`). Portões: typecheck e build sem erro nem aviso de chunk; `npm test` com código de saída 0 — **API 47 arquivos / 437 casos** e **web 18 / 140**, zero falha, zero skip, contra `nexusbusinessmanager_teste`; guarda permanente de caracteres **4 passed (4)**; BOM 0 e CR 0 nos 45 arquivos tocados; varredura de segredo com 13 batidas, todas conferidas linha a linha como **já existentes no HEAD**, nenhum valor impresso. Decisão em `docs/adr/0017-pilha-de-prova-com-porta-propria.md`; N65 fechado em `docs/AUDITORIA.md`; o passo a passo da seção 12 de `docs/ESTADO-ATUAL.md` reescrito com a topologia nova. Fora do escopo, declarado: a limpeza do ponteiro quando o Windows mata a janela sem `SIGINT` não é mensurável nesta máquina — o que se prova é a auto-cura na leitura; e as capturas de prova não são entregáveis do produto. | N65 fechado · N66 confirmado: a casa dos dois lados continua na 3001/5173 |
| T5.1. Docker e compose: a instalação existe, e o banco não atende fora de casa | FEITA | os commits desta tarefa; o que traz esta linha fecha a T5.1 | Vermelho primeiro, em cada regra nova. **(a)** Sem `.env` preenchido, `docker compose config` recusou com o nome da variável (`required variable MYSQL_PASSWORD is missing a value: defina MYSQL_PASSWORD no .env da maquina`) — nenhum default de credencial existe no arquivo. **(b)** A régua A9 foi medida **dentro do container** nos dois sentidos: forçando quatro valores de exemplo, o processo morreu em `apps/api/dist/src/config/env.js:85` listando `CORS_ORIGIN` local, `SUPER_ADMIN_EMAIL` e `SMTP_HOST` ausentes e `WEB_BASE_URL` sem https, sem imprimir valor; com a configuração da máquina ela passou e a trilha painel → nginx → API → MySQL devolveu `db: up`. **(c)** O motor do Prisma: `node:20-bookworm-slim` não traz openssl (medido: `openssl version` não existe, nenhuma `libssl*` no container), o generate escolheu `debian-openssl-1.1.x` e o estágio com libssl3 exigiu `debian-openssl-3.0.x` — o container nascia em `PrismaClientInitializationError` até o openssl entrar antes do generate. **(d)** N54 recaiu no container (`P3018 / 1826 / Duplicate foreign key constraint name 'company_users_user_id_fkey'` na `20261010164015_add_clients`), e o baseline da casa foi para `deploy/preparar-banco-de-dados.cjs` com guarda que o banco de prova não tinha: `SELECT COUNT(*)` exato tabela por tabela, recusa com código 1 se houver linha, porque `information_schema.table_rows` é estimativa. A contabilidade precisou de `P3008` como já-marcado: `21 marcada(s) nova(s) + 1 ja no historico = 22 migrations`, e `prisma migrate status` no container devolve `Database schema is up to date!`. **(e)** Ciclo galinha-ovo medido: sem tabela, o `/api/health` devolve 500 (o plugin de manutenção consulta `landing_configs` a cada request), a API fica `unhealthy` e o painel morre com `dependency failed to start` — daí o serviço `migracoes` com `service_completed_successfully` e o healthcheck da imagem sendo de processo. **(f)** N67: `dist/server.js` nunca existiu (com `rootDir` em `.` o `tsc` produz `dist/src/server.js`), o `start` de produção do manifesto caía em `MODULE_NOT_FOUND`, e o `docs/PRODUCAO.md` mandava rodar esse comando. **(g)** N68: a régua nova imprimia `0 falhas` e abortava com código **127** no Windows por socket keep-alive do `fetch` vivo no `process.exit()`; a leitura virou `node:http` com `agent: false` e o código 0 foi conferido duas vezes. **Verde medido**: `tools/verify-docker.cjs` com **29 verificações, 0 falhas** (19 estáticas + 10 de execução) e código 0; sem pilha, `NAO VERIFICADO` com código 2. Subida do zero (`down -v` e `up -d --build`): **132 s** até o painel saudável — ~65 s de contexto/containers, MySQL saudável 16 s depois, o job de migrations por **42 s**, API saudável 6 s depois, cadeia `mysql → migracoes → api → web` em **70 s**. Topologia conferida no host: `docker port` vazio em `mysql`, `api` e `migracoes`, `80/tcp -> 0.0.0.0:8080` no `web`, e `netstat` com o 3306 no PID 4296 de sempre, 3001 no 18816 e 5173 no 18972 — nenhuma porta do dono foi tocada. Imagens em `docker images`: 969 MB (install do monorepo inteiro) contra **915 MB** (só o workspace da API), painel **76,7 MB**. Linha de deploy dentro da imagem: `prisma` 6.19.3 com `debian-openssl-3.0.x`, `tsx` e os dois scripts de prisma presentes, e `npm run docker:admin` sem `ADMIN_CRIAR_SENHA` devolveu **código 1** com `Bootstrap recusado — ADMIN_CRIAR_SENHA não está definida`, sem consulta escrita. Bancos: a pilha tem o próprio — medido antes de o volume ser recriado, **34 tabelas / 1 linha** (a `landing_configs` que o plugin cria no primeiro request); `nexusbusinessmanager` segue intocado e a suíte continua em `nexusbusinessmanager_teste` (D6). Docs: `docs/PRODUCAO.md` reescrito em nove seções com as medições, `docs/adr/0018`, adenda da T5.1 em `docs/AUDITORIA.md` (N67, N68, N69 e o N54 reincidente), README com os sete `npm run docker:*` e a frase "não há Dockerfile" retirada, CHANGELOG no topo. Portões na tabela abaixo. Fora do escopo, declarado: **TLS** (termina em nginx em texto puro na 8080; certificado é de ambiente, e a A9 já exige `WEB_BASE_URL` https), **rotação/retenção de log** (`NÃO VERIFICADO` como política do repositório), **N69** (o ternário de nível de log do `app.ts` tem duas ramas idênticas e não há `LOG_LEVEL` no ambiente), e o **backup do volume** é a próxima tarefa da F6 | N67 e N68 fechados · N54 reincidente, tratado com guarda · N69 aberto · D6 respeitada: nada desta tarefa escreve nos bancos da casa |
| T5.2. Backup do banco da pilha com restauração conferida (seção 45, regra 1 do G5) | FEITA | os commits desta tarefa; o que traz esta linha fecha a T5.2 | Vermelho primeiro, e ele era da ferramenta. A régua nasceu vermelha com **6 falhas em 52 verificações**, e a causa era real: `deploy/backup-mysql.cjs` calculava o sha256 sobre o dump cru que passava pelo stream, enquanto sidecar, meta e restaurador conferem o `.sql.gz` no disco. Medido no arquivo desta rodada: `35bdcf50cb74f6d4…` (byte cru) contra `43f6cb3b4088f0af…` (o arquivo), e o sidecar aponta para o segundo — ou seja, a ferramenta se recusava a restaurar o próprio backup. Corrigido para hash do arquivo fechado, a régua fecha **56 verificações, 0 falhas** com código 0: 12 recusas medidas, 13 propriedades da retenção, 31 de dump e restauração reais. Houve um segundo vermelho, e ele era meu, não do código: a régua esperava dois dumps do mesmo dia na pasta, e na GFS dois dumps do mesmo dia são um bucket só — o mais velho sai junto do sidecar e do meta. A asserção foi corrigida no teste e o comportamento ficou como estava. Um terceiro vermelho apareceu na varredura de encerramento, e este era do codigo: a linha que a ferramenta mostrava a quem operava dizia `retencao apagou nexus-mysql--2026-10-14--164801.sql.gz (undefined, mais velho que a janela)`. O campo `motivo` so era escrito na malha de nunca-zero, e a frase fixa emprestava velhice a um arquivo que nao era velho de nada - ele era apenas o segundo dump do mesmo dia. Vermelho medido antes da correcao, com uma assercao nova na regua (`cada arquivo que a retencao apaga tambem traz um motivo escrito, nunca undefined`, medida com `[null,null,null]`), e a correcao da a cada apagado o motivo verdadeiro: `repetido-no-bucket` quando o bucket ja tinha dono, `fora-da-janela` quando nao cabe em janela alguma. A regua fechou **56 verificacoes** com essa assercao dentro, e a linha saiu limpa na execucao real: `retencao apagou nexus-mysql--2026-10-14--171045.sql.gz (repetido-no-bucket)`, com o sidecar e o meta do arquivo apagido indo junto. **O que a régua mede em pilha de pé:** dump real `35 tabela(s), 24 linha(s), 9 kB gzip em 1683 ms` no banco `nexusbusinessmanager` do container; três arquivos por execução (`.sql.gz`, `.sha256`, `.meta.json` com banco, tabelas, linhas, bytes do dump cru e do gzip, duração, sha256 e `mysqldump 8.4.11`); cabeçalho de `-- MySQL dump` sem `CREATE DATABASE` nem `USE`, que é o que permite restaurar em outro nome; restauração em `nexusbm_restauracao` com contagem de linhas **igual tabela por tabela** à origem; recusa com código 1 e frase própria para hash divergente, schema reservado (`mysql`/`information_schema`/`performance_schema`/`sys`) e banco alvo com tabelas sem `--aceito-sobrepor` — inclusive por cima do banco da instalação, conferido de propósito; retenção conferida em pasta real, onde o segundo dump do mesmo dia apagou o primeiro e um `README.txt` ficou intocado; e no `finally` o banco de conferência some (medido depois: `nexusbm_restauracao` com 0 schemata). **De onde o dump sai:** a régua lê o container de pé (`docker inspect` de `NetworkSettings.Ports`) e confere que o `mysql` não publica porta nenhuma no host, e que nenhuma das quatro janelas da casa — 5173/3001 do produto e 5174/3002 da prova, lidas de `tools/pilha-de-prova.cjs`, nunca escritas à mão — é o caminho. Por isso o arquivo novo entrou na varredura da topologia, que passou de 35 para **36 ferramentas** sob a guarda e continua **8 verificações, 0 falhas**. **Política:** GFS 7 diários / 4 semanais / 12 mensais com semana ISO, função pura conferida numa série de 45 arquivos (sete diários ficam, um veredito por arquivo, no máximo um por nível e bucket, 300 dias é mensal, 400 dias sai, nunca zero — o mais recente fica com o motivo `ultimo` —, e o que não segue o padrão não é tocado). Destino padrão `~/nexus-business-manager/backups` (`NEXUS_BACKUP_DIR`); destino dentro do repositório é recusa com código 1 e sem criar o diretório. **Segredo:** nenhum valor impresso em nenhuma das três peças — `mysqldump` e `mysql` rodam dentro do container lendo `MYSQL_PWD` de `$MYSQL_ROOT_PASSWORD`; varredura dos 13 arquivos da tarefa com **9 batidas** de padrão de credencial em 9 linhas, todas prosa de documentação que já estava lá antes desta rodada (o exemplo `mysql://usuario:senha@host` do README, os `ADMIN_CRIAR_SENHA`/`SEED_DEV_PASSWORD` do PRODUCAO, do AUDITORIA e do CHANGELOG), conferidas **linha por linha** por igualdade contra os 11 valores únicos de `.env`, `.env.docker` e ambiente: **0** linhas de batida contêm credencial desta máquina e **0** contêm o endereço real do dono. **Docs:** `docs/PRODUCAO.md` com a seção 8 nova e a renumeração 8→9 e 9→10 (a linha "backup" saiu de "o que ainda não está aqui"), `docs/adr/0019-…` com as sete decisões, adenda da T5.2 no `docs/AUDITORIA.md` (N70 fechado, N71 e N72 abertos), `G5-hospedagem-e-backup.md` com a seção "o que mudou desde que esta decisão foi escrita" — regra 1 parcialmente paga (retenção existe, agenda e off-site dependem da hospedagem) e regra 2 desmentida pelo código —, `docs/ESTADO-ATUAL.md` com a linha de backup saindo de "Não iniciado", README com os três comandos novos, a árvore de docs trazendo `PRODUCAO.md` e os ADRs até 0019, e a linha do tempo `T4 → T5`, CHANGELOG no topo. **Telas do produto:** nenhuma — esta tarefa toca `deploy/`, `tools/`, manifests e documentação; nenhuma captura foi regravada e `git status` de `docs/screenshots/` fechou vazio. **Portões na árvore final, na tabela abaixo.** Fora do escopo, declarado: nenhuma agenda embutida (N71), nenhuma cópia off-site, e a restauração foi exercida só no MySQL do container, nunca no 3306 do WAMP (D6) — por isso a régua mede que não existe socket por onde o dump pudesse ser o banco do dono. | N70 fechado · N71 e N72 abertos · D6 respeitada |
| T5.3. Entrega de e-mail fora do request: fila de memória do processo com retentativa (regra 2 do G1, N58) | FEITA | os commits desta tarefa; o que traz esta linha fecha a T5.3 | Vermelho primeiro, e ele era da ausência da fila: com um entregador injetado que demora 250 ms no lugar do SMTP, o `POST /api/auth/forgot-password` respondeu em **320 ms** (`expected 320 to be less than 250`) — o request estava pagando o provedor. Depois da fila, com a injeção já em 600 ms: **7,43 ms** de `responseTime` do pino, com `recebidas: 0` na caixa do entregador e `vivas: 1` na fila no instante da resposta. Um segundo vermelho era **do código, não do teste**: `aguardarFilaDeMail()` acordava dentro de `concluir()` com o worker ainda no laço, e a leitura `{ vivas: 0, naFila: 0, trabalhando: true }` contra `trabalhando: false` mostra que "a fila esvaziou" diria verdade para as mensagens e mentira para o processo — um teste verde nesse estado poderia encerrar no meio de uma entrega. Corrigido no `fila.ts`: o despertador confere `vivas`, `fila.length` e `trabalhando`, e é chamado também no `finally` do `bombear()`; o worker que pane **não** se religa no mesmo turno (erro que se repete viraria laço quente), e é o estouro do teto de 5 s do dreno que o denuncia. Um terceiro era **meu**: `dataTimeout` não existe nos tipos do `nodemailer` 10.1.0 (`TS2769`), e o nome errado tinha ido para o `.env.example` e para a linha do N58 — os quatro tempos conferidos em `node_modules/nodemailer/dist/cjs/smtp-connection/index.d.ts` são `connectionTimeout`, `greetingTimeout`, `socketTimeout` e `dnsTimeout`. Um quarto era de medição: o primeiro contato do processo com Prisma e HTTP custa **1 269 ms** (`responseTime` medido) e **1 708 ms** (`makeAccount` medido), e nenhum dos dois é da fila — o caso de tempo aquece a rota antes de medir, o atraso de prova subiu de 250 para **600 ms** (com 250 ms o Windows deu 259 ms numa corrida, indistinguível de "pagou o provedor"), e a asserção de tempo anda acompanhada das duas leituras de relógio e de uma medição de contraste que prova que o entregador injetado demora os 600 ms quando alguém espera por ele. **O que existe agora:** `apps/api/src/lib/mail/fila.ts` — fila de memória do processo, consumidor único por `setImmediate`, FIFO, `MAIL_TENTATIVAS` (padrão 3) com recuo exponencial `MAIL_BACKOFF_BASE_MS` (500 ms, sem jitter), teto por tentativa `MAIL_TIMEOUT_MS` (15 000 ms), teto de RAM `MAIL_FILA_MAXIMA` (200) com recusa auditada quando enche, timers com `unref()` e nenhum timer no boot; `enfileirarMail(mensagem, callback)` nos três chamadores (`auth.service.ts:608`, `verificacao.service.ts:60`, `segundo-fator.service.ts:360`); a auditoria de falha carimbada pelo worker depois da última tentativa, sem mudar nenhuma `action` existente; `resumoDaFalha()` compartilhada entre a porta e a fila; e o desligue em `server.ts` drenando com teto de 5 s antes de fechar, com `warn` se não esvaziar. As quatro chaves têm padrão no código, nenhuma é obrigatória, e a régua de produção (A9) **não** passou a cobrar nenhuma delas — `validador-de-producao.test.ts` continua verde. **Prova:** 5 casos novos em `test/fila-de-mail.test.ts`; os quatro arquivos que leem caixa de e-mail (`recuperacao-por-email` 6, `verificacao-de-email` 11, `segundo-fator` 16, `guardas-herdadas` 9) ganharam dreno no `beforeEach`/`afterEach` e nas rotas que lêem a caixa, **sem uma asserção removida, pulada ou enfraquecida**. Suíte na árvore final: **API 48 arquivos / 442 casos** e **web 18 / 140**, zero falha e zero skip, contra `nexusbusinessmanager_teste` (D6). **Docs:** `docs/adr/0020-entrega-de-email-por-fila-de-memoria.md` com as oito decisões e o preço declarado, `docs/PRODUCAO.md` com a seção 10 nova ("E-mail: fila do processo, retentativa e desligue") e a renumeração 10→11, `G1-envio-de-email.md` com a seção de 2026-10-14 e a regra 2 saindo de "NÃO cumprida", `docs/AUDITORIA.md` com o N58 fechado, a adenda da T5.3 e o N74 aberto, `docs/ESTADO-ATUAL.md` com o P16 fechado e a linha 5 dizendo que a fila não é persistente, README (árvore até o ADR-0020, linha de terceiros, linha do tempo `T4 → T5`), CHANGELOG no topo. **Telas do produto:** nenhuma — 0 capturas novas e `git status` de `docs/screenshots/` vazio. Fora do escopo, declarado: sino e relatório diário seguem sem chamador de e-mail (N59), a porta administrativa de confirmação segue aberta (N61), e a fila não é persistida nem distribuída (N74). | N58 fechado · N74 aberto · D6 respeitada |
| T5.4. N59: o aviso do sino ganha cópia por e-mail, as três rotinas ganham chamador, e a caixa da tela obedece à instalação | FEITA | os dois commits desta tarefa; o que traz esta linha fecha a T5.4 | Vermelho medido antes, nos dois lados: `apps/api/test/avisos-por-email.test.ts` **6 failed \| 2 passed (8)** (`expected [] to have a length of 1 but got +0` três vezes, `expected undefined to be 1`, `TypeError: Cannot read properties of undefined (reading 'disponivel')` e `expected '11 empresas fechadas · 1 aviso' to match /· \d+ e-mails?/`) e `apps/web/src/test/avisos-por-email.test.tsx` **3 failed \| 1 passed (4)**, com `expected true to be false` duas vezes — o `disabled` e o `checked` que a tela escrevia em pedra. Verde depois: **8 passed (8)** e **4 passed (4)**; suítes completas **API 49 arquivos / 450 casos em 313,92 s** e **web 19 / 144**, código 0, zero skip, contra `nexusbusinessmanager_teste` (D6). **O que existe agora:** (1) `notificarDetalhado()` grava a linha do sino e depois enfileira a cópia, com pré-consulta de `dedupeKey` porque `createMany({ skipDuplicates: true })` não devolve quais linhas eram velhas — o e-mail só existe para aviso novo, e é isso que segura a varredura de contas vencidas no lado certo da chave antiduplicação; (2) o portão é o que o entregador **afirma** (`entregaDeVerdade` opcional na porta; SMTP afirma, console e caixa de memória negam com motivo escrito, ausência vale "não entrega"), não o nome do transporte; (3) sem entregador nada é enfileirado e nada é simulado — `{ criadas: n, emails: 0 }` antes de montar mensagem; (4) `POST /notifications/scan` responde `{ criadas, emails }`, a auditoria `notification.scan` grava os dois, e os três handlers de rotina fecham a coluna "última execução" com `· N e-mail(s)`; (5) falha de entrega vira `notification.entrega_falhou` com `{ rotulo, tentativas, motivo, para }`, `para` mascarado, sucesso não vira linha nenhuma; (6) a caixa da tela é `checked` = preferência salva e `disabled` = estado real do canal, com a dica repetindo o motivo que a API devolve — decisão registrada em `docs/adr/0021`. **Prova de navegador na pilha de prova:** `tools/verify-notificacoes.cjs` **88 checagens, 0 falhas**, com as três checagens novas amarradas ao estado real desta instalação (`{"disponivel":false,"transporte":"console",…}`), e `tools/verify-rotinas.cjs` **37 / 0** — a frase das rotinas mudou e a prova dela confere formato, não texto fixo. Banco de prova antes/depois da corrida: `notifications` 12 → 12, preferências 1 → 1, pendentes 0 → 0, usuários 182 → 182, empresas 3 → 3, 35 tabelas nos dois momentos; `audit_logs` de notificação 97 → 99 são as duas linhas que o próprio produto carimba em `notification.scan`, e o `finally` da prova apagou os 24 avisos e os 12 lançamentos que ela criou (medido: sobraram 0). **Capturas:** a tela de preferências mudou de texto e a coluna das rotinas ganhou sufixo, então `21-notificacoes-preferencias.png` e o grupo `23-rotinas-*` (cinco) foram atualizados e conferidos um a um; `21-notificacoes-sino.png` ficou como estava — a diferença era contagem transitória, não interface — e as outras quatro do grupo saíram byte a byte iguais à galeria canônica. **Docs:** `docs/adr/0021-o-email-e-copia-do-aviso-do-sino.md`, `G1-envio-de-email.md` re-medida (continua PARCIALMENTE FECHADO, e por quê), `docs/PRODUCAO.md` seção 10 com o item 5 e o "como se lê o número de e-mails", `docs/ESTADO-ATUAL.md` (suíte, três linhas de módulo e §9), README (preferências, sino, rotinas, modelos de e-mail, A seguir, árvore de ADRs, linha do tempo), CHANGELOG no topo, N59 fechado na AUDITORIA com a adenda da rodada. **Um vermelho foi meu:** o título do aviso ia cru para o `<h2>` do HTML, e o `textoSeguro()` que eu tinha escrito para o corpo não tinha chegado lá — corrigido com asserção nova no caso 1. Fora do escopo, declarado: **N75** (a própria tela apontava para "o executor, quando ele existir", seis tarefas depois de ele nascer) corrigido aqui por ser a mesma tela do mesmo achado; **N76** (as três mensagens antigas interpolam `primeiroNome` sem escape no HTML — auto-XSS de mensagem, sem terceiro envolvido) registrado e deixado para o `SECURITY.md` da T6; **N77** (a tabela de módulos do README dizia que backup estava "a caminho" quando a T5.2 já o entregou) corrigido na mesma passada, declarado em vez de consertado em silêncio; e a caixa postal de destino continua sendo a do cadastro, sem verificação de entrega por aviso | N59 e N75 e N77 fechados · N76 aberto · D6 respeitada |

### Portões da T0 (2026-10-13)

```
git status --porcelain     vazio (nenhum arquivo modificado, nenhum não rastreado)
rev-parse / ls-remote      ambos 0d802154461cc8ce53018131ea6e3250a24c4986 — nada pendente de push
npm run typecheck          ok (api + web, sem saída)
npm run build              ok — 946,30 kB / 278,06 kB gzip de JS e 395,16 kB / 60,53 kB de CSS;
                           o aviso de chunk acima de 500 kB continua (é trabalho da T4)
npm test                   API 37 arquivos / 350 casos em 317,28 s e web 10 / 77 em 10,61 s —
                           zero falha, zero skip
guarda de caracteres       4 passed (4), rodada isolada
codificação                325 arquivos de texto: BOM 0, CR 0
segredos                   0 no patch; as 30 batidas na árvore são os mesmos fixtures de teste
                           já identificados na rodada anterior, linha a linha, sem valor impresso
```

### Portões da T1 (2026-10-13)

```
npm run typecheck          falhou primeiro (4 erros no arquivo novo: índice possivelmente
                           indefinido), verde depois de tipar a contagem — api + web sem saída
npm run build              ok (api tsc + web vite build, 206 módulos, 10,50 s)
npm test                   API 38 arquivos / 354 casos em 421,08 s e web 10 / 77 em 11,37 s —
                           zero falha, zero skip, tudo contra nexusbusinessmanager_teste
banco de desenvolvimento   medição tabela por tabela antes e depois da rodada inteira
                           (suíte + duas provas de navegador): `diff` sem saída — 541 usuários,
                           45 empresas, 49 vínculos, 32 tabelas, 2.186 sessões, 67.722 auditorias
banco de prova             cresceu no lugar do outro: usuários 9 → 22, empresas 2 → 3,
                           sessões 8 → 20, auditorias 917 → 2.735, movimentações 6 → 10
provas de navegador        verify-ordens-de-servico.cjs 103 checagens / 0 falhas;
                           verify-notificacoes.cjs 85 checagens / 0 falhas; conference vermelha
                           medida na conta que não existe no banco de prova (HTTP 401 com a
                           instrução do comando certo)
cadeia de migrations       medida num schema de descarte criado e apagado pela própria medição:
                           para na 2ª de 20 com P3018 / erro 1826 (N54)
node -c tools/*.cjs        30 arquivos, zero erro de sintaxe
guarda de caracteres       dentro da suíte (apps/api/test/caracteres-permitidos.test.ts): verde
codificação                arquivos desta rodada: BOM 0, CR 0, UTF-8 sem caractere não latino
segredos                   varredura das linhas adicionadas + arquivos novos: 6 batidas, todas
                           referência de variável ou endereço inexistente; nenhum valor impresso.
                           tools/prova-admin.local.json, tools/conta-de-captura.local.json e
                           tools/senha-admin.local.cjs confirmados ignorados (git check-ignore)
capturas                   21-notificacoes-*.png (5) refazem e entram: a casa de demonstração do
                           banco de prova tem seis avisos, e o banco de desenvolvimento carregava
                           onze, cinco deles sobra de corrida antiga. 25-ordens-*.png (4) foram
                           descartados: conteúdo idêntico, só ruído de compressão
```

### Portões da T2 (2026-10-13)

```
npm run typecheck          ok (api + web, sem saída)
npm run build              ok — 948,00 kB / 278,39 kB gzip de JS e 395,28 kB / 60,57 kB de CSS; o aviso
                           de chunk acima de 500 kB continua (é trabalho da T4)
npm test                   API 39 arquivos / 361 casos em 405,72 s e web 10 / 79 em 11,02 s — zero
                           falha, zero skip, tudo contra nexusbusinessmanager_teste
vermelho antes do verde    API: `empresa-lembrada.test.ts` rodado contra o `auth.service.ts` do HEAD caiu
                           6 de 7 — "expected 'aa-empresa-8g5d76' to be 'zz-empresa-8g5d76'" no desempate
                           por id e "expected 'xx-casa-8g67x7-c' to be 'yy-casa-8g67x7-b'" na renovação de
                           token sem empresa. Web: os três casos novos rodados contra os cinco arquivos do
                           HEAD caíram (3 failed | 24 passed), com `getByLabelText("Motivo do
                           cancelamento")` sem achar campo nenhum. Fontes originais guardados no Temp,
                           repostos, e verde medido em seguida: 7/7 e 27/27
banco de desenvolvimento   medido depois da rodada inteira (suíte + duas provas de navegador):
                           usuarios=541 empresas=45 vinculos=49 sessoes=2186 auditorias=67722 tabelas=32 —
                           os mesmos números da T1, linha por linha
banco de prova             migration aditiva `20261013030000_add_empresa_lembrada` aplicada nos dois
                           bancos. Consequência medida por login real: o administrador de prova tem três
                           vínculos e a API devolve "Nexus Demo" (a ordem por uuid daria
                           "Empresa-1791925362473-5-134714"); a conta fixa de capturas tem um vínculo só e
                           continua "Demonstracao (minha empresa)" — nenhuma tela do README mudou de
                           cabeçalho por causa da D5
provas de navegador        verify-ordens-de-servico.cjs 107 checagens / 0 falhas (eram 103);
                           verify-cobrancas.cjs 137 checagens / 0 falhas, com a seção "cancelamento com
                           motivo" barrando o clique vazio antes da rede
capturas                   as cinco imagens de cobrança que a prova regravou foram conferidas uma a uma e
                           descartadas (`git restore`): cabeçalho, cartões, filtros, linhas e pílulas
                           idênticos ao que está publicado
node -c tools/*.cjs        os dois arquivos desta rodada, zero erro de sintaxe
codificação                17 arquivos desta rodada: BOM 0, CR 0, caractere de alfabeto não latino 0
segredos                   varredura do patch inteiro (20 arquivos, 874 linhas adicionadas): 0 atribuições
                           com valor literal; as 42 batidas restantes são referência de variável, comentário
                           ou fixture de teste (`@nexus.test`, domínio reservado). Nenhum valor impresso
```

### Portões da T3 (2026-10-13)

```
npm run typecheck          ok (api + web, sem saída)
npm run build              ok — 961,19 kB / 282,12 kB gzip de JS e 396,43 kB / 60,78 kB de CSS, 211 módulos,
                           6,07 s; o delta sobre a árvore da T2 é +13,19 kB / +3,73 kB de JS e +1,15 kB /
                           +0,21 kB de CSS; o aviso de chunk acima de 500 kB continua (é trabalho da T4,
                           com a separação pedida pela D8)
npm test                   API 46 arquivos / 434 casos em 415,87 s e web 12 arquivos / 87 casos em 10,84 s,
                           zero falha e zero skip, tudo contra nexusbusinessmanager_teste; a corrida anterior
                           da mesma suíte, guardada em arquivo, mediu 447,05 s e 10,26 s — a diferença é
                           tempo de máquina, não de casos (a saída com os contadores fica na tabela acima)
cobertura (api)            87,79% instruções (3.274/3.729), 76,01% ramificações (1.889/2.485), 87,30%
                           funções (674/772), 90,62% linhas (3.006/3.317) em 92 arquivos sob src; três
                           arquivos seguem em zero: cron.runner.ts, lib/mail/smtp.ts e lib/mail/console.ts
                           — os dois últimos porque a suíte roda com MAIL_TRANSPORT=memory, e o SMTP real
                           nunca é tocado por teste
cobertura (web)            29,67 / 24,73 / 25,36 / 31,37 em 15,39 s; 97 entradas no relatório, 9 sem
                           instrução (7 css + logo.png + vite-env.d.ts), 88 mensuráveis e 38 em zero —
                           entram na lista as duas telas novas da rodada (VerificarEmail.tsx e
                           SegundoFatorPanel.tsx, 0% cada), achado N62
prova de interface         tools/verify-sidebar.cjs — 104 checagens, 0 falhas, nenhum erro de console;
                           as seis capturas 16-sidebar-*.png mudaram de conteúdo e ficaram: o cabeçalho do
                           painel do administrador de prova, que antes da D5 saía
                           "Empresa-1791737996018-21-359870" — a primeira ativa na ordem do índice de uuid —,
                           agora sai "Nexus Demo", o vínculo mais antigo da conta. Revisão imagem por imagem
                           feita nesta rodada; as seis telas do README, capturadas pela conta fixa de um
                           vínculo só, não mudaram. As três provas de tela que a F4 poderia ter quebrado
                           foram reexecutadas na árvore final, porque todas entram pelo login novo:
                           tools/verify-ordens-de-servico.cjs **107 checagens / 0 falhas**,
                           tools/verify-cobrancas.cjs **137 / 0** e tools/verify-rotinas.cjs **37 / 0** — os
                           mesmos números da rodada passada. As catorze capturas que essas três provas
                           regravaram foram conferidas uma a uma e descartadas: mesma tela, o que mudou foi
                           só o dado transitório que a própria prova escreve e limpa
banco de desenvolvimento   medido antes e depois da rodada inteira de portões (suíte + prova de navegador),
                           tabela por tabela, com as duas saídas guardadas em arquivo: usuarios=541
                           empresas=45 vinculos=49 sessoes=2186 auditorias=67722 tentativas=0 verificacoes=0
                           recuperacoes=0 tabelas=35 nos dois momentos — linha por linha idêntica, e as três
                           tabelas novas da F4 continuam vazias aqui (D6 cumprida: a escrita de teste é só
                           no banco de prova)
dependências               npm audit: 3 high, o mesmo caminho deepmerge-ts -> @prisma/config -> prisma (B1);
                           npm ls otpauth nodemailer devolve as duas como folhas, sem transitivo
codificação                varredura da árvore que o git acompanha mais os arquivos novos: 361 arquivos de
                           texto lidos, 0 com BOM, 0 com CRLF, 0 com caractere de alfabeto não latino; a
                           mesma varredura pega o CHANGELOG da rodada, onde um Han tinha entrado no meio da
                           frase do N60 e saiu antes do commit
segredos                   6.905 linhas desta rodada examinadas (adições nos rastreados + os 27 arquivos
                           novos inteiros): 17 atribuições de chave de segredo com valor literal e 18
                           endereços literais, todos lidos um por um e classificados como fixture de teste,
                           marca de exemplo que a própria régua recusa, placeholder de tela ou comentário;
                           as quatro credenciais reais da máquina (senha e endereço do administrador, senha e
                           endereço da conta de prova) entraram na comparação por hash, e nenhuma literal
                           coincide com elas — 0 coincidências, e nenhum valor impresso em nenhum momento
```

### Portões da T4 (2026-10-14, encerramento da F5)

```
npm run typecheck          ok (api + web, sem saida)
npm run build              ok — 37 pedacos de JavaScript: index-CFVkd33T.js 354,85 kB / 121,62 kB gzip,
                           Agenda-DUPw_oEI.js 286,34 kB / 83,52 kB gzip, e o resto em pedacos de 0,32 a 29,94 kB;
                           CSS unico index-lB9YwzZ_.css 398,54 kB / 61,29 kB gzip; 215 modulos transformados;
                           nenhum aviso de chunk acima de 500 kB (a F1.2, a F2 e a F3.2 carregavam esse aviso)
npm test                   API 47 arquivos / 437 casos em 337,87 s e web 18 arquivos / 140 casos em 16,49 s —
                           zero falha, zero skip, os dois contra nexusbusinessmanager_teste. A suíte inteira foi
                           rodada de novo na árvore final, já com o `npm run dev` e o Chrome das provas ligados:
                           47 / 437 em 521,26 s e 18 / 140 em 26,55 s, `EXIT=0`, mesmo zero falha e zero skip
cobertura web              medida com os globs documentados em docs/ESTADO-ATUAL.md, dentro de apps/web, com
                           npx vitest run --coverage (o pacote nao tem script proprio, e foi por isso que
                           npm run test:coverage --workspace @nexus/web caiu em Missing script): 18 arquivos /
                           140 casos em 17,02 s, 38,19% de instrucoes / 33,11% de ramificacao / 30,67% de funcao /
                           41,03% de linha, com 100 entradas no universo e 27 arquivos em 0%. A mesma suíte sem
                           filtro de universo instrumenta só o que os testes importam (68 entradas) e devolve
                           58,73 / 50,05 / 51,47 / 62,94 — os dois números são verdadeiros, o que muda é o
                           universo, e é o dos globs que entra na comparação entre rodadas
cobertura api              npm run test:coverage na raiz, medida na mesma arvore: 47 arquivos / 437 casos em
                           487,10 s, 87,79% de instrucoes (3.274/3.729), 76,01% de ramificacao (1.889/2.485),
                           87,30% de funcao (674/772) e 90,62% de linha (3.006/3.317). Tres arquivos em 0%:
                           lib/mail/console.ts, lib/mail/smtp.ts e modules/cron/cron.runner.ts — os dois primeiros
                           sao portas de entrega exercitadas por fake nos testes de API e provadas no navegador, o
                           terceiro e o agendador que so roda com o servidor de producao levantado
provas de navegador        verify-fumaca            63 telas em 360 / 1024 / 1440 px — 0 problemas
                           verify-code-splitting    44 verificacoes — 0 falhas
                           verify-acessibilidade    22 telas, 649 controles lidos — 22 verificacoes, 0 falhas
                           verify-verificacao-e-2fa 56 verificacoes — 0 falhas, 0 linhas no banco depois do finally
                           verify-sidebar           104 checagens — 0 falhas, nenhum erro de console
                           verify-privacidade-login 44 verificacoes em Chrome e Edge — 0 falhas
contraste do painel      audit-contraste-painel: 68 de 68 combinacoes de tela/tema/janela, 2.862 textos
                           medidos no navegador (34 em degrade), 14 isentos por componente inativo (WCAG
                           1.4.3), 0 abaixo do alvo e 0 falhas; cada linha da saida confere a dupla chave
                           do tema no elemento (`dark/dark ok`, `light/light ok`)
                           as seis rodaram contra o servidor de prova (npm run dev:api:teste + vite) depois de
                           npm run db:prova: 35 tabelas, 124 usuarios, 3 empresas, 7 vinculos
banco de desenvolvimento   nenhuma das seis provas e nenhum teste desta rodada escreveu nele. A afirmação foi
                           medida com instantâneo por tabela (`COUNT(*)` nas 35 tabelas) antes e depois de rodar
                           `auth.test.ts`, `auth-flows.test.ts` e `bloqueio-de-conta.test.ts` — os três arquivos
                           que mais escrevem: 35 tabelas / 70.897 linhas nos dois momentos, `diff` vazio, e os
                           mesmos três arquivos verdes (20 casos em 31,98 s) contra o banco de prova. No intervalo
                           maior da rodada o banco de desenvolvimento ganhou 6 linhas, e a origem delas é
                           identificável uma por uma: três `auth.login` de quem abriu esta casa para conferir o
                           acesso (17:02:14, 17:03:35 e 17:03:39) mais as três sessões que eles criaram; no mesmo
                           intervalo o banco de prova recebeu 1.124 auditorias da suíte. Nada de teste, prova ou
                           varredura chegou ao banco de quem está trabalhando.
acesso do admin raiz       a régua da regra de acesso, medida na árvore final com o `npm run dev` no banco de
                           desenvolvimento: `POST /api/auth/login` devolve **HTTP 200** com `user`, `accessToken`,
                           `refreshToken` e `expiresIn` (papel `OWNER`, nome "Administrador Nexus", nenhum valor de
                           segredo impresso); `GET /api/auth/me` devolve 200 com 13 campos e `GET /api/companies`
                           devolve as **37** empresas que a conta governa. No navegador: **6 verificações, 0
                           falhas** — a tela de entrada abre, o envio leva a `/app`, a chave `nexus.refresh` fica no
                           navegador ao lado de `nexus.theme` e `nexus.sidebar.collapsed`, a barra monta com 18
                           links, o painel monta 35 blocos de conteúdo com o cabeçalho "Olá, Administrador", e uma
                           segunda entrada limpa repete o ciclo. O diagnóstico de quando isto quebra está em N65.
capturas                   74 PNGs regravados e conferidos por comparador de pixels proprio (IHDR, IDAT junto,
                           filtro por linha desfeito, CRC de tipo + dados): 0 identicos ao que estava no HEAD;
                           revisao visual dos pares antes/depois e das duas montagens — ficam os 74, e o que
                           estava velho (barra pre-F3.1 em 17-agenda.png e 04-usuarios.png, placeholder
                           voce@exemplo.com em 02-login.png) esta escrito em N30
codificação                varredura da árvore que o git acompanha (506 entradas: 378 de texto lidas byte a byte,
                           128 binárias fora): 0 com BOM, 0 com CRLF, 0 com caractere de alfabeto não latino, 0 sem
                           newline final. Os 48 arquivos .cjs da pasta tools (47 versionados mais o
                           senha-admin.local.cjs, que o .gitignore guarda) passam em node --check, inclusive os
                           seis que nasceram nesta rodada: dev.cjs, verify-fumaca.cjs, verify-acessibilidade.cjs,
                           verify-code-splitting.cjs, verify-verificacao-e-2fa.cjs e
                           audit-contraste-painel.cjs
segredos                   6.480 linhas examinadas (2.371 adições dos rastreados desde 55bbb50 + os 16 arquivos
                           novos inteiros): 3 atribuições de chave com nome de segredo em valor literal, todas lidas
                           uma por uma e classificadas — o nome de uma chave de armazenamento local, um token de
                           prova que o próprio teste afirma não poder ser guardado, e a marca "Prova" de uma senha
                           gerada na hora pela ferramenta; 25 endereços literais em 5 domínios, todos fictícios
                           (.teste, .test, exemplo.com, exemplo.invalido e email.com de fixture). As 11 credenciais
                           reais da máquina (as chaves do .env local mais os três arquivos ignorados de tools)
                           entraram na comparação por hash SHA-256, 1.140 tokens literais foram comparados com elas
                           e nenhuma coincide — 0 coincidências, e nenhum valor impresso em nenhum momento. A
                           varredura é a última corrida na árvore fechada, imediatamente antes do `git add`; as
                           linhas que este parágrafo acrescenta não mudam nenhuma das três verificações
avanço direto              medido com git fetch origin + git merge-base --is-ancestor: origin/main está em
                           55bbb50, HEAD está em 68f0d0d e é descendente direto — 2 commits na frente antes deste
                           lote, 4 depois dos dois commits da T4, push sem force e provado por
                           git ls-remote origin HEAD igual a git rev-parse HEAD
```

### Portões da T5.0 (2026-10-14, topologia de prova — N65)

```
regua de topologia         node tools/verify-pilha-de-prova.cjs
                           vermelho antes da mudança: 36 falhas em 39 verificações
                           verde com a pilha de prova no ar: 8 verificações, 0 falhas
                           verde depois de derrubar a pilha: 8 verificações, 0 falhas, e o ponteiro
                           com pid morto apagado na própria leitura
porta do produto           npm run dev inteiro na 3001/5173 durante a tarefa: GET /api/health = 200 e
                           GET http://localhost:5173 = 200 depois de a pilha de prova ter descido
recusa de porta ocupada    com um servidor segurando a 3002, o dev:prova saiu com código 1 e a frase
                           'a pilha de prova precisa das portas 3002 (api) e 5174 (navegador) livres';
                           a API do produto na 3001 seguiu devolvendo 200 e nenhum ponteiro ficou em disco
prova de navegador         tools/verify-sidebar.cjs contra 5174/3002: 104 checagens, 0 falhas, nenhum
                           erro de console; o /app/cms, que caía por esperar 420 ms fixos, agora espera
                           o pedaço da rota carregar
capturas                   docs/screenshots: 0 arquivos modificados; docs/screenshots-prova: 6 PNGs
banco de desenvolvimento   35 tabelas / 70.897 linhas antes e depois da rodada inteira (leitura pura,
                           COUNT por tabela)
banco de prova             35 tabelas / 24.753 linhas no começo da tarefa e 26.631 no fim, depois da suíte
npm run typecheck          ok (api + web, sem saída)
npm run build              ok, sem aviso de chunk acima de 500 kB
npm test                   código de saída 0 — API 47 arquivos / 437 casos em 353,15 s e web 18 / 140 em
                           17,59 s, zero falha e zero skip, os dois contra nexusbusinessmanager_teste
guarda de caracteres       npx vitest run test/caracteres-permitidos.test.ts: 4 passed (4)
codificação                45 arquivos tocados: BOM 0, CR 0
segredos                   13 batidas nos arquivos desta tarefa, todas conferidas linha a linha como já
                           existentes no HEAD (fixtures fictícios das ferramentas e texto da auditoria);
                           nenhum valor impresso
ignoro do git              git check-ignore -v: tools/ponteiro-de-prova.local.json (.gitignore:39) e
                           docs/screenshots-prova/ (.gitignore:42)
conta raiz                 active=true, platformRole=SUPER_ADMIN, 37 vínculos OWNER, nenhuma linha de
                           tentativa de login e nenhum bloqueio vigente no banco de desenvolvimento
```

### Portões da T5.1 (2026-10-14, Docker com a porta do banco fechada)

```
npm run typecheck          codigo 0 (api + web, sem saida)
npm run build              codigo 0, sem aviso de chunk acima de 500 kB — 37 arquivos de JS e 1 de CSS em
                           apps/web/dist/assets; index 354,85 kB / 121,62 kB gzip, maior pedaco de rota
                           (Agenda, FullCalendar) 286,34 kB / 83,52 kB
npm test                   codigo de saida 0 — API 47 arquivos / 437 casos em 383,95 s e web 18 / 140 em
                           19,63 s, zero falha e zero skip, os dois contra nexusbusinessmanager_teste
guarda de caracteres       npx vitest run test/caracteres-permitidos.test.ts: 4 passed (4)
regua da pilha de install  tools/verify-docker.cjs com a pilha de pe: 29 verificacoes, 0 falhas, codigo 0
                           (19 da arvore + 10 do que o Docker publicou). Sem pilha ela imprime
                           NAO VERIFICADO e sai com codigo 2, em vez de fechar verde pela metade
regua da topologia de prova tools/verify-pilha-de-prova.cjs: 8 verificacoes, 0 falhas, codigo 0, com as
                           35 ferramentas sob a regua — a nova entrou na varredura
porta no host              docker compose port: mysql, api e migracoes sem porta publicada; web devolve
                           0.0.0.0:8080. netstat: 3306 no PID 4296, 3001 no 18816, 5173 no 18972 e 8080 no
                           17684 — as janelas da casa seguem com os mesmos processos de antes da subida
imagens                    docker images: nexus-api:local 915 MB (install restrito ao workspace da API)
                           contra nexus-api:com-toolchain-do-painel 969 MB (a arvore inteira), e
                           nexus-painel:local 76,7 MB
recusa sem .env            docker compose config sem variaveis: "required variable MYSQL_PASSWORD is
                           missing a value: defina MYSQL_PASSWORD no .env da maquina" — nenhum default de
                           credencial existe no arquivo
A9 dentro do container     com quatro valores de exemplo o processo morreu em dist/src/config/env.js:85
                           listando CORS_ORIGIN local, SUPER_ADMIN_EMAIL e SMTP_HOST ausentes e
                           WEB_BASE_URL sem https, sem imprimir valor; com a configuracao da maquina o
                           healthcheck passou e a trilha painel -> nginx -> api -> mysql devolveu db: up
banco da pilha             34 tabelas / 1 linha depois da subida do zero — a linha e a landing_configs que
                           o plugin de manutencao cria no primeiro request; nenhuma seed da casa foi
                           gravada ali
banco de desenvolvimento   35 tabelas / 70.897 linhas, leitura pura com COUNT por tabela — o mesmo numero
                           do fecho da T5.0, linha por linha
banco de prova             35 tabelas / 28.895 linhas depois da suíte desta rodada
codificação                17 arquivos desta tarefa: BOM 0, CR 0, newline final em todos
segredos                   44 batidas nos 17 arquivos, todas conferidas como endereco de exemplo
                           (admin@nexus.local, nome@dominio.example, bootstrap@example.com) ou referencia
                           ${VAR:?} do compose; 0 batida do endereco real do dono; nenhum valor impresso
telas do produto           nenhuma: esta tarefa toca deploy, manifests e documentação. Nenhuma captura foi
                           regravada, e docs/screenshots fechou com 0 arquivos modificados
```

### Portões da T5.2 (2026-10-14, backup com restauração conferida)

```
npm run typecheck          codigo 0 (api + web, sem saida)
npm run build              codigo 0, sem aviso de chunk — 37 arquivos de JS e 1 de CSS em
                           apps/web/dist/assets; index 354,85 kB / 121,62 kB gzip e Agenda 286,34 / 83,52,
                           os mesmos numeros da T4: nada do frontend foi tocado nesta tarefa
npm test                   codigo de saida 0 — api 47 arquivos / 437 casos em 457.65 s
                           e web 18 arquivos / 140 casos em 21.53 s; zero falha e zero skip nos dois,
                           ambos contra o banco nexusbusinessmanager_teste
guarda de caracteres       npx vitest run test/caracteres-permitidos.test.ts: 4 passed (4)
regua do backup            tools/verify-backup.cjs com a pilha de pe: 56 verificacoes, 0 falhas, codigo 0
                           (12 recusas + 13 propriedades da retencao + 31 de dump e restauracao reais).
                           Vermelhos medidos antes do verde: 6 falhas em 52 com o hash do dump cru contra o
                           hash do arquivo no disco, e 1 falha em 56 com a retencao devolvendo motivo
                           undefined para os arquivos apagados. Os dois eram de codigo, nao da regua
regua da topologia         tools/verify-pilha-de-prova.cjs: 8 verificacoes, 0 falhas — a ferramenta nova
                           entrou na varredura, que passou de 35 para 36 arquivos sob a guarda
regua da pilha de install  tools/verify-docker.cjs: 29 verificacoes, 0 falhas, codigo 0 (reexecutada depois
                           das mudancas desta tarefa, porque o compose e as imagens nao mudaram)
npm run docker:backup      rodado de verdade na pasta padrao: "35 tabela(s), 24 linha(s), 9 kB gzip em
                           1683 ms", os tres arquivos ao lado do dump (.sql.gz, .sha256, .meta.json) e a linha do
                           operador: "retencao apagou nexus-mysql--2026-10-14--171045.sql.gz
                           (repetido-no-bucket)" - sem undefined na saida
porta do mysql no host     docker inspect NetworkSettings.Ports do container mysql: 3306/tcp e 33060/tcp
                           sem vinculo publicado (null) — nao ha socket por onde o dump leia o MySQL da
                           casa; nenhuma das janelas 5173/3001/5174/3002 aparece la
banco da pilha             35 tabelas antes e depois da regua, e nexusbm_restauracao com 0 schemata no fim
                           (o DROP do finally aconteceu); nenhuma seed da casa foi gravada ali
banco de desenvolvimento   35 tabelas / 70.897 linhas exatas (COUNT(*) tabela por tabela, sem estimativa
                           do information_schema) — o mesmo numero do fecho da T5.0 e da T5.1
banco de prova             35 tabelas / 30.027 linhas exatas, no mesmo metodo, medidas depois do npm test
                           desta rodada (audit_logs e a maior, com 27.919)
codificacao                13 arquivos desta tarefa: BOM 0, CR 0, newline final em todos, e o
                           `git status` fecha com exatamente estes 13 — nenhum arquivo fora da varredura
segredos                   9 batidas de padrao de credencial nos 13 arquivos, todas prosa de documentacao
                           que ja estava la (mysql://usuario:senha@host do README, ADMIN_CRIAR_SENHA e
                           SEED_DEV_PASSWORD de PRODUCAO, AUDITORIA e CHANGELOG); conferidas linha por linha
                           por igualdade contra os 11 valores unicos de .env, .env.docker e ambiente: 0 linhas
                           de batida com credencial desta maquina, 0 com o endereco real do dono, nenhum
                           valor impresso. A primeira versao desta varredura comparava o arquivo inteiro em
                           vez da linha da batida, e dava 15 coincidencias falsas — corrigido na ferramenta
                           de portao, nao no produto
telas do produto           nenhuma: a tarefa e de deploy, ferramenta de operacao e documentacao. Nenhuma
                           captura foi regravada e docs/screenshots fechou com 0 arquivos modificados
```

### Portões da T5.3 (2026-10-14, entrega de e-mail fora do request)

```
npm run typecheck          codigo 0 (api + web, sem saida) — reexecutado na arvore final, depois do ultimo
                           edit de comentario em fila.ts e das seis correcoes de numero nos documentos
npm run build              codigo 0, sem aviso de chunk, em 2.98 s — 37 arquivos de JS e 1 de CSS em
                           apps/web/dist/assets; index 354,85 kB / 121,62 kB gzip e Agenda 286,34 / 83,52,
                           os mesmos numeros da T4, da T5.1 e da T5.2: nenhum arquivo do frontend foi tocado
npm test                   codigo de saida 0 — api 48 arquivos / 442 casos em 309,44 s (na T5.2 eram
                           47 / 437) e web 18 arquivos / 140 casos; zero falha e zero skip nos dois, ambos
                           contra o banco nexusbusinessmanager_teste (D6). Nenhum caso foi removido, pulado
                           ou enfraquecido: os quatro arquivos que leem caixa de e-mail ganharam dreno nos
                           hooks e nas leituras, e a contabilidade fecha em +1 arquivo e +5 casos, exatamente
                           o arquivo novo da fila
guarda de caracteres       npx vitest run test/caracteres-permitidos.test.ts: 4 passed (4) em 514 ms,
                           codigo 0 — a varredura do repositorio ja cobre o fila.ts e o teste novos
caso do tempo, isolado     npx vitest run test/fila-de-mail.test.ts: 5 passed (5), codigo 0. No pedido que a
                           assercao mede, o pino carimba "responseTime":7,4331999999999425 com um entregador
                           injetado de 600 ms; no mesmo instante a caixa do entregador tinha 0 mensagens e a
                           fila, 1 mensagem viva. As duas leituras nao dependem de relogio e vao junto com a
                           de tempo, de proposito: o atraso de prova subiu de 250 para 600 ms porque a
                           maquina deu 259 ms numa corrida com teto de 250 ms
regua da topologia         tools/verify-pilha-de-prova.cjs: 8 verificacoes, 0 falhas, codigo 0. Nenhuma
                           ferramenta nova entrou nesta tarefa, entao a varredura segue em 36 arquivos
regua da pilha             tools/verify-docker.cjs com a pilha de pe: 29 verificacoes, 0 falhas, codigo 0.
                           Reexecutada porque smtp.ts mudou — os quatro tempos do transporte — e a API sobe
                           desse codigo. Declarado: o container api desta pilha e o build de tres horas
                           atras, anterior a esta tarefa; a metade estatica (compose, Dockerfiles,
                           .dockerignore) e a trilha painel -> nginx -> api -> mysql foram medidas como
                           estao, e o codigo novo desta tarefa ainda nao esta na imagem
regua do backup            NAO REEXECUTADA, e o motivo e conferivel: nenhum dos arquivos que ela exercita
                           (deploy/backup-mysql.cjs, deploy/restaurar-mysql.cjs, docker-compose.yml) esta
                           entre os 23 desta tarefa. A medicao vigente e a da T5.2 — 56 verificacoes, 0 falhas
banco de desenvolvimento   35 tabelas / 70.901 linhas exatas (COUNT(*) tabela por tabela, sem estimativa do
                           information_schema), medido antes e depois do npm test desta rodada — o mesmo
                           numero nos dois momentos, entao a suite nao escreveu ali (D6). O portao da T5.2
                           mediu 70.897: a diferenca de 4 linhas foi investigada e ha 16 linhas de auditoria
                           de hoje nesse banco (auth.login, auth.login_falhou, auth.logout) espalhadas entre
                           14:53 e 20:52, padrao de uso interativo da casa. Causa nao provada, e declarada
                           como nao provada
banco de prova             35 tabelas / 31.375 linhas antes -> 35 tabelas / 32.523 depois do npm test, no
                           mesmo metodo; audit_logs foi de 29.258 para 30.397 e concentra 1.139 das 1.148
                           linhas novas. O crescimento e da propria suite, que carimba auditoria a cada
                           chamada de autenticacao; nao separei quanto vem de cada arquivo de teste
codificacao                23 arquivos desta tarefa: BOM 0, CR 0, newline final em todos, e o `git status`
                           fecha com exatamente estes 23. Nenhuma letra de alfabeto nao latino e nenhum emoji
                           entraram nesta rodada: o `git diff -U0` devolve 0 linhas adicionadas com esses
                           caracteres, e o emoji de obra segue nas 11 ocorrencias pre-existentes de README.md
                           (linhas 505, 509, 510 e 512, 9 vezes) e CHANGELOG.md (1481 e 1482, 2 vezes). A
                           varredura de caracteres permitidos roda sobre todo o repositorio e fechou verde
                           depois desta linha: 4 passed (4) em 514 ms
segredos                   varredura dos 23 arquivos contra os 29 valores unicos de .env, .env.docker,
                           .env.example e ambiente: 122 batidas de padrao de credencial, 1 linha de batida
                           igual a um valor desta maquina — docs/AUDITORIA.md:907 contem admin@exemplo.test,
                           que e o valor de SUPER_ADMIN_EMAIL no .env da raiz e e endereco de exemplo usado
                           como prosa desde o commit ecb3f28, nao credencial. 0 linhas com o endereco real do
                           dono e nenhum valor impresso em ferramenta, teste, documento ou log. As batidas
                           de segundo-fator (35), auth.service (23), guardas-herdadas (20) e .env.example (6)
                           sao nomes de chave e literais de teste, nao valores
ferramenta de portao       cinco erros meus, corrigidos na ferramenta e nao no produto, declarados aqui:
                           (1) rascunhei uma funcao com placeholder que nao compila, e a primeira varredura
                           nao rodou; (2) a DATABASE_URL do .env vem entre aspas e o regex nao batia; (3) os
                           nomes de tabela chegaram com CR e o MySQL devolveu "Incorrect table name
                           '_prisma_migrations'"; (4) as tabelas precisaram ser qualificadas pelo banco;
                           (5) uma credencial sem dois-pontos foi cortada como se tivesse, virou usuario
                           "roo" e devolveu ERROR 1103 e 1524. Nenhum deles mudou uma linha do produto
telas do produto           nenhuma: a tarefa e de backend, entrega de e-mail e documentacao. Nenhuma
```

### Portões da T5.4 (2026-10-14, aviso do sino com cópia por e-mail — N59)

```
npm run typecheck          codigo 0 (api + web, sem saida), reexecutado na arvore final
npm run build              codigo 0, sem aviso de chunk, em 2,95 s — 37 arquivos de JS e 1 de CSS;
                           index 355,04 kB / 121,72 kB gzip (354,85 / 121,62 na T5.3: a diferenca de
                           190 bytes e o quadro de canal que a tela de avisos passou a montar),
                           Notifications 9,76 / 3,37, Agenda 286,34 / 83,53, CSS unico 398,54 / 61,29
                           — os mesmos numeros de bundle da T4.8, da T5.1, da T5.2 e da T5.3
npm test                   codigo de saida 0 nos dois lados: api 49 arquivos / 450 casos em 313,92 s
                           (eram 48 / 442 na T5.3) e web 19 arquivos / 144 casos em 9,41 s (eram
                           18 / 140). Zero falha, zero skip, ambos contra nexusbusinessmanager_teste
                           (D6). A conta fecha com os dois arquivos novos: +1 arquivo e +8 casos na
                           api, +1 arquivo e +4 casos no web. Nenhuma assercao foi removida, pulada
                           ou enfraquecida
casos da tarefa, isolados  npx vitest run test/avisos-por-email.test.ts: 8 passed (8) em 13,94 s.
                           Antes da implementacao, o mesmo arquivo marcou 6 failed | 2 passed, e o
                           par de tela marcou 3 failed | 1 passed — os dois vermelhos estao
                           transcritos na linha do N59 em docs/AUDITORIA.md
guarda de caracteres       npx vitest run test/caracteres-permitidos.test.ts: 4 passed (4) em 521 ms,
                           codigo 0 — a varredura do repositorio ja cobre os dois arquivos de teste
                           novos, os seis documentos e as tres telas mexidas
prova de navegador         tools/verify-notificacoes.cjs na pilha de prova (5174/3002): 88 checacoes,
                           0 falhas. As tres checagens novas do quadro de e-mail sairam amarradas ao
                           estado real desta instalacao: disponivel=false, transporte=console, e a
                           dica repetindo o motivo que a rota devolveu. A prova agora vale com e sem
                           SMTP: com canal indisponivel ela exige que a frase da varredura NAO fale
                           de fila de e-mail; disponivel, ela exige o contrario
prova das rotinas          tools/verify-rotinas.cjs: 37 verificacoes, 0 falhas — reexecutada porque a
                           frase da coluna "ultima execucao" mudou (fecha com "· N e-mail(s)"). A
                           prova ja conferia formato, nao texto fixo, e continuou conferindo
regua da topologia         tools/verify-pilha-de-prova.cjs com a pilha no ar: 7 verificacoes, 0 falhas,
                           codigo 0 (o oitavo caso e o de limpeza do ponteiro, que nao se mede com a
                           pilha de pe — a propria regua diz isso na saida)
banco de desenvolvimento   35 tabelas / 70.901 linhas exatas (COUNT(*) tabela por tabela), medido
                           depois de toda esta rodada — o mesmo numero da T5.3, entao nem a suíte nem
                           as duas provas de navegador escreveram na casa do dono (D6, N65)
banco de prova             antes da corrida de navegador: notifications 12, notification_preferences 1,
                           finance_entries PENDENTE 0, users 182, companies 3, 35 tabelas.
                           depois: os mesmos 12 / 1 / 0 / 182 / 3 e as mesmas 35 tabelas. O unico
                           numero que mexeu foi audit_logs com action notification%: 97 -> 99, e as
                           duas linhas sao a auditoria do produto (notification.scan), nao sobra de
                           prova — o finally da ferramenta apagou os 24 avisos e os 12 lancamentos
                           que ela criou, medido na saida como "sobraram 0"
codificacao                28 arquivos desta tarefa, medidos um a um: 22 de texto (11 de codigo, 2 de
                           teste, 8 de documento, 1 de ferramenta) mais 6 capturas binarias. Nos 22 de
                           texto: BOM 0, CR 0, newline final em todos. Alfabeto nao latino e emoji: a
                           guarda do repositorio (`apps/api/test/caracteres-permitidos.test.ts`, 4 casos
                           sobre `git ls-files --cached --others --exclude-standard`) fechou verde, e ela
                           varre o arvore inteiro, nao so esta tarefa
segredos                   varredura dos 22 arquivos de texto desta tarefa contra os padroes de valor de
                           credencial (chave de API, chave privada, token de plataforma, senha de SMTP
                           entre aspas), sem imprimir valor: 0 batidas. As batidas de nome (password,
                           token, secret) sao
                           identificadores e prosa de comentario, conferidas linha por linha. Os dois
                           enderecos que aparecem nos testes sao <uid>@nexus.test, dominio reservado
                           pela RFC 6761, e o log da prova de navegador nao imprime caixa postal
                           inteira nenhuma — a linha de falha carrega o endereco mascarado
capturas                   6 arquivos modificados em docs/screenshots: 21-notificacoes-preferencias.png
                           (a dica do canal virou estado da API, e o texto cresceu duas linhas) e o
                           grupo 23-rotinas-* (tela, executou, confirmacao, claro, celular), em que a
                           coluna "ultima execucao" agora fecha com "· 0 e-mails". As seis foram
                           abertas e conferidas uma a uma antes de entrar: sem credencial, sem dado de
                           pessoa real, sem numero de prova no lugar de numero de produto.
                           21-notificacoes-sino.png NAO entrou: a diferenca para a canonica era
                           contagem transitatoria, nao interface. As outras quatro do grupo das
                           notificacoes sairam byte a byte iguais a esta rodada (mesmo sha256), o que
                           confere que a prova esta fotografando a mesma tela de sempre
fora do escopo, declarado  N76 aberto (as tres mensagens antigas interpolam primeiroNome sem escape no
                           HTML — auto-XSS de mensagem, sem terceiro envolvido; vai para o SECURITY.md
                           da T6); N77 corrigido e declarado (a tabela de modulos do README dizia que
                           backup estava "a caminho" quando a T5.2 ja o entregou); N61 continua sendo o
                           proximo item da T5; e a fila segue sem persistencia nem entrega confirmada
                           por aviso (N74, ADR-0020)
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
| G1. Envio de e-mail (SMTP) | PARCIAL — decisão D1 tomada e implementada, falta operação | `docs/decisoes/G1-envio-de-email.md` + `docs/adr/0013-reforco-de-autenticacao-smtp-verificacao-e-totp.md`. O dono respondeu na rodada de continuação (2026-10-13): porta `MailerPort` com adaptador SMTP genérico (`SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM`), console fora de produção e caixa em memória na suíte. Os três envios que existem hoje são verificação de cadastro, recuperação de senha e aviso de que o segundo fator foi ligado. Falta: credencial real de ambiente (é do dono, nunca no repositório), a entrega fora do request (N58 / T5), o chamador de e-mail do sino e do relatório diário (N59 / T5) e a leitura da tabela `email_templates`, que continua sem uso nenhum. |
| G2. Cobrança, planos e assinatura | BLOQUEADO POR DECISÃO | `docs/decisoes/G2-cobranca-e-assinatura.md` |
| G3. Fiscal brasileiro (NF-e) | BLOQUEADO POR DECISÃO | `docs/decisoes/G3-fiscal-nfe.md` |
| G4. Cadastro sem verificação de e-mail | PARCIAL — decisão D2 tomada e implementada, falta a palavra final sobre autoinscrição | `docs/decisoes/G4-cadastro-aberto.md` + ADR 0013. `REQUIRE_EMAIL_VERIFICATION=1` deixa o cadastro novo do lado de fora do painel até o clique no link, com tela pública `/verificar-e-mail`, reenvio limitado e resposta que não denuncia endereço; a régua de produção exige o `1` ligado, e desenvolvimento e teste continuam desligados por padrão. O que a decisão do dono ainda não respondeu é o item aberto original: se a autoinscrição pública permanece aberta ou passa a convite. Falta também a porta administrativa de confirmação (N61 / T5). |
| G5. Hospedagem, domínio, HTTPS e backup | BLOQUEADO POR DECISÃO | `docs/decisoes/G5-hospedagem-e-backup.md` |
| G6. Licença do repositório | BLOQUEADO POR DECISÃO | `docs/decisoes/G6-licenca.md` |
| G8. Administrador da plataforma é OWNER de todas as empresas | PARCIAL — D entregue, A/B/C aguardam | `docs/decisoes/G8-administrador-da-plataforma.md` + `docs/adr/0007-escopo-da-auditoria.md`. As três portas de auto-OWNER (`auth.service.ts:279-293`, `companies.service.ts:34-47`, `seed.ts:107-115`) continuam como o dono decidiu, e a parte tecnicamente indefensável foi fechada na F2: a trilha da plataforma existe, separada por construção, com tela própria e aviso na auditoria do tenant. Falta a parte A (política de privacidade e contrato dizendo a regra) e a decisão de migrar para B (break-glass), ambas com o dono.
| G7. Senha do administrador publicada em captura, com histórico | BLOQUEADO POR DECISÃO | Achado N1 de `docs/AUDITORIA.md`: `docs/screenshots/02-login.png` mostra a senha real revelada, está na galeria do `README.md` e já está no `origin/main`. Exige (a) trocar a senha, (b) recapturar sem o olho ligado e tirar o clique dos dois `tools/shoot*.cjs`, (c) decidir se o histórico é reescrito. O push desta rodada ficou parado por causa disso. |

Nenhum adaptador de terceiros foi escrito além do que a decisão do dono autoriza: o contrato manda entregar
porta + adaptador falso + documento de decisão **depois** da escolha do dono, e proíbe inventar integração sem
credencial. O único adaptador real que existe hoje é o de SMTP genérico (D1, 2026-10-13) — servidor de e-mail
comum, sem chave de produto, sem SDK de fornecedor. Gateway de pagamento, fiscal e assinatura seguem com porta
aberta e nenhuma chamada de saída.

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
