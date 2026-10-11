import type { ReactNode } from "react";

// ===== Peças de formulário do editor do site público =====
// Uma página com cinco abas e uns quarenta campos pede componentes pequenos:
// repetidos à mão, os rótulos divergem entre si na terceira aba e ninguém nota.

interface CampoProps {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  dica?: string;
  type?: string;
  placeholder?: string;
  maxLength?: number;
  desabilitado?: boolean;
  /** Rótulo do <input> no leitor de tela quando o visual é só a cor. */
  ariaLabel?: string;
}

export function Campo({
  rotulo, valor, aoMudar, dica, type = "text", placeholder, maxLength, desabilitado, ariaLabel,
}: CampoProps) {
  return (
    <div className="field">
      <span className="field-label">{rotulo}</span>
      <input
        className="input"
        type={type}
        value={valor}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={desabilitado}
        aria-label={ariaLabel ?? rotulo}
        onChange={(e) => aoMudar(e.target.value)}
      />
      {dica ? <span className="field-hint">{dica}</span> : null}
    </div>
  );
}

export function CampoArea({
  rotulo, valor, aoMudar, dica, rows = 3, maxLength, desabilitado,
}: Omit<CampoProps, "type" | "placeholder"> & { rows?: number }) {
  return (
    <div className="field">
      <span className="field-label">{rotulo}</span>
      <textarea
        className="input"
        rows={rows}
        value={valor}
        maxLength={maxLength}
        disabled={desabilitado}
        aria-label={rotulo}
        onChange={(e) => aoMudar(e.target.value)}
      />
      {dica ? <span className="field-hint">{dica}</span> : null}
    </div>
  );
}

export function CampoNumero({
  rotulo, valor, aoMudar, dica, min, max, passo = 1, desabilitado,
}: {
  rotulo: string;
  valor: number;
  aoMudar: (valor: number) => void;
  dica?: string;
  min?: number;
  max?: number;
  passo?: number;
  desabilitado?: boolean;
}) {
  return (
    <div className="field">
      <span className="field-label">{rotulo}</span>
      <input
        className="input"
        type="number"
        value={Number.isFinite(valor) ? String(valor) : ""}
        min={min}
        max={max}
        step={passo}
        disabled={desabilitado}
        aria-label={rotulo}
        onChange={(e) => aoMudar(e.target.value === "" ? 0 : Number(e.target.value))}
      />
      {dica ? <span className="field-hint">{dica}</span> : null}
    </div>
  );
}

export function CampoEscolha({
  rotulo, valor, opcoes, aoMudar, dica, desabilitado,
}: {
  rotulo: string;
  valor: string;
  opcoes: { valor: string; rotulo: string }[];
  aoMudar: (valor: string) => void;
  dica?: string;
  desabilitado?: boolean;
}) {
  return (
    <div className="field">
      <span className="field-label">{rotulo}</span>
      <select
        className="input"
        value={valor}
        disabled={desabilitado}
        aria-label={rotulo}
        onChange={(e) => aoMudar(e.target.value)}
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>{o.rotulo}</option>
        ))}
      </select>
      {dica ? <span className="field-hint">{dica}</span> : null}
    </div>
  );
}

export function CampoCor({
  rotulo, valor, aoMudar, desabilitado,
}: { rotulo: string; valor: string; aoMudar: (v: string) => void; desabilitado?: boolean }) {
  return (
    <div className="field cms-campo-cor">
      <span className="field-label">{rotulo}</span>
      <div className="cms-cor-controle">
        {/* O nativo de cor não aceita #rrggbb inválido: o texto é o dono do
            valor, e o quadrado só espelha quando ele é uma cor de verdade. */}
        <input
          type="color"
          className="cms-cor-swatch"
          value={/^#[0-9a-fA-F]{6}$/.test(valor) ? valor : "#000000"}
          disabled={desabilitado}
          aria-label={rotulo + " (seletor de cor)"}
          onChange={(e) => aoMudar(e.target.value)}
        />
        <input
          className="input mono"
          value={valor}
          maxLength={7}
          disabled={desabilitado}
          aria-label={rotulo + " (código hexadecimal)"}
          onChange={(e) => aoMudar(e.target.value)}
        />
      </div>
    </div>
  );
}

export function CampoLigado({
  rotulo, valor, aoMudar, dica, desabilitado,
}: {
  rotulo: string;
  valor: boolean;
  aoMudar: (valor: boolean) => void;
  dica?: string;
  desabilitado?: boolean;
}) {
  return (
    <label className={"cms-ligado" + (valor ? " is-on" : "")}>
      <input
        type="checkbox"
        checked={valor}
        disabled={desabilitado}
        onChange={(e) => aoMudar(e.target.checked)}
      />
      <span className="cms-ligado-rotulo">{rotulo}</span>
      {dica ? <span className="field-hint">{dica}</span> : null}
    </label>
  );
}

/**
 * Botão de gravar de um bloco. O rótulo muda enquanto a chamada dura para a
 * pessoa não clicar duas vezes achando que o primeiro não pegou.
 *
 * O parâmetro `neutra` tira o dourado do botão: num bloco com duas ações, as
 * duas em ouro deixam a pessoa sem saber qual é a principal. Rascunho guarda,
 * publicar mostra — só o segundo merece a cor de ação do sistema.
 */
export function BotaoSalvar({
  aoSalvar, ocupado, rotulo = "Salvar", desabilitado, neutra,
}: {
  aoSalvar: () => void | Promise<void>;
  ocupado: boolean;
  rotulo?: string;
  desabilitado?: boolean;
  neutra?: boolean;
}) {
  return (
    <button
      type="button"
      className={"btn " + (neutra ? "btn-ghost" : "btn-brand") + " btn-sm"}
      disabled={ocupado || desabilitado}
      aria-busy={ocupado || undefined}
      onClick={() => void aoSalvar()}
    >
      {ocupado ? "Salvando…" : rotulo}
    </button>
  );
}

/** Cartão de seção com título, explicação e a ação de gravar daquele bloco. */
export function Bloco({
  titulo, sub, acao, children, className = "",
}: {
  titulo: string;
  sub?: string;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={"card-surface panel cms-bloco " + className}>
      <div className="cms-bloco-head">
        <div>
          <h2 className="panel-title">{titulo}</h2>
          {sub ? <p className="cms-bloco-sub">{sub}</p> : null}
        </div>
        {acao ? <div className="cms-bloco-acao">{acao}</div> : null}
      </div>
      {children}
    </section>
  );
}
