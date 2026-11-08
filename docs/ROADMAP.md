# ROADMAP — o que fica para depois da 1.0

Lista de tudo que foi decidido **fora** do escopo da versão 1.0, com o motivo e o ponteiro da decisão.
Nada aqui é promessa de data: é registro de que a lacuna é conhecida, escolhida e rastreável.
Ordem de chegada, mais novo primeiro.

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