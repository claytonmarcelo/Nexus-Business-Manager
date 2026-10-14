import { useId, useState, type MutableRefObject } from "react";

interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  inputClassName?: string;
  /** Texto do servidor para esta senha; fica logo abaixo do campo. */
  erro?: string;
  /**
   * F5 (Problema C + item 7): o rotulo tem de apontar para o campo, e a tela que
   * se preocupa com gerenciador de senhas escolhe um `name`/`id` neutro. Quem nao
   * passa nada recebe um id gerado — o rotulo continua associado do mesmo jeito.
   */
  id?: string;
  name?: string;
  /** A tela de login usa esta referencia para zerar o campo ao desmontar. */
  inputRef?: MutableRefObject<HTMLInputElement | null>;
}

// Campo de senha com botão "olho" para o usuário conferir o que digitou.
// O tipo do input alterna entre password/text sem perder o foco nem o valor.
export function PasswordInput({ label, value, onChange, autoComplete = "current-password", required, inputClassName = "input", erro, id, name, inputRef }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const gerado = useId();
  const idDoCampo = id ?? "senha-" + gerado;
  return (
    <div className="field">
      <label className="field-label" htmlFor={idDoCampo}>{label}</label>
      <div className="password-wrap">
        <input
          ref={inputRef}
          id={idDoCampo}
          name={name}
          type={visible ? "text" : "password"}
          className={inputClassName}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
        <button
          type="button"
          className="eye-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
          title={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17.94 17.94A10.6 10.6 0 0 1 12 19.5C6.5 19.5 2.7 15.4 1.5 12a19.3 19.3 0 0 1 4.4-6.19" />
              <path d="M9.9 4.24A10.9 10.9 0 0 1 12 4.5c5.5 0 9.3 4.1 10.5 7.5a19.3 19.3 0 0 1-3.22 5.06" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
              <line x1="2" y1="2" x2="22" y2="22" />
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {erro ? <span className="field-error" role="alert">{erro}</span> : null}
    </div>
  );
}
