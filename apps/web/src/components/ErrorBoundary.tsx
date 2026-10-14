import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorPage } from "./ErrorPage";
import { registraErroDeRenderizacao } from "../lib/registro-erros";

// F5, item 3: o teto que impede a tela branca.
//
// Uma exceção que escapa da renderização derruba a árvore inteira: o navegador
// fica com o fundo vazio e a pessoa não tem nem para onde clicar. Este componente
// troca esse desastre pelo caminho de casa — a página de erro personalizada, sem
// pilha de chamada na tela, com o botão de tentar de novo.
//
// Ele é montado em dois andares. Na raiz, acima das rotas, pega o que quebrar na
// vitrine, no login ou em qualquer página avulsa. Dentro do painel, ele veste só o
// conteúdo da rota: assim a barra lateral e o cabeçalho continuam de pé, e sair
// para outra rota já conserta a tela (o `chave` muda e o limite se rearma).

interface Props {
  children: ReactNode;
  /** Onde o erro aconteceu: "aplicacao", "painel", ou o nome da página. */
  escopo: string;
  /** Trocar a chave rearma o limite: é como a pessoa sai de uma rota quebrada. */
  chave?: string;
  /** Dentro do painel a página de erro mora no conteúdo, e não no vazio do navegador. */
  embutida?: boolean;
}

interface Estado {
  erro: Error | null;
}

export class ErrorBoundary extends Component<Props, Estado> {
  state: Estado = { erro: null };

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo): void {
    registraErroDeRenderizacao(erro, info, this.props.escopo);
  }

  componentDidUpdate(anteriores: Props): void {
    if (this.state.erro && anteriores.chave !== this.props.chave) {
      this.setState({ erro: null });
    }
  }

  private tentarDeNovo = (): void => {
    this.setState({ erro: null });
  };

  render(): ReactNode {
    if (!this.state.erro) return this.props.children;
    return (
      <ErrorPage
        code={500}
        title="Algo quebrou nesta tela"
        message="Esta página não conseguiu ser montada, e o problema ficou anotado neste navegador. Tente de novo; se continuar, volte para o início e siga por outro caminho."
        embutida={this.props.embutida}
        acao={
          <button type="button" className="btn btn-brand" onClick={this.tentarDeNovo}>
            Tentar de novo
          </button>
        }
      />
    );
  }
}
