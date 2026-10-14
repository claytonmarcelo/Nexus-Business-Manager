# ADR-0017 — A pilha de prova tem porta própria, e a porta de quem trabalha não se toca

- Status: Aceita (2026-10-14)
- Contexto: achado N65 de `docs/AUDITORIA.md`, primeiro item da T5 (F6). A casa tinha uma topologia com
  dois donos para a mesma porta: `npm run dev` sobe a API no banco de desenvolvimento na 3001, e
  `npm run dev:api:teste` subia a *mesma* API no banco de prova, também na 3001, porque as ferramentas
  de navegador (`tools/verify-*.cjs`, `tools/shoot-*.cjs`, `tools/audit-*.cjs`) foram escritas esperando
  a 3001. O Vite da 5173 faz proxy de `/api` para a 3001 sem perguntar para quem. Na prática, enquanto
  a janela de prova estivesse de pé, o navegador que a pessoa usa — o mesmo endereço, a mesma porta —
  falava com um banco onde a conta dela não existe. Foi exatamente o que aconteceu duas vezes nesta
  rodada: às 16:58:52 a conta raiz foi digitada no painel, o login devolveu 401 mudo, e a primeira
  suspeita de todo mundo foi a senha. A decisão D6 (banco de prova separado) resolveu *onde* a prova
  escreve, mas deixou a *como* por fazer: prova e produto continuavam dividindo a porta, e a única
  proteção era um aviso impresso no arranque. O conserto que estava marcado para a F8 virou a primeira
  tarefa da F6 porque sem ele nenhuma prova de navegador desta rodada é repetível por outra pessoa.
- Decisão:
  1. **A prova tem portas próprias: API na 3002 e navegador na 5174.** `tools/servidor-de-prova.cjs`
     passou a levantar os dois lados — a API com `PORT=3002` e `DATABASE_URL` do banco de prova, e um Vite
     na 5174 com o proxy apontando para a 3002 — e o nome do comando virou `npm run dev:prova`, com
     `dev:api:teste` continuando apontando para o mesmo lugar para não quebrar o que já estava escrito.
     A 3001/5173 é do produto, sempre: `npm run dev` e a pilha de prova podem coexistir, medido com as
     quatro portas em escuta ao mesmo tempo (18816 na 3001, 14500 na 3002, 18972 na 5173, 17192 na 5174).
     O comando confere as duas portas *antes* de subir qualquer coisa e recusa com saída 1 se estiverem
     ocupadas; ele não "sobe na próxima porta livre", porque um endereço errado no disco é pior que uma
     janela que não abriu.
   2. **A descoberta do endereço é um ponto só, e é uma leitura de estado.** `tools/pilha-de-prova.cjs`
     responde `baseDoNavegador()` e `raizDaApi()` na ordem: variável de ambiente (`NEXUS_WEB` / `NEXUS_API`),
     depois o ponteiro local `tools/ponteiro-de-prova.local.json` — publicado pelo servidor de prova
     enquanto ele está de pé e ignorado pelo git —, depois a casa real (5173/3001). O ponteiro só vale se o
     `pid` gravado nele ainda existir: servidor queimado não deixa endereço zombie, e a leitura de um
     ponteiro morto limpa o arquivo. Medido no `tools/verify-pilha-de-prova.cjs`: sem ponteiro e sem
     variável aparecem 5173/3001; com ponteiro vivo aparecem 5174/3002; com ponteiro de processo morto
     volta para 5173/3001 e o arquivo some; e a variável de quem roda a prova tem a última palavra.
   3. **Nenhuma ferramenta de navegador carrega a porta escrita à mão.** 36 arquivos passaram a resolver
     as duas pontas pelo helper, e a régua é uma varredura do próprio disco: os 34 arquivos
     `verify|shoot|audit-*.cjs` têm que mencionar o helper e não podem conter `localhost:5173` nem
     `localhost:3001` fora de comentário. A prova foi escrita vermelha antes de verde: na primeira corrida,
     com as ferramentas ainda intactas, ela devolveu **36 falhas em 39 verificações**; depois do patch,
     **8 verificações, 0 falhas** (`node tools/verify-pilha-de-prova.cjs`).
   4. **O log conta em que banco a corrida falou.** O helper imprime uma linha ao nascer —
     `[topologia] navegador … | api … | PILHA DE PROVA (banco nexusbusinessmanager_teste)` ou
     `banco de desenvolvimento desta maquina` —, então a evidência de onde a prova escreveu vem junto com
     a prova, e não da memória de quem a rodou.
   5. **Captura de prova não pisa em captura canônica.** Rodar `tools/verify-sidebar.cjs` contra a pilha
     de prova regravava três imagens de `docs/screenshots/` com os números do banco de prova — a tela não
     mudou, o dado mudou. Agora, com a pilha no ar, as capturas vão para `docs/screenshots-prova/`
     (ignorada pelo git) e as canônicas ficam intactas; sem pilha, a ferramenta grava onde sempre gravou.
     20 ferramentas que gravam imagem passaram pelo `pastaDeCaptura()`, e a varredura é a parte C da mesma
     régua.
- Consequências:
  - A prova de navegador voltou a ser repetível por outra pessoa: `npm run dev` na mesa, `npm run
    dev:prova` na outra janela, e as duas não se enxergam. Medido com a barra: **104 checagens, 0 falhas**
    contra 5174/3002, com a linha de topologia no log dizendo banco de prova.
  - O banco de desenvolvimento ficou de fora desta rodada de provas: fotografia de leitura pura antes e
    depois — **35 tabelas / 70.897 linhas**, exatamente o número do fecho da T4 —, enquanto o banco de
    prova, que é onde tudo escreveu, saiu de 24.753 linhas no meio das corridas para 26.631 depois da
    suíte inteira. A conta raiz continua como era no banco do dono: `platformRole=SUPER_ADMIN`,
    `active=true`, 37 vínculos `OWNER`, nenhum registro de bloqueio.
  - Uma fragilidade apareceu no caminho e foi tratada aqui: a checagem de título da barra esperava 420 ms
    fixos depois do clique, o que basta num servidor quente e não basta num Vite de prova com o chunk da
    rota ainda frio (`/app/cms` foi pego sem título na primeira corrida contra a 5174). Agora a
    ferramenta espera o primeiro sinal de que a rota respondeu (`.page-title`, `.page` ou
    `.error-page`, até 20 s), que é a mesma lição do D8/T4.8 aplicada a quem clica na barra.
  - Os portões foram refeitos na árvore final, com as duas pilhas coexistindo: `npm run typecheck` e
    `npm run build` sem erro e sem aviso de chunk; `npm test` com código de saída 0 — **API 47 arquivos /
    437 casos** e **web 18 / 140**, zero falha e zero skip, contra `nexusbusinessmanager_teste`; guarda
    permanente de caracteres com 4 casos verdes; BOM 0 e CR 0 nos 45 arquivos desta tarefa.
  - A recusa de porta foi conferida de propósito: com um servidor segurando a 3002, o `npm run dev:prova`
    saiu com código 1 e o motivo na tela, a API do produto na 3001 seguiu devolvendo 200, e nenhum
    ponteiro ficou em disco. Derrubada a pilha por fora, a leitura seguinte do ponteiro morto apagou o
    arquivo e a régua voltou a medir a casa — foi o estado com que a tarefa fechou.

  - N65 sai de `docs/AUDITORIA.md` como corrigido, com prova; o aviso de "não brigue pela 3001" deixa de
    ser regra de convivência e passa a ser impossível por topologia.
  - Ficou de fora, declarado: a limpeza graciosa do ponteiro no `SIGINT` não foi mensurada — o Windows
    mata o processo sem entregar o sinal a um servidor em segundo plano, então o que está medido é o
    caminho que importa (leitura de ponteiro morto cai para a casa e limpa o arquivo). E as capturas de
    prova continuam sem revisão humana automática: a pasta nova é evidência de corrida, não entregável.
