# ADR-0006 — Bootstrap do administrador da plataforma separado da semente

- Status: Aceita (2026-10-12)
- Contexto: F1.4 do PROMPT MESTRE. Depois da F1.3, o seed em produção cria apenas o administrador da
  plataforma e as rotinas — mas continuava sendo o *único* caminho para essa conta existir, e um caminho que
  pede `ALLOW_DEV_SEED=1` num banco de cliente. Um instalador de produção precisava de uma porta própria:
  criar a primeira conta global sem importar nada de demonstração, sem digitar credencial em arquivo
  versionado e sem a possibilidade de, rodando o script duas vezes, trocar a senha de quem já manda.
  O experimento desta fase mediu o que acontece sem essas travas: a versão ingênua do script, chamada num
  ambiente sem `ADMIN_CRIAR_SENHA`, criou o usuário e virou `OWNER` das 37 empresas do banco do desenvolvedor
  (achado N24 em `docs/AUDITORIA.md`).
- Decisão:
  1. **Dois caminhos, um por ambiente.** Desenvolvimento e homologação continuam pela semente
     (`npm run db:seed`). Produção do administrador da plataforma passa pelo
     `npm run admin:criar -w @nexus/api` (`apps/api/prisma/administrador-da-plataforma.ts`), que não conhece
     `admin@nexus.local` nem `nexus-demo` — a demonstração segue sendo decisão exclusiva do seed.
  2. **Credencial só do ambiente do operador.** O endereço vem de `SUPER_ADMIN_EMAIL`, a mesma chave que o
     validador de produção exige (a coerência é medida em teste), e a senha de `ADMIN_CRIAR_SENHA`. Nada é
     impresso além do que aconteceu: a saída traz endereço, nome, ação, se a senha foi definida agora ou
     preservada e quantas empresas ficaram com `OWNER`. A régua da senha é `isStrongPassword`, a mesma de
     toda senha do sistema, e o placeholder do `.env.example` é fraco de propósito para que copiá-lo não
     instale conta.
  3. **Três efeitos, três consentimentos escritos.** Rodar o script sobre um administrador que já existe
     preserva a senha (`ADMIN_CRIAR_RENOVAR_SENHA=1` para reescrever), uma conta comum com o mesmo endereço
     nunca é promovida sozinha (`ADMIN_CRIAR_PROMOVER=1`), e conta desativada não volta sem
     `ADMIN_CRIAR_REATIVAR=1`. Cada chave corresponde a um efeito diferente de propósito: um único "modo
     forçado" daria a uma variável o poder de reescrever credencial, promover cliente e reativar acesso.
  4. **Promoção reescreve a senha.** Se o operador consentiu a promoção de uma conta comum, a senha daquele
     momento é obrigatória — a plataforma inteira não pode passar a depender de uma credencial que quem rodou
     o script não acabou de definir, e o hash existente não é verificável por comprimento nem por maiúscula.
  5. **Recusa antes da primeira consulta.** `errosDoBootstrap` decide o ambiente e `decisaoDoBootstrap`
     decide o estado da conta, as duas como funções puras; `instalarAdministradorDaPlataforma` só consulta o
     banco depois delas. A prova é pelo plano de escrita com o cliente que anota (o mesmo desenho da F1.3) e
     a recusa continua medida no banco real, contando usuários e empresas antes e depois. Recusa devolve
     código `1` e o nome da chave que falta, nunca o valor.
  6. **As chaves novas entraram na guarda estrutural.** `ADMIN_CRIAR_SENHA` foi adicionada ao vetor de chaves
     de `identificadores-fora-do-codigo.test.ts`, então nenhum arquivo rastreado pode atribuir valor literal a
     ela — a mesma trava que a F1.3 instalou para as senhas do seed e da captura.
- Consequências:
  - A subida de produção documentada em `docs/PRODUCAO.md` é `install → prisma:generate → prisma:deploy →
    admin:criar → build → start`, e o administrador existe sem ninguém ter que licenciar a semente num banco
    de cliente.
  - `ALLOW_DEV_SEED=1` deixa de ser requisito de existência do administrador global; ele volta a ser o que
    sempre deveria ter sido: uma escolha de ambiente de teste.
  - O vínculo de `OWNER` sobre as empresas existentes é confirmado pelo bootstrap, então a regra definitiva de
    acesso (administrador global é `OWNER` de todas as empresas) vale também numa instalação que nunca rodou
    semente.
  - Nada foi rotacionado nem apagado: `admin@nexus.local`, `nexus-demo` e `admin@exemplo.test` continuam como
    §0.1 do dono decidiu. A prova de navegador executada nesta fase usou uma conta fictícia
    (`bootstrap@exemplo.test`), foi desfeita em seguida e as contagens do banco voltaram ao valor medido antes
    (359 usuários, 37 empresas, 41 vínculos).
