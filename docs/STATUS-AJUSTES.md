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
| F6. Docker, compose com 3306 fechado e `docs/PRODUCAO.md` | EM ANDAMENTO | A abertura da tarefa (T5.0, topologia de prova) está FEITA e registrada na tabela da rodada: a pilha de prova vive na 3002/5174 e a porta do dono (3001/5173) deixou de ser disputada. O que falta da F6: `Dockerfile` e compose com 3306 fechado, `docs/PRODUCAO.md` re-medido, backup (seção 45), e-mail assíncrono (N58), sino (N59) e porta administrativa de confirmação (N61). |
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
