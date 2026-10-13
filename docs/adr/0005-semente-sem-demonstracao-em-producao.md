# ADR-0005 — Semente sem demonstração em produção

- Status: Aceita (2026-10-12)
- Contexto: F1.3 do PROMPT MESTRE, lida junto com a decisão §0.1 do dono — as contas fictícias e suas senhas
  de desenvolvimento ficam como estão (não rotacionar, não limpar histórico, não reescrever nada por causa
  delas). O que a fase fecha é a porta que deixa `admin@nexus.local` e a empresa `nexus-demo` aparecerem num
  banco de cliente: até aqui, `ALLOW_DEV_SEED=1` bastava para as duas entrarem junto.
- Decisão:
  1. **Três chaves, três efeitos.** `ALLOW_DEV_SEED=1` libera apenas a *subida* do seed em
     `NODE_ENV=production`. A conta de desenvolvimento depende de `SEED_DEV_ACCOUNT=1` e a casa de
     demonstração `nexus-demo` passou a depender de `SEED_DEMO_COMPANY=1`. Em produção, por padrão, sobram
     somente o administrador da plataforma (de `SUPER_ADMIN_EMAIL`) e as rotinas de `cron.handlers.ts`.
  2. **Conta dev sem casa é recusa.** `SEED_DEV_ACCOUNT=1` sem `SEED_DEMO_COMPANY=1` entra na lista de
     `errosDoSeed`: a conta de desenvolvimento é `OWNER` daquela casa, então cadastrá-la sem a empresa
     produziria um administrador sem nada para administrar.
  3. **O seed continua sem senha própria**, e a trava deixou de ser só contra os dois valores conhecidos da
     R2: `identificadores-fora-do-codigo.test.ts` agora recusa valor literal atribuído a
     `SEED_ADMIN_PASSWORD`, `SEED_DEV_PASSWORD` ou `NEXUS_CAPTURA_SENHA` em qualquer arquivo rastreado, e o
     próprio teste confere que a armadilha ainda pega um exemplo escrito na sua linha.
  4. **A prova é pelo plano de escrita.** `semear(ambiente, cliente)` recebe o cliente Prisma por parâmetro,
     então `garantias-conta-de-demonstracao.test.ts` injeta um cliente que registra cada `upsert` em vez de
     escrever — mostra *o que o seed pede* em produção sem encostar no banco do desenvolvedor. A recusa sem
     `ALLOW_DEV_SEED` continua medida no banco real, contando usuários e empresas antes e depois.
  5. **Nada foi rotacionado nem apagado.** `admin@nexus.local`, `nexus-demo` e `admin@exemplo.test` são os
     mesmos de antes; a fase fecha a porta, não a conta.
- Consequências:
  - Rodar o seed em produção com `ALLOW_DEV_SEED=1` cria somente o administrador da plataforma e as rotinas.
    Quem quiser a vitrine de teste num ambiente de homologação declara as duas chaves de demonstração.
  - `apps/api/.env.example` e o README trazem a trava nova, e o inventário de testes do README lista o
    arquivo da fase.
  - A F1.4 (`admin:criar`) fica mais simples: o bootstrap do administrador de produção não precisa lidar com
    entulho de demonstração, porque o seed já não o produz.
