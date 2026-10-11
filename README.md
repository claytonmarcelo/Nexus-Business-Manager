<p align="center">
  <img src="assets/brand/logo/logo.png" alt="Nexus Business Manager" width="220">
</p>

<h1 align="center">Nexus Business Manager</h1>

<p align="center">
  <strong>ERP SaaS multiempresa — a operação inteira da empresa em um só painel</strong><br>
  Plataforma para gerenciar clientes, produtos e estoque, vendas, compras e fornecedores, financeiro,
  CRM, agenda, equipe com papéis, notificações e auditoria no mesmo lugar — com isolamento por empresa
  verificado no servidor a cada requisição.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/vers%C3%A3o-0.1.0-blue" alt="Versão 0.1.0">
  <img src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=nodedotjs&logoColor=white" alt="Node.js 20+">
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript strict">
  <img src="https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white" alt="Fastify 5">
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white" alt="Prisma 6">
  <img src="https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white" alt="MySQL 8">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React 18">
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite 5">
  <img src="https://img.shields.io/badge/AdminLTE-4.10-343a40?logo=laravel&logoColor=white" alt="AdminLTE 4.10">
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind 4">
  <img src="https://img.shields.io/badge/testes-81%20testes%20em%2014%20arquivos-brightgreen" alt="81 testes em 14 arquivos">
</p>

<p align="center">
  <sub>Estágio atual: a fundação e os módulos do dia a dia estão no ar — autenticação, papéis,
  multiempresa, clientes, produtos e estoque, vendas, compras, financeiro, CRM, agenda, auditoria e
  equipe. A página pública já é montada a partir do conteúdo do banco — cores, herói, capacidades,
  depoimentos, métricas, dúvidas, contato, textos legais e a tela de modo manutenção; o que falta ali é a
  tela do editor <code>/app/cms</code>. Nas notificações a API entrega tudo e falta o sino na tela. O que
  existe como tabela pronta mas sem módulo (modelos de
  e-mail, rotinas agendadas e gateways de pagamento) e o que ainda nem tem tabela está marcado um por um em
  <a href="#m%C3%B3dulos">Módulos</a> e no <a href="#roadmap">Roadmap</a>. Nada no menu aponta para uma
  rota que não existe: módulo em construção aparece apagado, com "em breve".</sub>
</p>

---

## Telas

Capturas do sistema rodando (Fastify + Prisma sobre MySQL no backend, React + AdminLTE 4 no frontend),
todas no quadro de **1440×900**, duas por linha e na mesma escala de exibição. Cada imagem é um link: o
clique abre o arquivo no tamanho capturado. As seis primeiras são a série da fundação, nos dois temas; as
seis seguintes mostram os módulos operacionais do mesmo jeito que a pessoa os vê depois de entrar; as duas
linhas finais são a vitrine montada a partir do conteúdo do banco, o modo manutenção e os textos legais.

Os números que aparecem nas telas saíram do banco local de desenvolvimento no dia das capturas. O `seed`
cria a empresa `nexus-demo` **vazia** — não há dados de fachada no código; os registros que os indicadores
contam vieram das provas automatizadas e dos testes de integração, que escrevem de verdade na mesma base.

<div align="center">

| Página pública · tema escuro | Entrada · tema escuro |
| :--: | :--: |
| <a href="docs/screenshots/01-landing.png"><img src="docs/screenshots/01-landing.png" alt="Página pública de boas-vindas em tema escuro, com a marca animada no palco, título, subtítulo e o switch de tema" width="360"></a> | <a href="docs/screenshots/02-login.png"><img src="docs/screenshots/02-login.png" alt="Tela de login com e-mail, senha com botão de revelar, lembrar de mim e link de recuperação, em relevo neumórfico no tema escuro" width="360"></a> |

| Painel (Dashboard) | Equipe, papéis e permissões |
| :--: | :--: |
| <a href="docs/screenshots/03-dashboard.png"><img src="docs/screenshots/03-dashboard.png" alt="Painel em tema escuro com os cartões de indicadores contados no banco da empresa ativa, abas de Metas e Alertas" width="360"></a> | <a href="docs/screenshots/04-usuarios.png"><img src="docs/screenshots/04-usuarios.png" alt="Tela de Usuários na aba Permissões (RBAC), com a matriz de recursos e ações por papel e a paginação no rodapé" width="360"></a> |

| Auditoria corporativa | Configurações · tema claro |
| :--: | :--: |
| <a href="docs/screenshots/05-auditoria.png"><img src="docs/screenshots/05-auditoria.png" alt="Tela de Auditoria em tema escuro com a trilha de logs da empresa, filtros e marcação das alterações sensíveis" width="360"></a> | <a href="docs/screenshots/06-configuracoes-claro.png"><img src="docs/screenshots/06-configuracoes-claro.png" alt="Tela de Configurações no tema dia: escolha de aparência, dados da conta e troca de empresa ativa" width="360"></a> |

| Clientes | Produtos e estoque |
| :--: | :--: |
| <a href="docs/screenshots/07-clientes.png"><img src="docs/screenshots/07-clientes.png" alt="Tela de Clientes com KPIs, busca, tabela paginada e a coluna de ações na mesma linha" width="360"></a> | <a href="docs/screenshots/10-produtos.png"><img src="docs/screenshots/10-produtos.png" alt="Tela de Produtos com o catálogo, estoque, movimentações e os cartões de estoque baixo e sem estoque" width="360"></a> |

| Vendas | Compras e fornecedores |
| :--: | :--: |
| <a href="docs/screenshots/11-vendas.png"><img src="docs/screenshots/11-vendas.png" alt="Tela de Vendas com a lista de pedidos, pílulas de situação e as ações de confirmar e cancelar" width="360"></a> | <a href="docs/screenshots/12-compras.png"><img src="docs/screenshots/12-compras.png" alt="Tela de Compras com os pedidos por fornecedor e o status rascunho, recebida e cancelada" width="360"></a> |

| Financeiro | CRM (funil de leads) |
| :--: | :--: |
| <a href="docs/screenshots/13-financeiro.png"><img src="docs/screenshots/13-financeiro.png" alt="Tela do Financeiro com os KPIs do mês, lançamentos a pagar e receber e a central de categorias" width="360"></a> | <a href="docs/screenshots/14-crm.png"><img src="docs/screenshots/14-crm.png" alt="Tela do CRM com o funil de cinco estágios, contagem e soma de valor por etapa e os KPIs de conversão" width="360"></a> |

| Vitrine montada pelo CMS · tema escuro | Vitrine montada pelo CMS · tema claro |
| :--: | :--: |
| <a href="docs/screenshots/19-landing-cms-dark.png"><img src="docs/screenshots/19-landing-cms-dark.png" alt="Página pública com a paleta, o herói, o banner, as capacidades, o depoimento, a métrica e a FAQ cadastrados no banco, em tema escuro" width="360"></a> | <a href="docs/screenshots/19-landing-cms-claro.png"><img src="docs/screenshots/19-landing-cms-claro.png" alt="A mesma vitrine com o alternador no tema dia: a paleta cadastrada no CMS continua mandando no fundo e no texto" width="360"></a> |

| Modo manutenção | Texto legal publicado |
| :--: | :--: |
| <a href="docs/screenshots/19-manutencao.png"><img src="docs/screenshots/19-manutencao.png" alt="Tela de manutenção com a mensagem cadastrada, a contagem regressiva até a previsão de volta e o campo do código de pulso" width="360"></a> | <a href="docs/screenshots/19-legal-termos.png"><img src="docs/screenshots/19-legal-termos.png" alt="Página /legal/termos renderizando o documento publicado no banco, parágrafo por parágrafo" width="360"></a> |

| Editor `/app/cms` · Conteúdo (tema noite) | Editor · Conteúdo (tema dia) |
| :--: | :--: |
| <a href="docs/screenshots/20-cms-conteudo-dark.png"><img src="docs/screenshots/20-cms-conteudo-dark.png" alt="Editor do site público na aba Conteúdo, tema escuro: textos do topo, as sete cores da vitrine com quadrado e hexadecimal, herói, WhatsApp, contato e redes, cada bloco com o seu botão de gravar" width="360"></a> | <a href="docs/screenshots/20-cms-conteudo-claro.png"><img src="docs/screenshots/20-cms-conteudo-claro.png" alt="A mesma aba Conteúdo no tema dia, com o painel claro e a paleta cadastrada continuando legível" width="360"></a> |

| Itens da vitrine | Textos legais |
| :--: | :--: |
| <a href="docs/screenshots/20-cms-itens.png"><img src="docs/screenshots/20-cms-itens.png" alt="Aba Itens com o seletor de tipo, a lista dos cadastros e as ações de editar, esconder e excluir" width="360"></a> | <a href="docs/screenshots/20-cms-legais.png"><img src="docs/screenshots/20-cms-legais.png" alt="Aba Textos legais com Termos publicado, o botão discreto de rascunho e o dourado de publicar, e o endereço público do documento" width="360"></a> |

| Nota de SEO | Modo manutenção |
| :--: | :--: |
| <a href="docs/screenshots/20-cms-seo.png"><img src="docs/screenshots/20-cms-seo.png" alt="Aba SEO com a nota da página, o nível colorido e as 12 checagens da API com o peso de cada uma" width="360"></a> | <a href="docs/screenshots/20-cms-manutencao.png"><img src="docs/screenshots/20-cms-manutencao.png" alt="Aba Manutenção com o interruptor, a mensagem, a previsão de volta, os IPs permitidos e o código de pulso gerado na tela" width="360"></a> |

</div>

Duas séries fora do quadro de 1440×900 existem no repositório e são honestas sobre o próprio tamanho: as
capturas da Agenda e da navegação por abas (`docs/screenshots/17-agenda-*.png` e `18-tabs-*.png`) foram
feitas em **1440×960**, porque a barra de abas e o calendário não cabem nos 900 de altura. As capturas do
diálogo de confirmação e da sidebar (`16-sidebar-*.png`, `17-confirm-*.png`) mostram celular em 390px de
largura quando a legenda diz isso.

As capturas da vitrine (`19-*.png`) saíram do meio de `tools/verify-landing-cms.cjs` e são 1440×900,
menos `19-landing-cms-celular.png`, que é 390×844 porque mostra a barra de navegação recolhida no celular. O
conteúdo nelas — "Gestão empresarial com a cara do seu negócio", as capacidades e o depoimento de exemplo — foi
cadastrado pela própria prova, pela API, conferido na tela e apagado no fim, para a vitrine voltar ao padrão
da casa. `01-landing.png` é a mesma página com o banco do jeito que ele está hoje.

As capturas do editor (`20-*.png`) saíram de `tools/verify-cms.cjs`, em 1440×900, menos
`20-cms-celular.png` (390×844). Nelas está o conteúdo que a própria prova cadastrou pela tela — a headline
"Gestão empresarial com precisão e elegância" é o padrão da casa porque a prova devolve a vitrine ao padrão
no último passo, e confere isso recarregando o editor.

---

## Sobre o projeto

O **Nexus Business Manager** é um ERP SaaS multiempresa: uma instalação atende várias empresas, cada uma
enxergando só os próprios registros, com a própria equipe e os próprios papéis.

### Problema que resolve

A rotina de uma empresa pequena e média costuma viver espalhada: os clientes em uma planilha, o estoque em
outra, as vendas em um documento anexado, o financeiro no caderno e o agendamento na conversa de grupo. O
resultado é retrabalho, histórico que não fecha e nenhum número confiável no fim do mês.

O Nexus junta essa cadeia em um fluxo só — cliente → venda → baixa de estoque → lançamento financeiro →
relatório, com compras alimentando o estoque do lado de dentro e CRM e agenda sustentando a prospecção — e
registra quem fez o quê, quando, em qual empresa. A autorização e o isolamento por empresa acontecem no
servidor: não é a tela que decide o que a pessoa pode ver.

### Para quem

- Empresas de comércio e distribuição que vendem com estoque controlado
- Prestadores de serviço que precisam de clientes, financeiro e agenda no mesmo painel
- Redes e franquias com várias empresas atendendo com equipes separadas
- Contadores e gestores que precisam de trilha de auditoria por empresa

### O que a plataforma entrega

- **Isolamento real por empresa**: a empresa ativa vem do token e é revalidada contra `company_users` em
  toda requisição — um `company_id` digitado no frontend não vale nada (ADR-0002)
- **Autorização antes do botão**: o mapa de permissões `recurso:ação` é verificado no backend; sem
  permissão a resposta é 403, e o item nem aparece no menu
- **Indicador sem número inventado**: todo KPI do painel sai de uma agregação no MySQL daquela empresa,
  calculada no servidor
- **Estoque que ninguém digita**: venda confirmada dá saída, cancelamento devolve, compra recebida dá
  entrada — cada movimento fica registrado com tipo e referência
- **Conta fechada conferível**: total de venda e de compra é soma feita no servidor, nunca confiada ao
  navegador, e a exportação CSV entrega a mesma coleção que a listagem mostra
- **Trilha de auditoria**: cada escrita relevante grava autor, ação, entidade e empresa, e a tela de
  Auditoria é a leitura dessa trilha — inclusive com as alterações sensíveis marcadas
- **Interface nos dois temas**: noite sofisticada (`#0B0D10`) e dia elegante (`#F5F1EA`), com a escolha
  persistida no navegador, e a paleta extraída da logo oficial
- **Estados de verdade**: carregando, vazio, sem permissão, erro e nenhum resultado com estes filtros —
  em vez de uma tabela em branco fingindo que carregou

---

## Funcionalidades no ar

São as telas e regras que existem hoje no repositório. O que ainda não está aqui está listado em
[Módulos](#m%C3%B3dulos) e no [Roadmap](#roadmap).

### Autenticação

- Login com e-mail e senha, hash bcrypt com 12 rounds, access token JWT de 15 minutos e refresh token de
  7 dias
- Refresh token guardado **hasheado** (HMAC-SHA256) na tabela `refresh_tokens`, com rotação a cada uso e
  revogação explícita no logout e ao encerrar uma sessão
- Cadastro self-service (`/cadastro`): cria a conta, uma empresa própria e já entra como `OWNER` dela —
  por isso abrir empresa nova não exige estar dentro de uma empresa ativa
- Recuperação de acesso em duas etapas (`/recuperar-senha`): código de uso único com 30 minutos de
  validade, e a troca de senha revoga as sessões abertas da conta
- Rate limit próprio por rota sensível: 10 tentativas/min no login e 5/min em cadastro e recuperação,
  além do limite global de 100 req/min
- Política de senha única em todo o sistema — mínimo de 8 caracteres com ao menos uma maiúscula e um
  caractere especial — validada no backend (`passwordPolicy.ts`) e inline nos formulários
- Botão de olho para mostrar/ocultar senha em todo campo de senha (`PasswordInput`), inclusive na
  redefinição
- "Lembrar de mim" grava **só o e-mail**, no navegador, e esse e-mail nunca aparece escrito no campo de
  senha; a tela seguinte pede apenas a senha
- Deslogar devolve sempre à página de boas-vindas (`/`) com o histórico substituído — o botão "voltar" do
  navegador não reabre uma tela autenticada

### Autorização e papéis

- Quatro papéis (`OWNER`, `ADMIN`, `MANAGER`, `STAFF`) com um mapa central de permissões em
  `recurso:ação`; `OWNER` segura `"*"`
- `can` / `assertPermission` no backend respondem 403 antes de qualquer botão existir na tela; no
  frontend `useAuth().can` só serve para desenhar o que o backend já permite
- Matriz de permissões servida por rota de leitura (`recursos × read/write × papéis`) e mostrada na aba
  **Permissões (RBAC)** da tela de Usuários — leitura, não edição: papel se muda na linha do usuário
- Menu lateral montado a partir da permissão: camada cujo conteúdo a pessoa não pode ver some inteira,
  título junto; item sem rota não é desenhado
- Proteções que não dependem da boa vontade de quem está logado: o administrador global do projeto não
  perde `OWNER` nem é removido, e quem não é `OWNER` não mexe na linha de um `OWNER`

### Multiempresa

- Contexto de empresa derivado do token (`resolveCompanyContext`) e revalidado contra `company_users` a
  cada requisição — nada de confiar em `company_id` vindo do corpo ou da query (ADR-0002)
- Toda tabela de negócio carrega `company_id`, com índice composto quando a consulta é por empresa
- Troca de empresa ativa na tela de Configurações, com token novo emitido pelo servidor
  (`POST /api/auth/switch-company`)
- Teste dedicado de isolamento (`test/multiempresa.test.ts`): duas empresas, dois usuários, e uma requisição
  com o token da empresa A nunca enxerga o registro da empresa B

### Painel e relatórios

- Oito endpoints de agregação em `/api/reports` (visão geral, clientes, produtos, movimentações, vendas,
  compras, financeiro e CRM), todos calculados no servidor sobre a empresa do token
- Cartões do Dashboard com KPIs reais do mês, abas **Visão Geral / Metas & Indicadores / Alertas**, e cada
  alerta declarando a permissão necessária para ser mostrado — um atendente não vê alerta de financeiro se
  não tem `finance:read`
- Alertas que já existem: estoque baixo ou zerado, contas vencidas, clientes sem compra há mais de 30 dias
- Exportação CSV no navegador (`lib/csv.ts`) em Clientes, Produtos, Vendas, Compras, Financeiro e
  Auditoria, com o mesmo conjunto de dados que a listagem mostra

### Cadastros

- **Clientes**: lista com busca, tabela paginada no servidor, criação, edição e desativação lógica — o
  histórico de vendas e lançamentos fica guardado, e o cliente some apenas das escolhas novas
- **Produtos e estoque**: catálogo com SKU único **por empresa**, preço de custo e de venda em `Decimal`,
  unidade, estoque mínimo e controle por item; categorias por empresa; saldo é consequência das
  movimentações `IN`/`OUT`/`ADJUST` transacionais, e saída acima do saldo é recusada com 400
- Estoque baixo é encontrado com SQL bruto porque o Prisma não compara duas colunas (`stock < minStock`),
  e o mesmo estado vira aviso persistente para a equipe
- **Fornecedores**: nome único por empresa, exclusão lógica preservando o histórico de compras
- Toda listagem do produto passa pela mesma busca, pelo mesmo filtro, pela mesma paginação no rodapé e pelos
  mesmos estados desenhados de vazio e de nenhum resultado com estes filtros

### Operação

- **Vendas**: pedido com múltiplos itens, total, bruto e subtotais de linha calculados **no servidor** —
  o valor enviado pelo navegador é descartado; status `PENDING`/`CONFIRMED`/`CANCELLED` com transição
  vigiada; confirmar dá baixa no estoque com as saídas registradas, cancelar uma confirmada devolve as
  unidades; cliente e produtos são validados como pertencentes à mesma empresa
- Pedido rascunho que nunca entrou em vigor não anuncia "venda cancelada" à equipe — o aviso de venda só
  sai quando a venda de fato entra em vigor ou é cancelada de verdade
- **Compras**: pedido com itens e custo unitário, status `DRAFT`/`RECEIVED`/`CANCELLED`; receber dá
  entrada no estoque e atualiza o custo do produto; cancelar uma compra recebida estorna as unidades e é
  bloqueado se a mercadoria já foi consumida
- **Financeiro**: lançamentos de receita e despesa com valor, vencimento, status
  (`PENDING`/`PAID`/`CANCELLED`) e vínculo opcional a cliente, fornecedor e categoria; categorias por tipo
  (o mesmo nome pode existir nos dois); resumo mensal com receitas e despesas pagas, saldo, a receber, a
  pagar e atrasados; filtro por mês no formato `AAAA-MM` e validação cruzada de categoria × tipo
- **CRM**: leads com contato, origem, valor estimado e estágio (`NEW`/`CONTACTED`/`PROPOSAL`/`WON`/`LOST`),
  funil com contagem e soma por etapa, transição repetida bloqueada, e marcar **Ganho** converte o lead em
  cliente na hora — sem duplicar se repetir
- **Agenda**: compromissos por empresa com tipo, status, local, vínculo opcional a cliente e lead, leitura
  por **janela de tempo** (não por tabela inteira), FullCalendar 6 no navegador, e recorrência diária,
  semanal e mensal expandida em uma linha por data com o identificador da série. Mensal guarda o dia do mês
  e encolhe para o último dia quando o mês não tem aquele dia (31/01 vira 28/02); arrastar preservando a
  duração move a série inteira; excluir remove a série, e a contagem dos KPIs considera a série uma vez
  Encerrar, concluir e cancelar andam só pelo fluxo `SCHEDULED → DONE|CANCELLED` e `CANCELLED → SCHEDULED`.

### Notificações

A parte que grava e calcula está no ar; a parte que toca a pessoa (o sino no cabeçalho e a tela
`/app/notificacoes`) ainda não — enquanto isso o aviso fica nas listas e alertas das próprias telas.

- Cinco tipos com prioridade (Baixa/Média/Alta), link para a tela certa e chave antiduplicação: venda,
  estoque, lead, financeiro e relatório diário
- Quem praticou a ação nunca recebe o próprio aviso; uma falha ao gravar aviso fica no log e **não** quebra
  a venda, a compra ou o estoque
- Preferências por usuário e empresa com canal in-app e de e-mail separados. O canal de e-mail é guardado,
  mas nada é enviado enquanto não houver SMTP configurado — o sistema não finge que envia
- `GET /api/notifications/count` é a rota barata do sino (número, quebra por tipo e urgentes); a varredura
  de contas vencidas é rota administrativa só para `OWNER`/`ADMIN` e não repete o mesmo aviso dentro do mês

### Auditoria, equipe e sessões

- Trilha de auditoria por empresa com autor, ação, entidade, `entity_id`, metadados, IP e hora; escrita é
  automática nos services, a tela é somente leitura
- Abas **Logs do Sistema / Alterações Sensíveis / Exportação**; a marcação de alteração sensível é calculada
  no servidor para a paginação continuar honesta, e `lib/auditLabels.ts` traduz o código interno para a
  linguagem do negócio ("lead.contacted" → "Contato realizado")
- **Equipe**: membros por empresa com papel, convite de usuário existente, paginação global e a matriz de
  permissões na aba RBAC
- **Sessões**: a lista mostra os refresh tokens vivos (não revogados e não expirados) por usuário; encerrar
  uma linha revoga aquele aparelho, sem derrubar as outras sessões
- **Empresas**: criar empresa, listar as próprias empresas e ler a empresa ativa

### Interface e identidade

- Base administrativa AdminLTE 4 sobre um design system próprio com tokens CSS (ADR-0003), e Tailwind 4
  **sem preflight** — por isso convive com o Bootstrap do AdminLTE sem briga
- Paleta extraída da logo oficial (`docs/design/palette.md`): cobre, ouro e rosé sobre noite sofisticada
  (`#0B0D10`) e dia elegante (`#F5F1EA`), sem preto ou branco puros; tipografia de contexto com a marca em
  degradê cobre-ouro
- Tema claro/escuro com a escolha persistida no navegador, aplicado em landing, autenticação e todas as
  telas do painel, inclusive nos diálogos
- Sidebar em seis camadas (Visão Geral; Comercial & CRM; Estoque & Suprimentos; Serviços & Atendimentos;
  Financeiro; Administração & Sistema), com modo trilha de 78px, revelação por hover, gaveta com véu abaixo
  de 821px e preferência guardada em `localStorage`
- Navegação por **abas** nas nove páginas do sistema, com o estado na URL (`?aba=`), foco por setas do
  teclado e `role="tablist"`
- **Paginação no rodapé de toda tabela e listagem**: "Exibindo 1–10 de 50 · página 1 de 5", seletor de
  10/25/50/100, `pageSize` acima do limite devolve 400 no servidor, e listas que chegam inteiras usam o
  mesmo componente por paginação local
- **Um diálogo de confirmação só** (`ConfirmationModal`): Portal no fim do `<body>`, scrim com blur,
  armadilha de foco, nome do registro em negrito dourado, a consequência real escrita em texto, erro da API
  dentro do próprio diálogo, trava de duplo clique, e **nenhum** `alert`/`confirm`/`prompt` nativo em lugar
  nenhum do produto
- Toastr global para as conclusões, com um conjunto de rótulos centralizado (`lib/uiCopy.ts`) e mensagens
  com concordância de gênero por entidade
- Estados padronizados (`StateView`): `Skeleton` e `LoadingInline` para o que carrega, `EmptyState` para o
  vazio e para o nenhum resultado com os filtros atuais (com título, explicação e a ação que resolve),
  `ErrorState` com "Tentar novamente"; a proteção de rota (`ProtectedRoute`) leva quem não tem sessão ao
  login, e `/403`, `/401` e a 404 própria são páginas do produto, não mensagens do navegador
- formulário sujo pergunta "Descartar alterações?" antes de fechar, e a edição continua intacta se a pessoa
  desistir

### Página pública

A rota `/` é a vitrine da plataforma montada a partir do conteúdo do banco. `pages/Landing.tsx` busca
`GET /api/public/landing` e pinta a página com o que está cadastrado: as sete cores da marca entram como
variáveis CSS no elemento raiz, o herói recebe título, subtítulo, dois botões e imagem de fundo, e as faixas
de capacidades, banners, depoimentos, métricas e dúvidas saem dos itens ativos, na ordem cadastrada. Os textos
moram em `landing/copy.ts`, a animação de entrada é escalonada e respeita `prefers-reduced-motion`, e o
emblema continua animado no topo.

O que não existe no banco não aparece na tela. Sem depoimento ou métrica publicados a seção some, e as
âncoras do cabeçalho encolhem para o que realmente está na página; com o banco vazio a vitrine continua de pé
com as quatro capacidades do produto e os textos padrão da casa — nenhum número, cliente ou depoimento
inventado. A vitrine é uma só para toda a plataforma, então o conteúdo não tem `company_id` e as permissões
`content:read`/`content:write` ficaram com o OWNER:

- **Contato, redes e WhatsApp na tela** — `ContactSection` mostra telefone discável, e-mail, endereço e
  horário de atendimento; o rodapé lista as redes do bloco `social`; o botão flutuante do WhatsApp entra na
  posição escolhida (esquerda ou direita) e só quando o canal está ligado. O aviso de cookies aparece na
  primeira visita e guarda a escolha no navegador
- **Textos legais em `/legal/:kind`** — Termos, Privacidade e LGPD publicados pela API, divididos em
  parágrafos. Sem texto publicado a página diz isso em vez de escrever cláusula, e um slug desconhecido cai no
  mesmo aviso
- **Modo manutenção na tela** — com o modo ligado a vitrine dá lugar ao cartão com a mensagem cadastrada, a
  contagem regressiva ao vivo até a previsão de volta e o campo do código de pulso; aceito o código, o site
  volta na mesma aba e o pulso vive só naquela aba (`sessionStorage`), sem ir para o disco
- **Configuração (`GET/PATCH /api/cms/config`)** — cores, WhatsApp, SEO, herói (CTAs, imagem de fundo,
  overlay e desfoque), redes e contato. A gravação é bloco a bloco: mexer nas cores não apaga o WhatsApp, e
  o bloco ausente cai no padrão da casa
- **Itens por tipo (`/api/cms/items`)** — banners, capacidades, depoimentos (estrelas e empresa), métricas
  (valor e formato) e FAQs, com ordem e ativo/inativo; o `meta` Json guarda os extras de cada tipo
- **Leitura pública (`GET /api/public/landing`)** — o payload anônimo com cache de 10 segundos, cinco
  grupos de itens e o resumo da manutenção, de onde o token de pulso nunca sai
- **Textos legais** — Termos, Privacidade e LGPD em `/api/cms/legal`, e `/api/public/legal/:kind` responde
  404 enquanto o texto não estiver publicado
- **SEO medido (`GET /api/cms/seo/score`)** — nota e nível a partir de 12 checagens do que está de fato
  publicado, incluindo contato visível e textos legais
- **Modo manutenção** — gancho antes das rotas fecha a API de negócio com 503, mensagem e previsão, mas
  `/api/health`, `/api/auth`, `/api/public` e `/api/cms` ficam abertos porque é por ali que se desliga o
  modo. Passam o token de pulso (18 hex, comparado em tempo constante) e os IPs permitidos; o bypass público
  devolve só `{liberado}`

### Editor do site público (`/app/cms`)

O conteúdo da vitrine se cadastra numa tela, sem tocar na API. `pages/Cms.tsx` abre cinco abas sobre
`components/cms/`, e cada bloco de campos tem o próprio botão de gravar — salvar uma cor não reescreve o
WhatsApp, porque a chamada manda só o bloco que mudou:

- **Conteúdo** — textos do topo, as sete cores da vitrine (o quadrado de cor e o hexadecimal disputam o
  mesmo valor: o texto manda, o quadrado espelha cor válida), o herói com os dois botões e suas rotas,
  overlay e desfoque da imagem, o canal do WhatsApp com a posição do botão, o contato e as redes
- **Itens** — capacidades, banners, depoimentos, métricas e FAQs listados por tipo, com os campos extras de
  cada um (estrelas e empresa no depoimento, valor e formato na métrica), esconder e mostrar, e exclusão
  no diálogo de confirmação do sistema
- **Textos legais** — Termos, Privacidade e LGPD, cada um com a pílula do próprio estado; "Salvar
  rascunho" é botão discreto e "Publicar no site" é a cor de ação, porque as duas coisas não têm a mesma
  importância; o endereço público do documento aparece na tela
- **SEO** — os metadados e, ao lado, a nota que a API calcula sobre as 12 checagens do que está publicado,
  com o peso de cada uma e o que falta
- **Manutenção** — o interruptor que fecha a plataforma, com a confirmação que diz que as rotas de negócio
  caem em 503, a mensagem e a previsão de volta, a allowlist de IPs e o código de pulso gerado na tela

O cabeçalho do painel tem o atalho "Visualizar landing page", que abre `/` em outra aba, e o selo que diz
se o site está aberto ou em manutenção. A vitrine é única para toda a plataforma, então as permissões
`content:read`/`content:write` ficaram com o OWNER e os demais papéis recebem 403 no editor.

---

## Módulos

| Módulo | Banco | API | Tela | Estado |
|---|:--:|:--:|:--:|---|
| Autenticação, cadastro e recuperação | ✅ | ✅ 8 rotas | ✅ | no ar |
| Sessões e revogação de tokens | ✅ | ✅ | ✅ (aba Sessões) | no ar |
| Papéis e permissões (RBAC) | ✅ | ✅ | ✅ (aba Permissões) | no ar |
| Multiempresa (isolamento e troca) | ✅ | ✅ | ✅ (Configurações) | no ar |
| Clientes | ✅ | ✅ 5 rotas | ✅ | no ar |
| Produtos, categorias e estoque | ✅ | ✅ 11 rotas | ✅ | no ar |
| Vendas (pedido, itens, baixa) | ✅ | ✅ 4 rotas | ✅ | no ar |
| Compras e fornecedores | ✅ | ✅ 8 rotas | ✅ | no ar |
| Financeiro (lançamentos e resumo) | ✅ | ✅ 9 rotas | ✅ | no ar |
| CRM (leads e funil) | ✅ | ✅ 6 rotas | ✅ | no ar |
| Agenda (janela, recorrência, FullCalendar) | ✅ | ✅ 7 rotas | ✅ | no ar |
| Painel e relatórios agregados | ✅ | ✅ 8 rotas | ✅ | no ar |
| Auditoria | ✅ | ✅ | ✅ | no ar |
| Usuários e membros de empresa | ✅ | ✅ 6 rotas | ✅ | no ar |
| Notificações e preferências | ✅ | ✅ 7 rotas | 🚧 | backend no ar, sino e tela por fazer |
| Configurações da conta e aparência | ✅ | ✅ | 🚧 | tema, conta e troca de empresa no ar; endereço, logo, moeda, fuso e meta têm coluna e não têm tela |
| CMS da página pública (cores, herói, capacidades, banners, depoimentos, métricas, FAQ) | ✅ | ✅ 14 rotas | ✅ | no ar: a vitrine `/` é montada pelo conteúdo do banco e o editor `/app/cms` cadastra esse conteúdo nas cinco abas |
| Documentos legais (Termos, Privacidade, LGPD) | ✅ | ✅ | ✅ | `/legal/:kind` mostra só o que está publicado; rascunho e publicação na aba Textos legais do editor |
| Modo manutenção da plataforma | ✅ (mesma tabela) | ✅ | ✅ | 503 com mensagem e previsão na API e na tela, contagem regressiva, pulso em tempo constante, IP permitido e o código guardado na aba |
| Modelos de e-mail | ✅ | 🚧 | 🚧 | tabela `email_templates` criada; SMTP ainda não existe |
| Rotinas agendadas (cron) | ✅ | 🚧 | 🚧 | tabela `cron_jobs` criada, sem executor |
| Gateways e cobranças | ✅ | 🚧 | 🚧 | tabelas com provedores (`MERCADO_PAGO`, `EFI`, `STRIPE`) e ambiente; **nenhuma integração inventada** enquanto não houver credencial real |
| Ordens de serviço / atendimento em campo | 🚧 | 🚧 | 🚧 | só a linha "em breve" no menu — sem tabela, sem rota, sem botão morto |
| SaaS: planos, assinaturas e faturas | 🚧 | 🚧 | 🚧 | a caminho |
| Backup e restauração | 🚧 | 🚧 | 🚧 | a caminho |

Legenda: ✅ existe e é usado · 🚧 falta. Nenhuma linha do menu aponta para rota inexistente.

---

## Tecnologias

### Backend

| Ferramenta | Para quê |
|---|---|
| Node.js 20+ / TypeScript strict | runtime e tipagem sem `any` de conveniência |
| Fastify 5 | HTTP, validação por esquema e plugins de segurança |
| Prisma 6 | camada **única** de persistência (ADR-0001) — sem SQL solto fora de uma necessidade medida |
| MySQL 8 | banco (desenvolvimento local: WAMP, `localhost:3306`, schema `nexusbusinessmanager`) |
| @fastify/jwt | access tokens (15m) e refresh (7d) |
| bcryptjs | hash de senha com 12 rounds |
| Zod | validação de entrada em toda rota e do `.env` na subida (fail-fast) |
| helmet, @fastify/cors, @fastify/rate-limit | cabeçalhos, origem permitida por env e limite de requisições |
| Vitest | suíte de integração contra o MySQL real |

### Frontend

| Ferramenta | Para quê |
|---|---|
| React 18 + Vite 5 + TypeScript | aplicação de painel e página pública |
| react-router-dom 6 | rotas públicas, `/app/*` protegida e páginas de erro |
| AdminLTE 4.10 | casca administrativa do painel (ADR-0003) |
| Tailwind CSS 4 (sem preflight) | utilitários pontuais, sem brigar com o Bootstrap do AdminLTE |
| tokens CSS próprios (`styles/tokens.css`) | paleta, tipografia, tema claro/escuro e anéis de foco |
| Axios | HTTP com refresh em voo e single-flight (uma renovação por vez) |
| Toastr | avisos globais de conclusão |
| FullCalendar 6 | grade da Agenda (mês, semana, lista e arraste) com locale pt-BR |

Duas dependências continuam declaradas no `package.json` do web sem uso no `src`: `jquery` (o produto
importa só o CSS do AdminLTE) e `sweetalert2` (substituído pelo diálogo de confirmação da casa). Retirá-las
é decisão pendente do dono do projeto — não há chamadas de nenhuma delas no código.

### Camada própria (o que este projeto escreveu)

| Peça | Para quê |
|---|---|
| `apps/api/src/lib/` | erros centralizados, RBAC, contexto de empresa, auditoria, paginação, política de senha, tokens, bcrypt |
| `apps/api/src/plugins/` | segurança (helmet/CORS/rate-limit) e o decorator `authenticate` |
| `apps/web/src/lib/` | `api` (axios + renovação), `notify`, `confirm`, `csv`, `format`, `auditLabels`, `uiCopy`, `validators`, `tokenStore`, `cmsApi` |
| `apps/web/src/components/` | `AdminShell`, `Logo`, `Tabs`, `Pagination`, `Modal`, `ConfirmationModal`, `StateView`, `PageLoader`, `ErrorPage`, `PasswordInput`, `ProtectedRoute`, `ThemeToggle`, a suíte `landing/` e o editor `cms/` (`Campos` + os cinco painéis de aba) |
| `tools/*.cjs` | provas automatizadas no navegador (Puppeteer) e recaptura das telas deste README |

---

## Estrutura de pastas

```text
.
  apps/
    api/
      prisma/
        schema.prisma          27 models, 15 enums, todas as tabelas com @@map
        migrations/            12 migrations, da fundação ao conteúdo da vitrine
        seed.ts                admin global + conta de dev + empresa nexus-demo (vazia)
      src/
        app.ts                 15 módulos + modo manutenção antes das rotas + parser de corpo vazio
                               + handler de erro e 404
        config/env.ts          .env validado com Zod (subida falha cedo)
        lib/                   errors, rbac, company-context, audit, pagination, tokens, password, prisma
        plugins/               security.ts, auth.ts (decorator `authenticate`),
                                   maintenance.ts (gancho global com allowlist de volta)
        modules/               auth, companies, users, audit, clients, products, sales,
                               purchases, finance, crm, agenda, reports, notifications, cms, health
                               — cada módulo com <x>.routes.ts e <x>.service.ts
        test/                  14 arquivos de integração contra MySQL real + helpers.ts
    web/
      src/
        App.tsx                rotas públicas, /app/* protegida e as páginas de erro
        styles/                tokens.css, tailwind.css, global.css, components.css, landing.css, cms.css
        lib/                   api, confirm, notify, csv, format, auditLabels, uiCopy, validators,
                               tokenStore, landingApi, landingTypes, landingEstilo, cmsApi
        context/               AuthContext, ThemeContext
        components/            AdminShell, Tabs, Pagination, Modal, ConfirmationModal, StateView,
                               PasswordInput, ProtectedRoute, ThemeToggle, landing/, layout/, cms/
        pages/                 Landing, Legal, Login, Register, ForgotPassword, Dashboard, Clients,
                               Products, Sales, Purchases, Finance, CRM, Agenda, Users, Audit, Settings,
                               Cms, erros
  assets/brand/logo/           logo oficial e os recortes usados pelo favicon
  docs/
    ANALISE.md                 matriz de análise da fase 1, com evidências
    ANALISE-LACUNAS.md         lacunas contra o PROMPT MESTRE de 67 seções
    adr/                       0001 persistência única · 0002 multiempresa e RBAC · 0003 AdminLTE + design system
    design/palette.md          paleta oficial extraída da logo
    screenshots/               as capturas desta página
  tools/                       provas de navegador, recaptura de telas e utilitários do repo
  CHANGELOG.md                 histórico, mais novo primeiro
  CREDENCIAIS.md               (local, fora do git) a senha do administrador definitivo
```

---

## Arquitetura

```text
Navegador
  React Router (rotas públicas · /app/* protegida · erros)
        │
        ▼
  AdminShell / Landing ── AuthContext (can) ── ThemeContext
        │
        ▼  axios /api (access JWT, renovação single-flight)
────────────────────────────────────────────────────────────
API (Fastify)
  plugins/security ── plugins/auth (authenticate)
        │
        ▼
  <módulo>.routes.ts ── Zod ── resolveCompanyContext ── assertPermission ── audit
        │
        ▼
  <módulo>.service.ts ── transações e agregações
        │
        ▼
  Prisma ── MySQL (nexusbusinessmanager)
```

A regra de dependência, ao contrário, não vale: rota não fala com o banco, tela não decide permissão e
`company_id` de request não é contexto. Cada módulo tem `routes.ts` (validação, RBAC, auditoria) e
`service.ts` (Prisma); as três rotas que leem o banco direto — `health`, `audit` e `companies` — são
consultas simples declaradas no próprio arquivo. Um módulo só importa serviço de outro quando a regra é de
notificação (`sales`, `products` e `crm` chamam os avisos do módulo de notificações), e nada mais.

Contratos e erros:

- Listagens paginadas devolvem sempre `{ data, meta }`; quem pagina é o servidor
- Erros saem por `AppError` + handler central: Zod vira 400 com a mensagem em português, violação de
  unicidade (P2002) vira 409, limite de requisições vira 429, e em produção a resposta não leva stack
- Toda leitura de registro filtra por `companyId` (`findFirst` com a empresa do token), então um id de outra
  empresa simplesmente não existe para a consulta: a resposta é 404, e não uma pista sobre o registro alheio

---

## Banco de dados

Um único schema Prisma, com todas as tabelas em `snake_case` via `@@map` e os ids UUID (36 caracteres)
tipados como `VarChar(36)` para manter as chaves compostas dentro do limite do InnoDB em `utf8mb4`.

| Domínio | Modelos |
|---|---|
| Acesso e empresa | `User`, `Company`, `CompanyUser`, `RefreshToken`, `PasswordResetToken`, `AuditLog` |
| Comercial | `Client`, `Lead`, `AgendaEvent` |
| Catálogo e estoque | `ProductCategory`, `Product`, `StockMovement` |
| Vendas e compras | `Sale`, `SaleItem`, `Supplier`, `Purchase`, `PurchaseItem` |
| Financeiro | `FinanceCategory`, `FinanceEntry` |
| Notificações | `Notification`, `NotificationPreference` |
| Site público e operações (API no ar, tela por fazer) | `LandingConfig`, `LandingItem`, `LegalDocument`, `EmailTemplate`, `CronJob`, `PaymentGateway` |

Quinze enums dão o vocabulário: `Role`, `SaleStatus`, `PurchaseStatus`, `StockMovementKind`, `EntryType`,
`EntryStatus`, `LeadStatus`, `AgendaEventType`, `AgendaRecurrence`, `AgendaStatus`,
`NotificationPriority`, `LandingItemKind`, `LegalKind`, `GatewayProvider`, `GatewayEnvironment`.

Unicidade que importa: e-mail global; `slug` de empresa; `company_users (user_id, company_id)`; documento de
cliente, SKU de produto, nome de categoria, nome de fornecedor e nome+tipo de categoria financeira são únicos
**dentro da empresa**, não no banco inteiro. `dedupe_key` segura a duplicação de aviso nas varreduras.

Doze migrations, na ordem em que chegaram:

```text
init_foundation → add_clients → add_auth_flows → add_products_stock → add_sales →
add_suppliers_purchases → add_finance → add_crm → add_agenda → add_agenda_recorrencia →
add_admin_cms_ops → add_cms_content
```

Comandos:

```bash
npm run db:migrate                              # prisma migrate dev (aplica o que falta)
npm run prisma:migrate -w @nexus/api -- --name add_foo   # cria uma migration nova
npm run db:seed                                 # admin global + admin@nexus.local + empresa nexus-demo
npm run prisma:deploy -w @nexus/api             # sem prompt, para ambiente de máquina
npm run prisma:generate -w @nexus/api           # regera o client depois de mexer no schema
```

---

## Instalação

### Pré-requisitos

- Node.js 20+ e npm com workspaces
- MySQL 8 — no desenvolvimento local, o WAMP em `localhost:3306` com o banco `nexusbusinessmanager` já
  criado (o Prisma cria as tabelas, não o banco)

### Passo a passo

```bash
npm install
cp apps/api/.env.example apps/api/.env
# edite apps/api/.env: DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
# e SEED_ADMIN_PASSWORD com a senha do administrador definitivo (CREDENCIAIS.md)

npm run db:migrate            # aplica as 12 migrations
npm run db:seed               # admin global + admin@nexus.local + empresa nexus-demo (vazia)
```

### Atalhos da raiz

| Comando | O que faz |
|---|---|
| `npm run dev:api` | API em `http://localhost:3001` (prefixo `/api`), com `tsx watch` |
| `npm run dev:web` | painel em `http://localhost:5173`, com proxy para `/api` |
| `npm run typecheck` | `tsc --noEmit` nos dois apps |
| `npm test` | suíte de integração da API contra o MySQL real |
| `npm run build` | `tsc` da API + `vite build` do painel |
| `npm run db:migrate` / `db:seed` | Prisma no workspace da API |

### Produção

`npm run build` gera `apps/api/dist` (Node) e `apps/web/dist` (estáticos servíveis por qualquer servidor).
Antes de subir: `NODE_ENV=production`, segredos de JWT novos e distintos dos de desenvolvimento,
`CORS_ORIGIN` apontando para o endereço público, `RATE_LIMIT_MAX` ajustado ao tráfego esperado, e a senha do
administrador **lida de variável de ambiente**, nunca de arquivo versionado. Não há `Dockerfile` nem pipeline
de CI no repositório — estão no roadmap.

### Contas e acesso

- **Administrador definitivo do projeto** — `nexusbussiness.admin@gmail.com`, `OWNER` em todas as empresas,
  protegido contra remoção e rebaixamento no backend e no seed. A senha fica apenas no `CREDENCIAIS.md` da
  sua máquina (arquivo local, ignorado pelo git) e é lida de `SEED_ADMIN_PASSWORD` na hora do seed — nada de
  credencial no repositório ou no histórico.
- **Conta de desenvolvimento** — `admin@nexus.local` / `Nexus@2026`, `OWNER` da empresa `nexus-demo`; é a
  conta usada pela suíte de testes. Ela é versionada de propósito, porque é local e descartável.
- Cadastro self-service em `/cadastro` para criar conta e empresa própria sem tocar no seed.

Regra de senha em todo o sistema: mínimo 8 caracteres, com ao menos uma letra maiúscula e um caractere
especial — validada no backend e em todo formulário.

---

## Configuração

O `.env` da API é validado com Zod na subida: variável obrigatória ausente ou fora do formato derruba o
processo com a mensagem do caminho exato, em vez de deixar o serviço subir quebrado.

| Variável | Padrão | Para quê |
|---|---|---|
| `NODE_ENV` | `development` | `production` desliga stack trace e mensagens internas |
| `PORT` / `HOST` | `3001` / `0.0.0.0` | porta e interface de escuta |
| `CORS_ORIGIN` | `http://localhost:5173` | lista separada por vírgula das origens permitidas |
| `DATABASE_URL` | — (obrigatória) | `mysql://usuario:senha@host:3306/nexusbusinessmanager` |
| `JWT_ACCESS_SECRET` | — (obrigatória) | segredo do access token, mínimo 16 caracteres |
| `JWT_REFRESH_SECRET` | — (obrigatória) | segredo do refresh, distinto do de access |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | `15m` / `7d` | validade dos tokens |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` | `100` / `60000` | limite global por janela |
| `SEED_ADMIN_PASSWORD` | — | senha do administrador global, lida só pelo `seed.ts`, que para com aviso se estiver ausente |

---

## Segurança

| Área | Como está hoje |
|---|---|
| Senha | bcrypt 12 rounds; política de 8+/maiúscula/especial no backend e nos formulários; nenhum valor de senha registrado no git, e o histórico foi reescrito antes do primeiro push |
| Tokens | access JWT de curta duração; refresh hasheado (HMAC-SHA256) com rotação, revogação por sessão e revogação total ao trocar a senha de recuperação |
| Autorização | mapa central `recurso:ação` verificado no servidor em toda rota de escrita; 403 antes de qualquer botão existir na tela. Conteúdo do site público é recurso `content`, só do OWNER |
| Isolamento | empresa ativa vem do token e é revalidada contra `company_users` a cada request; toda leitura filtra por `companyId`, então registro de outra empresa devolve 404; teste dedicado de vazamento entre tenants |
| Validação | Zod em todas as entradas; categorias e tipos cruzados validados; `pageSize` acima do limite devolve 400 |
| Tráfego | helmet, CORS restrito por env, rate-limit global 100/min e limites próprios em login (10/min), cadastro e recuperação (5/min) e bypass da manutenção (30/min) |
| Disponibilidade | modo manutenção fecha a API de negócio com 503 e deixa `/api/health`, `/api/auth`, `/api/public` e `/api/cms` abertos; quem entra com o token de pulso (comparação em tempo constante) ou o IP permitido |
| Auditoria | toda escrita relevante grava autor, empresa, ação, entidade, metadados e IP; tela somente leitura; marcação de alteração sensível feita no servidor |
| Respostas de erro | handler central com códigos coerentes (400/401/403/404/409/429/500) e sem stack em produção |
| Terceiros | **nenhuma integração inventada**: gateways de pagamento e SMTP têm tabela mas não têm chamada; o canal de e-mail fica guardado e desligado enquanto não houver credencial real |

---

## Testes

```bash
npm run typecheck          # api + web
npm test                   # 14 arquivos · 81 testes de integração contra MySQL real
npm run build              # produção (tsc + vite build)
```

| Arquivo | O que prova |
|---|---|
| `auth.test.ts`, `auth-flows.test.ts` | login, refresh com rotação, revogação, cadastro, recuperação em duas etapas, troca de empresa |
| `rbac.test.ts` | as quatro matrizes de papel, 403 por rota, administrador global protegido |
| `multiempresa.test.ts` | nenhum dado vaza entre empresas do mesmo usuário e de usuários diferentes |
| `pagination.test.ts` | `{data, meta}` coerente e `pageSize` acima do limite → 400 |
| `clients.test.ts`, `products.test.ts`, `sales.test.ts`, `purchases.test.ts`, `finance.test.ts`, `crm.test.ts`, `agenda.test.ts` | regras de negócio de cada módulo, incluindo baixa e estorno de estoque, custo atualizado na compra recebida, conversão de lead em cliente e expansão de recorrência |
| `notifications.test.ts` | aviso chega à equipe mas não a quem agiu, prioridade do estoque zerado, preferência por tipo, contador do sino, varredura uma vez por mês e bloqueio de varredura por atendente |
| `cms.test.ts` | payload público sem vazamento de pulso, RBAC por papel, merge bloco a bloco, item que nasce, some e exclui de verdade, texto legal antes e depois de publicar, nota SEO, o modo manutenção com pulso e IP, e POST sem corpo aceito enquanto JSON escrito errado continua 400 |

Além da suíte, o repositório guarda provas que dirigem o navegador (Puppeteer) e medem pixels, com as
capturas desta página como subproduto:

| Prova | Checagens |
|---|---|
| `tools/verify-cms.cjs` | 115 — o editor `/app/cms` aba por aba: cada gravação conferida no payload público e na vitrine renderizada, item criado/escondido/editado/excluído pelo modal, texto legal saindo do 404 para a página, nota de SEO igual na tela e na API, o site fechado em 503 com mensagem e relógio, o código de pulso gerado e usado, tudo devolvido ao padrão, os dois temas e os 390px |
| `tools/verify-landing-cms.cjs` | 105 — a vitrine montada pelo banco: texto, paleta nos dois temas, âncoras, itens, contato, WhatsApp, cookies, SEO, páginas legais, três larguras sem arrasto e a manutenção de ponta a ponta (contagem, pulso, IP e o código na sessão) |
| `tools/verify-sidebar.cjs` | 87 — ordem e tipografia das seis camadas, itens por permissão, modo trilha, peek, linhas "em breve" e o tema claro |
| `tools/verify-acoes-confirm.cjs` | 88 — coluna de ações de nove tabelas, anatomia do diálogo, trava de duplo clique, Esc durante a requisição, tema claro e celular |
| `tools/shoot-tabs.cjs` | 447 — abas, paginação, respiro medido e legibilidade do histórico em 9 páginas, desktop e celular |
| `tools/shoot-crm.cjs` | 42 — funil, KPIs, filtros, mudança de estágio, conversão conferida na tela de Clientes e celular sem overflow |
| `tools/shoot-modal.cjs` | 26 — anatomia do modal, foco, trava de scroll, temas e empilhamento |

---

## Demonstração

O `seed` não fabrica dados de negócio: ele cria as duas contas, a empresa `nexus-demo` **vazia** e dá
`OWNER` da empresa ao administrador global e à conta de desenvolvimento. Entrando, os cartões do painel
aparecem nos estados de vazio e "nenhum resultado com estes filtros", que é o comportamento projetado — o
caminho para uma base apresentável é cadastrar produto, abrir uma venda e confirmá-la, ou registrar um
lançamento financeiro; as provas de navegador fazem exatamente isso e devolvem os registros ao estado
original quando terminam.

Para uma vitrine com dados, rode a suíte (`npm test`) contra o banco de desenvolvimento: os testes escrevem
de verdade e deixam clientes, produtos, vendas, compras, financeiro, leads e compromissos para os
indicadores contarem.

---

## Roadmap

### Concluído

Fundação (auth, RBAC, multiempresa, auditoria, tema, estados globais, Toastr, diálogo de confirmação,
paginação, páginas de erro) · cadastros operacionais (clientes, produtos e estoque) · operação (vendas com
baixa e estorno, compras e fornecedores, financeiro, CRM com conversão, agenda com recorrência e FullCalendar
6) · painel com relatórios agregados e CSV · equipe, matriz RBAC e sessões com revogação · notificações no
servidor com preferências e varredura · CMS da vitrine no servidor e na tela (configuração bloco a bloco,
itens por tipo com `meta`, a página pública montada a partir do banco, textos legais publicados, nota de SEO
medida e modo manutenção com contagem regressiva, pulso e IP) · editor `/app/cms` com as cinco abas de
conteúdo, itens, textos legais, SEO e manutenção, cada bloco gravando sozinho ·
sidebar em camadas com peek e gaveta · abas e paginação padronizadas em todas as telas · identidade Premium
Gourmet nos dois temas, favicon oficial e as provas automatizadas desta página · credencial do administrador
fora do git, com histórico reescrito antes do primeiro push.

### A seguir

1. **Sino e tela de notificações** — o backend já entrega `/count`, lista e preferências; falta a interface
2. **Configurações completas** — endereço, logo, moeda, fuso, idioma e meta de receita têm coluna e não têm
   tela; falta o formulário com as regras de cada campo
3. **Modelos de e-mail** — a tela de Termos, Privacidade e LGPD depende da mesma rota de edição do CMS;
   SMTP só depois de haver credencial real
4. **Rotinas agendadas** — executor das varreduras hoje manuais (contas vencidas, relatório diário)
5. **Gateways e cobranças** — só com credencial de ambiente; nada de integração de fachada
6. **Ordens de serviço / atendimento** — módulo novo com o mesmo padrão de estado vigiado e auditoria
7. **SaaS: planos, assinaturas e faturas** · **backup e restauração** · **CI** com suíte automatizada na
   cada push

---

## Histórico de versões

O detalhamento está em [`CHANGELOG.md`](CHANGELOG.md) (Keep a Changelog, mais novo primeiro, em português).

| Trilha | O que entrou |
|---|---|
| `13b6126 → 7534a7a` | Fundação: backend (auth, RBAC, multiempresa, auditoria) e frontend com design system Premium Gourmet |
| `65428b0 → 5c4cd26` | Identidade refinada, marca em degradê cobre-ouro, regra definitiva de acesso, política de senha e fluxos de cadastro/recuperação |
| `bf5b1ca → 25610a9` | Telas de autenticação em relevo, página de Clientes, "lembrar de mim" invisível no campo, favicon oficial |
| `c4943a6 → 146edd7` | Deslogar volta às boas-vindas, responsividade sem arrasto horizontal |
| `5c39a74 → 6eed706` | Módulos Produtos/Estoque, Vendas, Compras/Fornecedores e Financeiro, com testes desde a primeira entrega |
| `d9542ae → 3d79a87` | CRM na API e na tela, modal único do sistema, sidebar que se adapta à tela |
| `2322df1 → 484ba44` | CRM completo, agenda com recorrência, exportações CSV e abas em todas as telas |
| `3b5c6c5 → 99cae5b` | Notificações persistentes no servidor e o diálogo central de confirmação |
| `d81c164 → e18a855` | Sidebar em camadas com o mapa real do produto; a senha do administrador saiu do repositório, com histórico reescrito |
| `7e507d8` | Provas da sidebar e do diálogo recapturadas |
| `60941a3 → 02971b4` | README como ficha do produto e CMS da vitrine no servidor: conteúdo bloco a bloco, itens com `meta`, textos legais publicados, SEO medido e modo manutenção com pulso e IP |
| `2c50ea4 → 5e44160` | A página pública passou a ser montada a partir do banco — paleta, herói, capacidades, depoimentos, métricas, dúvidas, contato, WhatsApp, cookies, `/legal/:kind` e a tela de manutenção com contagem e pulso; POST sem corpo voltou a ser ação e a suíte fechou em 81 testes |
| `5dce492 → editor` | O editor do CMS chegou: `/app/cms` com as cinco abas, o botão de manutenção que acompanha o rascunho, rascunho e publicação em cores diferentes, a nota de SEO com as 12 checagens na tela, o atalho único para a vitrine e a prova `verify-cms.cjs` com 115 checagens e dez capturas |

---

## Desenvolvedor

| | |
|---|---|
| **Clayton Marcelo** | Desenvolvimento full-stack do Nexus Business Manager |
| <a href="https://github.com/claytonmarcelo"><img src="https://img.shields.io/badge/GitHub-claytonmarcelo-181717?logo=github&logoColor=white" alt="GitHub"></a> | repositório: [claytonmarcelo/Nexus-Business-Manager](https://github.com/claytonmarcelo/Nexus-Business-Manager) |

Licença: uso não autorizado a terceiros (`UNLICENSED` no `package.json` raiz) — o código é protegido pela
marca e pela autoria declaradas em cada tela do produto.

---

<p align="center">
  <sub>© <strong>Nexus Business Manager</strong> · desenvolvido por <strong>Clayton Marcelo</strong> ·
  gestão empresarial com precisão e elegância.</sub>
</p>
