import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ThemeProvider, aplicaTemaSalvo } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";

// Ordem de estilos: AdminLTE (base de componentes) → tokens → Tailwind (utilitários) → global → componentes.
// landing.css refina regras da página pública já postas em components.css, cms.css veste só o editor
// (/app/cms) e notificacoes.css só o sino e a tela de avisos: nada ali alcança a vitrine.
import "admin-lte/dist/css/adminlte.min.css";
import "toastr/build/toastr.min.css";
import "./styles/tokens.css";
import "./styles/tailwind.css";
import "./styles/global.css";
import "./styles/components.css";
import "./styles/landing.css";
import "./styles/cms.css";
import "./styles/notificacoes.css";

// O tema escolhido volta antes do primeiro paint, e não por script inline no
// index.html: o CSP de produção é o padrão do helmet, que só aceita script de
// mesma origem.
aplicaTemaSalvo();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
