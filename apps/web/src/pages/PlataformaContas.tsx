import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { extractErrorMessage } from "../lib/api";
import { Pagination, PAGE_SIZE_PADRAO } from "../components/Pagination";
import { EmptyState, ErrorState, LoadingInline } from "../components/StateView";
import { confirmActionComMotivo } from "../lib/confirm";
import { notify } from "../lib/notify";
import { formatDateTime } from "../lib/format";
import {
  confirmarEmailDaConta,
  listarContasSemConfirmacao,
  type ContaSemConfirmacao,
  type Pagina,
  type ResultadoDaConfirmacao,
} from "../lib/contasPlataformaApi";
import { useAuth } from "../context/AuthContext";

// ===== Contas sem confirmação (/app/plataforma-contas) =====
// T5.5, achado N61: o botão que faltava para o suporte.
//
// A decisão D2 passou a exigir verificação de e-mail em produção. Com ela, uma
// entrega que falha no meio do cadastro (o provedor recusa, a caixa está cheia, o
// SMTP cai) deixa a pessoa sem link, sem confirmação e sem painel — e a única
// saída documentada era escrever `users.email_verified_at` no banco à mão. Esta
// tela é o caminho de dentro para fora: quem administra a instalação confirma o
// endereço depois de conferir a identidade, e a trilha registra quem fez.
//
// Três coisas esta página NÃO faz, de propósito:
//  1. não finge verificação de entrega. Ela afirma "confirmado por quem administra
//     a instalação", e a mesma frase aparece na auditoria;
//  2. não é área do tenant. O endereço confirmado é identidade da conta, não dado
//     da empresa em que o administrador está sentado — um ADMIN de empresa que
//     pudesse confirmar estaria escolhendo quem entra sem provar a caixa postal;
//  3. não pede "tem certeza?" vazio. O motivo escrito é condição para a rota ser
//     chamada, o mesmo contrato do cancelamento de uma ordem de serviço.

function plural(n: number, um: string, varios: string): string {
  return n + " " + (n === 1 ? um : varios);
}

export function PlataformaContas() {
  const { user } = useAuth();
  const podeLer = user?.platform === true;

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_PADRAO);
  const [rows, setRows] = useState<Pagina<ContaSemConfirmacao> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ocupada, setOcupada] = useState<string | null>(null);

  // P14/N51: a fila é lida por paginas e por filtro, entao duas respostas podem
  // chegar fora de ordem. A mais nova vence e a que chegou tarde e descartada,
  // como nas outras listas da casa.
  const ultimaLeitura = useRef(0);

  const load = useCallback(async () => {
    const meuNumero = ultimaLeitura.current + 1;
    ultimaLeitura.current = meuNumero;
    setLoading(true);
    setError(null);
    try {
      const resposta = await listarContasSemConfirmacao({
        page,
        pageSize,
        ...(filtro ? { search: filtro } : {}),
      });
      if (ultimaLeitura.current !== meuNumero) return;
      setRows(resposta);
    } catch (err) {
      if (ultimaLeitura.current !== meuNumero) return;
      setError(extractErrorMessage(err, "Não foi possível ler a fila de contas."));
    } finally {
      if (ultimaLeitura.current === meuNumero) setLoading(false);
    }
  }, [page, pageSize, filtro]);

  useEffect(() => {
    if (!podeLer) {
      // Sem o papel da plataforma a tela não bate na porta: a API responderia 403,
      // e um 403 de fundo viraria erro na tela de quem nunca deveria ter chegado
      // aqui. O cadeado de verdade continua sendo o da API.
      setLoading(false);
      return;
    }
    void load();
  }, [podeLer, load]);

  function tireDaFila(userId: string) {
    setRows((atual) =>
      atual
        ? {
            ...atual,
            data: atual.data.filter((c) => c.userId !== userId),
            meta: { ...atual.meta, total: Math.max(0, atual.meta.total - 1) },
          }
        : atual,
    );
  }

  async function confirmar(conta: ContaSemConfirmacao) {
    setOcupada(conta.userId);
    // O resultado da escrita mora fora do diálogo: `confirmActionComMotivo` so
    // responde sim/nao, e a tela precisa saber se a coluna foi escrita agora ou se
    // a conta ja estava confirmada por outra porta.
    let resultado: ResultadoDaConfirmacao | null = null;
    try {
      const confirmado = await confirmActionComMotivo({
        title: "Confirmar o e-mail da conta",
        text: "Deseja confirmar o endereço de {nome}?",
        nome: conta.name,
        detalhe:
          "A conta passa a poder entrar sem o link da mensagem, e o link que ainda estiver vivo deixa de valer. " +
          "A confirmação fica na trilha da plataforma com o seu nome, o horário e o motivo.",
        confirmLabel: "Confirmar",
        danger: false,
        rotuloMotivo: "Motivo da confirmação",
        ajudaMotivo: "O motivo fica registrado na auditoria da plataforma.",
        placeholder: "Ex.: cliente sem acesso ao e-mail; identidade conferida por telefone no chamado 118.",
        maxLength: 200,
        action: async (motivo) => {
          resultado = await confirmarEmailDaConta(conta.userId, motivo);
        },
      });
      if (!confirmado || !resultado) return;

      const ja = resultado as ResultadoDaConfirmacao;
      // Nos dois casos a linha sai da fila: confirmada agora ou confirmada enquanto
      // a pessoa escrevia, o estado do banco é o mesmo — ela não espera mais.
      tireDaFila(conta.userId);
      if (ja.alterado) {
        notify.success(
          "Você confirmou o e-mail de " + conta.name + ". A conta pode entrar.",
          "Confirmação registrada",
        );
      } else {
        notify.info(
          "A conta de " + conta.name + " já estava confirmada — nada foi escrito e nada foi auditado.",
          "Nada para confirmar",
        );
      }
    } catch (err) {
      notify.error(extractErrorMessage(err, "A confirmação não pôde ser registrada."));
    } finally {
      setOcupada(null);
    }
  }

  function buscar(e: FormEvent) {
    e.preventDefault();
    setFiltro(busca.trim());
    setPage(1);
  }

  if (!podeLer) {
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <h1 className="page-title">Contas sem confirmação</h1>
            <p className="page-sub">Endereços que nunca receberam a confirmação.</p>
          </div>
        </div>
        <EmptyState
          title="Área reservada da plataforma"
          description="Confirmar um endereço é afirmar identidade da conta, e a conta não pertence a uma empresa só. Por isso esta fila é lida e escrita apenas pelo administrador da plataforma. As pessoas da sua empresa continuam na aba Usuários."
        />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Contas sem confirmação</h1>
          <p className="page-sub">Quem criou a conta e nunca confirmou o endereço</p>
        </div>
      </div>

      <div className="card-surface panel">
        <h2 className="nx-panel-title">O que esta fila é, e o que ela não é</h2>
        <p className="nx-panel-sub">
          Uma conta entra aqui enquanto o campo de confirmação estiver vazio. Confirmar por aqui
          <strong> não</strong> prova que a pessoa leu a mensagem: prova que quem administra a
          instalação conferiu a identidade e decidiu deixar a conta entrar. A mensagem de confirmação
          pode ser reenviada pela tela de entrada, e é isso que a maioria dos casos precisa. Cada
          confirmação feita aqui nasce na trilha da plataforma, com quem confirmou, quando, e o motivo
          escrito antes do clique.
        </p>
      </div>

      <form className="toolbar" onSubmit={buscar}>
        <input
          className="input"
          type="search"
          placeholder="Buscar por nome ou endereço"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar conta"
        />
        <button type="submit" className="btn btn-ghost btn-sm">
          Buscar
        </button>
        {filtro ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setBusca("");
              setFiltro("");
              setPage(1);
            }}
          >
            Limpar filtros
          </button>
        ) : null}
        <span className="toolbar-note">
          {loading ? "Atualizando a fila…" : rows ? plural(rows.meta.total, "conta", "contas") : "—"}
        </span>
      </form>

      {loading ? (
        <LoadingInline label="Carregando a fila de contas…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !rows || rows.data.length === 0 ? (
        <EmptyState
          title="Nenhuma conta esperando confirmação"
          description={
            filtro
              ? "Nenhum nome ou endereço neste recorte está com a confirmação pendente."
              : "Toda conta criada tem o endereço confirmado. Quando a entrega de uma mensagem falhar, a pessoa aparece aqui."
          }
        />
      ) : (
        <div className="card-surface table-wrap nx-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col" className="col-acao">Conta</th>
                <th scope="col">Empresas</th>
                <th scope="col">Situação</th>
                <th scope="col" className="col-quando">Desde</th>
                <th scope="col" className="col-acoes">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.data.map((c) => (
                <tr key={c.userId}>
                  <td className="col-acao">
                    <span className="company-name">{c.name}</span>
                    <span className="company-meta">{c.email}</span>
                  </td>
                  <td>{plural(c.empresas, "empresa", "empresas")}</td>
                  <td>
                    <span className={"status-pill " + (c.active ? "is-on" : "is-off")}>
                      {c.active ? "ativa" : "desativada"}
                    </span>
                  </td>
                  <td className="mono col-quando">{formatDateTime(c.criadoEm)}</td>
                  <td className="col-acao">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      aria-label={"Confirmar e-mail de " + c.name}
                      onClick={() => void confirmar(c)}
                      disabled={ocupada !== null}
                    >
                      {ocupada === c.userId ? "Confirmando…" : "Confirmar e-mail"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={rows.meta.page}
            pageSize={rows.meta.pageSize}
            total={rows.meta.total}
            totalPages={rows.meta.totalPages}
            onChange={setPage}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
            itemLabel="contas"
            itemLabelSingular="conta"
          />
        </div>
      )}
    </div>
  );
}
