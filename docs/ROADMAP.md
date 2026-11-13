# ROADMAP — backlog decidido e achados ainda sem decisão de adiamento

Este documento reúne o backlog já decidido para depois da 1.0 e achados cuja prioridade ou adiamento
**ainda precisa de decisão**. A presença de um item aqui não significa aceite de risco nem exclusão
automática da versão 1.0. Nada aqui é promessa de data; os motivos e decisões existentes são preservados.

## Produção global — auditoria de 2026-11-09, sem decisão de adiamento

Achados da auditoria profissional pedida pelo dono, registrados com caminho e linha na adenda de
2026-11-09 de `docs/AUDITORIA.md` (N87 a N99), com correções factuais na conferência de 2026-11-11.
Nenhum foi corrigido na rodada que os mediu. Desde então, **dois foram corrigidos**: o N97, que estava
nesta lista, porque a chave de pool removida no Vitest 4 fazia a suíte abrir um processo por arquivo e
uma rodada de cobertura perder 39 workers (0xC0000142), e o **N100**, achado novo desta rodada, em que
o resíduo de auditoria no banco de prova compartilhado fazia o portão de cobertura reprovar conforme o
dia — a correção, o preço dela e os portões estão nos achados N97 e N100 de `docs/AUDITORIA.md`. Os
demais continuam pendentes de avaliação, e pendência de avaliação não é certificação de produção nem
backlog pós-1.0 já aprovado; implementar e validar soluções exige trabalho além de fornecer `.env`.

- **N87 — o relatório diário formata dinheiro em real fixo.** `cron.handlers.ts:113-115` seleciona só
  `id` e `timezone` da empresa, e a linha 141 formata o total com `moeda()`, que é um
  `Intl.NumberFormat("pt-BR", { currency: "BRL" })` criado uma vez para todas as casas
  (`notifications.service.ts:53-56`). `Company.currency` e `Company.language` existem e são editáveis em
  `/app/configuracoes`: uma empresa em dólar ou euro recebe o aviso — e o e-mail — escrito `R$`. A data
  do relatório também é `DD/MM/YYYY` fixo (linha 136). Caminho: selecionar moeda e idioma na varredura e
  formatar por empresa, como o painel já faz em `lib/format.ts:50`.
- **N88 — a tela do Financeiro usa fusos diferentes para o vencimento.** `Finance.tsx:40` declara
  `fmtData` com `toLocaleDateString("pt-BR")` (fuso do navegador), usado na coluna da linha 389; o modal
  usa `formatDate` da empresa (linha 154). Para `2026-11-10T00:00:00Z`, a conferência Intl devolveu
  **10/11/2026 em UTC** e **09/11/2026 em America/Sao_Paulo**: navegador em UTC mostra 10/11 na tabela
  e empresa em São Paulo mostra 09/11 no modal, não o inverso. Antes de trocar helpers, definir se
  `dueDate` é data civil ou instante e conferir entrada, persistência e resposta da API. Preservar o dia
  civil ou formatar o instante no fuso da empresa, conforme esse contrato, com testes entre fusos;
  não há garantia de correção em uma linha.
- **N89 — o mês padrão sai do relógio do navegador.** `Finance.tsx:41-44` (`mesAtual`, filtro padrão da
  linha 73) e `Agenda.tsx:307` (`inicioDoMes`) usam `new Date()` local, não o `timezone` da empresa. Na
  virada do mês o filtro e a contagem discordam do servidor. O helper certo já existe e já é usado em
  `Cobrancas.tsx:845` (`diaDaEmpresa`).
- **N90 — consistência de formato do mês no Dashboard.** `Dashboard.tsx:368` fixa `pt-BR` no
  `toLocaleDateString`, sem a preferência de formato da empresa. `lib/format.ts:28-29` distingue os
  contratos: números e datas seguem a preferência; **a interface é intencionalmente em português**.
  O achado não é defeito geral de idioma nem demanda de tradução da interface.
- **N91 — HTTP 200 não comprova prontidão do banco.** Se alcançado, `health.routes.ts:6-14` devolve
  **200/degraded/down** ao falhar `SELECT 1`; o compose sonda só `r.ok` (linha 115) e aceita esse 200.
  Mas `maintenance.ts:21-25` consulta `estadoManutencao()` **antes** de liberar `/api/health`:
  `cms.service.ts:782-794` usa cache de **5 s** e, se frio/expirado, chama `obterConfig()`, que faz
  `landingConfig.upsert` (linhas 311-312). Banco indisponível/tabela ausente pode gerar **500 antes do
  handler**. Logo, não é universal que o container fique healthy com o banco fora do ar, e o comentário
  do compose sobre 500 sem tabelas não é necessariamente falso. Caminho: validar o corpo saudável
  (`status: "ok"`, `db: "up"`) ou criar readiness com código não-2xx na indisponibilidade; provar o
  percurso completo com falhas injetadas e cache frio/expirado e válido, **sem derrubar o WAMP**. O passo 5
  de `docs/PRODUCAO.md` §12 agora exige corpo e fluxo funcional; essa prova não foi executada aqui.
- **N92 — orçamento de conexões serverless não medido.** `lib/prisma.ts:10-14` declara só `log` no
  cliente, e a busca original não encontrou parâmetros de pool nos arquivos públicos examinados.
  A URL secreta pode conter opções: não se comprovou ausência absoluta de configuração. A folga entre
  instâncias concorrentes × conexões por pool, outros consumidores e teto do TiDB está **NÃO VERIFICADA**.
  Desenhar o orçamento com limites do plano, concorrência prevista e margem operacional não depende
  exclusivamente do `.env`; depois conferir a configuração efetiva sem expor a URL e medir sob carga
  autorizada. Dimensionar `connection_limit`/`pool_timeout` conforme essa conta, não só receber o arquivo.

## Organização — auditoria de 2026-11-09, sem decisão de adiamento

- **N93 — consumidor de `GET /api/cms/kinds` não localizado estaticamente.** A busca local registrada
  encontrou a declaração (`cms.routes.ts:144`) e a referência na matriz, não uma chamada funcional.
  Isso não exclui chamadas dinâmicas, uso manual ou externo. A rota é autenticada e entra na varredura
  anônima; confirmar finalidade e consumidores antes de decidir manutenção ou descontinuação.
- **N94 — renomear categoria de produto existe na API e não na tela.** `PATCH /api/product-categories/:id`
  é atacado por `intrusao.test.ts:112`; o painel só lista e cria (`Products.tsx:98` e `:715`). Lacuna de
  produto: quem errou o nome da categoria não corrige pela interface.
- **N95 — quatro scripts de patch sem chamada localizada na busca local.**
  `tools/patch-schema-{admin,compras,crm,financeiro}.cjs` não tiveram chamador localizado nos arquivos
  examinados. As **65 entradas** de `tools/` incluem ignorados; não provam que sejam os únicos órfãos.
  Os modelos pretendidos já constam no schema/migrations, mas isso não prova remoção segura. Confirmar
  uso manual/externo e finalidade histórica; os scripts podem escrever no schema quando executados.
- **N96 — três diretivas `eslint-disable` num repositório sem ESLint.** `lib/audit.ts:58`,
  `lib/prisma.ts:6`, `notifications.service.ts:235`. Não há config nem dependência do ESLint; o lint da
  casa é `tools/verifica-lint.cjs`, que não lê a diretiva.
- **N98 — redação de cobertura e promessa de Redis.** Na leitura desta revisão,
  `tools/verifica-cobertura.cjs:15` ainda contém "philosophy"; não se marcou essa parte como removida.
  `plugins/security.ts:27-31` promete Redis "na Fase 8 (Docker/compose introduz o Redis no stack)".
  A **F8 está em andamento**, não fechada; CI/dependabot/portões estão em trabalho, o compose não tem
  Redis e o store compartilhado está no backlog pós-1.0.
- **N99 — duplicação de assets sem falha funcional comprovada.** `apps/web/public/favicon.png` é
  byte-idêntico a `favicon-48.png`, sem link explícito no `index.html`; ser público permite acesso
  direto ou externo, portanto a busca local não prova desuso. As logos em
  `apps/web/src/assets/brand/logo.png` e `assets/brand/logo/logo.png` atendem consumidores distintos
  (Logo.tsx/bundler e README); duplicá-las pode ser legítimo. Avaliar finalidade e sincronização antes
  de consolidar, sem presumir remoção segura. O terceiro grupo idêntico é o N82, registrado abaixo.

## Dependências — correção e prioridade pendentes de decisão

- **N86 — as oito vulnerabilidades que o `npm audit` mediu na árvore.** `npm audit --audit-level=high` devolve
  **exit 1** com **8 vulnerabilidades** (1 baixa, 2 moderadas, 5 altas, 0 críticas). Nenhuma foi introduzida
  pela F7 — o diff de manifestos no intervalo da fase é vazio. A conta, com o caminho do conserto:
  - `zod` **3.25.76** (alta) — só o **4.6.6+** corrige, e isso é **quebra de major**: decisão de produto, não
    um `npm update`.
  - `prisma` e `@prisma/config` **6.19.3** (alta) — o aviso cobre 6.13.0-dev.1 a 7.10.0; corrigir é **quebra de
    major** da versão 6 para a 7.
  - `fastify` **5.12.5** (baixa) — corrige em 5.12.6+, **sem** quebra de major.
  - `nodemailer` **10.1.0** (moderada) — corrige em 10.1.4+, **sem** quebra de major.
  - `follow-redirects` **1.16.1** (alta) — transitivo do `axios` do painel; o `axios ^1.7.7` já está declarado
    no `package.json`, então subir dentro do range não quebra major. O adaptador HTTP de **Node** usa
    `follow-redirects`; ser transitivo do axios não prova inclusão no bundle do navegador, que não foi
    verificada nesta revisão.
  - `deepmerge-ts` **7.1.5** (alta) e `fast-uri` **4.2.2** (moderada) — transitivos; sobem com o `prisma` e com o
    `fastify`, respectivamente.
  O `npm audit fix --force` está **proibido** nesta casa, e instalar dependência **pede aval do dono**; por
  isso o item fica aqui, registrado e rastreável, sem decisão implícita de adiá-lo para depois da 1.0.
  A **F8 segue em andamento**: o YAML local `.github/workflows/portoes.yml` declara `push` na `main` e
  `pull_request` para `main`; `.github/dependabot.yml` declara frequência **semanal**, não diária.
  Faltam execução remota e aceite; esses arquivos não comprovam proteção de branch nem checks
  obrigatórios para merge. A medição de vulnerabilidades acima é histórica, não um novo audit.

## Backlog com decisões e pendências operacionais já registradas

As seções seguintes preservam o backlog anterior e seus ponteiros de decisão. Não estendem decisões de
adiamento aos achados de auditoria e dependências listados acima.

## Operação e hospedagem

- **Store compartilhado do limitador de taxa.** Hoje o balde é por processo (ADR 0025, `docs/PRODUCAO.md`
  seção 13). Com mais de um processo — ou em host serverless com instâncias frias — o teto por endereço vale
  por instância, não por instalação. Caminho: store Redis (Marketplace) atrás do `@fastify/rate-limit`.
- **Relógio das rotinas em host serverless.** O agendador é um `setInterval` no processo da API
  (`cron.runner.ts`); função serverless não tem processo vivo entre pedidos. Na publicação da Vercel as rotinas
  rodam pelo botão da tela (`CRON_ENABLED=0`); o caminho automático é Vercel Cron chamando uma porta protegida
  por segredo, ou host com processo vivo (a pilha docker do repositório já liga o relógio inteiro).
- **Agenda diária de backup fora da máquina do dono** (N71). `deploy/backup-mysql.cjs` existe e a política
  7/4/12 é provada; quem repete o comando é o cron do host escolhido. No ar, o banco é o TiDB Cloud Starter,
  que tem backup e recuperação pontual próprios — o que falta é a prova de restauração no plano do dono (o
  `npm run docker:provar-backup` provou a pilha local, não a do ar).
- **Exercício trimestral de restauração em outro host** (regra 1 do G5). O comando de restauração comparada
  existe (`npm run docker:provar-backup`); o "outro host" depende da hospedagem.
- **Rotação de log e nível de produção** (N69). O backup do banco existe; a política de log ainda não.

## Produto

- **Provedores de pagamento e assinatura** (decisão P, G2). A v1.0 cobra pelo adaptador MANUAL com recebimento
  registrado na tela; a porta de código (`modules/gateways`) existe para o dia em que um provedor entrar.
- **Nota fiscal eletrônica** (decisão P, G3). Fora da v1.0; o documento fiscal é processo do cliente com seu
  contador, e o produto não emite nem promete emitir.
- **Acesso temporário de suporte com motivo obrigatório** (decisão S, opção B do G8). A trilha de plataforma
  existe; a porta de "entrar como suporte por tempo limitado, com motivo escrito" ainda não.
- **Desvincular o administrador global das empresas dos clientes** (decisão S). Hoje a conta de plataforma
  ainda nasce como OWNER nas casas de demonstração (N84); o cadastro novo não deve mais herdar esse vínculo.
- **Redesenho das páginas.** Só acontece se o dono entregar `.ia/PROMPT_REDESENHO_DAS_PAGINAS.md`; o arquivo
  não existe nesta árvore, então a fase C4 do contrato de conclusão foi pulada de propósito, com este registro.
- **Licença.** Em branco por decisão do dono (L, G6): nem adicionar nem alterar até a decisão chegar.

## Ferramentas de prova e capturas

- **N82** — `22-configuracoes-lancamento-automatico.png` fotografa o topo da aba Empresa, não o bloco que salva;
  o conserto (`scrollIntoView` antes da foto) mora na rodada das ferramentas de captura (T7/F8).
- **N83** — em desenvolvimento o StrictMode grava dois eventos de exportação por visita; deduplicar na escrita
  mexe na semântica da trilha e não foi pedido por item numerado.
