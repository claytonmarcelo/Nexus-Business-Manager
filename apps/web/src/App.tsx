import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PageLoader } from "./components/PageLoader";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminShell } from "./components/layout/AdminShell";
import { Forbidden, NotFound, ServerError, Unauthorized } from "./pages/errors";

// D8 (F5, item 6): cada página virou um pedaço que o navegador só busca quando a
// pessoa pede, em vez de um pacote único que todo mundo baixa antes de ver a
// primeira letra. Foi medido: com tudo junto o fecho principal pesava 964,31 kB
// (283,61 kB comprimidos) e era a única peça de JavaScript da casa; quem abria o
// login baixava o FullCalendar da Agenda e o editor do CMS pelo caminho.
//
// As quatro páginas de erro ficaram de fora de propósito. Elas são o que o limite
// de erro veste quando o resto falha, e precisar buscar um pedaço avulso para
// mostrar a página de falha é a volta da tela branca por outra porta.
const Landing = lazy(() => import("./pages/Landing").then((m) => ({ default: m.Landing })));
const Login = lazy(() => import("./pages/Login").then((m) => ({ default: m.Login })));
const Register = lazy(() => import("./pages/Register").then((m) => ({ default: m.Register })));
const ForgotPassword = lazy(() =>
  import("./pages/ForgotPassword").then((m) => ({ default: m.ForgotPassword })),
);
const VerificarEmail = lazy(() =>
  import("./pages/VerificarEmail").then((m) => ({ default: m.VerificarEmail })),
);
const Legal = lazy(() => import("./pages/Legal").then((m) => ({ default: m.Legal })));

const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Users = lazy(() => import("./pages/Users").then((m) => ({ default: m.Users })));
const Clients = lazy(() => import("./pages/Clients").then((m) => ({ default: m.Clients })));
const Products = lazy(() => import("./pages/Products").then((m) => ({ default: m.Products })));
const Sales = lazy(() => import("./pages/Sales").then((m) => ({ default: m.Sales })));
const OrdensDeServico = lazy(() =>
  import("./pages/OrdensDeServico").then((m) => ({ default: m.OrdensDeServico })),
);
const Cobrancas = lazy(() => import("./pages/Cobrancas").then((m) => ({ default: m.Cobrancas })));
const Purchases = lazy(() => import("./pages/Purchases").then((m) => ({ default: m.Purchases })));
const Finance = lazy(() => import("./pages/Finance").then((m) => ({ default: m.Finance })));
const CRM = lazy(() => import("./pages/CRM").then((m) => ({ default: m.CRM })));
const Agenda = lazy(() => import("./pages/Agenda").then((m) => ({ default: m.Agenda })));
const Audit = lazy(() => import("./pages/Audit").then((m) => ({ default: m.Audit })));
const Settings = lazy(() => import("./pages/Settings").then((m) => ({ default: m.Settings })));
const Cms = lazy(() => import("./pages/Cms").then((m) => ({ default: m.Cms })));
const Notifications = lazy(() =>
  import("./pages/Notifications").then((m) => ({ default: m.Notifications })),
);
const Rotinas = lazy(() => import("./pages/Rotinas").then((m) => ({ default: m.Rotinas })));
const PlataformaAuditoria = lazy(() =>
  import("./pages/PlataformaAuditoria").then((m) => ({ default: m.PlataformaAuditoria })),
);

// F5, item 3, primeiro andar do teto: nada da aplicação renderiza fora de um
// limite de erro. Uma exceção de montagem na vitrine, no cadastro ou em qualquer
// página avulsa encontra a página de erro da casa em vez do fundo branco, e a
// troca de endereço rearma o limite — é assim que a pessoa sai do prejuízo.
// O segundo andar mora dentro do AdminShell, onde ele veste só o conteúdo da
// rota e deixa de pé a barra lateral e o cabeçalho do painel.
//
// D8: o limite de erro fica por fora do Suspense de propósito. Um pedaço que não
// chega (publicação no meio do caminho, conexão caída) faz o React jogar a falha
// para cima, e é ele que transforma isso na página de erro da casa — não no vazio.
function ArvoreComLimite() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary escopo="aplicacao" chave={pathname}>
      <Suspense fallback={<PageLoader label="Abrindo a página…" />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/recuperar-senha" element={<ForgotPassword />} />
          {/* D2: a rota do link de confirmação. O caminho é o mesmo que a API escreve
              na mensagem (WEB_BASE_URL + /verificar-e-mail?token=...), e ela é pública
              porque quem clica ainda não tem sessão nenhuma. */}
          <Route path="/verificar-e-mail" element={<VerificarEmail />} />
          <Route path="/legal/:slug" element={<Legal />} />
          <Route path="/403" element={<Forbidden />} />
          <Route path="/401" element={<Unauthorized />} />
          {/* A página de 500 tem endereço próprio: é ela que o limite de erro veste, e
              é para ela que a prova de fumaça (F5, item 4) olha quando quer conferir a
              página de erro do servidor sem quebrar uma tela de verdade. */}
          <Route path="/500" element={<ServerError />} />
          {/* D8: dentro do painel o pedaço que falta é vestido pelo Suspense do
              AdminShell, que deixa barra lateral e cabeçalho no lugar. Aqui em cima
              só caem as páginas avulsas, que ocupam a janela inteira. */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AdminShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="clientes" element={<Clients />} />
            <Route path="produtos" element={<Products />} />
            <Route path="vendas" element={<Sales />} />
            <Route path="ordens-de-servico" element={<OrdensDeServico />} />
            <Route path="compras" element={<Purchases />} />
            <Route path="financeiro" element={<Finance />} />
            <Route path="cobrancas" element={<Cobrancas />} />
            <Route path="crm" element={<CRM />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="usuarios" element={<Users />} />
            <Route path="auditoria" element={<Audit />} />
            <Route path="configuracoes" element={<Settings />} />
            <Route path="cms" element={<Cms />} />
            <Route path="notificacoes" element={<Notifications />} />
            <Route path="rotinas" element={<Rotinas />} />
            <Route path="auditoria-plataforma" element={<PlataformaAuditoria />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ArvoreComLimite />
    </BrowserRouter>
  );
}
