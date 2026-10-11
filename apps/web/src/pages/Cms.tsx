import { useCallback, useEffect, useState } from "react";
import { extractErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Tabs, TabPanel, useTabState, type TabItem } from "../components/Tabs";
import { EmptyState, ErrorState } from "../components/StateView";
import { PageLoader } from "../components/PageLoader";
import { lerConfig, salvarConfig, type ConfiguracaoEditor, type MudancaConfig } from "../lib/cmsApi";
import { ConteudoPanel } from "../components/cms/ConteudoPanel";
import { ItensPanel } from "../components/cms/ItensPanel";
import { LegaisPanel } from "../components/cms/LegaisPanel";
import { SeoPanel } from "../components/cms/SeoPanel";
import { ManutencaoPanel } from "../components/cms/ManutencaoPanel";

const ABAS: TabItem[] = [
  { id: "conteudo", label: "Conteúdo", hint: "Textos, cores, herói, WhatsApp, contato e redes" },
  { id: "itens", label: "Itens", hint: "Banners, capacidades, depoimentos, métricas e dúvidas" },
  { id: "legais", label: "Textos legais", hint: "Termos, Privacidade e LGPD publicados no site" },
  { id: "seo", label: "SEO", hint: "Nota medida sobre o que está publicado" },
  { id: "manutencao", label: "Manutenção", hint: "Fechar o site, contagem regressiva e código de acesso" },
];

// Editor do site público (/app/cms). O conteúdo é global — a vitrine é uma só
// para toda a plataforma — então desde a Fase 1b a tela é área reservada do
// administrador da plataforma (user.platform). A API confere no banco a cada
// request; esta guarda só evita mostrar um editor que responderia 403.
export function Cms() {
  const { user, can } = useAuth();
  const { active, onSelect } = useTabState(ABAS, "conteudo");
  const ehPlataforma = user?.platform === true;
  const podeEscrever = ehPlataforma && can("content:write");

  const [config, setConfig] = useState<ConfiguracaoEditor | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      setConfig(await lerConfig());
    } catch (e) {
      setErro(extractErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    if (ehPlataforma) void carregar();
  }, [ehPlataforma, carregar]);

  // Grava um bloco e troca o estado da tela pela resposta do servidor: o merge
  // é feito lá, e mostrar o rascunho local deixaria a tela prometendo o que o
  // banco não guarda.
  const salvar = useCallback(async (mudanca: MudancaConfig) => {
    const nova = await salvarConfig(mudanca);
    setConfig(nova);
  }, []);

  if (!ehPlataforma) {
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <h1 className="page-title">Site público</h1>
            <p className="page-sub">Conteúdo da vitrine, textos legais e modo manutenção</p>
          </div>
        </div>
        <EmptyState
          title="Você não tem acesso ao editor do site"
          description="A vitrine é uma só para toda a plataforma, então ela é cuidada por quem responde pelo Nexus inteiro. Quem precisa mudar um texto pede ao administrador da plataforma."
        />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="page">
        <ErrorState message={erro} onRetry={carregar} />
      </div>
    );
  }

  if (!config) return <PageLoader label="Abrindo o conteúdo do site…" />;

  return (
    <div className="page">
      <div className="page-head cms-head">
        <div>
          <h1 className="page-title">Site público</h1>
          <p className="page-sub">
            O conteúdo da página pública mora aqui: o que muda neste editor muda a vitrine, sem deploy.
          </p>
        </div>
        <div className="cms-head-acoes">
          {config.manutencao.ativa ? (
            <span className="status-pill is-off">Site em manutenção</span>
          ) : (
            <span className="status-pill is-on">Site aberto</span>
          )}
        </div>
      </div>

      <Tabs tabs={ABAS} active={active} onSelect={onSelect} ariaLabel="Editor do site público" />

      <TabPanel id="conteudo" active={active}>
        <ConteudoPanel config={config} podeEscrever={podeEscrever} salvar={salvar} />
      </TabPanel>
      <TabPanel id="itens" active={active}>
        <ItensPanel podeEscrever={podeEscrever} />
      </TabPanel>
      <TabPanel id="legais" active={active}>
        <LegaisPanel podeEscrever={podeEscrever} />
      </TabPanel>
      <TabPanel id="seo" active={active}>
        <SeoPanel config={config} podeEscrever={podeEscrever} salvar={salvar} />
      </TabPanel>
      <TabPanel id="manutencao" active={active}>
        <ManutencaoPanel config={config} podeEscrever={podeEscrever} salvar={salvar} />
      </TabPanel>
    </div>
  );
}
