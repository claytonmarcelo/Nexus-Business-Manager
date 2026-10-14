# G5 — Hospedagem, domínio, HTTPS e política de backup

**Situação:** BLOQUEADO POR DECISÃO · **Década:** 2026-10-11 · **Nada foi publicado em lugar nenhum.**

## O que existe hoje

- O projeto roda **na sua máquina**, no WAMP: MySQL 8.4.7 local, API Fastify em porta própria e o Vite do
  painel. Não há `Dockerfile`, não há compose, não há pipeline, não há ambiente além do dev.
- A configuração de produção já se recusa a subir errada (A9): segredo de tutorial, CORS de `localhost` e
  `root` sem senha derrubam o processo antes da primeira requisição, e `TRUST_PROXY` passou a existir para
  trabalhar atrás de proxy reverso. Isso é preparação, não hospedagem.
- Banco: uma base MySQL com dados reais de demonstração; o dump é feito hoje à mão, sem rotina, sem teste de
  restauração.
- O `README.md` documenta `CORS_ORIGIN`, `RATE_LIMIT_MAX` e a senha do administrador via `.env`, mas não
  existe guia de deploy.

## Por que é decisão sua

Hospedagem define preço mensal, região de dados (LGPD), quem segura o MySQL, como chega TLS e onde o backup
dorme. Nenhuma dessas escolhas é técnica-only: todas têm consequência comercial.

## Opções

| Caminho | App | Banco | TLS/CDN | Custo aproximado | Observação |
|---|---|---|---|---|---|
| **AWS (RDS MySQL + ECS/App Runner ou EC2)** | container ou instância | RDS multi-AZ | CloudFront + ACM | de US$ 30 a 120/mês conforme tamanho | você já estuda na AWS Academy; integração natural com SES (G1) |
| **VPS (Hetzner / DigitalOcean / AWS Lightsail)** | Node + Nginx no seu SO | MySQL no mesmo VPS, ou gerenciado | Let's Encrypt | €4–US$12/mês | mais barato e mais manual: você é o SRE |
| **PaaS (Render / Railway / Fly.io)** | container com healthcheck | add-on gerenciado | automático | US$ 7–25/mês + banco | o mais rápido para colocar no ar; egresso e region restritos no plano baixo |
| **Continuar on-premise no seu servidor** | o que já é | o que já é | seu | zero novo | você já faz backup, atualiza e atende o cliente na hora |
| **Misto: app em PaaS, banco gerenciado separado** | PaaS | RDS/Neon/PlanetScale | automático | médio | bom meio-termo para não acordar às 3h por causa de disco cheio |

## Recomendação

**Render ou Railway com MySQL gerenciado** para o primeiro ambiente público (deploy por Dockerfile,
healthcheck no `/api/health` que já existe, HTTPS automático, custo pequeno e reversible), **e AWS quando o
produto começar a cobrar** — aí SES (G1), RDS e a mesma conta entram juntos. VPS só se você quiser gastar
menos dinheiro e mais tempo.

Independente da escolha, estas quatro coisas deixam de ser decisão e viram regra de projeto:

1. **Backup automático diário com retenção** (7 diários, 4 semanais, 12 mensais) e **restauração testada em
   ambiente separado pelo menos uma vez por trimestre**. Backup que nunca foi restaurado é desejo, não
   plano.
2. **Dump lógico + arquivo de uploads** — o painel guarda imagem/logo em disco; só o SQL não recupera nada.
3. **Banco em região e país declarados** (LGPD: onde dorme o dado do cliente).
4. **HTTPS obrigatório, `CORS_ORIGIN` no endereço público, `TRUST_PROXY=1`** quando houver proxy na frente —
   a A9 já recusa a subida se alguém esquecer.

## O que eu preciso de você

- [ ] Onde vai morar (AWS / VPS / PaaS / continua local)?
- [ ] Domínio e região (`.com.br`? `.app`? uma URL de teste primeiro)?
- [ ] Quem paga a conta de infra (você, ou repassado ao cliente)?
- [ ] Janela de backup aceita (RPO de 24h basta? precisa de menor?) e por quanto tempo guardar (RPO/RTO)?
- [ ] Precisa de alta disponibilidade ou "fora do ar por dez minutos por mês" é aceitável hoje?

## O que mudou desde que esta decisão foi escrita — a regra 1 virou código, e a regra 2 não é o que o texto supõe (T5.2, 2026-10-14)

- **Regra 1, parte da retenção: existe, e é medida.** `deploy/backup-mysql.cjs` aplica exatamente 7 diários,
  4 semanais e 12 mensais — com a semana contada como **semana ISO**, que é o que faz a janela não derivar a
  cada execução. `tools/verify-backup.cjs` confere as propriedades da política numa série de 45 arquivos e
  fecha **56 verificações, 0 falhas**.
- **Regra 1, parte do "automático diário": não existe.** Não há agenda neste repositório. `npm run
  docker:backup` é um comando, e quem o repete é o cron/Agendador de Tarefas da máquina que hospeda — o que
  depende da resposta de hospedagem acima. O executor de rotinas do painel não pode fazer isso: roda dentro
  do container da API, sem o binário `docker` e sem a pasta do host. Registrado como N71, e não entregue por
  fora da decisão.
- **Regra 1, parte da "restauração testada em ambiente separado": agora é comando, não memória.**
  `npm run docker:provar-backup` restaura o dump num banco separado (`nexusbm_restauracao`) dentro do MySQL da
  pilha, compara tabela por tabela com a origem e apaga o banco de conferência no fim. O que continua faltando
  é o **exercício trimestral em outro host**: enquanto a hospedagem não for escolhida, não há outro host. A
  régua é o que dá para fazer hoje, e é ela que a regra 1 chama de "prova".
- **Regra 2 está escrita sobre uma premissa falsa** (N72): o painel não guarda imagem/logo em disco — a API
  aceita logo só como endereço `http(s)` (`companies.schemas.ts:69`), e não existe parser `multipart` em
  nenhuma rota. Então "dump lógico + arquivo de uploads" hoje é *só* dump lógico, porque não há uploads para
  copiar. Quando o upload das seções 26 e 48 chegar, a regra 2 passa a ter objeto e o backup tem de crescer
  junto — a linha acima é o lembrete, e o texto da regra continua como está para não apagar a decisão original.
- **Regra 4, conferida na subida da pilha** (T5.1): o compose nasce com `NODE_ENV=production`, a A9 recusou a
  subida com `WEB_BASE_URL` sem https e sem `CORS_ORIGIN` público, e TLS termina fora daqui — o container serve
  texto puro na `PAINEL_PORT`; certificado é do ambiente escolhido acima.
