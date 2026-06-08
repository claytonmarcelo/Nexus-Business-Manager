import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { Layout } from './components/Layout';
import { WindEffect } from './components/WindEffect';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Users } from './pages/Users';
import { Clients } from './pages/Clients';
import { Products } from './pages/Products';
import { Stock } from './pages/Stock';
import { Suppliers } from './pages/Suppliers';
import { Purchases } from './pages/Purchases';
import { About } from './pages/About';
import { Sales } from './pages/Sales';
import { Financial } from './pages/Financial';
import { Appointments } from './pages/Appointments';
import { Reports } from './pages/Reports';
import { Notifications } from './pages/Notifications';
import { Audit } from './pages/Audit';
import { Companies } from './pages/Companies';
import { CreateSuggestion } from './pages/Suggestions/Create';
import { AdminSuggestions } from './pages/Suggestions/Admin';
import { NexusAI } from './pages/NexusAI';
import { CRM } from './pages/CRM';
import { SuggestionsList } from './pages/Suggestions/List';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-nexus-muted">Carregando...</div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-nexus-muted">Carregando...</div>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="clients" element={<Clients />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="products" element={<Products />} />
        <Route path="stock" element={<Stock />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="sales" element={<Sales />} />
        <Route path="financial" element={<Financial />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="reports" element={<Reports />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="suggestions" element={<SuggestionsList />} />
        <Route path="suggestions/new" element={<CreateSuggestion />} />
        <Route path="suggestions/admin" element={<AdminSuggestions />} />
        <Route path="nexus-ai" element={<NexusAI />} />
        <Route path="crm" element={<CRM />} />
        <Route path="audit"        element={<Audit />} />
        <Route path="companies" element={<Companies />} />
        <Route path="about" element={<About />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <WindEffect />
            <AppRoutes />
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
