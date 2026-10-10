# ADR-0003 — Frontend: AdminLTE 4 + design system próprio

- Status: Aceita (2026-10-10)
- Contexto: §6.3 adota AdminLTE 4 como base administrativa; §49/§10 exigem identidade própria e
  proíbem sobreposição caótica entre AdminLTE/Tailwind/CSS puro.
- Decisão — camadas de responsabilidade única:
  1. Tokens (`tokens.css`): variáveis CSS de cor/espaçamento/raio/sombra — fonte única da marca.
  2. AdminLTE 4: estrutura do shell administrativo (sidebar, navbar, layout, cards), sem redefinir cores.
  3. Tailwind 4: utilitários de layout/espaçamento; tema mapeado para os tokens CSS (sem cores
     hardcoded duplicadas).
  - Dark/Light por `data-theme` no `<html>` + variantes Tailwind `dark:`; preferência persistida.
  - Toastr/SweetAlert2 centralizados em `src/lib/notify.ts` e `src/lib/confirm.ts` (nunca nativos).
  - Summernote/FullCalendar adicionados somente no incremento que os usar de fato (§53).
- Consequências: Menos conflito de estilos; troca de tema sem reflow do AdminLTE.
