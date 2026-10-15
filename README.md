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
  <img src="https://img.shields.io/badge/testes-521%20testes%20em%2058%20arquivos-brightgreen" alt="521 testes em 58 arquivos">
</p>

<p align="center">
  <sub>Estágio atual: a fundação e os módulos do dia a dia estão no ar — autenticação, papéis,
  multiempresa, clientes, produtos e estoque, vendas, compras, financeiro, CRM, agenda, auditoria e
  equipe. A página pública já é montada a partir do conteúdo do banco — cores, herói, capacidades,
  depoimentos, métricas, dúvidas, contato, textos legais e a tela de modo manutenção; o editor
  <code>/app/cms</code> cadastra tudo isso; nas notificações o sino do cabeçalho e a tela
  <code>/app/notificacoes</code> estão no ar, e <code>/app/rotinas</code> mostra, pausa e dispara as três varreduras
  que o sistema faz sozinho no horário marcado, e a nota confirmada já cai no financeiro em parcelas mensais
  que fecham o centavo. O atendimento também entrou: <code>/app/ordens-de-servico</code> registra quem está
  com qual máquina, aplica as peças da ordem e dá saída no estoque só quando o serviço é concluído, com o
  número da ordem na movimentação e o documento pronto para o cliente assinar. E entre o serviço concluído e o
  dinheiro no caixa entrou o carnê: <code>/app/cobrancas</code> emite a cobrança que o balcão combina com o
  cliente — PIX por chave, boleto e transferência com as instruções de quem emite, dinheiro ou cartão na
  maquininha —, registra quem recebeu e em que dia, e escreve uma única vez o lançamento de receita no caixa da
  empresa, com documento e recibo para imprimir. O provedor automático continua sendo decisão, não suposição:
  MERCADO_PAGO, EFI e STRIPE aparecem no catálogo com o motivo por escrito e param antes do banco. O que existe
  como tabela pronta mas sem módulo (modelos de e-mail) e o que ainda nem tem tabela está marcado um por um em
  <a href="#m%C3%B3dulos">Módulos</a> e no <a href="#roadmap">Roadmap</a>. Nada no menu aponta para uma
  rota que não existe: o que não tem tela não tem linha — a barra lateral só lista porta que abre.</sub>
</p>

---

## Telas

Capturas do sistema rodando (Fastify + Prisma sobre MySQL no backend, React + AdminLTE 4 no frontend),
todas no quadro de **1440×900**, duas por linha e na mesma escala de exibição. Cada imagem é um link: o
clique abre o arquivo no tamanho capturado. As seis abaixo são o caminho mais curto pelo produto: a
vitrine pública, a entrada, o painel com os números da empresa ativa, o carnê onde a cobrança nasce e o
recebimento entra, o financeiro que lança a receita em cotas exatas e a ordem de serviço que baixa a peça do
estoque. O resto das
capturas continua no repositório — saiu da galeria, não do disco.

Os números que aparecem nas telas saíram de banco local no dia em que cada captura foi feita: as provas de
navegador, que são quem regrava as imagens, hoje só sobem contra o **banco de prova**
(`nexusbusinessmanager_teste`), e as capturas feitas antes da separação ainda vieram da base de
desenvolvimento. O `seed` cria a empresa `nexus-demo` **vazia** — não há dados de fachada no
código; os registros que os indicadores contam vieram das provas automatizadas e dos testes de integração,
que escrevem de verdade e devolvem o que mexem.

<div align="center">

| Página pública · tema escuro | Entrada · tema escuro |
| :--: | :--: |
| <a href="docs/screenshots/01-landing.png"><img src="docs/screenshots/01-landing.png" alt="Página pública de boas-vindas em tema escuro, com a marca animada no palco, título, subtítulo e o switch de tema" width="360"></a> | <a href="docs/screenshots/02-login.png"><img src="docs/screenshots/02-login.png" alt="Tela de login com e-mail, senha com botão de revelar, lembrar de mim e link de recuperação, em relevo neumórfico no tema escuro" width="360"></a> |

| Painel (Dashboard) | Cobrança manual, no carnê |
| :--: | :--: |
| <a href="docs/screenshots/03-dashboard.png"><img src="docs/screenshots/03-dashboard.png" alt="Painel em tema escuro com os cartões de indicadores contados no banco da empresa ativa, abas de Metas e Alertas" width="360"></a> | <a href="docs/screenshots/26-cobrancas-lista.png"><img src="docs/screenshots/26-cobrancas-lista.png" alt="Tela Cobranças em tema escuro: os oito indicadores do resumo — pendentes, em aberto, vencidas, vencido em aberto, pagas, recebido no mês, canceladas e cobranças no total —, a barra de busca com os filtros de situação, método e vencimento, e a tabela das cobranças da empresa com número, cliente, documento, valor, vencimento, recebimento e a pílula de situação" width="360"></a> |

| Financeiro recebendo as parcelas | Ordem de serviço · tema escuro |
| :--: | :--: |
| <a href="docs/screenshots/24-parcelamento-financeiro.png"><img src="docs/screenshots/24-parcelamento-financeiro.png" alt="Aba Contas a Pagar / Receber do Financeiro em tema escuro: os cartões de a receber, a pagar e vencidos, o resumo do mês e as três parcelas da mesma venda com valor, vencimento e situação pendente" width="360"></a> | <a href="docs/screenshots/25-ordens-lista.png"><img src="docs/screenshots/25-ordens-lista.png" alt="Tela Ordens de serviço em tema escuro: os oito indicadores do resumo, a barra de busca com os filtros de situação, prioridade, responsável e período, e a tabela das ordens da empresa com a situação em pílula, o total em real e os botões de Iniciar, Concluir e Cancelar na última coluna" width="360"></a> |

</div>

As outras capturas continuam em `docs/screenshots/` com a origem declarada: a vitrine montada pelo banco
(`19-*`) saiu de `tools/verify-landing-cms.cjs`; o editor (`20-*`), de `tools/verify-cms.cjs`; os avisos
(`21-*`), de `tools/verify-notificacoes.cjs`; as rotinas agendadas (`23-*`), de `tools/verify-rotinas.cjs`;
as Configurações (`22-*`), de `tools/verify-configuracoes.cjs`; a venda parcelada caindo no financeiro
(`24-*`), de `tools/verify-parcelamento.cjs`; as Ordens de Serviço (`25-*`), de
`tools/verify-ordens-de-servico.cjs` — a prova cria a própria ordem, inicia, aguarda peça, conclui, estorna e
apaga o atendente de prova no último passo; e as Cobranças (`26-*`), de `tools/verify-cobrancas.cjs` — 137
verificações que emitem a própria cobrança, batem os oito indicadores contra o resumo, disparam dois pagamentos
juntos para conferir que só um entra no caixa, retroagem a data do recebimento, imprimem documento e recibo,
medem os 403 do atendente e devolvem o banco como o encontraram;
a agenda e a navegação por abas (`17-*`, `18-*`) saíram em **1440×960** porque calendário e barra de abas
não cabem nos 900 de altura; e os arquivos com `-celular` no nome têm 390×844. Nas capturas de prova o
conteúdo que a própria prova cadastra é texto de produto — módulo que está no ar, número conferível no
repositório, pergunta de quem chega — e ele volta ao padrão da casa no último passo: `01-landing.png` é a
vitrine com o banco do jeito que ele está hoje, e nenhuma corrida termina deixando cartão de desenvolvedor
na página de quem chega.

Depois da F3.1, nove famílias de captura ainda mostram a barra lateral de antes — com as duas linhas
apagadas de "Ordens de Serviço" e "Gateways & Cobranças": `07-*`, `10-*`, `11-*`, `12-*`, `13-*`, `14-*`,
`15-*`, `17-*` e `18-*`. O que elas provam é a tela do módulo, não o menu, e elas não foram recapturadas
nesta rodada porque a ferramenta que as produz está desalinhada da interface de hoje. Os dois pontos estão
escritos em `docs/AUDITORIA.md` (N29 e N30), com a passada completa marcada para a F9 junto do N13. As
demais famílias do painel (`16-*`, `21-*`, `22-*`, `23-*`, `03-*`, `04-*`, `05-*`) foram recapturadas com a
barra de 15 linhas. Na F3.2 o menu ganhou a 16ª linha — "Ordens de serviço", na camada Serviços & Atendimentos —
e depois a 17ª — "Cobranças", na camada Financeiro; a família `16-*`, que é a própria barra, foi repetida com as
duas (104 checagens, nenhuma falha); as outras cinco famílias recapturadas na F3.1 seguem com 15 linhas e passam
na mesma passada do N30, na F9.

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
- **Atendimento que mexe no estoque de verdade**: a ordem de serviço aplica peças e mão de obra, dá saída no
  saldo só quando é concluída, e cancelar uma concluída devolve tudo como estorno — com o número da ordem na
  movimentação, o histórico de quem moveu e o mesmo `allowNegativeStock` da empresa valendo aqui
- **Conta fechada conferível**: total de venda e de compra é soma feita no servidor, nunca confiada ao
  navegador, e a exportação CSV entrega a mesma coleção que a listagem mostra
- **Trilha de auditoria**: cada escrita relevante grava autor, ação, entidade e empresa, e a tela de
  Auditoria é a leitura dessa trilha — inclusive com as alterações sensíveis marcadas. O que o administrador da
  plataforma faz pela vitrine, pelos textos legais e pelas rotinas do relógio fica numa trilha à parte, que nenhuma
  empresa lê
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
- Verificação de e-mail no cadastro (`REQUIRE_EMAIL_VERIFICATION=1`, obrigatória em produção): quem se cadastra
  recebe um link na caixa de entrada e fica do lado de fora do painel até confirmar; a tela pública
  `/verificar-e-mail` resgata quem perdeu o link, o reenvio tem limite próprio, e endereço inexistente ou não
  confirmado recebem exatamente a mesma resposta
- Segundo fator por TOTP (`/configuracoes` > aba Segurança): o segredo é cifrado em repouso com AES-256-GCM e
  mostrado uma única vez, os dez códigos de recuperação valem uma vez cada e só o hash deles fica no banco,
  desligar exige um código válido (não a senha), e em produção o papel da plataforma e o `OWNER` são obrigados
  a ligar antes de entrar
- Bloqueio por conta: cinco senhas erradas em quinze minutos trancam por quinze, com resposta idêntica para
  endereço que existe e endereço que não existe — inclusive no tempo, porque o bcrypt roda com o mesmo custo
  nos dois casos
- E-mail de verdade: `nodemailer` quando há `SMTP_HOST`, `SMTP_PORT` e `MAIL_FROM`; console quando não há;
  caixa em memória na suíte de testes. Em produção a subida é recusada com entrega desligada, e o código nunca
  volta na resposta HTTP fora de `AUTH_EXPOSE_RESET_TOKEN=1` em ambiente de desenvolvimento
- Rate limit próprio por rota sensível: 10 tentativas/min no login e 5/min em cadastro, recuperação,
  reenvio de código, desafio de segundo fator e nas duas rotas de etapa,
  além do limite global de 100 req/min
- Depois de entrar, o destino é sempre um caminho deste aplicativo: `//dominio.com`, `https://` e
  `javascript:` no parâmetro de retorno são descartados e a pessoa vai para `/app`
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
- **Preferências na tela**: os cinco tipos com rótulo do negócio, canal in-app por tipo, canal de e-mail com a
  caixa obedecendo ao estado que a API declara (`disponivel`, `transporte` e o motivo por escrito quando não
  entrega — nada de `disabled` fixo), gravar travado até algo mudar de fato e "Voltar ao
  padrão". A empresa e o dono vêm sempre do token — não há seletor de empresa aqui
- Sino e tela conversam pelo evento `nexus:avisos` (`lib/notificationsApi.ts`), então marcar lida num lugar
  atualiza o número do outro sem recarregar página nenhuma
- Cinco tipos com prioridade (Baixa/Média/Alta), link para a tela certa e chave antiduplicação: venda,
  estoque, lead, financeiro e relatório diário
- Quem praticou a ação nunca recebe o próprio aviso; uma falha ao gravar aviso fica no log e **não** quebra
  a venda, a compra ou o estoque
- Preferências por usuário e empresa com canal in-app e de e-mail separados. O e-mail é **cópia do aviso do
  sino**: primeiro a linha nasce no sino, depois a mensagem entra na fila da T5.3, com o mesmo título e o mesmo
  corpo. Quem desligou o sino não recebe mensagem nenhuma, porque o aviso não chega a ser gravado — é isso que
  impede a varredura de contas vencidas de virar spam diário. Sem entregador que entrega, nada é enfileirado e
  o número que aparece na tela e na rotina é zero: o sistema não finge que envia
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
- **Duas trilhas, cada uma com o seu leitor**: a Auditoria da empresa mostra o que aconteceu naquela empresa —
  inclusive quando o administrador global agiu como dono dela — e um painel permanente diz que as ações da
  plataforma têm trilha própria. `/app/auditoria-plataforma` é essa trilha: atravessa tenants, existe só para quem
  responde pela plataforma, e mostra a empresa de origem da sessão pelo **nome**, nunca por identificador. No banco,
  um evento de plataforma nasce sem empresa dona por construção (`apps/api/src/lib/audit.ts:33-41`), então nenhuma
  ação global sobra no log de um cliente
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
emblema continua animado no topo. O respiro entre as seções é um só, declarado no `.landing-main`, e a coluna do
título no "Sobre" carrega o parágrafo de abertura: nas duas colunas, em qualquer largura de tela, tem
conteúdo — o espaço que sobra é o da leitura, não um buraco de layout.

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
| Autenticação, cadastro e recuperação | ✅ | ✅ 19 rotas | ✅ | no ar: login, cadastro, recuperação por código, renovação e encerramento de sessão, conta própria, troca de senha e troca de empresa; verificação de e-mail (confirmar e reenviar código), segundo fator por TOTP (configurar com segredo cifrado, desafio, códigos de recuperação, desligar) e bloqueio de conta por tentativas, com as duas rotas de etapa fora do painel |
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
| Ordens de serviço (atendimento, peças e baixa de estoque) | ✅ 3 tabelas | ✅ 6 rotas | ✅ | no ar: `/app/ordens-de-servico` com os oito indicadores do resumo, busca, filtros e paginação no servidor, documento para imprimir, tabela que vira cartão no celular e estoque que só baixa na conclusão |
| Painel e relatórios agregados | ✅ | ✅ 8 rotas | ✅ | no ar |
| Auditoria (trilha da empresa e trilha da plataforma) | ✅ | ✅ 2 rotas | ✅ 2 telas | no ar: `/app/auditoria` com as três abas de sempre, e `/app/auditoria-plataforma` reservada a quem responde pela plataforma |
| Contas sem confirmação (suporte da plataforma) | ✅ coluna `users.email_verified_at` | ✅ 2 rotas | ✅ | no ar: `/app/plataforma-contas` lista quem nunca confirmou o endereço — da mais antiga para a mais nova, com o número de empresas de cada conta — e o botão marca a coluna e gasta o link de verificação na mesma transação, exigindo motivo escrito na tela e deixando a linha na trilha da plataforma (N61, ADR-0022) |
| Usuários e membros de empresa | ✅ | ✅ 6 rotas | ✅ | no ar |
| Notificações e preferências | ✅ | ✅ 7 rotas | ✅ | no ar: sino no cabeçalho em toda tela do painel e `/app/notificacoes` com abas, filtros por tipo, paginação no servidor e preferências |
| Configurações da conta e da empresa | ✅ | ✅ 5 rotas | ✅ | no ar: `/app/configuracoes` em quatro abas — conta, cadastro e endereço da empresa, moeda/fuso/idioma, logo, meta de receita e troca de empresa |
| CMS da página pública (cores, herói, capacidades, banners, depoimentos, métricas, FAQ) | ✅ | ✅ 14 rotas | ✅ | no ar: a vitrine `/` é montada pelo conteúdo do banco e o editor `/app/cms` cadastra esse conteúdo nas cinco abas |
| Documentos legais (Termos, Privacidade, LGPD) | ✅ | ✅ | ✅ | `/legal/:kind` mostra só o que está publicado; rascunho e publicação na aba Textos legais do editor |
| Modo manutenção da plataforma | ✅ (mesma tabela) | ✅ | ✅ | 503 com mensagem e previsão na API e na tela, contagem regressiva, pulso em tempo constante, IP permitido e o código guardado na aba |
| Modelos de e-mail | ✅ | 🚧 | 🚧 | tabela `email_templates` criada e sem leitor: as quatro mensagens que saem (verificação, recuperação, segundo fator e a cópia do aviso do sino) são montadas em `src/lib/mail/mensagens.ts`, não no banco |
| Rotinas agendadas (cron) | ✅ | ✅ 3 rotas | ✅ | no ar: `/app/rotinas` com as três varreduras do relógio — contas vencidas, estoque baixo e relatório diário —, liga/pausa e "Executar agora"; a coluna "última execução" fecha com `· N e-mail(s)`, que é o número de mensagens postas na fila naquela corrida |
| Cobranças manuais (carnê: PIX por chave, boleto, transferência, dinheiro, cartão na maquininha) | ✅ tabela `charges` | ✅ 6 rotas | ✅ | no ar: `/app/cobrancas` com os oito indicadores do resumo, cobrança nascida de venda ou de ordem de serviço, recebimento registrado por pessoa e pelo dia dito por ela, uma única receita no caixa (corrida de dois cliques medida), cancelamento com motivo, "vencida" calculada no fuso da empresa, documento e recibo para imprimir e tabela que vira cartão no celular |
| Gateways de pagamento (cobrança automática pelo provedor) | ✅ tabela `payment_gateways` | ✅ 2 rotas | ✅ (aba Gateways) | catálogo sempre com as quatro linhas (`MANUAL` disponível, `MERCADO_PAGO`, `EFI` e `STRIPE` indisponíveis com o motivo); a escrita é a do MANUAL — chave PIX, quem recebe, instruções e vencimento padrão — e as três colunas de credencial ficam nulas por construção e não aparecem na resposta; **nenhuma chamada de saída** enquanto não houver credencial real e a decisão G2 |
| SaaS: planos, assinaturas e faturas | 🚧 | 🚧 | 🚧 | a caminho |
| Backup e restauração | 🚧 | 🚧 | 🚧 | não é módulo do painel: é ferramenta de operação (`deploy/backup-mysql.cjs` e `deploy/restaurar-mysql.cjs`, régua `tools/verify-backup.cjs` com 56 verificações), com dump real, hash, metadados, retenção GFS e restauração conferida tabela por tabela. Sem agenda embutida e sem cópia fora da máquina — N71 |

Legenda: ✅ existe e é usado · 🚧 falta. Toda linha do menu abre uma página que existe — o que não existe fica
marcado aqui, não na barra lateral.

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
| react-router-dom 7 | rotas públicas, `/app/*` protegida e páginas de erro |
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
        schema.prisma          34 models, 21 enums, todas as tabelas com @@map
        migrations/            22 migrations, da fundação ao reforço de autenticação
        seed.ts                admin global + conta de dev + empresa nexus-demo (vazia)
      src/
        app.ts                 19 módulos + modo manutenção antes das rotas + parser de corpo vazio
                               + handler de erro e 404
        config/env.ts          .env validado com Zod (subida falha cedo)
        lib/                   errors, rbac, company-context, audit, pagination, tokens, password, prisma,
                               money, time, stock, installments, pix, brFields, platform, tx, auth
        plugins/               security.ts, auth.ts (decorator `authenticate`),
                                   maintenance.ts (gancho global com allowlist de volta)
        modules/               auth, companies, users, audit, clients, products, sales,
                               purchases, finance, charges, gateways, crm, agenda, reports,
                               notifications, cms, cron, service-orders, health, platform-accounts
                               — cada módulo com <x>.routes.ts e <x>.service.ts
        test/                  50 arquivos de integração contra MySQL real + helpers.ts
    web/
      src/
        App.tsx                rotas públicas, /app/* protegida e as páginas de erro
        styles/                tokens.css, tailwind.css, global.css, components.css, landing.css,
                               cms.css, notificacoes.css
        lib/                   api, confirm, notify, csv, format, auditLabels, uiCopy, validators, masks,
                               money, papeis, statusServico, brand, metricaVitrine, settingsApi, tokenStore,
                               landingApi, landingTypes, landingEstilo, cmsApi, notificationsApi, cronApi
        context/               AuthContext, ThemeContext
        components/            Tabs, Pagination, Modal, ConfirmationModal, StateView,
                               PasswordInput, ProtectedRoute, ThemeToggle, landing/, cms/,
                               layout/ (AdminShell, NotificationBell)
        pages/                 Landing, Legal, Login, Register, ForgotPassword, Dashboard, Clients,
                               Products, Sales, Purchases, Finance, CRM, Agenda, Users, Audit,
                               PlataformaAuditoria, PlataformaContas, Settings, OrdensDeServico,
                               Cobrancas, Cms, Notifications, Rotinas, erros
  assets/brand/logo/           logo oficial e os recortes usados pelo favicon
  docs/
    ANALISE.md                 matriz de análise da fase 1, com evidências
    ANALISE-LACUNAS.md         lacunas contra o PROMPT MESTRE de 67 seções
    AUDITORIA.md               auditoria comercial: achados por severidade e o que foi feito de cada um
    STATUS-AJUSTES.md          situação de cada tarefa do prompt de mercado, com a prova apontada
    PRODUCAO.md                a ordem de subida de uma instalação real: pilha Docker, migrations, bootstrap,
                               logs, a fila de e-mail do processo e o backup com restauração testada
    decisoes/                  G1 a G6 e G8 — SMTP, cobrança, fiscal, cadastro aberto, hospedagem,
                               licença e o administrador da plataforma
    adr/                       0001 persistência única · 0002 multiempresa e RBAC · 0003 AdminLTE + design
                               system · 0004 rodapé único · 0005 semente sem demonstração · 0006 bootstrap do
                               administrador · 0007 escopo da auditoria · 0008 ordem de serviço baixa estoque na
                               conclusão · 0009 cobrança manual, receita única e "vencida" lida · 0010 banco de
                               prova separado · 0011 casa que abre no login · 0012 motivo escrito para cancelar ·
                               0013 autenticação reforçada · 0014 code splitting · 0015 alvo de toque · 0016 tema ·
                               0017 pilha de prova com porta própria · 0018 produção em container com uma porta ·
                               0019 backup com restauração conferida · 0020 e-mail por fila de memória ·
                               0021 o e-mail é cópia do aviso do sino · 0022 a porta de plataforma que confirma
                               um endereço
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
| Financeiro | `FinanceCategory`, `FinanceEntry`, `Charge` |
| Notificações | `Notification`, `NotificationPreference` |
| Atendimento | `ServiceOrder`, `ServiceOrderItem`, `ServiceOrderHistory` |
| Site público e operações | `LandingConfig`, `LandingItem`, `LegalDocument`, `CronJob`, `EmailTemplate`, `PaymentGateway` — site, manutenção, rotinas e o catálogo de gateways já têm tela; modelos de e-mail seguem só tabela |

Vinte e um enums dão o vocabulário: `Role`, `PlatformRole`, `SaleStatus`, `PurchaseStatus`,
`StockMovementKind`, `EntryType`, `EntryStatus`, `LeadStatus`, `AgendaEventType`, `AgendaRecurrence`,
`AgendaStatus`, `NotificationPriority`, `LandingItemKind`, `LegalKind`, `GatewayProvider`,
`GatewayEnvironment`, `ServiceOrderStatus`, `ServiceOrderPriority`, `ServiceOrderItemKind`, `ChargeMethod`,
`ChargeStatus`.

Unicidade que importa: e-mail global; `slug` de empresa; `company_users (user_id, company_id)`; documento de
cliente, SKU de produto, nome de categoria, nome de fornecedor e nome+tipo de categoria financeira são únicos
**dentro da empresa**, não no banco inteiro. `dedupe_key` segura a duplicação de aviso nas varreduras.

Vinte e duas migrations, na ordem em que chegaram:

```text
init_foundation → add_clients → add_auth_flows → add_products_stock → add_sales →
add_suppliers_purchases → add_finance → add_crm → add_agenda → add_agenda_recorrencia →
add_admin_cms_ops → add_cms_content → add_platform_role → add_refresh_used_at →
add_company_allow_negative_stock → add_documento_vinculo_financeiro → add_refresh_token_empresa →
add_escopo_da_auditoria → add_ordens_de_servico → add_cobrancas_manuais →
add_empresa_lembrada → reforco_de_autenticacao
```

As sete migrations que chegaram a partir da execução da auditoria trazem as linhas de reversão escritas no próprio
SQL; nenhuma migration aplicada foi editada depois de sair — correções chegaram como migration nova.

**Limitação medida, com achado aberto (N54 em `docs/AUDITORIA.md`):** a cadeia acima não reergue um MySQL
zerado. Aplicada num schema de descarte, ela para na segunda migration
com `P3018` / erro 1826 (`Duplicate foreign key constraint name 'company_users_user_id_fkey'`): 13 das 22
declaram de novo as mesmas chaves estrangeiras, e em MySQL o nome de uma constraint é único por banco, não
por tabela. Enquanto o N54 não fechar, `npm run db:migrate` serve para evoluir um banco que já existe — e o
banco de prova nasce com `npm run db:prova`, que monta o schema pelo `db push` e marca as vinte e duas
migrations como aplicadas. O clone limpo de ponta a ponta é trabalho da F8.

Comandos:

```bash
npm run db:migrate                              # prisma migrate dev (aplica o que falta)
npm run prisma:migrate -w @nexus/api -- --name add_foo   # cria uma migration nova
npm run db:seed                                 # desenvolvimento: admin global + admin@nexus.local + empresa nexus-demo
npm run admin:criar -w @nexus/api               # produção: só o administrador da plataforma, sem demonstração
npm run prisma:deploy -w @nexus/api             # sem prompt, para ambiente de máquina
npm run prisma:generate -w @nexus/api           # regera o client depois de mexer no schema
```

---

## Instalação

### Pré-requisitos

- Node.js 20+ e npm com workspaces
- MySQL 8 — no desenvolvimento local, o WAMP em `localhost:3306` com o banco `nexusbusinessmanager` já
  criado (o Prisma cria as tabelas, não o banco)
- Para rodar a suíte e as provas de navegador, um segundo banco: `nexusbusinessmanager_teste`, declarado em
  `DATABASE_URL_TESTE` no `apps/api/.env`. Teste nenhum escreve no banco que o servidor de desenvolvimento
  está usando (`docs/adr/0010-banco-de-prova-separado.md`); sem a variável, a suíte para e diz o que falta.

### Passo a passo

```bash
npm install
npm run prisma:generate -w @nexus/api   # sem isto, nada compila (docs/AUDITORIA.md N9)
cp apps/api/.env.example apps/api/.env
# edite apps/api/.env: DATABASE_URL, DATABASE_URL_TESTE, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
# SUPER_ADMIN_EMAIL com o e-mail do administrador definitivo (CREDENCIAIS.md),
# SEED_ADMIN_PASSWORD com a senha dele e SEED_DEV_PASSWORD com a senha da conta dev

npm run db:migrate            # aplica as 22 migrations
npm run db:seed               # desenvolvimento: admin global + admin@nexus.local + empresa nexus-demo (vazia)
npm run db:prova              # banco de prova: cria nexusbusinessmanager_teste, semente e conta de prova
# produção não usa o seed para criar o administrador: npm run admin:criar -w @nexus/api
# (docs/PRODUCAO.md traz a ordem inteira de subida)
```

### Atalhos da raiz

| Comando | O que faz |
|---|---|
| `npm run dev` | a casa inteira numa janela: API na 3001 e painel na 5173, com cada linha prefixada por `[api]` ou `[web]` e os dois derrubados juntos no `Ctrl+C` (`tools/dev.cjs`) |
| `npm run dev:api` | API em `http://localhost:3001` (prefixo `/api`), com `tsx watch`, no banco de desenvolvimento |
| `npm run dev:prova` | a pilha de prova num lugar só: API na **3002** e painel na **5174**, ambos no banco `nexusbusinessmanager_teste`. Recusa subir se a 3002 ou a 5174 estiver ocupada e **não toca na 3001/5173** — é assim que as `tools/verify-*.cjs`, `shoot-*.cjs` e `audit-*.cjs` sobem (decisão D6 + N65, `docs/adr/0017`). `npm run dev:api:teste` é o alias do mesmo comando |
| `npm run dev:web` | painel em `http://localhost:5173`, com proxy para `/api` na 3001; `NEXUS_WEB_PORT` e `NEXUS_PROXY_TARGET` mudam os dois, e é assim que o `dev:prova` sobe a 5174 apontando para a 3002 |
| `npm run typecheck` | `tsc --noEmit` nos dois apps |
| `npm test` | suíte de integração da API contra o MySQL real, **no banco de prova** |
| `npm run verify` | teste de fumaça do painel no navegador: percorre as telas, exige HTTP, conteúdo montado e zero erro de console (`tools/verify-fumaca.cjs`) |
| `npm run test:coverage` | a mesma suíte medindo a própria cobertura (instruções, ramificações, funções, linhas) |
| `npm run build` | `tsc` da API + `vite build` do painel |
| `npm run db:migrate` / `db:seed` | Prisma no workspace da API |
| `npm run db:prova` | monta e semeia o banco de prova, e grava a conta de prova fora do git |
| `npm run admin:criar` | bootstrap do administrador da plataforma — endereço de `SUPER_ADMIN_EMAIL`, senha de `ADMIN_CRIAR_SENHA`, nada de demonstração |
| `npm run docker:subir` | a pilha de instalação num comando: `mysql` + o job que monta o banco + a API + o painel em nginx, com **uma única porta publicada no host** (`PAINEL_PORT`, padrão 8080) e o banco sem porta nenhuma (`docker compose up -d --build`) |
| `npm run docker:build` / `docker:descer` | constrói as duas imagens / derruba a pilha e deixa o volume `nexus-mysql` no lugar |
| `npm run docker:migrar` | `prisma migrate deploy` dentro da imagem, contra o banco da pilha |
| `npm run docker:admin` | o mesmo `admin:criar` de cima, atravessando o container |
| `npm run docker:logs` | as últimas 40 linhas da API no stdout |
| `npm run docker:provar` | a régua da topologia (`tools/verify-docker.cjs`): 29 verificações — sem a pilha de pé ela devolve `NAO VERIFICADO` em vez de fechar verde pela metade |
| `npm run docker:backup` | dump do banco do container (`deploy/backup-mysql.cjs`): `mysqldump` rodando **dentro** do container, gzip, `.sha256` e `.meta.json` ao lado, e retenção 7 diários / 4 semanais / 12 mensais fora do repositório (`--simulacao` mostra o que faria) |
| `npm run docker:restaurar` | despeja um dump (`deploy/restaurar-mysql.cjs`): confere hash, schema reservado e banco não vazio **antes** de escrever; `--criar` para banco novo, `--aceito-sobrepor` para por cima |
| `npm run docker:provar-backup` | a régua do backup (`tools/verify-backup.cjs`): 56 verificações — recusas medidas, as propriedades da retenção, e a restauração conferida tabela por tabela num banco separado que ela apaga no fim |

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
definido, e nada da demonstração entra num banco de produção — nem a conta de desenvolvimento
(`SEED_DEV_ACCOUNT=1`), nem a empresa `nexus-demo` (`SEED_DEMO_COMPANY=1`). As duas escritas são declaradas uma
a uma porque liberar o seed não equivale a querer vitrine de teste no banco de um cliente; o que sobra em
produção é o administrador da plataforma e as rotinas. A decisão está em
`docs/adr/0005-semente-sem-demonstracao-em-producao.md`.

O administrador de uma instalação de produção nasce por um caminho próprio, que não precisa de
`ALLOW_DEV_SEED` e não conhece demonstração nenhuma: `npm run admin:criar -w @nexus/api` lê o endereço de
`SUPER_ADMIN_EMAIL` e a senha de `ADMIN_CRIAR_SENHA`, as duas do ambiente de quem instala, aplica a regra de
acesso do projeto e imprime só o que aconteceu — endereço, nome, ação, se a senha foi definida agora ou ficou
preservada, e quantas empresas ficaram com `OWNER`. Rodar duas vezes não troca a credencial de ninguém:
reescrever senha de administrador existente, promover uma conta de cliente que por acaso tenha o endereço ou
reativar uma conta desativada exigem, cada um, o seu consentimento escrito (`ADMIN_CRIAR_RENOVAR_SENHA=1`,
`ADMIN_CRIAR_PROMOVER=1`, `ADMIN_CRIAR_REATIVAR=1`). A ordem completa de subida está em `docs/PRODUCAO.md` e a
decisão em `docs/adr/0006-bootstrap-do-administrador-da-plataforma.md`. A pilha de instalação existe e é medida: `Dockerfile.api`,
`Dockerfile.web`, `docker-compose.yml` e `deploy/nginx-painel.conf` descrevem a topologia em que o painel é a
única porta aberta no host, e o MySQL e a API não publicam porta nenhuma — o tráfego da API entra pelo painel,
pela rede interna do compose. O banco dessa pilha tem backup com restauração conferida (`npm run docker:backup`,
`docker:restaurar` e a régua de 56 verificações `docker:provar-backup`), com o roteiro na seção 8 de
`docs/PRODUCAO.md` e a decisão em `docs/adr/0019-backup-com-mysqldump-dentro-do-container-e-restauracao-conferida.md`;
repetir o comando em agenda e copiar para fora da máquina são decisões de instalação (N71). A entrega de e-mail
também é de operação: três chamadores (recuperação de senha, verificação de cadastro e aviso de segundo fator)
entregam um código numa fila de memória e um worker do processo fala com o SMTP, com retentativa, timeout de
socket e dreno no desligue — a seção 10 de `docs/PRODUCAO.md` e o ADR-0020 têm o resto. O pipeline de CI ainda não está no repositório (F8), e a escolha de hospedagem é
do dono (`docs/decisoes/G5-hospedagem-e-backup.md`); a decisão de topologia está em
`docs/adr/0018-producao-em-container-com-uma-porta.md`.

### Contas e acesso

- **Administrador definitivo do projeto** — o e-mail que você declarar em `SUPER_ADMIN_EMAIL`
  (no `.env` da máquina; sem ele a API não sobe em produção), `OWNER` em todas as empresas,
  protegido contra remoção e rebaixamento no backend e no seed. A senha fica apenas no `CREDENCIAIS.md` da
  sua máquina (arquivo local, ignorado pelo git) e é lida de `SEED_ADMIN_PASSWORD` na hora do seed — nada de
  credencial no repositório ou no histórico. Em produção a conta existe pelo `npm run admin:criar`, que lê a
  senha de `ADMIN_CRIAR_SENHA` e nunca a imprime.
- **Conta de desenvolvimento** — `admin@nexus.local`, `OWNER` da empresa `nexus-demo`; é a conta usada pela
  suíte de testes e pelas provas de navegador. A senha não mora no código: vem de `SEED_DEV_PASSWORD`, e o
  seed para com aviso se a variável estiver ausente. Fora de produção ela nasce sempre; em produção só nasce
  se `SEED_DEV_ACCOUNT=1` for declarado de propósito — e aí o seed exige também `SEED_DEMO_COMPANY=1`, porque
  a conta dev é dona da casa de demonstração e uma peça sem a outra não administra nada. Nenhuma das duas
  existe em banco de produção por padrão, e `garantias-conta-de-demonstracao.test.ts` prova isso.
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
| `SUPER_ADMIN_EMAIL` | vazio | endereço do administrador global, lido do `.env` da máquina; em produção é obrigatório e a API não sobe sem ele, fora de produção cai na conta fictícia `admin@exemplo.test` |
| `AUTH_EXPOSE_RESET_TOKEN` | `0` | `1` devolve o código de recuperação na resposta — só para desenvolvimento; em produção o valor `1` derruba a subida |
| `SEED_ADMIN_PASSWORD` | — | senha do administrador global, lida só pelo `seed.ts`, que para com aviso se estiver ausente |
| `SEED_DEV_PASSWORD` | — | senha da conta de desenvolvimento `admin@nexus.local`; também só no `seed.ts`, e o seed para se ela faltar |
| `ADMIN_CRIAR_SENHA` | — | senha lida pelo `admin:criar`; sem ela nenhuma conta nasce, o valor nunca sai no console e o placeholder do `.env.example` é fraco de propósito para não instalar nada |
| `ADMIN_CRIAR_PROMOVER` | `0` | `1` é a decisão escrita de promover ao papel da plataforma uma conta que já existe e não é administradora — a senha é reescrita junto |
| `ADMIN_CRIAR_RENOVAR_SENHA` | `0` | `1` consente reescrever a senha de um administrador que já existe; sem isso a segunda rodada do script preservou a credencial (medido na CLI) |
| `ADMIN_CRIAR_REATIVAR` | `0` | `1` consente devolver o acesso a uma conta desativada; sem isso o script recusa com código `1` e não escreve nada |
| `SEED_DEV_ACCOUNT` | `0` | `1` força a conta de desenvolvimento mesmo em produção (homologação explícita); pede `SEED_DEMO_COMPANY=1` junto |
| `SEED_DEMO_COMPANY` | `0` | `1` libera a empresa de demonstração `nexus-demo` em produção; fora de produção ela é criada sempre |
| `ALLOW_DEV_SEED` | `0` | única maneira de o seed rodar em `NODE_ENV=production`; sem ele o seed aborta antes da primeira consulta, e liberá-lo não libera as duas peças acima |
| `DATABASE_URL_TESTE` | — (obrigatória para `npm test`) | o MySQL de prova (`nexusbusinessmanager_teste`) que a suíte da API e as provas de navegador usam; sem ela o Vitest se recusa a começar, para nenhum teste escrever no banco do servidor de desenvolvimento |
| `MAIL_TRANSPORT` | vazio = decidido pelo ambiente | `smtp` entrega de verdade, `console` grava no log do processo, `memory` é a caixa da suíte de testes; em produção a régua recusa as duas saídas que não entregam a ninguém, e recusa `smtp` sem host, porta ou remetente |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | vazio / `587` / vazio / vazio | o servidor de saída; a senha real mora só no `.env` da máquina e nunca é impressa em log, teste ou resposta |
| `SMTP_SECURE` | vazio segue a porta | `1` força TLS desde o início (465), `0` força texto puro, vazio deixa a porta decidir — na maioria dos provedores de 587 o certo é deixar vazio (STARTTLS) |
| `MAIL_FROM` | vazio | o endereço que assina a mensagem, com formato validado |
| `WEB_BASE_URL` | `http://localhost:5173` | o endereço público do painel, para onde apontam os links de "confirme seu e-mail" e "redefina a senha"; em produção a régua exige `https` e recusa `localhost` |
| `REQUIRE_EMAIL_VERIFICATION` | `0` | `1` deixa o cadastro novo do lado de fora do painel até confirmar o e-mail; em produção a régua exige o `1` ligado |
| `TOTP_ENCRYPTION_KEY` | vazio = segundo fator indisponível | 32 bytes em hexadecimal (64 caracteres), a chave que cifra o segredo do segundo fator em repouso (AES-256-GCM); sem ela as rotas de 2FA dizem que falta a chave, em vez de gravar segredo em claro, e em produção a subida é recusada |

Em `NODE_ENV=production` a validação ganha uma régua extra (segredo de no mínimo 32 caracteres e sem marca
de exemplo, CORS público, banco fora de root, `AUTH_EXPOSE_RESET_TOKEN` desligado, `WEB_BASE_URL` em `https`,
saída de e-mail que entrega de verdade, verificação de cadastro ligada e `TOTP_ENCRYPTION_KEY` com 64
hexadecimais aleatórios): qualquer violação derruba
o processo na inicialização com a lista completa na mensagem. O código dessa régua é puro e testado em
`validador-de-producao.test.ts`.

---

## Segurança

| Área | Como está hoje |
|---|---|
| Senha | bcrypt 12 rounds; política de 8+/maiúscula/especial no backend e nos formulários; nenhum valor de senha registrado no git, e o histórico foi reescrito antes do primeiro push |
| Tokens | access JWT de curta duração; refresh hasheado (HMAC-SHA256) com rotação, revogação por sessão e revogação total ao **concluir** a troca de senha — pedir a recuperação não derruba mais a sessão da vítima, e o código só volta na resposta com `AUTH_EXPOSE_RESET_TOKEN=1` fora de produção; a corrida de dez segundos entre duas abas não reabre mais a sessão que a troca de senha encerrou (N57) |
| Verificação de cadastro | com `REQUIRE_EMAIL_VERIFICATION=1`, quem se cadastra recebe código por e-mail e só entra no painel depois de confirmar; o `forgot-password` de endereço não confirmado responde igual ao dos demais, a tela pública `/verificar-email` resgata quem perdeu o link, e o reenvio tem limite próprio (5/min) |
| Segundo fator (TOTP) | segredo cifrado em repouso com AES-256-GCM (`TOTP_ENCRYPTION_KEY`) e mostrados uma única vez na configuração; dez códigos de recuperação de uso único guardados como hash; obrigatório para o papel da plataforma e para o `OWNER` em produção, opcional fora disso; as duas rotas de etapa (`/2fa/challenge`, `/2fa/setup`) ficam fora do painel e só aceitam o token de etapa correspondente |
| Bloqueio por conta | cinco senhas erradas em quinze minutos trancam a conta por quinze; a contagem mora em tabela própria chaveada pelo endereço em minúsculas, existe linha para endereço que não é de ninguém, e o bcrypt roda com o mesmo custo nos dois casos — a resposta não diz se o e-mail existe; entrar apaga a contagem e um `reset-password` bem-sucedido limpa o bloqueio |
| Sessão e empresa | o refresh grava em qual empresa foi aberto (`company_id`) e renova dentro dela, com fallback para a primeira ativa do usuário; listar e revogar sessões é filtrado por empresa (id de outra empresa devolve 404, mesma empresa sem ser dono devolve 403), e o IP de origem só aparece para OWNER/ADMIN |
| Acesso revogado | desativar a conta ou a empresa derruba o acesso na hora: toda requisição revalida o vínculo no banco junto das duas bandeiras de ativação (conta e empresa), então um access token ainda válido emitido antes não abre a porta depois da desativação — e reativar devolve o acesso sem precisar de login novo |
| Autorização | mapa central `recurso:ação` verificado no servidor em toda rota de escrita; 403 antes de qualquer botão existir na tela. A hierarquia de papéis decide em um lugar só — ninguém atribui papel acima do próprio, e ADMIN não toca em OWNER nem em outro ADMIN. Conteúdo do site público é recurso `content`, só do OWNER |
| Isolamento | empresa ativa vem do token e é revalidada contra `company_users` a cada request; toda leitura filtra por `companyId`, então registro de outra empresa devolve 404; teste dedicado de vazamento entre tenants |
| Validação | Zod em todas as entradas; categorias e tipos cruzados validados; `pageSize` acima do limite devolve 400 |
| Tráfego | helmet, CORS restrito por env, rate-limit global 100/min e limites próprios em login (10/min), cadastro, recuperação, reenvio de código, desafio de segundo fator e as duas rotas de etapa (5/min cada) e bypass da manutenção (30/min) |
| Disponibilidade | modo manutenção fecha a API de negócio com 503 e deixa `/api/health`, `/api/auth`, `/api/public`, `/api/cms` e `/api/notifications` abertos (o sino continua pedindo sessão); quem entra com o token de pulso (comparação em tempo constante) ou o IP permitido |
| Auditoria | toda escrita relevante grava autor, empresa, ação, entidade, metadados e IP; tela somente leitura; marcação de alteração sensível feita no servidor; eventos da plataforma perdem a empresa dona e ganham trilha reservada (`scope` no banco, `docs/adr/0007-escopo-da-auditoria.md`) |
| Respostas de erro | handler central com códigos coerentes (400/401/403/404/409/429/500) e sem stack em produção |
| Terceiros | **nenhuma integração inventada**: os gateways de pagamento continuam sem uma chamada de saída enquanto não houver credencial real e a decisão G2 — `payment_gateways` é lida e escrita só pela configuração do MANUAL, e `charge-adapters.ts` não conhece URL, chave ou SDK de provedor nenhum. O e-mail já é diferente: `nodemailer` entrega quando `SMTP_HOST`, `SMTP_PORT` e `MAIL_FROM` existem, grava no console fora de produção quando não existem, e a suíte de testes usa a caixa em memória; o servidor real nunca foi tocado por teste. Desde a T5.3 a entrega não espera dentro do request: o handler devolve e um worker do processo entrega, com retentativa de recuo exponencial e teto (`src/lib/mail/fila.ts`, `docs/adr/0020-entrega-de-email-por-fila-de-memoria.md`) |

---

## Testes

```bash
npm run typecheck          # api + web
npm test                   # api: 46 arquivos · 434 testes contra o MySQL de prova — web: 12 arquivos · 87 testes no jsdom
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
| `banco-de-teste-separado.test.ts` | a suíte está conectada ao banco de prova, nenhuma escrita de teste muda uma contagem do banco de desenvolvimento, e a limpeza devolve as contagens do banco de teste |
| `recuperacao-por-email.test.ts` | o código chega na caixa postal e não no HTTP, endereço inexistente responde igual e nenhuma mensagem sai, um código queima no primeiro uso, código vencido não redefine senha, e falha de entrega não vaza detalhe |
| `verificacao-de-email.test.ts` | com a flag desligada o cadastro entrega sessão e com ela ligada não entrega; o link confirma uma vez só, vale um prazo, e link vencido e link inventado respondem com a mesma frase; o reenvio não denuncia endereço cadastrado e a auditoria mascara o endereço sem nunca carregar o token |
| `bloqueio-de-conta.test.ts` | cinco senhas erradas trancam com a mesma resposta de sempre, as três respostas são exatamente a mesma coisa, o e-mail que não existe também tem linha de contagem, venceu o prazo a senha certa entra, falhas espaçadas fora da janela não somam, e login bem-sucedido e `reset-password` limpam o bloqueio |
| `segundo-fator.test.ts` | sem chave de cifraçao o fator não é oferecido; o segredo sai uma vez para a tela e o banco só vê o envelope cifrado; ligar exige código do aplicativo dentro do período; os dez códigos de recuperação são mostrados uma única vez e só o hash fica no banco; código de recuperação abre a porta uma vez e se gasta; desligar exige um código válido, não a senha; em produção OWNER e administrador da plataforma são obrigados a ligar antes de entrar |
| `criptografia.test.ts` | cifra e devolve o mesmo texto sem nunca entregar o texto dentro do envelope, dois envelopes do mesmo segredo são diferentes e os dois abrem, chave errada e envelope adulterado devolvem erro sem citar chave nem segredo, e em produção a chave faltante ou malformada é recusada pelo nome sem imprimir valor |
| `corrida-de-abas.test.ts` | a segunda aba que chega com o token velho dentro da janela renova e a corrida fica na auditoria, fora da janela o mesmo token é tratado como roubo (401, alarme, nenhuma sessão viva), a corrida mantém a empresa ativa da sessão, e a troca de senha fecha até a janela de corrida do token rotacionado (N57) |
| `isolamento-rotas.test.ts` | a matriz das 131 rotas lida do próprio Fastify: nenhuma rota nasce sem `app.authenticate` e sem carimbo de pública, as públicas e as de etapa são exatamente a lista declarada, e a contagem medida bate com a declarada |
| `guardas-herdadas.test.ts` | as proteções antigas re-aprovadas sob o regime da F4: ADMIN não cria nem rebaixa OWNER, empresa não fica sem proprietário, refresh devolve a empresa ativa mesmo com a corrida de abas, conta desativada perde o acesso com o segundo fator ligado, sessões respondem só pela empresa ativa, pedir recuperação não derruba sessão nenhuma, aviso não atravessa empresa e o estoque continua atômico |
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
| `garantias-conta-de-demonstracao.test.ts` | o plano de escrita do seed em produção, medido com um cliente que só anota: nem a conta de desenvolvimento nem a `nexus-demo` são pedidas, o administrador da plataforma e as rotinas continuam, a conta dev sem casa de demonstração é recusa, nenhuma senha sai no log, e a recusa sem `ALLOW_DEV_SEED` não escreve usuário nem empresa no banco real |
| `administrador-da-plataforma.test.ts` | o bootstrap do administrador de produção recusando antes da primeira consulta quando falta o endereço ou a senha, a senha fraca barrada pela regra de acesso, o administrador que já existe tendo o papel confirmado com a senha preservada, a conta de cliente que não é promovida sem consentimento escrito, a conta desativada que não volta sozinha, o `OWNER` dado a toda empresa que já existe sem criar empresa nenhuma, nenhum segredo no log e a recusa medida no banco real |
| `confirmacao-administrativa-de-email.test.ts` | a porta de plataforma que destranca o e-mail (9 casos): o ADMIN de uma empresa leva 403 nas duas portas e sem token leva 401, a fila só mostra quem tem `emailVerifiedAt` nulo, pagina e ordena da mais antiga, e a busca pega nome **ou** endereço; confirmar marca a coluna **e** gasta o link vivo na mesma transação, com a trilha da plataforma nascendo sem empresa e com o endereço mascarado; repetir devolve `alterado: false` sem segunda linha de auditoria; identificador inexistente é 404; com a régua da D2 ligada a mesma conta é negada antes da senha e entra depois do clique; e o `admin:criar` nasce com o endereço confirmado quando a coluna está vazia (N61 e N78) |
| `estoque-politica.test.ts` | a saída barrada enquanto a empresa não autorizou, o negativo visível depois de ligar a chave, e a política lida por empresa nas três portas de saída |
| `fuso-dia.test.ts` | meia-noite de São Paulo, Tóquio e Calcutá calculadas à mão, borda de calendário contra borda de instante, série diária e contas vencidas no dia da empresa, e o fuso quebrado que não derruba painel nem sino |
| `dinheiro-decimal.test.ts` | meio centavo que sobe na base 10, a armadilha do `round` do decimal embutido no Prisma, 2026 parcelas de R$ 0,10 fechando em 20 260 centavos, a porta nos três formatos de digitação e a invariante total = soma das linhas em nota real |
| `parcelamento.test.ts` | política desligada que não escreve caixa nenhum, à vista que gera uma linha no dia da empresa, 3 parcelas fechando o centavo com vencimento mensal clampado, rascunho que só lança ao confirmar, cancelar que tira as pendentes e preserva a paga, despesa da compra recebida, categoria automática criada uma vez, o carnê invisível para a outra empresa e a porta que recusa parcela inválida |
| `fim-de-sessao.test.tsx` (web) | sete sessões montadas no jsdom pelo caminho de verdade, com a rede parada no adaptador do axios: o interceptor de 401, o `AuthContext` e o `ProtectedRoute` exercitados juntos — logout pelo botão, `nexus:session-expired` no meio da tela de vendas, `/app` aberto por quem não tem sessão, o evento de `storage` de outra aba, o tema que sobrevive ao sair, o 401 sem refresh token em disco e a renovação recusada no bootstrap |
| `login-com-segundo-fator.test.tsx` (web) | a tela nas quatro etapas: a senha certa de quem tem segundo fator abre a **etapa de código**, não o painel; depois das duas etapas o painel abre para um caminho desta casa; quem é obrigado a ligar vê a chave uma vez, ativa e só então recebe os dez códigos; "voltar para a senha" descarta a etapa sem deixar nada pendurado |
| `destino-pos-login.test.ts` (web) | o destino depois do login é sempre um caminho deste aplicativo: devolve o caminho interno que a pessoa queria abrir, trata `//dominio` como saída do site e cai no padrão, recusa esquema explícito inclusive `javascript:`, e recusa o que não é texto de caminho |
| `tema-landing.test.tsx` (web) | o alternador na vitrine montada pelo CMS: os dois sentidos, as cores da vitrine mudando junto, a escolha que volta ao remontar a página, o teclado com rótulo acessível e o tema aplicado antes do primeiro paint do React |
| `paleta-da-vitrine.test.ts` (web) | a luminância WCAG que decide se a paleta cadastrada é escura ou clara, e o que entra e o que sai do elemento quando ela veste — ou não — o tema ativo, inclusive com cor vazia ou fora do formato |
| `cores-da-landing.test.ts` (web) | a varredura de cor fixa nos estilos da vitrine: nenhum `#` fora dos tokens do tema, com a única exceção listada e justificada |
| `porta-administrativa-de-email.test.tsx` (web) | `/app/plataforma-contas` montada do lado do cliente, em 12 casos: quem não responde pela plataforma não vê linha nenhuma e não dispara chamada; a fila pinta nome, endereço e o número de empresas sem imprimir identificador interno; a busca vai para a API em vez de filtrar no navegador; o botão "Confirmar e-mail" **sem motivo escrito não sai do lugar** — nenhuma requisição é disparada; com motivo o corpo é exatamente `{ motivo }` e a linha sai da fila; conta que já estava confirmada também sai, e a tela diz por quê; se a porta falhar a linha fica na fila com a mensagem do servidor **dentro do diálogo**; o evento tem rótulo em português; a rota é montada sob demanda e o item do menu é área da plataforma; o rótulo do menu e o título da tela dizem a mesma coisa; e o cliente de API fala com as duas portas sem empresa no caminho |

Além da suíte, o repositório guarda provas que dirigem o navegador (Puppeteer) e medem pixels, com as
capturas desta página como subproduto:

| Prova | Checagens |
|---|---|
| `tools/verify-notificacoes.cjs` | 85 — o sino e a tela de avisos sobre dado fabricado pela própria prova: número conferido com a API, painel com os seis recentes, marcar lida no banco seguindo para o Financeiro, as três abas com badge, paginação medida contra `meta.total` do servidor, filtro por tipo, CRM sem aviso do tipo, marcar todos até o vazio, preferências gravadas, lidas de novo após reload e devolvidas ao padrão, tema claro e os 390px |
| `tools/verify-cms.cjs` | 116 — o editor `/app/cms` aba por aba: cada gravação conferida no payload público e na vitrine renderizada, item criado/escondido/editado/excluído pelo modal, texto legal saindo do 404 para a página, nota de SEO igual na tela e na API, o site fechado em 503 com mensagem e relógio, o código de pulso gerado e usado, tudo devolvido ao padrão, os dois temas e os 390px |
| `tools/verify-landing-cms.cjs` | 123 — a vitrine montada pelo banco: texto, a paleta cadastrada vestindo só o tema a que pertence (escuro pinta, claro devolve os tokens ao produto, com o contraste das duas leituras medido), o toque a 6 px do desenho do alternador trocando o tema nos 54×45, o cabeçalho só com marca, tema e acesso, itens, contato, WhatsApp, cookies, SEO, páginas legais, o "Sobre" em duas colunas encostado na linha de 1200px, três larguras sem arrasto e a manutenção de ponta a ponta (contagem, pulso, IP e o código na sessão) |
| `tools/verify-configuracoes.cjs` | 127 — as quatro abas do `/app/configuracoes` gravando de verdade: telefone e CNPJ conferidos na tela e na API, um bloco salvo sem tocar nos outros (agora são sete blocos na aba Empresa, cada um mandando só as chaves que são suas), CEP/UF/cidade, moeda que chega à sessão e ao painel, meta que vira régua, as duas políticas por empresa, o STAFF lendo tudo sem botão de gravar, troca de senha que não despeja a pessoa, os dois temas e os 390px — com empresa e conta devolvidas ao estado de antes |
| `tools/verify-parcelamento.cjs` | 55 — a venda parcelada de ponta a ponta na tela, sobre uma empresa de prova criada e apagada pela própria volta: o seletor de doze parcelas, o preço digitado "1.290,50" valendo R$ 1.290,50 na linha e no rodapé, nota pendente que não escreve caixa nenhum, confirmar que escreve as três parcelas exatas no financeiro, o cancelamento que esvazia o caixa e devolve o estoque, e a compra recebida em 2× caindo como despesa na categoria Compras |
| `tools/verify-ordens-de-servico.cjs` | 102 — a ordem de serviço de ponta a ponta, sobre a casa de demonstração: os oito indicadores batidos contra o resumo do servidor, a ordem criada pela aba Nova ordem com a prévia do rodapé conferida centavo a centavo, o caminho Iniciar → Aguardar peça → Concluir com o **saldo lido no banco antes e depois de cada movimento**, o estorno da concluída devolvendo exatamente o que saiu, o documento aberto e enviado à impressora, busca, filtro, ordenação e o rodapé que conta o recorte, os dois temas, a tabela que vira cartão em 390px e a sessão de um atendente de prova — 403 nas duas portas de escrita, sem aba de criação, sem botão de cancelar, sem chamada à equipe e sem caixa nativa — com a ordem devolvida ao dono e o atendente apagado no fim |
| `tools/verify-rotinas.cjs` | 37 — a tela `/app/rotinas` com as três varreduras, agenda traduzida e próxima execução conferidas contra a API; "Executar agora" que grava o aviso no banco e mostra no toast a mensagem da rotina; pausar pelo diálogo de confirmação e retomar; o atendente sem permissão; o tema claro e os 390px — jobs, avisos e usuário de prova devolvidos ao estado de antes |
| `tools/verify-logout.cjs` | 22 — as cinco portas de saída da sessão, cada uma pelo caminho de verdade: o botão "Sair" do painel, o 401 de uma chamada de negócio sem refresh token em disco (com o aviso de Toastr medido na tela), o logout feito na segunda aba aberta nesta prova, a renovação recusada pelo servidor no reload e — para não confundir as duas coisas — quem abre `/app` sem sessão nenhuma, que continua indo ao login. Junto: o tema claro atravessando entrar e sair, o refresh que sai do disco, o "voltar" do navegador batendo em tela sem painel e nenhum `alert()` no caminho |
| `tools/verify-sidebar.cjs` | 105 — ordem e tipografia das seis camadas, itens por permissão, modo trilha, peek e o cabeçalho sem repetir a marca, tudo com o contrato novo da F3.1: nenhuma linha da barra larga está sem destino, toda linha é link de uma rota que existe no painel, a barra não escreve "em breve" em lugar nenhum, e as **dezoito** linhas — incluindo a da plataforma que nasceu na T5.5 — são clicadas uma a uma com o endereço e o título da tela conferidos depois de cada clique |
| `tools/verify-contas-plataforma.cjs` | 40 — a porta administrativa de confirmação de e-mail na pilha de prova: a fila da tela bate com a contagem do banco, o endereço e o número de empresas aparecem e nenhum identificador interno é impresso no navegador, o ADMIN de uma empresa leva **403** nas duas portas sem escrever nada, a ausência de motivo é barrada **antes** de sair qualquer requisição (medido por `performance.getEntriesByType("resource")`, não pela cara da tela), a escrita marca a coluna e gasta o link na mesma transação, o evento nasce com `companyId` nulo, endereço mascarado e o motivo, ele não aparece na trilha da empresa e aparece na da plataforma, repetir devolve `alterado: false` sem segunda linha, `userId` inexistente é 404, e o `finally` devolve o banco — pendentes **205 → 206 → 205**, eventos desta janela **1 → 0**, duas contas de prova apagadas |
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

Para uma vitrine com dados, suba o banco de prova (`npm run db:prova` + `npm run dev:prova`) e rode as
provas de navegador (`node tools/verify-*.cjs`): elas cadastram cliente, produto, venda, ordem de serviço e
cobrança de verdade, e devolvem os registros ao estado original no fim. A suíte de testes (`npm test`) também
escreve no banco de prova — nunca no de desenvolvimento, que é a regra da decisão D6 do dono.

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

1. **Modelos de e-mail** — cadastrar e editar os modelos guardados em `email_templates`; o SMTP já entrega
   (verificação, recuperação, segundo fator e a cópia de cada aviso do sino saem por `nodemailer` quando
   configurado), mas nenhum trecho de código lê a tabela ainda
2. **Cobrança por gateway** — o carnê manual já está no ar em `/app/cobrancas`; ligar MERCADO_PAGO, EFI ou
   STRIPE depende da decisão G2 e da credencial de ambiente; nada de integração de fachada
3. **SaaS: planos, assinaturas e faturas** · **backup e restauração** · **CI** com suíte automatizada a
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
| `Bloco A → agora` | A auditoria virou produto: o menu perdeu as linhas que não abriam porta (F3.1), a trilha de auditoria da plataforma ganhou tela própria (F2), a ordem de serviço desceu do caderno para o estoque (F3.2) e o carnê de cobranças manuais entrou registrando o recebimento por pessoa e escrevendo uma única receita no caixa (F3.2). A barra lateral chegou a 17 linhas, as duas provas novas somam 103 e 137 checagens, e a suíte fechou em 427 testes — 350 na API contra o MySQL real e 77 no jsdom |
| `agora → T1` | As provas e os testes ganharam banco próprio (`nexusbusinessmanager_teste`, declarado em `DATABASE_URL_TESTE`): `npm run db:prova` monta e semeia, `npm run dev:api:teste` sobe a API nele, e toda `tools/verify-*.cjs` confere o servidor pelo login antes de abrir o navegador — servidor no banco errado é HTTP 401 com a instrução do comando. Medido com `diff` tabela por tabela: o banco de desenvolvimento saiu idêntico da rodada inteira (541 usuários, 45 empresas, 2.186 sessões, 67.722 auditorias) enquanto o de prova crescia. Suíte em 354 + 77, e a cadeia de migrations abriu o achado N54 (em MySQL zerado ela para na segunda migration) |
| `T1 → T2` | Duas decisões do dono viraram código. A casa que abre no login deixou de ser sorteio do índice: **pedida > lembrada (`users.last_company_id`) > vínculo mais antigo**, com desempate por `createdAt` e `id`, lembrança escrita por `switch-company` e respeitada pelo refresh (ADR-0011). E cancelar ordem, estornar ordem concluída e cancelar cobrança passaram a exigir **motivo escrito** em diálogo novo e aditivo (`confirmActionComMotivo`, ADR-0012) — sem motivo nada sai pela rede, e o texto digitado sobrevive ao erro da rota. Provas de navegador em 107 e 137 checagens, suíte em 361 + 79 |
| `T2 → T3` | A F4 inteira (D1, D2, D3): porta `MailerPort` com SMTP real, console fora de produção e caixa em memória na suíte; verificação de cadastro atrás de `REQUIRE_EMAIL_VERIFICATION`, com a tela pública `/verificar-e-mail`; segundo fator TOTP com segredo cifrado em repouso (AES-256-GCM) e dez códigos de recuperação guardados só em hash; bloqueio por conta que não entrega no tempo se o endereço existe; destino pós-login aceito apenas como caminho interno. A superfície foi de 120 para **129 rotas**, as tabelas de 32 para 35, e a suíte para **434 + 87** (ADR-0013) |
| `T4 → T5` | A operação começou a existir fora da máquina do dono. A pilha de prova ganhou porta própria (3002/5174) e a 3001/5173 deixou de ser disputada (N65, ADR-0017), a **pilha Docker** nasceu com quatro serviços e **uma única porta publicada** — MySQL e API sem porta nenhuma no host, painel servindo `/api` por proxy na mesma origem (29 verificações, ADR-0018) — e o **backup do banco passou a ter restauração testada**: `mysqldump` dentro do container, gzip com `.sha256` e `.meta.json`, retenção GFS 7/4/12 com semana ISO, e a régua que restaura num banco separado e confere tabela por tabela antes de chamar aquilo de backup (56 verificações, ADR-0019). A suíte foi de **437 + 140** para **442 + 140** com a T5.3, que tirou a entrega de e-mail de dentro do request:
os três chamadores agora entregam um código numa **fila de memória do processo**, e um worker fala com o SMTP com
retentativa de recuo exponencial, timeout de socket e dreno no desligue — medido em 7,43 ms de resposta contra os
600 ms do entregador injetado (N58 fechado, ADR-0020). Na mesma tarefa o sino ganhou chamador: cada aviso novo
do sino tem **cópia por e-mail** para quem ligou o canal, as três rotinas fecham a frase de execução com
`· N e-mail(s)`, e a caixa da tela de preferências passou a obedecer ao estado que a API declara em vez de um
`disabled` escrito em pedra (N59 fechado, ADR-0021). A tarefa fechou com a **porta administrativa de confirmação
de e-mail**: `/app/plataforma-contas` mostra a fila de quem nunca confirmou — ordenada da mais antiga para a mais
nova, com o número de empresas de cada conta — e o botão marca a coluna e gasta o link de verificação na mesma
transação, com motivo obrigatório na tela e auditoria de plataforma (N61 fechado, ADR-0022). No caminho apareceu o
N78, mais grave: com `REQUIRE_EMAIL_VERIFICATION=1` o `admin:criar` criava a conta raiz **sem** a coluna marcada,
e o login dela é negado antes da senha — hoje o bootstrap confirma o próprio endereço quando a coluna está vazia.
A superfície foi de **129 para 131 rotas**, a barra de **17 para 18 linhas**, e a suíte para **459 + 156** |
| `T3 → T4` | A F5 inteira. Cinco listas pararam de aceitar resposta atrasada (N51), a tela de entrada zerou a senha nos três momentos em que ela sobrava — envio recusado, desmontagem e `pageshow` do histórico — e ganhou rótulo associado de verdade (Problema C). O painel passou a escrever `data-bs-theme` no `<html>` que o Bootstrap 4 lê (N7), a casa ganhou `ErrorBoundary` na raiz e por rota com registro do erro, e o `npm run verify` abriu a fumaça: **63 telas** percorridas no navegador, com HTTP, conteúdo montado e zero erro de console. As duas telas novas da F4 saíram dos 0% de cobertura (N62), o JavaScript deixou de ser um arquivo só — **964,31 kB / 283,61 kB gzip viraram 354,85 kB / 121,62 kB em 37 pedaços**, com a Agenda carregando a pé (D8, ADR-0014) — e a acessibilidade ganhou régua: **22 checagens, 0 falhas** em rótulo, foco, teclado, movimento reduzido e alvo de toque (ADR-0015). A suíte fechou em **437 + 140** |

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
