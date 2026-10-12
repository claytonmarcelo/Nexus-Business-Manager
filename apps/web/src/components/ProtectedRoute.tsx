import { Navigate, useLocation } from "react-router-dom";
import { useRef, type ReactNode } from "react";
import { useAuth, type FimDeSessao } from "../context/AuthContext";
import { PageLoader } from "./PageLoader";

// Protege rotas administrativas. A autorização real é no backend; aqui é UX (seção 34).
// É também daqui que sai o destino de quem perde a sessão, porque só esta rota
// sabe, no instante da decisão, se a pessoa tinha uma sessão para perder.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status, consumirFimDeSessao } = useAuth();
  const location = useLocation();

  // O motivo é lido uma única vez por mudança de estado (ler esvazia o registro).
  // Fica em ref porque o StrictMode chama o render duas seguidas: sem o cache, a
  // segunda passada não encontraria mais nada e a pessoa cairia no login depois
  // de sair do sistema.
  const estado = useRef(status);
  const motivo = useRef<FimDeSessao | null>(null);
  if (estado.current !== status) {
    estado.current = status;
    motivo.current = status === "anonymous" ? consumirFimDeSessao() : null;
  }

  if (status === "loading") return <PageLoader label="Restaurando sessão…" />;
  if (status === "anonymous") {
    // Regra do projeto: quem tinha sessão e a perdeu — pelo botão de sair, por
    // expiração, por revogação ou por logout em outra aba — volta para a página
    // de boas-vindas, e replace() é o que não deixa o "voltar" do navegador
    // reabrir o painel com sessão morta. Quem chegou sem sessão nenhuma segue
    // para o login, levando a rota de origem para voltar depois.
    if (motivo.current) {
      return <Navigate to="/" replace state={{ fimDeSessao: motivo.current }} />;
    }
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
