// Exportações CSV (seção 43 do roteiro): um único gerador para todas as telas.
type Celula = string | number | boolean | null | undefined;

const NOVA_LINHA = String.fromCharCode(13) + String.fromCharCode(10);
const PULO = String.fromCharCode(10);

function escapando(valor: Celula): string {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor);
  // Ponto e vírgula é o separador do Excel em português; aspas, vírgulas e
  // quebras de linha obrigam a célula a ir entre aspas duplas.
  if (/[",;]/.test(texto) || texto.includes(PULO)) {
    return '"' + texto.replace(/"/g, '""') + '"';
  }
  return texto;
}

export function paraCsv(colunas: string[], linhas: Celula[][]): string {
  const cabecalho = colunas.map(escapando).join(";");
  const corpo = linhas.map((linha) => linha.map(escapando).join(";"));
  return [cabecalho].concat(corpo).join(NOVA_LINHA);
}

// Nunca grava BOM: a regra global do projeto é UTF-8 sem BOM.
export function baixarCsv(nome: string, colunas: string[], linhas: Celula[][]): number {
  const arquivo = nome.endsWith(".csv") ? nome : nome + ".csv";
  const blob = new Blob([paraCsv(colunas, linhas)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = arquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return linhas.length;
}
