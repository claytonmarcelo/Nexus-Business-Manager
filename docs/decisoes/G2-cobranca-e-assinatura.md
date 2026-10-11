# G2 — Cobrança, planos e assinatura

**Situação:** BLOQUEADO POR DECISÃO · **Década:** 2026-10-11 · **Nenhuma integração foi inventada.**

## O que existe hoje

- `PaymentGateway` (`prisma/schema.prisma`, linhas 696–716): provedores `MERCADO_PAGO`, `EFI`, `STRIPE`;
  ambiente `SANDBOX`/`PRODUCTION`; `publicKey` e os campos cifrados de credencial e webhook; `active`
  começando em `false`; última checagem registrada. Único `@@unique([companyId, provider, environment])`.
- Não existe `Plan`, `Subscription`, `Invoice` nem `WebhookEvent` no schema. O produto é vendido hoje como
  licença instalada, não como SaaS cobrado.
- Nada no código chama gateway algum. A tabela existe para a tela de integrações guardar a configuração;
  o README diz isso com todas as letras ("gateways de pagamento têm tabela mas não têm chamada").
- O financeiro interno (`finance_entries`, parcelas em `sales.installments`) sabe carregar um carnê e
  marcar pago — ele **não** cobra ninguém.

## Por que está parado

Cobrança recorrente é a decisão com maior superfície de erro do produto: webhooks idempotentes, verificação
de assinatura, reconciliação de centavos, retratação e estorno. Escolher o provedor define o resto, e o
contrato proíbe escrever adaptação com credencial inventada.

## Opções

| Opção | Cobrança recorrente | PIX / boleto | Assinatura de cartão | Custo | Observação |
|---|---|---|---|---|---|
| **Mercado Pago** | sim, `preapproval` | sim | sim | 1 rateio + tarifa por pagamento | já está no enum; maior cobertura de meio de pagamento no Brasil |
| **Efí (ex-Boleto Simples)** | sim | sim, forte em boleto | sim | por transação + mensalidade em alguns planos | já está no enum; boleto registrado sem contrato próprio |
| **Stripe** | sim, a melhor API de assinatura | não nativo | sim | ≈ 3,99% + câmbio | já está no enum; cobrança internacional e relatórios maduros |
| **Stripe + provedor brasileiro** | Stripe para cartão, MP/Efí para PIX e boleto | sim | sim | duas integrações | cobertura máxima, custo de manutenção dobrado |
| **Sem cobrança automática** | link de pagamento manual, marca pago à mão | sim, à mão | não | zero | serve para 20 clientes; para milhares não serve |

## Recomendação

**Mercado Pago** como primeiro provedor real — cobre PIX, boleto e cartão recorrente no mesmo contrato e
já está no enum — mantendo a porta genérica para Stripe quando o produto for vendido fora do Brasil. Se o
plano comercial for vender para empresa que exige boleto registrado em banco próprio, aí é Efí.

## O que a porta vai ficar sendo (desenho, ainda não escrito)

```
src/integrations/cobranca/porta.ts       criarAssinatura, cobrar, cancelar, verificarWebhook
src/integrations/cobranca/falso.ts       adaptador de teste: nada de rede, webhook assinado localmente
src/integrations/cobranca/{mercadopago,efi,stripe}.ts
```

Invariantes que valem para qualquer provedor:

1. **Webhook idempotente por `evento_id` único** no banco. Reentrega não pode gerar duas cobranças.
2. **Assinatura conferida, nunca confiada**: verificação de assinatura antes de tocar no estado.
3. **Valores em centavo** (`lib/money.ts`), nunca no `float` do provedor, e reconciliação da moeda do
   provedor com a moeda da empresa.
4. **A API nunca expõe a chave privada**: credencial só no cofre da empresa (`credentialCipher`), com porta
   de escrita própria.
5. Estado de assinatura vem do webhook, não de um job que fica consultando o provedor a cada minuto.

## O que eu preciso de você

- [ ] O Nexus será vendido como SaaS cobrado, ou como instalação com contrato?
- [ ] Se SaaS: mercado alvo (só Brasil / Brasil + exterior)?
- [ ] Meios de pagamento obrigatórios (PIX? boleto? cartão recorrente?).
- [ ] Planos e limites: quantos planos, o que cada um libera (usuários, empresas, estoque, relatórios)?
- [ ] Trial? Quantos dias e com cartão ou sem cartão?
- [ ] CNPJ/razão que vai receber — o contrato do provedor é da empresa, não meu nem seu.
