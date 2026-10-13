// Fonte única da identidade que aparece no rodapé (F1.2 do PROMPT MESTRE).
// Vitrine e painel leem daqui: mudar o nome do produto, o crédito ou o rótulo de
// um texto legal é uma edição neste arquivo, não uma caça a dois componentes.

export interface Marca {
  readonly nome: string;
  readonly autor: string;
  /** Endereço da página do autor. Vazio significa "não configurado". */
  readonly urlDoAutor: string;
}

export const MARCA: Marca = {
  nome: "Nexus Business Manager",
  autor: "Clayton Marcelo",
  // O crédito é do dono e permanece. Como link ele só vira endereço real quando
  // houver página configurada - até lá é texto, e o rodapé não aponta para lugar
  // nenhum.
  urlDoAutor: "",
};

// Rótulos institucionais dos três documentos que a API conhece (LegalKind).
// Servem de fallback: quem manda no texto é o CMS, e o rótulo daqui só entra
// quando o documento publicado chegou sem título.
export const ROTULOS_LEGAIS: Record<string, string> = {
  TERMS: "Termos de uso",
  PRIVACY: "Política de privacidade",
  LGPD: "Adequação à LGPD",
};

export function rotuloLegal(doc: { kind: string; title: string }): string {
  const titulo = doc.title.trim();
  if (titulo.length > 0) return titulo;
  return ROTULOS_LEGAIS[doc.kind.toUpperCase()] ?? doc.kind;
}
