# Changelog

Todas as mudanças notáveis deste projeto, em português brasileiro.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), ordem mais novo primeiro.

## [Não lançado]

### Adicionado
- **Favicon oficial do projeto**: recorte do emblema hexagonal da logo gerado em alta qualidade (16/32/48px, apple-touch 180px, 512px maskable e `favicon.ico` multi-tamanho), declarado no `index.html` — script reprodutível em `tools/make-favicon.ps1`.
- **Regra definitiva de acesso**: administrador global `nexusbussiness.admin@gmail.com` (OWNER em todas as empresas, protegido contra remoção/rebaixamento no backend e no seed) documentado em `CREDENCIAIS.md` na raiz do projeto.
- **Política de senha** aplicada em todo o sistema (mínimo 8 caracteres, uma maiúscula e um especial): `passwordPolicy.ts` no backend + validação inline pt-BR nos formulários.
- **Fluxos de autenticação completos**: cadastro self-service (cria usuário + empresa própria como OWNER e já autentica), esqueci a senha em duas etapas com código de recuperação (30 min, uso único, revoga sessões) e rotas `/cadastro` e `/recuperar-senha`.
- Telas de autenticação (Login, Criar conta, Recuperar senha) em estilo **Embossed/Neumorfismo** com tokens por tema, checkbox "Lembrar de mim" (salva apenas o e-mail), alternância suave entre telas, erros inline, botão ENTRAR com estado de carregamento e indicador animado de "Sucesso!" antes do redirecionamento.
- Botão **olho para mostrar/ocultar senha** (`PasswordInput`) reutilizado no login, cadastro, recuperação e modal de novo membro.
- Página de Clientes no frontend (tabela paginada, busca, modal criar/editar, desativar com confirmação, botões por permissão) — prova de uso real capturada em `docs/screenshots/07-clientes.png`.
- Refatoração UX/UI da tela de boas-vindas: componentes de responsabilidade única (`components/landing/*`), textos isolados em `copy.ts`, animação de entrada escalonada (stagger) com respeito a `prefers-reduced-motion` e tipografia fluida.
- Testes de integração dos fluxos (cadastro, duplicidade, senha fraca, recuperação, reuso de código, revogação de sessões): suíte agora com 23 testes.

### Alterado
- Marca na sidebar administrativa agora exibe o nome completo "Nexus Business Manager" em uma linha, com o degradê cobre-ouro da landing.
- **Regra de logout**: ao sair do sistema o usuário volta automaticamente para a página de boas-vindas (`/`), com histórico substituído para o botão voltar não reabrir o painel (prova em `tools/verify-logout.cjs`).
- Cartões de autenticação padronizados no mesmo tamanho (largura, tipografia e botões) para coerência entre login, cadastro e recuperação.
- Logo das telas de autenticação ampliada 16% (62px → 72px) nas três páginas, mantendo a harmonia visual.
- **Regra de privacidade do "Lembrar de mim"**: o e-mail fica gravado no navegador para facilitar o acesso, mas nunca é exibido no campo — ele volta vazio com placeholder genérico e uma dica discreta; ao entrar apenas com a senha, o e-mail lembrado é usado em silêncio (prova automatizada em `tools/verify-remember.cjs`).
- Alternador de tema perfeitamente centrado no cabeçalho (thumb simétrico no trilho, ícones sol/lua alinhados ao centro vertical), sem alterar cores, tamanho ou animação.

### Corrigido
- Colisão de nomenclatura com o Bootstrap/AdminLTE: o modal próprio foi renomeado para `nx-dialog` (antes herdava `display:none` do framework e não abria) e as tabelas neutralizam as variáveis `--bs-table-*` (cabeçalho branco no tema escuro).

### Alterado
- Texto de marca ("Nexus Business Manager" / "NEXUS") agora usa o degradê cobre-ouro extraído da logo, aplicado globalmente (`.brand-text`, landing e sidebar).
- Cabeçalhos e rodapés do projeto ficaram mais baixos (landing, admin, login) e o switch de tema ganhou tamanho compacto.
- Animação "batida de coração" na logo da boas-vindas e do login, lenta e suave (5,2s, escala máxima 1,035, com respeito a `prefers-reduced-motion`); logo da landing ampliada para 210px.
- Botão "Voltar" redesenhado como pill moderno com seta em círculo (login e páginas de erro) e página de login centralizada verticalmente.
- Página pública: herói agora é 100% marca — botões "Acessar o sistema" e "Conhecer recursos" removidos; o acesso ao sistema permanece no botão "Acessar" do topo.
- Alternador de tema redesenhado como switch moderno (trilho em pílula, ícones sol/lua e thumb em degradê cobre que desliza), com `role=switch`, `aria-checked` e respeito a `prefers-reduced-motion`.

### Adicionado
- Fundação vertical completa do frontend: AdminShell (sidebar, header, footer), Landing pública com "Acessar", Login real com JWT, Dashboard com KPIs vindos da API, Usuários (busca, papel editável, modal de novo membro), Auditoria, Configurações (tema, conta, troca de empresa) e páginas de erro 401/403/404/500 com identidade da marca.
- Design system Premium Gourmet em `apps/web/src/styles/` (tokens de tema, global, componentes) com alternância dark ("noite sofisticada") / light ("dia elegante") persistida e sem preto/branco puros.
- Paginações globais servidor-cliente (`{data, meta}`), estados de carregamento/vazio/erro padronizados, Toastr centralizado e confirmações via SweetAlert2 (nenhum `alert/confirm` nativo).
- Capturas reais das 6 telas em `docs/screenshots/` e README com imagens do sistema em execução.
- Favicon derivado da logo oficial (`apps/web/public/favicon.png`).

### Corrigido
- `components.css` reescrito para casar exatamente com as classes dos componentes (divergência de nomenclatura detectada em inspeção visual das telas).
- Removida opção `fade` inexistente na configuração do Toastr e import não utilizado no AdminShell.

### Fase 1 (análise e fundação do backend)
- Análise real do repositório/bancos de referência (`docs/ANALISE.md`) — confirmado que não há legado recuperável.
- Paleta oficial extraída da logo (`docs/design/palette.md`).
- ADRs 0001–0003 (persistência Prisma, multiempresa/RBAC, frontend AdminLTE 4 + design system).
- Fundação do backend (Fastify 5 + TS + Prisma + auth + RBAC + multiempresa + auditoria), com 14 testes de integração contra MySQL real.
