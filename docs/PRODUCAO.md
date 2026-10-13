# Produção — como uma instalação deste produto nasce

Este arquivo é o caminho de subida de uma instalação real do Nexus Business Manager. A F1.4 escreve a
primeira metade — a parte que decide quem manda na plataforma — e a F6 (Docker, `docker-compose`, portas
fechadas e logs) vai completar o resto aqui, no mesmo lugar. O que está escrito abaixo foi medido nesta
máquina em 2026-10-12; nada aqui é promessa de comportamento que o repositório ainda não tenha.

## 1. Antes de qualquer comando

O `.env` da API (`apps/api/.env`, arquivo da máquina, jamais do repositório) precisa de:

| Variável | Por quê |
|---|---|
| `NODE_ENV=production` | liga a régua extra de produção |
| `DATABASE_URL` | usuário próprio da aplicação, senha obrigatória; a subida morre com `root` sem senha |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | distintos entre si, 32 caracteres ou mais, sem `troque`/`change`/`secret`/`exemplo` |
| `CORS_ORIGIN` | endereço público do painel; `localhost`, `127.0.0.1` e coringa derrubam a subida |
| `SUPER_ADMIN_EMAIL` | endereço do administrador da plataforma; ausente em produção, nada sobe |
| `AUTH_EXPOSE_RESET_TOKEN=0` | com `1` em produção a API recusa subir |
| `TRUST_PROXY` | `0` sem proxy; `1`..`31` declarando os saltos, ou o IP da auditoria é o do proxy |

Essa régua não é um checklist para ser lido depois: ela roda na importação de `src/config/env.ts` e derruba o
processo com a lista inteira de problemas na mensagem, sem imprimir nenhum valor. O código da régua é puro e
testado em `apps/api/test/validador-de-producao.test.ts`.

## 2. Ordem de subida

```bash
npm install
npm run prisma:generate -w @nexus/api     # sem isto, nada compila
npm run prisma:deploy -w @nexus/api       # aplica as migrations, sem prompt
npm run admin:criar -w @nexus/api         # o administrador da plataforma (item 3 abaixo)
npm run build                             # apps/api/dist + apps/web/dist
npm run start --workspace @nexus/api      # NODE_ENV=production
```

O `admin:criar` vem **depois** de `prisma:deploy` e **antes** de servir a primeira requisição: sem o
administrador da plataforma não há quem configure SMTP, rotinas ou a vitrine pelo painel. Se o banco já tem
empresas, elas permanecem dos clientes que as criaram — o bootstrap apenas confirma o vínculo de `OWNER` do
administrador sobre elas, que é a regra definitiva de acesso do projeto.

## 3. O bootstrap do administrador (`npm run admin:criar`)

Em produção o administrador da plataforma **não** vem do seed. A F1.3 tirou da semente o direito de criar
conta de desenvolvimento e empresa de demonstração num banco de cliente; a F1.4 fecha o caminho contrário com
`apps/api/prisma/administrador-da-plataforma.ts`.

```bash
SUPER_ADMIN_EMAIL=nome@dominio.do.cliente \
ADMIN_CRIAR_SENHA='a senha forte escolhida por quem instala' \
npm run admin:criar -w @nexus/api
```

As duas chaves são do ambiente de quem instala. Não existe valor padrão de senha em arquivo nenhum, e o
console imprime só o que aconteceu — endereço, nome, ação, se a senha foi definida agora ou preservada, e
quantas empresas ficaram com `OWNER`. Hash, token e senha nunca aparecem.

A régua da senha é a regra definitiva de acesso do projeto, aplicada pela mesma função que vale para toda
senha do sistema (`src/lib/passwordPolicy.ts`): mínimo 8 caracteres, uma letra maiúscula, um caractere
especial, máximo 128. Uma senha fora disso derruba o script com o motivo, e o placeholder do
`apps/api/.env.example` é fraco de propósito — copiar a linha de exemplo nunca instala conta.

### O que cada estado do banco provoca

| Situação | Sem consentimento | Com consentimento escrito |
|---|---|---|
| Nenhuma conta com esse endereço | cria como `SUPER_ADMIN` com a senha do ambiente | — |
| Já é `SUPER_ADMIN`, ativa | confirma o papel e **preserva a senha** | `ADMIN_CRIAR_RENOVAR_SENHA=1` reescreve a senha |
| É conta comum (cliente) | **recusa** — nada é escrito | `ADMIN_CRIAR_PROMOVER=1` promove e reescreve a senha |
| Conta desativada | **recusa** | `ADMIN_CRIAR_REATIVAR=1` devolve o acesso |

Os três consentimentos são chaves separadas de propósito: rodar o script duas vezes não troca a credencial de
ninguém, uma conta de cliente que por acaso tenha o endereço não vira administradora da plataforma, e quem
perdeu o acesso não o recupera por um script. Promover um cliente também reescreve a senha — a plataforma
inteira não pode ficar nas mãos de uma credencial que quem rodou o script não acabou de definir.

Recusa quer dizer código de saída `1`, mensagem com o nome da chave que falta, e **nenhuma** consulta escrita:
a lista de problemas do ambiente é verificada antes da primeira chamada ao banco.

## 4. O que produção nunca recebe

Nada desta rota conhece `admin@nexus.local` nem `nexus-demo`. Em produção, a semente só sobe com
`ALLOW_DEV_SEED=1` declarado — e mesmo assim cria somente o administrador da plataforma e as rotinas, porque
a conta de desenvolvimento pede `SEED_DEV_ACCOUNT=1` e a casa de demonstração pede `SEED_DEMO_COMPANY=1`. A
decisão está em `docs/adr/0005-semente-sem-demonstracao-em-producao.md`, e as provas em
`garantias-conta-de-demonstracao.test.ts` e `administrador-da-plataforma.test.ts`.

## 5. Depois da primeira subida

- **Trocar a senha do administrador**: pelo painel, em *Minha conta* (a troca derruba as outras sessões), ou
  reexecutando o bootstrap com `ADMIN_CRIAR_RENOVAR_SENHA=1`.
- **Rotinas agendadas**: `CRON_ENABLED=1` em um único processo; os demais atendem requisições.
- **Registro das credenciais desta máquina**: ficam no `CREDENCIAIS.md` local (ignorado pelo git). O
  repositório não guarda senha, token nem `.env`, e `identificadores-fora-do-codigo.test.ts` recusa valor
  literal atribuído a `SEED_ADMIN_PASSWORD`, `SEED_DEV_PASSWORD`, `NEXUS_CAPTURA_SENHA` e `ADMIN_CRIAR_SENHA`
  em qualquer arquivo rastreado.

## 6. O que ainda não está aqui

`Dockerfile`, `docker-compose` com a porta 3306 fechada, política de logs e o roteiro de backup chegam na F6;
pipeline de CI, `npm audit` e portões de cobertura na F8. Enquanto isso, não existe hospedagem recomendada
escrita no repositório — a decisão é do dono (`docs/decisoes/G5-hospedagem-e-backup.md`).
