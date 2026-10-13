# Changelog

Todas as mudanças notáveis deste projeto, em português brasileiro.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), ordem mais novo primeiro.

## [Não lançado]

### A demonstração deixou de caber num banco de produção (2026-10-12)

- **Cada peça da vitrine pede a própria senha de ambiente.** `ALLOW_DEV_SEED=1` passa a liberar apenas a subida
  do seed em produção: administrador da plataforma e rotinas. A empresa de demonstração `nexus-demo` agora só
  entra com `SEED_DEMO_COMPANY=1`, declaração escrita de propósito, igual à conta de desenvolvimento, que já
  dependia de `SEED_DEV_ACCOUNT=1`.
- **Conta dev sem casa é recusa, não meio cadastro.** Pedir `admin@nexus.local` em produção sem a empresa de
  demonstração derruba o seed com o motivo na mensagem: a conta dev é `OWNER` daquela casa, então uma peça sem a
  outra não administraria nada.
- **Prova pelo plano de escrita.** `apps/api/test/garantias-conta-de-demonstracao.test.ts` (9 casos) injeta um
  cliente Prisma que registra cada upsert em vez de escrever: em produção não sai nenhuma empresa, sai um único
  usuário e saem as cinco rotinas. A recusa continua medida no banco real, agora contando usuários e empresas
  antes e depois.
- **Nada rotacionado, por decisão do dono.** As contas fictícias e suas senhas de desenvolvimento ficam como
  estão (§0.1 do PROMPT MESTRE): o que mudou é a porta que as impede de aparecer em produção.
- **Porta estrutural de credencial.** `identificadores-fora-do-codigo.test.ts` ganhou a varredura que proíbe
  `SEED_ADMIN_PASSWORD`, `SEED_DEV_PASSWORD` e `NEXUS_CAPTURA_SENHA` de receber valor literal em qualquer arquivo
  rastreado — e o próprio teste confere que a armadilha continua pegando um exemplo escrito na própria linha do teste.
- **Documentado onde se lê.** `apps/api/.env.example` e o README trazem a trava nova; a decisão está em
  `docs/adr/0005-semente-sem-demonstracao-em-producao.md`.

### O rodapé do produto deixou de ser dois: vitrine e painel agora usam um só componente (2026-10-12)

- **Um componente, um arquivo de marca.** `AppFooter` (`apps/web/src/components/layout/AppFooter.tsx`) passou a ser
  o rodapé da vitrine, da página de documento legal e do painel. `LandingFooter` foi apagado e o
  `<footer className="admin-footer">` do `AdminShell` saiu de cena junto com as regras CSS dos dois. Nome do
  produto, autor, crédito e rótulos institucionais moram em `apps/web/src/lib/brand.ts`.
- **Versão que ninguém digita.** O selo `v0.1.0` vem do `package.json`, injetado no build por `define` em
  `apps/web/vite.config.ts` (e no `vitest.config.ts`, para o teste ver o mesmo dado). O `dist` gerado foi aberto e
  conferido: a string da versão está no bundle.
- **Crédito personalizado, sem link inventado.** "Desenvolvido por Clayton Marcelo" continua no rodapé, como
  decidiu o dono. Vira âncora apenas quando `urlDoAutor` estiver preenchida — e aí com `target="_blank"` e
  `rel="noopener noreferrer"`.
- **Documento legal só aparece publicado.** Termos de uso, Política de privacidade e Adequação à LGPD entram no
  rodapé quando o CMS diz `published`; documento publicado sem título cai no rótulo institucional do arquivo de
  marca; nenhum link sai vazio ou com `#`.
- **Estado do serviço com dado real.** `apps/web/src/lib/statusServico.ts` lê `GET /api/health` e confere campo a
  campo (`status` em ok/degraded, `db` em up/down). Sem resposta válida, o indicador não existe na tela. Medido no
  navegador com a API de pé: "Serviço operacional".
- **Contraste medido, não prometido.** O texto do rodapé saiu de `--text-3` (4,02:1 no escuro e 3,14:1 no claro —
  reprovado nos dois) para `--text-2` (8,64:1 e 5,50:1). Cor vem só de token, então os dois temas vestem o mesmo
  componente.
- **A armadilha que o nome escondia.** O AdminLTE 4 já define `.app-footer` com `background-color:
  var(--bs-body-bg)`, padding e altura próprios. A primeira captura mostrou uma faixa branca no pé da vitrine — o
  rodapé do projeto passou a `.nexus-footer`, e a faixa sumiu (fundo medido: `rgba(0, 0, 0, 0)`).
- **Portões da rodada:** typecheck limpo; build 882,31 kB de JS (262,77 kB gzip) e 387,27 kB de CSS (59,26 kB gzip); API 31 arquivos / 250 casos; web 6
  arquivos / 39 casos. Os 12 casos novos estão em `apps/web/src/test/rodape-unico.test.tsx`, escritos antes do
  componente, com o vermelho na tela: `Failed to resolve import "../components/layout/AppFooter"`.
- **Também nesta rodada:** o guarda `identificadores-fora-do-codigo.test.ts` parou de quebrar diante de arquivo que
  ainda está no índice do git mas já foi apagado do disco — foram 3 falhas `ENOENT` provocadas pela apagada do
  `LandingFooter` antes do `git add`. A varredura continua cobrindo tudo o que existe nos dois lugares, e o
  histórico publicado segue coberto pela varredura de patch.

### A ponta pública do repositório parou de ter dado sensível: a limpeza da rodada de segurança foi publicada (2026-10-12)

- **O que estava em jogo, medido ref por ref:** o `origin/main` tinha 30 ocorrências em 36 linhas — o e-mail
  pessoal do administrador em 27 arquivos e a senha de desenvolvimento em `apps/api/.env.example:37`,
  `apps/api/test/seed-seguro.test.ts:56` e `tools/shoot-clients.cjs:17` — mais 9 capturas com dado real. A árvore
  local tinha zero de tudo isso, esperando um push que o portão de avanço direto não deixava acontecer.
- **O desfecho, decidido pelo dono:** três commits do próprio dono no GitHub ("Update README.md") tinham
  revertido o README para a versão anterior à rodada da vitrine. Autorizado o merge com o README local vencendo:
  `git merge origin/main` → `772cc77`, conflito resolvido com o texto limpo (917 linhas, zero marca de conflito,
  nenhum domínio pessoal). Push `2cfa2e9..772cc77`, provado por `git ls-remote origin HEAD` igual a
  `git rev-parse HEAD`. Nada foi forçado, reescrito ou rebaseado.
- **Portões corrida com o banco religado:** API 31 arquivos / 250 casos, web 5 / 27, typecheck e build limpos,
  284 arquivos de texto sem BOM e sem CRLF, guarda de caracteres 4/4, e o patch publicado sem nenhuma
  ocorrência de chave privada, token, credencial literal ou chave de nuvem.
- **Fica de fora, registrado:** o histórico antigo do GitHub continua com o que foi publicado antes — decisão
  do dono (item 1 do PROMPT MESTRE) de não rotacionar nem reescrever nada por causa disso — e o README do
  GitHub tem um "Sumário" de 16 entradas e uma seção "Estado atual" que o texto local não tem.


### O alfabeto do projeto ganhou porta: varredura de caracteres não latinos e o guarda que não deixa voltar (2026-10-12)

- **O que a regra diz, agora com teste.** O PROMPT MESTRE proíbe caractere de alfabeto não latino em arquivo,
  mensagem de commit, documentação e relatório. A F1.1 varreu os quatro escopos — 284 arquivos de texto, todas as
  mensagens do histórico (`git log --format=%B`), o patch dos commits ainda não publicados e o `README.md` que
  está no `origin/main` — e o único achado foram **quatro ocorrências de U+03A3**, o sigma grego usado como
  símbolo de somatória em `docs/AUDITORIA.md:462`, `:473` e `:527`. Nenhuma outra, em lugar nenhum.
- **Reescrito, não apagado.** As três frases continuam dizendo a mesma conta: "total = soma das linhas",
  "soma das parcelas = total da nota" e `soma(ENTRADAS) − soma(SAIDAS)` do razão. Trocou-se a notação grega pela
  latina, que é o padrão do projeto, e o sentido de fechamento contábil ficou intacto.
- **A porta (`apps/api/test/caracteres-permitidos.test.ts`, 4 casos).** Ela caça 35 scripts não latinos por
  propriedade Unicode — `\p{Script=Han}`, `\p{Script=Cyrillic}` e companhia — porque um guarda que procura
  caractere proibido não pode escrever o caractere proibido no próprio fonte; o quarto caso lê o fonte do guarda e
  falha se ele passar a carregar. Varre `git ls-files --cached --others --exclude-standard`, então pega até
  arquivo novo que ainda nem foi indexado, e confere a mensagem do commit no topo da árvore. Símbolos de
  `Script=Common` (travessão, seta, moeda, ordinais) ficam fora de propósito: não são alfabeto, e o texto do
  projeto usa vários.
- **Vermelho antes de verde, duas vezes.** Com o sigma ainda na árvore, o guarda falhou apontando as quatro
  ocorrências por arquivo, linha e code point — nunca pelo caractere. Depois, um arquivo temporário montado por
  `String.fromCodePoint` (não por literal) provocou a falha `docs/_prova-caractere-proibido.md:3 U+4E00`; o
  arquivo foi apagado em seguida. Verde final: `Test Files 1 passed (1) / Tests 4 passed (4)`.
- **F0 não publicou, e o motivo é do dono.** `git fetch origin` trouxe três commits do próprio dono no GitHub
  ("Update README.md", só `README.md`), e a medição é `## main...origin/main [ahead 3, behind 3]` com
  `git merge-base --is-ancestor origin/main HEAD` respondendo **NÃO**. Sem avanço direto o PROMPT MESTRE veda
  pull, merge, rebase e force, então nada foi publicado. Importa porque o `origin/main` ainda expõe 30
  ocorrências em 36 linhas (e-mail pessoal do administrador em 27 arquivos, senha de desenvolvimento em três) e 9
  capturas com dado real, enquanto o `HEAD` local tem zero: a limpeza está commitada e esperando essa decisão.
- **Portões desta rodada.** Typecheck ok, build ok (881,04 kB / 262,35 kB gzip, aviso de chunk acima de 500 kB
  continua de pé e vira trabalho da F5), BOM zero e CRLF zero. A suíte da API está como **NÃO VERIFICADO**: o
  MySQL do WAMP parou ("Can't reach database server at `localhost:3306`"), e subir o `mysqld` por conta própria
  esbarra em permissão do disco (errno 13). O guarda novo não usa banco e por isso foi validado isoladamente.

### Documentada a decisão que estava escondida no cadastro: o administrador da plataforma entra em toda empresa (2026-10-12)

- **O que foi lido, não alterado.** A tarefa R3 da rodada de segurança era relatório, e foi isso que ela foi:
  cinco arquivos lidos com calma (`companies.service.ts`, `prisma/seed.ts`, `passwordPolicy.ts`,
  `users.service.ts`, `company-context.ts`) mais o `auth.service.ts`, o `audit.ts` e o `platform.ts` que a regra
  toca de fato. Nenhuma permissão mudou neste commit.
- **A resposta curta:** sim — toda empresa nova nasce com o administrador global como `OWNER`, por três portas
  (`auth.service.ts:279-293` no cadastro, `companies.service.ts:34-47` na criação de empresa e
  `prisma/seed.ts:107-115`, que repõe o vínculo em **todas** as empresas do banco a cada corrida do seed). Ele
  não perde o papel (`users.service.ts:115-124`), e `OWNER` é `["*"]` na matriz de permissões. Não há bypass de
  isolamento: cada requisição continua conferindo vínculo, conta ativa e empresa ativa em
  `company-context.ts:20-47` — é o vínculo universal que abre a porta.
- **O que não existe:** auditoria separada do administrador. A trilha grava o mesmo par
  usuário/empresa de qualquer pessoa, e a tela filtra pela empresa do contexto. Cada dono vê a ação do
  administrador no próprio log — o que é bom —, mas não há visão de plataforma, nem marca de "agiu como
  plataforma", nem aviso a quem entra. Pior: as rotas da plataforma gravam a auditoria na empresa que estava
  ativa na sessão de quem clicou (achado N14).
- **Por que isso importa:** é a diferença entre operador e controlador na LGPD (arts. 5º II e VII, 6º I/III/VI,
  39 e 46), e é uma cláusula que hoje só existe no código.
- **O documento:** `docs/decisoes/G8-administrador-da-plataforma.md` põe o risco em português, compara quatro
  saídas (A honestidade documental · B acesso elevado sob demanda, com motivo e validade · C OWNER só em
  demonstração · D manter o vínculo e auditar à parte) com prós, contras e esforço, e recomenda **A + D agora,
  B como destino**. O `docs/STATUS-AJUSTES.md` ganhou a linha G8. A decisão é do dono, e nada anda até ela
  chegar.

### O endereço do dono e a senha de desenvolvimento saíram do repositório (2026-10-12)

- **Onde estava, medido antes de mexer**: o endereço pessoal do administrador global tinha **32 ocorrências em
  25 arquivos rastreados** (README, CHANGELOG, `docs/AUDITORIA.md`, `.env.example`, `seed.ts`,
  `passwordPolicy.ts`, dois testes e 17 ferramentas de `tools/`), e era o único endereço de domínio
  pessoal do repositório. A
  senha de desenvolvimento do seed estava em três linhas.
- **De onde chega agora**: `SUPER_ADMIN_EMAIL` no ambiente, sempre. Fora de produção o padrão é a conta
  fictícia `admin@exemplo.test`, que não casa com usuário nenhum; em produção a falta da variável derruba a API
  no validador de `config/producao.ts` e derruba o seed. A lógica de proteção não mudou — continua sendo a
  bandeira `platformRole` no banco, e o comparador de `users.service.ts` lê a mesma constante de antes.
- **As 16 ferramentas que repetiam a string** passaram a usar o `EMAIL_ADMIN` de `tools/senha-admin.cjs`, que
  agora resolve o endereço na mesma ordem da senha: `NEXUS_ADMIN_EMAIL` → `tools/senha-admin.local.cjs` →
  `SUPER_ADMIN_EMAIL` do `.env` da API → para com aviso claro. Prova de que continua funcionando:
  `NEXUS_PROVA_FOTOS=05-auditoria node tools/shoot.cjs` abriu sessão com a conta do administrador.
- **`.env.example` não carrega valor de senha nenhum**: `SEED_DEV_PASSWORD=defina-uma-senha-forte` e
  `SUPER_ADMIN_EMAIL=admin@exemplo.test`, e `seed-seguro.test.ts` sorteia a própria senha de teste a cada
  corrida com `randomBytes(9)`.
- **A porta que impede o volta**: `apps/api/test/identificadores-fora-do-codigo.test.ts` (**6 casos**) varre
  todos os arquivos rastreados e falha se o endereço, qualquer domínio de e-mail pessoal ou a senha de
  desenvolvimento
  reaparecer; o validador de produção ganhou **2 casos** (21 no arquivo). Antes do ajuste, os testes novos
  derrubaram 10 dos 33 arquivos da suíte.
- **Aviso ao dono**: a senha da conta de desenvolvimento `admin@nexus.local` esteve em arquivo rastreado e está
  no histórico público — ela deve ser trocada no `.env` local e regravada pelo seed. Não é a senha do
  administrador global nem a de empresa real, mas é credencial legível por quem clonar o repositório.
- **Achado registrado, nada corrigido**: a `05-auditoria.png` commitada é de antes dos group headers da sidebar
  e da coluna "Quem". A recaptura da prova foi descartada (o arquivo voltou aos bytes do `HEAD`) porque
  atualização de vitrine é trabalho de documentação, não de segurança — está na N13, e só essa imagem foi
  conferida.

### As capturas do repositório passaram a provar sem credencial de ninguém (2026-10-12)

- **109 imagens conferidas uma a uma**: 101 PNGs em `docs/screenshots/` e 8 arquivos de marca. Nove delas
  mostravam dado sensível real — a senha do administrador em texto (`02-login.png`), o código de recuperação
  de 64 caracteres (`09-recuperar-senha.png`), o e-mail pessoal do dono em quatro telas de conta e
  configurações, e dois e-mails reais na lista de usuários (`04-usuarios`, `18-tabs-usuarios` e a versão de
  celular). As nove foram recapturadas; as outras 92 não mudaram de byte.
- **Nasceu a conta de demonstração fictícia** (`tools/conta-de-captura.cjs`): `demo@exemplo.test` /
  "Demonstracao Ficticia", criada pela própria ferramenta no primeiro uso, com senha de 24 caracteres gerada
  por `crypto.randomInt` e guardada em `tools/conta-de-captura.local.json`, agora ignorado. Nenhum script de
  prova digita credencial real nem clica no botão do olho.
- **A recaptura seletiva existe para não criar ruído**: `NEXUS_PROVA_FOTOS` e `NEXUS_PROVA_PAGINAS` deixam o
  roteiro rodar de ponta a ponta fotografando só as telas pedidas. Foi por isso que `08-cadastro.png`,
  regravada sem necessidade numa corrida, voltou a ser exatamente o arquivo do `HEAD`.
- **Uma asserção para cada promessa**: `apps/api/test/capturas-sem-credencial.test.ts` (**8 casos**) varre os
  `tools/*.cjs` atrás de literal de senha, credencial de desenvolvimento, clique no olho, import do
  `senha-admin.cjs` e sequência hexadecimal na tela de recuperação. Antes da mudança, os mesmos padrões
  acusaram 7 ofensas em cinco arquivos contra o conteúdo do `HEAD`.
- **O que a revisão revelou e não foi escondido**: criar uma conta adiciona o administrador global como
  OWNER da empresa recém-nascida, então a tela de Usuários de qualquer empresa nova lista o administrador
  (achado N10, com o desdobramento em `docs/decisoes/G8-administrador-da-plataforma.md`); o rodapé do painel
  e da vitrine assina o nome do dono em quase toda captura (N11); e um conjunto de imagens traz resíduo do
  banco de desenvolvimento — `Empresa-<timestamp>`, "PROVA-SINO", "Teste Direto XYZ" (N12), que é limpeza de
  banco, não de pixel. A tabela completa está em `docs/AUDITORIA.md`, e a N5 ("não verificado") foi
  encerrada.

### A vitrine parou de falar a língua de quem constrói o sistema (2026-10-12)

- **O que estava na tela era texto de prova, não cadastro.** Os cartões "Como o conteúdo chega na página?",
  "Dá para esconder uma seção?" e o destaque "Destaque de exemplo / Ver" não vinham do banco: vinham de
  `tools/verify-landing-cms.cjs`. A prova publica conteúdo para conferir se o editor chega na vitrine, e o
  que ela publicava era fala de desenvolvedor — visível em `19-landing-cms-*.png` e em qualquer visita à
  página durante a corrida.
- **A prova agora publica produto.** As três capacidades viraram "Vendas que dão baixa no estoque",
  "Financeiro com resumo do mês" e "CRM com funil e conversão"; o destaque virou "Comece pelo cadastro da
  empresa", apontando para `/cadastro`; as duas dúvidas passaram a ser as duas perguntas de quem chega
  ("Cada empresa vê só os próprios dados?" e "Preciso instalar alguma coisa?"). A métrica saiu do
  "R$ 1.234,50" inventado e virou **7 módulos** — conferível em `apps/api/src/modules`, que tem exatamente
  esses sete módulos de operação. Uma afirmação nova recusa qualquer item que volte a carregar "exemplo",
  "teste", "prova" ou "auditado", e a limpeza passou a purgar também os oito títulos antigos, para que uma
  base criada antes desta troca não fique com o cartão velho pendurado na vitrine.
- **Depoimento sem nota, e nota só quando alguém a dá.** O depoimento publicado pela prova é assinado por
  quem escreveu o sistema e não traz estrelas: nota é opinião de quem usa. A linha de estrelas agora aparece
  quando ela é cadastrada, e é exatamente isso que o passo 5 prova — um `PATCH` cadastra 4 de 5 no item, a
  tela passa a mostrar "4 de 5", e sem o cadastro a seção fica limpa.
- **Os quatro formatos da métrica saíram da tela e entraram no teste.** `valorDaMetrica` era função dentro
  do componente e virou `apps/web/src/lib/metricaVitrine.ts`, com
  `apps/web/src/test/metrica-da-vitrine.test.ts` (**7 casos**): número com pontuação brasileira, moeda,
  porcentagem, unidade, texto, valor ausente e formato desconhecido. É por isso que a prova de navegador pôde
  abrir mão da cifra inventada — a API só aceita número em `valor`, então moeda e porcentagem não têm como
  ser provados na tela sem mentir para o visitante.
- **O buraco de ~380px do "Sobre" fechou.** Medido em 1440×900 antes da mudança: a linha da seção media
  **450px** e a coluna do título, **63px** — um vazio embaixo de um `h2` sozinho. O parágrafo de
  apresentação desceu para debaixo do título (`.landing-sobre-lead`), e a coluna passou a medir **257px**
  contra os **343px** da coluna do detalhe. Nenhum parágrafo novo foi escrito para preencher: o que estava
  folgado de um lado só mudou de coluna.
- **Ritmo, não enchimento.** A grade de capacidades carregava 4rem de respiro próprio, então havia 109px
  antes do "Sobre" e 45px entre os outros blocos. O respiro passou para o `.landing-main`, uma distância só
  entre todas as seções. A página inteira mede hoje **1.545px** no lugar de **1.687px**, com o mesmo texto.
  Um destaque sozinho estreita a faixa para 760px em vez de esticar um cartão de 1.120px com duas linhas no
  canto, e o link "Ver" passou a dizer "Acessar" quando a rota é interna e "Abrir link" quando é externa.
- **Resíduo que a prova do editor deixava no banco.** `tools/verify-cms.cjs` trocava o título do documento
  legal para provar a escrita e devolvia só o texto: "Termos de uso do editor" ficou morando no banco e no
  `GET /api/public/landing`. A restauração agora devolve o título padrão do produto, uma afirmação nova
  confere `GET /cms/legal` depois da limpeza, e o valor que estava na base local foi purgado pela própria
  API.
- **Medido depois da mudança:** typecheck dos dois workspaces com **0 erros**, build ok, **28 arquivos /
  230 casos** verdes na API e **5 arquivos / 27 casos** no web (eram 4 / 20), e
  `node tools/verify-landing-cms.cjs` com **123 checagens / 0 falhas**. Saíram desta corrida as três
  capturas da vitrine montada pelo banco (`19-landing-cms-claro.png`, `-dark.png` e `-celular.png`), que são
  as únicas com mudança real: `01-landing.png`, `19-manutencao.png` e o grupo `20-*` voltaram ao que estava
  no repositório, porque a recaptura só teria o relógio da contagem regressiva e o quadro da animação do
  emblema diferentes. A conferência final do banco voltou com as cinco coleções de itens em **0** e os três
  documentos legais no título padrão, não publicados e sem texto.

### O retrato medido do projeto saiu do código: `docs/ESTADO-ATUAL.md` (2026-10-12)

- **Nada aqui veio de memória.** O arquivo novo é gerado de comando executado nesta rodada: as **105 rotas**
  da API lidas uma a uma dos 16 arquivos `*.routes.ts` (10 públicas, 14 de plataforma, 81 com permissão
  RBAC, **0 sem gate**), as **27 tabelas** cruzadas com o delegate que cada serviço realmente chama, as
  **24 rotas** React, os **386 arquivos rastreados**, as versões dos dois `package.json` e o MySQL **8.4.7**
  perguntado ao próprio servidor.
- **A cobertura foi medida com as duas pontas na mesa:** API em **85,57%** de instruções (2.301/2.689) e web
  em **8,59%** (309/3.597). O número baixo do web é dito com nome: **51 dos 77 arquivos instrumentados estão
  em 0%**, incluindo as 17 páginas de painel — a garantia dessas telas hoje são as provas de navegador, que
  não rodam sozinhas. Na API o oco tem endereço: `cron.runner.ts` a **0%** (o laço que dispara a rotina no
  processo do servidor não roda em teste) e `reports.service.ts` a **53,8%**.
- **Onde a documentação mentia, ficou escrito:** o README conta **8** rotas de autenticação e o código
  declara **10**; a tabela de tecnologias diz `react-router-dom 6` e o `package.json` traz `^7.18.4`.
  Registramos as divergências na seção 9 do inventário em vez de consertar por fora, porque o prompt desta
  rodada proíbe mudar comportamento sem relatar.
- **E um clone novo não compilava.** Medido no portão final: `npm ci` seguido de `npm run typecheck` devolve
  **217 erros**, porque a política de scripts do npm não deixa o Prisma gerar o cliente sozinho. Com
  `npm run prisma:generate -w @nexus/api` no meio, o mesmo clone passa em typecheck, build e nos **250 casos**
  das duas suítes. O achado é o **N9** da auditoria, e a linha que faltava entrou no passo a passo do README —
  uma linha de texto, sem tocar em script nenhum.
- **Verificado sem mudar comportamento:** os três portões no diretório de trabalho (typecheck com 0 erros,
  build ok, 28 arquivos / 230 casos e 4 arquivos / 20 casos verdes), a varredura de segredos — **a senha real
  do administrador não aparece em arquivo rastreado nem em nenhuma linha do histórico**, e a credencial de
  desenvolvimento que aparece continua à espera do aval do dono para ser publicada — e a codificação dos 386
  arquivos rastreados: **sem BOM, sem CRLF**.
- **A árvore do pacote foi conferida de novo, no clone, depois dos commits:** o mesmo
  `C:/wamp64/www/nexus-verificacao` foi atualizado para o commit empacotado e medido do zero — typecheck com
  **0 erros**, build **ok** (Vite em 8,75 s), **230 casos** verdes na API e **20** no web. A varredura de
  codificação refeita sobre os **387 arquivos rastreados** deu **0 BOM e 0 CR**. Uma linha da P2 do inventário
  escreveu por descuido o valor da credencial de desenvolvimento, e a correção tirou o literal do arquivo: a
  varredura manda registrar endereço, não senha.

---

### Toda sessão encerrada voltou a chegar à página de boas-vindas (2026-10-11)

- **O portão e o botão discordavam, e quem chegasse depois vencia.** `ProtectedRoute` tinha um destino só para
  quem não tem sessão — `/login` — e nenhuma forma de saber se a pessoa tinha uma sessão que acabou ou se era
  um visitante que nunca entrou. A vitrine aparecia depois do logout por um `navigate("/", { replace: true })`
  na mão do botão, correndo contra o próprio estado. Medido antes de editar arquivo: cinco dos sete casos
  vermelhos, dois deles com o painel ainda no ar em `/app/vendas` e a sessão já morta no disco.
- **O fim de sessão ganhou motivo.** `AuthContext` passou a registrar `logout`, `expirada` ou `outra-aba` num
  ref lido **uma única vez** por quem decide o destino — um estado não serviria, porque o `<Navigate>` é
  escolhido durante o render. A leitura esvazia o registro, então o "voltar" do navegador não reavisa ninguém,
  e o cache em `useRef` no portão é o que faz o StrictMode (que chama o render duas seguidas) ver o mesmo
  motivo nas duas passadas. Login e cadastro limpam o motivo: sessão nova não tem o que contar.
- **As cinco portas de saída, cada uma pelo caminho de verdade.** O botão "Sair"; o `nexus:session-expired`
  que a API dispara; o 401 de rota de negócio **sem** refresh token em disco, que antes virava rejeição
  silenciosa e deixava a pessoa numa tela autenticada morta; o `storage` da chave do refresh token — logout
  feito em outra aba, que agora encerra esta, com a rotação da renovação ignorada porque grava um valor novo;
  e a renovação recusada no *bootstrap*, que é o caso de quem fecha o navegador e volta semanas depois com o
  token vencido ou revogado. As quatro primeiras levam à vitrine com o histórico substituído; quem chega sem
  sessão nenhuma continua indo ao login, com a rota de origem guardada.
- **Preferência no lugar.** `tokenStore.clear()` continua tirando só `nexus.refresh` e `nexus.pulso`, e foi
  provado dos dois lados: no jsdom e no navegador, o `nexus.theme = light` atravessa entrar e sair do painel
  sem mudar um atributo. O `REFRESH_KEY` saiu de dentro do `tokenStore` para o ouvinte de `storage` saber o
  que procurar, sem copiar a string à mão.
- **Aviso em Toastr, nenhum `alert()`.** A vitrine lê o motivo do estado da rota e mostra "Sua sessão expirou.
  Entre novamente para continuar." só quando a sessão é que expirou — sair pelo botão é escolha da pessoa, e
  "tchau" a cada logout seria barulho. A prova instrumenta `window.alert` e `window.confirm` antes do primeiro
  documento de cada aba e exige que sigam intocados nos cinco caminhos.
- **A prova de logout estava certa por acidente.** `tools/verify-logout.cjs` procurava o botão "Sair" no
  instante em que a URL virava `/app` — o painel monta ~1,5 s depois, quando o bootstrap termina — e
  registrava `ok(true, ...)` fixo no login, então não media nada. Foi reescrita: espera a `.admin-shell`
  existir, empurra uma rota real para o histórico antes de sair (para o "voltar" ter o que reabrir), e percorre
  as cinco portas com **duas abas de verdade** e um 401 respondido pela própria prova. Ficou em **22
  checagens, 0 falhas**, e o "voltar" agora bate em `/login` com o painel desmontado.
- **Testes que começaram vermelhos.** `apps/web/src/test/fim-de-sessao.test.tsx`, sete casos, com o fluxo de
  sessão inteiro exercitado: a rede parada no adaptador do axios (`fabrica-api.ts`), sem trocar pedaço por
  imitação — interceptor de 401, renovação compartilhada, `AuthContext`, `ProtectedRoute` e a vitrine juntos. A
  suíte do navegador foi de 13 para **20 testes**; a da API segue em 230.
- **Registrado, não corrigido:** o AdminLTE veste peças por `data-bs-theme`, chave que este projeto nunca
  escreve (`apps/web/src/` tem zero ocorrências, o CSS do plugin tem 17 regras sob `[data-bs-theme="dark"]`).
  Sincronizá-la mudaria o desenho de todas as telas do painel e obrigaria a recapturar as seis telas do README
  e as oito provas de navegador — está em `docs/AUDITORIA.md`, seção "Novos achados" (N7), à espera do aval do
  dono. O diagnóstico da rodada do logout é o N8 do mesmo lugar.
- **Capturas renovadas pela volta das duas provas:** `tools/verify-landing-cms.cjs` e
  `tools/verify-cms.cjs` recapturam as telas por onde passam, e as seis que elas tocam voltaram com o
  conteúdo de sempre em pixels de agora — o relógio da manutenção na vitrine, a previsão escrita no editor.
  Não há mudança de desenho aí, e é por isso que vão em commit separado.
- **Validações desta rodada:** `npm run typecheck` limpo nos dois pacotes, `npm run build` ✓, `npm test` com
  api 28 arquivos / 230 testes e web 4 arquivos / 20 testes, `tools/verify-logout.cjs` 22 checagens / 0
  falhas, `tools/verify-landing-cms.cjs` 120 checagens / 0 falhas (a vitrine não pode perder o que ganhou na
  rodada anterior) e `tools/verify-cms.cjs` 115 checagens / 0 falhas.

### O alternador Dark/Light voltou a valer na página de boas-vindas (2026-10-11)

- **Causa raiz medida antes de mexer em arquivo, e não chute.** O toque sempre chegou ao botão
  (`elementFromPoint` devolvia `button.theme-switch` em 360×640, no Moto G4 e no desktop), `data-theme` trocava,
  `nexus.theme` acompanhava, nenhum erro de console — e a vitrine continuava com o mesmo fundo. Em `/login` o
  mesmo alternador clareava a página inteira. O defeito estava numa camada só: a paleta cadastrada no CMS era
  escrita como propriedades **inline** (`--bg`, `--surface`, `--text`…) no elemento `.landing`, e uma variável
  inline naquele elemento vence o `[data-theme]` do `<html>` para qualquer `var()` dentro dele. A vitrine
  vestia as cores do banco nos dois temas; o painel, que não recebe essas variáveis, sempre trocou certo.
- **A paleta do CMS agora veste só o tema a que pertence.** `esquemaDasCores` classifica o fundo cadastrado
  pela luminância relativa da WCAG (corte de 0,179, o da própria recomendação) e `aplicarCores` recebe o tema
  ativo: no tema dele, pinta; no outro, retira todas as variáveis — inclusive as aliases `--text-2` e
  `--text-3` — para que os tokens do produto ajam. O CMS guarda um esquema só, sem par claro/escuro no schema;
  cadastrar dois é decisão de produto e está registrada em `docs/AUDITORIA.md` (N6), não foi inventada aqui.
- **O tema escolhido volta antes do primeiro *flash*.** `aplicaTemaSalvo()` passou a rodar em `main.tsx` antes
  de `createRoot`, e o `ThemeProvider` usa a mesma função para iniciar. Script inline no `index.html` foi
  descartado: o CSP de produção é o padrão do helmet, que só aceita script de mesma origem.
- **O alvo do toque no alternador chegou a 44 px.** O desenho continua 54×27; um `::before` transparente de
  −9 px vertical amplia a área que responde ao dedo para 54×45. Provado no navegador com clique a 6 px acima e
  abaixo do botão, nos três visuais.
- **Saiu a última cor fixa da vitrine.** `.landing-hero-veil` era `background: #000` — sobre a foto, preto
  fixo deixaria o texto do tema claro ilegível; agora é `var(--bg)`. O verde do canal WhatsApp ficou de fora da
  varredura por decisão registrada: é identidade do canal, não cor do tema.
- **Teste de componente entrou no `apps/web`, e começou vermelho.** Vitest + jsdom + Testing Library com o
  menor conjunto de dependências de desenvolvimento, `npm test` no workspace e na raiz. São 13 casos: o
  alternador trocando atributo e preferência salva nos dois sentidos, **as cores da vitrine acompanhando o
  tema** (o caso que era o bug), a preferência voltando ao remontar, Enter e Espaço com rótulo acessível,
  `aplicaTemaSalvo` antes do render, `esquemaDasCores`/`aplicarCores` nos dois temas e uma varredura que falha
  se aparecer cor fixa vestindo a vitrine.
- **Prova de navegador reescrita para a nova regra:** `tools/verify-landing-cms.cjs` foi de 113 para **120
  checagens** — a etapa que afirmava "a paleta do CMS continua mandando na vitrine" no tema claro afirmava o
  bug, e passou a medir os dois lados (no escuro a paleta pinta; no claro os tokens voltam), o contraste de
  leitura das duas leituras (7,15:1 e 5,5:1, ambos acima de 4,5:1) e a área sensível do alternador.
  `tools/verify-cms.cjs` confere a paleta no tema padrão da vitrine e continua verde (115 checagens).
- **Validações da rodada:** `npm run typecheck` limpo nos dois workspaces, `npm run build` em 4,47 s,
  `npm test` na raiz com o backend e o frontend passando.


### O cabeçalho da vitrine ficou só com a marca, o tema e a porta de entrada (2026-10-11)

- **Saíram os botões "Recursos" e "Sobre" do topo da página pública.** Eram os links da navegação de âncoras, que
  ficava no meio do cabeçalho e só existia ali. O que ela mostrava dependia do cadastro: com depoimento, dúvida ou
  contato publicados, nasciam mais dois ou três links, e o cabeçalho mudava de forma a cada item ligado no editor.
- **Foi embora junto o que só servia para alimentá-la**: a lista calculada em `Landing.tsx`, os rótulos
  `SECOES_LANDING` de `copy.ts`, o tipo `SecaoAncora`, a `prop` do `LandingHeader` e as regras `.landing-nav` do
  CSS — inclusive o `@media (max-width: 700px)` que a escondia no celular, que ficou sem alvo. Como o
  `.landing-header` já era `space-between`, a marca ficou à esquerda e o tema com o "Acessar" à direita, em
  qualquer largura, sem regra nova.
- **As seções continuaram com o próprio `id`** (`#recursos`, `#sobre`, `#depoimentos`, `#faqs`, `#contato`). O
  campo "Âncora no site" do editor de capacidades aponta para eles, e um link de capacidade para `#sobre` funciona
  exatamente como funcionava antes — o que saiu foi o menu do cabeçalho, não o endereço das seções.
- **A prova vigia o desenho novo** (`tools/verify-landing-cms.cjs`, 111 → 113 checagens): nenhum link de seção no
  cabeçalho nos três largures, marca e acesso presentes, as cinco ids no lugar e nenhuma âncora da página apontando
  para seção que não existe. O texto de uma dúvida de exemplo, que dizia que a âncora sumia do cabeçalho, acompanhou
  a mudança, e a captura da vitrine foi regenerada nos dois temas.
- **Nada foi publicado.** O push continua parado pela decisão sobre o segredo registrado em `docs/AUDITORIA.md` (N1).

### O "Sobre o Nexus" da vitrine deixou de morar no canto (2026-10-11)

- **O buraco era de medida, não de gosto.** Antes da mudança, o parágrafo do "Sobre" media 658px dentro de uma
  linha de 1200px: sobravam 271px de tela morta de cada lado, e a seção inteira parecia um bloco encolhido. O
  culpado era o centrado do texto, que empurrava as margens para dentro em vez de abrir as colunas.
- **Agora são duas colunas de leitura** (`AboutSection.tsx` + `.landing-sobre`): o título abre a esquerda e os
  parágrafos ocupam a direita, na grade `0,62fr / 1,38fr` com o mesmo respiro horizontal dos cartões de
  capacidade. O texto encosta na borda interna da linha (`sobra 0px` medida no navegador), e o `max-width: 72ch`
  continua cuidando do comprimento de leitura. Abaixo de 860px tudo empilha, com o título vindo antes do texto.
- **A faixa de métricas virou linha própria** (`.landing-metricas` com `grid-column: 1 / -1`), então a classe
  condicional `landing-sobre-sem-metricas` e as duas regras CSS dela perderam a razão de existir e saíram — sem
  métrica cadastrada a seção não abre buraco nenhum, porque o texto já ocupa a linha sozinho.
- **A prova acompanhou** (`tools/verify-landing-cms.cjs`, 105 → 111 checagens): nos três largures a volta mede que
  a coluna do "Sobre" chega à borda interna da linha e que o título fica ao lado do texto no desktop e acima dele
  no tablet e no celular. Conferimos também com duas métricas cadastradas pela API e apagadas pela própria volta:
  a faixa ocupa a linha inteira em 1440px, recolhe para uma coluna em 390px, e o valor sai formatado pela
  configuração da empresa. As três capturas da vitrine foram regeneradas.
- **Nada foi publicado.** O push desta rodada continua parado pela decisão sobre o segredo registrado em
  `docs/AUDITORIA.md` (N1).

### O topo do painel parou de repetir o nome do produto (2026-10-11)

- **Saiu o "Business Manager" do cabeçalho.** A marca já está no menu lateral, na aba do navegador e no rodapé;
  no topo ela só disputava espaço com o botão do menu, o atalho da landing page, o sino e o tema. Foi embora o
  `<div className="admin-header-title">` e, junto, a regra CSS que ficou sem dono (`.admin-header-title` em
  `components.css`). O botão de alternância passou a ser o primeiro elemento do cabeçalho.
- **A prova da sidebar passou a vigiar isso** (`tools/verify-sidebar.cjs`, 87 → 88 checagens): uma asserção
  confere que o cabeçalho não carrega mais nenhum texto de marca, e outra que o botão é o primeiro elemento
  dele. Aproveitamos para consertar duas listas de itens que estavam desatualizadas no próprio teste — elas
  não conheciam a tela "Rotinas agendadas" e já vinham falhando antes desta mudança (registrado em
  `docs/AUDITORIA.md`).
- **As quatro telas de painel da galeria do README foram recapturadas** (dashboard, Vendas, Financeiro e o
  editor do site), agora sobre a empresa de demonstração, com o menu em camadas e os indicadores contados no
  banco. A tabela de provas do README acompanhou a contagem nova.
- **Achado registrado, não corrigido:** a captura `docs/screenshots/02-login.png`, que está na primeira página
  do README, mostra a senha real do administrador revelada pelo botão do olho, e `09-recuperar-senha.png` mostra
  um código de recuperação de desenvolvimento. É segredo publicado no repositório público. Detalhes, alcance e
  as opções de correção estão em `docs/AUDITORIA.md`, seção "Novos achados" — e o push desta rodada ficou
  parado até a decisão do dono.

### O Bloco A do prompt de mercado: quem mandou na sessão, no papel e na configuração (2026-10-11)

> Onze tarefas de contrato (A0 a A11) executadas na ordem, cada uma com teste e commit próprio. A situação de
> cada tarefa, com a prova apontada, está em `docs/STATUS-AJUSTES.md`; o que mudou neste documento de
> auditoria está no adenda final de `docs/AUDITORIA.md`; as decisões que travam os blocos seguintes estão em
> `docs/decisoes/`.

- **A sessão agora lembra em qual empresa você está.** O refresh token passou a carregar a empresa
  (`company_id` na migration `20261012000000_add_refresh_token_empresa`, reversível, com o `-- Reversão:`
  escrito no próprio arquivo). Antes, quem trocava para a empresa B voltava para a A na primeira renovação
  automática e continuava gravando dados achando que estava na outra. Se o vínculo caiu ou a empresa
  adormeceu, a pessoa volta para a primeira empresa ainda ativa em vez de ser derrubada no meio do trabalho —
  e só perde a sessão quando não sobrou nenhuma. Tokens antigos continuam funcionando.
- **A tela de Sessões fala de uma empresa só.** Quem está na empresa A não vê mais as sessões abertas na B do
  mesmo usuário, e não consegue revogá-las: responde 404, a mesma resposta de sessão inexistente, para não
  confirmar que ela existe. O endereço de IP de origem virou dado de segurança — só dono e administrador veem;
  gerente e atendente recebem nulo.
- **Desativou, perdeu o acesso na hora.** Antes, desligar uma conta ou uma empresa só tinha efeito quando o
  token de 15 minutos vencesse. Agora a checagem de contexto do pedido confere a conta e a empresa ativas e
  responde 403 (`Conta desativada` / `Empresa inativa`) na mesma ida ao banco que já existia.
- **O administrador não pode mais se promover, nem ser tocado por outro administrador.** A regra de papel
  saiu de dentro de cada rota e virou uma função só (`lib/rbac.ts`): somente OWNER concede ou retira OWNER;
  ADMIN cuida de MANAGER e STAFF e não encosta em outro ADMIN nem em OWNER; ninguém muda o próprio papel; e a
  empresa nunca fica sem pelo menos um OWNER — rebaixar o último responde 409. O painel parou de oferecer na
  tela aquilo que a API recusa.
- **"Esqueci a senha" parou de deslogar a vítima.** A solicitação de recuperação revogava todas as sessões do
  usuário: quem soubesse o e-mail derrubava a pessoa quantas vezes quisesse, sem roubar nada. A queda de
  sessões acontece agora só quando a senha realmente muda. E o código de recuperação deixou de voltar no HTTP
  por ser ambiente "não-produção" — precisa da flag explícita do `.env`, e produção nunca entrega código.
- **O servidor recusa uma configuração de produção malfeita.** Segredo com menos de 32 caracteres, segredo de
  tutorial (com `troque`, `change`, `secret` ou `exemplo`), os dois segredos iguais, CORS apontando para
  `localhost` ou coringa, banco conectado como `root` sem senha e flag de código de recuperação acesa em
  produção agora derrubam a inicialização com a lista inteira do problema na mensagem, antes de atender a
  primeira requisição. `TRUST_PROXY` virou opção validada (0, 1 ou número de saltos até 31) e aplicada, para o
  IP real continuar sendo o da auditoria, do rate-limit e do modo de manutenção atrás de proxy reverso. O
  `.env.example` foi reescrito comentando cada uma dessas chaves.
- **O seed não conhece mais nenhuma senha.** Ele aborta em produção sem `ALLOW_DEV_SEED`, cria a conta de
  desenvolvimento só fora de produção com a senha vinda de `SEED_DEV_PASSWORD`, e o resumo impresso no fim diz
  "senha definida via variável de ambiente" em vez de imprimir senha. O endereço do administrador global passou a
  vir de `SUPER_ADMIN_EMAIL`; fora de produção o valor histórico continua valendo, e em produção, sem a
  variável, ninguém é "o administrador" por endereço — a proteção real é a bandeira de plataforma no banco. A
  regra de acesso definida pelo dono permanece exatamente como está, protegida e documentada em
  `CREDENCIAIS.md`.
- **Duas provas de estoque que faltavam.** Uma nota pode ter o mesmo produto escrito duas vezes: com saldo 10
  e linhas de 6+6, a venda responde 400 e não acontece nada — nem saldo, nem movimentação, nem venda criada.
  E a invariante do razão entrou na suíte: o saldo final é exatamente a soma das movimentações.
- **Varredura de codificação.** O repositório inteiro foi penteado atrás de expressões regulares que perderam
  a barra invertida (`/s+`, `/d+`, `/w+`, `/b`): nenhum caso novo. O achado foi outro — a classe de acentos
  combináveis do gerador de slug estava escrita com caracteres invisíveis no fonte, trocada pela forma
  escapada. O `.gitattributes` passou a forçar LF também em `.sql`, `.yml`, `.yaml` e `.txt`, porque o
  checkout da máquina convertia migration para CRLF.
- **A0 cumprido:** a cobertura deixou de ser chute. Existe `npm run test:coverage` na raiz e na API, e a linha
  de base (84,15% instruções / 70,4% ramificações) ficou registrada em `docs/AUDITORIA.md` antes das
  correções, com o número de depois ao fim do bloco: **85,57% / 72,96% / 83,93% / 88,29%**
  (instruções, ramificações, funções, linhas).
- **Já vinha corrigido e foi provado agora:** a varredura de notificação que não escolhe a empresa (A2) e o
  tratamento de reuso de refresh token como roubo de sessão (A11), ambos com teste apontado na tabela.
- A suíte passou de 23 arquivos / 176 testes (a última contagem publicada) para **28 arquivos / 230 testes**,
  todos contra MySQL real, sem skip e sem mock de banco. No meio da rodada, quando a A0 mediu a linha de base,
  eram 26 arquivos / 202 testes. Typecheck, build e o pente de BOM/CRLF limpos.

### A venda confirmada caiu no financeiro, em parcelas que fecham o centavo (Fase 3e da auditoria)

> Fase 3 da auditoria comercial (`docs/AUDITORIA.md`), sub-fase 3e: fechar o [ALTO] "Venda não conversa com
> financeiro" e a ausência de parcelamento anotada no achado do dinheiro. O produto tinha dois caixas que não
> se falavam — confirmar uma venda baixava estoque, mudava o relatório e não escrevia NADA na tela de Contas.
> Quem quisesse ver o dinheiro real tinha que reescrever à mão, no dia seguinte, o valor, o cliente e a data
> que o sistema já sabia. E não existia onde dizer "em três vezes": `Parcelamento não existe`, dizia a
> auditoria, e dizia certo.

- Migration nova `20261011230000_add_documento_vinculo_financeiro` (com o bloco `-- Revert:` escrito dentro):
  `installments` em `sales` e `purchases` (`INTEGER NOT NULL DEFAULT 1`), `auto_finance_sales` e
  `auto_finance_purchases` em `companies` (`BOOLEAN NOT NULL DEFAULT false`) e a procedência do lançamento —
  `sale_id` / `purchase_id` em `finance_entries`, cada um com índice e FK `ON DELETE SET NULL`.
- `Sale` e `Purchase` ganharam `financeEntries`; `FinanceEntry` ganhou `sale`/`purchase`. É `SetNull` e não
  `Cascade` por decisão declarada: lançamento é escrituração. O pedido pode sair do sistema; a despesa que já
  foi paga não sai junto com ele.
- Novo `apps/api/src/lib/installments.ts`, casa única da regra: `politicaDeLançamento`,
  `gerarParcelasDoDocumento` e `removerParcelasDoDocumento`. Vendas e compras chamam; mais ninguém escreve
  lançamento de documento ali, e um lançamento manual continua com os dois vínculos nulos — é isso que o
  separa do gerado.
- Gera no CONFIRMAR / RECEBER, não no criar. Rascunho que nunca virou nada não tem o direito de infligir
  receita e despesa no caixa. Os lançamentos nascem DENTRO da mesma transação que baixou o estoque: se um
  INSERT falhar, a confirmação inteira volta — não existe nota confirmada com metade do carnê no caixa.
- A divisão é em centavo (`dividirCentavos`, novo em `lib/money.ts`): piso em cada parcela e o resto todo na
  última, que fecha a conta. R$ 100,00 em 3 são 33,33 + 33,33 + 33,34 — somam a nota, e não os R$ 99,99 que a
  coluna de duas casas produziria se cada parcela fosse redonda por conta própria.
- Vencimento é calendário, não trinta dias: `mesesDepoisNoCalendario` (`lib/time.ts`) anda `i` meses a partir
  do dia da empresa (Fase 3c) e clampa no último dia do mês-alvo. Uma venda fechada no dia 31 parcela em
  28/29 de fevereiro, 31 de março e 30 de abril; `Date.UTC(y, m+3, 31)` inventaria um dia 3 de março.
- A política é por empresa e DESLIGADA nas duas pontas. Ligada sem perguntar duplica o lançamento de quem já
  anota à mão. São duas chaves e não uma porque venda e compra são hábitos diferentes: há quem confira o
  dinheiro que entra e lance o que sai manualmente — e o contrário também existe.
- Cancelar tira só o que ainda não aconteceu: `deleteMany` em `PENDING` com o vínculo do documento. Parcela
  paga (`PAID`) e cancelada (`CANCELLED`) ficam — apagar em silêncio seria o sistema inventando um passado
  diferente do que aconteceu. E a limpeza NÃO depende da política estar ligada: quem desligou a opção depois
  de gerar ainda vê o carnê da nota anulada sair do caixa.
- Nota de valor zero não gera nada (nem três linhas de R$ 0,00 no meio do mês); a categoria "Vendas"/"Compras"
  é provisionada por `upsert` na chave `(companyId, name, type)` — uma por empresa, não uma por documento.
- A porta do parcelamento: `installments` em venda e compra é `z.coerce.number().int().min(1).max(120)
  .default(1)`. Ausente é à vista — a tela antes desta fase, os integradores e os testes de isolamento não
  podiam ser barrados. O teto de 120 é um carnê mensal de dez anos: sem ele, um número digitado à mão gera
  dezenas de milhares de linhas no caixa com um clique. O `serialize` dos dois documentos devolve
  `installments`; os lançamentos NÃO devolvem o vínculo no JSON — quem precisa saber de qual nota a parcela
  veio é a descrição (`Venda DEE563FA — parcela 2 de 3`) e o banco.
- `PATCH /companies/current` aceitou as duas chaves booleanas, na mesma régua da política de estoque (3b):
  opcional, estrito, e gravado só quando enviado. O `audit` de venda e compra passou a registrar
  `installments` e quantos lançamentos aquele movimento gerou.
- `apps/web/src/lib/money.ts` (novo) fecha o achado levado da 3d: o painel pré-mastigava o dinheiro com
  `parseFloat(valor.replace(",", "."))`, e o `replace` só troca a PRIMEIRA vírgula — "1.290,50" virava 1,29
  ANTES de sair do navegador, e nenhuma porta da API conserta o que chegou mastigado. `lerNumero`/`valorNumerico`
  seguem byte a byte a mesma regra da porta `moeda()` do servidor (ponto e vírgula juntos = milhar brasileiro;
  só vírgula = decimal; só ponto = texto já no formato de máquina), e o CRM mantém o rigor de antes: texto que
  não é dinheiro continua texto, e é a porta da API que responde, em vez de um `NaN` virar 0 silencioso.
- Vendas e Compras ganharam o seletor de parcelas (À vista, 2× … 12×) no formulário de nova venda e no modal
  de compra, com a nota dizendo onde o dinheiro cai e que a última parcela fecha a conta; a linha, o rodapé e
  o payload usam o parse novo; o detalhe dos dois documentos passou a mostrar o parcelamento. Fechado em 12 e
  não em 120 porque as doze de um pedido de balcão são o que a tela oferece — o teto maior continua na API.
- Configurações → aba Empresa ganhou o sétimo bloco, "Lançamento automático no financeiro", com dois switches
  independentes e a escrita parcial de sempre: cada botão manda só a chave que é dele.
- Novo `apps/api/test/parcelamento.test.ts` (10 casos): política desligada não escreve nada, à vista gera uma
  linha no dia da empresa, 3 parcelas fecham o centavo com vencimento mensal clampado, rascunho não lança e
  confirmar escreve o carnê inteiro, cancelar tira as pendentes e preserva a paga, compra recebida gera despesa
  na categoria Compras, a categoria automática nasce uma vez só, uma empresa não enxerga o carnê da outra, a
  porta recusa parcela que não é número, e as duas contas puras (dividir centavo e andar no calendário).
- Novo `tools/verify-parcelamento.cjs`: prova de navegador completa com empresa de prova criada e apagada pelo
  script — 55 checagens / 0 falhas. O seletor com as doze opções, o preço digitado "1.290,50" valendo
  R$ 1.290,50 na linha (com o parser antigo seriam R$ 2,58), pendente que escreve zero, confirmar que escreve
  três, o financeiro mostrando as parcelas certas na tela, cancelar esvaziando o caixa e estornando o estoque,
  e a compra em 2× caindo como despesa. Capturas `24-parcelamento-formulario/financeiro/compra.png`.
- Validação: typecheck da API e do painel limpos, suíte completa 23 arquivos / 176 testes verdes (eram
  22 / 166). Prova de Configurações re-rodada com o bloco novo: 127 checagens / 0 falhas (eram 115), capturas
  da aba Empresa renovadas mais `22-configuracoes-lancamento-automatico.png`.

### Dinheiro em centavo (Fase 3d da auditoria)

> Fase 3 da auditoria comercial (`docs/AUDITORIA.md`), sub-fase 3d: as colunas do banco sempre foram
> `DECIMAL` — o que não era exato era a conta feita em cima delas. `Number(decimal)` virava double na
> primeira linha de cada serviço, a aritmética seguia em base 2 e um `Math.round(x * 100) / 100` no fim
> da fila consertava a etiqueta. Na venda e na compra esse mesmo round montava a linha do item ANTES de
> ela virar nota: 3 × R$ 1,005 dava R$ 3,01 — meio centavo para BAIXO, cobrado do cliente e escrito no
> histórico — porque `1.005 * 100` em double é 100,49999999999999 e o arredondamento nativo não sabe que
> aquilo era meia casa.
- Novo `apps/api/src/lib/money.ts`, a única casa da regra: `centavos`, `somarCentavos`, `moedaDeCentavos`,
  `decimalDeCentavos`, `linhaDecimal`, `porcentagem`, `variacaoPercentual`, `mediaPorUnidade` e a porta
  `moeda()`. Entre a leitura do banco e a escrita no banco, dinheiro anda em centavo inteiro ou em
  `Prisma.Decimal`; o `Number` só aparece na última linha antes do JSON, uma vez, sem nada para acumular.
- A porta `moeda()` substituiu o `z.coerce.number()` nos seis campos de valor da API (preço de produto,
  preço unitário de venda, custo unitário de compra, valor de lançamento, valor de lead e meta de
  receita): aceita `1290.5`, `"1290,50"` e `"1.290,50"` e devolve texto de duas casas — exatamente o que
  a coluna `DECIMAL(x,2)` vai guardar. Antes, `Number("1.290,50")` é NaN e o teclado brasileiro era
  recusado no cadastro; `""` virava lançamento de valor zero silencioso; `12,3456` passava cru e o MySQL
  arredondava por conta própria, escondendo qual regra tinha sido usada.
- Arredondamento é `ROUND_HALF_UP` na base 10, nunca o nativo do JS. E é `toDecimalPlaces`, não `round`:
  no decimal.js-light que o Prisma embute, `round(casas, modo)` IGNORA as casas pedidas — `(0,07 × 3)`
  com `round(2, HALF_UP)` devolve `"0"`. A armadilha está gravada em teste para não voltar pela mão de
  ninguém.
- Venda e compra: linha é `quantidade × preço` com UMA rodada, calculada sobre o preço já normalizado
  pela porta, e o total da nota é a soma dos centavos dessas linhas, escrito como `Decimal`. A nota agora
  bate com o próprio preço unitário: 1,01 × 3 = 3,03, não 3,01.
- `GET /finance/summary`: entradas, saídas, saldo, a receber, a pagar e vencido saem do centavo, e o
  `Math.round((income − expense) * 100) / 100` — a cola do erro, não a conta — deixou de ser chamado.
- Os painéis de `reports.service.ts` (visão geral, clientes, produtos, vendas, compras, financeiro e
  CRM) acumulam cada balde em centavo e convertem uma única vez no `return`. O `arredonda` ficou só com
  medidas (estoque `DECIMAL(12,3)`, quantidade movimentada) e razões de contagem (conversão do funil).
  Curva ABC, ticket médio, participação por categoria, variação percentual e ritmo diário da meta passam
  a receber inteiros.
- CRM: a pergunta "mudou o valor?" compara centavos, então o registro de alteração do lead não pode
  nascer de poeira de double, e o aviso de negócio do lead novo traz o valor convertido uma vez.
- `lib/stock.ts`: o `custo` da movimentação passou a aceitar o texto de duas casas que sai da porta,
  porque o Prisma escreve `DECIMAL` a partir de string sem passar por vírgula flutuante.
- Quantidades continuaram números de propósito: a coluna é `DECIMAL(12,3)` de MEDIDA, não de valor, e o
  serviço de produtos não foi tocado porque já espalha o objeto validado para o Prisma — o que mudou foi
  a porta, não a escrita.
- Novo `test/dinheiro-decimal.test.ts` (10 casos): meio centavo que sobe, a armadilha do `round`, 2026
  parcelas de R$ 0,10 fechando em 20 260 centavos, percentual/variação/média, a porta nos três formatos,
  e as portas de HTTP de produto, venda, compra, fluxo de caixa e meta do Dashboard. Onde o double antigo
  acertava — a subtração 4,00 − 3,52, o `_sum` do resumo — está dito no teste com todas as letras: o que
  ele amarra é a invariante (total = soma das linhas, linha = preço × quantidade), não uma falha
  inventada.
- Validação: typecheck da API e do painel limpos, build Vite OK; suíte completa 22 arquivos / 166 testes
  verdes (eram 21 / 156). A prova de navegador de Configurações re-rodou com a porta nova no campo de
  meta: 115 checagens / 0 falhas, capturas renovadas. Nenhuma tela alterada.

### A meia-noite passou a ser da empresa (Fase 3c da auditoria)

> Fase 3 da auditoria comercial (`docs/AUDITORIA.md`), sub-fase 3c: o fuso horário mora no cadastro da
> empresa desde o primeiro dia, e a tela de Configurações sempre deixou escolhê-lo — só que nenhuma
> leitura do sistema o consultava. "Hoje" e "deste mês" eram o hoje e o mês do datacenter: às 21h de
> Brasília a venda do dia já tinha caído fora do mês do relatório, e para uma empresa à frente de
> Greenwich o dia entrava na conta antes de lá começar.
- Novo `apps/api/src/lib/time.ts`, a única casa da regra: `meiaNoiteNoFuso`, `ontemNoFuso`,
  `calendarioDaEmpresa`, `diaNoFuso`, `mesNoFuso` e `fusoDaEmpresa`. Quem precisa da borda do dia
  pergunta ao fuso da empresa; nenhum módulo de leitura volta a usar `setHours`/`setUTCHours` do processo.
- Duas bordas, porque são duas espécies de coluna. Meia-noite DO FUSO para as colunas de instante
  (`createdAt`, `startAt`, `paidAt`); dia de CALENDÁRIO para as `@db.Date` (`dueDate`), que o banco
  guarda à meia-noite UTC porque o que a pessoa escreveu foi um dia, não uma hora. Aplicar a borda de
  instante às colunas de dia deslocaria a fronteira em três horas e toda conta que vence hoje nasceria
  vencida.
- O deslocamento é lido duas vezes pelo `Intl.DateTimeFormat` com o `timeZone`, nunca somado como offset
  fixo: o `Date` que sai é a meia-noite exata daquele dia NAQUELE fuso, com horário de verão (o dia da
  transição tem 23 ou 25 horas porque é isso que o dia tem) e com fuso de meia hora — Asia/Kolkata cai
  em 18:30UTC, provado no teste. Fuso quebrado no cadastro cai em UTC de propósito: uma coluna
  envelhecida não derruba o painel nem o sino de avisos.
- `recortesDaEmpresa(companyId)` em `reports.service.ts` calcula mês corrente, mês anterior e dia
  corrente uma vez só por painel; `overview`, `clientes`, `vendas` e `financeiro` cortam por ele. As
  queries continuam `BETWEEN` em `createdAt` — índice e histórico intactos, quem se move é a fronteira.
- A série diária de vendas agrupa e rotula no fuso da empresa, e os extremos da tela (`de`/`ate`)
  passaram a ser o primeiro e o último dia do mês dela, não o de Greenwich.
- O fluxo de caixa numerou os baldes em calendário puro (`diaDeCalendario`): a janela abre `dias - 1`
  dias antes do hoje da empresa e fecha nele, e um dia de transição de horário de verão não pode
  aparecer duas vezes nem faltar.
- `GET /finance/summary`: vencido passou a ser a conta cujo dia da empresa passou, e o rótulo do mês
  passou a ser `mesNoFuso` — o resumo não mostra mais o mês novo antes da virada da empresa.
- Varredura de avisos de conta vencida: mesma borda de calendário, contagem de atraso em dias inteiros
  e "venceu em dd/mm/aaaa" lida do dia gravado no banco, não do relógio de dentro do processo.
- Rotinas agendadas: estoque-baixo e relatório-diário deduplicam e fecham pelo dia da empresa
  (`ontemNoFuso`), cada empresa com a sua virada. A agenda do cron em si continuou no relógio do
  servidor — decisão declarada na auditoria, porque "rodar às 07:00" é do operador da máquina.
- Novo `test/fuso-dia.test.ts` (11 testes): os instantes esperados são calculados à mão (-3 São Paulo,
  +9 Tóquio, +5:30 Calcutá) em vez de chamados no próprio helper. Passam por ele as três regressões que
  a regra antiga deixava passar — a venda das 22h fora do mês, a conta de hoje nascendo vencida e o
  "ontem" de Greenwich na rotina de relatório.
- Validação: typecheck da API e do painel limpos, build Vite OK; suíte completa 21 arquivos / 156 testes
  verdes (eram 20 / 145). Nenhuma tela alterada — as provas de navegador das sub-fases anteriores não
  são afetadas por esta mudança de leitura.

### Política de estoque por empresa (Fase 3b da auditoria)

> Fase 3 da auditoria comercial (`docs/AUDITORIA.md`), sub-fase 3b: a regra de saldo é decisão da
> empresa, não do sistema. A Fase 3a deixou o estoque atômico e bloqueado por padrão — certa para a
> padaria, errada para o distribuidor que lança a nota antes da mercadoria chegar. Agora cada empresa
> escolhe, numa chave própria da tela de Configurações, e o banco continua sendo quem decide.
- Nova coluna `companies.allow_negative_stock` (migration `20261011210000_add_company_allow_negative_stock`,
  `BOOLEAN NOT NULL DEFAULT false`) — o padrão é o comportamento da 3a: nenhuma saída passa sem saldo.
- Novo `permiteEstoqueNegativo(companyId)` em `lib/stock.ts`: fonte única da política, lida uma vez antes
  da transação em cada entrada que pode baixar saldo — nunca pedida dentro do loop de itens.
- A política vale exatamente para as três portas de saída: confirmar venda, estorno de compra recebida
  cancelada e lançamento manual OUT. Subida de estoque e ajuste (ADJUST) não têm nada a ver com a chave.
- Com a chave ligada, o pré-check amigável do `createSale` (aquele que comparava saldo em JS antes de
  abrir a transação) é pulado de propósito — com permissão para negativo, ele viraria uma porta falsa
  bloqueando o que a empresa autorizou. Sem a chave, ele continua mostrando o nome do produto na tela.
- Mensagem do count-0 no `baixarEstoque` agora distingue os dois motivos reais: "não pertence a esta
  empresa" de "este produto não controla estoque" — com a política ligada, um produto sem rastreamento
  não pode receber OUT nem por transbordo.
- A escrita parcial de Configurações ganhou o primeiro campo booleano do pipeline (`allowNegativeStock`
  no `PATCH /companies/current`, `Record<string, string | number | boolean | null>` nas mudanças): chave
  ausente não toca, repetir o valor atual devolve `alterados: []`, e o `company.settings.updated` da
  auditoria já registra o de/para sozinho.
- Novo bloco "Política de estoque" na aba Empresa (`BlocoPoliticaEstoque` em `EmpresaPanel.tsx`, com a
  peça `CampoLigado` que já existia): botão de gravar do próprio bloco, como nos outros cinco, e aviso
  escrito dos dois lados da chave.
- Novo `test/estoque-politica.test.ts` (5): padrão fechado, a chave ligada aceitando negativo pelas três
  portas de saída, gravação idempotente, MANAGER sem acesso (403) e texto no lugar de booleano (400).
- Achado da prova de navegador: o aviso do botão desligar no componente tinha ficado com a redação
  antiga enquanto a prova esperava a nova — dois textos escritos à mão divergindo na terceira tela,
  exatamente o que as peças compartilhadas existem para evitar. Normalizados nas duas pontas.
- Validação: typecheck da API e do painel limpos, build Vite OK; suíte completa 20 arquivos / 145 testes
  verdes; prova de configurações 115 checagens / 0 falhas (dois ciclos do switch, seis blocos na aba),
  com as capturas da tela renovadas.

### Integridade de negócio (Fase 3a da auditoria — estoque atômico)

> Fase 3 da auditoria comercial (`docs/AUDITORIA.md`), sub-fase 3a: o CRÍTICO de oversell. Enquanto a
> guarda de saldo morava em JavaScript — ler o estoque, comparar, gravar o valor absoluto — dois cliques
> no mesmo minuto vendiam a mesma unidade duas vezes. A partir de agora é o banco quem decide.
- Novo `apps/api/src/lib/stock.ts`: baixa de estoque virou `UPDATE ... SET estoque = estoque - q WHERE estoque >= q`
  dentro da transação; se nenhuma linha casou, o saldo não aguentava e a operação responde 400 com o número
  real re-lido. Subida é `increment` — nunca mais soma feita em JS escrita por cima de outra.
- Custo do produto na compra (a "última compra define o custo") agora grava no MESMO update atômico da subida,
  sem escrita absoluta separada que o último gravador ganhava de qualquer jeito.
- Status de venda e de compra passou a ser *reivindicado* dentro da transação (`WHERE status = <status lido>`):
  dois "confirmar" na mesma venda resultam em um 200 e um 400 honesto — antes as duas requisições baixavam
  estoque e o cancelamento podia estornar duas vezes.
- `moveStock` e o estoque inicial do cadastro de produto usam o helper atômico; o ajuste (ADJUST) continua
  absoluto de propósito, porque ajuste de inventário é uma declaração ("contei e tem X"), não um cálculo.
- Conversão de lead em cliente (CRM) passou a viver numa única transação: não existe mais cliente criado
  com o lead ainda no estágio antigo no meio do caminho.
- Deadlock InnoDB em corrida real (o insert do item pega lock compartilhado no produto pela FK e o
  decremento pede o exclusivo) deixou de virar 500: `lib/tx.ts` re-tenta a transação até 3 vezes com recuo
  progressivo, e a vencida recebe o 400 de estoque que é a resposta certa.
- Novo `test/oversell.test.ts` (5 testes de concorrência): mesma venda confirmada duas vezes em paralelo,
  duas vendas disputando o mesmo saldo, compra recebida duas vezes, dois lançamentos OUT simultâneos e
  receber-vs-cancelar em corrida — em todos, o saldo final conta a mesma história que o status e nunca fica negativo.
- Validação: typecheck da API limpo; suíte completa 19 arquivos / 140 testes verdes.

### Segurança de produção (Fase 2 da auditoria)

> Fase 2 da auditoria comercial (`docs/AUDITORIA.md`): as janelas que o ambiente de desenvolvimento
> deixava aberta viraram porta com chave, a sessão roubada passou a ser tratada como roubo, e nenhuma
> rota nova consegue nascer sem tranca. As dependências criticamente vulneráveis foram atualizadas.

- **Nenhuma rota nasce aberta** (`apps/api/src/plugins/gate.ts`, `plugins/auth.ts`, `app.ts`): um gancho `onRoute` conferido a cada registro derruba a subida do servidor se uma rota aparecer sem `app.authenticate` e sem o carimbo explícito `config.public = true`. O `authenticate` virou função nomeada exportada — é a mesma referência em toda comparação. A superfície pública do projeto é agora exatamente dez rotas carimbadas: as seis de autenticação, as três da vitrine e o health. O preflight `OPTIONS *` que o `@fastify/cors` registra por conta própria é rota de framework e não pede carimbo — descoberto na primeira subida, quando o gate derrubou o servidor dele.
- **Reuso de refresh token é tratado como roubo** (`schema.prisma`, migration `20261011200000_add_refresh_used_at`, `auth.service.ts`): o token rotacionado ganha `used_at`, e reapresentá-lo — o que o dono legítimo nunca faz — derruba todas as sessões vivas da pessoa e fica na auditoria como `auth.refresh_reuse`. Revogação por decisão (logout, admin, troca e recuperação de senha) continua marcando só `revoked_at`: deslogar de uma aba não derruba a outra.
- **A porta de desenvolvimento da recuperação agora tem chave** (`config/env.ts`, `auth.service.ts`, `.env.example`): o código de recuperação só aparece na resposta com `AUTH_EXPOSE_RESET_TOKEN=1` escrito no `.env` — o `NODE_ENV` perdeu esse poder, e o padrão é fechado. A suíte prova a ausência do campo no HTTP e a existência do token no banco, e o teste de redefinição passou a criar o código exatamente como o serviço faz, sem depender da porta.
- **O administrador da plataforma não passa pela recuperação** (`auth.service.ts`): pedir "esqueci a senha" de um `SUPER_ADMIN` devolve o mesmo 200 genérico de qualquer e-mail, sem gerar token e sem derrubar sessão nenhuma — um link de recuperação jamais pode ser porta para a conta que protege a plataforma inteira. E se um código antigo ou forjado no banco aparecer na redefinição, ela recusa do mesmo jeito.
- **Seed sem senha no log e sem conta dev em produção** (`prisma/seed.ts`): `admin@nexus.local` só nasce fora de produção (ou com `SEED_DEV_ACCOUNT=1` explícito), e o resumo final nomeia as contas em vez de imprimir a senha do administrador definitivo.
- **Proxy e corpo agora ditos por nós** (`app.ts`, `env.ts`): `TRUST_PROXY=0` por default — sem proxy declarado, header forjado não engana rate-limit, auditoria nem o pulso da manutenção — e `BODY_LIMIT_BYTES` com 1 MiB explícito em vez do default herdado do framework.
- **Rate-limit em Redis fica para a Fase 8, de propósito** (`plugins/security.ts`): sem Redis no stack hoje, apontar para ele seria inventar infraestrutura; em instância única o contador em memória é exato, e a pendência está registrada na auditoria junto com o Docker/compose que o apresenta.
- **Dependências criticamente vulneráveis atualizadas** (workspace raiz): `@fastify/jwt` 9→10.2.4 (crítica), `vitest` 2→5 (crítica do tinypool; suíte ganhou `fileParallelism: false` porque o banco compartilhado não aceita paralelismo), `vite` 5.4→7.3 com `@vitejs/plugin-react` 5 e `react-router-dom` 6→7.18.4. De `npm audit` com 13 vulnerabilidades (4 críticas) sobram 3 altas — todas na cadeia do CLI do Prisma (`deepmerge-ts`), sem correção antes do Prisma 8, que ainda é RC e não entra em runtime.
- **Testes e provas acompanham** (`apps/api/test/seguranca.test.ts`): oito testes novos — o gate recusando a rota aberta e aceitando as declaradas (inclusive no boot real com health/landing/vitrine), a queda da família no reuso com logout continuando inocente, a imunidade do admin da plataforma com o token forjado no banco, e o devToken que não vaza. Suíte em 18 arquivos e 135 testes, verdes duas rodadas seguidas; typecheck e build do painel limpos no Vite 7 + Router 7; provas de navegador rerodadas contra o servidor com gate: configurações 108/108, CMS 115/115, notificações 85/85 e rotinas 37/37.

### Segurança e isolamento (Fase 1 da auditoria)

> Fase 1 da auditoria comercial (`docs/AUDITORIA.md`): os três achados CRÍTICOS de
> isolamento de tenant foram fechados, o administrador da plataforma deixou de ser
> um e-mail fixo no código, e o banco de desenvolvimento acordou em InnoDB — as
> chaves estrangeiras que sempre estiveram no schema passaram a valer de verdade.

- **Só o proprietário cria ou mexe em proprietário** (`apps/api/src/modules/users/users.service.ts`, `users.routes.ts`): o `POST /api/users` e o `PATCH /api/users/:id/role` passaram a receber o papel de quem assina o pedido, e a regra vale nos dois sentidos — um ADMIN não se auto-promove a OWNER criando um membro, e não rebaixa o OWNER da empresa. O cadeado definitivo (a conta do administrador global nunca perde OWNER) agora segue a bandeira `platformRole` no banco e mantém o e-mail configurado como cinto extra. Na tela (`pages/Users.tsx`), quem não é proprietário nem vê a opção OWNER no cadastro, e o papel de um proprietário aparece como selo com a explicação em vez de select.
- **Encerrar sessão virou ato da pessoa, não da empresa** (`users.service.ts`): o refresh token não pertence a tenant nenhum, e antes um ADMIN de A com usuário em comum derrubava a sessão de quem é de B. Agora cada rota de empresa só encerra as sessões do próprio dono — para restringir outra pessoa, o caminho é o papel. A aba Sessões espelha a regra: o botão só aparece na linha da própria pessoa.
- **A varredura de avisos não passeia mais em outras empresas** (`notifications.routes.ts`, `notifications.schemas.ts`): o `POST /api/notifications/scan` aceitava um `companyId` no corpo e varria a empresa que o cliente escolhesse. O campo saiu do schema; a varredura é sempre a da empresa ativa do token, revalidada no banco.
- **O administrador da plataforma ganhou coluna própria** (`schema.prisma`, migration `20261011164338_add_platform_role`, `seed.ts`, `src/lib/platform.ts`): `users.platform_role` com o enum `PlatformRole { SUPER_ADMIN }`. A identidade de plataforma deixou de ser a comparação do e-mail no código: o seed marca as contas administrativas, o cadastro de empresa nova injeta os SUPER_ADMIN como OWNER consultando o banco, e a sessão informa `platform: boolean`.
- **CMS e Rotinas são área da plataforma** (`cms.routes.ts`, `cron.routes.ts`): as 13 rotas administradas do CMS e as três de `/ops/jobs` trocaram `assertPermission(papel, "content:*"/"settings:write")` por `assertPlatformAdmin(req)` — conferido no banco a cada requisição, então revogar o alcance de plataforma vale na hora, sem esperar token expirar. O OWNER de uma empresa qualquer não edita mais a vitrine nem dispara rotina que varre todas as empresas. A empresa ativa continua assinando a auditoria das escritas. No painel (`AdminShell.tsx`, `pages/Cms.tsx`, `pages/Rotinas.tsx`), as duas linhas do menu e o atalho "Visualizar landing page" obedecem à bandeira `platform`, e abrir a URL direto mostra o aviso de área reservada.
- **O banco estava MyISAM — e ninguém viu** (`tools/para-innodb.cjs`): descoberto ao rodar a Fase 1. O WAMP força `default_storage_engine=MYISAM` no `my.ini`, o Prisma cria tabela sem fixar engine, e o MySQL aceita `FOREIGN KEY` em MyISAM **em silêncio, sem aplicar nada**: 28 tabelas sem integridade referencial, `$transaction` sem atomicidade e ~22 mil linhas órfãs deixadas por limpezas antigas de teste — inclusive vínculos que quebravam o login com 500. O script idempotente converte tudo para InnoDB, arruma órfão por órfão conforme a semântica do próprio FK (CASCADE apaga filho, SET NULL zera a referência, RESTRICT trava e avisa em vez de destruir dado) e recria os 41 foreign keys. O `my.ini` local ficou com InnoDB, e o teste de engine provou: tabela nova nasce InnoDB, e inserir vínculo com empresa inexistente volta erro de FK.
- **A limpeza de testes apaga na ordem filho → pai** (`apps/api/test/helpers.ts`): com as FKs valendo de verdade, `cleanup()` descobrir que contar com a cascata cega esbarra nos `RESTRICT` de negócio (item de venda aponta produto, compra aponta fornecedor). A limpeza agora desmonta na ordem certa, e `makeAccount` ganhou a opção `plataforma: true` para as contas que precisam do alcance global.
- **A senha do seed voltava truncada** (`apps/api/.env`): `SEED_ADMIN_PASSWORD=Nexus...#` sem aspas — o dotenv corta no `#` e o hash do seed nascia da senha sem o caractere especial, quebrando em silêncio a regra de acesso definitiva. O valor agora vai entre aspas, o seed regravou o hash, e a checagem confirma bcrypt contra a senha real sem nunca imprimi-la.
- **Um `\s` perdido em um registro** (`auth.service.ts`): `split(/s+/)` em vez de `split(/\s+/)` — quem se cadastra com nome que tenha "s" perdia o resto do primeiro nome no nome da empresa e no slug ("Francisco" virava "Franci"). Corrigido junto com a injeção de plataforma no cadastro.
- **Testes e provas acompanham** (`test/cms.test.ts`, `test/cron.test.ts`, `tools/verify-rotinas.cjs`): os testes de escrita do CMS provam o 403 também para um OWNER sem alcance de plataforma; o RBAC de `/ops/jobs` ganhou a checagem do OWNER de empresa barrado; a prova das rotinas passou a esperar o texto "Área reservada da plataforma". Suíte em 16 arquivos e 113 testes verdes **com as FKs valendo**, typecheck das duas áreas limpo, build do painel OK. Provas de navegador rerodadas após a mudança: CMS 115/115, rotinas 37/37, notificações 85/85, configurações 108/108.
- **Por construção, a escrita não atravessa a empresa** (`clients.service.ts`, `products.service.ts`, `sales.service.ts`, `purchases.service.ts`, `finance.service.ts`, `crm.service.ts`, `agenda.service.ts`, `notifications.service.ts`, `users.service.ts`, `src/app.ts`): cada `update`/`delete` dos serviços de tenant agora carrega o `companyId` no `where` — até aqui a única barreira era a leitura `findFirst({ id, companyId })` logo acima, que um chamamento futuro poderia pular. Marcar notificação como lida amarra `userId` e `companyId`; encerrar sessão e mudar papel de membro fazem o mesmo com a linha própria. O handler central passou a traduzir o P2025 do Prisma (a condição não casou com nenhuma linha) em 404 honesto, e não em 500 que vazaria o motivo. Ficaram por fora, por desenho: auth (cada escrita é da própria conta da pessoa) e CMS/Rotinas (plataforma global, guardada pelo `assertPlatformAdmin` do item anterior). Suíte completa verde (16/113) com a camada nova, typecheck limpo, prova de notificações 85/85 rerodada — o caminho de marcar lida foi um dos tocados.
- **Intrusão A×B virou suíte** (`apps/api/test/intrusao.test.ts`): duas empresas reais, dois OWNERs reais. A cria cliente, categoria, produto, fornecedor, compra, venda, lançamento (vencido de propósito), categoria financeira, lead e compromisso pela API; B ataca todas as rotas de escrita e leituras por id com os registros de A usando payloads perfeitamente válidos — o único crime é a propriedade da linha. Nada passa: 404 em cada update/delete/get de terceiro, 403 ao tentar derrubar a sessão de A pela empresa de B (regra da pessoa), 400 quando o cadastro de B tenta apontar para categoria/produto/fornecedor de A, e o scan de avisos de B — mesmo com `companyId` de A no corpo, porta fechada na Fase 1a — não gera nenhum aviso na empresa alheia. A última checagem lê o banco linha por linha e prova que nada foi tocado em silêncio: estoque, status de venda/compra/lançamento/lead/evento, leitura do aviso e sessão de A continuam intocados. Suíte agora em 17 arquivos e 127 testes, todos verdes com as FKs valendo.

### Adicionado

> Etapa de Rotinas agendadas: o relógio do servidor passou a varrer sozinho o que antes só era varrido
> quando alguém abria uma tela, e `/app/rotinas` mostra, pausa e dispara cada varredura.

- **Parser de cron próprio** (`apps/api/src/modules/cron/cron.parse.ts`): as cinco peças com lista, intervalo e passo, domingo valendo como 7 ou 0, e a interseção entre dia do mês e dia da semana documentada no código. Agenda inválida volta 400 apontando a peça — nunca silêncio — e a tela mostra a tradução em português: `agendaLegivel` diz "todos os dias às 07:00", "a cada 15 minutos", "toda segunda às 08:30". `proximaExecucao` varre o calendário à frente com saltos por mês, dia, hora e minuto e teto de 366 dias.
- **As três varreduras do produto** (`cron.handlers.ts`): contas vencidas às 07:00, estoque baixo às 07:05 e relatório do dia anterior às 08:00. Todas escrevem aviso pelo motor de notificações que já existia — preferências por tipo respeitadas, relatório diário chega desligado por padrão — com chave de duplicação (`vencida:<id>:<mês>`, `estoque-baixo:<empresa>:<dia>`, `relatorio-diario:<empresa>:<dia>`), então rodar duas vezes no mesmo dia não gera dois avisos.
- **Executor único, relógio honesto** (`cron.service.ts`, `cron.runner.ts`): o agendamento e o botão "Executar agora" chamam a mesma `executar()`, que não deixa duas execuções simultâneas da mesma rotina (409 com explicação) e grava última execução, status, mensagem e duração na `cron_jobs`. O relógio bate a cada 20 segundos só no `server.ts` — a suíte sobe o app por `buildApp()` sem relógio nenhum —, processa cada minuto uma única vez, ignora job recém-executado na volta do servidor, e `CRON_ENABLED=0` desliga o gatilho no processo que não deve marcar hora.
- **Rotas `/api/ops/jobs`** (`cron.routes.ts`): listar, ligar/pausar e executar, tudo atrás de `settings:write`, com auditoria em cada mudança e em cada disparo manual. Nome e agenda vivem no código; a tela não deixa inventar cron inválido por rota alguma.
- **`/app/rotinas`** (`pages/Rotinas.tsx`, `lib/cronApi.ts`): tabela com agenda traduzida, próxima execução, último resultado com duração, pílulas de ativas e pausadas no título e o botão "Executar agora" cujo toast traz a mensagem real da rotina. Pausar passa pelo diálogo de confirmação da casa; retomar grava direto e o aviso diz quando a rotina volta a rodar. Quem não tem `settings:write` vê "Sem permissão por aqui". O menu "Administração & Sistema" ganhou a linha ◷ Rotinas agendadas.
- **Seed e subida registram os jobs** (`prisma/seed.ts`, `cron.service.ts`): `registrarJobsPadrao()` atualiza nome, descrição e agenda sem tocar no liga/pausa nem no histórico de quem já usou a tela.
- **Testes de integração de cron** (`apps/api/test/cron.test.ts`): as formas válidas com lista, intervalo e passo e as inválidas que voltam 400, o casamento no dia certo, a próxima execução, a tradução da agenda, o RBAC de `/ops/jobs` (anônimo 401, STAFF 403, slug fantasma 404), liga e pausa, e as três rotinas executadas de verdade — vencida que grava aviso com `dedupeKey` "vencida:", estoque crítico que gera o aviso do tipo, e o relatório diário que só chega depois de ligar a preferência e traz o total do dia no corpo. Suíte em 16 arquivos e 113 testes.
- **Prova automatizada (`tools/verify-rotinas.cjs`)**: 37 checagens — as três rotinas na tabela com agenda traduzida e próxima execução conferidas contra a API, "Executar agora" sobre um lançamento vencido criado pela prova, o aviso visto no banco e o toast com a mesma mensagem, pausar pelo diálogo, retomar, o atendente barrado na tela e no 403, os dois temas e os 390px. No fim devolve cada job ao estado que encontrou, apaga os avisos e o usuário de prova. Prints: `docs/screenshots/23-rotinas-tela.png`, `-executou.png`, `-confirmacao.png`, `-sem-permissao.png`, `-claro.png` e `-celular.png`.

> Ajuste de forma na vitrine: a seção "Sobre o Nexus".

- **O texto do "Sobre" parou de dividir a tela com um vazio** (`components/landing/AboutSection.tsx`, `styles/landing.css`): sem métrica cadastrada a segunda coluna da grade era só espaço morto à direita — agora a seção ocupa a linha inteira, com a coluna de leitura centralizada e medida em 72 caracteres, o parágrafo de abertura um degrau acima do resto, barra curta de cobre sob o título e mais respiro entre os blocos. E o texto dizia que as rotinas agendadas ainda não tinham chegado — verdade até ontem: a frase saiu da lista de promessas (`components/landing/copy.ts`). A prova `verify-landing-cms.cjs` rodou depois da mudança: 105 checagens, 0 falhas, sem arrasto em 390px.

> Etapa de Configurações (seção 37 do prompt mestre): a tela que existia só para trocar tema e empresa
> passou a responder pelo cadastro inteiro, com a regra de cada campo morando na API.

- **`PATCH /api/companies/current` com escrita parcial de verdade** (`apps/api/src/modules/companies/companies.schemas.ts`, `companies.service.ts`): chave ausente não toca no campo, chave vazia (`""` ou `null`) limpa o que estava guardado, o schema é `.strict()` — campo escrito errado devolve 400 em vez de ser ignorado em silêncio — e um pedido sem nenhum campo é recusado com "Envie ao menos um campo para gravar". A resposta devolve a empresa inteira já normalizada (dígitos apertados, moeda e UF em caixa alta, e-mail em minúscula) e a lista `alterados`: é ela que diz à tela se houve gravação ou se os campos já estavam assim. Toda escrita deixa na auditoria o de/para de cada campo, não o formulário inteiro.
- **Regras brasileiras num lugar só** (`apps/api/src/lib/brFields.ts): CNPJ com os dois dígitos verificadores calculados (e sequência repetida barrada, porque passa na conta e não existe), CEP, as 27 UFs, telefone no padrão brasileiro — DDD de 11 a 99 seguido de 8 ou 9 algarismos —, e-mail, URL http(s), e as listas fechadas de moeda, idioma e fuso. A tela espelha o que dá para espelhar e a API decide o resto: nenhum cliente está autorizado a dizer que um CNPJ existe.
- **Listas de opção servidas pela API** (`GET /api/companies/settings/opcoes`): UF, moedas, idiomas e os fusos do Brasil saem de `brFields` para a tela não manter cópia à parte da regra. Um valor antigo fora da lista continua visível no select, marcado como "(valor atual)" — sumir da lista não pode apagar o cadastro de ninguém.
- **Conta: `PATCH /api/auth/me` e troca de senha autenticada** (`auth.schemas.ts`, `auth.service.ts`): nome e telefone são da própria pessoa, todo papel pode, e a mesma regra de chave ausente vale aqui. `POST /api/auth/change-password` confere a senha atual, recusa a nova igual à atual, revoga os refresh tokens e devolve quantas sessões caíram; responde 400 e não 401 para o app não sair tentando renovar um token que ainda é válido. Rate limit próprio de 5 por minuto.
- **O formato do painel segue a empresa** (`apps/web/src/lib/format.ts`): moeda, fuso e idioma vêm da sessão, então o mesmo valor sai `R$ 1.234,50` numa empresa e `US$ 1.234,50` em outra, e as datas são lidas pelo fuso cadastrado. `GET /api/reports/overview` passou a devolver a meta do mês com o ritmo diário necessário, e o card de metas do Dashboard compara a venda do mês com o valor cadastrado — sem meta, a tela diz como definir uma em vez de mostrar barra zerada.
- **`/app/configuracoes` reescrita em quatro abas** (`pages/Settings.tsx`, `components/settings/ContaPanel.tsx`, `EmpresaPanel.tsx`, `lib/settingsApi.ts`, `lib/masks.ts`): Minha conta, Empresa, Aparência e Empresas, todas alcançáveis por `?aba=`. A aba Empresa é montada por uma tabela de descritores — cinco blocos (Identificação, Endereço, Formato de números e datas, Identidade visual, Meta de receita), cada um com seu botão, mandando só o que difere do que o servidor devolveu. Máscara de CNPJ, telefone e CEP na digitação, prévia da logo pelo endereço cadastrado, e o erro do 400 mostrando no campo em que a pessoa errou (`extractFieldErrors` lê o `issues[]` do Zod). Quem não tem `settings:write` lê tudo e não grava nada: no lugar do botão aparece a nota de quem pode, e os campos vêm travados. Trocar a senha mantém esta aba conectada — ela entra de novo com a senha que acabou de ser gravada.
- **As peças de formulário do CMS viraram biblioteca da casa** (`components/Fields.tsx`, antes `components/cms/Campos.tsx`): `Campo`, `CampoArea`, `CampoNumero`/`CampoNumeroOpcional` (vazio e zero são coisas diferentes), `CampoEscolha`, `CampoCor`, `CampoLigado`, `BotaoSalvar` e `Bloco`, agora com `erro` em todos e `somenteLeitura` no campo de texto. As classes saíram do prefixo `cms-` para `nx-` (`nx-bloco`, `nx-grade`, `nx-painel`, `nx-ligado`), `styles/cms.css` ficou só com o que é da vitrine, e a CSS morta do layout antigo (`.settings-grid`) saiu. `PASSWORD_RULE_HINT` em `lib/uiCopy.ts` é a única fonte da regra de senha escrita na tela — cadastro, recuperação e Configurações dizem o mesmo texto.
- **Testes de integração de configurações** (`apps/api/test/settings.test.ts`): escrita parcial que não toca no que não foi enviado, "" que limpa, CNPJ com dígito verificador errado rejeitado, telefone com DDD inválido, UF fora da lista, logo sem http(s), moeda inventada, pedido vazio recusado, o de/para na auditoria, perfil da própria conta por papel, troca de senha que derruba as outras sessões e a senha atual errada. Suíte em 15 arquivos e 102 testes.
- **Prova automatizada (`tools/verify-configuracoes.cjs`)**: 108 checagens no navegador — as quatro abas pela URL, o recarregar que mantém a aba, telefone mascarado na tela e em algarismos na API, telefone curto barrado no campo, CNPJ inválido rejeitado e válido normalizado e re-mascarado, gravar um bloco sem tocar nos outros, CEP/UF/cidade, moeda USD que chega à sessão e muda a prévia e o Dashboard, logo sem http(s), meta que vira "Alvo de US$ 25.000,00" no painel, os botões de tema mexendo no `data-theme`, a lista de empresas com a ativa marcada, o STAFF lendo tudo sem nenhum botão de gravar, e a troca de senha que não despeja a pessoa da sessão. No fim a prova devolve a empresa e a conta ao estado que encontrou e apaga o usuário de prova que criou no banco — o produto não tem rota de exclusão. Prints: `docs/screenshots/22-configuracoes-conta.png`, `-empresa.png`, `-erro-cnpj.png`, `-aparencia.png`, `-empresas.png`, `-limpo.png`, `-somente-leitura.png`, `-celular.png` e `06-configuracoes-claro.png` recapturado, porque a tela da galeria do README mudou de verdade.
- **As provas do editor e da responsividade acompanharam a mudança de nome** (`tools/verify-cms.cjs`, `tools/verify-responsive.cjs`): seletores `.cms-bloco*`, `.cms-ligado` e `.cms-painel` viraram `.nx-*`, e a checagem de grade de formulário passou a medir `.nx-grade` — uma coluna a 390px, duas a 1280px.


- **Sino de avisos no cabeçalho, em toda tela do painel** (`apps/web/src/components/layout/NotificationBell.tsx`): o número de não lidos — em tom de urgente quando existe aviso urgente — e o painel dos últimos seis avisos que abre ao lado do botão. A batida pergunta só contagens (`GET /api/notifications/count`) a cada 45 segundos, nunca a lista; quem abre o painel é que busca os registros. Com a aba escondida o polling para, e voltar para a aba puxa a contagem na hora — ninguém paga requisição por uma aba aberta desde ontem num segundo monitor. Cada linha do painel marca como lida na API e leva à tela do aviso ("Despesa vencida há 9 dias" abre o Financeiro); o rodapé tem "Marcar todas como lidas" e "Ver todos os avisos". Fecha em Esc e no clique fora, com `aria-expanded`/`aria-controls` e foco devolvido ao botão. O sino é um traço em SVG desenhado no próprio componente, na família dos ícones do cabeçalho — nenhuma biblioteca de ícones entrou no projeto por causa dele. A linha "Notificações" entrou na camada Visão Geral da sidebar sem permissionamento próprio: cada pessoa vê só os avisos dela, na empresa ativa, então qualquer papel que entra no painel pode abrir a tela.
- **Tela de avisos `/app/notificacoes`** (`apps/web/src/pages/Notifications.tsx` + `styles/notificacoes.css`, que entra depois do `cms.css` e não alcança a vitrine): três abas sobre o padrão de navegação do sistema — Todos os avisos, Não lidos (com o badge da contagem) e Preferências, todas alcançáveis por `?aba=`. No título, as pílulas de não lidos e urgentes; abaixo, um chip por tipo com o número de cada um ao lado do rótulo, combinável com o filtro de lidas/não lidas; a lista vem paginada do servidor, e a página 2 continua o mesmo filtro. Na linha, as ações Abrir e Marcar lida; a prioridade nunca é só cor — a classe `is-low|medium|high` vem escrita com o rótulo Baixa/Média/Alta. "Marcar todos como lidos" passa pelo diálogo de confirmação da casa, "Ver contas vencidas agora" aparece só para quem tem `settings:write`, e um tipo sem aviso mostra o estado vazio dizendo isso em vez de uma lista em branco. O aviso novo tem ponto e fundo próprios, o instante completo fica no `title` da linha e o texto mostra `tempoRelativo` ("há 12 minutos", "ontem"), porque horário exato diz pouco quando se está varrendo o que a equipe fez hoje. Os trechos da linha são separados por um ponto gerado no CSS (`.nx-aviso-meta > span + span::before`): sem ele o leitor de tela emendava "agora mesmoMédia" e a frase perdia o sentido falado.
- **Preferências por tipo na tela**: os cinco tipos com o rótulo do negócio, o canal in-app de cada um, o canal de e-mail desligado com o motivo declarado na própria linha (sem SMTP configurado não há envio, e o sistema continua sem fingir que envia), o botão de gravar travado até algo mudar de fato, o salvar conferido no banco e depois do reload, e o link "Voltar ao padrão". Empresa e dono vêm sempre do token — não existe seletor de empresa nesta tela, porque não há como pedir os avisos de outra empresa.
- **Sino e tela conversam pelo mesmo evento** (`apps/web/src/lib/notificationsApi.ts`): `anunciarMudancaNosAvisos()` dispara `nexus:avisos` no navegador, então marcar lida na tela atualiza o número do cabeçalho — e o número do cabeçalho atualiza a tela — sem recarregar nada. Nenhum dos dois manda empresa nem destinatário como parâmetro.
- **Prova automatizada dos avisos (`tools/verify-notificacoes.cjs`)**: 85 checagens sobre dado que a própria prova fabrica pela API — doze contas a pagar vencidas com "PROVA-SINO" no nome e a varredura administrativa disparada. Confere no navegador o número do sino batendo com `/count`, o tom de urgente, o painel aberto com exatamente os mesmos seis registros que a API devolve, Esc e clique fora fechando, marcar lida gravado no banco com a tela certa abrindo e o contador descendo de 12 para 11, as três abas com o badge, a paginação medida contra o `meta.total` e o `totalPages` do servidor, o chip do Financeiro filtrando, o CRM dizendo que não há aviso daquele tipo, a página 2 com a conta que falta, marcar um e marcar todos até o estado vazio e o número sumir, as preferências gravadas no banco, relidas após reload e devolvidas ao padrão, a varredura repetida não dobrando aviso, o tema claro e os 390px sem arrasto horizontal. No fim a prova apaga os avisos e os lançamentos que criou pelo Prisma, porque o produto não tem rota para excluir aviso — limpar dado de teste é responsabilidade de quem o criou. Prints: `docs/screenshots/21-notificacoes-sino.png`, `21-notificacoes-tela.png`, `21-notificacoes-naolidos.png`, `21-notificacoes-preferencias.png`, `21-notificacoes-claro.png` e `21-notificacoes-celular.png`, além das capturas da sidebar (`16-*.png`) e do editor (`20-*.png`) recapturadas com o sino no cabeçalho.

- **Editor do site público em `/app/cms`**: cinco abas sobre o módulo CMS da API — Conteúdo (textos do topo, as sete cores da vitrine, herói com os dois botões e suas rotas, overlay e desfoque, WhatsApp, contato e redes), Itens (capacidades, banners, depoimentos, métricas e FAQs por tipo, com criar, editar, esconder e excluir no modal do sistema), Textos legais (Termos, Privacidade e LGPD com o estado de cada um na pílula do seletor), SEO e Manutenção. Cada bloco grava sozinho e manda só o que mudou, então ajustar uma cor não toca no WhatsApp nem no herói. As peças novas são `pages/Cms.tsx`, `components/cms/` (`Campos`, `ConteudoPanel`, `ItensPanel`, `LegaisPanel`, `SeoPanel`, `ManutencaoPanel`), `lib/cmsApi.ts` e `styles/cms.css`; o campo de cor tem quadrado e hexadecimal brigando pelo mesmo valor — o texto é o dono, e o quadrado só espelha cor válida.
- **O botão de manutenção acompanha o que está na tela, não o que já está salvo**: com o interruptor ligado o bloco passa a se chamar "Fechar o site" e pede a confirmação que explica o 503; com ele desligado sobre um site fechado, o mesmo botão diz "Abrir o site" e grava direto. Antes, o rótulo vinha do estado gravado, e a pessoa que ia reabrir a plataforma era surpreendida por um diálogo de fechamento.
- **Rascunho e publicação têm cores diferentes**: nos textos legais, "Salvar rascunho" saiu do dourado e foi para o botão discreto da casa — guardar um texto não é a ação principal daquele bloco, publicar é. O `BotaoSalvar` ganhou o parâmetro `neutra` para isso.
- **A nota de SEO chegou ao editor com as 12 checagens que a compõem**: ao lado do número, a lista do que a API avaliou, o peso de cada item e o que falta — e a classe do nível saiu do acento ("atenção" e "crítico" viravam `.is-atenção` no CSS, ou seja, nenhum nível fora de "bom" tinha cor). As descrições de SEO e do Open Graph passaram a ser campo de texto alto, como são na vida real.
- **Um único atalho para a vitrine**: "Visualizar landing page" mora só no cabeçalho do painel e abre `/` em outra aba; o botão duplicado no título da página saiu, e ao lado dele um selo diz se o site está aberto ou em manutenção, lido da própria configuração.
- **Prova automatizada do editor (`tools/verify-cms.cjs`)**: 115 checagens que abrem o editor logado, percorrem as cinco abas pelo endereço (`?aba=`), gravam headline, paleta e item, conferem cada escrita no payload público e na vitrine renderizada (a cor cadastrada medida no `--bg` do elemento), criam, escondem, mostram, editam e excluem um item pelo modal, publicam um texto legal e o veem sair do 404 para a página montada, comparam a nota da tela com a da API, fecham o site pela confirmação, medem o 503 na rota de negócio, a mensagem e o relógio na tela de manutenção, geram o código de pulso e entram com ele, reabrem o site, devolvem tudo ao padrão do produto e recarregam o editor para provar que a tela lê o banco — mais os dois temas e os 390px sem arrasto horizontal. Prints: `docs/screenshots/20-cms-conteudo-dark.png`, `20-cms-conteudo-claro.png`, `20-cms-celular.png`, `20-cms-item-novo.png`, `20-cms-itens.png`, `20-cms-legais.png`, `20-cms-legal-publicado.png`, `20-cms-seo.png`, `20-cms-manutencao.png` e `20-cms-tela-manutencao.png`.
- **A vitrine pública passou a ser montada pelo que está no banco**: `apps/web/src/pages/Landing.tsx` lê `GET /api/public/landing` e pinta a página com o conteúdo cadastrado — as sete cores da marca entram como variáveis CSS no elemento raiz, o herói recebe título, subtítulo, duas chamadas para ação e imagem, e as faixas de capacidades, banners, depoimentos (com estrelas e empresa), métricas e dúvidas saem dos itens ativos. O que não existe no banco não aparece na tela: sem depoimento ou métrica cadastrados a seção some, e as âncoras do cabeçalho encolhem para o que realmente está na página. Com o banco vazio, as quatro capacidades do produto e os textos padrão assumem, e a vitrine continua de pé.
- **Contato, redes e WhatsApp cadastráveis**: `ContactSection` mostra telefone discável (`tel:`), e-mail, endereço e horário de atendimento; `LandingFooter` lista as redes vindas do bloco `social`; `WhatsappWidget` entra flutuante na posição escolhida (esquerda ou direita) e só quando o canal está ligado; `CookieBanner` aparece na primeira visita e guarda a escolha no navegador.
- **Textos legais no endereço próprio**: `/legal/:kind` (Termos, Privacidade e LGPD) busca o documento publicado na API e o divide em parágrafos. Enquanto não há texto publicado a página diz isso, em vez de inventar cláusula; um slug desconhecido cai no mesmo aviso honesto.
- **Tela de manutenção com relógio e código de pulso**: quando a API devolve 503, a vitrine dá lugar a `Maintenance.tsx` — a mensagem cadastrada, a contagem regressiva ao vivo até a previsão de volta, o campo do código de pulso e o link "Tentar entrar mesmo assim". Aceito o código (`POST /api/public/bypass`, que devolve apenas `{liberado}`), a vitrine volta na mesma aba e o pulso fica em `sessionStorage`: vive naquela aba e morre com ela, sem ir para o disco nem para uma chave compartilhada entre abas.
- **POST sem corpo voltou a ser uma ação, não um erro**: `apps/api/src/app.ts` ganhou parser próprio de `application/json` — corpo vazio vale `{}` e JSON escrito errado continua 400, agora com a nossa mensagem. O axios envia `content-type` mesmo sem payload, e o parser padrão do Fastify derrubaria com "Body cannot be empty" o botão "gerar pulso" do editor, o "marcar tudo lido" das notificações e o deslogar. Regressão coberta em `apps/api/test/cms.test.ts`.
- **A paleta do CMS agora manda no texto da vitrine**: `<body>` resolve `--text` antes de o estilo inline da vitrine existir, então no tema claro com fundo escuro cadastrado a headline ficava escura sobre escuro. `.landing { color: var(--text) }` amarra o texto à paleta do cadastro nos dois temas.
- **Tela de manutenção centralizada e sem rótulo repetido**: `place-items: center` não centraliza no eixo principal de um flex em coluna — `align-items` e `justify-content` fazem isso agora. E o botão que envia o código passou a se chamar "Liberar acesso": "Entrar assim mesmo" era o rótulo do link de baixo, e os dois com a mesma palavra confundiam.
- **Teste devolve a vitrine ao padrão da casa**: o `afterAll` de `cms.test.ts` só zerava a manutenção e deixava "Headline auditado para o teste" gravado na configuração — um print da página pública sairia com texto de teste no herói da empresa real. Agora restaura headline, subheadline, cores, WhatsApp, SEO, herói, redes e contato. A suíte está em 14 arquivos e 81 testes.
- **Prova automatizada da vitrine (`tools/verify-landing-cms.cjs`)**: 105 checagens montam uma vitrine de exemplo pela API e conferem no navegador o texto, a paleta, as âncoras, os cards, o banner, a métrica em reais, o depoimento, a FAQ, o contato, o WhatsApp, o aviso de cookies, o SEO no `<head>`, as páginas legais, os três tamanhos de tela sem arrasto horizontal e os dois temas — mais a manutenção de ponta a ponta (503 na rota de negócio, as quatro portas que continuam abertas, a contagem regressiva, o pulso errado e o certo, o IP da allowlist, o código guardado na sessão e não no disco, e o reload que continua aberto). No fim a própria prova apaga os itens de exemplo e devolve a configuração ao padrão do produto. Prints: `docs/screenshots/19-landing-cms-dark.png`, `19-landing-cms-claro.png`, `19-landing-cms-celular.png`, `19-manutencao.png`, `19-legal-termos.png` e `01-landing.png` recapturado.

- **Módulo CMS na API (conteúdo da página pública)**: novo `apps/api/src/modules/cms` (schemas, serviço e rotas) para a vitrine da plataforma. `LandingConfig` ganhou os blocos `hero`, `social` e `contact`, `LandingItem` ganhou `meta` (Json) para os extras por tipo, e `LandingItemKind` passou a aceitar FEATURE e METRIC ao lado de BANNER, TESTIMONIAL e FAQ — migração `add_cms_content`. O conteúdo é global: não tem `company_id` porque a landing é uma só para toda a plataforma.
- **Configuração, itens e textos legais com merge por bloco**: `GET/PATCH /api/cms/config` aceita apenas o bloco que a pessoa editou e mantém o padrão da casa no restante (cores, WhatsApp, SEO, herói, redes, contato, headline); `GET/POST /api/cms/items`, `PATCH/DELETE /api/cms/items/:id` e `GET /api/cms/kinds` para banners, capacidades, depoimentos, métricas e FAQs; `GET /api/cms/legal` e `PUT /api/cms/legal/:kind` para Termos, Privacidade e LGPD. Toda escrita deixa trilha na auditoria (`cms.config.updated`, `cms.item.created/updated/delete`, `cms.legal.published/updated`) com o ator e a empresa de quem editou.
- **Leitura pública sem segredo e com cache**: `GET /api/public/landing` devolve anônimo cores, WhatsApp, SEO, herói, redes, contato, os cinco grupos de itens e o resumo da manutenção (ativa, mensagem, previsão) com cache de 10 segundos — o token de pulso nunca sai nesse payload, e há teste que procura essa palavra no JSON inteiro. `GET /api/public/legal/:kind` responde 404 enquanto o texto não estiver publicado.
- **Modo manutenção com saída garantida**: `plugins/maintenance.ts` registra um gancho `onRequest` antes das rotas de negócio. Com a manutenção ativa, tudo devolve 503 com a mensagem e a previsão de volta, menos `/api/health`, `/api/auth`, `/api/public` e `/api/cms` — quem responde pelo site consegue desligar o modo mesmo com o site fechado. Passam também quem apresenta o token de pulso (`POST /api/cms/maintenance/token`, 18 caracteres hex, comparado em tempo constante) ou o IP cadastrado (`::ffff:` e `::1` normalizados); `POST /api/public/bypass` confere o pulso e devolve só `{liberado}`, sem dizer o motivo de ter negado.
- **Nota SEO real**: `GET /api/cms/seo/score` percorre 12 checagens do payload publicado (headline e subheadline, descrição, título, og:image, twitter card, canonical, favicon, WhatsApp visível, contato, textos legais, manutenção) e devolve nota, nível e o que falta — nada de pontuação de enfeite.
- **Recurso `content` na matriz RBAC**: a linha "Site público (CMS)" entrou em `lib/rbac.ts`. Como a vitrine é única e global, `content:read` e `content:write` ficaram com o OWNER (que segura `*`); ADMIN, MANAGER e STAFF recebem 403 no editor. Decisão registrada aqui para revisão.
- **10 testes de integração do CMS** (`apps/api/test/cms.test.ts`): leitura anônima que não vaza o pulso (o teste procura a palavra no JSON inteiro), RBAC por papel no `PATCH /api/cms/config`, gravação parcial que faz merge e cor inválida que devolve 400, item criado que aparece no payload público e some quando inativo, exclusão real seguida de PATCH → 404, `meta` de depoimento e de métrica com estrelas validadas, filtro por tipo, nota SEO que muda quando o og:image aparece, texto legal antes e depois de publicar, e a manutenção de ponta a ponta: 503 com mensagem e previsão, allowlist aberta, pulso certo e errado, IP permitido versus bloqueado, e o bypass devolvendo só `{liberado}`.

- **Sidebar em camadas com títulos de seção (group headers)**: o menu lateral foi reorganizado em seis camadas, na ordem do padrão do produto — Visão Geral (Dashboard); Comercial & CRM (CRM, Clientes, Vendas); Estoque & Suprimentos (Produtos, Compras); Serviços & Atendimentos (Ordens de Serviço, Agenda); Financeiro (Financeiro, Gateways & Cobranças); Administração & Sistema (Usuários, Auditoria, CMS & Site Público, Configurações). O título de camada usa o cinza discreto da casa (`--text-3`) em caixa alta, 0,68rem, peso 700 e `letter-spacing` de 0,08em, e a camada cujo conteúdo a pessoa não tem permissão de ver some inteira, título junto — um atendente nunca encontra cabeçalho órfão.
- **Trilha compacta sem perder a agrupação**: no modo recolhido (78px) os títulos desaparecem e ficam somente os ícones alinhados; no lugar de cada título entra um filete de 1px entre as camadas, para a organização continuar perceptível sem texto nenhum.
- **Expansão por hover (Hover Peek) com recolhimento por clique preservado**: com a barra recolhida, o ponteiro ou o foco do teclado revelam a barra de 264px deslizando sobre o conteúdo (`margin-right: -186px`, z-index 45, sombra da casa), com 70ms para abrir e 140ms para fechar; rótulos e títulos entram com a animação `nx-peek-in`, desligada em `prefers-reduced-motion`. O clique no botão continua fixando o estado, persistido em `localStorage`, e quem fixa a barra nunca passa pelo peek.
- **Barra lateral congelada enquanto um diálogo está na tela**: com uma confirmação aberta, o hover não dispara o peek — era assim que a barra recolhia embaixo do mouse no instante do clique e o conteúdo dava um tranco. Fechado o diálogo, o comportamento volta sozinho, e a prova mede a largura da barra e o x do conteúdo antes e depois.
- **Módulos ainda em obra, sem link falso**: Ordens de Serviço, Gateways & Cobranças e CMS & Site Público aparecem como linhas apagadas e não clicáveis (`aria-disabled="true"`), com um ponto no canto do ícone, a dica do mouse explicando o que falta e o texto "em breve" no fluxo acessível. A etiqueta escrita não foi usada porque a barra de 264px corta o nome do módulo ("Gateways & Cobranças" viraria "Gateways & Cobr…"), e nem rota inexistente nem botão morto foram criados.
- **Prova da sidebar ampliada** (`tools/verify-sidebar.cjs`): 87 checagens conferem agora a ordem e a tipografia dos seis títulos de camada, a lista completa de itens por permissão, o filete da trilha, o retorno dos títulos no peek, as linhas "em breve" e a ausência de rótulo cortado na barra larga e na revelada — com `docs/screenshots/16-sidebar-desktop.png`, `16-sidebar-colapsada.png`, `16-sidebar-peek.png`, `16-sidebar-tablet.png`, `16-sidebar-celular.png` e `16-sidebar-tema-claro.png` recapturados.
- **Diálogo central de confirmação (`components/ConfirmationModal.tsx`)**: todo "tem certeza?" do Nexus passou pelo mesmo container modal do sistema — Portal no fim do `<body>`, scrim com blur, mesma animação de entrada, armadilha de foco e Esc/overlay bloqueados enquanto a requisição acontece. O registro afetado aparece em negrito dourado no lugar de `{nome}`, um segundo parágrafo diz exatamente o que acontece com ele ("Ele sai das novas vendas; o histórico fica guardado.") e o erro da API surge dentro do próprio diálogo, com a tentativa nova preservada. A semântica de cor é única: vermelho de risco para excluir, inativar, cancelar e encerrar sessão, dourado da marca para confirmar, pagar, receber e reativar, e com risco o foco inicial cai sempre em "Voltar". Entraram o token `--risk`/`--risk-strong` (um degrau mais fundo no tema dia, para o texto branco continuar legível), o `alert()` nativo foi trocado por `abrirAviso()` e o `Modal` da casa ganhou o estado `busy` com `aria-busy`. O SweetAlert2 deixou de ser usado em `apps/web/src` — a dependência continua no `package.json` até decisão contrária.
- **Trava de duplo clique em ação destrutiva**: um `useRef` síncrono corta o segundo clique na primeira linha (o `disabled` do React só chega ao DOM depois do re-render, então dois cliques colados no mesmo tick chamariam a API duas vezes), o botão entra com spinner, `aria-busy` e rótulo "Desativar…", e o rodapé do modal fica com `pointer-events: none` enquanto a requisição dura. A prova aperta três cliques seguidos no botão de confirmar e confere uma única requisição.
- **Coluna Ações das tabelas na mesma linha**: `.row-actions` passou a ser `flex-direction: row` com `flex-wrap: nowrap` e `flex: 0 0 auto` nos botões, e `.col-acoes` ganhou 176px de largura mínima — Editar e Desativar pararam de empilhar em telas menores sem cortar a tabela e sem abrir rolagem horizontal (conferido em 1440, 1100, 1024, 900, 820, 640 e 390px). Onde a quebra de linha é bem-vinda, as cinco pílulas de estágio do lead no CRM, entrou a classe própria `.stage-buttons` em vez de reaproveitar a classe da tabela. A aba Sessões de Usuários seguiu o mesmo padrão (`col-acoes` + `row-actions`).
- **As oito telas migraram para o diálogo que chama a API**: Clientes, Produtos, Vendas, Compras, Financeiro, CRM, Agenda e Usuários saíram do modelo antigo (o diálogo só perguntava e a página chamava a API depois) para o diálogo executar a chamada — com spinner, erro dentro do modal e a recarga da lista acontecendo só quando a operação de fato aconteceu. Os textos passaram a dizer a consequência real do registro em vez de prometer "acessos suspensos" ou "estorno de lançamentos" onde o sistema não faz isso.
- **Prova automatizada `tools/verify-acoes-confirm.cjs`**: 88 checagens na coluna de ações de nove tabelas, na anatomia do diálogo (Portal, z-index acima da barra lateral, scrim com blur, nome em negrito, cor e rótulo dos botões, foco inicial), no bloqueio do Esc durante a requisição, no tema claro e no diálogo no celular — com `docs/screenshots/17-confirm-cliente-dark.png`, `17-confirm-cliente-claro.png`, `17-confirm-cliente-celular.png` e `17-confirm-financeiro-dark.png`. No fim a própria prova devolve o cliente de demonstração ao estado ativo pela API, para não deixar rastro nos dados.
- **Notificações persistentes (backend, seção 44)**: novo módulo `apps/api/src/modules/notifications` com as tabelas `notifications` e `notification_preferences` e cinco tipos de aviso de importância igual — Vendas, Estoque, Leads, Financeiro e Relatório diário — cada um com prioridade (Baixa/Média/Alta), link para a tela certa e chave antifduplication. Venda confirmada ou cancelada, produto controlado que encosta no mínimo ou zera, lead novo e conta vencida agora geram aviso para a equipe; quem praticou a ação nunca recebe o próprio aviso, e um aviso que não nasceu fica no log sem estragar a venda, a compra ou o estoque (`notificar()` é sempre protegido e grava com `createMany` + `skipDuplicates`).
- **Preferências e leitura na API**: `GET/PUT /api/notifications/preferences` com uma chave por tipo e os canais in-app e de e-mail separados (e-mail desligado enquanto não há SMTP configurado), `GET /api/notifications` paginado com filtro por tipo e por lidas/não lidas, `GET /api/notifications/count` devolvendo o número do sino com a quebra por tipo e as urgentes, `PATCH /api/notifications/:id/read`, `POST /api/notifications/read-all` e `POST /api/notifications/scan` — a varredura de contas vencidas, só para OWNER/ADMIN, que não repete o mesmo aviso dentro do mês. A empresa ativa vem sempre do token, nunca de um parâmetro da requisição, e nada vaza entre empresas do mesmo usuário.
- **Pedido rascunho não anuncia venda cancelada**: `createSale` disparava o aviso mesmo quando o pedido nascia pendente, com o texto de "cancelada", e a lista mostrava dois avisos da mesma venda. Agora só a venda que entra em vigor (ou que é cancelada de fato) avisa a equipe, e a baixa de estoque na confirmação continua chamando o alerta de estoque mínimo na mesma hora.
- **Migração `add_admin_cms_ops`**: cria as tabelas de notificações e preferências e já deixa criadas, ainda sem tela, as tabelas de configurações da empresa (endereço, logo, moeda, fuso, meta de receita), do CMS da página pública, dos documentos legais, dos modelos de e-mail, das rotinas agendadas e dos gateways de pagamento. Os módulos correspondentes (`/app/cms`, `/app/gateways`, Configurações) continuam em construção e aparecem no menu como "em breve".
- **8 testes de integração de notificações** (`apps/api/test/notifications.test.ts`): aviso de venda chega à equipe mas não a quem vendeu, estoque zerado vem como prioridade alta, desligar um tipo silencia só aquele tipo, o contador do sino acompanha marcar uma e marcar todas, a varredura de contas vencidas avisa uma vez por mês com trilha de auditoria, atendente não pode disparar a varredura administrativa, nada vaza entre empresas e as preferências devolvem os rótulos dos tipos. A suíte está em 13 arquivos e 70 testes.
- **Navegação por abas em todas as páginas do sistema**: novo componente `components/Tabs.tsx` (`Tabs` + `TabPanel` + `useTabState`) aplicado em Dashboard, Clientes, Produtos, Vendas, Compras, Financeiro, CRM, Usuários e Auditoria com os rótulos definidos no padrão do produto — Visão Geral / Metas & Indicadores / Alertas, Todos os Clientes / Segmentos e Grupos / Análises, Catálogo / Categorias e Marcas / Movimentações, Pedidos de Venda / Nova Venda / Relatórios, Pedidos de Compra / Fornecedores / Cotações, Fluxo de Caixa / Contas a Pagar e Receber / Centros de Custo, Funil de Vendas / Leads / Atividades, Lista de Usuários / Permissões (RBAC) / Sessões, Logs do Sistema / Alterações Sensíveis / Exportação. A aba ativa usa o dourado da marca, o estado aparece na URL (`?aba=`, sem poluir a primeira aba), o link direto abre a aba pedida, a troca não recarrega a página, há foco por setas do teclado com `role="tablist"`, e no celular a barra rola na horizontal sem estourar a largura da tela.
- **Respiro visual padronizado entre as telas**: `margin-bottom` de 1,5rem entre a barra de abas e o primeiro conteúdo, 1,5rem entre os blocos de cada painel (título → abas → cards de resumo → busca/filtros → tabela), 1,1rem entre os elementos dentro dos cards e folga interna de 1,5rem; todas as nove páginas voltaram a ter título e subtítulo no padrão `page-title`/`page-sub`, inclusive Clientes ("Gestão e base de clientes da empresa ativa").
- **Paginação única no rodapé de todas as tabelas e listagens**: `components/Pagination.tsx` reescrito — à esquerda o resumo "Exibindo 1–10 de 50 clientes · página 1 de 5", à direita o seletor de itens por página (10/25/50/100) e os botões « ‹ 1 2 … 12 › », com a página ativa em dourado, `‹`/`«` desabilitados na primeira página, `›`/`»` na última, `aria-label` em todos os botões e foco visível com o anel do tema. O gancho `usePaginacaoLocal` dá o mesmo comportamento às listas que chegam inteiras do servidor (Fluxo de Caixa por dia, Centros de Custo, Sessões abertas, Cotações e o ranking ABC de clientes), e o relatório de top clientes passou a devolver 50 itens para a paginação ter sentido. O padrão do sistema virou 10 por página (havia 10 e 15 misturados) e foi aplicado em Clientes (lista e análises), Produtos (catálogo e movimentações), Vendas (pedidos), Compras (pedidos, fornecedores e cotações), Financeiro (lançamentos, fluxo e categorias), CRM (leads e atividades), Usuários (lista e sessões) e Auditoria (logs e alterações sensíveis).
- **Histórico de atividades que se entende sem código**: `lib/auditLabels.ts` traduz os códigos da auditoria para a linguagem do negócio ("lead.contacted" → "Contato realizado", "sale.create" → "Venda: registro criado"), a trilha de auditoria do CRM passou a registrar o que mudou (nome do lead, estágio de/para, valor de/para e quais campos foram ajustados) e as abas Atividades e Logs do Sistema mostram frase + detalhe ("de Contatado para Novo", "ajustou contato por telefone, valor · valor foi para R$ 4.500,00") em vez de um UUID e um código interno. As colunas "O que fez" e "Quando" ganharam largura própria, o card do histórico limita a altura a 600px com rolagem interna e cabeçalho fixo, e a matriz de permissões sai com os checks centralizados sob cada papel.
- **Prova automatizada ampliada** (`tools/shoot-tabs.cjs`): a prova de navegação agora também confere paginação por aba, respiro medido em pixels, legibilidade do histórico e centralização da matriz RBAC — 447 checagens em 9 páginas, desktop e celular, com os 16 screenshots `docs/screenshots/18-tabs-*.png` recapturados.
- **Módulo CRM (frontend)**: página `/app/crm` com funil de cinco estágios clicáveis (contagem e soma de valor por etapa), KPIs de valor em aberto, ganhos, perdidos e taxa de conversão, busca por nome/e-mail, filtro por estágio, mudança de estágio pelo seletor da linha ou pelo modal de detalhe — Ganho e Perdido pedem confirmação no SweetAlert2, e Ganho converte o lead em cliente na hora —, além de cadastro/edição no modal compartilhado e a entrada "CRM" no menu lateral (hexágono da marca, visível com `crm:read`).
- **Prova automatizada do CRM** (`tools/shoot-crm.cjs`): 42 checagens de ponta a ponta (funil, KPIs, modal de cadastro, filtros, movimentação de estágio, conversão em cliente verificada na tela de Clientes, perda e reabertura, celular sem overflow), com `docs/screenshots/14-crm.png`, `14-crm-novo-lead.png`, `14-crm-detalhe.png` e `14-crm-celular.png`.
- **Botão de alternância da sidebar (Sidebar Toggle)**: o hambúrguer de três linhas deu lugar a um ícone "panel left" desenhado em SVG (família Lucide/Heroicons), no cabeçalho à esquerda de "Business Manager", com fundo transparente, contorno arredondado (12px), hover suave e tom dourado da marca quando ativo; a divisória do ícone inverte de lado com transição de 280ms, reforçando visualmente o estado aberto/fechado.
- **Modo trilha no desktop**: um clique recolhe a barra para 78px apenas com ícones, mantendo tooltip com o nome da seção ao passar o mouse ou focar pelo teclado, e preferência persistida em `localStorage` (`nexus.sidebar.collapsed`) entre visitas e recarregamentos.
- **Gaveta lateral no tablet e celular (abaixo de 821px)**: o mesmo botão abre a sidebar como drawer deslizante sobre um véu escurecido, com fechamento por clique fora, tecla Esc, toque em um item do menu e botão "✕ Fechar menu" dentro da própria gaveta (o botão do cabeçalho fica atrás dela); ao girar o tablet os dois modos nunca ficam abertos ao mesmo tempo.
- **Acessibilidade do botão**: `aria-label` dinâmico ("Recolher menu lateral" / "Expandir menu lateral" / "Abrir menu" / "Fechar menu"), `aria-expanded`, `aria-pressed`, `aria-controls="admin-sidebar"`, foco visível com contorno dourado, navegação por teclado preservada e transições desativadas em `prefers-reduced-motion`.
- **Prova automatizada da sidebar** (`tools/verify-sidebar.cjs`): 45 checagens cobrindo ausência do hambúrguer, posição e área de toque do botão, largura 264px → 78px, tooltip, navegação e persistência no modo trilha, escopo da gaveta (véu, Esc, clique fora, botão fechar), ausência de overflow horizontal e o tema claro — com `docs/screenshots/16-sidebar-desktop.png`, `16-sidebar-colapsada.png`, `16-sidebar-tablet.png`, `16-sidebar-celular.png` e `16-sidebar-tema-claro.png`.
- **Módulo CRM (backend)**: leads com contato, origem, valor estimado e estágio (Novo/Contatado/Proposta/Ganho/Perdido), pipeline agregado por estágio com contagem e soma de valor, busca por nome/e-mail, conversão automática em cliente ao marcar "Ganho" (sem duplicar se repetir) e bloqueio de transição repetida; RBAC `crm:read/write`, auditoria `lead.*` + `client.create`, migração `add_crm` e 6 testes de integração (suíte agora com 54).
- **Modal compartilhado `components/Modal.tsx`**: uma única anatomia para todos os diálogos do produto (Clients, Products, Sales, Purchases, Finance, Users) — cabeçalho com título/subtítulo e botão fechar, corpo rolável, rodapé com dica e ações; fecha por Esc, overlay ou botão, armadilha de foco, trava de scroll com pilha (Esc fecha apenas o modal do topo), tamanhos sm/md/lg/xl, variante `danger` e `zIndex` para modais empilhados.
- **Textos de interface centralizados (`lib/uiCopy.ts`)**: rótulos de ação, títulos de modal, dica de obrigatoriedade e mensagens de conclusão com concordância de gênero por entidade ("Compra registrada." / "Categoria excluída."); campos obrigatórios agora marcados com * nos formulários.
- **Guarda de alterações não salvas**: fechar um formulário sujo (Esc, overlay, X ou Cancelar) pergunta "Descartar alterações?" no SweetAlert2 — nunca confirm nativo — e a edição continua intacta se o usuário desistir (hook `useDirty`).
- **Prova automatizada do modal** (`tools/shoot-modal.cjs`): 26 checagens de anatomia, acessibilidade, foco, trava de scroll, tema claro/escuro e empilhamento, com `docs/screenshots/15-modal-cliente-dark.png`, `15-modal-cliente-light.png`, `15-modal-descarte.png` e `15-modal-fornecedores.png`.
- **Módulo Financeiro (backend)**: lançamentos de receita e despesa com valor, vencimento, status (Pendente/Pago/Cancelado) e vínculo opcional a cliente, fornecedor e categoria; categorias por tipo com unicidade (mesmo nome pode existir nos dois tipos), resumo mensal com receitas/despesas pagas, saldo, a receber/a pagar e atrasados, filtros por mês (AAAA-MM) e validação cruzada de categoria×tipo; RBAC `finance:read/write`, auditoria `finance.*`, migração `add_finance` e 5 testes de integração (suíte agora com 48).
- **Módulo Financeiro (frontend)**: página `/app/financeiro` com KPIs do mês (receitas, despesas, saldo, atrasados), filtros de tipo/status/mês/busca, ações Pagar/Reabrir/Cancelar com confirmação SweetAlert2, modal de lançamento com alternador Receita/Despesa que recarrega as categorias cabíveis e central de categorias — prova de uso real em `docs/screenshots/13-financeiro.png`.
- **Módulo Compras + Fornecedores (backend)**: fornecedores por empresa (nome único, exclusão lógica que preserva o histórico de compras), pedidos de compra com itens, totais calculados no servidor e status Rascunho/Recebida/Cancelada; receber dá entrada no estoque e atualiza o custo do produto, cancelar uma recebida estorna as unidades e é bloqueada se elas já foram consumidas; RBAC `supplier:read/write` e `purchase:read/write`, auditoria `supplier.*/purchase.*`, migração `add_suppliers_purchases` e 7 testes de integração (suíte agora com 43).
- **Módulo Compras + Fornecedores (frontend)**: página `/app/compras` com busca por fornecedor, filtro por status, ações Receber/Cancelar com confirmação SweetAlert2, modal de nova compra com itens dinâmicos (custo sugerido do produto e total ao vivo, opção de receber já dando entrada) e central de fornecedores com cadastro/edição/desativação — prova de uso real em `docs/screenshots/12-compras.png` e `12-fornecedores.png`.
- **Módulo Vendas (backend)**: pedidos com múltiplos itens, totais calculados no servidor (nunca confiando no cliente), status Pendente/Confirmada/Cancelada com transição vigiada, baixa de estoque na confirmação e estorno automático no cancelamento de venda confirmada, validação de cliente/produtos da mesma empresa, RBAC `sale:read/write`, auditoria `sale.create/confirmed/cancelled` e 6 testes de integração (suíte agora com 36).
- **Módulo Vendas (frontend)**: página `/app/vendas` com busca por cliente e filtro por status, tabela paginada com pílulas de situação, ações Confirmar/Cancelar com confirmação SweetAlert2, modal de novo pedido com itens dinâmicos (preço sugerido do produto, total ao vivo, aviso de estoque disponível e opção de confirmar já baixando o estoque) e modal de detalhe — prova de uso real em `docs/screenshots/11-vendas.png` e `11-vendas-detalhe.png`.
- **Módulo Produtos + Estoque (backend)**: categorias por empresa, produtos com SKU único, preços em Decimal, estoque mínimo e controle por item; movimentações de entrada/saída/ajuste transacionais (saída acima do saldo → 400), filtro de estoque baixo, resumo para KPIs, RBAC `product:read/write` em todos os papéis e trilha de auditoria completa. Migração `add_products_stock` e 7 testes de integração (suíte agora com 30).
- **Módulo Produtos + Estoque (frontend)**: página `/app/produtos` com KPIs (ativos / estoque baixo / sem estoque), tabela paginada com busca e filtro "somente estoque baixo", modais de produto, movimentação, histórico e categoria — prova de uso real em `docs/screenshots/10-produtos.png`.
- **Favicon oficial do projeto**: recorte do emblema hexagonal da logo gerado em alta qualidade (16/32/48px, apple-touch 180px, 512px maskable e `favicon.ico` multi-tamanho), declarado no `index.html` — script reprodutível em `tools/make-favicon.ps1`.
- **Regra definitiva de acesso**: administrador global (OWNER em todas as empresas, protegido contra remoção/rebaixamento no backend e no seed), com o endereço guardado em `CREDENCIAIS.md` na raiz do projeto — hoje lido de `SUPER_ADMIN_EMAIL`, nunca escrito no repositório.
- **Política de senha** aplicada em todo o sistema (mínimo 8 caracteres, uma maiúscula e um especial): `passwordPolicy.ts` no backend + validação inline pt-BR nos formulários.
- **Fluxos de autenticação completos**: cadastro self-service (cria usuário + empresa própria como OWNER e já autentica), esqueci a senha em duas etapas com código de recuperação (30 min, uso único, revoga sessões) e rotas `/cadastro` e `/recuperar-senha`.
- Telas de autenticação (Login, Criar conta, Recuperar senha) em estilo **Embossed/Neumorfismo** com tokens por tema, checkbox "Lembrar de mim" (salva apenas o e-mail), alternância suave entre telas, erros inline, botão ENTRAR com estado de carregamento e indicador animado de "Sucesso!" antes do redirecionamento.
- Botão **olho para mostrar/ocultar senha** (`PasswordInput`) reutilizado no login, cadastro, recuperação e modal de novo membro.
- Página de Clientes no frontend (tabela paginada, busca, modal criar/editar, desativar com confirmação, botões por permissão) — prova de uso real capturada em `docs/screenshots/07-clientes.png`.
- Refatoração UX/UI da tela de boas-vindas: componentes de responsabilidade única (`components/landing/*`), textos isolados em `copy.ts`, animação de entrada escalonada (stagger) com respeito a `prefers-reduced-motion` e tipografia fluida.
- Testes de integração dos fluxos (cadastro, duplicidade, senha fraca, recuperação, reuso de código, revogação de sessões): suíte agora com 23 testes.

### Segurança

- **A senha do administrador saiu do repositório**: ela estava escrita em 22 arquivos versionados — `CREDENCIAIS.md`, `README.md`, `apps/api/prisma/seed.ts` e os 19 scripts de prova em `tools/`. O valor real agora mora só no disco, em `tools/senha-admin.local.cjs` e no `apps/api/.env` (chave `SEED_ADMIN_PASSWORD`), ambos ignorados pelo git. As provas passaram a importar `tools/senha-admin.cjs`, que lê do ambiente ou do arquivo local e para com aviso claro quando nenhum dos dois existe, em vez de mandar credencial errada para a API no meio de uma verificação.
- **`CREDENCIAIS.md` continua no projeto, fora do versionamento**: a regra de acesso permanece no arquivo da raiz, no mesmo lugar e com o mesmo conteúdo; ele apenas deixou de ser rastreado pelo git para que o repositório possa ser público. O `README.md` diz onde procurar.
- **Seed sem senha no código**: `prisma/seed.ts` lê `SEED_ADMIN_PASSWORD` e falha cedo, com instrução legível, quando a chave não está definida; o `.env.example` documenta a chave.
- **Histórico reescrito antes do primeiro push**: os commits do projeto foram reescritos para que a senha não apareça em nenhum deles (backup do histórico original guardado fora do repositório). A conta de desenvolvimento `admin@nexus.local`, de senha fraca e uso exclusivamente local, continua documentada no seed e no README.

### Documentação

- **A galeria do README virou seis telas**: por decisão do dono, o quadro de cima encolheu de treze pares para três — vitrine, entrada, painel, vendas, financeiro e o editor que monta a vitrine, que é o caminho mais curto que um estranho percorre sem rolar catálogo. As demais capturas continuam em `docs/screenshots/` com a origem declarada (provas 19 a 23, agenda e abas em 1440×960, celular em 390×844) e a seção "Telas" diz isso num parágrafo só.
- **`docs/AUDITORIA.md` (Fase 0 da preparação comercial)**: auditoria do código real antes de qualquer correção — os 63 arquivos TS da API (249 operações Prisma), as 16 rotas de módulo, o schema, o seed, a suíte, o frontend e a raiz. Quatro achados CRÍTICOS (ADMIN criando OWNER, ADMIN rebaixando OWNER, varredura cross-tenant e corrida de baixa de estoque), 14 ALTOS, 12 MÉDIOS e 12 BAIXOS, cada um com arquivo e linha; e uma seção que confere, ponto a ponto, quais premissas do prompt externo de auditoria não valem para este repositório. Nenhuma linha de código foi alterada na Fase 0.
- **README reescrito como ficha do produto**: a página de topo segue a estrutura de referência de mercado — marca com o logo oficial, selos de status e o parágrafo de estágio; série de telas reais em **1440×900**, duas por linha e cada imagem linkada no tamanho capturado (as seis da fundação mais as seis operacionais, com a nota honesta de que as capturas da Agenda e das abas saíram em 1440×960 porque calendário e barra de abas não cabem em 900px); "Sobre o projeto" com o problema, o público e o que a plataforma entrega; "Funcionalidades no ar" módulo por módulo dizendo a regra como ela vale no servidor; tabela de **Módulos** com ✅/🚧 separando o que tem tela do que só tem tabela; tecnologias (com a nota de que `jquery` e `sweetalert2` seguem declarados sem uso no `src`); estrutura de pastas; diagrama de arquitetura com a regra de dependência ao contrário proibida; banco (27 modelos, 15 enums, 11 migrations e as unicidades por empresa); instalação, configuração, segurança, testes, demonstração, roadmap e histórico por trilha de commits.
- **Números conferidos e nada inventado**: o README antigo afirmava 19 testes de integração (a suíte está em **13 arquivos e 70 testes**, verificados nesta rodada) e listava Clientes, Produtos, Vendas, Compras, Financeiro, CRM e Agenda como entregas futuras, quando os sete já estão no ar com tela e rota. As tabelas criadas sem módulo (CMS, documentos legais, modelos de e-mail, rotinas agendadas e gateways) aparecem como "tabela criada, tela e rota por fazer"; Ordens de Serviço, planos SaaS e backup aparecem como 🚧 sem tabela. Nenhuma integração de pagamento, envio de e-mail ou credencial de terceiro é afirmada, e as contagens de rotas por módulo (84 rotas em 14 módulos) saíram do código, não de estimativa.
- **A história da credencial entrou na documentação**: a seção "Contas e acesso" descreve o administrador global com `OWNER` em todas as empresas, a senha vivendo só no `CREDENCIAIS.md` local e em `SEED_ADMIN_PASSWORD`, a conta de desenvolvimento usada pela suíte e a regra de senha do projeto — sem reproduzir segredo nenhum.

### Alterado

- **O sino continua tocando com o site em manutenção**: `apps/api/src/plugins/maintenance.ts` liberou `/api/notifications` na allowlist do caminho de volta. Com o sino no cabeçalho de toda tela do painel, fechar a caixa de avisos não pausa operação nenhuma — só trocava uma consulta de fundo por erro 503 na tela de quem entrou ali justamente para desligar o modo, e foi assim que a prova do editor passou a ver dois erros de console. A rota continua pedindo token de sessão (sem ele, 401), e as duas respostas estão asertadas em `apps/api/test/cms.test.ts`.

- **Rolagem e largura das tabelas longas**: as listagens de histórico (CRM Atividades, Auditoria Logs/Sensíveis) e as telas de Permissões (RBAC) e Sessões usam `nx-scroll` (altura máxima 600px com cabeçalho fixo), as colunas `col-acao`/`col-quando` têm largura mínima dedicada e o rodapé de paginação do Dashboard deixou de usar `margin` inline, uniformizando o vão entre blocos em 24px.

- **Botão "Ocultar nomes" removido do rodapé da sidebar**: o modo trilha continua acionado pelo botão do cabeçalho (e pelo teclado), agora sem um segundo controle repetido no menu; o rodapé vazio e o CSS `.admin-rail-hint`/`.admin-sidebar-foot` saíram junto, e a prova da sidebar (`tools/verify-sidebar.cjs`) segue em 45/45.

- KPIs do funil agora concordam em número ("1 lead aguardando" / "3 leads aguardando") e os campos do modal de lead ganharam `label` associado ao campo, como no restante do sistema.
- Total de venda/compra passou a viver no rodapé do modal (dica à esquerda, ações à direita) em vez de uma linha solta no corpo; o cadastro de fornecedor é renderizado fora do painel da lista para o overlay filho continuar ancorado no viewport.
- Campos de formulario dos modais ganharam espaçamento inferior reduzido no último item e o rodapé dos modais usa a superfície `--surface-2` com borda superior, igual aos cabeçalhos.
- Marca na sidebar administrativa agora exibe o nome completo "Nexus Business Manager" em uma linha, com o degradê cobre-ouro da landing.
- **Regra de logout**: ao sair do sistema o usuário volta automaticamente para a página de boas-vindas (`/`), com histórico substituído para o botão voltar não reabrir o painel (prova em `tools/verify-logout.cjs`).
- Cartões de autenticação padronizados no mesmo tamanho (largura, tipografia e botões) para coerência entre login, cadastro e recuperação.
- Logo das telas de autenticação ampliada 16% (62px → 72px) nas três páginas, mantendo a harmonia visual.
- **Regra de privacidade do "Lembrar de mim"**: o e-mail fica gravado no navegador para facilitar o acesso, mas nunca é exibido no campo — ele volta vazio com placeholder genérico e uma dica discreta; ao entrar apenas com a senha, o e-mail lembrado é usado em silêncio (prova automatizada em `tools/verify-remember.cjs`).
- Alternador de tema perfeitamente centrado no cabeçalho (thumb simétrico no trilho, ícones sol/lua alinhados ao centro vertical), sem alterar cores, tamanho ou animação.

### Corrigido

- **Variáveis `--text-2` e `--text-3` nunca foram definidas**: mais de 20 regras (rótulos de campo, subtítulos, KPIs, rodapé de modal) caíam em `currentColor` e perdiam a hierarquia de contraste; `tokens.css` agora expõe os aliases a partir de `--text-muted`/`--text-faint` nos dois temas.
- **CSS morto do modal antigo**: bloco `.nx-dialog*` removido de `components.css` após a migração de todas as páginas para `components/Modal.tsx`.- **Modal de cliente com campos opcionais vazios**: ao cadastrar sem e-mail o envio levava `email: ""` e a API rejeitava com "E-mail inválido"; agora campos em branco viram `undefined` no payload (criação e edição).
- **Nomes dos itens no detalhe da venda**: a listagem trazia os itens sem o produto associado e o modal de detalhe exibia "Produto removido"; o `include` do Prisma passou a carregar o nome do produto (asserção de regressão na suíte de vendas).
- **Responsividade geral (público + administrativo)**: guarda global `overflow-x: clip` impede a página de arrastar na horizontal sem quebrar o cabeçalho sticky; sidebar off-canvas fechada agora usa `visibility: hidden` (fora do alcance do toque/foco no celular); grades de KPIs e features fluidas com `minmax(min(…, 100%), 1fr)`; textos mono longos (e-mails/SKUs) quebram dentro da célula; alturas com `100dvh` respeitam as barras do navegador mobile. Prova: `tools/verify-responsive.cjs` (7 larguras × 8 rotas sem overflow).
- **Configurações no celular**: cards agora fluem em grade responsiva (1 coluna no celular, 2+ no desktop) com espaçamento interno reduzido em telas pequenas, botões de tema e "Selecionar" em largura total.
- Colisão de nomenclatura com o Bootstrap/AdminLTE: o modal próprio foi renomeado para `nx-dialog` (antes herdava `display:none` do framework e não abria) e as tabelas neutralizam as variáveis `--bs-table-*` (cabeçalho branco no tema escuro).

### Alterado
- Texto de marca ("Nexus Business Manager" / "NEXUS") agora usa o degradê cobre-ouro extraído da logo, aplicado globalmente (`.brand-text`, landing e sidebar).
- Cabeçalhos e rodapés do projeto ficaram mais baixos (landing, admin, login) e o switch de tema ganhou tamanho compacto.
- Animação "batida de coração" na logo da boas-vindas e do login, lenta e suave (5,2s, escala máxima 1,035, com respeito a `prefers-reduced-motion`); logo da landing ampliada para 210px.
- Botão "Voltar" redesenhado como pill moderno com seta em círculo (login e páginas de erro) e página de login centralizada verticalmente.
- Página pública: herói agora é 100% marca — botões "Acessar o sistema" e "Conhecer recursos" removidos; o acesso ao sistema permanece no botão "Acessar" do topo.
- Alternador de tema redesenhado como switch moderno (trilho em pílula, ícones sol/lua e thumb em degradê cobre que desliza), com `role=switch`, `aria-checked` e respeito a `prefers-reduced-motion`.

### Adicionado
- Fundação vertical completa do frontend: AdminShell (sidebar, header, footer), Landing pública com "Acessar", Login real com JWT, Dashboard com KPIs vindos da API, Usuários (busca, papel editável, modal de novo membro), Auditoria, Configurações (tema, conta, troca de empresa) e páginas de erro 401/403/404/500 com identidade da marca.
- Design system Premium Gourmet em `apps/web/src/styles/` (tokens de tema, global, componentes) com alternância dark ("noite sofisticada") / light ("dia elegante") persistida e sem preto/branco puros.
- Paginações globais servidor-cliente (`{data, meta}`), estados de carregamento/vazio/erro padronizados, Toastr centralizado e confirmações via SweetAlert2 (nenhum `alert/confirm` nativo).
- Capturas reais das 6 telas em `docs/screenshots/` e README com imagens do sistema em execução.
- Favicon derivado da logo oficial (`apps/web/public/favicon.png`).

### Corrigido
- `components.css` reescrito para casar exatamente com as classes dos componentes (divergência de nomenclatura detectada em inspeção visual das telas).
- Removida opção `fade` inexistente na configuração do Toastr e import não utilizado no AdminShell.

### Fase 1 (análise e fundação do backend)
- Análise real do repositório/bancos de referência (`docs/ANALISE.md`) — confirmado que não há legado recuperável.
- Paleta oficial extraída da logo (`docs/design/palette.md`).
- ADRs 0001–0003 (persistência Prisma, multiempresa/RBAC, frontend AdminLTE 4 + design system).
- Fundação do backend (Fastify 5 + TS + Prisma + auth + RBAC + multiempresa + auditoria), com 14 testes de integração contra MySQL real.
