<p align="center">
  <img src="assets/brand/logo/logo.png" alt="Nexus Business Manager" width="220">
</p>

<h1 align="center">Nexus Business Manager</h1>

<p align="center">
  <strong>ERP SaaS multiempresa — a operação inteira da empresa em um só painel</strong><br>
  Clientes, produtos e estoque, vendas, compras, financeiro, CRM, agenda, equipe com papéis,
  notificações e auditoria — com isolamento por empresa verificado no servidor a cada requisição.
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

---

## Sumário

1. [Sobre o projeto](#sobre-o-projeto)
2. [Estado atual](#estado-atual)
3. [Telas](#telas)
4. [Funcionalidades](#funcionalidades)
5. [Módulos](#módulos)
6. [Tecnologias](#tecnologias)
7. [Arquitetura e estrutura de pastas](#arquitetura-e-estrutura-de-pastas)
8. [Banco de dados](#banco-de-dados)
9. [Instalação](#instalação)
10. [Configuração](#configuração)
11. [Segurança](#segurança)
12. [Testes](#testes)
13. [Demonstração](#demonstração)
14. [Roadmap](#roadmap)
15. [Histórico de versões](#histórico-de-versões)
16. [Desenvolvedor e licença](#desenvolvedor-e-licença)

---

## Sobre o projeto

O **Nexus Business Manager** é um ERP SaaS multiempresa: uma instalação atende várias empresas, cada uma
enxergando só os próprios registros, com a própria equipe e os próprios papéis.

### Problema que resolve

Na empresa pequena e média, clientes ficam em uma planilha, estoque em outra, vendas em documentos
anexados, financeiro no caderno e agenda na conversa de grupo. O resultado é retrabalho, histórico que não
fecha e nenhum número confiável no fim do mês.

O Nexus junta a cadeia em um fluxo só — **cliente → venda → baixa de estoque → lançamento financeiro →
relatório**, com compras alimentando o estoque e CRM e agenda sustentando a prospecção — e registra quem
fez o quê, quando, em qual empresa.

### Para quem

- Comércio e distribuição que vendem com estoque controlado
- Prestadores de serviço que precisam de clientes, financeiro e agenda no mesmo painel
- Redes e franquias com várias empresas e equipes separadas
- Contadores e gestores que precisam de trilha de auditoria por empresa

### Princípios

- **Isolamento real por empresa**: a empresa ativa vem do token e é revalidada contra `company_users` em
  toda requisição — um `company_id` digitado no frontend não vale nada (ADR-0002)
- **Autorização antes do botão**: permissões `recurso:ação` verificadas no backend (403 sem permissão); o
  item nem aparece no menu
- **Indicador sem número inventado**: todo KPI sai de uma agregação no MySQL, calculada no servidor
- **Estoque que ninguém digita**: venda confirmada dá saída, cancelamento devolve, compra recebida dá
  entrada — cada movimento com tipo e referência
- **Conta fechada conferível**: totais são somas feitas no servidor, e o CSV entrega a mesma coleção que a
  listagem mostra
- **Trilha de auditoria**: cada escrita relevante grava autor, ação, entidade e empresa
- **Dois temas**: noite sofisticada (`#0B0D10`) e dia elegante (`#F5F1EA`), com escolha persistida e paleta
  extraída da logo oficial
- **Estados de verdade**: carregando, vazio, sem permissão, erro e "nenhum resultado com estes filtros"
  — nunca uma tabela em branco fingindo que carregou

---

## Estado atual

A fundação e os módulos do dia a dia estão no ar: autenticação, papéis, multiempresa, clientes, produtos e
estoque, vendas, compras, financeiro, CRM, agenda, auditoria, equipe, notificações (sino + tela), rotinas
agendadas, configurações, e a página pública montada pelo banco com o editor `/app/cms`.

Ainda sem módulo: **modelos de e-mail** e **gateways de pagamento** (só tabela), e o que nem tabela tem
(ordens de serviço, planos/assinaturas, backup). Veja [Módulos](#módulos) e [Roadmap](#roadmap). Nada no
menu aponta para rota inexistente: módulo em construção aparece apagado, com "em breve".

---

## Telas

Capturas do sistema rodando, todas em **1440×900**. Cada imagem é um link para o arquivo no tamanho
original.

<div align="center">

| Página pública · tema escuro | Entrada · tema escuro |
| :--: | :--: |
| <a href="docs/screenshots/01-landing.png"><img src="docs/screenshots/01-landing.png" alt="Página pública de boas-vindas em tema escuro, com a marca animada, título, subtítulo e o switch de tema" width="360"></a> | <a href="docs/screenshots/02-login.png"><img src="docs/screenshots/02-login.png" alt="Tela de login em relevo neumórfico no tema escuro" width="360"></a> |

| Painel (Dashboard) | Vendas |
| :--: | :--: |
| <a href="docs/screenshots/03-dashboard.png"><img src="docs/screenshots/03-dashboard.png" alt="Painel em tema escuro com cartões de indicadores e abas de Metas e Alertas" width="360"></a> | <a href="docs/screenshots/11-vendas.png"><img src="docs/screenshots/11-vendas.png" alt="Tela de Vendas com lista de pedidos, pílulas de situação e ações de confirmar e cancelar" width="360"></a> |

| Financeiro | Editor da vitrine · tema escuro |
| :--: | :--: |
| <a href="docs/screenshots/13-financeiro.png"><img src="docs/screenshots/13-financeiro.png" alt="Financeiro com KPIs do mês, lançamentos a pagar e receber e central de categorias" width="360"></a> | <a href="docs/screenshots/20-cms-conteudo-dark.png"><img src="docs/screenshots/20-cms-conteudo-dark.png" alt="Editor do site público na aba Conteúdo, tema escuro" width="360"></a> |

</div>

**Sobre os números das telas.** Vieram do banco local de desenvolvimento no dia das capturas. O `seed` cria
a empresa `nexus-demo` **vazia** — não há dados de fachada no código; os registros contados vieram das
provas automatizadas e dos testes de integração.

**Outras capturas** (continuam em `docs/screenshots/`, com a origem declarada):

| Prefixo | Gerada por |
|---|---|
| `17-*`, `18-*` (agenda e abas, **1440×960**) | `tools/shoot-tabs.cjs` |
| `19-*` (vitrine montada pelo banco) | `tools/verify-landing-cms.cjs` |
| `20-*` (editor do CMS) | `tools/verify-cms.cjs` |
| `21-*` (avisos) | `tools/verify-notificacoes.cjs` |
| `22-*` (Configurações) | `tools/verify-configuracoes.cjs` |
| `23-*` (rotinas) | `tools/verify-rotinas.cjs` |
| `24-*` (venda parcelada no financeiro) | `tools/verify-parcelamento.cjs` |
| `*-celular*` | 390×844 |

O conteúdo cadastrado pelas provas volta ao padrão da casa no último passo: `01-landing.png` mostra a
vitrine com o banco como está hoje, e nenhuma corrida termina deixando cartão de desenvolvedor na página.

---

## Funcionalidades

### Autenticação

- Login com e-mail e senha; bcrypt com 12 rounds; access JWT de 15 min e refresh de 7 dias
- Refresh **hasheado** (HMAC-SHA256) em `refresh_tokens`, com rotação a cada uso e revogação no logout e ao
  encerrar uma sessão
- **Cadastro self-service** (`/cadastro`): cria conta e empresa própria e entra como `OWNER`
- **Recuperação em duas etapas** (`/recuperar-senha`): código de uso único, 30 min de validade; a troca de
  senha revoga as sessões abertas
- Rate limit por rota sensível: 10/min no login, 5/min em cadastro e recuperação, além dos 100 req/min globais
- Política de senha única (mínimo 8 caracteres, uma maiúscula e um especial), validada no backend
  (`passwordPolicy.ts`) e inline nos formulários; `PasswordInput` com botão de olho em todo campo de senha
- "Lembrar de mim" grava **só o e-mail**, no navegador, e nunca o escreve no campo de senha
- **Fim de sessão**: toda sessão que termina (botão "Sair", expiração, revogação ou logout em outra aba)
  devolve à página de boas-vindas (`/`) com o histórico substituído, e a vitrine avisa por Toastr quando a
  sessão expirou. Quem chega sem sessão nenhuma vai ao login, com a rota de origem guardada. Sair não apaga
  preferências do navegador, nem o tema

### Autorização e papéis

- Quatro papéis (`OWNER`, `ADMIN`, `MANAGER`, `STAFF`) e mapa central de permissões `recurso:ação`;
  `OWNER` segura `"*"`
- `can` / `assertPermission` no backend; no frontend `useAuth().can` só desenha o que o backend já permite
- Matriz `recursos × read/write × papéis` servida por rota e exibida na aba **Permissões (RBAC)** de
  Usuários (leitura; papel se muda na linha do usuário)
- Menu montado pela permissão: camada sem conteúdo visível some inteira, título junto
- O administrador global não perde `OWNER` nem é removido; quem não é `OWNER` não mexe na linha de um `OWNER`

### Multiempresa

- Contexto de empresa derivado do token (`resolveCompanyContext`) e revalidado contra `company_users`
- Toda tabela de negócio carrega `company_id`, com índice composto quando a consulta é por empresa
- Troca de empresa ativa em Configurações, com token novo (`POST /api/auth/switch-company`)
- Teste dedicado de isolamento (`test/multiempresa.test.ts`)

### Painel e relatórios

- Oito endpoints de agregação em `/api/reports` (visão geral, clientes, produtos, movimentações, vendas,
  compras, financeiro e CRM), todos calculados no servidor
- Dashboard com KPIs do mês e abas **Visão Geral / Metas & Indicadores / Alertas**; cada alerta declara a
  permissão necessária (atendente sem `finance:read` não vê alerta financeiro)
- Alertas: estoque baixo ou zerado, contas vencidas, clientes sem compra há mais de 30 dias
- Exportação CSV no navegador (`lib/csv.ts`) em Clientes, Produtos, Vendas, Compras, Financeiro e Auditoria,
  com o mesmo conjunto que a listagem mostra

### Cadastros

- **Clientes**: busca, tabela paginada no servidor, criar, editar e desativar logicamente (o histórico fica;
  o cliente some só das escolhas novas)
- **Produtos e estoque**: SKU único **por empresa**, custo e venda em `Decimal`, unidade, estoque mínimo,
  categorias por empresa; saldo é consequência das movimentações `IN`/`OUT`/`ADJUST` transacionais, e saída
  acima do saldo é recusada com 400
- Estoque baixo é achado por SQL bruto (o Prisma não compara duas colunas) e vira aviso persistente
- **Fornecedores**: nome único por empresa, exclusão lógica preservando o histórico de compras
- Toda listagem usa a mesma busca, filtro, paginação e estados de vazio / nenhum resultado

### Operação

**Vendas**
- Pedido com múltiplos itens; total, bruto e subtotais calculados **no servidor** (o valor do navegador é
  descartado)
- Status `PENDING`/`CONFIRMED`/`CANCELLED` com transição vigiada; confirmar dá baixa, cancelar uma confirmada
  devolve as unidades
- Cliente e produtos validados como da mesma empresa; total dividido em parcelas mensais (`installments`,
  1 = à vista)
- Rascunho que nunca entrou em vigor não anuncia "venda cancelada"

**Compras**
- Pedido com itens e custo unitário, status `DRAFT`/`RECEIVED`/`CANCELLED`
- Receber dá entrada e atualiza o custo do produto; cancelar uma compra recebida estorna as unidades e é
  bloqueado se a mercadoria já foi consumida; mesmo parcelamento da venda, do lado do fornecedor

**Financeiro**
- Receitas e despesas com valor, vencimento, status (`PENDING`/`PAID`/`CANCELLED`) e vínculo opcional a
  cliente, fornecedor e categoria; categorias por tipo (o mesmo nome pode existir nos dois)
- Resumo mensal: receitas e despesas pagas, saldo, a receber, a pagar e atrasados; filtro `AAAA-MM`;
  validação cruzada categoria × tipo

**Venda e compra caem no financeiro**
- Controlado por `Company.autoFinanceSales` / `autoFinancePurchases`, **desligados por padrão**, cada lado
  com a sua chave (ligar sem perguntar duplicaria o caixa de quem já lança à mão)
- Com a chave ligada, venda confirmada (ou compra recebida) gera uma linha por parcela mensal, na MESMA
  transação que baixou o estoque, em centavo exato e com a última parcela fechando a conta (R$ 100,00 em 3 =
  33,33 + 33,33 + 33,34)
- Vencimento no mesmo dia do mês seguinte, ajustado ao último dia quando o mês não tem aquele dia
- Cada lançamento guarda o documento de origem (`saleId`/`purchaseId`); a categoria "Vendas"/"Compras" nasce
  uma vez por empresa; cancelar remove só as parcelas pendentes — o que já foi pago fica para o dono estornar

**CRM**
- Leads com contato, origem, valor estimado e estágio (`NEW`/`CONTACTED`/`PROPOSAL`/`WON`/`LOST`)
- Funil com contagem e soma por etapa; transição repetida bloqueada; marcar **Ganho** converte o lead em
  cliente na hora, sem duplicar

**Agenda**
- Compromissos com tipo, status, local e vínculo opcional a cliente e lead; leitura por **janela de tempo**
- FullCalendar 6; recorrência diária, semanal e mensal expandida em uma linha por data com o id da série
- Mensal guarda o dia do mês e encolhe quando ele não existe (31/01 → 28/02); arrastar move a série;
  excluir remove a série; os KPIs contam a série uma vez
- Fluxo de status: `SCHEDULED → DONE|CANCELLED` e `CANCELLED → SCHEDULED`

### Notificações

O aviso nasce no servidor quando alguém faz algo que a equipe precisa saber e chega ao sino em qualquer tela
do painel, sem recarregar e sem batida em aba escondida.

- **Sino** (`components/layout/NotificationBell.tsx`): contador de não lidos (tom de urgente quando há), seis
  avisos recentes no painel; a batida consulta só contagens (`GET /api/notifications/count`) a cada 45 s;
  marcar lida, "Marcar todas" e "Ver todos"; fecha em Esc e no clique fora (`aria-expanded`/`aria-controls`)
- **Tela `/app/notificacoes`**: abas Todos / Não lidos (com badge) / Preferências (via `?aba=`), pílulas de
  não lidos e urgentes, chip por tipo, filtro lidas/não lidas, paginação no servidor, "Abrir" e "Marcar lida"
  por linha; "Marcar todos" passa pelo diálogo de confirmação
- **Preferências**: cinco tipos, canal in-app por tipo, canal de e-mail desligado com o motivo declarado
  (sem SMTP não há envio), gravar travado até algo mudar e "Voltar ao padrão"
- Sino e tela conversam pelo evento `nexus:avisos` (`lib/notificationsApi.ts`)
- Cinco tipos com prioridade (Baixa/Média/Alta), link e chave antiduplicação: venda, estoque, lead,
  financeiro e relatório diário
- Quem praticou a ação não recebe o próprio aviso; falha ao gravar aviso vai para o log e **não** quebra a
  venda, a compra nem o estoque
- `POST /api/notifications/scan` (varredura de contas vencidas) é só `OWNER`/`ADMIN` e não repete o aviso
  dentro do mês

### Configurações da conta e da empresa

Quatro abas em um endereço só (`?aba=`) — Minha conta, Empresa, Aparência e Empresas — cada bloco gravando
sozinho, enviando só o que mudou e mostrando o erro da API sob o campo.

- **Conta**: nome e telefone (todo papel pode), e-mail visível e não editável, troca de senha que encerra as
  outras sessões mantendo esta aba conectada
- **Empresa**: nome, razão social, fantasia, CNPJ (dígito verificador conferido), e-mail, telefone, endereço
  com as 27 UFs, moeda, fuso, idioma, logo por endereço público com prévia e meta de receita do mês (a régua
  do painel)
- **Políticas** (blocos independentes): saída de estoque que pode deixar saldo negativo e as duas chaves de
  lançamento automático no financeiro (venda confirmada e compra recebida)
- **Máscara não é validação**: CNPJ, telefone e CEP se organizam na digitação, mas quem confere é a API
  (`apps/api/src/lib/brFields.ts`)
- **Aparência**: tema é escolha do navegador; formato de números e datas é dado da empresa
- Quem não tem `settings:write` lê tudo e não grava nada

### Rotinas agendadas

- Três varreduras no relógio do servidor, avisando pelo mecanismo de notificações: contas vencidas **07:00**,
  estoque baixo **07:05** e relatório do dia anterior **08:00**
- Parser de cron próprio de cinco peças (lista, intervalo e passo); agenda inválida devolve 400 apontando a
  peça; a tela traduz ("todos os dias às 07:00")
- Executor único: o relógio e "Executar agora" chamam a mesma função, que não roda a mesma rotina duas vezes
  ao mesmo tempo e grava última execução, status, mensagem e duração em `cron_jobs`
- Chave de duplicação por dia ou mês; o relatório diário só chega a quem ligou a preferência
- `/app/rotinas`: agenda, próxima execução e último resultado; pausar passa pelo diálogo de confirmação;
  rotas e botões só para `settings:write`
- `CRON_ENABLED=0` desliga o relógio do processo (a suíte sobe sem relógio; um segundo servidor não marca a
  hora duas vezes)

### Auditoria, equipe e sessões

- **Auditoria**: autor, ação, entidade, `entity_id`, metadados, IP e hora; escrita automática nos services,
  tela somente leitura; abas **Logs do Sistema / Alterações Sensíveis / Exportação**; a marcação de sensível
  é calculada no servidor; `lib/auditLabels.ts` traduz códigos internos ("lead.contacted" → "Contato realizado")
- **Equipe**: membros por empresa com papel, convite de usuário existente, paginação global, matriz RBAC
- **Sessões**: lista de refresh tokens vivos por usuário; encerrar uma linha revoga só aquele aparelho
- **Empresas**: criar, listar as próprias e ler a ativa

### Interface e identidade

- AdminLTE 4 sobre design system próprio com tokens CSS (ADR-0003) e Tailwind 4 **sem preflight**
  (convive com o Bootstrap do AdminLTE)
- Paleta da logo oficial (`docs/design/palette.md`): cobre, ouro e rosé sobre noite e dia, sem preto ou
  branco puros; marca em degradê cobre-ouro
- Tema claro/escuro persistido, aplicado em landing, autenticação, painel e diálogos
- **Sidebar** em seis camadas (Visão Geral; Comercial & CRM; Estoque & Suprimentos; Serviços & Atendimentos;
  Financeiro; Administração & Sistema), modo trilha de 78 px, revelação por hover, gaveta com véu abaixo de
  821 px, preferência em `localStorage`
- **Abas** nas nove páginas, com estado na URL (`?aba=`), foco por setas e `role="tablist"`
- **Paginação** no rodapé de toda tabela ("Exibindo 1–10 de 50 · página 1 de 5"), seletor 10/25/50/100,
  `pageSize` acima do limite devolve 400; listas inteiras usam o mesmo componente em paginação local
- **Diálogo de confirmação único** (`ConfirmationModal`): Portal no fim do `<body>`, scrim com blur,
  armadilha de foco, nome do registro em destaque, consequência escrita, erro da API no próprio diálogo,
  trava de duplo clique — e **nenhum** `alert`/`confirm`/`prompt` nativo
- **Toastr** global com rótulos centralizados (`lib/uiCopy.ts`) e concordância de gênero por entidade
- **Estados** (`StateView`): `Skeleton`/`LoadingInline`, `EmptyState`, `ErrorState` com "Tentar novamente";
  `ProtectedRoute` leva quem não tem sessão ao login; `/403`, `/401` e a 404 são páginas do produto
- Formulário sujo pergunta "Descartar alterações?" antes de fechar

### Página pública (vitrine)

A rota `/` é montada a partir do banco: `pages/Landing.tsx` busca `GET /api/public/landing` e pinta o que
está cadastrado.

- As sete cores da marca entram como variáveis CSS no elemento raiz **no tema a que pertencem** (medido pela
  luminância do fundo); no outro tema a vitrine volta aos tokens do produto, por isso o alternador
  Dark/Light vale aqui também
- Herói com título, subtítulo, dois botões e imagem de fundo; faixas de capacidades, banners, depoimentos,
  métricas e dúvidas saem dos itens ativos, na ordem cadastrada; textos em `landing/copy.ts`; animação
  escalonada que respeita `prefers-reduced-motion`
- **O que não existe no banco não aparece**: sem depoimento ou métrica a seção some; com o banco vazio a
  vitrine mantém as quatro capacidades do produto e os textos padrão — nenhum número, cliente ou depoimento
  inventado
- A vitrine é única para toda a plataforma (conteúdo sem `company_id`); `content:read`/`content:write` ficam
  com o `OWNER`, e os demais papéis recebem 403 no editor
- **Contato, redes e WhatsApp**: telefone discável, e-mail, endereço e horário; redes no rodapé; botão
  flutuante do WhatsApp (esquerda ou direita) só com o canal ligado; aviso de cookies na primeira visita
- **Textos legais** em `/legal/:kind` (Termos, Privacidade, LGPD): sem texto publicado a página diz isso em
  vez de escrever cláusula; slug desconhecido cai no mesmo aviso
- **Modo manutenção**: vitrine dá lugar ao cartão com mensagem, contagem regressiva ao vivo e campo do código
  de pulso; aceito o código, o site volta na mesma aba (`sessionStorage`)

**API do CMS**

| Rota | O que faz |
|---|---|
| `GET/PATCH /api/cms/config` | cores, WhatsApp, SEO, herói, redes e contato — gravação bloco a bloco; bloco ausente cai no padrão |
| `/api/cms/items` | banners, capacidades, depoimentos, métricas e FAQs, com ordem, ativo/inativo e `meta` Json por tipo |
| `GET /api/public/landing` | payload anônimo, cache de 10 s, cinco grupos de itens e resumo da manutenção (o token de pulso nunca sai) |
| `/api/cms/legal` · `GET /api/public/legal/:kind` | textos legais; 404 enquanto não publicado |
| `GET /api/cms/seo/score` | nota e nível a partir de 12 checagens do que está publicado |
| Modo manutenção | gancho antes das rotas fecha a API de negócio com 503 (mensagem e previsão); `/api/health`, `/api/auth`, `/api/public`, `/api/cms` e `/api/notifications` ficam abertos (o sino continua pedindo sessão). Passam o token de pulso (18 hex, comparação em tempo constante) e os IPs permitidos; o bypass público devolve só `{liberado}` |

### Editor do site público (`/app/cms`)

`pages/Cms.tsx` abre cinco abas sobre `components/cms/`; cada bloco tem o próprio botão de gravar (salvar
uma cor não reescreve o WhatsApp).

| Aba | Conteúdo |
|---|---|
| **Conteúdo** | textos do topo, as sete cores (quadrado e hexadecimal: o texto manda, o quadrado espelha cor válida), herói com dois botões e rotas, overlay e desfoque, WhatsApp e posição, contato e redes |
| **Itens** | capacidades, banners, depoimentos, métricas e FAQs por tipo, com campos extras, esconder/mostrar e exclusão pelo diálogo de confirmação |
| **Textos legais** | Termos, Privacidade e LGPD com pílula de estado; "Salvar rascunho" (discreto) e "Publicar no site" (cor de ação); endereço público do documento |
| **SEO** | metadados e a nota da API sobre as 12 checagens, com peso e o que falta |
| **Manutenção** | interruptor com confirmação (rotas de negócio caem em 503), mensagem, previsão de volta, allowlist de IPs e código de pulso gerado na tela |

O cabeçalho do painel tem o atalho "Visualizar landing page" (abre `/` em outra aba) e o selo
aberto/manutenção.

---

## Módulos

Legenda: ✅ existe e é usado · 🚧 falta. Nenhuma linha do menu aponta para rota inexistente.

| Módulo | Banco | API | Tela | Estado |
|---|:--:|:--:|:--:|---|
| Autenticação, cadastro e recuperação | ✅ | ✅ 8 rotas | ✅ | no ar |
| Sessões e revogação de tokens | ✅ | ✅ | ✅ | no ar (aba Sessões) |
| Papéis e permissões (RBAC) | ✅ | ✅ | ✅ | no ar (aba Permissões) |
| Multiempresa (isolamento e troca) | ✅ | ✅ | ✅ | no ar (Configurações) |
| Clientes | ✅ | ✅ 5 rotas | ✅ | no ar |
| Produtos, categorias e estoque | ✅ | ✅ 11 rotas | ✅ | no ar |
| Vendas (pedido, itens, baixa, parcelas) | ✅ | ✅ 4 rotas | ✅ | no ar |
| Compras e fornecedores | ✅ | ✅ 8 rotas | ✅ | no ar |
| Financeiro (lançamentos, resumo, carnê da nota) | ✅ | ✅ 9 rotas | ✅ | no ar |
| CRM (leads e funil) | ✅ | ✅ 6 rotas | ✅ | no ar |
| Agenda (janela, recorrência, FullCalendar) | ✅ | ✅ 7 rotas | ✅ | no ar |
| Painel e relatórios agregados | ✅ | ✅ 8 rotas | ✅ | no ar |
| Auditoria | ✅ | ✅ | ✅ | no ar |
| Usuários e membros de empresa | ✅ | ✅ 6 rotas | ✅ | no ar |
| Notificações e preferências | ✅ | ✅ 7 rotas | ✅ | no ar: sino + `/app/notificacoes` |
| Configurações da conta e da empresa | ✅ | ✅ 5 rotas | ✅ | no ar: `/app/configuracoes` em 4 abas |
| CMS da página pública | ✅ | ✅ 14 rotas | ✅ | no ar: vitrine `/` + editor `/app/cms` |
| Documentos legais | ✅ | ✅ | ✅ | `/legal/:kind` mostra só o publicado |
| Modo manutenção | ✅ | ✅ | ✅ | 503 com mensagem e previsão, contagem, pulso, IP permitido |
| Rotinas agendadas (cron) | ✅ | ✅ 3 rotas | ✅ | no ar: `/app/rotinas` |
| Modelos de e-mail | ✅ | 🚧 | 🚧 | tabela `email_templates`; SMTP ainda não existe |
| Gateways e cobranças | ✅ | 🚧 | 🚧 | tabelas (`MERCADO_PAGO`, `EFI`, `STRIPE`); **nenhuma integração inventada** sem credencial real |
| Ordens de serviço / atendimento | 🚧 | 🚧 | 🚧 | só a linha "em breve" no menu |
| SaaS: planos, assinaturas e faturas | 🚧 | 🚧 | 🚧 | a caminho |
| Backup e restauração | 🚧 | 🚧 | 🚧 | a caminho |

---

## Tecnologias

### Backend

| Ferramenta | Para quê |
|---|---|
| Node.js 20+ / TypeScript strict | runtime e tipagem sem `any` de conveniência |
| Fastify 5 | HTTP, validação por esquema e plugins de segurança |
| Prisma 6 | camada **única** de persistência (ADR-0001) |
| MySQL 8 | banco (dev local: WAMP, `localhost:3306`, schema `nexusbusinessmanager`) |
| @fastify/jwt | access (15m) e refresh (7d) |
| bcryptjs | hash de senha, 12 rounds |
| Zod | validação de entrada em toda rota e do `.env` na subida (fail-fast) |
| helmet, @fastify/cors, @fastify/rate-limit | cabeçalhos, origem por env e limite de requisições |
| Vitest | suíte de integração contra o MySQL real |

### Frontend

| Ferramenta | Para quê |
|---|---|
| React 18 + Vite 7 + TypeScript | painel e página pública |
| react-router-dom 6 | rotas públicas, `/app/*` protegida e páginas de erro |
| AdminLTE 4.10 | casca administrativa (ADR-0003) |
| Tailwind CSS 4 (sem preflight) | utilitários pontuais |
| tokens CSS (`styles/tokens.css`) | paleta, tipografia, temas e anéis de foco |
| Axios | HTTP com refresh em voo e single-flight |
| Toastr | avisos globais de conclusão |
| FullCalendar 6 | grade da Agenda (mês, semana, lista, arraste), pt-BR |

> **Pendência:** `jquery` e `sweetalert2` seguem declaradas no `package.json` do web sem uso no `src` (o
> produto importa só o CSS do AdminLTE; o diálogo da casa substituiu o sweetalert2). Retirá-las é decisão do
> dono do projeto.

### Camada própria

| Peça | Para quê |
|---|---|
| `apps/api/src/lib/` | erros, RBAC, contexto de empresa, auditoria, paginação, senha, tokens, bcrypt, `money.ts` (centavo), `time.ts` (dia da empresa), `installments.ts` (carnê da nota) |
| `apps/api/src/plugins/` | segurança (helmet/CORS/rate-limit) e decorator `authenticate` |
| `apps/web/src/lib/` | `api`, `notify`, `confirm`, `csv`, `format`, `auditLabels`, `uiCopy`, `validators`, `tokenStore`, `cmsApi` |
| `apps/web/src/components/` | `AdminShell`, `Logo`, `Tabs`, `Pagination`, `Modal`, `ConfirmationModal`, `StateView`, `PageLoader`, `ErrorPage`, `PasswordInput`, `ProtectedRoute`, `ThemeToggle`, `landing/`, `cms/` |
| `tools/*.cjs` | provas no navegador (Puppeteer) e recaptura das telas |

---

## Arquitetura e estrutura de pastas

### Fluxo

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

**Regras de dependência**
- Rota não fala com o banco; tela não decide permissão; `company_id` de request não é contexto
- Cada módulo tem `routes.ts` (validação, RBAC, auditoria) e `service.ts` (Prisma); só `health`, `audit` e
  `companies` leem o banco direto, em consultas simples no próprio arquivo
- Um módulo só importa serviço de outro para notificação (`sales`, `products` e `crm` chamam o módulo de
  notificações)

**Contratos e erros**
- Listagens paginadas devolvem `{ data, meta }`; quem pagina é o servidor
- `AppError` + handler central: Zod → 400 em português, unicidade (P2002) → 409, limite → 429, sem stack em
  produção
- Toda leitura filtra por `companyId` (`findFirst` com a empresa do token): id de outra empresa devolve 404,
  sem pista sobre o registro alheio

### Estrutura de pastas

```text
.
  apps/
    api/
      prisma/
        schema.prisma          27 models, 15 enums, todas as tabelas com @@map
        migrations/            17 migrations, da fundação ao vínculo de refresh token com a empresa
        seed.ts                admin global + conta de dev + empresa nexus-demo (vazia)
      src/
        app.ts                 16 módulos + modo manutenção antes das rotas + parser de corpo vazio
                               + handler de erro e 404
        config/env.ts          .env validado com Zod (subida falha cedo)
        lib/                   errors, rbac, company-context, audit, pagination, tokens, password, prisma
        plugins/               security.ts, auth.ts, maintenance.ts (gancho global com allowlist)
        modules/               auth, companies, users, audit, clients, products, sales, purchases,
                               finance, crm, agenda, reports, notifications, cms, cron, health
                               — cada um com <x>.routes.ts e <x>.service.ts
        test/                  arquivos de integração contra MySQL real + helpers.ts
    web/
      src/
        App.tsx                rotas públicas, /app/* protegida e páginas de erro
        styles/                tokens, tailwind, global, components, landing, cms, notificacoes (.css)
        lib/                   api, confirm, notify, csv, format, auditLabels, uiCopy, validators,
                               tokenStore, landingApi, landingTypes, landingEstilo, cmsApi,
                               notificationsApi, cronApi
        context/               AuthContext, ThemeContext
        components/            Tabs, Pagination, Modal, ConfirmationModal, StateView, PasswordInput,
                               ProtectedRoute, ThemeToggle, landing/, cms/, layout/ (AdminShell, NotificationBell)
        pages/                 Landing, Legal, Login, Register, ForgotPassword, Dashboard, Clients,
                               Products, Sales, Purchases, Finance, CRM, Agenda, Users, Audit, Settings,
                               Cms, Notifications, Rotinas, erros
  assets/brand/logo/           logo oficial e recortes do favicon
  docs/
    ANALISE.md                 matriz de análise da fase 1, com evidências
    ANALISE-LACUNAS.md         lacunas contra o PROMPT MESTRE de 67 seções
    AUDITORIA.md               auditoria comercial: achados por severidade e o que foi feito
    STATUS-AJUSTES.md          situação de cada tarefa do prompt de mercado, com a prova
    decisoes/                  G1 a G6 — SMTP, cobrança, fiscal, cadastro aberto, hospedagem e licença
    adr/                       0001 persistência única · 0002 multiempresa e RBAC · 0003 AdminLTE + design system
    design/palette.md          paleta oficial extraída da logo
    screenshots/               capturas deste README
  tools/                       provas de navegador, recaptura de telas e utilitários
  CHANGELOG.md                 histórico, mais novo primeiro
  CREDENCIAIS.md               (local, fora do git) senha do administrador definitivo
```

---

## Banco de dados

Um único schema Prisma, tabelas em `snake_case` via `@@map` e ids UUID (36 caracteres) como `VarChar(36)`
para manter as chaves compostas dentro do limite do InnoDB em `utf8mb4`.

| Domínio | Modelos |
|---|---|
| Acesso e empresa | `User`, `Company`, `CompanyUser`, `RefreshToken`, `PasswordResetToken`, `AuditLog` |
| Comercial | `Client`, `Lead`, `AgendaEvent` |
| Catálogo e estoque | `ProductCategory`, `Product`, `StockMovement` |
| Vendas e compras | `Sale`, `SaleItem`, `Supplier`, `Purchase`, `PurchaseItem` |
| Financeiro | `FinanceCategory`, `FinanceEntry` |
| Notificações | `Notification`, `NotificationPreference` |
| Site público e operações | `LandingConfig`, `LandingItem`, `LegalDocument`, `CronJob`, `EmailTemplate`, `PaymentGateway` (site, manutenção e rotinas têm tela; e-mail e gateways, só tabela) |

**Enums (15):** `Role`, `SaleStatus`, `PurchaseStatus`, `StockMovementKind`, `EntryType`, `EntryStatus`,
`LeadStatus`, `AgendaEventType`, `AgendaRecurrence`, `AgendaStatus`, `NotificationPriority`,
`LandingItemKind`, `LegalKind`, `GatewayProvider`, `GatewayEnvironment`.

**Unicidade:** e-mail e `slug` de empresa são globais; `company_users (user_id, company_id)`; documento de
cliente, SKU, nome de categoria, nome de fornecedor e nome+tipo de categoria financeira são únicos
**dentro da empresa**. `dedupe_key` segura a duplicação de aviso nas varreduras.

**Migrations (17), na ordem:**

```text
init_foundation → add_clients → add_auth_flows → add_products_stock → add_sales →
add_suppliers_purchases → add_finance → add_crm → add_agenda → add_agenda_recorrencia →
add_admin_cms_ops → add_cms_content → add_platform_role → add_refresh_used_at →
add_company_allow_negative_stock → add_documento_vinculo_financeiro → add_refresh_token_empresa
```

As quatro migrations da execução da auditoria trazem as linhas de reversão no próprio SQL; nenhuma migration
aplicada foi editada depois de sair — correções chegaram como migration nova.

**Comandos**

```bash
npm run db:migrate                                        # prisma migrate dev (aplica o que falta)
npm run prisma:migrate -w @nexus/api -- --name add_foo    # cria uma migration nova
npm run db:seed                                           # admin global + admin@nexus.local + nexus-demo
npm run prisma:deploy -w @nexus/api                       # sem prompt, para ambiente de máquina
npm run prisma:generate -w @nexus/api                     # regera o client depois de mexer no schema
```

---

## Instalação

### Pré-requisitos

- Node.js 20+ e npm com workspaces
- MySQL 8 — no dev local, WAMP em `localhost:3306` com o banco `nexusbusinessmanager` já criado (o Prisma
  cria as tabelas, não o banco)

### Passo a passo

```bash
npm install
npm run prisma:generate -w @nexus/api   # sem isto, nada compila (docs/AUDITORIA.md N9)
cp apps/api/.env.example apps/api/.env
# edite apps/api/.env: DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
# SEED_ADMIN_PASSWORD (senha do administrador definitivo, ver CREDENCIAIS.md)
# e SEED_DEV_PASSWORD (senha da conta de desenvolvimento)

npm run db:migrate            # aplica as 17 migrations
npm run db:seed               # admin global + admin@nexus.local + empresa nexus-demo (vazia)
```

### Atalhos da raiz

| Comando | O que faz |
|---|---|
| `npm run dev:api` | API em `http://localhost:3001` (prefixo `/api`), com `tsx watch` |
| `npm run dev:web` | painel em `http://localhost:5173`, com proxy para `/api` |
| `npm run typecheck` | `tsc --noEmit` nos dois apps |
| `npm test` | suíte de integração da API contra o MySQL real (+ suíte do web) |
| `npm run test:coverage` | a mesma suíte medindo cobertura (instruções, ramificações, funções, linhas) |
| `npm run build` | `tsc` da API + `vite build` do painel |
| `npm run db:migrate` / `db:seed` | Prisma no workspace da API |

### Contas e acesso

- **Administrador definitivo** — `nexusbussiness.admin@gmail.com`, `OWNER` em todas as empresas, protegido
  contra remoção e rebaixamento (backend e seed). A senha fica só no `CREDENCIAIS.md` local (ignorado pelo
  git) e é lida de `SEED_ADMIN_PASSWORD` na hora do seed
- **Conta de desenvolvimento** — `admin@nexus.local`, `OWNER` da `nexus-demo`; usada pela suíte e pelas
  provas de navegador. Senha vem de `SEED_DEV_PASSWORD` (o seed para com aviso se faltar). Nasce sempre fora
  de produção; em produção só com `SEED_DEV_ACCOUNT=1` declarado de propósito
- **Cadastro self-service** em `/cadastro`, sem tocar no seed
- **Regra de senha:** mínimo 8 caracteres, uma maiúscula e um especial, no backend e em todo formulário

### Produção

`npm run build` gera `apps/api/dist` (Node) e `apps/web/dist` (estáticos servíveis por qualquer servidor).

**Checklist antes de subir**
- `NODE_ENV=production`
- Segredos de JWT novos, distintos entre si e dos de desenvolvimento
- `CORS_ORIGIN` apontando para o endereço público
- `RATE_LIMIT_MAX` ajustado ao tráfego esperado
- Senha do administrador **lida de variável de ambiente**, nunca de arquivo versionado
- Atrás de proxy reverso, `TRUST_PROXY` com o número de saltos (sem isso, auditoria e rate-limit veem o IP
  do proxy)

**O processo recusa subir** em produção, com a lista inteira do problema na mensagem, se: um segredo tiver
menos de 32 caracteres ou contiver `troque`/`change`/`secret`/`exemplo`; os dois segredos forem iguais; o
CORS apontar para `localhost`, `127.0.0.1` ou coringa; o banco conectar como `root` sem senha; ou
`AUTH_EXPOSE_RESET_TOKEN=1` ficar aceso.

**Seed:** em produção aborta antes da primeira consulta se `ALLOW_DEV_SEED` não estiver definido.

Não há `Dockerfile` nem CI no repositório (estão no roadmap); decisões de hospedagem em
`docs/decisoes/G5-hospedagem-e-backup.md`.

---

## Configuração

O `.env` da API é validado com Zod na subida: variável obrigatória ausente ou fora do formato derruba o
processo com a mensagem do caminho exato.

| Variável | Padrão | Para quê |
|---|---|---|
| `NODE_ENV` | `development` | `production` desliga stack trace e mensagens internas |
| `PORT` / `HOST` | `3001` / `0.0.0.0` | porta e interface de escuta |
| `CORS_ORIGIN` | `http://localhost:5173` | origens permitidas, separadas por vírgula |
| `DATABASE_URL` | — (obrigatória) | `mysql://usuario:senha@host:3306/nexusbusinessmanager` |
| `JWT_ACCESS_SECRET` | — (obrigatória) | segredo do access token, mínimo 16 caracteres |
| `JWT_REFRESH_SECRET` | — (obrigatória) | segredo do refresh, distinto do de access |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | `15m` / `7d` | validade dos tokens |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` | `100` / `60000` | limite global por janela |
| `CRON_ENABLED` | `1` | `0` desliga o relógio das rotinas neste processo |
| `TRUST_PROXY` | `0` | saltos de proxy confiáveis: `0` desliga, `1` confia no imediato, até `31`; fora disso a API não sobe |
| `BODY_LIMIT_BYTES` | `1048576` | tamanho máximo de corpo, dito no `.env` |
| `SUPER_ADMIN_EMAIL` | vazio | administrador global; em dev cai no padrão, em produção é obrigatório |
| `AUTH_EXPOSE_RESET_TOKEN` | `0` | `1` devolve o código de recuperação na resposta — só dev; em produção derruba a subida |
| `SEED_ADMIN_PASSWORD` | — | senha do administrador global (só o `seed.ts` lê); o seed para se faltar |
| `SEED_DEV_PASSWORD` | — | senha de `admin@nexus.local` (só o `seed.ts` lê); o seed para se faltar |
| `SEED_DEV_ACCOUNT` | `0` | `1` força a conta de desenvolvimento mesmo em produção (homologação) |
| `ALLOW_DEV_SEED` | `0` | única forma de o seed rodar em `NODE_ENV=production` |

Em produção a validação ganha uma régua extra (descrita em [Produção](#produção)); o código dela é puro e
testado em `validador-de-producao.test.ts`.

---

## Segurança

| Área | Como está hoje |
|---|---|
| Senha | bcrypt 12 rounds; política 8+/maiúscula/especial no backend e nos formulários; nenhuma senha no git (histórico reescrito antes do primeiro push) |
| Tokens | access JWT curto; refresh hasheado (HMAC-SHA256) com rotação, revogação por sessão e revogação total ao **concluir** a troca de senha — pedir a recuperação não derruba a sessão da vítima; o código só volta na resposta com `AUTH_EXPOSE_RESET_TOKEN=1` fora de produção |
| Sessão e empresa | o refresh grava a empresa (`company_id`) e renova dentro dela, com fallback para a primeira ativa; listar/revogar sessões é filtrado por empresa (id de outra → 404; mesma empresa sem ser dono → 403); o IP de origem só aparece para OWNER/ADMIN |
| Acesso revogado | desativar conta ou empresa derruba o acesso na hora: toda requisição revalida vínculo e as duas bandeiras de ativação; reativar devolve o acesso sem novo login |
| Autorização | mapa `recurso:ação` no servidor em toda rota de escrita; hierarquia de papéis decidida em um lugar só (ninguém atribui papel acima do próprio; ADMIN não toca em OWNER nem em outro ADMIN); conteúdo do site público é recurso `content`, só do OWNER |
| Isolamento | empresa ativa vem do token e é revalidada a cada request; toda leitura filtra por `companyId`; teste dedicado de vazamento entre tenants |
| Validação | Zod em todas as entradas; categoria × tipo cruzados; `pageSize` acima do limite → 400 |
| Tráfego | helmet, CORS restrito por env, rate-limit global 100/min e limites próprios: login 10/min, cadastro e recuperação 5/min, bypass da manutenção 30/min |
| Disponibilidade | manutenção fecha a API de negócio com 503 e mantém abertas as rotas de volta; entra quem tem o token de pulso (tempo constante) ou IP permitido |
| Auditoria | toda escrita relevante grava autor, empresa, ação, entidade, metadados e IP; tela somente leitura; marcação de sensível no servidor |
| Erros | handler central com códigos coerentes (400/401/403/404/409/429/500), sem stack em produção |
| Terceiros | **nenhuma integração inventada**: gateways e SMTP têm tabela mas não têm chamada; o canal de e-mail fica guardado e desligado sem credencial real |

---

## Testes

```bash
npm run typecheck          # api + web
npm test                   # api: 28 arquivos · 230 testes (MySQL real) — web: 4 arquivos · 20 testes (jsdom)
npm run test:api           # só a API
npm run test:web           # só o navegador (Vitest + jsdom + Testing Library)
npm run test:coverage      # cobertura medida
npm run build              # produção (tsc + vite build)
```

### Suíte de integração (Vitest)

**Acesso e isolamento**

| Arquivo | O que prova |
|---|---|
| `auth.test.ts`, `auth-flows.test.ts` | login, refresh com rotação, revogação, cadastro, recuperação em duas etapas, troca de empresa; o cadastro de "Marcos Silva" cria a empresa "Marcos (minha empresa)" com slug sem acento nem espaço |
| `rbac.test.ts` | as quatro matrizes de papel, 403 por rota, administrador global protegido |
| `rbac-hierarquia.test.ts` | hierarquia em um lugar só: ADMIN não cria OWNER, não rebaixa ninguém, não mexe no próprio papel nem no de outro ADMIN; MANAGER e STAFF fora de toda rota de papel; o último dono não sai do papel |
| `desativacao-acesso.test.ts` | token na mão do usuário cai ao desativar a conta, volta ao reativar; empresa inativa fecha o módulo para todos, inclusive o proprietário |
| `sessoes-empresa.test.ts` | quem trocou para a empresa B continua na B ao renovar; a lista da A não mostra sessão aberta na B; id de outra empresa → 404; gerente e atendente não leem o IP |
| `multiempresa.test.ts` | nenhum dado vaza entre empresas, do mesmo usuário ou de usuários diferentes |
| `intrusao.test.ts` | um OWNER da empresa A ataca todas as rotas com ids da B e leva 404, 403 ou 400 — a varredura é por rota, não por módulo |
| `seguranca.test.ts` | portas que não sobem sem chave, reuso de refresh tratado como roubo (a família de sessões cai), cabeçalhos de produção |
| `pagination.test.ts` | `{data, meta}` coerente e `pageSize` acima do limite → 400 |

**Negócio**

| Arquivo | O que prova |
|---|---|
| `clients`, `products`, `sales`, `purchases`, `finance`, `crm`, `agenda` (`.test.ts`) | regras de cada módulo: baixa e estorno de estoque, custo atualizado na compra recebida, conversão de lead em cliente, expansão de recorrência |
| `oversell.test.ts` | sete cenários martelando a mesma linha em paralelo (duas confirmações da mesma nota; duas vendas disputando o saldo; a mesma compra recebida duas vezes; duas saídas manuais; cancelar e receber ao mesmo tempo; mesmo produto em duas linhas, 6+6 sobre saldo 10, devolve 400 sem escrever; saldo igual à soma do razão) — o banco decide, nunca o JavaScript |
| `estoque-politica.test.ts` | saída barrada enquanto a empresa não autorizou, negativo visível depois de ligar a chave, política lida por empresa nas três portas de saída |
| `dinheiro-decimal.test.ts` | meio centavo que sobe na base 10, a armadilha do `round` do decimal do Prisma, 2026 parcelas de R$ 0,10 fechando em 20 260 centavos, três formatos de digitação, total = soma das linhas |
| `parcelamento.test.ts` | política desligada não escreve caixa; à vista gera uma linha no dia da empresa; 3 parcelas fecham o centavo com vencimento clampado; rascunho só lança ao confirmar; cancelar tira as pendentes e preserva a paga; despesa da compra recebida; categoria automática criada uma vez; carnê invisível para a outra empresa; parcela inválida recusada |
| `fuso-dia.test.ts` | meia-noite de São Paulo, Tóquio e Calcutá, borda de calendário × instante, série diária e vencidas no dia da empresa, fuso quebrado que não derruba painel nem sino |

**Plataforma**

| Arquivo | O que prova |
|---|---|
| `notifications.test.ts` | aviso chega à equipe mas não a quem agiu; prioridade do estoque zerado; preferência por tipo; contador do sino; varredura uma vez por mês; atendente bloqueado na varredura |
| `cms.test.ts` | payload público sem vazamento de pulso; RBAC; merge bloco a bloco; item que nasce, some e exclui; texto legal antes/depois de publicar; nota SEO; manutenção com pulso e IP; POST sem corpo aceito enquanto JSON errado segue 400 |
| `settings.test.ts` | escrita parcial; `""` e `null` limpam; CNPJ conferido no servidor; DDD, UF, moeda e fuso fora da lista rejeitados; campo inventado → 400; `settings:write` só para dono e admin; conta editável por todo papel; troca de senha derruba as outras sessões |
| `cron.test.ts` | cinco peças com lista, intervalo e passo; formas inválidas → 400; agenda traduzida; RBAC de `/ops/jobs`; liga/pausa; as três rotinas executadas de verdade |
| `validador-de-producao.test.ts` | a régua de produção como função pura (segredo curto, iguais ou de exemplo, CORS local/coringa, banco `root` sem senha, `AUTH_EXPOSE_RESET_TOKEN=1`; `TRUST_PROXY` 0–31) e o `env.ts` que derruba o processo |
| `seed-seguro.test.ts` | seed aborta em produção sem `ALLOW_DEV_SEED` sem escrever usuário; falta de `SEED_ADMIN_PASSWORD` para qualquer ambiente; nenhuma senha de dev no código |

### Suíte do navegador (Vitest + jsdom)

| Arquivo | O que prova |
|---|---|
| `fim-de-sessao.test.tsx` | sete sessões montadas pelo caminho real, com a rede parada no adaptador do axios: logout pelo botão, `nexus:session-expired` no meio de Vendas, `/app` sem sessão, evento `storage` de outra aba, tema que sobrevive ao sair, 401 sem refresh em disco, renovação recusada no bootstrap |
| `tema-landing.test.tsx` | alternador na vitrine: os dois sentidos, cores mudando junto, escolha que volta ao remontar, rótulo acessível, tema aplicado antes do primeiro paint |
| `paleta-da-vitrine.test.ts` | luminância WCAG que decide se a paleta é escura ou clara e o que entra/sai do elemento (inclusive cor vazia ou fora do formato) |
| `cores-da-landing.test.ts` | varredura de cor fixa: nenhum `#` fora dos tokens, com a única exceção listada e justificada |

### Provas de navegador (Puppeteer)

Dirigem o navegador, medem pixels e geram as capturas deste README.

| Prova | Checagens | Cobre |
|---|:--:|---|
| `tools/verify-notificacoes.cjs` | 85 | sino e tela de avisos sobre dado fabricado: número conferido com a API, seis recentes, marcar lida no banco, três abas, paginação contra `meta.total`, filtro por tipo, marcar todos, preferências, tema claro e 390px |
| `tools/verify-cms.cjs` | 115 | editor aba por aba: gravação conferida no payload e na vitrine, item criado/escondido/editado/excluído, texto legal saindo do 404, nota SEO igual na tela e na API, site em 503 com relógio, código de pulso, tudo devolvido ao padrão, dois temas e 390px |
| `tools/verify-landing-cms.cjs` | 120 | vitrine montada pelo banco: paleta vestindo só o tema dela (contraste medido), toque a 6 px do desenho do alternador nos 54×45, cabeçalho só com marca/tema/acesso, itens, contato, WhatsApp, cookies, SEO, legais, "Sobre" em duas colunas a 1200px, três larguras sem arrasto, manutenção de ponta a ponta |
| `tools/verify-configuracoes.cjs` | 127 | quatro abas gravando de verdade: telefone e CNPJ, sete blocos na aba Empresa mandando só as próprias chaves, CEP/UF/cidade, moeda no painel, meta como régua, duas políticas, STAFF sem botão de gravar, troca de senha, dois temas e 390px — tudo devolvido ao estado de antes |
| `tools/verify-parcelamento.cjs` | 55 | venda parcelada na tela, em empresa de prova criada e apagada pela própria volta: seletor de 12 parcelas, "1.290,50" valendo R$ 1.290,50, nota pendente sem caixa, confirmar escrevendo as 3 parcelas, cancelar esvaziando o caixa e devolvendo estoque, compra recebida em 2× como despesa em Compras |
| `tools/verify-rotinas.cjs` | 37 | `/app/rotinas`: agenda e próxima execução contra a API, "Executar agora" gravando o aviso, pausar/retomar pelo diálogo, atendente sem permissão, tema claro e 390px — tudo devolvido |
| `tools/verify-logout.cjs` | 22 | as cinco portas de saída pelo caminho real (botão; 401 sem refresh com aviso de Toastr; logout em segunda aba; renovação recusada no reload; e `/app` sem sessão indo ao login); tema claro atravessando entrar/sair; refresh saindo do disco; "voltar" sem painel; nenhum `alert()` |
| `tools/verify-sidebar.cjs` | 88 | ordem e tipografia das seis camadas, itens por permissão, modo trilha, peek, linhas "em breve", cabeçalho sem repetir a marca, tema claro |
| `tools/verify-acoes-confirm.cjs` | 88 | coluna de ações de nove tabelas, anatomia do diálogo, trava de duplo clique, Esc durante a requisição, tema claro e celular |
| `tools/shoot-tabs.cjs` | 447 | abas, paginação, respiro e legibilidade do histórico em 9 páginas, desktop e celular |
| `tools/shoot-crm.cjs` | 42 | funil, KPIs, filtros, mudança de estágio, conversão conferida em Clientes, celular sem overflow |
| `tools/shoot-modal.cjs` | 26 | anatomia do modal, foco, trava de scroll, temas e empilhamento |

---

## Demonstração

O `seed` não fabrica dados de negócio: cria as duas contas e a empresa `nexus-demo` **vazia**, com `OWNER` ao
administrador global e à conta de desenvolvimento. Ao entrar, os cartões do painel aparecem nos estados de
vazio e "nenhum resultado com estes filtros" — comportamento projetado.

Para uma base apresentável:
- Cadastre produto, abra uma venda e confirme, ou registre um lançamento financeiro; ou
- Rode `npm test` contra o banco de desenvolvimento: os testes escrevem de verdade e deixam clientes,
  produtos, vendas, compras, financeiro, leads e compromissos para os indicadores contarem

As provas de navegador fazem esse cadastro sozinhas e devolvem os registros ao estado original.

---

## Roadmap

### Concluído

- **Fundação**: auth, RBAC, multiempresa, auditoria, tema, estados globais, Toastr, diálogo de confirmação,
  paginação, páginas de erro
- **Cadastros**: clientes, produtos e estoque
- **Operação**: vendas com baixa e estorno, compras e fornecedores, financeiro, CRM com conversão, agenda com
  recorrência e FullCalendar 6
- **Painel** com relatórios agregados e CSV; **equipe**, matriz RBAC e sessões com revogação
- **Notificações**: servidor com preferências e varredura, sino no cabeçalho e `/app/notificacoes`
- **CMS**: vitrine montada pelo banco, textos legais, nota de SEO, modo manutenção, editor `/app/cms` em
  cinco abas
- **Configurações** da conta e da empresa em quatro abas
- **Integridade de negócio auditada**: estoque decidido pelo banco, política de negativo por empresa,
  meia-noite no fuso da empresa, dinheiro em centavo do banco ao JSON, venda confirmada caindo no financeiro
  em parcelas que fecham a conta
- **Rotinas agendadas**: parser de cron próprio, executor único e `/app/rotinas`
- **Blindagem de acesso e configuração (Bloco A)**: hierarquia de papéis centralizada, desativação imediata,
  sessão presa à empresa, recuperação de senha que não derruba a vítima, seed e produção sem senha no código,
  cobertura medindo a si mesma
- **Interface**: sidebar em camadas, abas e paginação padronizadas, identidade Premium Gourmet nos dois
  temas, favicon oficial, provas automatizadas
- **Credencial do administrador** fora do git, com histórico reescrito antes do primeiro push

### A seguir

1. **Modelos de e-mail** — cadastrar e editar os modelos de `email_templates`; SMTP só com credencial real
2. **Gateways e cobranças** — só com credencial de ambiente; nada de integração de fachada
3. **Ordens de serviço / atendimento** — módulo novo, com o mesmo padrão de estado vigiado e auditoria
4. **SaaS** (planos, assinaturas, faturas) · **backup e restauração** · **CI** com a suíte a cada push

---

## Histórico de versões

O detalhamento está em [`CHANGELOG.md`](CHANGELOG.md) (Keep a Changelog, mais novo primeiro, em português).

| Trilha | O que entrou |
|---|---|
| `13b6126 → 7534a7a` | Fundação: backend (auth, RBAC, multiempresa, auditoria) e frontend com design system Premium Gourmet |
| `65428b0 → 5c4cd26` | Identidade refinada, marca em degradê cobre-ouro, regra definitiva de acesso, política de senha, cadastro e recuperação |
| `bf5b1ca → 25610a9` | Telas de autenticação em relevo, página de Clientes, "lembrar de mim" invisível no campo, favicon oficial |
| `c4943a6 → 146edd7` | Deslogar volta às boas-vindas, responsividade sem arrasto horizontal |
| `5c39a74 → 6eed706` | Produtos/Estoque, Vendas, Compras/Fornecedores e Financeiro, com testes desde a primeira entrega |
| `d9542ae → 3d79a87` | CRM na API e na tela, modal único, sidebar que se adapta à tela |
| `2322df1 → 484ba44` | CRM completo, agenda com recorrência, exportações CSV e abas em todas as telas |
| `3b5c6c5 → 99cae5b` | Notificações persistentes no servidor e diálogo central de confirmação |
| `d81c164 → e18a855` | Sidebar em camadas com o mapa real do produto; senha do administrador fora do repositório, histórico reescrito |
| `7e507d8` | Provas da sidebar e do diálogo recapturadas |
| `60941a3 → 02971b4` | README como ficha do produto e CMS da vitrine no servidor (blocos, itens com `meta`, legais, SEO, manutenção) |
| `2c50ea4 → 5e44160` | Página pública montada pelo banco (paleta, herói, itens, contato, WhatsApp, cookies, `/legal/:kind`, manutenção); POST sem corpo voltou a ser ação; suíte em 81 testes |
| `4793f16 → sino` | Sino no cabeçalho, `/app/notificacoes` com três abas, filtros e preferências, sino liberado no portão de manutenção, `verify-notificacoes.cjs` (85 checagens, 6 capturas) |
| `5dce492 → editor` | Editor do CMS `/app/cms` com cinco abas, SEO com as 12 checagens, atalho para a vitrine, `verify-cms.cjs` (115 checagens, 10 capturas) |
| `d529919 → da9e17e` | Configurações em quatro abas, moeda/fuso/idioma, logo, meta de receita, troca de senha que derruba as outras sessões; suíte em 102 testes |
| `da9e17e → rotinas` | Relógio do servidor: parser de cron, três varreduras, executor único, `/app/rotinas`, `verify-rotinas.cjs` (37); suíte em 113 testes |
| `0adf4a7 → agora` | Vitrine voltou a escutar o alternador (paleta só no tema dela, alvo de 44 px, tema salvo antes do primeiro *flash*) e toda sessão encerrada volta às boas-vindas com aviso; `verify-logout.cjs` reescrita (22); suíte em 250 testes (230 API + 20 web) |
| `rotinas → Fase 3` | Auditoria comercial (`docs/AUDITORIA.md`) em execução: Fase 1 blindou o isolamento (empresa no `where` por construção, super admin separado, portas fechadas sem chave, suíte de intrusão A×B); Fase 3 fechou a integridade (estoque no banco, negativo por empresa, fuso, centavo, parcelas); suíte em 176 testes; `verify-parcelamento.cjs` (55) e `verify-configuracoes.cjs` (127) |
| `Fase 3 → Bloco A` | Prompt de mercado: hierarquia de papéis, desativação imediata, refresh preso à empresa, recuperação sem derrubar a vítima, seed e produção sem senha no código, API que recusa subir mal configurada, cobertura medida, `docs/STATUS-AJUSTES.md`, seis decisões do dono em `docs/decisoes/`; suíte em 230 testes |

---

## Desenvolvedor e licença

| | |
|---|---|
| **Clayton Marcelo** | Desenvolvimento full-stack do Nexus Business Manager |
| <a href="https://github.com/claytonmarcelo"><img src="https://img.shields.io/badge/GitHub-claytonmarcelo-181717?logo=github&logoColor=white" alt="GitHub"></a> | repositório: [claytonmarcelo/Nexus-Business-Manager](https://github.com/claytonmarcelo/Nexus-Business-Manager) |

**Licença:** uso não autorizado a terceiros (`UNLICENSED` no `package.json` raiz) — o código é protegido pela
marca e pela autoria declaradas em cada tela do produto.

---

<p align="center">
  <sub>© <strong>Nexus Business Manager</strong> · desenvolvido por <strong>Clayton Marcelo</strong> ·
  gestão empresarial com precisão e elegância.</sub>
</p>
