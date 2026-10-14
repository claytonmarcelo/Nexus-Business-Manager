// A9 do prompt de mercado: a produção se recusa a subir com configuração de
// exemplo. Toda a decisão mora em funções puras, que recebem um mapa de
// variáveis e devolvem a lista de problemas — assim cada regra é testável sem
// mexer em `process.env`, sem `process.exit` e sem servidor no meio.
//
// A mensagem nomeia a variável e o motivo; NUNCA repete o valor de um segredo.

export type FonteDeAmbiente = Record<string, string | undefined>;

const CHAVES_DE_SEGREDO = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const;

// Comprimento mínimo de um segredo real em produção. O zod de `env.ts` exige 16
// em qualquer ambiente (para não quebrar o dev local); aqui a régua sobe para 32.
const MINIMO_DE_SEGREDO = 32;

// Palavras que denunciam valor copiado de tutorial. A checagem é no VALOR, não
// no nome da variável — o `.env.example` do repositório precisa continuar
// legível, e é justamente ele que ensina o formato com essas palavras.
const MARCAS_DE_EXEMPLO = ["troque", "change", "secret", "exemplo"] as const;

// Só produção. Em dev e teste o comportamento continua o de sempre: nada é
// cobrado além do zod de `env.ts`, senão o banco de testes e o Vite local
// param de subir por uma regra que não se aplica a eles.
export function exigeConfiguracaoDeProducao(nodeEnv: string | undefined): boolean {
  return nodeEnv === "production";
}

function problemasDoSegredo(chave: string, valor: string | undefined): string[] {
  if (!valor) return [`${chave} não está definido`];
  const saida: string[] = [];
  if (valor.length < MINIMO_DE_SEGREDO) {
    saida.push(`${chave} tem ${valor.length} caracteres (o mínimo em produção é ${MINIMO_DE_SEGREDO})`);
  }
  const minusculo = valor.toLowerCase();
  for (const marca of MARCAS_DE_EXEMPLO) {
    if (minusculo.includes(marca)) saida.push(`${chave} contém a palavra "${marca}" — é valor de exemplo, não segredo`);
  }
  return saida;
}

function problemasDoCors(valor: string | undefined): string[] {
  if (!valor) return ["CORS_ORIGIN não está definido"];
  const origens = valor.split(",").map((o) => o.trim()).filter(Boolean);
  if (origens.length === 0) return ["CORS_ORIGIN está vazio"];
  const saida: string[] = [];
  for (const origem of origens) {
    if (origem === "*") {
      saida.push("CORS_ORIGIN usa \"*\": em produção a origem precisa ser uma lista fechada dos frontends reais");
      continue;
    }
    if (origem.includes("localhost") || origem.includes("127.0.0.1")) {
      saida.push(`CORS_ORIGIN aponta para "${origem}" — endereço de máquina local não serve para produção`);
    }
  }
  return saida;
}

function problemasDoBanco(valor: string | undefined): string[] {
  if (!valor) return ["DATABASE_URL não está definido"];
  let url: URL;
  try {
    url = new URL(valor);
  } catch {
    return ["DATABASE_URL não é uma URL de conexão válida"];
  }
  // A regra cobrada é o root sem senha: o administrador do MySQL nunca pode ser
  // a conta da aplicação, e uma conexão sem credencial então se torna pública.
  if (url.username.toLowerCase() === "root" && !url.password) {
    return ["DATABASE_URL conecta como \"root\" sem senha — produção precisa de uma conta própria, com senha e privilégios limitados"];
  }
  return [];
}

// D1 (F4): em produção a mensagem sai por SMTP de verdade. As três rotas de
// entrega existem, mas só uma delas entrega alguém — `console` escreve no log do
// processo e `memory` guarda numa caixa que morre com o teste. Deixar produção
// cair no console é o mesmo que anunciar "recupere sua senha" e nunca enviar o
// código: a conta fica trancada por fora e ninguém percebe. Por isso a régua
// cobra host, porta e remetente, e recusa os dois entregadores que não entregam.
function problemasDoMail(fonte: FonteDeAmbiente): string[] {
  const transporte = (fonte.MAIL_TRANSPORT ?? "").trim().toLowerCase();
  const problemas: string[] = [];
  if (transporte === "memory") {
    problemas.push("MAIL_TRANSPORT=memory em produção: a caixa de e-mail morre com o processo e nenhuma mensagem chega");
  } else if (transporte !== "" && transporte !== "smtp") {
    problemas.push("MAIL_TRANSPORT tem valor desconhecido — em produção a entrega é \"smtp\"");
  }
  if (!(fonte.SMTP_HOST ?? "").trim()) {
    problemas.push("SMTP_HOST não está definido — sem servidor de saída a produção não envia recuperação, verificação nem aviso de segundo fator");
  }
  const porta = (fonte.SMTP_PORT ?? "").trim();
  if (!porta) {
    problemas.push("SMTP_PORT não está definida");
  } else if (!/^\d+$/.test(porta) || Number(porta) < 1 || Number(porta) > 65535) {
    // Só o número da porta é impresso se for inválido, e ele não é segredo. O
    // valor é recortado para a mensagem não carregar uma linha inteira de .env.
    problemas.push(`SMTP_PORT "${porta.slice(0, 12)}" não é uma porta entre 1 e 65535`);
  }
  const remetente = (fonte.MAIL_FROM ?? "").trim();
  if (!remetente) {
    problemas.push("MAIL_FROM não está definido — toda mensagem precisa de um remetente do domínio da instalação");
  } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(remetente)) {
    problemas.push("MAIL_FROM não é um endereço de e-mail válido");
  }
  // WEB_BASE_URL é o link que sai dentro do e-mail. Apontar para localhost ou
  // http em produção faz o cliente clicar num endereço que não existe — ou
  // existe na máquina de quem não deveria estar lá.
  const base = (fonte.WEB_BASE_URL ?? "").trim();
  if (!base) {
    problemas.push("WEB_BASE_URL não está definida — o link de verificação e recuperação não tem destino");
  } else if (!base.startsWith("https://")) {
    problemas.push("WEB_BASE_URL precisa começar com https:// em produção — o link do e-mail atravessa a internet");
  } else if (base.includes("localhost") || base.includes("127.0.0.1")) {
    problemas.push("WEB_BASE_URL aponta para endereço de máquina local — o link do e-mail não levaria o cliente a lugar nenhum");
  }
  return problemas;
}

// D2 (F4): cadastro sem verificação de e-mail em produção significa conta
// anônima — qualquer um entra com um endereço que não é seu, e a recuperação de
// senha passa a ser a única coisa entre o estranho e os dados de um cliente.
function problemasDaVerificacao(fonte: FonteDeAmbiente): string[] {
  if ((fonte.REQUIRE_EMAIL_VERIFICATION ?? "").trim() !== "1") {
    return ["REQUIRE_EMAIL_VERIFICATION não está ligado — em produção conta nova só entra no painel com o e-mail confirmado (D2)"];
  }
  return [];
}

// D3 (F4): a chave que cifra o segredo TOTP. AES-256-GCM pede 32 bytes, então a
// forma cobrada é hexadecimal de 64 caracteres — uma chave de 300 caracteres em
// base64 e uma palavra-passe de doze letras viram o mesmo bug silencioso: 2FA
// que ninguém consegue desligar, ou segredo que não estava cifrado de verdade.
export const FORMATO_DE_CHAVE_TOTP = /^[0-9a-fA-F]{64}$/;

function problemasDoSegundoFator(fonte: FonteDeAmbiente): string[] {
  const chave = fonte.TOTP_ENCRYPTION_KEY ?? "";
  if (!chave) {
    return ["TOTP_ENCRYPTION_KEY não está definida — sem ela o segredo de segundo fator não tem como ser cifrado em repouso (D3)"];
  }
  // A palavra de tutorial vem ANTES do formato. Uma chave escrita à mão
  // ("troque…000") é as duas coisas — valor de exemplo e fora de formato — e a
  // causa que serve para quem está configurando é a primeira. Numa chave
  // hexadecimal de verdade este laço nunca pega: nenhuma das marcas é formada só
  // por dígitos de 0-9a-f. Fica aqui porque a régua é a mesma dos outros segredos,
  // e porque um dia o formato pode aceitar base64.
  const minusculo = chave.toLowerCase();
  for (const marca of MARCAS_DE_EXEMPLO) {
    if (minusculo.includes(marca)) return [`TOTP_ENCRYPTION_KEY contém a palavra "${marca}" — é valor de exemplo, não chave`];
  }
  if (!FORMATO_DE_CHAVE_TOTP.test(chave)) {
    return ["TOTP_ENCRYPTION_KEY precisa ser exatamente 64 caracteres hexadecimal (32 bytes para AES-256-GCM)"];
  }
  // O buraco que sobra depois do formato: uma chave hex válida pode ser cópia de
  // exemplo ("0" repetido, "a" repetido, teclado em fila). AES-256-GCM com chave
  // previsível cifra exatamente tão bem quanto um cadeado de brinquedo, e o que
  // ela guarda é o segredo TOTP em repouso — reconstruí-lo vale por desligar o
  // segundo fator de toda a plataforma. Pouca variedade de caracteres é o sinal
  // barata de conferir, e uma chave de `randomBytes(32)` nunca chega perto dela.
  const variedade = new Set(minusculo).size;
  if (variedade < 8) {
    return [
      `TOTP_ENCRYPTION_KEY usa só ${variedade} caracteres diferentes nos 64 — parece valor de exemplo; gere uma chave aleatória com node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"`,
    ];
  }
  return [];
}

// Devolve a lista de problemas (vazia = configuração aceita). Não lança: quem
// chama decide a reação, e o teste pode olhar cada item separadamente.
export function problemasDeProducao(fonte: FonteDeAmbiente): string[] {
  const problemas: string[] = [];
  for (const chave of CHAVES_DE_SEGREDO) problemas.push(...problemasDoSegredo(chave, fonte[chave]));
  if (
    fonte.JWT_ACCESS_SECRET &&
    fonte.JWT_REFRESH_SECRET &&
    fonte.JWT_ACCESS_SECRET === fonte.JWT_REFRESH_SECRET
  ) {
    problemas.push("JWT_ACCESS_SECRET e JWT_REFRESH_SECRET são iguais — um token vazaria o outro");
  }
  problemas.push(...problemasDoCors(fonte.CORS_ORIGIN));
  problemas.push(...problemasDoBanco(fonte.DATABASE_URL));
  if (fonte.AUTH_EXPOSE_RESET_TOKEN === "1") {
    problemas.push("AUTH_EXPOSE_RESET_TOKEN=1 entrega o código de recuperação pelo HTTP — desligue em produção");
  }
  // R2: o endereço do administrador global não é mais literal no código. Em
  // produção ele é obrigação de ambiente — sem ele, a conta que a regra de
  // acesso protege não existe, e o servidor não sobe.
  if (!(fonte.SUPER_ADMIN_EMAIL ?? "").trim()) {
    problemas.push("SUPER_ADMIN_EMAIL não está definido — em produção o endereço do administrador global vem do ambiente, nunca do código");
  }
  // F4: as três travas novas (D1, D2, D3) são da mesma natureza das outras —
  // configuração de exemplo derruba a subida antes da primeira requisição.
  problemas.push(...problemasDoMail(fonte));
  problemas.push(...problemasDaVerificacao(fonte));
  problemas.push(...problemasDoSegundoFator(fonte));
  return problemas;
}

// TRUST_PROXY: "0" desliga; 1..31 dizem quantos saltos de proxy são confiáveis.
// O valor N devolve a função que confia nos N proxies mais próximos do servidor
// e entrega o endereço seguinte como o cliente real (é o contrato de
// `trustProxy` do Fastify, que repassa ao proxy-addr). Afastar-se disso sem
// proxy na frente permite forjar o IP da auditoria, do rate-limit e do modo de
// manutenção, então a forma é validada na entrada (zod) e traduzida aqui.
export const FORMATO_DE_TRUST_PROXY = /^(0|[1-9]|[1-2][0-9]|3[0-1])$/;

export type ValorDeTrustProxy = boolean | ((address: string, hop: number) => boolean);

export function interpretarTrustProxy(valor: string): ValorDeTrustProxy {
  if (!FORMATO_DE_TRUST_PROXY.test(valor)) return false;
  const saltos = Number(valor);
  if (saltos <= 0) return false;
  return (_address: string, hop: number) => hop < saltos;
}
