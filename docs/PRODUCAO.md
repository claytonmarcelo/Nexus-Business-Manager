# Produção — como uma instalação deste produto nasce

Este arquivo é o caminho de subida de uma instalação real do Nexus Business Manager. A F1.4 escreveu a
primeira metade — a parte que decide quem manda na plataforma — e a F6 (T5.1, T5.2 e T5.3, 2026-10-14) escreveu o resto
no mesmo lugar: a pilha Docker, a porta do banco fechada, o backup com restauração testada, a fila de entrega
de e-mail e o que foi medido nelas. O que está aqui foi
executado nesta máquina com Docker 29.6.2 e MySQL 8.4 em container; nada é promessa de comportamento que o
repositório ainda não tenha. O que ainda não existe está declarado no fim do arquivo, com a tarefa que o
traz.

## 1. Antes de qualquer comando

A subida tem duas trilhas, e as duas passam pela mesma régua: `NODE_ENV=production` liga a validação de
ambiente de produção (`apps/api/src/config/producao.ts`, aplicada na importação de `src/config/env.ts`), que
derruba o processo com a lista inteira de problemas na mensagem e sem imprimir nenhum valor. O código da
régua é puro e testado em `apps/api/test/validador-de-producao.test.ts`; o que ele cobra:

| Variável | Por quê |
|---|---|
| `NODE_ENV=production` | liga a régua extra de produção |
| `DATABASE_URL` | usuário próprio da aplicação, senha obrigatória; a subida morre com `root` sem senha |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | distintos entre si, 32 caracteres ou mais, sem `troque`/`change`/`secret`/`exemplo` |
| `CORS_ORIGIN` | endereço público do painel; `localhost`, `127.0.0.1` e coringa derrubam a subida |
| `SUPER_ADMIN_EMAIL` | endereço do administrador da plataforma; ausente em produção, nada sobe |
| `AUTH_EXPOSE_RESET_TOKEN=0` | com `1` em produção a API recusa subir |
| `TRUST_PROXY` | `0` sem proxy; `1`..`31` declarando os saltos, ou o IP da auditoria é o do proxy |
| `SMTP_HOST` / `SMTP_PORT` / `MAIL_FROM` | sem servidor de saída a produção não envia verificação, recuperação nem aviso de segundo fator |
| `REQUIRE_EMAIL_VERIFICATION=1` | em produção o cadastro não entra no painel sem clicar no link |
| `TOTP_ENCRYPTION_KEY` | 64 caracteres hexadecimais, no mínimo 8 distintos; sem ela o segundo fator não tem onde cifrar o segredo |
| `WEB_BASE_URL` | https e não local — é o endereço que aparece nos links enviados por e-mail |

As quatro chaves da fila de entrega (`MAIL_TENTATIVAS`, `MAIL_BACKOFF_BASE_MS`, `MAIL_TIMEOUT_MS`,
`MAIL_FILA_MAXIMA`) **não** estão nessa tabela de propósito: elas têm padrão no código, a régua de produção não
cobra nenhuma delas, e uma instalação que não as declara entrega com três tentativas, recuo de meio segundo,
teto de 15 segundos por tentativa e 200 mensagens na espera. A seção 10 diz o que cada uma muda.

Onde cada trilha lê essas chaves:

- **Pilha Docker** — `.env` na raiz do repositório, criado a partir de `.env.docker.example`. As chaves do
  banco (`MYSQL_DATABASE` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_ROOT_PASSWORD`), as do painel
  (`PAINEL_PORT`, `NEXUS_NODE_ENV`) e todas as da tabela acima são obrigatórias no `docker-compose.yml` por
  `${VAR:?defina VAR no .env da maquina}`: falta uma e o Docker **recusa** antes de criar container, citando
  o nome da variável — nunca um valor. É a razão de não existir credencial nenhuma com default no compose.
- **Trilha na máquina** — `apps/api/.env` (arquivo da máquina, jamais do repositório).

Nas duas, `.env` e `CREDENCIAIS.md` estão no `.gitignore` (linha 12 e linha 45, conferido com
`git check-ignore -v`), e o `.dockerignore` mantém os dois fora do contexto de build — um segredo copiado para
o `.env` não entra na imagem nem no histórico. O `.env.docker.example` fica rastreado de propósito: ele é o
modelo, e modelo não tem valor.

## 2. Subida A — a pilha Docker (a trilha medida nesta rodada)

```bash
cp .env.docker.example .env        # preencher na máquina; nenhum valor existe no repositório
npm run docker:subir               # docker compose up -d --build
npm run docker:provar              # tools/verify-docker.cjs — 29 verificações
npm run docker:logs                # as últimas 40 linhas da API
npm run docker:descer              # para a pilha; o volume nexus-mysql permanece
```

O que a pilha é, e o que ela não é:

| Serviço | O que faz | Porta no host |
|---|---|---|
| `mysql` | MySQL 8.4 oficial, volume nomeado `nexus-mysql`, healthcheck por `mysqladmin ping` | **nenhuma** |
| `migracoes` | trabalho de uma viagem: monta o banco e marca o histórico (`deploy/preparar-banco-de-dados.cjs`) | nenhuma |
| `api` | Fastify do `Dockerfile.api`, `USER node`, healthcheck próprio | **nenhuma** |
| `web` | `nginx:1.27-alpine` servindo o `dist` do painel e fazendo proxy de `/api` | **a única: `8080:80`** |

A regra da topologia é o motivo desta seção existir: **quem instala o produto expõe uma porta, e não é a do
banco**. O 3306 do container não existe para o host — a única trilha até os dados passa pela API, que tem
autenticação, RBAC, isolamento por empresa e auditoria na frente. Medido com a pilha de pé:

- `docker port` do `mysql`, da `api` e do `migracoes` devolve vazio; o do `web` devolve
  `80/tcp -> 0.0.0.0:8080`.
- `netstat -ano` na máquina mostra um único `0.0.0.0:3306`, com o PID de sempre (o MySQL do WAMP, que a
  subida da pilha não tocou), e as portas do desenvolvimento (`3001`, `5173`) com os mesmos PIDs de antes.
- O painel em `http://localhost:8080/` responde o HTML do build, e `http://localhost:8080/api/health`
  atravessa o nginx, a API e o MySQL da rede interna e devolve `status: ok` com `db: up`. Essa trilha
  inteira é a última verificação da parte B da régua.

Por que `8080` e não `80`: nesta máquina o Apache do WAMP escuta no 80. É decisão de ambiente, por isso está
no `.env` (`PAINEL_PORT`), e não no compose. TLS também é de ambiente — o nginx aqui termina em texto puro, e
a régua de produção já recusa um `WEB_BASE_URL` que não seja https, o que empurra o certificado para o proxy
real de quem hospeda (`docs/decisoes/G5-hospedagem-e-backup.md`).

Números medidos nesta máquina, numa subida do zero (`docker compose down -v` e depois `up -d --build`, com as
imagens já no cache): **132 s** até o painel nascer saudável — ~65 s de preparação de contexto e criação dos
containers, MySQL saudável 16 s depois, o trabalho de migrations por **42 s**, e a API saudável seis segundos
depois que ele saiu. A cadeia `mysql → migracoes → api → web` levou **70 s**. Tamanhos em `docker images`:
**915 MB** a imagem da API (contra 969 MB com o `npm ci` da árvore inteira do monorepo), **76,7 MB** a imagem
do painel, 1,12 GB a imagem oficial do MySQL. A decisão de topologia e os motivos estão em
`docs/adr/0018-producao-em-container-com-uma-porta.md`.

### O que a régua confere, e o que ela se recusa a fingir

`npm run docker:provar` tem duas metades. A **A** é estática e roda em qualquer máquina com o Docker CLI: lê o
que o próprio `docker compose config --format json` declara (nunca o arquivo YAML a olho), e exige que o
`mysql` e a `api` não publiquem porta, que o painel publique exatamente uma, que ela não calçe as portas da
casa nem a do host, que a imagem rode sem privilégio, que o `.dockerignore` deixe `node_modules`, `dist`,
`.env`, `CREDENCIAIS.md`, `docs` e `tools` fora do build, e que o nginx tenha o proxy, o limite de corpo e o
fallback de SPA. A **B** pergunta ao Docker o que foi publicado de verdade e bate no painel pela porta
publicada. **Sem a pilha de pé a ferramenta não fecha verde pela metade**: imprime `NAO VERIFICADO`, diz o
comando que falta e sai com código 2. Verde medido nesta rodada: 29 verificações, 0 falhas, código 0. A
ferramenta imprime nomes de serviço, chaves e números de porta — nunca um valor de ambiente.

## 3. Subida B — na máquina, sem Docker

É a trilha de quem hospeda por conta própria (e a que o `docs/ESTADO-ATUAL.md` descreve para desenvolvimento,
com `npm run dev`). Vale para o MySQL do WAMP quanto para um MySQL gerenciado:

```bash
npm install
npm run prisma:generate -w @nexus/api     # sem isto, nada compila
npm run prisma:deploy -w @nexus/api       # aplica as migrations, sem prompt
npm run admin:criar -w @nexus/api         # o administrador da plataforma (seção 5)
npm run build                             # apps/api/dist + apps/web/dist
npm run start --workspace @nexus/api      # NODE_ENV=production
```

O `admin:criar` vem **depois** de `prisma:deploy` e **antes** de servir a primeira requisição: sem o
administrador da plataforma não há quem configure SMTP, rotinas ou a vitrine pelo painel. O último comando é
`node dist/src/server.js` dentro do workspace: até a T5.1 o manifesto apontava `dist/server.js`, caminho que
o `tsc` nunca produziu (`tsconfig.json` tem `rootDir: "."` e inclui `src`, `prisma/seed.ts` e `test`) — achado
N67, medido como `MODULE_NOT_FOUND` antes do conserto e registrado em `docs/AUDITORIA.md`.

## 4. O trabalho de migrations (`migracoes`)

`npm run docker:migrar` existe para o dia a dia de uma instalação que já subiu: roda
`prisma migrate deploy` dentro da imagem, que aplica o que estiver pendente e devolve "no pending migrations"
quando não está.

A primeira subida de um banco **zerado**, porém, não passa por `migrate deploy`, e isso é achado registrado
(N54, aberto na T1): as migrations `20261010164015` em diante redeclaram as chaves
`company_users_user_id_fkey` e `company_users_company_id_fkey`, e no MySQL um nome de chave vale para o banco
inteiro — a cadeia para com `P3018 / Database error code: 1826 / Duplicate foreign key constraint name`. Por
isso o serviço `migracoes` existe, e por isso a API só nasce depois de ele terminar
(`service_completed_successfully`): sem tabela nenhuma o `/api/health` devolve 500 — o plugin de manutenção
consulta a vitrine a cada request e a tabela `landing_configs` ainda não está lá — a API ficaria `unhealthy` e
o painel nunca subira.

O trabalho tenta `migrate deploy` primeiro; se falhar, monta pela estrutura atual do schema
(`prisma db push --skip-generate`) e marca o histórico migration por migration
(`prisma migrate resolve --applied`). **E só faz isso num banco sem linha de ninguém**: a contagem é feita com
`SELECT COUNT(*)` exato, tabela por tabela (`information_schema.table_rows` é estimativa do InnoDB), e qualquer
linha encontrada derruba o trabalho com código 1 antes de escrever seja o que for. Uma casa com dados dentro
jamais é recriada por um baseline. O que `P3008` (`ja esta no historico`) provoca na contabilidade é somado
como já marcado, não como erro: medido numa subida do zero, `21 marcada(s) nova(s) + 1 ja no historico = 22
migrations`, e `prisma migrate status` dentro do container devolve `Database schema is up to date!`.

Nenhuma migration aplicada foi reescrita para isso — o contrato proíbe, e a cadeia continua com o N54 aberto
até a F8 decidir o que fazer dela (o `postinstall` do Prisma e o portão de clone limpo estão na mesma tarefa).

## 5. O bootstrap do administrador (`npm run admin:criar`)

Em produção o administrador da plataforma **não** vem do seed. A F1.3 tirou da semente o direito de criar
conta de desenvolvimento e empresa de demonstração num banco de cliente; a F1.4 fecha o caminho contrário com
`apps/api/prisma/administrador-da-plataforma.ts`.

```bash
SUPER_ADMIN_EMAIL=nome@dominio.do.cliente \
ADMIN_CRIAR_SENHA='a senha forte escolhida por quem instala' \
npm run admin:criar -w @nexus/api
```

Na pilha Docker o mesmo comando atravessa o container, com o endereço já vindo do `.env`:

```bash
ADMIN_CRIAR_SENHA='a senha forte' npm run docker:admin
```

As chaves são do ambiente de quem instala. Não existe valor padrão de senha em arquivo nenhum, e o console
imprime só o que aconteceu — endereço, nome, ação, se a senha foi definida agora ou preservada, e quantas
empresas ficaram com `OWNER`. Hash, token e senha nunca aparecem. Medido dentro do container da pilha, sem a
chave de senha: código de saída **1** e `Bootstrap recusado — ADMIN_CRIAR_SENHA não está definida — sem ela
nenhuma conta é criada`, sem nenhuma consulta escrita.

A régua da senha é a regra definitiva de acesso do projeto, aplicada pela mesma função que vale para toda
senha do sistema (`src/lib/passwordPolicy.ts`): mínimo 8 caracteres, uma letra maiúscula, um caractere
especial, máximo 128. Uma senha fora disso derruba o script com o motivo, e o placeholder do
`apps/api/.env.example` é fraco de propósito — copiar a linha de exemplo nunca instala conta.

### O que cada estado do banco provoca

| Situação | Sem consentimento | Com consentimento escrito |
|---|---|---|
| Nenhuma conta com esse endereço | cria como `SUPER_ADMIN` com a senha do ambiente | — |
| Já é `SUPER_ADMIN`, ativa | confirma o papel e **preserva a senha** | `ADMIN_CRIAR_RENOVAR_SENHA=1` reescreve a senha |
| É conta comum (cliente) | **recusa** — nada é escrito | `ADMIN_CRIAR_PROMOVER=1` promove e reescreve a senha |
| Conta desativada | **recusa** | `ADMIN_CRIAR_REATIVAR=1` devolve o acesso |

Os três consentimentos são chaves separadas de propósito: rodar o script duas vezes não troca a credencial de
ninguém, uma conta de cliente que por acaso tenha o endereço não vira administradora da plataforma, e quem
perdeu o acesso não o recupera por um script. Promover um cliente também reescreve a senha — a plataforma
inteira não pode ficar nas mãos de uma credencial que quem rodou o script não acabou de definir.

Recusa quer dizer código de saída `1`, mensagem com o nome da chave que falta, e **nenhuma** consulta escrita:
a lista de problemas do ambiente é verificada antes da primeira chamada ao banco.

### A verificação de e-mail trava a porta, e é por isso que o bootstrap a destranca (N78)

Desde a D2, `REQUIRE_EMAIL_VERIFICATION=1` é obrigatório em produção (`apps/api/.env.example`, régua A9 de
`src/config/producao.ts`). Com ela ligada, o login de uma conta com `users.email_verified_at` nulo é negado
**antes** da senha, com a mesma resposta de uma conta sem cadastro nenhum. Ou seja: quem instala o produto com
a régua ligada e cria a conta raiz por um script que nunca escreveu aquela coluna fica do lado de fora do próprio
sistema — e essa era a situação até a T5.5 (achado N78).

O que o script faz hoje, medido: a decisão do bootstrap ganhou `confirmaEmail`, que vale `!conta?.emailVerifiedAt`
e se aplica aos três caminhos que escrevem (criar, promover, reativar). A coluna só é escrita quando está vazia —
reescrever o carimbo de quem entrou pelo próprio link seria falsificar a data em que a caixa postal foi provada.
O resumo impresso devolve `emailConfirmado: "marcado agora"` ou `"já estava"`, e nada além disso.

Prova: o penúltimo caso de `apps/api/test/confirmacao-administrativa-de-email.test.ts` ("o bootstrap do
administrador da plataforma nasce com o e-mail confirmado").

**Runbook — conta de plataforma pendente num ambiente onde o `admin:criar` já rodou antes deste conserto.** O
script é idempotente por decisão, não por sorte: **reexecute `npm run admin:criar`** (ou
`npm run docker:admin`) com as mesmas duas chaves de ambiente. O caminho "já é `SUPER_ADMIN`, ativa" não escreve
senha nenhuma, e mesmo assim marca a coluna se ela estiver vazia. Nenhum `UPDATE` manual no banco é necessário,
e nenhum dos consentimentos (`ADMIN_CRIAR_PROMOVER`, `ADMIN_CRIAR_REATIVAR`, `ADMIN_CRIAR_RENOVAR_SENHA`) é
preciso para isso.

### Destrancar o e-mail de uma conta de cliente (N61)

O cenário que existe em produção: o SMTP não responde no momento do cadastro (a linha de auditoria
`auth.verificacao_entrega_falhou` diz isso), a pessoa nunca recebeu o link, e enquanto a coluna estiver vazia ela
não entra — sem painel, sem recuperação por senha, e sem nada que o suporte possa apertar. A saída é a tela
**Contas sem confirmação** (`/app/plataforma-contas`), visível só para a conta da plataforma.

- **Quem vê:** só `platformRole === SUPER_ADMIN` (`assertPlatformAdmin`). O `ADMIN` de uma empresa recebe **403**
  nas duas portas, e isso é provado, não presumido (`tools/verify-contas-plataforma.cjs`).
- **O que a fila mostra:** contas com `emailVerifiedAt` nulo, com o endereço inteiro e o número de empresas da
  pessoa — quem atende o chamado precisa saber a quem pertence a conta. A linha de auditoria, essa sim, guarda só
  a versão mascarada (`mascaraEndereco()` — `no***@exemplo.test`), porque a trilha é lida por muito mais gente do
  que a fila. A busca é por nome ou endereço, e a ordenação é pela antiguidade do cadastro: quem espera mais sai
  primeiro.
- **O que o botão faz:** marca a coluna **e** gasta os tokens de verificação vivos da conta na mesma transação
  (`$transaction`). O link que porventura chegou atrasado não abre uma porta que já foi destrancada por fora.
- **Motivo:** a tela exige motivo escrito antes de sair qualquer requisição; na API o campo é opcional, porque a
  régua é de interface, não de banco. A linha de auditoria nasce em `ESCOPO_PLATAFORMA` — `companyId` nulo,
  endereço mascarado, `action: admin.email_confirmado`.
- **Repetir não estraga:** a segunda chamada devolve `alterado: false` e não grava segunda linha de auditoria.
  Identificador inexistente é 404 honesto, sem diferenciar "não existe" de "já confirmada".

O que a coluna **não** prova está declarado no ADR-0022: marcar `emailVerifiedAt` pela porta administrativa não
afirma que alguém leu a caixa postal. É um registro de decisão de suporte, com autor e motivo, não uma prova
material. A decisão toda, com as cinco alternativas recusadas (CLI, `ADMIN` de empresa, desligar a D2, apagar o
link, coluna de autoria) e as dívidas remanescentes, está em
`docs/adr/0022-a-porta-de-plataforma-que-confirma-um-endereco.md`.

## 6. O que produção nunca recebe

Nada desta rota conhece `admin@nexus.local` nem `nexus-demo`. Em produção, a semente só sobe com
`ALLOW_DEV_SEED=1` declarado — e mesmo assim cria somente o administrador da plataforma e as rotinas, porque
a conta de desenvolvimento pede `SEED_DEV_ACCOUNT=1` e a casa de demonstração pede `SEED_DEMO_COMPANY=1`. A
decisão está em `docs/adr/0005-semente-sem-demonstracao-em-producao.md`, e as provas em
`garantias-conta-de-demonstracao.test.ts` e `administrador-da-plataforma.test.ts`.

A pilha Docker também não recebe semente: o compose não chama `prisma db seed` em lugar nenhum, e o banco da
pilha nasce vazio — medido depois da subida do zero, ele tinha 34 tabelas e **1 linha**, a `landing_configs`
que o plugin de manutenção cria sozinho no primeiro request. Quem instala cria a própria casa pelo painel,
depois do bootstrap da seção 5.

## 7. Logs

O que existe hoje, medido no stdout da pilha (não é descrição do que se deveria querer):

- Os dois containers escrevem no **stdout**, e é isso que `docker compose logs` (e `npm run docker:logs`) lê.
  Nenhum produto escreve arquivo de log, e a imagem não monta volume de log.
- A API loga pelo logger embutido do Fastify, em JSON, nível `info`. Uma linha de request medida agora:
  `{"level":30,...,"reqId":"req-k","req":{"method":"GET","url":"/api/health","host":"127.0.0.1:3001",
  "remoteAddress":"127.0.0.1","remotePort":41312},"msg":"incoming request"}` — método, URL, endereço remoto e
  tempo de resposta. Corpo e cabeçalho não entram na serialização padrão do Fastify, e a prova disso na pilha
  inteira: `docker compose logs api` tem **0** linha com `authorization`, `password`, `secret` ou `token`.
- Não há `LOG_LEVEL` no ambiente lido pelo código do logger: o nível está fixo em `apps/api/src/app.ts`, e as
  duas ramas do ternário de produção são idênticas (`{ level: "info" }` dos dois lados). O achado N69 registra
  isso: ou a rama de produção queria outro nível, ou o ternário é decorativo — decisão de quem mantém, e a
  régua de log de produção é tarefa da F6 que ainda vem.
- O painel é nginx com o log de acesso no stdout; o `deploy/nginx-painel.conf` não toca em `access_log` nem
  registra corpo de request.
- Os três scripts de operação (`preparar-banco-de-dados.cjs`, `administrador-da-plataforma.ts`,
  `preparar-banco-de-prova.cjs`) imprimem nomes, contagens e o motivo de uma recusa — nunca valor de chave.

**Rotação e retenção**: NÃO VERIFICADO como política do repositório. O driver `json-file` do Docker tem
`max-size`/`max-file` por daemon, e isto é configuração de ambiente, não deste arquivo. Chega com o roteiro de
backup da seção 45 do prompt (próxima tarefa da T5), que é quem decide quanto tempo uma instalação guarda o
próprio histórico.

## 8. Backup e restauração (seção 45 do prompt, regra 1 do G5)

A decisão `docs/decisoes/G5-hospedagem-e-backup.md` deixou a regra escrita: **backup que nunca foi restaurado
é desejo, não plano**. Por isso esta tarefa tem três peças, e não uma:

- `deploy/backup-mysql.cjs` faz o dump;
- `deploy/restaurar-mysql.cjs` despeja o dump;
- `tools/verify-backup.cjs` restaura o dump num banco separado e confere as contagens tabela por tabela antes
  de qualquer uma das duas poder ser chamada de backup.

### Como se roda

| Comando | O que faz |
| --- | --- |
| `npm run docker:backup` | dump + gzip + retenção na pasta de backup |
| `npm run docker:backup -- --simulacao` | diz destino, banco e o arquivo que seria escrito; não escreve nada |
| `npm run docker:backup -- --dest <pasta-fora-do-repositorio>` | mesma coisa em outra pasta |
| `npm run docker:backup -- --limite-diarios 14 --limite-semanais 8 --limite-mensais 24` | muda a janela; `--sem-retencao` desliga o corte |
| `npm run docker:restaurar -- --arquivo <pasta-de-backup>/nexus-mysql--AAAA-MM-DD--HHMMSS.sql.gz --banco <nome> --criar` | restaura num banco que ainda não existe |
| `npm run docker:restaurar -- --arquivo <pasta-de-backup>/nexus-mysql--AAAA-MM-DD--HHMMSS.sql.gz --banco <nome> --aceito-sobrepor` | derruba as tabelas do alvo antes de despejar |
| `npm run docker:provar-backup` | a régua: 56 verificações (12 de recusa, 13 de retenção, 31 de dump e restauração reais) |

As três peças falam com o MySQL **do container**, por `docker compose exec`, e não por porta nenhuma: a régua
mede no container de pé que o serviço `mysql` não publica porta alguma no host, então não existe socket por
onde um dump pudesse ler o MySQL da máquina. A pilha precisa estar de pé (`npm run docker:subir`).

### O que sai de um dump

Cada execução escreve três arquivos do mesmo lado:

```
nexus-mysql--2026-10-14--164801.sql.gz     o dump gzipado
nexus-mysql--2026-10-14--164801.sha256     o sha256 do arquivo .sql.gz que está no disco
nexus-mysql--2026-10-14--164801.meta.json  banco, tabelas, linhas, bytes, duração, sha256, versão do mysqldump
```

A linha real medida nesta rodada: `35 tabela(s), 24 linha(s), 9 kB gzip em 1683 ms` no banco
`nexusbusinessmanager` da pilha Docker. O `meta.json` guarda os números da hora em que o dump foi feito; é com
ele que a régua confere "a pilha responde o mesmo número de tabelas que o meta conta", em vez de confiar em
memória. O nome do arquivo é a data e a hora locais, e o destino padrão é `~/nexus-business-manager/backups`
(ou `NEXUS_BACKUP_DIR`) — nunca dentro do repositório.

O dump é escrito **sem `--databases`**: não contém `CREATE DATABASE` nem `USE`. É exatamente isso que permite
restaurar o mesmo arquivo num banco de outro nome, que é o formato da prova de restauração.

### A senha nunca sai do container

`mysqldump` e `mysql` rodam *dentro* do container `mysql`, lendo `MYSQL_PWD` de `$MYSQL_ROOT_PASSWORD` do
ambiente do próprio container. A linha de comando do host nunca vê a senha, os sidecar e o meta não a contêm,
e nenhuma das três peças imprime valor de segredo: o que aparece é nome de banco, de arquivo, de tabela e
contagem.

### A retenção corta o que a política manda

7 diários, 4 semanais e 12 mensais (esquema GFS), com a semana contada como **semana ISO** — não como bloco de
sete dias corridos. `planejarRetencao(nomes, agora, limites)` é função pura, e a régua confere as propriedades
dela numa série de 45 arquivos sintéticos:

- os sete diários mais recentes ficam, e todo arquivo recebe exatamente um veredito (não sobra, não duplica);
- em cada nível e cada bucket fica no máximo um arquivo — **dois dumps no mesmo dia são um bucket só**, e o
  mais velho sai junto do sidecar e do meta;
- arquivo de 300 dias ainda é mensal; de 400 dias sai;
- a retenção **nunca deixa a pasta sem nenhum backup**: se tudo coubesse fora da janela, o mais recente fica
  com o motivo `ultimo`;
- arquivo fora do padrão (`README.txt`, dump de outra época) não é mantido nem apagado;
- cada arquivo que sai responde por quê na linha do operador: `repetido-no-bucket` para quem perdeu o bucket
  do dia ou da semana, `fora-da-janela` para quem não cabe em nível nenhum (medido: `retencao apagou
  nexus-mysql--2026-10-14--171045.sql.gz (repetido-no-bucket)`).

### As recusas, medidas antes de escrever

| Situação | O que acontece |
| --- | --- |
| destino dentro do repositório | código 1, diz que o destino tem de ficar fora do repositório, e o diretório proibido não é criado |
| `--arquivo` que não existe | código 1 |
| schema reservado do MySQL (`mysql`, `information_schema`, `performance_schema`, `sys`) | código 1, e a frase fala do schema reservado |
| hash do arquivo diferente do sidecar | código 1 **antes** de tocar em banco qualquer |
| banco alvo com tabelas, sem `--aceito-sobrepor` | código 1, com `o banco "X" ja tem N tabela(s) e nao esta vazio` |
| banco da instalação da pilha, sem aceite | código 1 — a régua confere este caso de propósito, porque é o que impede um `restaurar` distraído de apagar uma produção |

### Restauração de emergência, na ordem

1. `npm run docker:subir` — o alvo é o MySQL do container, então a pilha tem de estar de pé;
2. `npm run docker:restaurar -- --arquivo <pasta-de-backup>/nexus-mysql--AAAA-MM-DD--HHMMSS.sql.gz --banco nexusbusinessmanager --aceito-sobrepor`;
3. ler as contagens que a própria ferramenta imprime no fim (tabelas e linhas por tabela);
4. `npm run docker:provar` e `npm run docker:provar-backup` para as réguas dizerem se a pilha continua honesta.

Para *conferir* sem risco, o caminho é o da régua: restaurar com `--banco <outro_nome> --criar`, comparar as
contagens com o `meta.json`, e derrubar o banco de conferência depois.

### O que ainda não está aqui

Não existe agenda embutida: `docker:backup` é um comando, e quem o repete é o cron/Agendador de Tarefas da
máquina. O executor de rotinas do painel não serve para isso — ele roda dentro do container da API e não tem
como chamar `docker` nem escrever na pasta do host. Cópia para fora da máquina (off-site) também não existe;
o que existe é o dump lógico, o hash e a restauração testada. E não há arquivos de upload do produto para
proteger: o produto não aceita upload em disco (`apps/api/src/modules/companies/companies.schemas.ts` exige
endereço `http(s)` para o logo), então o backup de hoje é o banco, e é isso que a régua prova.


## 9. Depois da primeira subida

- **Trocar a senha do administrador**: pelo painel, em *Minha conta* (a troca derruba as outras sessões), ou
  reexecutando o bootstrap com `ADMIN_CRIAR_RENOVAR_SENHA=1`.
- **Rotinas agendadas**: `CRON_ENABLED=1` em um único processo; os demais atendem requisições. Na pilha Docker
  isso significa uma cópia do serviço `api` com a chave ligada e as outras sem ela — o compose de hoje sobe um
  único `api`, e a declaração de replicação é da instalação.
- **Publicar os textos legais**: em *Site público → Textos legais* do editor do CMS ficam os dois textos que a
  tela de cadastro apresenta (Termos de uso e Política de privacidade). A caixa de aceite funciona antes disso —
  uma instalação recém-subida precisa conseguir criar a primeira conta —, mas enquanto o texto não está publicado
  a linha de aceite registra a versão da prateleira vazia, então a prova de conformidade começa fraca e só fica
  forte depois desta publicação. O que a pessoa aceitou, em que versão e de onde, se lê em
  `consent_records` (`docs/adr/0023-o-aceite-dos-textos-legais-nasce-junto-da-conta.md`).
- **Registro das credenciais desta máquina**: ficam no `CREDENCIAIS.md` local (ignorado pelo git). O
  repositório não guarda senha, token nem `.env`, e `identificadores-fora-do-codigo.test.ts` recusa valor
  literal atribuído a `SEED_ADMIN_PASSWORD`, `SEED_DEV_PASSWORD`, `NEXUS_CAPTURA_SENHA` e `ADMIN_CRIAR_SENHA`
  em qualquer arquivo rastreado.

## 10. E-mail: fila do processo, retentativa e desligue

A decisão inteira está em `docs/adr/0020-entrega-de-email-por-fila-de-memoria.md` (N58, regra 2 do G1). O
operador precisa de quatro fatos:

1. **Nenhum request espera o provedor.** O handler de recuperação, o de verificação e o de segundo fator
   empurram a mensagem para `apps/api/src/lib/mail/fila.ts` e devolvem. Medido na corrida que fechou o arquivo
   verde: com um entregador de 600 ms no ar, o `POST /api/auth/forgot-password` respondeu em **7,43 ms**
   (`responseTime` do pino), e a mensagem ainda estava viva na fila (`vivas: 1`) no instante da resposta. Antes
   da fila, com um entregador de 250 ms, o mesmo request pagava **320 ms** — tempo que era
   do servidor de e-mail, não da pessoa.
2. **A fila é memória do processo.** Ela não sobrevive a reinício e não é compartilhada entre réplicas. Isso é
   escolha, não esquecimento: a mensagem de recuperação e a de verificação carregam o código em texto puro, e
   persistir a fila seria gravar token em repouso — o banco guarda só o HMAC deles. A consequência prática é
   que o reenvio continua sendo a saída de quem não recebeu, e é por isso que a rota de reenvio existe.
3. **As quatro chaves, com o padrão de cada uma.** `MAIL_TENTATIVAS` (3) é quantas vezes a fila tenta antes de
   desistir; `MAIL_BACKOFF_BASE_MS` (500) é a base do recuo exponencial — a segunda espera começa 500 ms depois
   da primeira falha e a terceira, 1 000 ms; `MAIL_TIMEOUT_MS` (15 000) é o teto de **uma** tentativa, e é o
   mesmo número que vai para os tempos do socket do nodemailer (`connectionTimeout`, `greetingTimeout`,
   `socketTimeout`, `dnsTimeout`), que sem declaração ficam nos padrões de cliente interativo — dois minutos
   para conectar e dez minutos de socket mudo; `MAIL_FILA_MAXIMA` (200) é o teto de mensagens vivas, e o que
   passa dele é recusado com auditoria, sem tentativa nenhuma.
4. **O que aparece na auditoria quando dá errado.** Uma linha por mensagem, carimbada pela fila depois da
   última tentativa: `auth.forgot_password_entrega_falhou`, `auth.verificacao_entrega_falhou`,
   `auth.2fa_aviso_entrega_falhou` ou `notification.entrega_falhou`. Nos dois fluxos de código e no aviso do sino
   o metadata traz `{ rotulo, tentativas, motivo }`; no aviso de segundo fator, `{ tentativas, motivo }`. A linha
   do sino traz ainda o endereço mascarado (`mascaraEndereco()` — `no***@exemplo.test`), nunca a caixa postal
   inteira. Sucesso de entrega não gera linha — o que gera é a mensagem na caixa postal de quem pediu.
5. **O e-mail do painel é cópia do sino, e o portão é o que o entregador afirma** (N59,
   `docs/adr/0021-o-email-e-copia-do-aviso-do-sino.md`). Primeiro nasce a linha do sino; depois, se aquela pessoa
   ligou o canal, a mensagem entra na fila desta seção. Sem SMTP configurado nada é enfileirado — o console e a
   caixa de memória **negam** a entrega com motivo escrito, e só o transporte SMTP afirma. É esse estado que a
   tela de preferências mostra (`disponivel`, `transporte`, `motivo`), e não um `disabled` fixo.

**Como se lê o número de e-mails.** `POST /api/notifications/scan` responde `{ criadas, emails }`, a auditoria
`notification.scan` grava os dois, e as três rotinas fecham a frase da coluna "última execução" com
`· N e-mail(s)` — `1 aviso criado em 6 empresas · 0 e-mails`. O `emails` conta mensagens **postas na fila**, não
entregas confirmadas: a entrega é assíncrona (item 1) e o que fica de fora disso é a linha de falha, não o
contador. `· 0 e-mails` numa instalação sem SMTP é o estado correto, não uma avaria; para o número subir é
preciso apontar `SMTP_HOST`, `SMTP_PORT` e `MAIL_FROM` e reabrir a pilha.

O desligue drena a fila antes de fechar (`apps/api/src/server.ts`, entre parar o agendador de rotinas e fechar
o servidor), com teto de 5 segundos. Se não esvaziar a tempo, o processo registra
`a fila de e-mail não esvaziou antes do desligue` no log e fecha — uma mensagem no meio da terceira tentativa
se perde, e é por isso que o desligue limpo e o `docker stop` com folga importam.

## 11. Painel em hospedagem estática e API em container

É a trilha que este projeto tem hoje publicado: o painel servido por um host estático (a Vercel, no caso do
dono) e a API com o MySQL num host de container. As seções 2 e 3 descrevem a pilha inteira num host só, onde o
nginx do `Dockerfile.web` faz o proxy de `/api` com a mesma origem. Separando os dois lados de casa, o proxy
deixa de existir, e é exatamente aí que a primeira publicação quebrou — o achado **N81** (`docs/AUDITORIA.md`)
tem a medição: o painel chamou `/health` e `/public/landing` num host que não tem API nenhuma, e a função do
outro projeto respondeu `500 FUNCTION_INVOCATION_FAILED` porque não há MySQL dentro de uma função serverless.

O que o repositório garante agora, do lado do painel:

- `apps/web/src/lib/apiBase.ts` lê `VITE_API_URL` e **completa a origem nua com `/api`**, porque o backend monta
  toda rota sob esse prefixo. `https://api.exemplo.test` vira `https://api.exemplo.test/api`; quem já escreve o
  caminho inteiro passa reto; variável ausente ou vazia continua significando a mesma origem (o proxy do Vite em
  desenvolvimento e o nginx em produção). Cinco casos em `apps/web/src/test/url-base-da-api.test.ts`.
- `vercel.json` na raiz declara o build do workspace web (`npm run build --workspace @nexus/web`), a saída
  `apps/web/dist`, o rewrite de SPA (sem ele `/login` e `/app` são 404) e o cache imutável de `/assets/*`.
  O projeto na Vercel tem de ter **Root Directory na raiz do repositório**, senão o arquivo não é lido.

O que cada lado precisa do dono do deploy, e nada disso tem default:

| Variável | Onde se define | O que tem de ser |
|---|---|---|
| `VITE_API_URL` | build do painel | a origem pública da API. Com ou sem `/api` no fim, os dois funcionam desde esta rodada |
| `CORS_ORIGIN` | ambiente da API | o endereço público do painel, `https`, sem barra final. Aceita lista separada por vírgula, então o painel de preview e o de produção podem morar na mesma linha |
| `WEB_BASE_URL` | ambiente da API | o mesmo endereço público do painel — é o que sai nos links de verificação e de recuperação por e-mail |
| `DATABASE_URL` | ambiente da API | um MySQL alcançável de fora do container da API. O `localhost:3306` do WAMP não existe lá fora, e a régua de produção derruba o processo antes da primeira requisição |
| as outras da tabela da seção 1 | ambiente da API | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SUPER_ADMIN_EMAIL`, `TOTP_ENCRYPTION_KEY`, `SMTP_*`, `MAIL_FROM`, `TRUST_PROXY`, `AUTH_EXPOSE_RESET_TOKEN=0` |

Ordem de subida que a casa já conhece: o container da API roda
`node deploy/preparar-banco-de-dados.cjs` uma vez (é o `migrate deploy`, desde a C1 com o baseline aplicado em
banco zerado), depois `npm run admin:criar` para nascer o administrador da plataforma, e só então o painel
aponta para lá. O `docker-compose.yml` faz os três passos na mesma sequência com o job `migracoes`.

## 12. O que ainda não está aqui

- **Pipeline de CI, `npm audit`, portões de cobertura, `postinstall` do Prisma e o conserto da cadeia de
  migrations para clone limpo** (N54) — F8 (T7).
- **Política de logs com rotação e retenção** — o backup do banco existe desde a T5.2, a rotação de log ainda não.
  O nível de log de produção (N69, seção 7) está na mesma conta.
- **Hospedagem recomendada**: não existe no repositório, e a decisão é do dono
  (`docs/decisoes/G5-hospedagem-e-backup.md`). A seção 11 descreve a topologia separada que o dono escolheu
  publicar — painel em host estático, API e banco em container —, mas nome de host, tamanho de instância e o
  provedor do MySQL continuam sendo conta dele.
