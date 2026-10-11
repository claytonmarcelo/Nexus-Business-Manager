import { Fragment, useCallback, useEffect, useState } from "react";
import { api, extractErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";
import { confirmAction } from "../lib/confirm";
import { Modal, useDirty } from "../components/Modal";
import { Pagination, PAGE_SIZE_PADRAO, usePaginacaoLocal } from "../components/Pagination";
import { Tabs, TabPanel, useTabState, type TabItem } from "../components/Tabs";
import { ACTIONS, MODAL_COPY, modalTitle } from "../lib/uiCopy";
import { EmptyState, ErrorState, LoadingInline } from "../components/StateView";
import { PasswordInput } from "../components/PasswordInput";
import { formatDateTime } from "../lib/format";

interface Member { id: string; name: string; email: string; active: boolean; role: string; membershipId: string }
interface Paged<T> { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }
const ROLES = ["OWNER", "ADMIN", "MANAGER", "STAFF"];

// GET /users/permissions -> { papeis, celulas, recursos } (RBAC central do servidor).
interface PapelRbac { role: string; rotulo: string; descricao: string; total: number }
interface CelulaRbac { recurso: string; acao: string; roles: string[] }
interface RecursoRbac { recurso: string; rotulo: string }
interface MatrizRbac { papeis: PapelRbac[]; celulas: CelulaRbac[]; recursos: RecursoRbac[] }

// GET /users/sessions -> { data, meta.total } (sessões vivas da empresa ativa).
interface Sessao {
  id: string;
  userId: string;
  usuario: string;
  email: string;
  papel: string;
  origem: string | null;
  criadaEm: string;
  expiraEm: string;
}
interface SessoesResposta { data: Sessao[]; meta: { total: number } }

const ABAS: TabItem[] = [
  { id: "lista", label: "Lista de Usuários", hint: "Membros, papéis e novos acessos" },
  { id: "permissoes", label: "Permissões (RBAC)", hint: "O que cada papel pode ler e editar" },
  { id: "sessoes", label: "Sessões", hint: "Dispositivos conectados e encerramento" },
];

// Usuários em três abas: gestão do dia a dia (lista/papéis/convites), a matriz
// de permissões lida do RBAC central e as sessões ativas por dispositivo.
export function Users() {
  const { can, user } = useAuth();
  // Fase 1 da auditoria: papel de proprietário só o OWNER vê e mexe — a
  // mesma regra que passou a valer no servidor, espelhada na tela.
  const souOwner = user?.role === "OWNER";
  const { active, onSelect } = useTabState(ABAS, "lista");

  // ---- Aba Lista ----
  const [rows, setRows] = useState<Paged<Member> | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_PADRAO);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // ---- Aba Permissões (RBAC) ----
  const [matriz, setMatriz] = useState<MatrizRbac | null>(null);
  const [matrizLoading, setMatrizLoading] = useState(false);
  const [matrizError, setMatrizError] = useState<string | null>(null);

  // ---- Aba Sessões ----
  const [sessoes, setSessoes] = useState<SessoesResposta | null>(null);
  const [sessoesLoading, setSessoesLoading] = useState(false);
  const [sessoesError, setSessoesError] = useState<string | null>(null);
  const [encerrandoId, setEncerrandoId] = useState<string | null>(null);

  // As sessoes vem todas de uma vez: a lista vira pagina no navegador.
  const listaSessoes = usePaginacaoLocal(sessoes?.data ?? []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Paged<Member>>("/users", {
        params: { page, pageSize, search: search || undefined },
      });
      setRows(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    void load();
  }, [load]);

  // Busca só quando a aba está aberta: permissões ficam em cache após o 1º load.
  const loadMatriz = useCallback(async () => {
    setMatrizLoading(true);
    setMatrizError(null);
    try {
      const { data } = await api.get<MatrizRbac>("/users/permissions");
      setMatriz(data);
    } catch (err) {
      setMatrizError(extractErrorMessage(err));
    } finally {
      setMatrizLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active === "permissoes" && !matriz && !matrizLoading) void loadMatriz();
  }, [active, matriz, matrizLoading, loadMatriz]);

  const loadSessoes = useCallback(async () => {
    setSessoesLoading(true);
    setSessoesError(null);
    try {
      const { data } = await api.get<SessoesResposta>("/users/sessions");
      setSessoes(data);
    } catch (err) {
      setSessoesError(extractErrorMessage(err));
    } finally {
      setSessoesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active === "sessoes" && !sessoes && !sessoesLoading) void loadSessoes();
  }, [active, sessoes, sessoesLoading, loadSessoes]);

  async function changeRole(member: Member, role: string) {
    await confirmAction({
      title: "Alterar papel",
      text: "Definir {nome} como " + role + " nesta empresa?",
      nome: member.name,
      detalhe: "O papel é lido do banco a cada requisição: o acesso muda na hora e passa a seguir exatamente a matriz de permissões.",
      confirmLabel: "Alterar papel",
      action: async () => {
        try {
          await api.patch("/users/" + member.id + "/role", { role });
          notify.success("Papel atualizado.");
          void load();
        } catch (err) {
          notify.error(extractErrorMessage(err));
        }
      },
    });
  }

  async function encerrarSessao(sessao: Sessao) {
    await confirmAction({
      title: "Encerrar sessão",
      text: "Encerrar a sessão de {nome} neste dispositivo?",
      nome: sessao.usuario + " (" + sessao.email + ")",
      detalhe: "A pessoa é desconectada imediatamente nesse acesso e precisa entrar de novo para voltar. Os demais dispositivos dela não são afetados.",
      confirmLabel: "Encerrar sessão",
      danger: true,
      action: async () => {
        setEncerrandoId(sessao.id);
        try {
          await api.delete("/users/sessions/" + sessao.id);
          notify.success("Sessão encerrada. A pessoa precisará entrar de novo nesse dispositivo.");
          void loadSessoes();
        } catch (err) {
          notify.error(extractErrorMessage(err));
        } finally {
          setEncerrandoId(null);
        }
      },
    });
  }

  // Mapa recurso:acao -> papéis que têm a permissão, para montar a matriz.
  const mapaCelulas = new Map<string, string[]>();
  if (matriz) {
    for (const c of matriz.celulas) mapaCelulas.set(c.recurso + ":" + c.acao, c.roles);
  }
  const usuariosDistintos = sessoes ? new Set(sessoes.data.map((s) => s.userId)).size : 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Usuários</h1>
          <p className="page-sub">Membros da empresa ativa</p>
        </div>
        {active === "lista" && can("user:write") ? (
          <button type="button" className="btn btn-brand" onClick={() => setShowAdd(true)}>Novo membro</button>
        ) : null}
      </div>

      <Tabs
        tabs={ABAS}
        active={active}
        onSelect={(id) => { setPage(1); onSelect(id); }}
        ariaLabel="Seções de usuários"
      />

      <TabPanel id="lista" active={active}>
        <div className="toolbar">
          <input
            className="input"
            type="search"
            placeholder="Buscar por nome ou e-mail"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            aria-label="Buscar usuários"
          />
          <span className="toolbar-note">
            {loading ? "Atualizando membros…" : rows ? rows.meta.total + (rows.meta.total === 1 ? " membro" : " membros") : "—"}
          </span>
        </div>

        {loading ? (
          <LoadingInline />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : rows && rows.data.length > 0 ? (
          <div className="card-surface table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">E-mail</th>
                  <th scope="col">Papel</th>
                  <th scope="col">Situação</th>
                </tr>
              </thead>
              <tbody>
                {rows.data.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td className="mono">{m.email}</td>
                    <td>
                      {can("user:write") && (souOwner || m.role !== "OWNER") ? (
                        <select
                          className="select"
                          value={m.role}
                          onChange={(e) => void changeRole(m, e.target.value)}
                          aria-label={"Papel de " + m.name}
                        >
                          {(souOwner ? ROLES : ROLES.filter((r) => r !== "OWNER")).map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="badge" title="Apenas o proprietário mexe no papel de proprietário">{m.role}</span>
                      )}
                    </td>
                    <td>
                      <span className={"status-pill " + (m.active ? "is-on" : "is-off")}>
                        {m.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows ? (
              <Pagination
                page={rows.meta.page}
                pageSize={rows.meta.pageSize}
                total={rows.meta.total}
                totalPages={rows.meta.totalPages}
                onChange={setPage}
                onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
                itemLabel="usuários"
                itemLabelSingular="usuário"
              />
            ) : null}
          </div>
        ) : (
          <EmptyState title="Nenhum usuário encontrado" description="Ajuste a busca ou adicione um novo membro." />
        )}
      </TabPanel>

      <TabPanel id="permissoes" active={active}>
        <h2 className="nx-panel-title">Matriz de permissões por papel</h2>
        <p className="nx-panel-sub">
          Esta matriz é lida diretamente do RBAC central do servidor (a mesma regra que protege todas as
          rotas da API) e é somente leitura aqui: ajustes de permissão acontecem no código do backend.
          Para mudar o papel de alguém, use a aba Lista de Usuários.
        </p>

        {matrizLoading ? (
          <LoadingInline label="Carregando a matriz de permissões…" />
        ) : matrizError ? (
          <ErrorState message={matrizError} onRetry={loadMatriz} />
        ) : matriz ? (
          <>
            <div className="card-surface table-wrap nx-scroll">
              <table className="table matriz-rbac">
                <thead>
                  <tr>
                    <th scope="col">Recurso</th>
                    {matriz.papeis.map((p) => (
                      <Fragment key={p.role}>
                        <th scope="colgroup" colSpan={2}>{p.rotulo}</th>
                      </Fragment>
                    ))}
                  </tr>
                  <tr>
                    <th scope="col" aria-hidden="true" />
                    {matriz.papeis.flatMap((p) => [
                      <th key={p.role + ":read"} scope="col">Ler</th>,
                      <th key={p.role + ":write"} scope="col">Editar</th>,
                    ])}
                  </tr>
                </thead>
                <tbody>
                  {matriz.recursos.map((r) => (
                    <tr key={r.recurso}>
                      <th scope="row">{r.rotulo}</th>
                      {matriz.papeis.flatMap((p) => {
                        const temLeitura = mapaCelulas.get(r.recurso + ":read")?.includes(p.role) ?? false;
                        const temEscrita = mapaCelulas.get(r.recurso + ":write")?.includes(p.role) ?? false;
                        return [
                          <td key={p.role + ":read"}>{temLeitura ? <span title={p.rotulo + " pode ler " + r.rotulo}>✓</span> : "—"}</td>,
                          <td key={p.role + ":write"}>{temEscrita ? <span title={p.rotulo + " pode editar " + r.rotulo}>✓</span> : "—"}</td>,
                        ];
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="nx-split">
              {matriz.papeis.map((p) => (
                <div key={p.role} className="card-surface panel">
                  <h3 className="nx-panel-title">{p.rotulo}</h3>
                  <p className="nx-panel-sub">{p.descricao}</p>
                  <span className="badge">{p.role}</span>{" "}
                  <span className="toolbar-note">{p.total} permissão(ões) declaradas no servidor</span>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </TabPanel>

      <TabPanel id="sessoes" active={active}>
        <h2 className="nx-panel-title">Sessões ativas</h2>
        <p className="nx-panel-sub">
          Cada sessão abaixo é um dispositivo com acesso aberto à empresa. Encerrar a sessão desconecta
          aquela pessoa naquele dispositivo; ela precisará entrar de novo para voltar.
        </p>

        {sessoesLoading ? (
          <LoadingInline label="Carregando sessões…" />
        ) : sessoesError ? (
          <ErrorState message={sessoesError} onRetry={loadSessoes} />
        ) : sessoes ? (
          <>
            <div className="kpi-grid">
              <div className="kpi card-surface">
                <span className="kpi-label">Sessões ativas</span>
                <div className="kpi-value">{sessoes.meta.total}</div>
                <span className="kpi-hint">dispositivos conectados agora</span>
              </div>
              <div className="kpi card-surface">
                <span className="kpi-label">Usuários conectados</span>
                <div className="kpi-value">{usuariosDistintos}</div>
                <span className="kpi-hint">contas distintas com sessão aberta</span>
              </div>
            </div>

            {sessoes.data.length === 0 ? (
              <EmptyState
                title="Nenhuma sessão ativa"
                description="Ninguém está conectado agora. As sessões aparecem aqui a partir do próximo login."
              />
            ) : (
              <div className="card-surface table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Usuário</th>
                      <th scope="col">Papel</th>
                      <th scope="col">Origem/IP</th>
                      <th scope="col">Criada em</th>
                      <th scope="col">Expira em</th>
                      {can("user:write") ? <th scope="col" className="col-acoes">Ações</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {listaSessoes.itens.map((s) => (
                      <tr key={s.id}>
                        <td>
                          {s.usuario}
                          <div className="mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{s.email}</div>
                        </td>
                        <td><span className="badge">{s.papel}</span></td>
                        <td className="mono">{s.origem ?? "—"}</td>
                        <td>{formatDateTime(s.criadaEm)}</td>
                        <td>{formatDateTime(s.expiraEm)}</td>
                        {can("user:write") ? (
                          <td className="col-acoes">
                            <div className="row-actions">
                              {s.userId === user?.id ? (
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => void encerrarSessao(s)}
                                  disabled={encerrandoId === s.id}
                                  aria-label={"Encerrar sessão de " + s.usuario}
                                >
                                  {encerrandoId === s.id ? "Encerrando…" : "Encerrar sessão"}
                                </button>
                              ) : (
                                <span
                                  className="text-muted"
                                  title="Sessão pertence à pessoa, não à empresa: cada uma encerra as suas; para restringir outra pessoa, altere o papel dela"
                                >
                                  só as próprias
                                </span>
                              )}
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination {...listaSessoes.pagina} itemLabel="sessões" itemLabelSingular="sessão" />
              </div>
            )}
          </>
        ) : null}
      </TabPanel>

      {showAdd ? <AddMemberModal onClose={() => setShowAdd(false)} onCreated={() => void load()} /> : null}
    </div>
  );
}

function AddMemberModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "STAFF" });
  const [busy, setBusy] = useState(false);
  const dirty = useDirty(form);

  async function submit() {
    setBusy(true);
    try {
      await api.post("/users", form);
      notify.success("Membro adicionado.");
      onCreated();
      onClose();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={modalTitle("member", true)}
      onClose={onClose}
      onSubmit={() => void submit()}
      busy={busy}
      dirty={dirty}
      submitLabel={ACTIONS.add}
      busyLabel="Adicionando…"
      hint={MODAL_COPY.requiredHint}
    >
        <div className="field">
          <span className="field-label">Nome *</span>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <span className="field-label">E-mail *</span>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field">
          <PasswordInput label="Senha *" value={form.password} onChange={(v) => setForm({ ...form, password: v })} autoComplete="new-password" required />
        </div>
        <div className="field">
          <span className="field-label">Papel *</span>
          <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {(user?.role === "OWNER" ? ROLES : ROLES.filter((r) => r !== "OWNER")).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
    </Modal>
  );
}
