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
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" alt="Vite 7">
  <img src="https://img.shields.io/badge/AdminLTE-4.10-343a40?logo=laravel&logoColor=white" alt="AdminLTE 4.10">
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind 4">
  <img src="https://img.shields.io/badge/testes-230%20testes%20em%2028%20arquivos-brightgreen" alt="230 testes em 28 arquivos">
</p>

<p align="center">
  <sub>Estágio atual: a fundação e os módulos do dia a dia estão no ar — autenticação, papéis,
  multiempresa, clientes, produtos e estoque, vendas, compras, financeiro, CRM, agenda, auditoria e
  equipe. A página pública já é montada a partir do conteúdo do banco — cores, herói, capacidades,
  depoimentos, métricas, dúvidas, contato, textos legais e a tela de modo manutenção; o editor
  <code>/app/cms</code> cadastra tudo isso; nas notificações o sino do cabeçalho e a tela
  <code>/app/notificacoes</code> estão no ar, e <code>/app/rotinas</code> mostra, pausa e dispara as três varreduras
  que o sistema faz sozinho no horário marcado, e a nota confirmada já cai no financeiro em parcelas mensais
  que fecham o centavo. O que existe como tabela pronta mas sem módulo (modelos de
  e-mail e gateways de pagamento) e o que ainda nem tem tabela está marcado um por um em
  <a href="#m%C3%B3dulos">Módulos</a> e no <a href="#roadmap">Roadmap</a>. Nada no menu aponta para uma
  rota que não existe: módulo em construção aparece apagado, com "em breve".</sub>
</p>

---

## Telas

Capturas do sistema rodando (Fastify + Prisma sobre MySQL no backend, React + AdminLTE 4 no frontend),
todas no quadro de **1440×900**, duas por linha e na mesma escala de exibição. Cada imagem é um link: o
clique abre o arquivo no tamanho capturado. As seis abaixo são o caminho mais curto pelo produto: a
vitrine pública, a entrada, o painel com os números da empresa ativa, as vendas, o financeiro e o editor
que monta a vitrine. O resto das capturas continua no repositório — saiu da galeria, não do disco.

Os números que aparecem nas telas saíram do banco local de desenvolvimento no dia das capturas. O `seed`
cria a empresa `nexus-demo` **vazia** — não há dados de fachada no código; os registros que os indicadores
contam vieram das provas automatizadas e dos testes de integração, que escrevem de verdade na mesma base.

<div align="center">

| Página pública · tema escuro | Entrada · tema escuro |
| :--: | :--: |
| <a href="docs/screenshots/01-landing.png"><img src="docs/screenshots/01-landing.png" alt="Página pública de boas-vindas em tema escuro, com a marca animada no palco, título, subtítulo e o switch de tema" width="360"></a> | <a href="docs/screenshots/02-login.png"><img src="docs/screenshots/02-login.png" alt="Tela de login com e-mail, senha com botão de revelar, lembrar de mim e link de recuperação, em relevo neumórfico no tema escuro" width="360"></a> |

| Painel (Dashboard) | Vendas |
| :--: | :--: |
| <a href="docs/screenshots/03-dashboard.png"><img src="docs/screenshots/03-dashboard.png" alt="Painel em tema escuro com os cartões de indicadores contados no banco da empresa ativa, abas de Metas e Alertas" width="360"></a> | <a href="docs/screenshots/11-vendas.png"><img src="docs/screenshots/11-vendas.png" alt="Tela de Vendas com a lista de pedidos, pílulas de situação e as ações de confirmar e cancelar" width="360"></a> |

| Financeiro | Editor da vitrine · tema escuro |
| :--: | :--: |
| <a href="docs/screenshots/13-financeiro.png"><img src="docs/screenshots/13-financeiro.png" alt="Tela do Financeiro com os KPIs do mês, lançamentos a pagar e receber e a central de categorias" width="360"></a> | <a href="docs/screenshots/20-cms-conteudo-dark.png"><img src="docs/screenshots/20-cms-conteudo-dark.png" alt="Editor do site público na aba Conteúdo, tema escuro: textos do topo, as sete cores da vitrine com quadrado e hexadecimal, herói, WhatsApp, contato e redes, cada bloco com o seu botão de gravar" width="360"></a> |

</div>

As outras capturas continuam em `docs/screenshots/` com a origem declarada: a vitrine montada pelo banco
(`19-*`) saiu de `tools/verify-landing-cms.cjs`; o editor (`20-*`), de `tools/verify-cms.cjs`; os avisos
(`21-*`), de `tools/verify-notificacoes.cjs`; as rotinas agendadas (`23-*`), de `tools/verify-rotinas.cjs`;
as Configurações (`22-*`), de `tools/verify-configuracoes.cjs`; e a venda parcelada caindo no financeiro
(`24-*`), de `tools/verify-parcelamento.cjs`;
a agenda e a navegação por abas (`17-*`, `18-*`) saíram em **1440×960** porque calendário e barra de abas
não cabem nos 900 de altura; e os arquivos com `-celular` no nome têm 390×844. Nas capturas de prova o
conteúdo cadastrado pela própria volta ao padrão da casa no último passo — `01-landing.png` é a vitrine
com o banco do jeito que ele está hoje.

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
- Toda sessão que termina devolve a pessoa à página de boas-vindas (`/`) com o histórico substituído — pelo
  botão "Sair", pela expiração no meio do trabalho, pela revogação ou pelo logout feito em outra aba. O
  motivo do fim é registrado na saída e lido por quem decide o destino, então o botão "voltar" do navegador
  não reabre uma tela autenticada e a vitrine avisa em Toastr quando a sessão é que expirou. Quem chega sem
  sessão nenhuma — sem nunca ter entrado — continua indo ao login, com a rota de origem guardada. Sair do
  sistema não apaga nenhuma preferência deste navegador, nem o tema escolhido

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
  unidades; cliente e produtos são validados como pertencentes à mesma empresa; e o total se divide em
  parcelas mensais (`installments`, 1 = à vista)
- Pedido rascunho que nunca entrou em vigor não anuncia "venda cancelada" à equipe — o aviso de venda só
  sai quando a venda de fato entra em vigor ou é cancelada de verdade
- **Compras**: pedido com itens e custo unitário, status `DRAFT`/`RECEIVED`/`CANCELLED`; receber dá
  entrada no estoque e atualiza o custo do produto; cancelar uma compra recebida estorna as unidades e é
  bloqueado se a mercadoria já foi consumida; mesmo parcelamento da venda, do lado do fornecedor
- **Financeiro**: lançamentos de receita e despesa com valor, vencimento, status
  (`PENDING`/`PAID`/`CANCELLED`) e vínculo opcional a cliente, fornecedor e categoria; categorias por tipo
  (o mesmo nome pode existir nos dois); resumo mensal com receitas e despesas pagas, saldo, a receber, a
  pagar e atrasados; filtro por mês no formato `AAAA-MM` e validação cruzada de categoria × tipo
- **Venda e compra caem no financeiro** (`Company.autoFinanceSales` / `autoFinancePurchases`, desligados por
  padrão nas duas pontas, cada lado com a sua chave): confirmada a venda — ou recebida a compra — com a
  chave ligada, a nota gera no caixa uma linha por parcela mensal, criada na MESMA transação que baixou o
  estoque, em centavo exato, com a última parcela fechando a conta (R$ 100,00 em 3 são 33,33 + 33,33 +
  33,34) e vencimento no mesmo dia do mês seguinte, clampado no último dia quando o mês não tem aquele dia.
  Cada lançamento guarda de qual documento veio (`saleId`/`purchaseId`), a categoria "Vendas"/"Compras" nasce
  uma vez só por empresa, e cancelar tira apenas as parcelas ainda pendentes — o que já foi pago fica à vista
  para o dono estornar de propósito. Ligado sem perguntar duplicaria o caixa de quem já lança à mão, por
  isso o padrão é desligado
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

O aviso nasce no servidor quando alguém faz algo que a equipe precisa saber, e chega ao sino do cabeçalho em
qualquer tela do painel — sem recarregar a página, sem biblioteca de ícones nova e sem batida em aba escondida.

- **Sino no cabeçalho** (`components/layout/NotificationBell.tsx`): o número de não lidos, em tom de urgente
  quando há urgente, e os últimos seis avisos no painel que abre ao lado do botão. A batida pergunta só
  contagens (`GET /api/notifications/count`) a cada 45 segundos; a lista chega quando a pessoa abre o painel.
  Cada linha marca como lida na API e leva à tela do aviso, e o rodapé tem "Marcar todas como lidas" e "Ver
  todos os avisos". Fecha em Esc e no clique fora, com `aria-expanded`/`aria-controls`
- **Tela `/app/notificacoes`** (`pages/Notifications.tsx`): três abas sobre o padrão do sistema (Todos os
  avisos / Não lidos, com o badge da contagem / Preferências, todas alcançáveis por `?aba=`), pílulas de não
  lidos e urgentes, chip por tipo com o número de cada um, filtro combinado com lidas/não lidas, paginação
  feita no servidor e as ações Abrir e Marcar lida na linha. O botão "Marcar todos" passa pelo diálogo de
  confirmação da casa, e "Ver contas vencidas agora" só aparece para quem tem `settings:write`
- **Preferências na tela**: os cinco tipos com rótulo do negócio, canal in-app por tipo, canal de e-mail
  desligado com o motivo declarado (sem SMTP não há envio), gravar travado até algo mudar de fato e "Voltar ao
  padrão". A empresa e o dono vêm sempre do token — não há seletor de empresa aqui
- Sino e tela conversam pelo evento `nexus:avisos` (`lib/notificationsApi.ts`), então marcar lida num lugar
  atualiza o número do outro sem recarregar página nenhuma
- Cinco tipos com prioridade (Baixa/Média/Alta), link para a tela certa e chave antiduplicação: venda,
  estoque, lead, financeiro e relatório diário
- Quem praticou a ação nunca recebe o próprio aviso; uma falha ao gravar aviso fica no log e **não** quebra
  a venda, a compra ou o estoque
- Preferências por usuário e empresa com canal in-app e de e-mail separados. O canal de e-mail é guardado,
  mas nada é enviado enquanto não houver SMTP configurado — o sistema não finge que envia
- `GET /api/notifications/count` é a rota barata do sino (número, quebra por tipo e urgentes): com a aba
  escondida a batida para, e voltar para a aba puxa a contagem na hora. `POST /api/notifications/scan`, a
  varredura de contas vencidas, é administrativa — só `OWNER`/`ADMIN` — e não repete o mesmo aviso dentro do
  mês

### Configurações da conta e da empresa

- Quatro abas num endereço só (`?aba=`) — Minha conta, Empresa, Aparência e Empresas — com cada bloco
  gravando sozinho, mandando só o que mudou e mostrando o erro da API embaixo do campo correspondente
- Conta: nome e telefone da própria pessoa (todo papel pode), e-mail de acesso visível mas não editável, e
  troca de senha autenticada que encerra as outras sessões mantendo esta aba conectada
- Empresa: cadastro (nome, razão social, nome fantasia, CNPJ com dígito verificador conferido, e-mail,
  telefone), endereço com as 27 UFs, moeda, fuso e idioma, logo por endereço público com prévia e meta de
  receita do mês, que vira a régua do painel
- Política da empresa, em blocos independentes: saída de estoque que pode deixar saldo negativo (Fase 3b) e
  as duas chaves de lançamento automático no financeiro — venda confirmada e compra recebida, cada uma com o
  seu botão, porque o hábito de quem anota o que entra não é o de quem anota o que sai (Fase 3e)
- Máscara não é validação: CNPJ, telefone e CEP se organizam durante a digitação, mas quem confere os
  algarismos e decide se o valor existe é a API (`apps/api/src/lib/brFields.ts`) — a tela não guarda uma
  segunda cópia da regra para discordar da primeira
- Aparência: o tema é escolha deste navegador, e o formato de números e datas é dado da empresa — a aba
  mostra o mesmo valor e a mesma data escritos com a configuração atual e diz onde cada um se ajusta
- Quem não tem `settings:write` lê tudo e não grava nada: no lugar do botão, o bloco explica que só quem
  administra a empresa grava ali

### Rotinas agendadas

- Três varreduras no relógio do servidor, escrevendo aviso pelo mecanismo de notificações que já existia:
  contas vencidas às 07:00, estoque baixo às 07:05 e o relatório do dia anterior às 08:00 — o sino avisa sem
  que ninguém precise abrir uma tela
- O cron é interpretado por parser próprio de cinco peças, com lista, intervalo e passo; agenda
  inválida volta 400 apontando a peça, e a tela mostra a tradução em português ("todos os dias às 07:00")
- O executor é um só: o relógio e o botão "Executar agora" chamam a mesma função, que não deixa a mesma
  rotina rodar duas vezes ao mesmo tempo e grava última execução, status, mensagem e duração na `cron_jobs`
- Cada varredura tem chave de duplicação por dia ou por mês — rodar duas vezes no mesmo dia não gera dois
  avisos — e o relatório diário só chega a quem ligou a preferência daquele tipo
- `/app/rotinas` traz agenda, próxima execução e último resultado de cada rotina, com pausar passando pelo
  diálogo de confirmação; rotas e botões só para quem tem `settings:write`
- `CRON_ENABLED=0` desliga o relógio do processo: a suíte de testes sobe o app sem relógio nenhum, e um
  segundo servidor não marca a hora duas vezes

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
variáveis CSS no elemento raiz — no tema a que elas pertencem, medido pela luminância do fundo cadastrado; no
outro tema a vitrine volta aos tokens do produto, e é isso que faz o alternador Dark/Light valer também aqui —
o herói recebe título, subtítulo, dois botões e imagem de fundo, e as faixas
de capacidades, banners, depoimentos, métricas e dúvidas saem dos itens ativos, na ordem cadastrada. Os textos
moram em `landing/copy.ts`, a animação de entrada é escalonada e respeita `prefers-reduced-motion`, e o
emblema continua animado no topo.

O que não existe no banco não aparece na tela. Sem depoimento ou métrica publicados a seção some, e o cabeçalho
da vitrine carrega só o que não muda: a marca, o tema e a porta de entrada; com o banco vazio a vitrine continua de pé
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
  `/api/health`, `/api/auth`, `/api/public`, `/api/cms` e `/api/notifications` ficam abertos porque é por ali
  que se desliga o modo — o sino toca em toda tela do painel e não há motivo para ele virar erro na tela de
  quem entrou para reabrir o site; continua pedindo token de sessão. Passam o token de pulso (18 hex,
  comparado em tempo constante) e os IPs permitidos; o bypass público devolve só `{liberado}`

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
| Vendas (pedido, itens, baixa, parcelas) | ✅ | ✅ 4 rotas | ✅ | no ar |
| Compras e fornecedores | ✅ | ✅ 8 rotas | ✅ | no ar |
| Financeiro (lançamentos, resumo e o carnê que a nota gera) | ✅ | ✅ 9 rotas | ✅ | no ar |
| CRM (leads e funil) | ✅ | ✅ 6 rotas | ✅ | no ar |
| Agenda (janela, recorrência, FullCalendar) | ✅ | ✅ 7 rotas | ✅ | no ar |
| Painel e relatórios agregados | ✅ | ✅ 8 rotas | ✅ | no ar |
| Auditoria | ✅ | ✅ | ✅ | no ar |
| Usuários e membros de empresa | ✅ | ✅ 6 rotas | ✅ | no ar |
| Notificações e preferências | ✅ | ✅ 7 rotas | ✅ | no ar: sino no cabeçalho em toda tela do painel e `/app/notificacoes` com abas, filtros por tipo, paginação no servidor e preferências |
| Configurações da conta e da empresa | ✅ | ✅ 5 rotas | ✅ | no ar: `/app/configuracoes` em quatro abas — conta, cadastro e endereço da empresa, moeda/fuso/idioma, logo, meta de receita e troca de empresa |
| CMS da página pública (cores, herói, capacidades, banners, depoimentos, métricas, FAQ) | ✅ | ✅ 14 rotas | ✅ | no ar: a vitrine `/` é montada pelo conteúdo do banco e o editor `/app/cms` cadastra esse conteúdo nas cinco abas |
| Documentos legais (Termos, Privacidade, LGPD) | ✅ | ✅ | ✅ | `/legal/:kind` mostra só o que está publicado; rascunho e publicação na aba Textos legais do editor |
| Modo manutenção da plataforma | ✅ (mesma tabela) | ✅ | ✅ | 503 com mensagem e previsão na API e na tela, contagem regressiva, pulso em tempo constante, IP permitido e o código guardado na aba |
| Modelos de e-mail | ✅ | 🚧 | 🚧 | tabela `email_templates` criada; SMTP ainda não existe |
| Rotinas agendadas (cron) | ✅ | ✅ 3 rotas | ✅ | no ar: `/app/rotinas` com as três varreduras do relógio — contas vencidas, estoque baixo e relatório diário —, liga/pausa e "Executar agora" |
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
| React 18 + Vite 7 + TypeScript | aplicação de painel e página pública |
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
| `apps/api/src/lib/` | erros centralizados, RBAC, contexto de empresa, auditoria, paginação, política de senha, tokens, bcrypt, dinheiro em centavo (`money.ts`), o dia da empresa (`time.ts`) e o carnê que a nota gera no caixa (`installments.ts`) |
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
        app.ts                 16 módulos + modo manutenção antes das rotas + parser de corpo vazio
                               + handler de erro e 404
        config/env.ts          .env validado com Zod (subida falha cedo)
        lib/                   errors, rbac, company-context, audit, pagination, tokens, password, prisma
        plugins/               security.ts, auth.ts (decorator `authenticate`),
                                   maintenance.ts (gancho global com allowlist de volta)
        modules/               auth, companies, users, audit, clients, products, sales,
                               purchases, finance, crm, agenda, reports, notifications, cms, cron, health
                               — cada módulo com <x>.routes.ts e <x>.service.ts
        test/                  16 arquivos de integração contra MySQL real + helpers.ts
    web/
      src/
        App.tsx                rotas públicas, /app/* protegida e as páginas de erro
        styles/                tokens.css, tailwind.css, global.css, components.css, landing.css,
                               cms.css, notificacoes.css
        lib/                   api, confirm, notify, csv, format, auditLabels, uiCopy, validators,
                               tokenStore, landingApi, landingTypes, landingEstilo, cmsApi, notificationsApi, cronApi
        context/               AuthContext, ThemeContext
        components/            Tabs, Pagination, Modal, ConfirmationModal, StateView,
                               PasswordInput, ProtectedRoute, ThemeToggle, landing/, cms/,
                               layout/ (AdminShell, NotificationBell)
        pages/                 Landing, Legal, Login, Register, ForgotPassword, Dashboard, Clients,
                               Products, Sales, Purchases, Finance, CRM, Agenda, Users, Audit, Settings,
                               Cms, Notifications, Rotinas, erros
  assets/brand/logo/           logo oficial e os recortes usados pelo favicon
  docs/
    ANALISE.md                 matriz de análise da fase 1, com evidências
    ANALISE-LACUNAS.md         lacunas contra o PROMPT MESTRE de 67 seções
    AUDITORIA.md               auditoria comercial: achados por severidade e o que foi feito de cada um
    STATUS-AJUSTES.md          situação de cada tarefa do prompt de mercado, com a prova apontada
    decisoes/                  G1 a G6 — SMTP, cobrança, fiscal, cadastro aberto, hospedagem e licença
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
| Site público e operações | `LandingConfig`, `LandingItem`, `LegalDocument`, `CronJob`, `EmailTemplate`, `PaymentGateway` — site, manutenção e rotinas já têm tela; modelos de e-mail e gateways seguem só tabela |

Quinze enums dão o vocabulário: `Role`, `SaleStatus`, `PurchaseStatus`, `StockMovementKind`, `EntryType`,
`EntryStatus`, `LeadStatus`, `AgendaEventType`, `AgendaRecurrence`, `AgendaStatus`,
`NotificationPriority`, `LandingItemKind`, `LegalKind`, `GatewayProvider`, `GatewayEnvironment`.

Unicidade que importa: e-mail global; `slug` de empresa; `company_users (user_id, company_id)`; documento de
cliente, SKU de produto, nome de categoria, nome de fornecedor e nome+tipo de categoria financeira são únicos
**dentro da empresa**, não no banco inteiro. `dedupe_key` segura a duplicação de aviso nas varreduras.

Dezessete migrations, na ordem em que chegaram:

```text
init_foundation → add_clients → add_auth_flows → add_products_stock → add_sales →
add_suppliers_purchases → add_finance → add_crm → add_agenda → add_agenda_recorrencia →
add_admin_cms_ops → add_cms_content → add_platform_role → add_refresh_used_at →
add_company_allow_negative_stock → add_documento_vinculo_financeiro → add_refresh_token_empresa
```

As quatro migrations que chegaram na execução da auditoria trazem as linhas de reversão escritas no próprio
SQL; nenhuma migration aplicada foi editada depois de sair — correções chegaram como migration nova.

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
npm run prisma:generate -w @nexus/api   # sem isto, nada compila (docs/AUDITORIA.md N9)
cp apps/api/.env.example apps/api/.env
# edite apps/api/.env: DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
# SEED_ADMIN_PASSWORD com a senha do administrador definitivo (CREDENCIAIS.md)
# e SEED_DEV_PASSWORD com a senha da conta de desenvolvimento

npm run db:migrate            # aplica as 17 migrations
npm run db:seed               # admin global + admin@nexus.local + empresa nexus-demo (vazia)
```

### Atalhos da raiz

| Comando | O que faz |
|---|---|
| `npm run dev:api` | API em `http://localhost:3001` (prefixo `/api`), com `tsx watch` |
| `npm run dev:web` | painel em `http://localhost:5173`, com proxy para `/api` |
| `npm run typecheck` | `tsc --noEmit` nos dois apps |
| `npm test` | suíte de integração da API contra o MySQL real |
| `npm run test:coverage` | a mesma suíte medindo a própria cobertura (instruções, ramificações, funções, linhas) |
| `npm run build` | `tsc` da API + `vite build` do painel |
| `npm run db:migrate` / `db:seed` | Prisma no workspace da API |

### Produção

`npm run build` gera `apps/api/dist` (Node) e `apps/web/dist` (estáticos servíveis por qualquer servidor).
Antes de subir: `NODE_ENV=production`, segredos de JWT novos e distintos dos de desenvolvimento,
`CORS_ORIGIN` apontando para o endereço público, `RATE_LIMIT_MAX` ajustado ao tráfego esperado, e a senha do
administrador **lida de variável de ambiente**, nunca de arquivo versionado.

A API não sobe com configuração de tutorial: em `NODE_ENV=production` o processo morre na inicialização, com
a lista inteira do problema na mensagem, se um segredo tiver menos de 32 caracteres ou contiver
`troque`/`change`/`secret`/`exemplo`, se os dois segredos forem iguais, se o CORS apontar para `localhost`,
`127.0.0.1` ou coringa, se o banco conectar como `root` sem senha, ou se `AUTH_EXPOSE_RESET_TOKEN=1` ficar
aceso. Atrás de proxy reverso, `TRUST_PROXY` declara quantos saltos são confiáveis (0 desliga, 1 confia no
proxy imediato, até 31) — sem isso o IP registrado na auditoria e usado no rate-limit é o do proxy.

O seed é a outra trava: em produção ele aborta antes da primeira consulta se `ALLOW_DEV_SEED` não estiver
definido, e a conta de desenvolvimento só nasce fora de produção. Não há `Dockerfile` nem pipeline de CI no
repositório — estão no roadmap, e as decisões de hospedagem estão em `docs/decisoes/G5-hospedagem-e-backup.md`.

### Contas e acesso

- **Administrador definitivo do projeto** — `nexusbussiness.admin@gmail.com`, `OWNER` em todas as empresas,
  protegido contra remoção e rebaixamento no backend e no seed. A senha fica apenas no `CREDENCIAIS.md` da
  sua máquina (arquivo local, ignorado pelo git) e é lida de `SEED_ADMIN_PASSWORD` na hora do seed — nada de
  credencial no repositório ou no histórico.
- **Conta de desenvolvimento** — `admin@nexus.local`, `OWNER` da empresa `nexus-demo`; é a conta usada pela
  suíte de testes e pelas provas de navegador. A senha não mora no código: vem de `SEED_DEV_PASSWORD`, e o
  seed para com aviso se a variável estiver ausente. Fora de produção ela nasce sempre; em produção só nasce
  se `SEED_DEV_ACCOUNT=1` for declarado de propósito.
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
| `CRON_ENABLED` | `1` | `0` desliga o relógio das rotinas neste processo (deixa só um servidor agendando) |
| `TRUST_PROXY` | `0` | saltos de proxy reverso confiáveis: `0` desliga, `1` confia no imediato, até `31`; fora desse formato a API não sobe |
| `BODY_LIMIT_BYTES` | `1048576` | tamanho máximo de corpo dito no `.env`, não no default do framework |
| `SUPER_ADMIN_EMAIL` | vazio | endereço do administrador global; fora de produção cai no padrão de desenvolvimento, em produção é obrigatório |
| `AUTH_EXPOSE_RESET_TOKEN` | `0` | `1` devolve o código de recuperação na resposta — só para desenvolvimento; em produção o valor `1` derruba a subida |
| `SEED_ADMIN_PASSWORD` | — | senha do administrador global, lida só pelo `seed.ts`, que para com aviso se estiver ausente |
| `SEED_DEV_PASSWORD` | — | senha da conta de desenvolvimento `admin@nexus.local`; também só no `seed.ts`, e o seed para se ela faltar |
| `SEED_DEV_ACCOUNT` | `0` | `1` força a conta de desenvolvimento mesmo em produção (uso explícito de homologação) |
| `ALLOW_DEV_SEED` | `0` | única maneira de o seed rodar em `NODE_ENV=production`; sem ele o seed aborta antes da primeira consulta |

Em `NODE_ENV=production` a validação ganha uma régua extra (segredo de no mínimo 32 caracteres e sem marca
de exemplo, CORS público, banco fora de root, `AUTH_EXPOSE_RESET_TOKEN` desligado): qualquer violação derruba
o processo na inicialização com a lista completa na mensagem. O código dessa régua é puro e testado em
`validador-de-producao.test.ts`.

---

## Segurança

| Área | Como está hoje |
|---|---|
| Senha | bcrypt 12 rounds; política de 8+/maiúscula/especial no backend e nos formulários; nenhum valor de senha registrado no git, e o histórico foi reescrito antes do primeiro push |
| Tokens | access JWT de curta duração; refresh hasheado (HMAC-SHA256) com rotação, revogação por sessão e revogação total ao **concluir** a troca de senha — pedir a recuperação não derruba mais a sessão da vítima, e o código só volta na resposta com `AUTH_EXPOSE_RESET_TOKEN=1` fora de produção |
| Sessão e empresa | o refresh grava em qual empresa foi aberto (`company_id`) e renova dentro dela, com fallback para a primeira ativa do usuário; listar e revogar sessões é filtrado por empresa (id de outra empresa devolve 404, mesma empresa sem ser dono devolve 403), e o IP de origem só aparece para OWNER/ADMIN |
| Acesso revogado | desativar a conta ou a empresa derruba o acesso na hora: toda requisição revalida o vínculo no banco junto das duas bandeiras de ativação (conta e empresa), então um access token ainda válido emitido antes não abre a porta depois da desativação — e reativar devolve o acesso sem precisar de login novo |
| Autorização | mapa central `recurso:ação` verificado no servidor em toda rota de escrita; 403 antes de qualquer botão existir na tela. A hierarquia de papéis decide em um lugar só — ninguém atribui papel acima do próprio, e ADMIN não toca em OWNER nem em outro ADMIN. Conteúdo do site público é recurso `content`, só do OWNER |
| Isolamento | empresa ativa vem do token e é revalidada contra `company_users` a cada request; toda leitura filtra por `companyId`, então registro de outra empresa devolve 404; teste dedicado de vazamento entre tenants |
| Validação | Zod em todas as entradas; categorias e tipos cruzados validados; `pageSize` acima do limite devolve 400 |
| Tráfego | helmet, CORS restrito por env, rate-limit global 100/min e limites próprios em login (10/min), cadastro e recuperação (5/min) e bypass da manutenção (30/min) |
| Disponibilidade | modo manutenção fecha a API de negócio com 503 e deixa `/api/health`, `/api/auth`, `/api/public`, `/api/cms` e `/api/notifications` abertos (o sino continua pedindo sessão); quem entra com o token de pulso (comparação em tempo constante) ou o IP permitido |
| Auditoria | toda escrita relevante grava autor, empresa, ação, entidade, metadados e IP; tela somente leitura; marcação de alteração sensível feita no servidor |
| Respostas de erro | handler central com códigos coerentes (400/401/403/404/409/429/500) e sem stack em produção |
| Terceiros | **nenhuma integração inventada**: gateways de pagamento e SMTP têm tabela mas não têm chamada; o canal de e-mail fica guardado e desligado enquanto não houver credencial real |

---

## Testes

```bash
npm run typecheck          # api + web
npm test                   # api: 28 arquivos · 230 testes contra MySQL real — web: 4 arquivos · 20 testes no jsdom
npm run test:api           # só a suíte da API
npm run test:web           # só a suíte do navegador (Vitest + jsdom + Testing Library)
npm run test:coverage      # a mesma suíte com a cobertura medida
npm run build              # produção (tsc + vite build)
```

| Arquivo | O que prova |
|---|---|
| `auth.test.ts`, `auth-flows.test.ts` | login, refresh com rotação, revogação, cadastro, recuperação em duas etapas, troca de empresa, e o cadastro de "Marcos Silva" que cria a empresa "Marcos (minha empresa)" sem acento nem espaço no slug |
| `rbac.test.ts` | as quatro matrizes de papel, 403 por rota, administrador global protegido |
| `rbac-hierarquia.test.ts` | a hierarquia decidindo em um lugar só: ADMIN não cria OWNER, não rebaixa ninguém, não mexe no próprio papel nem no de outro ADMIN; MANAGER e STAFF ficam fora de toda rota de papel; o último dono não sai do papel, e com dois donos rebaixar o outro é lícito |
| `desativacao-acesso.test.ts` | o access token que ainda está na mão do usuário cai quando a conta é desativada, volta quando ela reativa, e uma empresa inativa fecha o módulo para todo mundo — inclusive o proprietário |
| `sessoes-empresa.test.ts` | quem trocou para a empresa B continua na B ao renovar o token, a lista de sessões da A não mostra a sessão aberta na B, id de outra empresa devolve 404, e gerente e atendente não leem o IP de origem |
| `multiempresa.test.ts` | nenhum dado vaza entre empresas do mesmo usuário e de usuários diferentes |
| `pagination.test.ts` | `{data, meta}` coerente e `pageSize` acima do limite → 400 |
| `clients.test.ts`, `products.test.ts`, `sales.test.ts`, `purchases.test.ts`, `finance.test.ts`, `crm.test.ts`, `agenda.test.ts` | regras de negócio de cada módulo, incluindo baixa e estorno de estoque, custo atualizado na compra recebida, conversão de lead em cliente e expansão de recorrência |
| `notifications.test.ts` | aviso chega à equipe mas não a quem agiu, prioridade do estoque zerado, preferência por tipo, contador do sino, varredura uma vez por mês e bloqueio de varredura por atendente |
| `cms.test.ts` | payload público sem vazamento de pulso, RBAC por papel, merge bloco a bloco, item que nasce, some e exclui de verdade, texto legal antes e depois de publicar, nota SEO, o modo manutenção com pulso e IP, e POST sem corpo aceito enquanto JSON escrito errado continua 400 |
| `settings.test.ts` | escrita parcial que não apaga o bloco que não veio, `""` e `null` que limpam, CNPJ conferido no servidor, DDD, UF, moeda e fuso fora da lista rejeitados, campo inventado em 400, `settings:write` só para dono e administrador, conta editável por todo papel e troca de senha que derruba as outras sessões |
| `cron.test.ts` | as cinco peças com lista, intervalo e passo, as formas inválidas que voltam 400, a agenda traduzida, o RBAC de `/ops/jobs`, liga e pausa, e as três rotinas executadas de verdade — vencida que grava aviso com chave de duplicação, estoque crítico e relatório diário que só chega a quem ligou a preferência |
| `intrusao.test.ts`, `multiempresa.test.ts` | um OWNER da empresa A ataca todas as rotas com os ids da empresa B e leva 404, 403 ou 400 em cada porta — a varredura é por rota, não por módulo |
| `seguranca.test.ts` | portas que não podem subir sem chave, reuso de refresh tratado como roubo (a família inteira de sessões cai) e os cabeçalhos de produção |
| `oversell.test.ts` | sete cenários que martelam a mesma linha em paralelo: duas confirmações da mesma nota, duas vendas disputando o saldo, a mesma compra recebida duas vezes, duas saídas manuais simultâneas, cancelar e receber ao mesmo tempo, o mesmo produto em duas linhas (6+6 sobre saldo 10) que devolve 400 sem escrever nada, e o saldo que é exatamente a soma do razão — o banco decide, nunca o JavaScript |
| `validador-de-producao.test.ts` | a régua de produção como função pura: segredo abaixo de 32 caracteres, os dois iguais ou com marca de exemplo, CORS de localhost/IP local/coringa, banco `root` sem senha e `AUTH_EXPOSE_RESET_TOKEN=1` cada um recusado; `TRUST_PROXY` aceitando só 0 a 31; e o `env.ts` que derruba o processo em vez de subir quebrado |
| `seed-seguro.test.ts` | o seed abortando em produção sem `ALLOW_DEV_SEED` sem escrever usuário nenhum, o motivo dito inteiro, a ausência de `SEED_ADMIN_PASSWORD` parando qualquer ambiente, e a prova de que nenhuma senha de conta de desenvolvimento mora no código |
| `estoque-politica.test.ts` | a saída barrada enquanto a empresa não autorizou, o negativo visível depois de ligar a chave, e a política lida por empresa nas três portas de saída |
| `fuso-dia.test.ts` | meia-noite de São Paulo, Tóquio e Calcutá calculadas à mão, borda de calendário contra borda de instante, série diária e contas vencidas no dia da empresa, e o fuso quebrado que não derruba painel nem sino |
| `dinheiro-decimal.test.ts` | meio centavo que sobe na base 10, a armadilha do `round` do decimal embutido no Prisma, 2026 parcelas de R$ 0,10 fechando em 20 260 centavos, a porta nos três formatos de digitação e a invariante total = soma das linhas em nota real |
| `parcelamento.test.ts` | política desligada que não escreve caixa nenhum, à vista que gera uma linha no dia da empresa, 3 parcelas fechando o centavo com vencimento mensal clampado, rascunho que só lança ao confirmar, cancelar que tira as pendentes e preserva a paga, despesa da compra recebida, categoria automática criada uma vez, o carnê invisível para a outra empresa e a porta que recusa parcela inválida |
| `fim-de-sessao.test.tsx` (web) | sete sessões montadas no jsdom pelo caminho de verdade, com a rede parada no adaptador do axios: o interceptor de 401, o `AuthContext` e o `ProtectedRoute` exercitados juntos — logout pelo botão, `nexus:session-expired` no meio da tela de vendas, `/app` aberto por quem não tem sessão, o evento de `storage` de outra aba, o tema que sobrevive ao sair, o 401 sem refresh token em disco e a renovação recusada no bootstrap |
| `tema-landing.test.tsx` (web) | o alternador na vitrine montada pelo CMS: os dois sentidos, as cores da vitrine mudando junto, a escolha que volta ao remontar a página, o teclado com rótulo acessível e o tema aplicado antes do primeiro paint do React |
| `paleta-da-vitrine.test.ts` (web) | a luminância WCAG que decide se a paleta cadastrada é escura ou clara, e o que entra e o que sai do elemento quando ela veste — ou não — o tema ativo, inclusive com cor vazia ou fora do formato |
| `cores-da-landing.test.ts` (web) | a varredura de cor fixa nos estilos da vitrine: nenhum `#` fora dos tokens do tema, com a única exceção listada e justificada |

Além da suíte, o repositório guarda provas que dirigem o navegador (Puppeteer) e medem pixels, com as
capturas desta página como subproduto:

| Prova | Checagens |
|---|---|
| `tools/verify-notificacoes.cjs` | 85 — o sino e a tela de avisos sobre dado fabricado pela própria prova: número conferido com a API, painel com os seis recentes, marcar lida no banco seguindo para o Financeiro, as três abas com badge, paginação medida contra `meta.total` do servidor, filtro por tipo, CRM sem aviso do tipo, marcar todos até o vazio, preferências gravadas, lidas de novo após reload e devolvidas ao padrão, tema claro e os 390px |
| `tools/verify-cms.cjs` | 115 — o editor `/app/cms` aba por aba: cada gravação conferida no payload público e na vitrine renderizada, item criado/escondido/editado/excluído pelo modal, texto legal saindo do 404 para a página, nota de SEO igual na tela e na API, o site fechado em 503 com mensagem e relógio, o código de pulso gerado e usado, tudo devolvido ao padrão, os dois temas e os 390px |
| `tools/verify-landing-cms.cjs` | 120 — a vitrine montada pelo banco: texto, a paleta cadastrada vestindo só o tema a que pertence (escuro pinta, claro devolve os tokens ao produto, com o contraste das duas leituras medido), o toque a 6 px do desenho do alternador trocando o tema nos 54×45, o cabeçalho só com marca, tema e acesso, itens, contato, WhatsApp, cookies, SEO, páginas legais, o "Sobre" em duas colunas encostado na linha de 1200px, três larguras sem arrasto e a manutenção de ponta a ponta (contagem, pulso, IP e o código na sessão) |
| `tools/verify-configuracoes.cjs` | 127 — as quatro abas do `/app/configuracoes` gravando de verdade: telefone e CNPJ conferidos na tela e na API, um bloco salvo sem tocar nos outros (agora são sete blocos na aba Empresa, cada um mandando só as chaves que são suas), CEP/UF/cidade, moeda que chega à sessão e ao painel, meta que vira régua, as duas políticas por empresa, o STAFF lendo tudo sem botão de gravar, troca de senha que não despeja a pessoa, os dois temas e os 390px — com empresa e conta devolvidas ao estado de antes |
| `tools/verify-parcelamento.cjs` | 55 — a venda parcelada de ponta a ponta na tela, sobre uma empresa de prova criada e apagada pela própria volta: o seletor de doze parcelas, o preço digitado "1.290,50" valendo R$ 1.290,50 na linha e no rodapé, nota pendente que não escreve caixa nenhum, confirmar que escreve as três parcelas exatas no financeiro, o cancelamento que esvazia o caixa e devolve o estoque, e a compra recebida em 2× caindo como despesa na categoria Compras |
| `tools/verify-rotinas.cjs` | 37 — a tela `/app/rotinas` com as três varreduras, agenda traduzida e próxima execução conferidas contra a API; "Executar agora" que grava o aviso no banco e mostra no toast a mensagem da rotina; pausar pelo diálogo de confirmação e retomar; o atendente sem permissão; o tema claro e os 390px — jobs, avisos e usuário de prova devolvidos ao estado de antes |
| `tools/verify-logout.cjs` | 22 — as cinco portas de saída da sessão, cada uma pelo caminho de verdade: o botão "Sair" do painel, o 401 de uma chamada de negócio sem refresh token em disco (com o aviso de Toastr medido na tela), o logout feito na segunda aba aberta nesta prova, a renovação recusada pelo servidor no reload e — para não confundir as duas coisas — quem abre `/app` sem sessão nenhuma, que continua indo ao login. Junto: o tema claro atravessando entrar e sair, o refresh que sai do disco, o "voltar" do navegador batendo em tela sem painel e nenhum `alert()` no caminho |
| `tools/verify-sidebar.cjs` | 88 — ordem e tipografia das seis camadas, itens por permissão, modo trilha, peek, linhas "em breve", o cabeçalho sem repetir a marca e o tema claro |
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
servidor com preferências e varredura, sino no cabeçalho e a tela `/app/notificacoes` com abas, filtros e
paginação no servidor · CMS da vitrine no servidor e na tela (configuração bloco a bloco,
itens por tipo com `meta`, a página pública montada a partir do banco, textos legais publicados, nota de SEO
medida e modo manutenção com contagem regressiva, pulso e IP) · editor `/app/cms` com as cinco abas de
conteúdo, itens, textos legais, SEO e manutenção, cada bloco gravando sozinho · tela de Configurações em quatro abas (conta, empresa, aparência e
empresas), com cadastro, endereço, moeda, fuso, idioma, logo e meta de receita gravando bloco a bloco ·
integridade de negócio auditada e fechada (estoque decidido pelo banco, política de negativo por empresa,
meia-noite no fuso da empresa, dinheiro em centavo do banco ao JSON e a venda confirmada caindo no financeiro
em parcelas mensais que fecham a conta) · rotinas agendadas no relógio do
servidor com parser de cron próprio, executor único e a tela `/app/rotinas` com liga/pausa · blindagem de
acesso e configuração (Bloco A): hierarquia de papéis centralizada, desativação que cai na hora, sessão presa
à empresa, recuperação de senha que não derruba a vítima, seed e produção sem senha no código, e cobertura
medindo a si mesma ·
sidebar em camadas com peek e gaveta · abas e paginação padronizadas em todas as telas · identidade Premium
Gourmet nos dois temas, favicon oficial e as provas automatizadas desta página · credencial do administrador
fora do git, com histórico reescrito antes do primeiro push.

### A seguir

1. **Modelos de e-mail** — cadastrar e editar os modelos guardados em `email_templates`;
   SMTP só depois de haver credencial real
2. **Gateways e cobranças** — só com credencial de ambiente; nada de integração de fachada
3. **Ordens de serviço / atendimento** — módulo novo com o mesmo padrão de estado vigiado e auditoria
4. **SaaS: planos, assinaturas e faturas** · **backup e restauração** · **CI** com suíte automatizada a
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
| `4793f16 → sino` | O sino entrou em cena: contador no cabeçalho em toda tela do painel, painel dos seis avisos recentes, `/app/notificacoes` com três abas, filtro por tipo, paginação no servidor e preferências, o sino liberado no portão de manutenção e a prova `verify-notificacoes.cjs` com 85 checagens e seis capturas |
| `5dce492 → editor` | O editor do CMS chegou: `/app/cms` com as cinco abas, o botão de manutenção que acompanha o rascunho, rascunho e publicação em cores diferentes, a nota de SEO com as 12 checagens na tela, o atalho único para a vitrine e a prova `verify-cms.cjs` com 115 checagens e dez capturas |
| `d529919 → da9e17e` | Configurações da conta e da empresa em quatro abas: cadastro conferido no servidor, moeda/fuso/idioma regendo o painel, logo, meta de receita e troca de senha que derruba as outras sessões; prova `verify-configuracoes.cjs` com 108 checagens e a suíte em 102 testes |
| `da9e17e → rotinas` | O relógio do servidor entrou em cena: parser de cron próprio, três varreduras que avisam pelo sino, executor único para a agenda e para o botão "Executar agora", `/app/rotinas` com liga/pausa, prova `verify-rotinas.cjs` com 37 checagens e a suíte em 113 testes |
| `0adf4a7 → agora` | Duas regras que estavam escritas e não valiam. A vitrine voltou a escutar o alternador: a paleta cadastrada veste só o tema a que pertence, o alvo do toque chegou a 44 px e o tema salvo volta antes do primeiro *flash*. E toda sessão encerrada — pelo botão, por expiração, por 401 sem renovação possível, por logout em outra aba ou por renovação recusada no *bootstrap* — voltou a chegar às boas-vindas, com aviso em Toastr e o portão garantindo o destino; a prova `verify-logout.cjs` foi reescrita (22 checagens) e a suíte chegou a 250 testes: 230 na API e 20 no navegador |
| `rotinas → Fase 3` | A auditoria comercial (`docs/AUDITORIA.md`) virou execução: Fase 1 blindou o isolamento (escrita com a empresa no `where` por construção, super admin separado do admin de empresa, portas fechadas sem chave, suíte de intrusão A×B) e a Fase 3 fechou a integridade de negócio — estoque decidido pelo banco, política de negativo por empresa, meia-noite no fuso da empresa, dinheiro em centavo do banco ao JSON e a venda confirmada caindo no financeiro em parcelas que fecham o centavo; suíte em 176 testes e as provas `verify-parcelamento.cjs` (55) e `verify-configuracoes.cjs` (127) |
| `Fase 3 → Bloco A` | O prompt de mercado começou a ser cumprido: hierarquia de papéis em um lugar só, conta ou empresa desativada perdendo o acesso na hora, refresh token preso à empresa da sessão, recuperação de senha que não derruba a vítima nem entrega código em produção, seed e configuração de produção sem senha no código (a API recusa subir mal configurada), varredura de expressões regulares consertada e as duas provas que faltavam no estoque atômico. Cobertura passou a ser medida (`npm run test:coverage`), `docs/STATUS-AJUSTES.md` virou o painel do que está feito, e as seis decisões que pedem a palavra do dono (e-mail, cobrança, fiscal, cadastro aberto, hospedagem e licença) foram escritas em `docs/decisoes/` sem nenhuma integração inventada — suíte em 230 testes |

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
