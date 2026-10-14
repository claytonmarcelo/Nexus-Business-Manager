# ADR-0014 — Code splitting por rota: o que o painel entrega no primeiro carregamento é o painel, não a Agenda

- Status: Aceita (2026-10-14)
- Contexto: decisão **D8** do dono no prompt de continuação da F4 -> F9, e o item 6 da F5 do PROMPT MESTRE.
  Desde a F1.2 a casa convivia com um único arquivo de JavaScript de 882,31 kB (262,77 kB gzip), re-medido na F2
  (889,73 / 264,73), na F3.2 (946,30 / 278,06) e na T3 (961,19 / 282,12). O Vite avisava, em toda build, que o
  chunk passava de 500 kB. Medido no começo da T4.8, com as telas novas da autenticação já dentro: **964,31 kB /
  283,61 kB gzip** num arquivo só. Quem abre `/app/dashboard` baixava, junto com o dashboard, o FullCalendar da
  Agenda, o editor do CMS, o carnê de cobranças e as quatro etapas da tela de entrada.
- Decisão:
  1. **Rotas de tela viram fronteiras de carregamento.** Toda página montada pelo roteador é `lazy` com
     `Suspense` num único ponto do `App.tsx`, com um esqueleto próprio enquanto o módulo chega. A escolha é por
     rota - e não por componente - porque a unidade que uma pessoa usa é a tela, e porque é a fronteira que o
     navegador consegue buscar em paralelo sem a casa ter que inventar um carregador.
  2. **O que é casa continua no pacote inicial.** `AdminShell`, o contexto de autenticação, o tema, o diálogo de
     confirmação e o `ErrorBoundary` não são lazy: sem eles a tela não tem casca, e um esqueleto antes do erro
     não serve para nada. O `ErrorBoundary` da T4.4 precisa estar montado antes de qualquer `import()` falhar -
     é justamente a ele que uma rota que não carrega cai.
  3. **A régua é medida, não declarada.** `tools/verify-code-splitting.cjs` (**44 checagens, 0 falhas**) lê o
     `dist` real e afirma: nenhum chunk acima de 500 kB, o chunk inicial abaixo do teto combinado, cada rota do
     painel resolvida num chunk próprio, e - o que dá valor ao resto - o navegador abrindo `/app/dashboard` com
     a rede gravada não baixa o chunk da Agenda nem o do CMS. Medição sem a segunda metade seria contagem de
     arquivo.
- Consequências:
  - Medido depois do corte, na mesma árvore: `index-*.js` **354,85 kB / 121,62 kB gzip**, **37** chunks no total,
    com o maior deles sendo o da Agenda (**286,34 kB / 83,52 kB gzip**) - o FullCalendar continua grande, só que
    agora ele é da Agenda, e chega a pé quem abre a Agenda. CSS continua um arquivo só (**398,54 kB / 61,29 kB
    gzip**), porque separar folha de estilo por rota, com o tema em variável, troca um problema de bytes por um
    de flash de estilo; fica anotado como dívida, não resolvido aqui.
  - O aviso do Vite sobre chunk acima de 500 kB sumiu da build, e a régua que o substituiu é um arquivo de teste
    que falha se ele voltar.
  - Rota preguiçosa tem um estado novo: o instante entre o clique e o módulo chegar. Ele é preenchido pelo
    esqueleto, e é por isso que o `ErrorBoundary` (T4.4) entrou antes deste corte, não depois.
