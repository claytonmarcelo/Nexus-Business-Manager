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
