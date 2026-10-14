# ADR-0018 — A produção em container tem uma porta só, e o banco não atende fora de casa

- Status: Aceita (2026-10-14)
- Contexto: primeiro item da T5 (F6) do prompt de continuação — "Dockerfile + docker-compose com a
  porta 3306 fechada", escrito assim desde `docs/PRODUCAO.md:100`, que registrou a dívida e o lugar
  onde ela seria paga. Até esta rodada a casa só tinha topologia de desenvolvimento: `npm run dev`
  (produto, 3001/5173) e `npm run dev:prova` (prova, 3002/5174, decidida na T5.0). Nenhum dos dois
  descreve uma instalação: nos dois casos o MySQL escuta no 3306 da máquina — que nesta máquina é o
  3306 do WAMP, medido com `netstat` antes de qualquer mudança — e a API é a própria dona da porta
  que o navegador abre. Uma instalação de produto quer outra coisa: um banco que ninguém de fora
  alcança, um processo de API que não precisa ser dono de porta nenhuma, e um painel servido por um
  servidor estático que faz o proxy de `/api` com a mesma origem. Não havia também como medir o
  efeito real do `NODE_ENV=production`: a régua A9 (`apps/api/src/config/producao.ts`) existe desde a
  Fase 2 e é testada como função pura, mas nunca tinha rodado contra um processo de verdade, subindo
  contra um MySQL de verdade.
- Decisão:
  1. **Quatro serviços, uma porta publicada.** `docker-compose.yml` define `mysql` (imagem oficial
     `mysql:8.4`), `migracoes` (o trabalho de uma viagem que monta o banco), `api` (`Dockerfile.api`)
     e `web` (`Dockerfile.web`). Só o `web` tem seção `ports`, e o padrão é `8080:80` (`PAINEL_PORT`
     no `.env`): o 80 não dá nesta máquina, porque o Apache do WAMP escuta nele hoje. `mysql`, `api`
     e `migracoes` não publicam porta nenhuma — a API só é alcançada pelo nginx, que faz
     `proxy_pass http://api:3001` dentro da rede interna do compose. Prova medida depois de a pilha
     nascer: `docker port` devolve vazio para os três e `80/tcp -> 0.0.0.0:8080` para o painel;
     `netstat` mostra um único `0.0.0.0:3306` na máquina, com o mesmo PID de antes da pilha subir
     (4296, o do WAMP), e as portas do dono (3001 → PID 18816, 5173 → PID 18972) intocadas. O achado
     N65 (T5.0) tinha resolvido "a prova não pisa a porta do produto"; aqui a regra se estende: a
     régua nova (`tools/verify-docker.cjs`) confere que a única porta publicada não calça 5173, 3001,
     5174 nem 3002, lendo esses números do helper `tools/pilha-de-prova.cjs` em vez de escrevê-los à
     mão.
  2. **O banco não tem porta, tem rede interna.** Sem `ports:` no serviço `mysql`, o 3306 do container
     não existe para o host: nem navegador, nem script, nem scanner. A única trilha até os dados passa
     pela API, que tem autenticação, RBAC, isolamento por empresa e auditoria. O volume nomeado
     `nexus-mysql` guarda os dados fora do ciclo de vida do container, e o roteiro de backup da
     seção 45 do prompt é exatamente sobre ele.
  3. **Segredo não tem valor no repositório — nem default no compose.** Toda credencial do compose vem
     por `${VAR:?defina VAR no .env da maquina}`, então `docker compose config` **recusa** com o nome da
     variável ausente em vez de inventar valor: medido vermelho antes do verde, com a pilha ainda sem
     `.env` preenchido (`error while interpolating services.mysql.environment.MYSQL_PASSWORD: required
     variable MYSQL_PASSWORD is missing a value: defina MYSQL_PASSWORD no .env da maquina`). O modelo
     `.env.docker.example` (rastreado) ensina o formato e não configura nada; o `.env` preenchado fica
     na máquina e cai no `.gitignore:12`, conferido com `git check-ignore -v`. A ferramenta de prova não
     imprime ambiente resolvido — o JSON do `compose config` contém valores, então ela só ecoa nomes de
     serviço, chaves e números de porta.
  4. **A régua A9 é a porta de entrada da pilha, não um texto de documentação.** `NODE_ENV` default do
     compose é `production`, e o serviço `api` exige `CORS_ORIGIN`, `SUPER_ADMIN_EMAIL`,
     `TOTP_ENCRYPTION_KEY`, `SMTP_HOST`, `MAIL_FROM` e `WEB_BASE_URL` com https, porque é isso que a
     produção cobra ao nascer. Provado dos dois lados dentro do container: forçando quatro valores de
     exemplo pelo lado de fora (`CORS_ORIGIN` local, `SUPER_ADMIN_EMAIL` e `SMTP_HOST` vazios,
     `WEB_BASE_URL` em http), o processo morre em `apps/api/dist/src/config/env.js:85` com
     `Configuração de produção inválida — CORS_ORIGIN aponta para "http://localhost:8080" — endereço de
     máquina local não serve para produção; SUPER_ADMIN_EMAIL não está definido — …; SMTP_HOST não está
     definido — …; WEB_BASE_URL precisa começar com https:// em produção — o link do e-mail atravessa a
     internet`, sem imprimir nenhum valor de segredo; com a configuração da máquina a régua passa, o
     healthcheck verde chega e a trilha painel → nginx → API → MySQL responde `db: up`.
  5. **O banco nasce por trabalho próprio, porque a cadeia de migrations não reconstitui um MySQL
     zerado (N54).** O serviço `migracoes` roda `deploy/preparar-banco-de-dados.cjs`, que tenta
     `prisma migrate deploy` primeiro. Num banco zerado isso falha na migration
     `20261010164015_add_clients` com `P3018 / Database error code: 1826 / Duplicate foreign key
     constraint name 'company_users_user_id_fkey'` — o mesmo achado que a T1 encontrou no banco de
     prova, e o conserto é o mesmo que a casa já usa: montar pela estrutura atual do schema
     (`prisma db push --skip-generate`) e marcar o histórico migration por migration
     (`migrate resolve --applied`). A diferença é a guarda: o baseline **só roda em banco sem linha de
     ninguém**, conferido por `SELECT COUNT(*)` exato tabela por tabela (`information_schema.table_rows`
     é estimativa do InnoDB e serviria para enganar). Medido numa subida do zero:
     `21 marcada(s) nova(s) + 1 ja no historico = 22 migrations`, e `prisma migrate status` dentro do
     container devolve `Database schema is up to date!`. Nenhuma migration aplicada foi editada — o
     contrato proíbe, e o achado continua achado até a F8 decidir o que fazer com a cadeia.
  6. **A dependência entre eles é de saúde, não de ordem de escrita.** `migracoes` só entra depois de
     o MySQL passar no healthcheck (`service_healthy`), e a API só sobe depois de o trabalho terminar
     (`service_completed_successfully`). Isso veio de uma falha medida: sem tabela nenhuma, o
     `/api/health` devolve 500 porque o plugin de manutenção consulta a vitrine em cada request
     (`landing_configs` does not exist, no `Table not found`), a API fica `unhealthy`, e o painel nunca
     nasce com `dependency failed to start`. Por isso o healthcheck da imagem é de **processo** (pergunta
     ao `/api/health` só para saber que o servidor respondeu), e a frase `db: up` continua sendo
     checagem da ferramenta de topologia, não do Docker.
  7. **A imagem da API leva a própria linha de deploy.** O estágio final copia o `node_modules` do
     build completo (com `prisma` e `tsx`, que são devDependencies do workspace), porque os três comandos
     que um deploy precisa ter em mão — `prisma migrate deploy`, a semente e `npm run admin:criar` —
     vivem nessa imagem. Uma imagem de runtime "limpa" sem o CLI exigiria um segundo container só para
     aplicar migration, e aí a topologia descrita em `docs/PRODUCAO.md` deixaria de ser a topologia
     executada. O peso é medido em `docker images`, não alegado: **969 MB** com o `npm ci` da árvore
     inteira do monorepo contra **915 MB** com o install restrito ao workspace `@nexus/api` (mais o
     `openssl` que a etapa final precisa). A imagem oficial `mysql:8.4` é 1,12 GB e não é construída
     aqui.
  8. **A imagem do painel é nginx com o `dist` dentro.** O estágio de compilação roda o mesmo
     `npm run build --workspace @nexus/web` da casa (os 37 pedaços do D8/T4.8); a etapa servida é
     `nginx:1.27-alpine` com `deploy/nginx-painel.conf`: fallback de SPA em `try_files`, `index.html` com
     `no-store`, `/assets/` imutável por hash, gzip, os três cabeçalhos de segurança que o helmet já põe
     nas respostas da API, e `client_max_body_size 1m` amarrado ao `BODY_LIMIT_BYTES` da API — se o nginx
     deixar passar 20 MB e a API recusar em 1 MB, o cliente recebe a recusa mais tarde e pior explicada.
     Peso medido: **76,7 MB**.
  9. **N67: o caminho de entrada do build da API estava errado no manifesto.** Descoberto ao escrever o
     `CMD` do container: `tsconfig.json` da API tem `rootDir: "."` e inclui `src`, `prisma/seed.ts` e
     `test`, então o `tsc` produz `apps/api/dist/src/server.js`, e o `dist/server.js` apontado por
     `main`/`start` nunca existiu. Medido antes do conserto: `node apps/api/dist/server.js` devolve
     `MODULE_NOT_FOUND`, e o item 5 da seção 2 de `docs/PRODUCAO.md` mandava rodar exatamente esse
     comando. `main` e `start` passaram a apontar para `dist/src/server.js`, que é o caminho que o
     container roda.
- Consequências:
  - A pilha Docker passou a ser a maneira de ver a produção inteira funcionando numa máquina só, sem
    abrir porta de banco. Subida medida do zero (`docker compose down -v` e depois `up -d --build`, com
    as imagens já no cache): **132 s** até o painel nascer saudável, sendo ~65 s de preparação de
    contexto/containers, o MySQL saudável 16 s depois, o trabalho de migrations por **42 s**, e a API
    saudável seis segundos depois de o trabalho sair; a cadeia `mysql → migracoes → api → web` em si
    levou **70 s**. O banco dessa pilha não é o de desenvolvimento nem o de prova: medido antes de a
    rodada recriar o volume, ele tinha 34 tabelas e **1 linha** — a `landing_configs` que o plugin de
    manutenção cria sozinho no primeiro request, e que a healthcheck do próprio compose disparou.
  - `docs/PRODUCAO.md` deixa de ter uma seção "o que ainda não está aqui" para Docker e ganha o roteiro
    real: `.env` a partir do exemplo, `npm run docker:subir`, `npm run docker:migrar`,
    `npm run docker:admin` e `npm run docker:provar`.
  - A régua de topologia virou ferramenta permanente: `node tools/verify-docker.cjs` (parte A estática,
    parte B com a pilha de pé; sem pilha a ferramenta encerra com `NAO VERIFICADO` e o comando que
    falta, em vez de fechar verde pela metade). Verde medido nesta rodada: **29 verificações, 0 falhas**
    (19 na metade estática, 10 na metade de execução), com código de saída **0**. Ela entrou na varredura
    da T5.0, que agora mede **35** ferramentas sob a régua.
  - O conserto do encerramento dessa ferramenta é o achado N68: com `fetch` nativo, o undici deixava um
    socket vivo no `process.exit()` e o Node do Windows abortava **depois** de a régua imprimir
    "0 falhas", com código 127. Uma ferramenta que mede verde e devolve vermelho é pior que uma
    ferramenta vermelha, porque o portão não sabe em quem acreditar. A função de leitura passou a
    `node:http` com `agent: false`, e a saída 0 foi conferida duas vezes.
  - Ficou de fora, declarado: **TLS** — o compose termina em nginx em texto puro na porta 8080, porque
    certificado é decisão do ambiente (G5) e a régua A9 já recusa `WEB_BASE_URL` que não seja https, o
    que empurra o certificado para o proxy real de quem instala; **healthcheck do painel não prova a
    API** (só o `/`), e a trilha completa é conferida pela ferramenta; **a suíte e as provas de navegador
    continuam onde a D6 manda**, e nada desta tarefa escreve em `nexusbusinessmanager` nem em
    `nexusbusinessmanager_teste`; **backup** é a próxima tarefa da F6 (seção 45 do prompt) e é sobre o
    volume `nexus-mysql`.
