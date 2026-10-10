import { ErrorPage } from "../components/ErrorPage";

export function NotFound() {
  return <ErrorPage code={404} title="Página não encontrada" message="O endereço acessado não existe ou foi movido." />;
}
export function Forbidden() {
  return <ErrorPage code={403} title="Acesso negado" message="Você não tem permissão para acessar esta área." />;
}
export function Unauthorized() {
  return <ErrorPage code={401} title="Não autenticado" message="Faça login para continuar." />;
}
export function ServerError() {
  return <ErrorPage code={500} title="Erro interno" message="Algo deu errado do nosso lado. Tente novamente em instantes." />;
}
