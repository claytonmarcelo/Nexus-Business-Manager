import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, extractErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { EmptyState, ErrorState, LoadingInline } from "../components/StateView";
import { Tabs, TabPanel, useTabState, type TabItem } from "../components/Tabs";
import { formatCurrency, formatDateTime } from "../lib/format";

// Painel do Dashboard. Todos os números vêm de /reports/overview, calculado no
// servidor sobre a empresa do token (nada de estimativa no navegador).
interface Alerta {
  chave: string;
  titulo: string;
  texto: string;
  quantidade: number;
  grau: string;
  rota: string;
}

interface Visao {
  periodo: string;
  vendas?: {
    receita: number;
    pedidos: number;
    ticket: number;
    receitaAnterior: number;
    pedidosAnterior: number;
    variacao: number | null;
    pendentes: number;
    canceladas: number;
  };
  clientes?: { total: number; novosNoMes: number; semCompra: number };
  produtos?: {
    total: number;
    estoqueTotal: number;
    ruptura: number;
    abaixoDoMinimo: number;
    listaBaixa: { id: string; nome: string; atual: number; minimo: number }[];
  };
  financeiro?: {
    aReceber: number;
    aReceberQtd: number;
    aPagar: number;
    aPagarQtd: number;
    vencido: number;
    vencidoQtd: number;
  };
  crm?: { abertos: number; ganhos: number; perdidos: number; valorNoFunil: number; conversao: number | null };
  agenda?: { proximos7dias: number; atrasados: number };
  alertas: Alerta[];
}

interface AuditRow { id: string; action: string; entity: string; createdAt: string; userName: string | null }
interface Paged<T> { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }

const ABAS: TabItem[] = [
  { id: "visao", label: "Visão Geral", hint: "O essencial da empresa neste mês" },
  { id: "metas", label: "Metas & Indicadores", hint: "Comparativo com o mês anterior e taxas do período" },
  { id: "alertas", label: "Alertas", hint: "O que precisa da sua atenção agora" },
];

export function Dashboard() {
  const { user } = useAuth();
  const { active, onSelect } = useTabState(ABAS, "visao");
  const [visao, setVisao] = useState<Visao | null>(null);
  const [atividades, setAtividades] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [relatorio, trilha] = await Promise.all([
        api.get<Visao>("/reports/overview"),
        api.get<Paged<AuditRow>>("/audit", { params: { page: 1, pageSize: 6 } }),
      ]);
      setVisao(relatorio.data);
      setAtividades(trilha.data.data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const alertas = visao?.alertas ?? [];
  const tabsComContagem: TabItem[] = ABAS.map((a) =>
    a.id === "alertas" && alertas.length ? { ...a, badge: alertas.length } : a,
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Olá, {user ? user.name.split(" ")[0] : ""}</h1>
          <p className="page-sub">Visão geral de {user ? user.companyName : ""}</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()}>
          Atualizar
        </button>
      </div>

      <Tabs tabs={tabsComContagem} active={active} onSelect={onSelect} ariaLabel="Seções do dashboard" />

      {loading ? (
        <LoadingInline label="Calculando indicadores…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !visao ? (
        <EmptyState title="Sem dados" description="Não há indicadores para mostrar." />
      ) : (
        <>
          <TabPanel id="visao" active={active}>
            <div className="kpi-grid">
              {visao.vendas ? (
                <Kpi
                  rotulo={"Receita de " + mesPorExtenso(visao.periodo)}
                  valor={formatCurrency(visao.vendas.receita)}
                  dica={
                    visao.vendas.variacao === null
                      ? visao.vendas.pedidos + (visao.vendas.pedidos === 1 ? " pedido" : " pedidos")
                      : sinal(visao.vendas.variacao) + Math.abs(visao.vendas.variacao) + "% sobre o mês anterior"
                  }
                />
              ) : null}
              {visao.vendas ? (
                <Kpi rotulo="Pedidos no mês" valor={visao.vendas.pedidos} dica={"Ticket médio " + formatCurrency(visao.vendas.ticket)} />
              ) : null}
              {visao.financeiro ? (
                <Kpi
                  rotulo="A receber"
                  valor={formatCurrency(visao.financeiro.aReceber)}
                  dica={visao.financeiro.aReceberQtd + " lançamentos pendentes"}
                />
              ) : null}
              {visao.financeiro ? (
                <Kpi
                  rotulo="A pagar"
                  valor={formatCurrency(visao.financeiro.aPagar)}
                  dica={visao.financeiro.aPagarQtd + " lançamentos pendentes"}
                />
              ) : null}
              {visao.crm ? (
                <Kpi rotulo="Leads no funil" valor={visao.crm.abertos} dica={"Potencial " + formatCurrency(visao.crm.valorNoFunil)} />
              ) : null}
              {visao.clientes ? (
                <Kpi rotulo="Clientes cadastrados" valor={visao.clientes.total} dica={visao.clientes.novosNoMes + " novos neste mês"} />
              ) : null}
              {visao.produtos ? (
                <Kpi rotulo="Produtos ativos" valor={visao.produtos.total} dica={visao.produtos.ruptura + " sem estoque"} />
              ) : null}
              {visao.agenda ? (
                <Kpi rotulo="Agenda dos próximos 7 dias" valor={visao.agenda.proximos7dias} dica={visao.agenda.atrasados + " em atraso"} />
              ) : null}
            </div>

            <div className="nx-split">
              <section className="card-surface panel">
                <h2 className="nx-panel-title">Atividades recentes</h2>
                <p className="nx-panel-sub">Os últimos registros da trilha de auditoria da empresa.</p>
                {atividades.length > 0 ? (
                  <ul className="activity-list">
                    {atividades.map((row) => (
                      <li key={row.id} className="activity-item">
                        <span className="activity-dot" aria-hidden="true" />
                        <span className="activity-action mono">{row.action}</span>
                        <span className="activity-entity">{row.userName ?? row.entity}</span>
                        <time className="activity-time">{formatDateTime(row.createdAt)}</time>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">Nenhuma atividade registrada ainda.</p>
                )}
              </section>

              {visao.produtos && visao.produtos.listaBaixa.length > 0 ? (
                <section className="card-surface panel">
                  <h2 className="nx-panel-title">Reposição de estoque</h2>
                  <p className="nx-panel-sub">Produtos no mínimo ou abaixo dele.</p>
                  <ul className="nx-distrib">
                    {visao.produtos.listaBaixa.slice(0, 7).map((p) => (
                      <li key={p.id} className="nx-distrib-row">
                        <span className="nx-distrib-label" title={p.nome}>{p.nome}</span>
                        <span className="nx-distrib-track">
                          <span
                            className="nx-distrib-fill"
                            style={{ width: largura(p.atual, p.minimo) }}
                          />
                        </span>
                        <span className="nx-distrib-value">{p.atual} / {p.minimo}</span>
                      </li>
                    ))}
                  </ul>
                  <p style={{ marginTop: "0.8rem" }}>
                    <Link className="btn btn-ghost btn-sm" to="/app/produtos?aba=movimentacoes">
                      Ver movimentações
                    </Link>
                  </p>
                </section>
              ) : (
                <section className="card-surface panel">
                  <h2 className="nx-panel-title">Reposição de estoque</h2>
                  <p className="nx-panel-sub">Nenhum produto está abaixo do estoque mínimo.</p>
                  <p className="form-note">Quando um item cair do mínimo, ele aparece aqui e na aba de alertas.</p>
                </section>
              )}
            </div>
          </TabPanel>

          <TabPanel id="metas" active={active}>
            <div className="card-surface panel">
              <h2 className="nx-panel-title">Comparativo com o mês anterior</h2>
              <p className="nx-panel-sub">
                Referência de desempenho do mesmo período do mês passado, calculada sobre pedidos não cancelados.
              </p>
              {visao.vendas ? (
                <ul className="nx-distrib">
                  <li className="nx-distrib-row">
                    <span className="nx-distrib-label">Receita</span>
                    <span className="nx-distrib-track">
                      <span className="nx-distrib-fill" style={{ width: porcentagem(visao.vendas.receita, visao.vendas.receitaAnterior) }} />
                    </span>
                    <span className="nx-distrib-value">{formatCurrency(visao.vendas.receita)} · {formatCurrency(visao.vendas.receitaAnterior)} antes</span>
                  </li>
                  <li className="nx-distrib-row">
                    <span className="nx-distrib-label">Pedidos</span>
                    <span className="nx-distrib-track">
                      <span className="nx-distrib-fill" style={{ width: porcentagem(visao.vendas.pedidos, visao.vendas.pedidosAnterior) }} />
                    </span>
                    <span className="nx-distrib-value">{visao.vendas.pedidos} · {visao.vendas.pedidosAnterior} antes</span>
                  </li>
                </ul>
              ) : (
                <p className="form-note">Seu papel não tem acesso à leitura de vendas.</p>
              )}
            </div>

            <div className="kpi-grid">
              {visao.vendas ? (
                <Kpi
                  rotulo="Cancelamento"
                  valor={taxaDeCancelamento(visao.vendas.canceladas, visao.vendas.pedidos)}
                  dica={visao.vendas.canceladas + " pedidos cancelados"}
                />
              ) : null}
              {visao.crm && visao.crm.conversao !== null ? (
                <Kpi rotulo="Conversão de leads" valor={visao.crm.conversao + "%"} dica={`${visao.crm.ganhos} ganhos, ${visao.crm.perdidos} perdidos`} />
              ) : (
                <Kpi rotulo="Conversão de leads" valor="—" dica="Ainda sem negócios fechados ou perdidos" />
              )}
              {visao.clientes ? (
                <Kpi
                  rotulo="Clientes sem compra"
                  valor={visao.clientes.semCompra}
                  dica="Ativos há mais de 30 dias sem pedido"
                />
              ) : null}
              {visao.financeiro ? (
                <Kpi rotulo="Contas vencidas" valor={visao.financeiro.vencidoQtd} dica={formatCurrency(visao.financeiro.vencido)} />
              ) : null}
            </div>

            <p className="form-note">
              A meta nominal de receita por empresa é definida em Configurações da empresa; enquanto ela não estiver
              cadastrada, o comparativo acima usa o mês anterior como referência.
            </p>
          </TabPanel>

          <TabPanel id="alertas" active={active}>
            {alertas.length === 0 ? (
              <EmptyState
                title="Nada exige sua atenção"
                description="Estoque, cobranças, pedidos e agenda estão dentro do esperado."
              />
            ) : (
              <div className="nx-split">
                {alertas.map((a) => (
                  <section key={a.chave} className={"nx-alerta " + (a.grau === "critico" ? "is-critico" : "is-aviso")}>
                    <div>
                      <p className="nx-alerta-titulo">{a.titulo}</p>
                      <p className="nx-alerta-texto">{a.texto}</p>
                      <p style={{ marginTop: "0.5rem" }}>
                        <Link className="btn btn-ghost btn-sm" to={a.rota}>
                          Resolver agora
                        </Link>
                      </p>
                    </div>
                    <span className="nx-alerta-qty">{a.quantidade}</span>
                  </section>
                ))}
              </div>
            )}
          </TabPanel>
        </>
      )}
    </div>
  );
}

function Kpi({ rotulo, valor, dica }: { rotulo: string; valor: string | number; dica?: string }) {
  return (
    <div className="kpi card-surface">
      <span className="kpi-label">{rotulo}</span>
      <div className="kpi-value">{valor}</div>
      {dica ? <span className="kpi-hint">{dica}</span> : null}
    </div>
  );
}

function mesPorExtenso(periodo: string): string {
  const [ano, mes] = periodo.split("-");
  const nome = new Date(Number(ano), Number(mes) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

function sinal(variacao: number): string {
  return variacao > 0 ? "+" : variacao < 0 ? "−" : "";
}

function taxaDeCancelamento(canceladas: number, pedidos: number): string {
  const total = canceladas + pedidos;
  if (!total) return "0%";
  return Math.round((canceladas / total) * 100) + "%";
}

// Barra de comparação: o maior valor ocupa 100% e o menor proporcionalmente.
function porcentagem(atual: number, referencia: number): string {
  const maior = Math.max(atual, referencia, 1);
  return Math.max(4, Math.round((atual / maior) * 100)) + "%";
}

function largura(atual: number, minimo: number): string {
  if (atual <= 0) return "4%";
  const base = Math.max(minimo, atual, 1);
  return Math.min(100, Math.max(6, Math.round((atual / base) * 100))) + "%";
}
