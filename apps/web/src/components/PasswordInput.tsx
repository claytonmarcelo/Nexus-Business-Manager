import { useState } from "react";

interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  inputClassName?: string;
}

// Campo de senha com botão "olho" para o usuário conferir o que digitou.
// O tipo do input alterna entre password/text sem perder o foco nem o valor.
export function PasswordInput({ label, value, onChange, autoComplete = "current-password", required, inputClassName = "input" }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="password-wrap">
        <input
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
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
    </div>
  );
}
