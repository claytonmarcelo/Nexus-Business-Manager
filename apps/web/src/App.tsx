import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminShell } from "./components/layout/AdminShell";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Dashboard } from "./pages/Dashboard";
import { Users } from "./pages/Users";
import { Clients } from "./pages/Clients";
import { Products } from "./pages/Products";
import { Sales } from "./pages/Sales";
import { Purchases } from "./pages/Purchases";
import { Finance } from "./pages/Finance";
import { CRM } from "./pages/CRM";
import { Agenda } from "./pages/Agenda";
import { Audit } from "./pages/Audit";
import { Settings } from "./pages/Settings";
import { Cms } from "./pages/Cms";
import { Notifications } from "./pages/Notifications";
import { Rotinas } from "./pages/Rotinas";
import { Legal } from "./pages/Legal";
import { Forbidden, NotFound, Unauthorized } from "./pages/errors";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Register />} />
        <Route path="/recuperar-senha" element={<ForgotPassword />} />
        <Route path="/legal/:slug" element={<Legal />} />
        <Route path="/403" element={<Forbidden />} />
        <Route path="/401" element={<Unauthorized />} />
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
          <Route path="compras" element={<Purchases />} />
          <Route path="financeiro" element={<Finance />} />
          <Route path="crm" element={<CRM />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="usuarios" element={<Users />} />
          <Route path="auditoria" element={<Audit />} />
          <Route path="configuracoes" element={<Settings />} />
          <Route path="cms" element={<Cms />} />
          <Route path="notificacoes" element={<Notifications />} />
          <Route path="rotinas" element={<Rotinas />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
