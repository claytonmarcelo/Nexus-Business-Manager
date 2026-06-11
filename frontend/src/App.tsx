import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { Layout } from './components/Layout'
import { WindEffect } from './components/WindEffect'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { Users } from './pages/Users'
import { Clients } from './pages/Clients'
import { Products } from './pages/Products'
import { Stock } from './pages/Stock'
import { Suppliers } from './pages/Suppliers'
import { Purchases } from './pages/Purchases'
import { About } from './pages/About'
import { Sales } from './pages/Sales'
import { Financial } from './pages/Financial'
import { Appointments } from './pages/Appointments'
import { Reports } from './pages/Reports'
import { Notifications } from './pages/Notifications'
import { Audit } from './pages/Audit'
import { Companies } from './pages/Companies'
import { CreateSuggestion } from './pages/Suggestions/Create'
import { AdminSuggestions } from './pages/Suggestions/Admin'
import { NexusAI } from './pages/NexusAI'
import { CRM } from './pages/CRM'
import { SuggestionsList } from './pages/Suggestions/List'
import { Profile } from './pages/Profile'
import { Settings } from './pages/Settings'
import { PublicLayout } from './layouts/PublicLayout'
import { Landing } from './pages/Landing'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { Terms } from './pages/Terms'
import { Privacy } from './pages/Privacy'
import { Contact } from './pages/Contact'
import { Pricing } from './pages/Pricing'
import { Onboarding } from './pages/Onboarding'
import { Import } from './pages/Import'
import { Backup } from './pages/Backup'
import { Logs } from './pages/Logs'
import { Plans } from './pages/Plans'
import { Subscription } from './pages/Subscription'
import { Invoices } from './pages/Invoices'
import { Status } from './pages/Status'
import { Error404 } from './pages/Error404'
import { Error403 } from './pages/Error403'
import { Error500 } from './pages/Error500'
import { PaginaManutencao } from './pages/Maintenance'
import { Preloader } from './components/Preloader'
import { PermissaoGuard } from './components/PermissionGuard'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--nexus-bg)' }}>
        <div style={{ color: 'var(--nexus-muted)' }}>Carregando...</div>
      </div>
    )
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--nexus-bg)' }}>
        <div style={{ color: 'var(--nexus-muted)' }}>Carregando...</div>
      </div>
    )
  }
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/maintenance" element={<PaginaManutencao />} />

      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/pricing" element={<Pricing />} />
      </Route>

      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password/:token" element={<PublicRoute><ResetPassword /></PublicRoute>} />

      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
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
        <Route path="audit" element={<Audit />} />
        <Route path="companies" element={<Companies />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="welcome" element={<Onboarding />} />
        <Route path="import" element={<Import />} />
        <Route path="backup" element={<Backup />} />
        <Route path="logs" element={<Logs />} />
        <Route path="plans" element={<Plans />} />
        <Route path="subscription" element={<Subscription />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="status" element={<Status />} />
        <Route path="403" element={<Error403 />} />
        <Route path="500" element={<Error500 />} />
        <Route path="maintenance" element={<PaginaManutencao />} />
        <Route path="*" element={<Error404 />} />
      </Route>

      <Route path="*" element={<Error404 />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <Preloader />
            <WindEffect />
            <AppRoutes />
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
