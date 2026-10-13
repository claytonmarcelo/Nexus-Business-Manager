import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../Logo";
import { currentYear } from "../../lib/format";
import { slugPeloKind, type ResumoLegal } from "../../lib/landingTypes";
import { MARCA, rotuloLegal, type Marca } from "../../lib/brand";
import { consultarEstadoDoServico, type EstadoDoServico } from "../../lib/statusServico";

// Rodapé único (F1.2): a vitrine, a página de documento legal e o painel montam
// este componente, e todo dado de identidade vem do arquivo de marca. As duas
// variantes mudam só respiração e endereço de padding, nunca texto.
//
// Regras que este arquivo carrega:
// - versão lida do package.json no build, sem número digitado em componente;
// - ano do copyright calculado na tela, nunca congelado em texto;
// - crédito do autor com link apenas quando houver endereço configurado;
// - documento legal aparece se, e somente se, estiver publicado;
// - indicador de estado do serviço só existe com resposta real do /api/health.

export interface AppFooterProps {
  readonly legais: readonly ResumoLegal[];
  readonly contexto?: "vitrine" | "painel";
  readonly marca?: Marca;
}

export function AppFooter({ legais, contexto = "vitrine", marca = MARCA }: AppFooterProps) {
  const [estado, setEstado] = useState<EstadoDoServico | null>(null);

  useEffect(() => {
    let vivo = true;
    void consultarEstadoDoServico().then((dado) => {
      if (vivo) setEstado(dado);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const publicados = legais.filter((doc) => doc.published);

  return (
    <footer className={"nexus-footer nexus-footer--" + contexto}>
      <span className="nexus-footer-marca">
        <Logo size={22} />
        <span className="nexus-footer-nome">{marca.nome}</span>
        {marca.versao ? (
          <span className="nexus-footer-versao">v{marca.versao}</span>
        ) : null}
      </span>

      <span className="nexus-footer-direitos">{"\u00A9"} {currentYear()} {marca.nome}</span>

      {publicados.length > 0 ? (
        <nav className="nexus-footer-legais" aria-label="Documentos legais">
          {publicados.map((doc) => (
            <Link key={doc.kind} to={"/legal/" + slugPeloKind(doc.kind)}>
              {rotuloLegal(doc)}
            </Link>
          ))}
        </nav>
      ) : null}

      <span className="nexus-footer-direita">
        {estado ? (
          <span className="nexus-footer-status" data-estado={estado.status === "ok" ? "operacional" : "instavel"}>
            <span className="nexus-footer-status-ponto" aria-hidden="true" />
            {estado.status === "ok" ? "Serviço operacional" : "Serviço com instabilidade"}
          </span>
        ) : null}
        {marca.urlDoAutor ? (
          <a
            className="nexus-footer-autor"
            href={marca.urlDoAutor}
            target="_blank"
            rel="noopener noreferrer"
          >
            {"Desenvolvido por " + marca.autor}
          </a>
        ) : (
          <span className="nexus-footer-autor">{"Desenvolvido por " + marca.autor}</span>
        )}
      </span>
    </footer>
  );
}
