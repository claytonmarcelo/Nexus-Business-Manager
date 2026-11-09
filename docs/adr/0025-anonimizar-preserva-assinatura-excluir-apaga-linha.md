# ADR 0025 — Anonimizar preserva a assinatura; excluir apaga a linha; a casa decide antes da senha

Data: 2026-11-08
Estado: Aceito

## Contexto

A LGPD dá ao titular dois caminhos de eliminação que não são sinônimos: a anonimização (art. 18, IV,
com o art. 16 permitindo a guarda anonimizada) e a exclusão (art. 18, VI). O produto já registrava o
aceite dos textos (T6.2) e entregava a cópia dos dados (T6.3), mas nenhum dos dois direitos existia.
Ao desenhá-los, três perguntas precisavam de resposta escrita, porque cada uma muda o que a empresa
do cliente perde:

1. O que acontece com os documentos da empresa (vendas, ordens, lançamentos) em que a pessoa aparece?
2. Quem pode impedir o pedido, e em que ordem as guardas conversam com a pessoa?
3. O que prova que o pedido foi negado — e que a negação não destruiu nada?

## Decisão

**Dois verbos, dois efeitos, uma porta cada.** `POST /api/lgpd/minha-conta/anonimizar` e
`POST /api/lgpd/minha-conta/excluir` (`apps/api/src/modules/lgpd/lgpd.routes.ts`), ambas com
`app.authenticate`, contexto da empresa ativa vindo do token e teto de **três pedidos por minuto por
endereço** em cada uma. Nenhuma das duas aceita papel de plataforma como atalho: o pedido é sempre da
pessoa logada sobre a própria conta.

**Anonimizar preserva a assinatura.** A linha do cadastro continua existindo como número sem dono:
nome vira `Titular anonimizado`, e-mail vira `titular-anonimizado+<id>@invalid`, telefone, foto,
segundo fator e sessões somem, `active=false` e `anonymizedAt` recebe a data. O vínculo com a empresa
e os documentos de negócio permanecem apontando para esse número — a empresa não perde a autoria de
uma venda porque quem a registrou exerceu um direito. A migration
`20261017000000_anonimizacao_e_exclusao_do_titular` acrescenta a coluna que torna o estado legível.

**Excluir apaga a linha.** O cadastro sai do banco; sessões, avisos, preferências e aceites saem
junto; a trilha de auditoria permanece com `userId=null` (a coluna é `SetNull`), porque o registro do
evento não é dado pessoal da pessoa — é registro da casa. Os documentos de negócio ficam sem
referência à pessoa, pelo mesmo motivo do parágrafo anterior.

**A ordem das guardas é contrato, não detalhe.** Antes de conferir a senha, o serviço recusa:

1. papel de plataforma (`SUPER_ADMIN` e afins) com **403** e trilha `.blocked` — a conta que administra
   a casa não se elimina por esta porta;
2. último responsável ativo de uma empresa ativa (`OWNER` sem outro `OWNER` ativo na mesma casa) com
   **409** e a frase que manda transferir a propriedade antes — a empresa do cliente não pode ficar
   sem responsável por um pedido individual;
3. só então a senha de confirmação, com **400** e trilha `.failed` carregando o motivo escrito quando
   não confere. Nenhum dos três caminhos altera linha alguma.

Inverter a ordem vazaria informação: conferir a senha primeiro diria a quem errou a senha que a
conta existe e é eliminável; conferir a casa depois da senha obrigaria a pessoa a acertar a senha
para descobrir que precisava transferir a propriedade.

**A trilha é o recibo.** Sucesso grava `lgpd.anonymize` / `lgpd.delete`; recusa grava
`lgpd.anonymize.blocked`, `lgpd.delete.blocked`, `lgpd.anonymize.failed` ou `lgpd.delete.failed`,
sempre com a conta e a empresa do pedido. As ações entraram em `sensivelWhere()`, então aparecem em
"Alterações sensíveis" da Auditoria.

**A tela confirma com senha e diálogo de perigo.** O painel "Eliminar os seus dados" da aba "Seus
dados" (`PrivacidadePanel.tsx`) mantém os dois botões desabilitados sem senha, distingue o vermelho
de perigo (excluir) do caminho sem volta suave (anonimizar), declara o teto de três por minuto antes
do pedido e passa toda confirmação pelo diálogo de perigo do sistema — nunca `confirm()` nativo.
Recusa por senha mantém a pessoa na tela, com a senha ainda no campo e o aviso "A senha não confere.
Nenhum dado foi alterado."; sucesso leva a pessoa para fora da sessão, porque a conta deixou de
servir para entrar.

## Consequências

- A empresa do cliente nunca perde documento nem responsável por exercício de direito individual:
  anonimizar mantém a assinatura, excluir mantém o documento, e a guarda do último OWNER barra o
  pedido antes de qualquer escrita.
- Cada recusa é auditável com motivo escrito, e cada sucesso também — a trilha sensível da casa
  passa a mostrar os dois direitos lado a lado com a exportação da T6.3.
- O teto de três por minuto por endereço é local ao processo (store em memória). Em host com vários
  processos o teto vale por processo; a limitação está declarada em `docs/PRODUCAO.md` e o caminho
  de store compartilhado fica no `docs/ROADMAP.md`.
- Prova: `apps/api/test/anonimizacao-e-exclusao-do-titular.test.ts` (vermelho antes do código) e a
  seção 2c de `tools/verify-configuracoes.cjs`, que exercita os três caminhos no navegador da pilha
  de prova — recusa por senha na conta de captura, recusa por casa e sucesso de anonimização numa
  casa descartável com responsável única que depois ganha sucessor, e exclusão pela API em conta
  STAFF da mesma casa. Tudo que a prova cria sai no `finally`.
