import type { ReactNode } from "react";

// ===== Peças de formulário compartilhadas por todo o painel =====
// Nasceram no editor do site público, onde uma página de cinco abas e uns
// quarenta campos pediu componentes pequenos: repetidos à mão, os rótulos
// divergem entre si na terceira aba e ninguém nota. Configurações usa as mesmas
// peças, então a anatomia — bloco com título, dica abaixo do campo e erro do
// servidor no próprio campo — é idêntica nas duas telas.

interface CampoProps {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  dica?: string;
  /** Texto do 400 da API para este campo; é ele, e não o nosso palpite, que manda. */
  erro?: string;
  type?: string;
  placeholder?: string;
  maxLength?: number;
  desabilitado?: boolean;
  /** Campo que se mostra mas não se edita (o e-mail de acesso, por exemplo). */
  somenteLeitura?: boolean;
  /** Rótulo do <input> no leitor de tela quando o visual é só a cor. */
  ariaLabel?: string;
}

export function Campo({
  rotulo, valor, aoMudar, dica, erro, type = "text", placeholder, maxLength,
  desabilitado, somenteLeitura, ariaLabel,
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
        readOnly={somenteLeitura}
        aria-label={ariaLabel ?? rotulo}
        aria-invalid={erro ? true : undefined}
        onChange={(e) => aoMudar(e.target.value)}
      />
      {erro ? <span className="field-error" role="alert">{erro}</span> : null}
      {dica ? <span className="field-hint">{dica}</span> : null}
    </div>
  );
}

export function CampoArea({
  rotulo, valor, aoMudar, dica, erro, rows = 3, maxLength, desabilitado,
}: Omit<CampoProps, "type" | "placeholder" | "somenteLeitura"> & { rows?: number }) {
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
        aria-invalid={erro ? true : undefined}
        onChange={(e) => aoMudar(e.target.value)}
      />
      {erro ? <span className="field-error" role="alert">{erro}</span> : null}
      {dica ? <span className="field-hint">{dica}</span> : null}
    </div>
  );
}

/**
 * Número que pode estar vazio. "Vazio" e "zero" são coisas diferentes na tela:
 * meta de receita sem valor é "não tenho meta", e 0 é uma meta impossível.
 */
export function CampoNumeroOpcional({
  rotulo, valor, aoMudar, dica, erro, min, max, passo = 1, desabilitado,
}: {
  rotulo: string;
  valor: number | null;
  aoMudar: (valor: number | null) => void;
  dica?: string;
  erro?: string;
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
        /* null é o campo vazio; escrever ali e apagar tudo volta a ser null. */
        value={valor === null || !Number.isFinite(valor) ? "" : String(valor)}
        min={min}
        max={max}
        step={passo}
        disabled={desabilitado}
        aria-label={rotulo}
        aria-invalid={erro ? true : undefined}
        onChange={(e) => aoMudar(e.target.value === "" ? null : Number(e.target.value))}
      />
      {erro ? <span className="field-error" role="alert">{erro}</span> : null}
      {dica ? <span className="field-hint">{dica}</span> : null}
    </div>
  );
}

/** Número que nunca fica vazio (ordem, peso, quantidade). */
export function CampoNumero({
  aoMudar, valor, ...props
}: Omit<Parameters<typeof CampoNumeroOpcional>[0], "valor" | "aoMudar"> & {
  valor: number;
  aoMudar: (valor: number) => void;
}) {
  return (
    <CampoNumeroOpcional
      {...props}
      valor={valor}
      aoMudar={(novo) => aoMudar(novo ?? 0)}
    />
  );
}

export function CampoEscolha({
  rotulo, valor, opcoes, aoMudar, dica, erro, desabilitado,
}: {
  rotulo: string;
  valor: string;
  opcoes: { valor: string; rotulo: string }[];
  aoMudar: (valor: string) => void;
  dica?: string;
  erro?: string;
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
        aria-invalid={erro ? true : undefined}
        onChange={(e) => aoMudar(e.target.value)}
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>{o.rotulo}</option>
        ))}
      </select>
      {erro ? <span className="field-error" role="alert">{erro}</span> : null}
      {dica ? <span className="field-hint">{dica}</span> : null}
    </div>
  );
}

export function CampoCor({
  rotulo, valor, aoMudar, erro, desabilitado,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  erro?: string;
  desabilitado?: boolean;
}) {
  return (
    <div className="field nx-campo-cor">
      <span className="field-label">{rotulo}</span>
      <div className="nx-cor-controle">
        {/* O nativo de cor não aceita #rrggbb inválido: o texto é o dono do
            valor, e o quadrado só espelha quando ele é uma cor de verdade. */}
        <input
          type="color"
          className="nx-cor-swatch"
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
          aria-invalid={erro ? true : undefined}
          onChange={(e) => aoMudar(e.target.value)}
        />
      </div>
      {erro ? <span className="field-error" role="alert">{erro}</span> : null}
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
    <label className={"nx-ligado" + (valor ? " is-on" : "")}>
      <input
        type="checkbox"
        checked={valor}
        disabled={desabilitado}
        onChange={(e) => aoMudar(e.target.checked)}
      />
      <span className="nx-ligado-rotulo">{rotulo}</span>
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
    <section className={"card-surface panel nx-bloco " + className}>
      <div className="nx-bloco-head">
        <div>
          <h2 className="panel-title">{titulo}</h2>
          {sub ? <p className="nx-bloco-sub">{sub}</p> : null}
        </div>
        {acao ? <div className="nx-bloco-acao">{acao}</div> : null}
      </div>
      {children}
    </section>
  );
}
