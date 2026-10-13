import { useCallback, useEffect, useState } from "react";
import { api, extractErrorMessage } from "../lib/api";
import { Pagination, PAGE_SIZE_PADRAO } from "../components/Pagination";
import { EmptyState, ErrorState, LoadingInline } from "../components/StateView";
import { baixarCsv } from "../lib/csv";
import { notify } from "../lib/notify";
import { formatDateTime } from "../lib/format";
import { descricaoDaAcao } from "../lib/auditLabels";
import { useAuth } from "../context/AuthContext";

// ===== Auditoria da plataforma (/app/auditoria-plataforma) =====
// F2 do PROMPT MESTRE, junto da decisão G8 (opção D) e do achado N14.
//
// O administrador da plataforma é OWNER de todas as empresas. Enquanto isso é
// decisão do dono e não break-glass, a prova técnica de conformidade é a trilha:
// tudo que ele faz pela plataforma — vitrine, textos legais, rotinas que varrem o
// sistema inteiro — nasce com escopo de plataforma, sem empresa dona, e aparece
// aqui. Nenhuma dessas ações aparece na aba de Auditoria de um tenant, porque não
// são coisas daquele tenant.
//
// A rota lê `audit_logs` filtrando pela coluna de escopo, então esta tela atravessa
// tenants sem que nenhum dado de negócio apareça: o que se mostra é ação, quem
// executou, quando, de onde, e a empresa em que o administrador estava sentado
// quando agiu pela plataforma (origem da sessão, nunca dona do registro).

interface LinhaDaPlataforma {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
  origemSessao: string | null;
}
interface Paged<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

// As origens que este módulo escreve. A lista é declarada de propósito: se um
// módulo novo carimbar evento de plataforma com outra origem, a leitura continua
// funcionando (o filtro é texto livre), mas o seletor é o inventário do que a
// plataforma faz hoje.
const ENTIDADES: { value: string; label: string }[] = [
  { value: "", label: "Todas as origens" },
  { value: "landing_config", label: "Configuração da vitrine" },
  { value: "landing_item", label: "Item da vitrine" },
  { value: "legal_document", label: "Documento legal" },
  { value: "cron_job", label: "Rotina agendada" },
];

function rotuloEntidade(entity: string): string {
  const achado = ENTIDADES.find((e) => e.value === entity);
  return achado ? achado.label : entity;
}

function plural(n: number, um: string, varios: string): string {
  return n + " " + (n === 1 ? um : varios);
}

export function PlataformaAuditoria() {
  const { user } = useAuth();
  const podeLer = user?.platform === true;
  const [busca, setBusca] = useState("");
  const [entidade, setEntidade] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_PADRAO);
  const [rows, setRows] = useState<Paged<LinhaDaPlataforma> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);

  const temFiltro = Boolean(busca.trim() || entidade || de || ate);

  const filtros = useCallback(() => {
    const base: Record<string, string> = {};
    if (busca.trim()) base.search = busca.trim();
    if (entidade) base.entity = entidade;
    if (de) base.de = de;
    if (ate) base.ate = ate;
    return base;
  }, [busca, entidade, de, ate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Paged<LinhaDaPlataforma>>("/audit/plataforma", {
        params: { page, pageSize, ...filtros() },
      });
      setRows(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filtros]);

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

  async function exportar() {
    setExportando(true);
    try {
      const linhas: LinhaDaPlataforma[] = [];
      for (let p = 1; p <= 50; p++) {
        const { data } = await api.get<Paged<LinhaDaPlataforma>>("/audit/plataforma", {
          params: { page: p, pageSize: 100, ...filtros() },
        });
        linhas.push(...data.data);
        if (p >= data.meta.totalPages) break;
      }
      const quantidade = baixarCsv(
        "auditoria-da-plataforma-" + new Date().toISOString().slice(0, 10),
        ["Quando", "Acao", "Entidade", "Registro", "Usuario", "Empresa de origem", "Origem do pedido"],
        linhas.map((r) => [
          formatDateTime(r.createdAt),
          r.action,
          rotuloEntidade(r.entity),
          r.entityId ?? "",
          r.userName ?? "Sistema",
          r.origemSessao ?? "sem empresa na sessão",
          r.ip ?? "",
        ]),
      );
      notify.success(quantidade + (quantidade === 1 ? " evento exportado em CSV." : " eventos exportados em CSV."));
    } catch (err) {
      notify.error(extractErrorMessage(err));
    } finally {
      setExportando(false);
    }
  }

  function limpar() {
    setBusca("");
    setEntidade("");
    setDe("");
    setAte("");
    setPage(1);
  }

  if (!podeLer) {
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <h1 className="page-title">Auditoria da plataforma</h1>
            <p className="page-sub">Ações que alcançam todas as empresas.</p>
          </div>
        </div>
        <EmptyState
          title="Área reservada da plataforma"
          description="Vitrine, textos legais e rotinas agendadas respondem pelo Nexus inteiro, por isso a trilha dessas ações é lida só pelo administrador da plataforma. A auditoria da sua empresa continua na aba Auditoria."
        />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Auditoria da plataforma</h1>
          <p className="page-sub">Cada ação que alcança todas as empresas — vitrine, textos legais e rotinas</p>
        </div>
      </div>

      <div className="card-surface panel">
        <h2 className="nx-panel-title">O que esta trilha guarda</h2>
        <p className="nx-panel-sub">
          Nada aqui pertence a uma empresa: publicar um texto da vitrine ou ligar uma rotina mexe com o Nexus
          inteiro. A empresa em que o administrador estava sentado aparece como <strong>origem da sessão</strong>,
          para dar contexto a quem lê, e não como dona do registro. Por isso essas ações não aparecem na aba
          Auditoria de nenhum tenant, e nenhuma ação de tenant aparece aqui.
        </p>
      </div>

      <div className="toolbar">
        <input
          className="input"
          type="search"
          placeholder="Buscar por ação, origem, usuário ou IP"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setPage(1);
          }}
          aria-label="Buscar na auditoria da plataforma"
        />
        <select
          className="select"
          style={{ maxWidth: 210 }}
          value={entidade}
          onChange={(e) => {
            setEntidade(e.target.value);
            setPage(1);
          }}
          aria-label="Filtrar por origem"
        >
          {ENTIDADES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          className="input"
          type="date"
          style={{ maxWidth: 158 }}
          value={de}
          onChange={(e) => {
            setDe(e.target.value);
            setPage(1);
          }}
          aria-label="Do dia"
        />
        <input
          className="input"
          type="date"
          style={{ maxWidth: 158 }}
          value={ate}
          onChange={(e) => {
            setAte(e.target.value);
            setPage(1);
          }}
          aria-label="Até o dia"
        />
        {temFiltro ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={limpar}>
            Limpar filtros
          </button>
        ) : null}
        <span className="toolbar-note">
          {loading ? "Atualizando trilha…" : rows ? plural(rows.meta.total, "evento", "eventos") : "—"}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => void exportar()}
          disabled={exportando || !rows || rows.meta.total === 0}
        >
          {exportando ? "Gerando arquivo…" : "Baixar CSV"}
        </button>
      </div>

      {loading ? (
        <LoadingInline label="Carregando a trilha da plataforma…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !rows || rows.data.length === 0 ? (
        <EmptyState
          title="Nenhum evento neste recorte"
          description="Ações sobre a vitrine, os textos legais e as rotinas agendadas aparecem aqui, em ordem da mais recente."
        />
      ) : (
        <div className="card-surface table-wrap nx-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col" className="col-acao">Ação</th>
                <th scope="col">Entidade</th>
                <th scope="col">Quem</th>
                <th scope="col">Origem da sessão</th>
                <th scope="col">IP</th>
                <th scope="col" className="col-quando">Quando</th>
              </tr>
            </thead>
            <tbody>
              {rows.data.map((r) => (
                <tr key={r.id}>
                  <td className="col-acao">
                    <span className="company-name">{descricaoDaAcao(r.action, r.entity)}</span>
                    <span className="company-meta mono">{r.action}</span>
                  </td>
                  <td>{rotuloEntidade(r.entity)}</td>
                  <td>{r.userName ?? "Sistema"}</td>
                  <td>{r.origemSessao ?? "sem empresa na sessão"}</td>
                  <td className="mono">{r.ip ?? "—"}</td>
                  <td className="mono col-quando">{formatDateTime(r.createdAt)}</td>
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
            itemLabel="eventos"
            itemLabelSingular="evento"
          />
        </div>
      )}
    </div>
  );
}
