# G3 — Fiscal brasileiro (NCM/CFOP, certificado e NF-e)

**Situação:** BLOQUEADO POR DECISÃO · **Década:** 2026-10-11 · **Nenhuma integração foi inventada.**

## O que existe hoje

- Cadastro da empresa guarda CNPJ/inscrição e endereço conferidos no servidor (`lib/brFields.ts` valida
  CPF/CNPJ com dígito verificador, DDD e UF). Existe `document` no cliente e no fornecedor.
- **Não existe nenhum campo fiscal de produto ou de venda**: NCM, CFOP, CST/CSOSN, origem da mercadoria,
  unidade tributável, IPI/PIS/COFINS. Nem tabela de nota fiscal, nem fila de emissão, nem evento de
  autorizada/cancelada.
- O produto é um ERP de gestão, não um emissor de nota. Emitir NF-e sem certificado e sem credenciais
  de autorizadora seria inventar documento fiscal — exatamente o que o contrato proíbe.

## Por que está parado

Emissão fiscal é a decisão mais cara do roadmap: certificado A1 (arquivo com senha, pago por ano),
credenciamento em cada autorizadora (SEFAZ/SP, ou município para NFS-e), e um fornecedor de emissor se não
quiser escrever o leiaute da NF-e à mão. Nada disso se escolhe no código.

## Opções

| Caminho | O que é | Prós | Contras |
|---|---|---|---|
| **Fornecedor de emissão (Focus NFe, NFe.io, Bling)** | API que assina, transmite e devolve o XML/DANFE | o mais rápido para ficar certo; mantêm o leiaute que muda; certificado fica com eles | mensalidade por volume; seu cliente passa a ter relação com dois fornecedores |
| **Biblioteca própria + certificado local** (ex.: `node-fechador`) | você monta o XML, assina e transmite | sem mensalidade de terceiros | você passa a ser o suporte fiscal: leiaute 4.00, eventos, MCC/SEFAZ, contingência, cancelamento, devolução |
| **E-mail/portal para o contador emitir** | o Nexus exporta o pedido e a venda e **não emite** | zero risco fiscal, entrega em dias | o produto continua sem "nota emitida", e a exportação precisa ser confiável |
| **Só campos fiscais, sem emissão** | cadastrar NCM/CFOP/CST e imprimir a DANFE em outro lugar | prepara o cadastro para o dia da emissão | não resolve nada para quem precisa emitir hoje |

## Recomendação

Em duas etapas, e é assim que o contrato já está sendo cumprido:

1. **Agora:** campos fiscais no produto e na venda (NCM, CFOP, CST/CSOSN, origem), validados, e a
   exportação do pedido pronta para o contador. É o único pedaço que não depende de credencial.
2. **Depois da sua escolha:** **fornecedor de emissão** em vez de emissão própria. Um ERP de gestão não
   deve virar empresa de contabilidade; o certificado e o leiaute ficam com quem vive disso, e a sua
   superfície de erro vira uma API com webhook idêntico ao caso G2.

## O que a porta vai ficar sendo (desenho, ainda não escrito)

```
src/integrations/fiscal/porta.ts    emitir(venda), consultar(protocolo), cancelar(), cartaDeCorrecao()
src/integrations/fiscal/falso.ts    devolve "rascunho", marca não emitido, nunca finge autorizada
src/integrations/fiscal/{provedor}.ts
```

Invariantes:

1. **Certificado nunca no banco de texto claro** — A1 com senha é segredo de ambiente, criptografado em
   repouso, e nunca aparece em log nem em mensagem de erro.
2. **Nota é documento, não estado de venda**: venda confirmada não pode ser reescrita por retry de emissão;
   existe `fiscal_documents` com `status`, `protocolo`, `xml_hash` e transições próprias.
3. **Webhook/evento idempotente** pelo `chave` da NFe + evento.
4. O adaptador falso **não** devolve "autorizada". Uma nota falsa no meio de uma demonstração é pior do que
   nenhuma nota.

## O que eu preciso de você

- [ ] Emitir NF-e é requisito de venda do produto, ou o público-alvo não emite?
- [ ] NF-e de produto, NFS-e de serviço, ou os dois?
- [ ] Certificado: quem contrata (você ou cada cliente)? Em qual CNPJ?
- [ ] Fornecedor preferido (Focus NFe / NFe.io / Bling / outro), ou mando comparar três por preço?
- [ ] Regime tributário alvo (Simples Nacional com CSOSN, ou Lucro Presumido com CST)?
