# Produção — como uma instalação deste produto nasce

Este arquivo é o caminho de subida de uma instalação real do Nexus Business Manager. A F1.4 escreveu a
primeira metade — a parte que decide quem manda na plataforma — e a F6 (T5.1, 2026-10-14) escreveu o resto
no mesmo lugar: a pilha Docker, a porta do banco fechada e o que foi medido nela. O que está aqui foi
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

## 8. Depois da primeira subida

- **Trocar a senha do administrador**: pelo painel, em *Minha conta* (a troca derruba as outras sessões), ou
  reexecutando o bootstrap com `ADMIN_CRIAR_RENOVAR_SENHA=1`.
- **Rotinas agendadas**: `CRON_ENABLED=1` em um único processo; os demais atendem requisições. Na pilha Docker
  isso significa uma cópia do serviço `api` com a chave ligada e as outras sem ela — o compose de hoje sobe um
  único `api`, e a declaração de replicação é da instalação.
- **Registro das credenciais desta máquina**: ficam no `CREDENCIAIS.md` local (ignorado pelo git). O
  repositório não guarda senha, token nem `.env`, e `identificadores-fora-do-codigo.test.ts` recusa valor
  literal atribuído a `SEED_ADMIN_PASSWORD`, `SEED_DEV_PASSWORD`, `NEXUS_CAPTURA_SENHA` e `ADMIN_CRIAR_SENHA`
  em qualquer arquivo rastreado.

## 9. O que ainda não está aqui

- **Backup** do volume `nexus-mysql` e o roteiro de restauração — seção 45 do prompt, próxima tarefa da T5.
- **Entrega de e-mail fora do request** (N58), **chamador de e-mail do sino e do relatório diário** (N59) e
  **porta administrativa de confirmação de e-mail** (N61) — ainda na T5.
- **Pipeline de CI, `npm audit`, portões de cobertura, `postinstall` do Prisma e o conserto da cadeia de
  migrations para clone limpo** (N54) — F8 (T7).
- **Política de logs com rotação e retenção** — vem amarrada ao backup, não decidida sozinha. O nível de log de
  produção (N69, seção 7) está na mesma conta.
- **Hospedagem recomendada**: não existe no repositório, e a decisão é do dono
  (`docs/decisoes/G5-hospedagem-e-backup.md`).
