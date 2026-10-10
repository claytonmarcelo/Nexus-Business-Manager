import { useTheme } from "../context/ThemeContext";

// Controle global de tema: switch moderno (trilho em pílula + thumb deslizante),
// acessível por teclado com role="switch" e rótulo em pt-BR.
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggle}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      title={isDark ? "Tema claro" : "Tema escuro"}
      className="theme-switch"
      data-mode={theme}
    >
      <span className="theme-switch-icon" aria-hidden="true">☀</span>
      <span className="theme-switch-icon" aria-hidden="true">☾</span>
      <span className="theme-switch-thumb" aria-hidden="true" />
    </button>
  );
}
