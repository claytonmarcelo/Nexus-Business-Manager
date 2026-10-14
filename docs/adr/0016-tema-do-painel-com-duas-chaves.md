# ADR-0016 — O painel escreve as duas chaves de tema no mesmo lugar, e o valor chega antes do primeiro *paint*

- Status: Aceita (2026-10-14)
- Contexto: item 2 da F5, no prompt de continuação da F4 -> F9 ("sincronizar `data-bs-theme` com o tema do
  painel"), e o achado N7 de `docs/AUDITORIA.md`. A casa tinha dois vocabulários de tema convivendo sem
  tradução: os tokens próprios e todas as telas vivem sob `[data-theme]`, enquanto o `adminlte.min.css`
  importado em `main.tsx` veste os componentes dele pela convenção do Bootstrap 5.3, `[data-bs-theme]`. Medido
  no arquivo: **21** seletores com essa chave — **17** sob `dark` e **4** sob `light` — entre eles as variáveis
  da barra lateral, a seta do `select`, o fundo do interruptor, os filtros do botão de fechar e o
  `color-scheme` nativo. Enquanto o provedor escreveu só `data-theme`, essas 21 regras ficaram inertes: o
  shell trocava e o pedaço que só o framework entendia não. A auditoria deixou o achado aberto na rodada
  anterior porque sincronizar as duas chaves mexe no desenho de todas as telas do painel e obriga a recapturar
  as seis telas do `README.md` mais as provas de navegador — e o §46 deste projeto manda não fazer trabalho de
  rodada alheia em silêncio. Na F5 o custo já estava pago: a rodada tinha prova de barra lateral, comparador de
  pixels e as capturas sob revisão, então o fechamento coube aqui.
- Decisão:
  1. **Escrita dupla, em um único ponto.** `ThemeContext.tsx` ganhou `escreveTema(tema)`, que põe
     `data-theme` e `data-bs-theme` no `document.documentElement` com o mesmo valor, e essa função é a única
     porta de saída do tema. Não existe caminho no produto que escreva uma chave sem a outra: nem o alternador
     da vitrine, nem o seletor de `Configurações`, nem o boot. Decisão aditiva — quem só olhava `data-theme`
     continuou funcionando exatamente como antes; o que mudou é que o AdminLTE passou a acompanhar.
  2. **O boot lê a preferência salva, e o faz em `main.tsx`, não no HTML.** `aplicaTemaSalvo()` é chamada em
     `main.tsx` antes de `createRoot`, e o `useState` do provedor usa a mesma função como inicializador lento.
     Um *script* inline no `<head>` deixaria de ser necessário só se o CSP de produção aceitasse: em produção
     vale o padrão do helmet (`apps/api/src/plugins/security.ts:9` → `contentSecurityPolicy: isProd ?
     undefined : false`), e a diretiva `script-src` desse padrão é exatamente `['self']` — medida com
     `require('helmet').contentSecurityPolicy.getDefaultDirectives()`, que devolve `'none'` em `script-src-attr`
     e `'self'` em `script-src`. Script inline, portanto, está fora da lei. O custo de aceitar essa restrição é
     o par de atributos estáticos `data-theme="dark"`/`data-bs-theme="dark"` da linha 2 de `index.html`: quem
     salvou o tema claro vê um flash do escuro entre o HTML e o módulo. O flash é menor que violar o CSP, e
     ficou declarado em vez de consertado com `nonce`.
  3. **A régua é o par, não o valor.** `apps/web/src/test/tema-sincronizado.test.tsx` verifica que os dois
     atributos têm sempre o mesmo conteúdo nos seis caminhos que importam: boot com preferência salva clara,
     boot com escura, alternância, escolha manual, desmontar e remontar, e o caso em que o `storage` está vazio
     e o tema vem de `prefers-color-scheme`. Os casos foram escritos vermelhos contra a árvore antiga, com as
     duas chaves desalinhadas de propósito, antes de virarem verdes.
  4. **Onde o efeito aparece, ele é medido no navegador.** `tools/verify-sidebar.cjs` passou a conferir
     luminância da superfície da barra e o contorno do botão no tema claro, e as duas capturas de tema claro da
     barra foram regravadas e revisadas pixel a pixel. Prova: **104 checagens, 0 falhas**.
- Consequências:
  - O painel inteiro passou a obedecer ao tema, inclusive as peças que antes ficavam fora — e isso é uma mudança
    visual em telas que não eram desta rodada. As capturas afetadas foram conferidas pelo comparador de pixels e
    as duas da barra regravadas; nada foi commitado por costume.
  - Uma biblioteca nova que usar a terceira convenção não entra de graça: ela precisa ser escrita por esta porta
    ou o teste do par pega o desalinhamento.
  - N7 sai de `docs/AUDITORIA.md` como corrigido, e P6 sai da lista de pendências de `docs/ESTADO-ATUAL.md`.
  - Ficou de fora, declarado: o flash do tema no HTML estático de `index.html`. O contraste das peças que o
    framework passou a vestir deixou de ser suposição na mesma rodada: `tools/audit-contraste-painel.cjs` mede
    as 17 telas do painel nos dois temas e nas duas janelas, e na corrida de encerramento fechou **68 de 68
    combinações, 2.862 textos medidos, 0 abaixo do alvo** — com a barra lateral, que é exatamente o pedaço
    governado pelas 21 regras do AdminLTE, entrando na conta em `dark` e em `light`.
