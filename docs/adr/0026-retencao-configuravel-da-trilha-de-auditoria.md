# ADR 0026 — A trilha de auditoria tem janela configurável, e o padrão é não apagar nada

Data: 2026-11-08
Estado: Aceito

## Contexto

A LGPD pede, no art. 16, II e III, que os dados pessoais sejam conservados só pelo tempo necessário e
que sejam eliminados depois de encerrada a finalidade. A trilha de auditoria do Nexus (`audit_logs`) é
justamente isso: cada linha diz **quem** praticou a ação, **de onde** a pessoa veio, **qual empresa** era e
o que mudou. Uma linha de trilha é dado pessoal tanto quanto o nome que está na tabela de clientes.

Até aqui a trilha crescia para sempre, e o contrato da F7 pedia "retenção configurável de logs de
auditoria" sem dizer como. Três perguntas precisavam de resposta escrita:

1. Onde mora a configuração da janela — no ambiente, na empresa, ou na tela de Configurações?
2. Quem apaga: a instalação inteira ou cada empresa a sua trilha?
3. O apagamento é silencioso ou é auditado?

## Decisão

**A janela mora no ambiente, e o padrão é zero.** `AUDIT_RETENTION_DIAS=0` (padrão de fábrica) significa
"não apaga nada". A escolha de reverter uma política de retenção é barata e não custa dado; a escolha de
reverter o corte de um histórico já apagado é irreversível. O padrão tem de ser o reversível.

**A janela é da plataforma, não da empresa.** A trilha atravessa todas as casas (é o que a F2 resolveu com
a coluna `scope`), e a política de guarda acompanha: uma empresa não decide por quantos dias fica guardada
a prova de que ela mesma mexeu em dado de alguém. Uma empresa que apaga a própria trilha de auditoria
pode apagar a prova de um pedido de eliminação de outra empresa que existe na mesma tabela.

**O corte é em lote, com teto.** `apps/api/src/modules/audit/retencao-auditoria.ts` apaga em lotes de mil
linhas, ordenadas pela mais antiga, com teto de duzentas lotes por corrida (duzentas mil linhas). O que
sobrou fica para a corrida seguinte, e a mensagem da rotina diz isso em vez de fingir que acabou.

**O corte é estrito (`createdAt < corte`).** Uma linha que nasceu exatamente no instante de corte é da
janela, não é do passado: sem o `<` estrito, a arredondação do relógio poderia levar uma linha nova junto.

**O apagamento é auditado — mas só quando apaga.** A rotina grava `ops.audit_purge` na trilha da
**plataforma** (escopo `platform`, sem empresa dona), com `dias`, `apagadas`, `corte` e `lotes` no
metadata. Uma corrida que não encontrou nada **não** grava linha: o registro de que nada aconteceu é
ruído que ainda ocupa espaço na tabela que a rotina existe para enxugar. O que o operador precisa ver —
"quando apaguei, quantas linhas" — fica na própria linha do expurgo e na coluna "última execução" da tela
de Rotinas.

**A rotina existe como rotina, não como botão solto.** `expurgo-de-auditoria` entra no catálogo de
`JOBS` com agenda `0 3 * * *`, aparece em `/app/rotinas` com executor conhecido e pode ser rodada na
hora pelo botão "Executar agora" do administrador da plataforma. Nenhuma porta nova: quem já roda as
outras rotinas passa a rodar esta do mesmo jeito.

## Consequências

- A instalação que não decide nada continua guardando tudo, e isso é uma **decisão visível**: a descrição
  da rotina na tela de Rotinas diz que a janela vem de `AUDIT_RETENTION_DIAS` e que o padrão é zero.
- A retenção apaga também as linhas que provam o exercício de um direito da LGPD (`lgpd.export`,
  `lgpd.anonymize`, `lgpd.delete`). Isso é declarado em vez de escondido: a trilha é a prova, e quem
  precisa da prova por mais tempo escolhe uma janela maior — ou exporta a auditoria antes.
- O que **não** existe, e é pendência declarada: janela por empresa (o pedido é da plataforma) e
  expurgo com prazo diferente por tipo de evento (financeiro, por exemplo, tem prazo legal próprio). O
  primeiro é produto novo; o segundo é decisão de quem opera, não do código.
- A rotina depende de relógio: na Function da Vercel não há `setInterval`, então ela roda pelo botão da
  tela — a limitação é a mesma das outras rotinas e está declarada no `docs/PRODUCAO.md` §12.
- Prova: `apps/api/test/retencao-de-auditoria.test.ts` (4 casos, vermelho antes do código): a rotina
  existe com agenda `0 3 * * *`; com a janela em zero nada é apagado e a trilha nem ganha registro; com
  a janela de 30 dias só as linhas mais velhas caem e o expurgo se registra com a contagem; e o expurgo
  não toca em conta, aviso nem qualquer outra tabela.
