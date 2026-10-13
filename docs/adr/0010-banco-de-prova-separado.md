# ADR-0010 — Banco de prova separado: teste nenhum escreve no banco de quem está trabalhando

- Status: Aceita (2026-10-13)
- Contexto: decisão **D6** do dono no prompt de continuação de 2026-10-13, e §4 do contrato permanente da
  IDE ("testes e provas nunca usam o banco de desenvolvimento"). O que foi medido antes de decidir:
  `apps/api/vitest.config.ts` não injetava endereço de banco nenhum, então a suíte herdava o `DATABASE_URL`
  do `apps/api/.env` — o mesmo endereço do servidor de desenvolvimento. Sete provas de navegador
  (`verify-auditoria-plataforma`, `verify-cobrancas`, `verify-configuracoes`, `verify-ordens-de-servico`,
  `verify-parcelamento`, `verify-rotinas`, `verify-notificacoes`) abriam um `PrismaClient` próprio lendo o
  mesmo arquivo. Consequência medida nesta rodada, no banco de desenvolvimento: **45 empresas, das quais 42
  com o nome do padrão dos helpers de teste** (`Empresa-<epoch>-<n>-<rand>`), e um usuário de prova
  ("Tecnico de Prova", sem vínculo, sem sessão, criado às 20:40 de 2026-10-13) deixado por uma prova que
  falhou no meio. Não é sujo de propósito: é o preço de duas coisas legítimas — o desenvolvedor olhar a
  própria tela que a suíte acabou de escrever, e o dado de demonstração sumir no meio de uma corrida.
- Decisão:
  1. **Nome combinado, não variável de humor.** O banco de prova se chama `nexusbusinessmanager_teste` e é
     declarado em `DATABASE_URL_TESTE`. O nome é uma constante no código (`tools/banco-de-prova.cjs` e
     `apps/api/vitest.config.ts`), e as duas pontas se recusam a trabalhar sem ele: faltar a variável, o nome
     ser outro, ou o `DATABASE_URL` de desenvolvimento apontar para o mesmo banco — nos três casos a prova
     para com mensagem dizendo o que falta, sem imprimir credencial.
  2. **A suíte recebe o endereço, não o herda.** `apps/api/vitest.config.ts` injeta `DATABASE_URL` com o
     valor de `DATABASE_URL_TESTE` no processo de teste. O caso vermelho desta decisão mora em
     `apps/api/test/banco-de-teste-separado.test.ts`: ele abre um segundo cliente no endereço do `.env` de
     desenvolvimento, conta tabela por tabela, escreve pela suíte, e exige que os números do lado do
     desenvolvimento sejam os mesmos antes e depois.
  3. **Prova de navegador só escreve depois de conferir o servidor.** Toda `tools/verify-*.cjs` e todo
     `tools/shoot-*.cjs` chama `conferirServidorDeProva()` antes de abrir o navegador: a função entra na API
     pela porta de login com a conta de prova, pega o `id` que a API devolve e exige que esse `id` exista no
     banco de prova. Se o servidor atendendo a porta 3001 estiver no banco de desenvolvimento, a conferência
     falha ali, com HTTP 401 e a instrução de subir `npm run dev:api:teste`. O resultado bom fica em cache
     por cinco minutos em arquivo temporário, porque `/auth/login` tem limite de dez tentativas por minuto e
     trinta provas na mesma janela estourariam o próprio limite.
  4. **Quem abre o banco por conta própria usa o cliente de prova.** As sete provas que escrevem direto no
     banco não constroem mais `PrismaClient`: chamam `clienteDoBancoDeProva()`. Os dois carregamentos do
     `.env` de desenvolvimento que existiam nesses arquivos (um `dotenv.config` em seis deles e um parser
     manual no sétimo) foram apagados — a prova nem vê mais o endereço de desenvolvimento.
  5. **O banco de prova se monta com `npm run db:prova`.** `tools/preparar-banco-de-prova.cjs` cria o schema
     se não existir, aplica o que estiver pendente, roda a semente com as variáveis de ambiente do banco de
     prova e grava a conta de prova. **A cadeia versionada de migrations não reergue um MySQL vazio** — ver
     N54 em `docs/AUDITORIA.md`, medido nesta rodada com `migrate deploy` num schema de descarte: quebra na
     segunda migration com `P3018` / erro 1826 (`Duplicate foreign key constraint name
     'company_users_user_id_fkey'`). Enquanto o N54 não for fechado, o banco de prova nasce de
     `prisma db push --skip-generate` e as vinte migrations são marcadas como aplicadas com
     `migrate resolve --applied`, o que deixa o `_prisma_migrations` igual ao do desenvolvimento.
  6. **A conta de prova é fictícia e a senha não vai para o repositório.** `administrador@exemplo.test`
     (domínio reservado para teste), nome "Administrador de Prova", senha gerada com vinte e quatro
     caracteres aleatórios na primeira execução e guardada em `tools/prova-admin.local.json`, arquivo
     ignorado pelo git. As variáveis `NEXUS_PROVA_ADMIN_EMAIL` e `NEXUS_PROVA_ADMIN_SENHA` mandam quando
     existirem. Nenhum valor de credencial é impresso em log, teste, captura ou documento.
  7. **Limpeza tem backup antes, e lista antes de apagar.** Antes de qualquer mudança neste bloco o banco de
     desenvolvimento foi despejado para fora do repositório: `C:/Users/<usuario>/backups-nexus/`
     (`mysqldump`, ~14 MB, arquivo que nunca entra no git). A única linha apagada do banco de desenvolvimento
     foi a que a prova deixou sozinha, depois de conferida relação por relação (zero vínculos, zero sessões,
     zero auditoria, zero ordens) e listada antes.
- Consequências:
  - Subir a API com `npm run dev` e rodar uma prova dá erro em vez de escrever no lugar errado. Para as
    provas existe `npm run dev:api:teste`.
  - As capturas das telas de notificação (`docs/screenshots/21-*.png`) mudaram de conteúdo: a casa de
    demonstração do banco de prova tem seis avisos, e o banco de desenvolvimento vinha carregando onze,
    sendo cinco sobras de corridas antigas. As quatro capturas de ordens de serviço foram descartadas — o
    conteúdo é o mesmo, só mudou o ruído de compressão do PNG.
  - O banco de desenvolvimento continua com as 42 empresas de teste que a suíte deixou nele antes desta
    decisão. Nada foi apagado delas: a D6 manda investigar a origem, e a origem está medida acima; apagar em
    massa sem o dono decidir é a parte destrutiva, e fica segurada aqui, em `docs/STATUS-AJUSTES.md`.
  - O `npm test` passou a depender de um banco de prova existente. A porta de entrada está documentada em
    `README.md` e em `docs/ESTADO-ATUAL.md`; quem clonar o repositório e não tiver o banco vê a mensagem com
    o comando que falta.
