# ADR-0019 — O backup da pilha é um `mysqldump` feito dentro do container, com restauração conferida tabela por tabela

- Status: Aceita (2026-10-14)
- Contexto: segundo item da T5 (F6) do prompt de continuação — seção 45, "backup do volume do MySQL", sob a
  regra 1 de `docs/decisoes/G5-hospedagem-e-backup.md`: *backup que nunca foi restaurado é desejo, não plano*.
  A T5.1 (ADR-0018) tinha deixado o banco sem porta nenhuma no host: o volume `nexus-mysql` existe, os dados
  existem, e não havia nenhuma maneira escrita neste repositório de tirar deles uma cópia que se possa pôr de
  volta. Três coisas precisavam ser decididas juntas, porque cada uma muda as outras: **de onde** o dump sai,
  **sem expor o quê**, e **como provar** que ele restaura. A alternativa de copiar o volume cru do Docker foi
  descartada antes de medir: com o container escrevendo, o `.ibd` copiado não é consistente, e sem parar a pilha
  não há como garantir isso — um backup que só funciona com a instalação no ar é um backup que falha na
  emergência. A alternativa "exportar pela própria API/Prisma" também foi descartada: não levaria routines,
  triggers e events, e precisaria de credencial na linha de comando do host.
- Decisão:
  1. **O dump sai de dentro do container, e a senha nunca atravessa para o host.**
     `deploy/backup-mysql.cjs` executa `docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD"
     exec mysqldump …'` — o `mysqldump` roda com o ambiente que a imagem já tem, o `sh` do container monta o
     `MYSQL_PWD`, e a linha de comando vista pelo host não contém credencial nenhuma. stdout é canalizado para
     `zlib.createGzip({ level: 9 })` e escrito direto no arquivo. As flags são as de consistência:
     `--single-transaction --routines --triggers --events --set-gtid-purged=OFF --default-character-set=utf8mb4
     --skip-lock-tables`. Medido: `35 tabela(s), 24 linha(s), 9 kB gzip em 1683 ms`.
  2. **Sem `--databases`, de propósito.** O dump não emite `CREATE DATABASE` nem `USE` é o que permite
     restaurar o mesmo arquivo num banco de outro nome. É exatamente o formato da prova: a régua restaura em
     `nexusbm_restauracao`, compara com a origem e derruba o banco de conferência no `finally`. O `meta.json`
     registra banco, tabelas, linhas, bytes do dump cru, bytes do gzip, duração, sha256 e a versão do
     `mysqldump` — os números da hora em que o arquivo nasceu, para a régua conferir contra a pilha viva em vez
     de conferir contra a memória.
  3. **Três arquivos por execução, e o hash é do arquivo que está no disco.** `<nome>.sql.gz`,
     `<nome>.sha256` (sobre o gzip armazenado) e `<nome>.meta.json`. Isto é achado corrigido na própria tarefa
     (N70 em `docs/AUDITORIA.md`): a primeira versão calculava o hash sobre os bytes que passavam pelo stream
     antes de o gzip fechar, a régua conferia o arquivo no disco, e as duas contas não batiam — o que é a
     diferença entre um backup verificado e um backup que se *declara* verificado.
  4. **A política é GFS 7/4/12, com semana ISO e uma trava de bom senso.** Sete diários, quatro semanais,
     doze mensais, implementados como função pura (`planejarRetencao(nomes, agora, limites)`) para poder ser
     conferida sem esperar 400 dias passarem. A semana é a **ISO** (regra da quinta-feira), não um bloco de
     sete dias a contar da última execução, senão a janela semanal derivaria a cada execução. A trava: se tudo
     coubesse fora da janela, o mais recente é mantido com o motivo `ultimo` — a ferramenta se recusa a deixar
     uma pasta sem nenhum backup. E ela não toca em arquivo que não segue o próprio padrão. Todo arquivo que sai
     responde por quê: `repetido-no-bucket` para quem perdeu o bucket do dia ou da semana ISO, `fora-da-janela`
     para quem não cabe em nível nenhum — a primeira versão escrevia `undefined` na linha do operador (achado
     N73), o que é o tipo de detalhe que só incomoda quem está restaurando às três da manhã.
  5. **O destino é fora do repositório, e a régua confere a recusa.** Padrão `~/nexus-business-manager/backups`
     (ou `NEXUS_BACKUP_DIR`); destino dentro do repositório sai com código 1 e o diretório proibido não é
     criado — backup commitado é segredo commitado com outro nome.
  6. **A restauração tem guardas antes de escrever, e a ordem é a da segurança.** Arquivo existe → hash confere com
     o sidecar → `meta.json` confere → nome do banco é válido e **não** é schema reservado (`mysql`,
     `information_schema`, `performance_schema`, `sys`) → banco existe (ou `--criar`) → se o banco alvo tem
     tabelas, recusa sem `--aceito-sobrepor`. Só depois disso qualquer `DROP TABLE` acontece. Medido pela régua:
     hash divergente e schema reservado saem com código 1 **sem tocar em banco**, e restaurar por cima do banco
     da instalação sem o aceite sai com código 1.
  7. **Uma régua de 56 verificações é o que fecha a regra 1 do G5.** `tools/verify-backup.cjs`
     (`npm run docker:provar-backup`) tem três partes: as recusas medidas (12), as propriedades da retenção numa
     série de 45 arquivos sintéticos (12), e o dump real + restauração conferida tabela por tabela + comparação
     com o `meta.json` (31). Sem a pilha de pé ela sai com código 2 dizendo qual comando falta, em vez de fechar
     verde pela metade que rodou — o mesmo contrato da régua da topologia.
- Consequências:
  - Positivas: existe um caminho de recuperação escrito, executado e conferido nesta máquina; a emergência tem
    ordem de comandos em `docs/PRODUCAO.md` seção 8; nenhum valor de segredo aparece em log, meta, sidecar ou
    commit — a varredura desta rodada não achou nada do endereço real do administrador nos arquivos novos.
  - Custos e o que fica aberto: **não há agenda embutida** — `docker:backup` é um comando, e quem o repete é o
    cron da máquina; o executor de rotinas do painel não serve para isso, porque roda dentro do container da
    API e não tem como chamar `docker` nem escrever na pasta do host. **Não há cópia off-site**: um dump na
    mesma máquina que o banco protege contra erro de operação, não contra disco perdido — isso é decisão de
    instalação do dono (G5). **Não há backup de arquivos de upload** porque o produto não tem upload em disco
    (`apps/api/src/modules/companies/companies.schemas.ts` exige endereço `http(s)` para o logo), então a
    segunda metade da seção 45 não tem o que copiar; quando o upload chegar, o backup tem de chegar junto.
    Rotação e retenção de **log** seguem abertas (N69), e a restauração testada é a da pilha Docker — no MySQL
    do WAMP da máquina as ferramentas não foram rodadas, por D6.


