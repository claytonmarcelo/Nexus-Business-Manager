import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, extractErrorMessage } from "../lib/api";
import { notify } from "../lib/notify";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Tabs, TabPanel, useTabState, type TabItem } from "../components/Tabs";
import { PageLoader } from "../components/PageLoader";
import { ErrorState } from "../components/StateView";
import { Bloco } from "../components/Fields";
import { ContaPanel, SenhaPanel } from "../components/settings/ContaPanel";
import { SegundoFatorPanel } from "../components/settings/SegundoFatorPanel";
import { PrivacidadePanel } from "../components/settings/PrivacidadePanel";
import { EmpresaPanel } from "../components/settings/EmpresaPanel";
import { formatDate, formatDateTime, formatCurrency } from "../lib/format";
import {
  gravarEmpresa,
  lerEmpresa,
  lerOpcoes,
  type EmpresaConfig,
  type MudancaEmpresa,
  type OpcoesConfig,
  type ResultadoGravacao,
} from "../lib/settingsApi";

const ABAS: TabItem[] = [
  { id: "conta", label: "Minha conta", hint: "Nome, telefone, segundo fator e senha de acesso" },
  { id: "privacidade", label: "Seus dados", hint: "O que a casa guarda sobre você, com cópia em JSON" },
  { id: "empresa", label: "Empresa", hint: "Cadastro, endereço, formato e meta de receita" },
  { id: "aparencia", label: "Aparência", hint: "Tema deste navegador e o formato em uso no painel" },
  { id: "acesso", label: "Empresas", hint: "Listar as empresas da conta e trocar a ativa" },
];

interface CompanyRef {
  id: string;
  name: string;
  slug: string;
  role: string;
  active: boolean;
}

// Uma instantânea fixa: mostrar a hora do relógio na prévia faria o texto mudar
// a cada re-render e ninguém saberia o que foi formatado com qual fuso.
const AMOSTRA = new Date(2026, 2, 5, 14, 30);

// Tela de Configurações em cinco abas. A divisão é por dono do dado: a conta é
// de quem está logado, o que a casa guarda dela é dela mesma (LGPD), a empresa é
// de quem administra, o tema é deste navegador e a lista de empresas é a porta
// entre os contextos.
export function Settings() {
  const { user, can, reload } = useAuth();
  const { active, onSelect } = useTabState(ABAS, "conta");
  const podeEscrever = can("settings:write");

  const [empresa, setEmpresa] = useState<EmpresaConfig | null>(null);
  const [opcoes, setOpcoes] = useState<OpcoesConfig | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const [atual, listas] = await Promise.all([lerEmpresa(), lerOpcoes()]);
      setEmpresa(atual);
      setOpcoes(listas);
    } catch (e) {
      setErro(extractErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Gravar a empresa devolve o registro já normalizado — é ele que vai para a
  // tela. Moeda, fuso e idioma também moram na sessão, então ela é lida de novo
  // para o formato do painel mudar sem precisar de F5.
  const gravar = useCallback(
    async (mudanca: MudancaEmpresa): Promise<ResultadoGravacao> => {
      const resultado = await gravarEmpresa(mudanca);
      setEmpresa(resultado.empresa);
      if (
        resultado.alterados.some((campo) =>
          campo === "currency" || campo === "timezone" || campo === "language",
        )
      ) {
        await reload();
      }
      return resultado;
    },
    [reload],
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-sub">
            {user
              ? user.name + " · " + user.companyName + " · " + user.role
              : "Preferências da conta e da empresa ativa"}
          </p>
        </div>
        {!podeEscrever ? <span className="status-pill is-off">Somente leitura</span> : null}
      </div>

      <Tabs tabs={ABAS} active={active} onSelect={onSelect} ariaLabel="Configurações" />

      <TabPanel id="conta" active={active}>
        <div className="nx-painel">
          <ContaPanel />
          <SegundoFatorPanel />
          <SenhaPanel />
        </div>
      </TabPanel>

      {/* O `TabPanel` não monta o que não está na tela, então a leitura dos dados
          do titular — uma rota cara e auditada — só acontece quando a pessoa abre
          a aba. Sem isso, entrar em Configurações registraria um export por visita. */}
      <TabPanel id="privacidade" active={active}>
        <PrivacidadePanel />
      </TabPanel>

      <TabPanel id="empresa" active={active}>
        {erro ? (
          <ErrorState message={erro} onRetry={carregar} />
        ) : !empresa || !opcoes ? (
          <PageLoader label="Abrindo os dados da empresa…" />
        ) : (
          <EmpresaPanel
            empresa={empresa}
            opcoes={opcoes}
            podeEscrever={podeEscrever}
            aoGravar={gravar}
          />
        )}
      </TabPanel>

      <TabPanel id="aparencia" active={active}>
        <PainelAparencia podeEscrever={podeEscrever} irParaEmpresa={() => onSelect("empresa")} />
      </TabPanel>

      <TabPanel id="acesso" active={active}>
        <PainelEmpresas />
      </TabPanel>
    </div>
  );
}

// ===== Aparência =====
// O tema é escolha deste navegador e não sobe para o servidor; o formato dos
// números e das datas é dado da empresa e muda para todo mundo. Mostrar os dois
// na mesma aba, dizendo quem manda em cada um, evita a pessoa procurar em lugar
// errado o controle que não encontra.
function PainelAparencia({ podeEscrever, irParaEmpresa }: { podeEscrever: boolean; irParaEmpresa: () => void }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="nx-painel">
      <Bloco
        titulo="Tema"
        sub="Vale para este navegador, guardado no seu aparelho. Não altera o que os outros veem."
      >
        <div className="theme-choice" role="radiogroup" aria-label="Tema">
          <button
            type="button"
            role="radio"
            aria-checked={theme === "dark"}
            className={"btn " + (theme === "dark" ? "btn-brand" : "btn-ghost")}
            onClick={() => setTheme("dark")}
          >
            Escuro
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={theme === "light"}
            className={"btn " + (theme === "light" ? "btn-brand" : "btn-ghost")}
            onClick={() => setTheme("light")}
          >
            Claro
          </button>
        </div>
      </Bloco>

      <Bloco
        titulo="Formato em uso no painel"
        sub="Mesmo número e mesma data, escritos com a moeda, o fuso e o idioma da empresa ativa."
        acao={
          <button type="button" className="btn btn-ghost btn-sm" onClick={irParaEmpresa}>
            Ajustar na aba Empresa
          </button>
        }
      >
        <dl className="kv">
          <div>
            <dt>Valor</dt>
            <dd className="mono">{formatCurrency(1234.5)}</dd>
          </div>
          <div>
            <dt>Data</dt>
            <dd className="mono">{formatDate(AMOSTRA)}</dd>
          </div>
          <div>
            <dt>Data e hora</dt>
            <dd className="mono">{formatDateTime(AMOSTRA)}</dd>
          </div>
        </dl>
        {!podeEscrever ? (
          <p className="nx-bloco-sub">
            Seu papel lê a configuração, mas não a grava: peça o ajuste a quem administra a empresa.
          </p>
        ) : null}
      </Bloco>
    </div>
  );
}

// ===== Empresas =====
// Trocar de empresa ativa troca o contexto inteiro: token, papel, moeda e fuso.
// Por isso a lista é uma aba à parte e não um botão solto no cabeçalho.
function PainelEmpresas() {
  const { user, can, switchCompany } = useAuth();
  const [companies, setCompanies] = useState<CompanyRef[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api
      .get<CompanyRef[]>("/companies")
      .then((r) => setCompanies(r.data))
      .catch((e) => notify.error(extractErrorMessage(e)))
      .finally(() => setCarregando(false));
  }, []);

  async function escolher(id: string) {
    if (id === user?.companyId) return;
    try {
      await switchCompany(id);
      notify.success("Empresa ativa alterada.");
    } catch (e) {
      notify.error(extractErrorMessage(e));
    }
  }

  return (
    <Bloco
      titulo="Empresas da sua conta"
      sub="Cada empresa tem clientes, estoque, financeiro e trilha de auditoria próprios."
      acao={
        can("audit:read") ? (
          <Link className="btn btn-ghost btn-sm" to="/app/auditoria">
            Ver a trilha de auditoria
          </Link>
        ) : null
      }
    >
      {carregando ? (
        <PageLoader label="Listando suas empresas…" />
      ) : (
        <ul className="company-list">
          {companies.map((c) => (
            <li
              key={c.id}
              className={"company-item " + (c.id === user?.companyId ? "is-current" : "")}
            >
              <div>
                <span className="company-name">{c.name}</span>
                <span className="company-meta mono">
                  {c.slug} · {c.role}
                  {c.active ? "" : " · inativa"}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={c.id === user?.companyId}
                onClick={() => void escolher(c.id)}
              >
                {c.id === user?.companyId ? "Atual" : "Selecionar"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Bloco>
  );
}
