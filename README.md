<p align="center">
  <img src="assets/brand/logo/logo.png" alt="Nexus Business Manager" width="220">
</p>

<h1 align="center">Nexus Business Manager</h1>

<p align="center">
  <strong>ERP SaaS multiempresa — a operação inteira em um só painel</strong><br>
  Plataforma multiempresa para gerenciar clientes, produtos e estoque, vendas, compras, financeiro,
  cobranças, CRM, agenda, ordens de serviço, notificações, rotinas agendadas, auditoria e a vitrine
  pública no mesmo lugar.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/vers%C3%A3o-0.1.0-blue" alt="Versão 0.1.0">
  <img src="https://img.shields.io/badge/Node.js-24_LTS-339933?logo=node.js&logoColor=white" alt="Node.js 24 LTS recomendado">
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5.6">
  <img src="https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white" alt="Fastify 5">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React 18">
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" alt="Vite 7">
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white" alt="Prisma 6">
  <img src="https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white" alt="MySQL 8">
  <img src="https://img.shields.io/badge/AdminLTE-4.10-343a40" alt="AdminLTE 4.10">
  <img src="https://img.shields.io/badge/testes-744%20casos%20em%2084%20arquivos-brightgreen" alt="744 casos de teste em 84 arquivos">
</p>

<p align="center">
  <sub>Estágio atual: módulos implementados e testados localmente, com autenticação reforçada,
  isolamento multiempresa, recursos de LGPD, Docker e backup. Os portões da F8 estão em validação;
  publicação e prontidão global ainda não foram comprovadas. A tabela <a href="#módulos">Módulos</a>
  distingue funcionalidades implementadas, integrações ausentes e decisões pendentes.</sub>
</p>

---

## Telas

Capturas do aplicativo rodando (Fastify + Prisma sobre MySQL, painel React + Vite com AdminLTE 4),
todas no mesmo quadro de **1440×900**, duas por linha e na mesma escala de exibição. Cada imagem é um
link: o clique abre o arquivo no tamanho capturado. As seis telas mostram a empresa de demonstração
criada pelo seed — é ela que tem clientes, vendas, estoque e financeiro para os indicadores
calcularem; na empresa real sem dados, os mesmos blocos aparecem nos estados vazios. A galeria
completa, com **122 capturas** das telas e dos estados delas, está em
[docs/screenshots/](docs/screenshots/); aqui entram só as seis que apresentam o produto.

<div align="center">

| Vitrine pública | Entrada |
| :--: | :--: |
| <a href="docs/screenshots/01-landing.png"><img src="docs/screenshots/01-landing.png" alt="Vitrine pública do Nexus Business Manager montada pelo conteúdo do banco: chamada, capacidades, métricas e perguntas frequentes" width="360"></a> | <a href="docs/screenshots/02-login.png"><img src="docs/screenshots/02-login.png" alt="Tela de entrada com e-mail lembrado de forma invisível, senha com botão de revelar e recuperação de acesso" width="360"></a> |

| Painel | Clientes |
| :--: | :--: |
| <a href="docs/screenshots/03-dashboard.png"><img src="docs/screenshots/03-dashboard.png" alt="Painel com os indicadores da empresa, a meta de receita e os alertas de estoque e contas vencidas" width="360"></a> | <a href="docs/screenshots/07-clientes.png"><img src="docs/screenshots/07-clientes.png" alt="Listagem de clientes com busca, paginação própria e a coluna de ações alinhada" width="360"></a> |

| Vendas | Financeiro |
| :--: | :--: |
| <a href="docs/screenshots/11-vendas.png"><img src="docs/screenshots/11-vendas.png" alt="Tela de vendas com itens, parcelamento e o carnê que nasce da venda confirmada" width="360"></a> | <a href="docs/screenshots/13-financeiro.png"><img src="docs/screenshots/13-financeiro.png" alt="Tela do financeiro com lançamentos, resumo do mês e as contas vencidas lidas no fuso da empresa" width="360"></a> |

</div>

---

## Sobre o projeto

O **Nexus Business Manager** é um ERP SaaS multiempresa: ele acompanha a operação de uma empresa
do cadastro do cliente até o dinheiro recebido, e faz isso para várias empresas ao mesmo tempo sem
que uma enxergue a outra.

### Problema que resolve

Gestão de pequena e média empresa costuma viver espalhada: o cliente numa planilha, o estoque em
outra, a venda no caderno, o financeiro no aplicativo do banco e a ordem de serviço num documento
anexado. O resultado é retrabalho, histórico que não fecha e nenhum indicador confiável no fim do
mês — e, quando a empresa atende mais de um CNPJ, o problema se multiplica por dois.

O Nexus centraliza essa cadeia em um fluxo só — cliente → venda ou ordem de serviço → estoque →
financeiro → cobrança → relatório — com cada etapa autorizada por permissão verificada no servidor,
isolada pela empresa da sessão e registrada em auditoria.

### Para quem

- Comércio e distribuição que precisam de estoque, venda, compra e financeiro no mesmo lugar
- Assistências técnicas e empresas de serviço que vivem de ordem de serviço e peça aplicada
- Operações com mais de um CNPJ, em que o mesmo usuário troca de empresa sem trocar de conta
- Quem precisa de trilha de auditoria e de direitos do titular (LGPD) como parte do produto, não
  como remendo

### O que a plataforma entrega

- **Isolamento por construção**: toda leitura e escrita parte do `companyId` que vem no token, e um
  teste de intrusão ataca as rotas de uma empresa com os identificadores de outra
- **Autorização real**: o servidor recusa antes de qualquer botão existir na tela, e um gate
  estrutural derruba o boot se alguma rota nascer sem autenticação
- **Dinheiro sem ponto flutuante**: centavo inteiro e `Decimal` do banco, com um único arredondamento
  por linha e o resto da divisão na última parcela
- **Indicador sem número inventado**: todo KPI do painel sai de uma contagem no MySQL daquela empresa
- **LGPD dentro do produto**: aceite gravado no cadastro, cópia dos dados em JSON, anonimização que
  preserva a assinatura e exclusão que apaga a linha
- **Interface nos dois temas**: claro e escuro, com a escolha aplicada antes da primeira pintura
- **Fechamento conferível**: a prova de navegador clica a tela inteira e imprime a contagem de
  verificações, em vez de declarar que funciona

---

## Funcionalidades implementadas

São as telas e regras que existem hoje no repositório. O que ainda não está aqui está listado em
[Módulos](#módulos) e em [docs/ROADMAP.md](docs/ROADMAP.md), com o motivo de cada pendência.

### Autenticação

- Login com e-mail e senha, hash bcrypt de 12 rondas (`lib/password.ts`), e três desfechos possíveis:
  sessão, etapa de código do segundo fator ou tela de configuração do fator
- Conta inativa, senha errada e e-mail inexistente respondem **a mesma coisa** (401 genérico), e um
  hash de isca equaliza o tempo de resposta para o endereço que não existe não ser identificável pelo
  relógio (`lib/tentativas.ts`)
- Cadastro self-service cria usuário, empresa e vínculo `OWNER` **na mesma transação**, e exige o
  aceite dos termos e da política de privacidade — sem os dois, a conta não nasce
- Com `REQUIRE_EMAIL_VERIFICATION=1` o cadastro não emite sessão: devolve `verificationRequired` e
  enfileira o e-mail; o login de conta não verificada responde 403 até o link ser usado
- Recuperação de acesso: token de 24 bytes com HMAC no banco e validade de 30 minutos; o pedido
  responde 200 genérico exista ou não a conta, e a redefinição revoga todas as sessões
- Verificação de e-mail com validade de 7 dias; confirmar invalida os demais tokens do mesmo tipo, e
  token velho ou já usado responde 400
- Troca de senha por dentro da conta exige a senha atual (400 se errada), recusa senha igual à
  vigente (409) e derruba as demais sessões
- Política de senha em um lugar só (`lib/passwordPolicy.ts`): mínimo 8, máximo 128, ao menos uma
  maiúscula e um caractere especial
- Limitador por rota, todos em janela de um minuto: login 10, cadastro 5, verificação 10, reenvio 5,
  recuperação 5, redefinição 5, troca de senha 5, segundo fator 5
- Botão de revelar senha em todo campo de senha, e o e-mail lembrado fica gravado no navegador sem
  nunca aparecer preenchido no campo

### Segundo fator e bloqueio de conta

- TOTP SHA1, 6 dígitos, período de 30 s e janela de ±1 período (`lib/segundo-fator.ts`, `otpauth`);
  a chave é mostrada uma única vez, em base32 e em URI `otpauth://`
- O segredo nunca fica em texto claro: envelope **AES-256-GCM** `v1:<iv>:<tag>:<cifrado>` com chave
  de `TOTP_ENCRYPTION_KEY`; em produção a aplicação não sobe sem ela (`lib/criptografia.ts`)
- Dez códigos de recuperação de uso único, guardados como HMAC e impressos uma vez na ativação
- O fator é **obrigatório em produção** para `SUPER_ADMIN` e para qualquer `OWNER`, e nesses casos
  desligar responde 409
- O token de etapa não é sessão: o desafio vive 5 minutos e a configuração 15, com escopo próprio
  que não abre rota de negócio nenhuma
- A entrada são quatro passos na mesma caixa — credenciais, código, configurar, códigos — e nada do
  que a etapa produz é guardado antes de ela terminar; "voltar para a senha" limpa tudo
- Bloqueio por conta: 5 falhas em 15 minutos bloqueiam por 15 minutos, contados pelo e-mail em
  minúsculas; a tabela `login_attempts` não tem chave estrangeira de propósito, porque existe linha
  para endereço que não é de ninguém

### Sessões e empresas

- Access token de 15 minutos e refresh de 7 dias; o refresh é guardado como **HMAC-SHA256**, nunca
  em claro (`lib/tokens.ts`)
- Rotação marca o token como usado e revogado; reuso de token já rotacionado revoga **a família
  inteira** e entra na trilha como `auth.refresh_reuse`
- Duas abas renovando ao mesmo tempo não se derrubam: janela de corrida de 10 s com guarda de
  linhagem viva, provada em `corrida-de-abas.test.ts`
- A empresa ativa viaja no refresh e a última escolha fica em `users.lastCompanyId`, então entrar de
  novo cai na empresa em que a pessoa estava
- Sessões listadas por empresa, com IP de origem só para `OWNER`/`ADMIN`; revogar alcança apenas as
  próprias, e sessão de outra empresa responde 404
- Conta ou empresa desativada perde o acesso **na hora**: o contexto confere vínculo, usuário ativo
  e empresa ativa a cada requisição

### Autorização e papéis

- Permissão no formato `recurso:ação`, com curinga `*` e `recurso:*`, num catálogo único
  (`lib/rbac.ts`) que a matriz da tela lê — 15 recursos por 2 ações
- Quatro papéis de empresa (`OWNER`, `ADMIN`, `MANAGER`, `STAFF`) e o papel de plataforma
  (`SUPER_ADMIN`) em enum separado: administrar a casa não é administrar o produto
- A hierarquia é regra de servidor: ninguém altera o próprio papel, `OWNER` só é concedido por
  `OWNER`, `ADMIN` cria e altera apenas `MANAGER` e `STAFF`, e empresa sem `OWNER` responde 409
- **Gate estrutural** (`plugins/gate.ts`): um hook `onRoute` derruba o boot se a rota não tem
  `authenticate` no preHandler nem `config.public === true`. Rota esquecida sem guarda não chega a
  existir — o preflight `OPTIONS` é a única isenção
- As portas de plataforma conferem o papel **no banco a cada request**, não no token
  (`lib/platform.ts`): papel revogado perde o acesso na requisição seguinte

### Multiempresa

- O `companyId` vem só do token; corpo e query string são ignorados, e uma varredura que tenta
  mandar `companyId` no payload não muda o alcance de ninguém
- Toda escrita de tenant passa pela camada de serviço com o `companyId` por construção, não por
  convenção de tela
- `intrusao.test.ts` cria duas empresas com dois `OWNER` reais e ataca rota a rota: leitura e escrita
  por id respondem 404, referência cruzada responde 400, e no fim o teste confere **no banco** que
  nada da empresa atacada foi tocado
- Criar empresa vincula o autor como `OWNER` e, na mesma transação, vincula todo administrador de
  plataforma ativo — a casa nunca fica órfã de quem responde por ela

### Painel

- Indicadores contados no MySQL da empresa logada, mais a meta de receita cadastrada nas
  configurações; sem meta, o cartão não inventa alvo
- O `overview` monta bloco a bloco conforme a permissão de quem lê, e os alertas vêm filtrados pelo
  que a conta pode abrir — cartão que leva a uma tela de zeros não aparece
- Estados de interface reais: carregando, vazio, sem permissão e erro, com `ErrorBoundary` na raiz
  e por rota
- O seed de demonstração grava numa empresa à parte e **recusa produção**

### Cadastros

- **Clientes**: CRUD com busca em nome, e-mail e documento, paginação própria (página ≥ 1, tamanho
  1–100, padrão 20) e exclusão **lógica** — a linha fica, o acesso sai
- Documento de cliente é único por empresa (`@@unique([companyId, document])`); duplicata responde
  409 pelo handler central, sem mensagem que confirme qual registro existe
- **Fornecedores**: nome único por empresa e a mesma exclusão lógica
- O cadastro da **empresa** é quem usa a régua brasileira de `lib/brFields.ts`: CNPJ e CPF com
  dígito verificador calculado (sequência repetida é recusada), CEP de 8 dígitos, telefone com DDD
  válido, 27 UFs, 12 moedas ISO, 3 idiomas e fuso IANA

### Catálogo e estoque

- **Produtos**: SKU único por empresa, categoria única por nome, preço e saldo mínimo; produto e
  movimento de abertura nascem **na mesma transação**, então um crash no meio não deixa estoque sem
  registro
- Movimentação é **livro-caixa**: só existem as rotas de criar e listar, nenhuma de editar ou apagar,
  e o serviço nunca altera uma linha já gravada
- Três tipos — `IN`, `OUT`, `ADJUST`. A baixa é um `UPDATE ... WHERE stock_quantity >= q` seguido de
  decremento: se nenhuma linha casou, a venda é recusada. É o banco que segura o oversell, não uma
  leitura antes da escrita (`lib/stock.ts`)
- Estoque negativo é **política da empresa** (`allowNegativeStock`); com ela ligada, a trava de saldo
  sai de cena de propósito
- `ADJUST` é valor absoluto, porque declaração de inventário não é soma
- Transação de estoque re-tenta até 3 vezes em deadlock (P2034/P2037 e MySQL 1213/1205), com recuo
  de 25 ms por tentativa (`lib/tx.ts`)
- Alerta de saldo baixo é `trackStock && stockQuantity <= minStock`, com filtro próprio na listagem
  e resumo de total, abaixo do mínimo e zerados

### Operação

- **Vendas**: itens com preço unitário informado, parcelamento de 1 a 120 vezes e confirmação que
  baixa estoque, gera o carnê e grava a venda **na mesma transação**; venda pendente não baixa nada
- A mudança de estado é uma reivindicação condicional (`updateMany` sobre o estado lido): o segundo
  clique perde e a resposta volta inteira, em vez de duas transições se atropelarem
- Cancelar venda confirmada devolve estoque com movimento de estorno; `CANCELLED` é terminal
- O carnê nasce de `lib/installments.ts`: uma categoria por documento, N lançamentos pendentes com
  vencimento calculado no calendário (dia 31 cai para 28/29/30 quando o mês não tem 31), e cancelar
  apaga **só o que ainda está pendente**
- A geração automática do carnê é política da empresa (`autoFinanceSales`, `autoFinancePurchases`)
  e vem **desligada por padrão** — ninguém ganha lançamento que não pediu
- **Compras**: rascunho, recebida e cancelada; receber dá entrada no estoque e grava o preço de custo
  na mesma escrita, então a última compra é que define o custo. Cancelar compra recebida retira o
  estoque e remove as parcelas pendentes
- **Ordens de serviço**: número sequencial por empresa, gerado com `SELECT ... FOR UPDATE` sobre a
  linha da empresa e índice único `(companyId, number)` — a empresa ao lado tem a sequência dela
- O fluxo é mapa fechado: `OPEN → IN_PROGRESS|WAITING|CANCELLED`,
  `IN_PROGRESS → WAITING|COMPLETED|CANCELLED`, `WAITING → IN_PROGRESS|CANCELLED`,
  `COMPLETED → CANCELLED`; fora do mapa é 409 e repetir o estado vivo é 400
- A baixa de estoque acontece **na conclusão**, não na abertura — peça só sai quando o serviço
  termina ([ADR-0008](docs/adr/0008-ordem-de-servico-baixa-estoque-na-conclusao.md)). Cancelar uma
  concluída estorna, e esse estorno exige `OWNER`/`ADMIN`
- Linhas repetidas do mesmo produto somam em `Decimal` antes da baixa, e cada transição grava uma
  linha de histórico que nunca é editada
- Item é `PART` (produto do cadastro) ou `SERVICE` (descrição e preço obrigatórios); desconto acima
  da soma responde 400, e ordem concluída ou cancelada não aceita mudança de estrutura
- **Agenda**: FullCalendar 6 com mês, semana, dia e lista sobre o mesmo feed; no celular abre em
  `listMonth`, porque é a lista que tem linha de alvo de toque generoso
  ([ADR-0015](docs/adr/0015-alvo-de-toque-44-24-e-agenda-em-lista-no-celular.md))
- O feed é por janela (`from`/`to` vindos da visão ativa), com teto de 1000 eventos e 366
  ocorrências por série; sem janela, a leitura vai até hoje + 366 dias
- Recorrência diária, semanal e mensal com o dia clampado; a ocorrência avulsa não se edita, não se
  exclui e não muda de estado — vale a série, e tentar responde 400
- **CRM**: cinco estágios (`NEW`, `CONTACTED`, `PROPOSAL`, `WON`, `LOST`) e um funil que devolve
  contagem e soma de valor por estágio
- Ganhar um lead sem cliente cria o cliente e marca o lead **na mesma transação**, copiando nome,
  e-mail e telefone; o segundo clique não duplica

### Financeiro e cobranças

- Dinheiro é centavo inteiro e `Prisma.Decimal`; `Number` só aparece na borda do JSON. O
  arredondamento é `ROUND_HALF_UP`, um por linha, e `dividirCentavos` joga o resto na **última**
  parcela — a soma das parcelas é o total do documento, ao centavo (`lib/money.ts`)
- O parser de moeda aceita `1290,50` e `1.290,50`, que é como o Brasil digita
- Categoria é única por `(empresa, nome, tipo)`, e lançamento com categoria de tipo diferente
  responde 400
- "Vencida" não é coluna: é `PENDING` com vencimento anterior ao dia corrente **no fuso da empresa**
  (`lib/time.ts`), e o resumo devolve receita, despesa, saldo, a receber, a pagar, contagem e valor
  das vencidas
- **Cobranças**: número sequencial por empresa com a mesma fila `FOR UPDATE` e até 5 tentativas em
  conflito; uma cobrança pendente por venda ou ordem — a segunda responde 409
- Criar cobrança **não** lança no financeiro. Quem lança é o recebimento: uma única receita `PAID`
  na categoria "Cobranças", com `financeEntryId` único, vencimento original preservado e a data do
  recebimento dita por quem recebeu ([ADR-0009](docs/adr/0009-cobranca-manual-receita-unica-e-vencida-lida.md))
- Dia inexistente ou data futura no recebimento respondem 400; cobrança já paga ou cancelada
  responde 409; cancelar exige motivo de 1 a 500 caracteres, e cobrança paga não cancela — estorno
  no caixa ainda não existe, e a tela diz isso
- O catálogo de gateways expõe **MERCADO_PAGO, EFI e STRIPE com `available: false`** e o motivo
  escrito; só o `MANUAL` tem adaptador. As três colunas de credencial ficam nulas e nunca aparecem
  na resposta — nenhuma chamada de saída é feita
- `lib/pix.ts` valida a chave por tipo (CPF/CNPJ com dígito, e-mail, telefone com "55" opcional,
  aleatória) — validar a chave não é gerar BR Code, e o gerador não existe

### Relatórios e exportações

- Oito fechamentos: visão geral, clientes, produtos, movimentações, vendas, compras, financeiro e CRM
- As janelas são resolvidas no servidor no fuso da empresa: mês corrente e anterior no overview,
  7 a 180 dias no financeiro (padrão 30), `de`/`ate` nas vendas, paginação e filtro por tipo nas
  movimentações
- Cada relatório agrega o que a tela daquele módulo já mostra: série diária de vendas, fluxo de
  caixa, contas a receber e a pagar em 30 dias, centros de custo, origem e tempo médio de
  fechamento dos leads
- **CSV é do lado do navegador** (`apps/web/src/lib/csv.ts`), montado da mesma coleção que a tela
  leu — clientes, produtos, financeiro, compras e as duas auditorias. Não existe rota de exportação
  de relatório em CSV na API, e o README não promete uma; a única exportação que a API devolve é a
  do titular, em JSON (`GET /api/lgpd/meus-dados`, na seção de LGPD)

### Notificações

- O sino é por conta e por empresa: a pessoa só lê e marca os próprios avisos, e "marcar todas"
  varre a caixa de quem clicou
- Cinco tipos (venda, estoque, lead, cobrança, relatório) e sete chaves de preferência; tudo ligado
  por padrão, exceto o relatório diário e o canal de e-mail
- Quem causou o evento fica fora dos destinatários — ninguém recebe aviso do próprio clique
- O e-mail é **cópia** da linha nova do sino, e só sai se o canal estiver ligado e disponível; falha
  de entrega entra na trilha como `notification.entrega_falhou`
  ([ADR-0021](docs/adr/0021-o-email-e-copia-do-aviso-do-sino.md))
- Deduplicação por chave única: venda confirmada, estoque zerado, lead novo, conta vencida (uma vez
  por mês) e rotina do dia — o segundo toque do mesmo fato não martela a mesma conta

### Rotinas agendadas

- Quatro rotinas com expressão cron própria: contas vencidas (07:00), estoque baixo (07:05),
  relatório diário (08:00) e expurgo da auditoria (03:00)
- O agendador é um `setInterval` de 20 s que casa o minuto, não acumula atraso e ignora rotina já
  rodada no mesmo minuto; `CRON_ENABLED=0` desliga o relógio
- Trava de corrida dupla devolve 409 se a rotina já está rodando, e cada execução manual entra na
  trilha com escopo de plataforma
- **Em serverless o relógio não roda**: o entrypoint da Vercel monta a árvore de rotas e drena a
  fila de e-mail, mas não inicia o agendador, e não há seção `crons` no `vercel.json`. Lá as rotinas
  só acontecem pelo botão de execução manual — está declarado em
  [docs/ROADMAP.md](docs/ROADMAP.md), não escondido

### Usuários e equipe

- Criar membro é criar a conta com senha forte e o vínculo na mesma transação; se o e-mail já
  existe, só o vínculo nasce (409 se já for membro). **Não existe convite por e-mail**
- A tela de permissões lê a matriz do servidor, e a hierarquia de papéis é a mesma do catálogo
- A conta de plataforma não pode ser rebaixada de `OWNER` (409), não passa pelo fluxo de recuperação
  de senha e não é alcançada pela exclusão LGPD (403)

### Conta e privacidade (LGPD)

- A aba "Minha conta" reúne perfil, troca de senha e o painel do segundo fator
- A aba **"Seus dados"** é o direito de acesso: `GET /api/lgpd/meus-dados` devolve JSON com titular,
  vínculos, aceites, sessões sem hash, avisos e preferências da empresa ativa e a trilha sem
  metadata, com teto de 500 eventos e 200 avisos e uma lista escrita do que **não** sai
- **Anonimizar** preserva a linha e a assinatura: nome vira "Titular anonimizado", o e-mail vai para
  um endereço inválido, senha vira hash aleatório, a conta é desativada e sessões, tokens, códigos
  de recuperação, avisos e preferências são apagados; o IP do aceite é zerado
  ([ADR-0025](docs/adr/0025-anonimizar-preserva-assinatura-excluir-apaga-linha.md))
- **Excluir** apaga a linha do usuário: cascata nas tabelas de acesso e `SET NULL` nos documentos de
  negócio, para a venda não perder o histórico porque a pessoa saiu. As duas portas pedem a senha
  no corpo, e o último `OWNER` de empresa ativa responde 409
- O aceite dos termos e da política nasce **junto da conta**, com a versão do texto publicada
  naquele momento ([ADR-0023](docs/adr/0023-o-aceite-dos-textos-legais-nasce-junto-da-conta.md))
- Retenção da trilha é configurável (`AUDIT_RETENTION_DIAS`, padrão 0 = nada apagado, teto 3650), com
  expurgo em lotes de 1000 e teto de 200 lotes por rodada
  ([ADR-0026](docs/adr/0026-retencao-configuravel-da-trilha-de-auditoria.md))

### Configurações da empresa

- Cinco abas: conta, dados, empresa, aparência e empresas — e a leitura dos dados do titular só
  acontece quando a aba abre, porque cada leitura da rota é um evento na trilha
- CNPJ, telefone, CEP, UF, e-mail e logo passam pela régua brasileira; moeda (12), idioma (3) e fuso
  IANA saem de lista fechada, e o schema é `strict()` — campo desconhecido não entra
- Três políticas com consumo vivo: estoque negativo, carnê automático de venda e de compra
- A meta de receita tem teto de 9.999.999.999,99, e a escrita grava **só o que mudou**, com o antes
  e o depois na auditoria

### Auditoria

- Duas portas de leitura, nenhuma de escrita: a trilha da empresa e a trilha da plataforma, esta
  filtrando `scope = platform` — ato de plataforma não carimba o tenant
  ([ADR-0007](docs/adr/0007-escopo-da-auditoria.md))
- Busca por ação, entidade, IP e nome de quem fez; filtro por entidade, por sensibilidade (calculada
  no servidor) e por período com o fim do dia inclusivo
- O gravador nunca lança: se a trilha falhar, a operação de negócio não cai junto — e uma guarda
  própria prova que a trilha não carrega senha, token, hash nem corpo sensível

### Vitrine pública e textos legais

- A página `/` é montada pelo conteúdo do banco: chamada, cores, WhatsApp, SEO, hero, redes sociais,
  contato e cinco famílias de item — banner, capacidade, depoimento, métrica e pergunta frequente
- Três rotas públicas (vitrine, texto legal e bypass de manutenção com limitador próprio de 30/min)
  e onze de edição, todas exigindo papel de plataforma
- Texto legal em três kinds (`TERMS`, `PRIVACY`, `LGPD`); a **versão incrementa só quando o conteúdo
  muda**, e é esse número que a linha de aceite guarda
- Publicar texto vazio ou rascunho responde 400 sem gravar nada, e leitura pública de texto não
  publicado responde 404 — o botão da tela fica apagado enquanto o texto for o marcador de rascunho
- O payload público tem cache de 10 s (5 s para o estado de manutenção) e não expõe token nenhum
- **Upload de arquivo não existe**: logo e imagem são URL `http(s)` validada, e o parser `multipart`
  não está na API

### Interface

- AdminLTE 4 na estrutura do painel, Tailwind 4 nos utilitários e camada de tokens própria nos dois
  temas; a escolha é aplicada antes do primeiro render e escreve as duas chaves (`data-theme` e
  `data-bs-theme`), que é o que faz o componente do AdminLTE acompanhar o tema da casa
  ([ADR-0016](docs/adr/0016-tema-do-painel-com-duas-chaves.md))
- Barra lateral em **6 grupos e 18 itens**, todos link de página que existe: o tipo `NavItem` exige
  destino, então linha sem rota não compila, e uma prova clica as dezoito uma por uma
- Gaveta abaixo de 821 px e modo trilha persistido no navegador
- Diálogo de confirmação com motivo obrigatório onde a operação é destrutiva
  ([ADR-0012](docs/adr/0012-dialogo-de-confirmacao-com-motivo.md)), avisos efêmeros centralizados num
  módulo só, e nada de `alert()`/`confirm()` nativo
- Code splitting por rota: cada tela desce o próprio pedaço, e o FullCalendar só chega quando alguém
  abre a agenda ([ADR-0014](docs/adr/0014-code-splitting-por-rota.md))
- Acessibilidade medida, não declarada: nome acessível em todo controle, anel de foco visível nas
  paradas de `Tab`, navegação por teclado e `prefers-reduced-motion` nos dois sentidos; alvo de toque
  de **44×44 px** onde o dedo mora e **24×24 px** na mesa
- Contraste conferido no navegador contra o fundo realmente composto, nas **17 telas** do painel,
  nos **dois temas** e nas **duas janelas** (1366×768 e 360×640) — 4,5:1 para texto normal e 3:1 para
  texto grande
- Páginas de erro vestindo a marca (401, 403, 500 e catch-all), sem stack na cara de quem visita

---

## Módulos

O banco modela o domínio e as telas vieram uma fase por vez. O que está implementado está marcado;
o que é só tabela ou decisão pendente aparece como tal, com o motivo escrito.

| Módulo | Schema | Permissões | Tela |
| --- | :---: | :---: | :---: |
| Autenticação, cadastro e recuperação | ✅ | ✅ | ✅ |
| Segundo fator (TOTP) e códigos de recuperação | ✅ | ✅ | ✅ |
| Sessões, revogação e empresa lembrada | ✅ | ✅ | ✅ |
| Bloqueio por tentativas de entrada | ✅ | — | — |
| Painel e indicadores | ✅ | ✅ | ✅ |
| Vitrine pública montada pelo CMS | ✅ | ✅ (plataforma) | ✅ |
| Textos legais e aceite no cadastro | ✅ | ✅ | ✅ |
| Clientes | ✅ | ✅ | ✅ |
| Produtos, categorias e estoque | ✅ | ✅ | ✅ |
| Vendas e parcelamento | ✅ | ✅ | ✅ |
| Fornecedores e compras | ✅ | ✅ | ✅ |
| Financeiro (lançamentos, resumo, carnê) | ✅ | ✅ | ✅ |
| Cobranças manuais e carnê | ✅ | ✅ | ✅ |
| Gateways de pagamento de mercado | ✅ | — | 🚧 catálogo com `available: false` |
| CRM (leads e funil) | ✅ | ✅ | ✅ |
| Agenda e recorrência | ✅ | ✅ | ✅ |
| Ordens de serviço | ✅ | ✅ | ✅ |
| Relatórios agregados | ✅ | ✅ | ✅ |
| Exportação CSV | — | ✅ | ✅ (no navegador) |
| Notificações e preferências | ✅ | ✅ | ✅ |
| Entrega de e-mail (SMTP, fila, cópia do sino) | ✅ | — | — |
| Rotinas agendadas | ✅ | ✅ (plataforma) | ✅ |
| Usuários, papéis e permissões | ✅ | ✅ | ✅ |
| Configurações da empresa | ✅ | ✅ | ✅ |
| Conta própria, senha e segundo fator | ✅ | — (é a própria conta) | ✅ |
| Dados do titular (LGPD) | ✅ | — (é a própria conta) | ✅ |
| Auditoria da empresa e da plataforma | ✅ | ✅ | ✅ |
| Contas sem confirmação (porta de plataforma) | ✅ | ✅ (plataforma) | ✅ |
| Modo manutenção | ✅ | ✅ (plataforma) | ✅ |
| Modelos de e-mail | ✅ | — | 🚧 só tabela; os textos vivem em código |
| Upload de arquivo (logo, anexos) | — | — | 🚧 sem parser `multipart` |
| Planos, assinaturas e faturas do SaaS | — | — | 🚧 sem tabela e sem rota |
| Pagamento em gateway e nota fiscal | — | — | 🚧 fora da 1.0, por decisão |

Legenda: ✅ implementado localmente · 🚧 planejado, com o motivo e a condição de entrada em
[docs/ROADMAP.md](docs/ROADMAP.md).

---

## Tecnologias

### Backend

| Tecnologia | Versão | Para quê |
| --- | --- | --- |
| Node.js | 24 LTS recomendado | Runtime do CI; Vitest 5 exige 22.12+, 24.x ou 26+ conforme seu campo `engines` |
| TypeScript | 5.6 | Todo o código, com `noUnusedLocals` e `noUnusedParameters` ligados |
| Fastify | 5 | Framework HTTP: rotas, hooks, plugins e o gate estrutural |
| Prisma | 6 | ORM e migrations; fonte única de persistência ([ADR-0001](docs/adr/0001-persistencia-unica-prisma.md)) |
| MySQL | 8 | Banco relacional, InnoDB por chave estrangeira e transação |
| Zod | 3 | Validação de entrada em toda rota, com schema `strict()` onde o campo desconhecido não pode entrar |
| @fastify/jwt | 10 | Access e refresh token, com escopo próprio para a etapa do segundo fator |
| @fastify/helmet | 13 | Headers de segurança, com CSP ligada em produção |
| @fastify/cors | 10 | Origem permitida com credenciais |
| @fastify/rate-limit | 10 | Limitador global e por rota |
| bcryptjs | 2.4 | Hash de senha e hash de isca do bloqueio |
| otpauth | 9.5 | TOTP do segundo fator |
| nodemailer | 10.1 | Transporte SMTP da entrega de e-mail |
| Vitest | 5 | Suíte contra o MySQL real, em processo único, em série e com banco de prova separado |
| tsx | 4.19 | Rodar TypeScript sem build no desenvolvimento e nos scripts de banco |

### Frontend

| Tecnologia | Versão | Para quê |
| --- | --- | --- |
| React | 18.3 | Interface do painel e das telas abertas |
| React Router | 7 | As 29 rotas declaradas em `App.tsx`, com carregamento por rota |
| Vite | 7 | Build e dev server, com code splitting medido |
| Tailwind CSS | 4 | Utilitários, via plugin do Vite |
| AdminLTE | 4.10 | Estrutura do painel: sidebar, navbar, cards e os componentes que ele embute |
| FullCalendar | 6.1 | Calendário da agenda em mês, semana, dia e lista, carregado só na tela que o desenha |
| Axios | 1.7 | Cliente HTTP do painel |
| jQuery | 3.7 | Base UMD que o Toastr e o AdminLTE esperam |
| SweetAlert2 | 11 | Confirmação e entrada de texto no lugar dos diálogos nativos |
| Toastr | 2.1 | Avisos efêmeros, centralizados num módulo só |
| Vitest + jsdom | 5 / 27 | Testes de componente e de tela |
| Testing Library | 16 | Interação provada como a pessoa faria |
| puppeteer-core | 25 | Provas de navegador real (na raiz do monorepo) |

### Camada própria

| Nome | Para quê |
| --- | --- |
| `lib/prisma.ts` | A fonte única de cliente Prisma: nada abre conexão por conta própria |
| `lib/company-context.ts` | Resolve a empresa da sessão e confere vínculo, conta ativa e empresa ativa a cada request |
| `lib/rbac.ts` | Catálogo de permissões, matriz e a hierarquia de quem pode conceder o quê |
| `lib/platform.ts` | O papel de plataforma conferido no banco, não no token |
| `lib/audit.ts` | O gravador da trilha, com escopo de tenant e de plataforma, que nunca lança |
| `lib/errors.ts` | `AppError` e o handler central: Zod vira 400, conflito vira 409, ausência vira 404 |
| `lib/money.ts` | Centavo inteiro, `Decimal`, arredondamento único e o resto da divisão na última parcela |
| `lib/installments.ts` | O carnê que nasce da venda e da compra, com vencimento no calendário da empresa |
| `lib/stock.ts` | A trava de saldo no `UPDATE`, a política de negativo e a subida com preço de custo |
| `lib/tx.ts` | Transação com re-tentativa de deadlock, para duas escritas simultâneas não inventarem estoque |
| `lib/time.ts` | A meia-noite no fuso da empresa: "vencida" e "mês corrente" são do lado de quem opera |
| `lib/tokens.ts` | Hash do refresh token e a rotação com guarda de linhagem |
| `lib/password.ts` / `lib/passwordPolicy.ts` | Custo do hash e a régua de senha forte num lugar só |
| `lib/tentativas.ts` | Bloqueio por conta com hash de isca, para o endereço inexistente custar o mesmo tempo |
| `lib/criptografia.ts` | Envelope AES-256-GCM do segredo do segundo fator |
| `lib/segundo-fator.ts` | TOTP, desafio, configuração e a regra de quando o fator é obrigatório |
| `lib/brFields.ts` | CNPJ, CPF, CEP, telefone, UF, moeda, idioma e fuso validados sem biblioteca externa |
| `lib/pix.ts` | A régua da chave Pix por tipo, que valida mas não gera BR Code |
| `lib/pagination.ts` | Página, tamanho e o envelope `{data, meta}` de toda listagem |
| `lib/mail/` | A porta de entrega ([ADR-0020](docs/adr/0020-entrega-de-email-por-fila-de-memoria.md)): SMTP, console, caixa de memória, fila com re-tentativa e recuo, e as mensagens com o primeiro nome escapado |
| `plugins/gate.ts` | O hook que derruba o boot se a rota nascer sem guarda |
| `plugins/security.ts` | Helmet, CORS e limitador global, registrados antes da primeira rota de negócio |
| `plugins/maintenance.ts` | O 503 de manutenção com bypass público e limitador próprio |
| `modules/lgpd/lgpd.service.ts` | Aceite, exportação, anonimização e exclusão do titular |
| `tools/verifica-lint.cjs` | Lint da casa, sem dependência nova: `console.log`, `debugger`, `any` e diretiva sem justificativa |
| `tools/verifica-cobertura.cjs` | Portão por arquivo com linha de base versionada e exceção que exige motivo |
| `tools/verifica-audit.cjs` | Portão do `npm audit` que reprova se a contagem piorar |
| `tools/verifica-links-doc.cjs` | Toda porta da documentação de entrada existe, e nenhum marcador de rascunho sobrou |

---

## Estrutura de pastas

```text
nexusbusinessmanager/
├── api/
│   └── [...path].ts         → entrypoint serverless da Vercel: monta a mesma árvore de rotas
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   │   ├── schema.prisma        → 35 models e 21 enums do domínio inteiro
│   │   │   ├── migrations/          → 2 migrations: o baseline e a anonimização do titular
│   │   │   ├── seed.ts              → administrador, conta de desenvolvimento e empresa demo
│   │   │   └── administrador-da-plataforma.ts → bootstrap seguro do admin em produção
│   │   ├── src/
│   │   │   ├── app.ts               → buildApp(): a única montagem de rotas, container e serverless
│   │   │   ├── server.ts            → o processo longo: sobe o HTTP e inicia o agendador
│   │   │   ├── config/              → leitura e validação do ambiente, com trava de produção
│   │   │   ├── lib/                 → a camada própria: dinheiro, estoque, tempo, RBAC, auditoria,
│   │   │   │                          criptografia, tokens, campos brasileiros e a porta de e-mail
│   │   │   ├── modules/             → 21 módulos, cada um com routes, schemas e service
│   │   │   └── plugins/             → auth, gate estrutural, segurança e manutenção
│   │   └── test/                    → 60 arquivos de teste contra o MySQL de prova
│   └── web/
│       ├── src/
│       │   ├── App.tsx              → as 29 rotas, com carregamento por rota
│       │   ├── pages/               → 25 telas: vitrine, entrada, painel e os módulos
│       │   ├── components/          → casca do painel, campos, modais, CMS, vitrine e configurações
│       │   ├── context/             → sessão e tema
│       │   ├── lib/                 → 30 módulos: cliente HTTP, CSV, destino seguro, avisos, erros
│       │   ├── styles/              → os tokens dos dois temas sobre AdminLTE e Tailwind
│       │   └── test/                → 24 arquivos de teste de tela e componente
│       └── vite.config.ts           → build, proxy e divisão por rota
├── assets/brand/            → a marca oficial e o arquivo de identidade do rodapé
├── deploy/                  → backup e restauração do MySQL, ambiente da Vercel, nginx do painel
│                              e preparação do banco gerenciado
├── docs/
│   ├── adr/                 → 26 decisões de arquitetura, uma por arquivo
│   ├── decisoes/            → 7 decisões do dono que ainda governam o produto (G1 a G8)
│   ├── screenshots/         → 122 capturas das telas e dos estados delas
│   ├── legado/migrations-antigas/ → as 23 migrations anteriores ao baseline, arquivadas
│   ├── ESTADO-ATUAL.md      → inventário medido do produto, seção por seção
│   ├── AUDITORIA.md         → achados abertos, um por um, com evidência
│   ├── ROADMAP.md           → o que falta e a condição de entrada de cada item
│   └── PRODUCAO.md          → o roteiro de publicação, backup e restauração
├── tools/                   → 61 arquivos versionáveis: pilha de prova, capturas e portões
├── .github/                 → validações de CI e dependabot; execução remota ainda pendente
├── Dockerfile.api / Dockerfile.web / docker-compose.yml → a pilha em container
├── vercel.json / tsconfig.serverless.json               → a publicação na mesma origem
├── SECURITY.md              → canal de relato de falha e os riscos aceitos por escrito
└── CHANGELOG.md             → histórico por rodada, mais novo primeiro
```

---

## Arquitetura

```text
┌──────────────────────────────────────────────────────────┐
│                    1. CAMADA DE FRONT-END                │
├──────────────────────────────────────────────────────────┤
│  Navegador Web                                           │
│                                                          │
│  • React 18 + React Router 7                             │
│  • AdminLTE 4 + Tailwind 4                               │
│  • Camada de tokens própria                              │
│  • Tema claro e escuro antes da pintura                  │
│  • SweetAlert2 e Toastr                                  │
│  • FullCalendar só na rota da agenda                     │
└────────────────────────────┬─────────────────────────────┘
                             │
                             │ HTTPS, mesma origem
                             │ Access token de 15 min
                             │ Refresh rotacionado (HMAC no banco)
                             ▼
┌──────────────────────────────────────────────────────────┐
│                  2. CAMADA DE APLICAÇÃO                  │
├──────────────────────────────────────────────────────────┤
│  Fastify 5 — buildApp()                                  │
│                                                          │
│  Fluxo de requisição:                                    │
│                                                          │
│  Manutenção (503 com bypass)                             │
│      ↓                                                   │
│  Segurança (helmet, CORS, limitador)                     │
│      ↓                                                   │
│  Gate estrutural (rota sem guarda não sobe)              │
│      ↓                                                   │
│  Autenticação (JWT ou etapa de segundo fator)            │
│      ↓                                                   │
│  Contexto da empresa (vínculo + conta + empresa ativas)  │
│      ↓                                                   │
│  Autorização (recurso:ação) ou papel de plataforma       │
│      ↓                                                   │
│  Schema Zod da entrada                                   │
│      ↓                                                   │
│  Service do módulo — dono da transação                   │
│      ↓                                                   │
│  lib/ (dinheiro, estoque, tempo, auditoria, e-mail)      │
│      ↓                                                   │
│  Handler central de erros                                │
└────────────────────────────┬─────────────────────────────┘
                             │
                             │ Prisma 6
                             │ companyId por construção
                             ▼
┌──────────────────────────────────────────────────────────┐
│                    3. CAMADA DE DADOS                    │
├──────────────────────────────────────────────────────────┤
│  MySQL 8                                                 │
│  • InnoDB                                                │
│  • utf8mb4                                               │
│  • 35 models · 21 enums · 36 tabelas físicas             │
│                                                          │
│  ESTRUTURA FUNCIONAL                                     │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ IDENTIDADE E ACESSO                                │  │
│  │ users ─ companies ─ company_users                  │  │
│  │ refresh_tokens ─ password_reset_tokens             │  │
│  │ email_verification_tokens ─ recovery_codes         │  │
│  │ login_attempts ─ consent_records                   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ CADASTROS E CATÁLOGO                               │  │
│  │ clients ─ suppliers ─ products                     │  │
│  │ product_categories ─ stock_movements               │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ OPERAÇÃO                                           │  │
│  │ sales ─ sale_items ─ purchases ─ purchase_items    │  │
│  │ service_orders ─ items ─ history                   │  │
│  │ leads ─ agenda_events                              │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ DINHEIRO                                           │  │
│  │ finance_categories ─ finance_entries ─ charges     │  │
│  │ payment_gateways                                   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ GESTÃO E VITRINE                                   │  │
│  │ audit_logs ─ notifications ─ preferences           │  │
│  │ cron_jobs ─ landing_config ─ landing_items         │  │
│  │ legal_documents ─ email_templates (sem uso)        │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

A regra de dependência é uma só: **tela nenhuma decide autorização**. O gate estrutural derruba o
boot se a rota nascer sem guarda, o contexto resolve a empresa antes do service rodar, e a
permissão é conferida no servidor antes de qualquer botão existir.

A camada de escrita é o degrau do meio: o `service` de cada módulo é dono da transação, do
nascimento do documento, da baixa de estoque e do carimbo de auditoria. À rota sobra validar a
entrada com Zod, resolver quem pode e devolver o que mostrar. Onde o domínio diz não, a resposta
volta como `AppError` com o status certo — 400 para entrada inválida, 403 para falta de degrau, 404
para o que é de outra empresa, 409 para conflito de estado — e nunca como exceção na cara de quem
visita.

O mesmo `buildApp()` monta os dois mundos: o processo longo do container (`src/server.ts`, que
também inicia o agendador) e a Function da Vercel (`api/[...path].ts`, que drena a fila de e-mail ao
fim da resposta). Não existe segunda árvore de rotas para manter em paralelo.

---

## Banco de dados

**MySQL 8+**, engine InnoDB obrigatória (chave estrangeira e transação), charset `utf8mb4`. O schema
tem **35 models** e **21 enums**, e o banco físico tem **36 tabelas** — as 35 mais
`_prisma_migrations`.

O histórico é versionado em **2 migrations** (`apps/api/prisma/migrations/`): o
[baseline](docs/adr/0024-baseline-de-migrations.md), que reergue um MySQL vazio inteiro, e a
anonimização e exclusão do titular. As 23 migrations anteriores foram arquivadas em
`docs/legado/migrations-antigas/` — a cadeia longa não reerguia um banco vazio, e o baseline é o que
fecha essa lacuna.

```bash
npm run db:migrate   # prisma migrate deploy: aplica o histórico, sem prompt
npm run db:seed      # administrador da plataforma, conta de desenvolvimento e empresa demo
npm run db:prova     # cria e prepara o banco de prova, separado do de desenvolvimento
```

O `db:seed` não é opcional numa instalação nova: sem ele não há administrador da plataforma, e as
portas de plataforma ficam sem quem possa abri-las. Em produção o seed de demonstração é **recusado**
([ADR-0005](docs/adr/0005-semente-sem-demonstracao-em-producao.md)), e o administrador nasce pelo
bootstrap próprio:

```bash
npm run admin:criar  # lê SUPER_ADMIN_EMAIL e ADMIN_CRIAR_SENHA do ambiente; nada é impresso
```

`npm run db:push` é atalho de desenvolvimento para reconstruir a estrutura sem histórico — não é o
caminho de uma instalação limpa, e os scripts de operação não o usam.

---

## Instalação

### Pré-requisitos

- Node.js 24 LTS e npm recomendados; Node 20 não é suportado pelo Vitest 5 do lockfile
- MySQL 8.x escutando em `127.0.0.1:3306`, com um banco vazio criado
- Git

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/claytonmarcelo/Nexus-Business-Manager.git
cd Nexus-Business-Manager

# 2. Instale as dependências (o postinstall já gera o cliente Prisma)
npm install

# 3. Prepare o .env da API
cp apps/api/.env.example apps/api/.env

# 4. Crie os dois bancos no MySQL
mysql -u root -p -e "CREATE DATABASE nexusbusinessmanager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p -e "CREATE DATABASE nexusbusinessmanager_teste CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 5. Ajuste no .env: DATABASE_URL, DATABASE_URL_TESTE, os dois segredos de JWT,
#    SUPER_ADMIN_EMAIL e as senhas que o seed exige (veja Configuração abaixo)

# 6. Aplique o histórico e semeie
npm run db:migrate
npm run db:seed

# 7. Suba os dois lados
npm run dev
```

O painel sobe em `http://localhost:5173` e fala com a API em `http://localhost:3001`.

### Atalho

O `npm run dev` da raiz sobe API e painel juntos (`tools/dev.cjs`). Para subir só um dos lados:

```bash
npm run dev:api   # apenas a API, com tsx watch
npm run dev:web   # apenas o painel, com Vite
```

### Em desenvolvimento

```bash
npm run typecheck   # as três pontas: API, painel e entrypoint serverless
npm run build       # apps/api/dist + apps/web/dist
npm test            # as duas suítes, contra o banco de prova
npm run verify      # fumaça no navegador real
```

A suíte **recusa rodar** sem `DATABASE_URL_TESTE` apontando para `nexusbusinessmanager_teste`, e
recusa também se o `DATABASE_URL` do `.env` apontar para o banco de prova: desenvolvimento e prova
não podem ser o mesmo banco ([ADR-0010](docs/adr/0010-banco-de-prova-separado.md)). O
`npm run db:prova` cria o banco, aplica as migrations, semeia e grava o endereço local da pilha de
prova.

As provas de navegador nunca tocam a porta do produto: a pilha de prova sobe em **3002 e 5174**
([ADR-0017](docs/adr/0017-pilha-de-prova-com-porta-propria.md)), e o endereço sai do helper, nunca
digitado à mão.

### Em produção

O roteiro completo, com as duas subidas e o que produção nunca recebe, está em
[docs/PRODUCAO.md](docs/PRODUCAO.md). Os dois caminhos:

**A — Docker.** A pilha sobe API, painel e MySQL com uma porta só exposta; o banco não fica acessível
de fora ([ADR-0018](docs/adr/0018-producao-em-container-com-uma-porta.md)).

```bash
cp .env.docker.example .env   # preencher na máquina; nenhum valor existe no repositório
npm run docker:subir          # docker compose up -d --build
npm run docker:migrar         # aplica o histórico dentro do container
npm run docker:admin          # bootstrap do administrador da plataforma
npm run docker:provar         # prova da pilha no ar
```

**B — Mesma origem na Vercel.** O painel é o build estático do Vite e todo caminho `/api/*` cai numa
Function que monta a mesma árvore de rotas. O banco é MySQL gerenciado (TiDB Cloud Starter ou
equivalente).

```bash
npm install
npm run prisma:generate -w @nexus/api   # sem isto, nada compila
npm run prisma:deploy -w @nexus/api     # aplica as migrations, sem prompt
npm run admin:criar -w @nexus/api       # o administrador da plataforma
npm run build                           # apps/api/dist + apps/web/dist
node deploy/env-vercel.cjs <projeto> --url <endereco> --team <time>
vercel deploy --prod
```

- **`.env` de produção**: `NODE_ENV=production`, os dois segredos de JWT próprios,
  `TOTP_ENCRYPTION_KEY` de 64 hex (sem ela a aplicação não sobe), `CORS_ORIGIN` do endereço publicado,
  `TRUST_PROXY=1` atrás do proxy e `MAIL_TRANSPORT=smtp` com um SMTP de verdade — com o transporte de
  console o link de recuperação morre no log
- **O que produção nunca recebe**: seed de demonstração, conta de desenvolvimento, token de
  recuperação exposto na resposta e `ALLOW_DEV_SEED` ligado
- **Relógio das rotinas**: no container o agendador roda no processo; na Vercel ele não inicia, e as
  rotinas dependem de execução manual ou de um agendador externo — está declarado no roadmap
- **Backup**: `npm run docker:backup` despeja o `mysqldump` em gzip com `.sha256` e `.meta.json`;
  `npm run docker:restaurar` recusa hash divergente, schema reservado e banco não vazio antes de
  escrever; e `npm run docker:provar-backup` restaura num banco separado e confere tabela por tabela
  ([ADR-0019](docs/adr/0019-backup-com-mysqldump-dentro-do-container-e-restauracao-conferida.md))

### Contas e acesso

A conta de plataforma nasce do bootstrap (`npm run admin:criar`) ou do seed, e o endereço dela vem
de **`SUPER_ADMIN_EMAIL`** — o arquivo de exemplo traz a identidade fictícia `admin@exemplo.test`, e
o endereço real só existe no `.env` da máquina, nunca no repositório. Uma guarda permanente varre
todos os arquivos rastreados e falha se um endereço de domínio pessoal ou uma credencial literal
reaparecer.

Essa conta recebe `platform_role = SUPER_ADMIN`, entra como `OWNER` de toda empresa criada e é
protegida por regra de servidor: não pode ser rebaixada de `OWNER`, não passa pelo fluxo de
recuperação de senha, não recebe reenvio de verificação e não é alcançada pela exclusão LGPD. A
proteção é pela coluna, não pelo endereço — trocar o e-mail no ambiente não cria uma conta sem
guarda.

A senha é rotacionável pelo próprio bootstrap, com as ações de promover, renovar senha e reativar
exigindo consentimento explícito no ambiente (`ADMIN_CRIAR_PROMOVER`, `ADMIN_CRIAR_RENOVAR_SENHA`,
`ADMIN_CRIAR_REATIVAR`). Nenhuma credencial é impressa no console, e o segredo nunca volta para o
Git.

**O cadastro self-service existe** (`/cadastro`): a pessoa cria a própria conta e a própria empresa,
virando `OWNER` dela, com o aceite dos textos legais gravado na mesma transação. É decisão registrada
em [docs/decisoes/G4-cadastro-aberto.md](docs/decisoes/G4-cadastro-aberto.md). Com
`REQUIRE_EMAIL_VERIFICATION=1`, a conta só entra depois de confirmar o endereço — e existe uma porta
de plataforma para confirmar administrativamente quem ficou preso sem receber o e-mail
([ADR-0022](docs/adr/0022-a-porta-de-plataforma-que-confirma-um-endereco.md)).

---

## Configuração

As variáveis vivem em `apps/api/.env`, que **não** é versionado; só o
[`.env.example`](apps/api/.env.example) entra no Git, com as 42 chaves nomeadas e nenhum valor real.

| Variável | Para quê |
| --- | --- |
| `NODE_ENV`, `PORT`, `HOST` | Modo de execução e endereço do processo |
| `CORS_ORIGIN`, `TRUST_PROXY` | Origem permitida e confiança no proxy reverso |
| `DATABASE_URL` | Conexão MySQL de desenvolvimento ou produção |
| `DATABASE_URL_TESTE` | Conexão do banco de prova; a suíte recusa rodar sem ela |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Os dois segredos de assinatura, independentes |
| `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL` | Validade do access (15 min) e do refresh (7 dias) |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` | Teto do limitador global (100 por minuto) |
| `BODY_LIMIT_BYTES` | Teto do corpo aceito pela API |
| `SUPER_ADMIN_EMAIL` | Endereço da conta de plataforma; no exemplo, identidade fictícia |
| `SEED_ADMIN_PASSWORD`, `SEED_DEV_PASSWORD` | Senhas que o seed exige, sem valor escrito no repositório |
| `SEED_DEV_ACCOUNT`, `SEED_DEMO_COMPANY`, `ALLOW_DEV_SEED` | Chaves da demonstração; desligadas no exemplo e recusadas em produção |
| `ADMIN_CRIAR_SENHA`, `ADMIN_CRIAR_NOME` | Credencial e nome do bootstrap do administrador |
| `ADMIN_CRIAR_PROMOVER`, `ADMIN_CRIAR_RENOVAR_SENHA`, `ADMIN_CRIAR_REATIVAR` | Consentimentos explícitos para as três ações que mudam uma conta existente |
| `AUTH_EXPOSE_RESET_TOKEN` | Expor o token de recuperação na resposta; só fora de produção, e a guarda de produção recusa |
| `REQUIRE_EMAIL_VERIFICATION` | Exigir endereço confirmado antes de emitir sessão |
| `TOTP_ENCRYPTION_KEY` | Chave de 64 hex do envelope AES-256-GCM; obrigatória em produção |
| `MAIL_TRANSPORT` | `smtp` ou `memory`; vazio decide pela fábrica — com SMTP declarado entrega de verdade, sem ele cai no console (`lib/mail/index.ts`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `MAIL_FROM` | O servidor de saída e o remetente |
| `MAIL_TENTATIVAS`, `MAIL_BACKOFF_BASE_MS`, `MAIL_TIMEOUT_MS`, `MAIL_FILA_MAXIMA` | Re-tentativa, recuo, teto de espera e tamanho da fila de entrega |
| `WEB_BASE_URL` | Endereço do painel, usado nos links das mensagens |
| `CRON_ENABLED` | Liga o relógio das rotinas no processo longo |
| `AUDIT_RETENTION_DIAS` | Janela da trilha; 0 desliga o expurgo, teto de 3650 dias |

---

## Segurança

| Camada | Como está implementado |
| --- | --- |
| Senha | bcrypt de 12 rondas; política de 8 a 128 caracteres com maiúscula e especial; nunca em texto claro, nunca em log nem na auditoria |
| Sessão | Access de 15 min e refresh de 7 dias guardado como HMAC; rotação com revogação da família inteira em reuso, e guarda de linhagem para a corrida de duas abas |
| Segundo fator | TOTP com segredo em envelope AES-256-GCM, dez códigos de recuperação de uso único, e obrigatoriedade em produção para plataforma e `OWNER` |
| Força bruta | 5 falhas em 15 min bloqueiam a conta por 15 min, com hash de isca equalizando o tempo do endereço inexistente; limitador por rota e global de 100/min |
| Autorização | `recurso:ação` conferida no servidor, hierarquia de papéis centralizada, e gate estrutural que derruba o boot se a rota nascer sem guarda |
| Plataforma | Papel conferido no banco a cada request; a conta de plataforma não se rebaixa, não recupera senha por e-mail e não é excluída pela LGPD |
| Tenancy | `companyId` só do token, conferência de vínculo e de conta/empresa ativas por request, e teste de intrusão A×B rota a rota com conferência no banco |
| Estoque | Baixa por `UPDATE ... WHERE saldo >= q` dentro de transação com re-tentativa de deadlock; livro-caixa sem rota de edição ou exclusão |
| Dinheiro | Centavo inteiro e `Decimal`, arredondamento único por linha, resto na última parcela; recebimento de cobrança cria uma única receita com identificador único |
| Entrada | Zod em toda rota, schema `strict()` onde campo desconhecido não pode entrar, e handler central que não vaza detalhe em produção |
| Headers | Helmet com CSP ligada em produção, CORS com origem declarada e credenciais |
| E-mail | O código de recuperação e de verificação nunca volta no HTTP; o primeiro nome é escapado no HTML das mensagens, e a falha de entrega entra na trilha |
| Trilha | Auditoria com escopo de tenant e de plataforma, que nunca lança e nunca carrega senha, token, hash ou corpo sensível; retenção configurável |
| LGPD | Aceite com versão do texto, exportação com lista escrita do que não sai, anonimização que preserva assinatura e exclusão que apaga a linha com guarda de último `OWNER` |
| Segredos | `.env` fora do Git, `.env.example` sem valor real, guarda permanente que varre a árvore inteira contra endereço pessoal e credencial literal, e `SECURITY.md` com canal de relato |
| Manutenção | 503 com bypass público de limitador próprio; a consulta inicial depende do banco e a prontidão precisa de validação adicional (N91) |

O relato de falha tem porta própria em [SECURITY.md](SECURITY.md). Os riscos que a casa aceitou por
escrito — o limitador com store em memória, o relógio das rotinas que não roda em serverless e as
dependências com alerta aberto — estão um a um em [docs/AUDITORIA.md](docs/AUDITORIA.md).

---

## Testes

A suíte da API roda contra o **MySQL real**, no banco separado `nexusbusinessmanager_teste`. Crie-o
uma vez com a ferramenta da casa, que também aplica as migrations e semeia:

```bash
npm run db:prova
```

Depois:

```bash
npm test              # as duas suítes: API e painel
npm run test:api      # só a API
npm run test:web      # só o painel
npm run test:coverage # API com medidor de cobertura v8
```

Hoje são **744 casos em 84 arquivos** — 553 da API em 60 arquivos e 191 do painel em 24 — cobrindo
login válido e inválido com resposta idêntica para conta inativa, senha errada e endereço
inexistente, o bloqueio por tentativas e o tempo equalizado pela isca, cadastro com aceite dos textos
legais gravado na mesma transação, recuperação com token válido, forjado, usado e expirado,
verificação de e-mail e a porta de plataforma que confirma administrativamente, segundo fator em
todas as etapas (configurar, ativar, código errado, código de recuperação, desligar proibido),
corrida de duas abas e reuso de refresh com a família revogada, isolamento entre empresas atacado
rota a rota com conferência no banco, hierarquia de papéis e a matriz de permissões, o CRUD de
clientes, produtos, fornecedores e categorias, o estoque com a trava de oversell provada em escrita
simultânea e a política de negativo por empresa, vendas com parcelamento e carnê conferido ao
centavo, compras com entrada e custo, ordens de serviço com todas as transições permitidas e todas
as proibidas, a baixa na conclusão e o estorno, agenda com recorrência e a ocorrência avulsa que não
se edita, CRM com a conversão em cliente na mesma transação, financeiro com dinheiro em Decimal e a
vencida lida no fuso da empresa, cobranças com número por empresa, receita única e as recusas de
data, notificações com dedup e o portão do canal de e-mail, as quatro rotinas, o CMS e os textos
legais com versão, os três direitos do titular (acesso, anonimização, exclusão) e a retenção da
trilha.

Do lado estrutural, a casa tem guardas que não são teste de módulo: o **gate de rotas** (toda rota
tem guarda ou é pública), a **varredura de caracteres** (nenhum arquivo rastreado carrega alfabeto
não latino, e a mensagem do commit também não), a **varredura de identificadores** (nenhum endereço
pessoal nem credencial literal em arquivo rastreado), a **auditoria sem segredo**, as **capturas sem
credencial**, os **links da documentação**, o **zero placeholder**, o **menu sem página vazia**, o
**banco de prova separado** e os **portões de qualidade** (lint, cobertura por arquivo e `npm audit`
que não piora). Cada uma tem a prova vermelha junto: um detector que nunca falha não é portão.

Do lado do painel, os testes de tela cobrem a entrada em quatro passos, a privacidade do formulário
de login, o destino seguro depois da entrada, as duas telas de plataforma, os dados do titular, o
segundo fator, as ordens de serviço, as cobranças e o menu sem linha fantasma.

E há a prova de **navegador real**, que não é teste de unidade. O `npm run verify` abre a vitrine, a
entrada, o menu inteiro da conta fictícia e as quatro páginas de erro em três larguras (360, 1024 e
1440), e na janela larga ainda as telas que só o administrador da plataforma vê. As provas por módulo
clicam a tela inteira e imprimem a contagem de verificações com as falhas ao lado — barra lateral,
cobranças, ordens de serviço, notificações, privacidade do login e backup restaurado tabela por
tabela. A acessibilidade varre **22 telas** e mede o alvo de toque; o contraste é conferido nas
**17 telas** do painel, nos dois temas e nas duas janelas, contra o fundo realmente composto.

```bash
npm run verify                    # fumaça: vitrine, menu e páginas de erro no navegador
node tools/verify-sidebar.cjs     # uma prova por módulo
node tools/verifica-lint.cjs      # portão de lint da casa
node tools/verifica-cobertura.cjs # portão por arquivo, com linha de base
node tools/verifica-audit.cjs     # portão do npm audit
node tools/verifica-links-doc.cjs # as portas da documentação existem
```

No Windows, se a suíte falhar por escrita em pasta temporária, rode o Vitest direto pelo binário do
workspace em vez do wrapper `.cmd` — o wrapper herda as restrições do `cmd.exe`:

```bash
node node_modules/vitest/vitest.mjs run --root apps/api
```

---

## Demonstração

Não há demonstração online: o projeto roda localmente. A demonstração de dados é o seed, controlado
por duas chaves que vêm **desligadas** no arquivo de exemplo e são **recusadas em produção**:

```bash
SEED_DEV_ACCOUNT=1 SEED_DEMO_COMPANY=1 npm run db:seed
```

A conta de desenvolvimento usa a identidade fictícia `admin@exemplo.test` e a senha vem de
`SEED_DEV_PASSWORD`; a empresa de demonstração recebe clientes, produtos, vendas, compras e
lançamentos para os indicadores do painel terem o que contar. Nenhuma senha é transcrita neste
README: sem valor declarado, o seed recusa em vez de inventar uma. A captura histórica de login
contém uma credencial fictícia, mantida por decisão explícita do dono (N1 em
[docs/AUDITORIA.md](docs/AUDITORIA.md)); isso não autoriza publicar credenciais de produção.

Para a pilha de prova — que é outra coisa, e nunca toca a porta do produto — o comando é
`npm run db:prova`, e o servidor sobe em 3002/5174 com `npm run dev:prova`.

---

## Roadmap

### Concluído

- [x] **Fundação** — monorepo npm workspaces, Fastify + Prisma + MySQL, React + Vite + AdminLTE,
  design system nos dois temas e a fonte única de persistência
- [x] **Identidade** — autenticação, cadastro, recuperação, RBAC com catálogo único, multiempresa
  com isolamento por construção e teste de intrusão A×B
- [x] **Cadastros e catálogo** — clientes, produtos, categorias, fornecedores e estoque em
  livro-caixa com trava de oversell no banco
- [x] **Operação** — vendas com parcelamento, compras com entrada e custo, ordens de serviço com
  fluxo fechado e baixa na conclusão, agenda com recorrência, CRM com funil e conversão
- [x] **Dinheiro** — financeiro em centavo e Decimal, carnê da venda e da compra, cobranças manuais
  com receita única e vencida lida no fuso da empresa
- [x] **Gestão** — relatórios agregados, notificações com dedup e cópia por e-mail, rotinas
  agendadas, usuários e papéis, configurações da empresa e auditoria em dois escopos
- [x] **Vitrine** — CMS da página pública, textos legais com versão e o editor que recusa publicar
  rascunho
- [x] **F1 — Higiene permanente** — alfabeto latino em toda a árvore e nos commits, rodapé único com
  arquivo de marca, seed barrado em produção e bootstrap seguro do administrador
- [x] **F2 — Superfície de ataque** — matriz de rotas, escopo de auditoria separado e a tela de
  auditoria da plataforma
- [x] **F3 — Menu e operação** — barra sem página vazia, ordens de serviço e cobranças com prova de
  navegador e ADR própria
- [x] **F4 — Autenticação reforçada** — entrega de e-mail por porta e fila, verificação de endereço,
  bloqueio por conta sem diferença mensurável e segundo fator TOTP com segredo cifrado
- [x] **F5 — Robustez do painel** — guarda de resposta atrasada, privacidade do login, tema com duas
  chaves, `ErrorBoundary`, fumaça no navegador, code splitting medido e acessibilidade medida
- [x] **F6 — Operação** — Docker com uma porta, backup com restauração conferida, fila de e-mail
  assíncrona, sino que chama alguém e a porta de plataforma que confirma endereço
- [x] **F7 — Conformidade** — aceite dos textos legais no cadastro, exportação do titular,
  anonimização e exclusão, retenção configurável da trilha, `SECURITY.md` e a licença relatada
- [x] **C1 — Baseline de migrations** — a cadeia longa não reerguia um MySQL vazio; o baseline fecha
  a lacuna e é provado em banco vazio
- [x] **C2 — Preparação do caminho de publicação** — entrypoint serverless e configuração para painel
  e API na mesma origem; não equivale a serviço publicado e validado

### A seguir

- [ ] **F8 — Qualidade como portão** — concluir validação de CI, Dependabot, lint, cobertura e audit;
  confirmar os checks obrigatórios no GitHub antes de afirmar bloqueio de merge
- [ ] **Publicação e prontidão global** — configurar TiDB/Vercel, validar fluxos no ar e resolver ou
  aceitar explicitamente os achados de moeda, fuso, saúde da API e operação distribuída
- [ ] **F9 — Revisão de prontidão e pacote da versão**

Ainda há implementação, validação e decisões pendentes. Pagamentos em gateway e nota fiscal foram
excluídos da 1.0 por decisão; os achados novos de prontidão não foram automaticamente adiados. Também
ficam planos e assinaturas do SaaS, upload de arquivo, os modelos de e-mail que hoje só têm tabela,
o store compartilhado do limitador, o relógio das rotinas em serverless e a cópia off-site do backup.
Cada item tem o motivo e a condição de entrada escritos em
[docs/ROADMAP.md](docs/ROADMAP.md), e os achados abertos estão um a um em
[docs/AUDITORIA.md](docs/AUDITORIA.md).

A **licença do repositório** segue em branco por decisão do dono: não existe arquivo `LICENSE`, o
`package.json` declara `UNLICENSED` e o relato está em
[docs/decisoes/G6-licenca.md](docs/decisoes/G6-licenca.md). Enquanto essa decisão não sair, o código
não tem licença de uso concedida a terceiros.

---

## Histórico de versões

O detalhamento por rodada está em [CHANGELOG.md](CHANGELOG.md), sempre com o mais novo primeiro. O
baseline desta árvore é `0.1.0`, e os commits seguem a mesma regra: um por etapa funcional validada,
em português brasileiro, dizendo o que mudou e por quê.

---

## Desenvolvedor

<table>
  <tr>
    <td width="90" align="center">
      <img src="https://github.com/claytonmarcelo.png" width="90" alt="Clayton Marcelo">
    </td>
    <td>
      <strong>Clayton Marcelo</strong><br>
      Full stack — React, Node.js, TypeScript, MySQL<br><br>
      <a href="https://github.com/claytonmarcelo"><img src="https://img.shields.io/badge/GitHub-claytonmarcelo-181717?style=flat-square&logo=github" alt="GitHub"></a>
      <a href="https://www.linkedin.com/in/clayton-marcelo-dev/"><img src="https://img.shields.io/badge/LinkedIn-clayton--marcelo--dev-0A66C2?style=flat-square&logo=linkedin&logoColor=white" alt="LinkedIn"></a>
      <a href="https://cmarcelodev.com"><img src="https://img.shields.io/badge/Site-cmarcelodev.com-000000?style=flat-square" alt="Site cmarcelodev.com"></a>
    </td>
  </tr>
</table>

---

<p align="center">
  <sub>NEXUS BUSINESS MANAGER · Clayton Marcelo · 2026</sub>
</p>
