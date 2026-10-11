import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { pedirLiberacaoManutencao } from "../../lib/landingApi";
import type { EstadoManutencao } from "../../lib/landingTypes";
import { Logo } from "../Logo";
import { MANUTENCAO_LANDING } from "./copy";

// Tela de manutenção. Ela é montada a partir do payload público (que a API
// deixa aberto justamente para isso), então o visitante sabe o que está
// acontecendo em vez de encarar um 503 cru do navegador.
// Quem tem o código de pulso informa aqui: a liberação fica na aba e abre o
// resto do sistema, sem desligar a manutenção para os outros.
export function Maintenance({
  estado,
  onLiberado,
}: {
  estado: EstadoManutencao;
  onLiberado: () => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [negado, setNegado] = useState(false);
  const [relogio, setRelogio] = useState(TempoRestante(estado.previsaoEm));

  // Um único relógio por tela, parado quando não há data-limite.
  useEffect(() => {
    if (!estado.previsaoEm) return undefined;
    const intervalo = window.setInterval(() => setRelogio(TempoRestante(estado.previsaoEm)), 1000);
    return () => window.clearInterval(intervalo);
  }, [estado.previsaoEm]);

  async function tentar(e: FormEvent) {
    e.preventDefault();
    if (!codigo.trim()) return;
    setEnviando(true);
    setNegado(false);
    try {
      const liberado = await pedirLiberacaoManutencao(codigo.trim());
      if (liberado) onLiberado();
      else setNegado(true);
    } catch {
      setNegado(true);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="app-bg landing landing-manutencao">
      <div className="manutencao-card card-surface">
        <Logo size={72} />
        <h1>{MANUTENCAO_LANDING.titulo}</h1>
        <p className="manutencao-msg">
          {estado.mensagem || MANUTENCAO_LANDING.padrao}
        </p>
        {relogio !== null && (
          <p className="manutencao-relogio" aria-live="polite">
            <span className="manutencao-relogio-rotulo">
              {estado.previsao ? `${estado.previsao} · ` : "Previsão de volta: "}
            </span>
            <strong>{relogio}</strong>
          </p>
        )}
        {!relogio && estado.previsao && <p className="manutencao-previsao">{estado.previsao}</p>}

        <form className="manutencao-bypass" onSubmit={(e) => void tentar(e)}>
          <label className="field-label" htmlFor="nx-pulso">
            {MANUTENCAO_LANDING.pulso}
          </label>
          <div className="manutencao-bypass-linha">
            <input
              id="nx-pulso"
              className="input"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              maxLength={64}
              placeholder="000000000000000000"
            />
            <button type="submit" className="btn btn-ghost btn-sm" disabled={enviando}>
              {MANUTENCAO_LANDING.entrar}
            </button>
          </div>
          <p className="manutencao-ajuda">{MANUTENCAO_LANDING.pulsoAjuda}</p>
          {negado && (
            <p className="manutencao-erro" role="alert">
              {MANUTENCAO_LANDING.negado}
            </p>
          )}
        </form>

        <Link to="/login" className="manutencao-login">
          Tentar entrar mesmo assim
        </Link>
      </div>
    </div>
  );
}

// "2h 14min 08s", ou null quando não há data-limite (o texto livre continua
// aparecendo). Passou do prazo, o relógio para no zero em vez de contar atraso.
function TempoRestante(previsaoEm: string | null): string | null {
  if (!previsaoEm) return null;
  const alvo = new Date(previsaoEm).getTime();
  if (Number.isNaN(alvo)) return null;
  const restante = Math.max(0, alvo - Date.now());
  const segundos = Math.floor(restante / 1000);
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  const dois = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}h ${dois(m)}min ${dois(s)}s` : `${dois(m)}min ${dois(s)}s`;
}
