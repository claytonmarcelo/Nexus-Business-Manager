# Segurança — como relatar um problema

Este arquivo diz **para onde vai um relato de falha de segurança**, **o que a casa espera receber** e
**em quanto tempo responde**. Ele existe porque um achado de segurança que vaza no fórum perde o valor
que tinha: quem achou a falha precisa de tempo para escrevê-la direito, e a casa precisa de tempo para
consertar sem atrapalhar quem usa.

O tom aqui é o do resto do projeto: a casa assume que alguém vai tentar entrar onde não deve, e trata
isso como trabalho de manutenção, não como incidente de guerra.

## Versões que recebem relato

| Linha | Situação | Aceita relato |
|---|---|---|
| `main` (ramo de trabalho) | a linha que será publicada como **1.0** | Sim |
| Releases publicados da 1.0 | versão estável da linha 1.0 | Sim |
| Versões anteriores à 1.0 | não existem como release: o repositório ainda não tem tag de versão | Não |

Enquanto a 1.0 não for publicada, **qualquer relato contra `main` vale** e é tratado como se fosse contra
a versão estável.

## Como relatar

### Canal 1 — GitHub Security Advisories (privado, o preferido)

O canal privado do repositório:
<https://github.com/claytonmarcelo/Nexus-Business-Manager/security/advisories/new>

O relato no GitHub fica **privado**: só o autor da casa e quem responde por lá veem o conteúdo até a
publicação. Ele abre uma conversa, aceita anexos e deixa um registro com data — que é o que a casa precisa
para responder com prazo.

> **Pendente do dono:** o relato privado do GitHub só existe se a opção **"Private vulnerability
> reporting"** estiver ligada nas configurações do repositório. Enquanto ela não estiver, use o canal 2.

### Canal 2 — e-mail do autor

O e-mail de contato do autor é **campo em branco neste arquivo, de propósito**: o endereço que vale é o do
dono, e o dono é quem escreve nele. Quem preferir o e-mail a um canal no GitHub escreve para lá, com o
assunto **`SECURITY`**.

```
Assunto: SECURITY — <resumo em uma linha>
```

> **E-mail de contato da casa:** _(em branco - o dono preenche)_

Enquanto essa linha estiver em branco, o canal 1 é o caminho do relato. O que está neste arquivo é o
**caminho**, não o endereço: nenhum endereço de e-mail é escrito no repositório, porque endereço escrito
no repositório é endereço que a varredura de segredo encontra.

### O que colocar no relato

Quanto mais o relato ajudar, mais rápido a casa reproduz o problema. Não é preciso ter certeza de que é falha de
segurança - "acho que isso está errado" já é um relato válido.

1. **O que aconteceu**, em uma ou duas frases.
2. **Como reproduzir**, passo a passo: endereço, conta de teste (pode ser uma conta fictícia criada só
   para isso), requisição ou sequência de cliques.
3. **O que a pessoa esperava** e **o que aconteceu de verdade**.
4. **A consequência**: quem conseguiu ver o quê, ou o que deixou de valer.
5. **O ambiente**: `main` local, contêiner, ou instalação na Vercel com TiDB Cloud.
6. **Anexos**: captura de tela, saída de requisição, linha de log **com o que é sensível removido**.

**Não** inclua no relato: senha de verdade, token de sessão, chave de cifragem, dados de cliente. Se o
relato precisa de um segredo para ser reproduzível, escreva "preciso de acesso temporário" e diga qual -
a casa gera um valor descartável e entrega por outro caminho.

## O que **não** é falha de segurança

Estas entradas aqui estão na casa, e o relato delas só gasta tempo dos dois lados:

- **Erro de uso do produto.** Botão que não salva, campo que não valida, tela que não abre no navegador
  da pessoa. Isso é defeito funcional: pode ser relatado pela issue comum do repositório.
- **Texto legal sem revisão jurídica.** Os textos de Termos, Privacidade e LGPD nascem marcados como
  **rascunho** e o produto recusa publicá-los antes de existirem texto e revisão de um advogado. Um texto
  mal redigido é assunto do jurídico, não da segurança.
- **Falha de terceiro.** Vulnerabilidade em dependência é assunto do mantenedor da dependência; a casa
  atualiza a dependência e avisa. A exceção é quando a falha é agravada por **como** a casa usa a
  dependência - aí é relato de segurança.
- **Ataque de negação de serviço já conhecido e aceito.** A casa assume, por escrito, que o bloqueio por
  conta tranca uma pessoa por quinze minutos (veja "Riscos aceitos"). Relatar isso como novidade não
  ajuda: o caminho de evolução já está escrito.
- **Acesso indevido a dado que a própria pessoa é dona.** Ver os dados da própria conta, exportar o
  próprio JSON, anonimizar a própria conta: são direitos, com porta e trilha, não furo.
- **Vulnerabilidade em ambiente de terceiro** (Vercel, TiDB Cloud, provedor de SMTP) sem um agravamento no
  produto da casa.

## Prazos de resposta

A casa é pequena e o produto é usado por empresas de verdade. Os prazos abaixo são o que a casa **se
compromete** a fazer:

| Momento | Prazo | O que acontece |
|---|---|---|
| **Primeiro contato** | até **3 dias úteis** | A casa responde no canal do relato, mesmo que seja só "recebido, em análise". |
| **Triagem** | até **7 dias úteis** | A casa diz se é falha de segurança, defeito funcional, ou não é falha; e diz o que vai fazer. |
| **Atualização** | a cada **7 dias** enquanto o tema estiver aberto | Mesmo sem solução, há notícia do andamento. |
| **Correção** | conforme a gravidade | Crítica (dados em risco ou acesso indevido): alvo de **até 7 dias**. Alta: **até 30 dias**. Média e baixa: entram no ciclo da próxima versão. |
| **Publicação** | junto da correção | A correção vem com nota no [`CHANGELOG.md`](CHANGELOG.md). A CVE ou o aviso público sai **depois** da correção estar no ar, salvo urgência combinada com quem relatou. |

Quem relata **não é apressado**: silêncio de quem descobriu não é falta da casa, e o prazo começa a contar
quando o relato chega ao canal 1 ou ao canal 2.

## Riscos aceitos

Estes riscos **existem, são conhecidos e são escolha da casa**. Eles estão aqui porque um achado que já
está aceito precisa estar escrito num lugar público - e porque aceitar um risco é diferente de esconder
um problema.

| Risco | O que é | Por que é aceito | O que reduz o dano |
|---|---|---|---|
| **Bloqueio por conta como negação de serviço** | Cinco tentativas erradas em quinze minutos trancam o endereço por quinze minutos. Quem conhece o e-mail de alguém pode trancar a pessoa fora da conta dela. | A casa trocou de propósito: sem esse bloqueio, o atacante tem tempo ilimitado para adivinhar senha. O caminho de "e-mail inexistente" faz o mesmo trabalho de comparação de hash do caminho de "senha errada", então o bloqueio não abre uma porta nova de enumeração. | A janela vence sozinha; um `reset-password` bem-sucedido limpa o bloqueio; o limite de 10 tentativas por minuto por IP corta o insistente. |
| **Limitador de taxa por instância** | O balde de tentativas vive na memória do processo. Com duas instâncias (ou função serverless com instâncias frias), o teto vale **por instância**, não por instalação. | A instalação de referência é de processo único; o caminho para store compartilhado está registrado como pendência. | O teto por rota continua valendo em cada instância; a trilha de auditoria registra o bloqueio. |
| **Fila de e-mail na memória do processo** | A entrega de mensagem (verificação, recuperação) é assíncrona, mas a fila vive na RAM da instância. Instância que morre leva a fila junto. | A fila é o que impede que um SMTP lento segure o pedido de quem está usando o produto. | A entrega tem retentativa com recuo exponencial, teto de tempo por tentativa e teto de mensagens na fila; a falha fica registrada na auditoria depois da última tentativa. |
| **A retenção da trilha apaga também a prova do exercício de direito** | A rotina de expurgo apaga linhas de auditoria mais velhas que a janela configurada - inclusive as linhas `lgpd.export`, `lgpd.anonymize` e `lgpd.delete`, que provam o exercício de um direito do titular. | A trilha é dado pessoal: conservá-la para sempre é guarda sem fim, e a LGPD pede o contrário. | O padrão é **desligado** (`AUDIT_RETENTION_DIAS=0`): sem decisão, nada é apagado. Quem quiser guardar a prova escolhe uma janela maior. |
| **Administrador da plataforma como dono das casas de demonstração** | A conta global nasce como `OWNER` nas empresas criadas pelo seed de demonstração. | O seed de demonstração é desligado em produção por padrão (`SEED_DEMO_COMPANY=0`). | A porta de bootstrap de produção não cria empresa de demonstração; o desacoplamento do vínculo está registrado como pendência. |

## O que a casa já faz

O que está abaixo não é promessa: é o que o código já faz, com prova automatizada na suíte.

- **Senhas nunca guardadas em claro** - hash bcrypt, política mínima de 8 caracteres com maiúscula e
  caractere especial.
- **Segundo fator TOTP** - o segredo é cifrado em repouso (AES-256-GCM) e a chave de cifragem é exigida
  em produção.
- **JWT com refresh rotacionado** - o refresh é de uso único; um refresh reusado derruba a sessão.
- **Verificação de e-mail antes de entrar** - obrigatória em produção.
- **Isolamento multiempresa por construção** - toda leitura e escrita parte do `companyId` da sessão, e um
  teste de intrusão ataca as rotas de uma empresa com os identificadores de outra.
- **Trilha de auditoria por ação, IP e origem** - e uma prova que garante que a trilha **não** carrega
  senha, token, hash nem corpo sensível.
- **Limitador de taxa por rota** - login, cadastro, recuperação, e os portões da LGPD têm teto próprio.
- **Textos legais não publicáveis sem texto e sem revisão de advogado** - o marcador de rascunho é a
  fonte da verdade e o servidor recusa a publicação.
- **Retenção da trilha configurável** - janela por variável de ambiente, expurgo em lote, e o corte
  registrado na própria trilha.
- **Direitos do titular exercíveis na própria conta** - cópia dos dados em JSON, anonimização e
  exclusão, cada uma com recibo na trilha.

O detalhe de cada um, com o comando que mede, está em [`docs/STATUS-AJUSTES.md`](docs/STATUS-AJUSTES.md)
e em [`docs/AUDITORIA.md`](docs/AUDITORIA.md).

## Licença

O repositório é **proprietário**: o `package.json` declara `UNLICENSED` e a licença é decisão pendente do
dono ([`docs/decisoes/G6-licenca.md`](docs/decisoes/G6-licenca.md)). Este arquivo existe de qualquer jeito:
relatar falha de segurança é sempre bem-vindo, e o canal acima não exige licença de uso do código.
