import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";

// Ordem de estilos: AdminLTE (base de componentes) → tokens → Tailwind (utilitários) → global → componentes.
import "admin-lte/dist/css/adminlte.min.css";
import "toastr/build/toastr.min.css";
import "./styles/tokens.css";
import "./styles/tailwind.css";
import "./styles/global.css";
import "./styles/components.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
