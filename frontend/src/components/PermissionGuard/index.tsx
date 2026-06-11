import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface PermissaoGuardProps {
  children: React.ReactNode
  cargos: string[]
  fallback?: React.ReactNode
}

const hierarquia: Record<string, number> = {
  admin: 4,
  manager: 3,
  operator: 2,
  viewer: 1,
}

export function PermissaoGuard({ children, cargos, fallback }: PermissaoGuardProps) {
  const { user } = useAuth()

  if (!user) return null

  const nivelUsuario = hierarquia[user.role] || 0
  const nivelMinimo = Math.max(...cargos.map((r) => hierarquia[r] || 0))

  if (nivelUsuario >= nivelMinimo) return <>{children}</>

  if (fallback) return <>{fallback}</>

  return <Navigate to="/" replace />
}

export function verificarPermissao(userRole: string, cargoMinimo: string): boolean {
  const nivel = hierarquia[userRole] || 0
  const nivelReq = hierarquia[cargoMinimo] || 0
  return nivel >= nivelReq
}

export function cargoLabel(cargo: string): string {
  const labels: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    operator: 'Operador',
    viewer: 'Visualizador',
  }
  return labels[cargo] || cargo
}
