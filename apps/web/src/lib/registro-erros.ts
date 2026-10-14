// F5, item 3: o caderno do limite de erro.
//
// Quando uma página quebra na renderização, o ErrorBoundary mostra a página de
// erro e anota o que aconteceu aqui. Sem a anotação o time só descobre o estrago
// por reclamação; com ela, quem abre o navegador da pessoa que teve o problema
// encontra os últimos cinco registros com o escopo, a mensagem e o momento.
//
// O filtro não é enfeite. O endereço de verificação de e-mail leva o token de
// confirmação na consulta, e um stack trace copiado do navegador atravessaria a
// rota com ele na vista. Então nenhum endereço chega ao registro com consulta ou
// fragmento, e os nomes de parâmetro que carregam credencial são trocados pela
// palavra [oculto] onde quer que apareçam.
//
// Nada vai para o console: o console é do navegador, não do produto, e a varredura
// de texto de depuração (F5, item 5) não deixa.

export interface ErroRegistrado {
  escopo: string;
  mensagem: string;
  pilha: string;
  quando: string;
}

const CHAVE = "nexus.erro";
const MAXIMO = 5;
const CORTE = 4000;

let registros: ErroRegistrado[] = [];

/**
 * Troca por [oculto] o valor de qualquer parâmetro que pareça credencial.
 */
function escondaCredencial(texto: string): string {
  return texto.replace(
    /\b(token|senha|password|passwd|code|otp|codigo|chave|secret|access[_-]?key|api[_-]?key)=[^\s&"'`]+/gi,
    "$1=[oculto]",
  );
}

/**
 * Corta consulta e fragmento de todo endereço http(s) que aparecer no texto.
 */
function limpeEnderecos(texto: string): string {
  return texto.replace(/https?:\/\/[^\s"'`<>]+/g, (url) => url.split("?")[0].split("#")[0]);
}

/**
 * Deixa o texto seguro para ser guardado: sem endereço com consulta, sem
 * credencial em parâmetro, sem tamanho que estoure o armazenamento.
 */
export function sanitizar(texto: string): string {
  return escondaCredencial(limpeEnderecos(String(texto))).slice(0, CORTE);
}

function guardeNoNavegador(): void {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(registros));
  } catch {
    // Navegador sem armazenamento disponível (aba privada cheia, CSP de
    // escrita): o registro em memória deste ciclo continua valendo.
  }
}

/**
 * Anota o erro que um limite de erro capturou. O `info` é o componente que o
 * React entrega no componentDidCatch; quando ele não vem, a pilha fica só com o
 * stack do próprio erro.
 */
export function registraErroDeRenderizacao(
  erro: unknown,
  info: unknown,
  escopo: string,
): ErroRegistrado {
  const origem = erro as Error | undefined;
  const detalhe = info as { componentStack?: string } | undefined;
  const registrado: ErroRegistrado = {
    escopo: sanitizar(escopo),
    mensagem: sanitizar(origem?.message ?? String(erro)),
    pilha: sanitizar([origem?.stack, detalhe?.componentStack].filter(Boolean).join("\n")),
    quando: new Date().toISOString(),
  };
  registros = [registrado, ...registros].slice(0, MAXIMO);
  guardeNoNavegador();
  return registrado;
}

/** Os últimos erros, do mais recente para o mais antigo. */
export function ultimosErros(): ErroRegistrado[] {
  return [...registros];
}

/** Esquece o caderno — usado por teste e por quem fecha o ciclo de diagnóstico. */
export function limparErros(): void {
  registros = [];
  try {
    sessionStorage.removeItem(CHAVE);
  } catch {
    // Sem armazenamento, sem o que limpar.
  }
}
