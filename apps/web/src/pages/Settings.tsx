import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { notify } from "../lib/notify";
import { extractErrorMessage } from "../lib/api";

interface CompanyRef { id: string; name: string; slug: string; role: string; active: boolean }

export function Settings() {
  const { user, switchCompany } = useAuth();
  const { theme, setTheme } = useTheme();
  const [companies, setCompanies] = useState<CompanyRef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<CompanyRef[]>("/companies")
      .then((r) => setCompanies(r.data))
      .catch((e) => notify.error(extractErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  async function choose(id: string) {
    if (id === user?.companyId) return;
    try {
      await switchCompany(id);
      notify.success("Empresa ativa alterada.");
    } catch (err) {
      notify.error(extractErrorMessage(err));
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-sub">Preferências e contexto da conta</p>
        </div>
      </div>

      <section className="card-surface panel">
        <h2 className="panel-title">Aparência</h2>
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
      </section>

      <section className="card-surface panel">
        <h2 className="panel-title">Minha conta</h2>
        <dl className="kv">
          <div><dt>Nome</dt><dd>{user?.name}</dd></div>
          <div><dt>E-mail</dt><dd className="mono">{user?.email}</dd></div>
          <div><dt>Papel</dt><dd><span className="badge">{user?.role}</span></dd></div>
          <div><dt>Empresa ativa</dt><dd>{user?.companyName}</dd></div>
        </dl>
      </section>

      <section className="card-surface panel">
        <h2 className="panel-title">Empresas</h2>
        {loading ? <p className="text-muted">Carregando…</p> : (
          <ul className="company-list">
            {companies.map((c) => (
              <li key={c.id} className={"company-item " + (c.id === user?.companyId ? "is-current" : "")}>
                <div>
                  <span className="company-name">{c.name}</span>
                  <span className="company-meta mono">{c.role}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={c.id === user?.companyId}
                  onClick={() => void choose(c.id)}
                >
                  {c.id === user?.companyId ? "Atual" : "Selecionar"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
