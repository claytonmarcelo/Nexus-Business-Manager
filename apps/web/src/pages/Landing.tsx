import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AboutSection } from "../components/landing/AboutSection";
import { BannerStrip } from "../components/landing/BannerStrip";
import { ContactSection } from "../components/landing/ContactSection";
import { CookieBanner } from "../components/landing/CookieBanner";
import { FaqAccordion } from "../components/landing/FaqAccordion";
import { FeatureCard, type CapacidadeView } from "../components/landing/FeatureCard";
import { Hero } from "../components/landing/Hero";
import { AppFooter } from "../components/layout/AppFooter";
import { LandingHeader } from "../components/landing/LandingHeader";
import { LANDING_COPY } from "../components/landing/copy";
import { Maintenance } from "../components/landing/Maintenance";
import { Testimonials } from "../components/landing/Testimonials";
import { WhatsappWidget } from "../components/landing/WhatsappWidget";
import { ErrorState, Skeleton } from "../components/StateView";
import type { FimDeSessao } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { lerConteudoPublico } from "../lib/landingApi";
import { aplicarCores, aplicarSeo } from "../lib/landingEstilo";
import { notify } from "../lib/notify";
import { textoMeta, type PayloadLanding } from "../lib/landingTypes";
import { tokenStore } from "../lib/tokenStore";

// A página pública deixou de ser HTML fixo: todo o texto, cor, item e documento
// legal vem do CMS. O que continua aqui é casca e critério de exibição — qual
// seção entra e o que fazer enquanto o conteúdo não chega.
export function Landing() {
  const { theme } = useTheme();
  const [dado, setDado] = useState<PayloadLanding | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizacao, setAtualizacao] = useState(0);
  const [pulsoLiberado, setPulsoLiberado] = useState(() => Boolean(tokenStore.getPulso()));
  const raiz = useRef<HTMLDivElement>(null);

  const recarregar = useCallback(() => {
    setErro(null);
    setAtualizacao((n) => n + 1);
  }, []);

  useEffect(() => {
    let vivo = true;
    void lerConteudoPublico()
      .then((conteudo) => {
        if (vivo) setDado(conteudo);
      })
      .catch(() => {
        if (vivo) setErro("Não foi possível carregar o conteúdo do site agora.");
      });
    return () => {
      vivo = false;
    };
  }, [atualizacao]);

  // Paleta e tags de SEO pertencem ao conteúdo publicado: entram no documento
  // quando ele chega. A paleta cadastrada veste só o tema a que pertence, por
  // isso o tema escolhido também dispara este efeito — é o que faz o
  // alternador valer na página pública e não apenas dentro do /app.
  useEffect(() => {
    if (!dado) return;
    aplicarCores(dado.cores, raiz.current, theme);
    aplicarSeo(dado.seo);
  }, [dado, theme]);

  // É na página de boas-vindas que a pessoa chega ao perder a sessão, então o
  // aviso acontece aqui. O motivo vem pelo estado da rota, posto pelo
  // ProtectedRoute, e já foi consumido: o "voltar" do navegador não reavisa.
  // Só a expiração merece mensagem — sair pelo botão é escolha da própria
  // pessoa, e um "tchau" a cada logout seria barulho. Nada de alert(): Toastr.
  const { state } = useLocation();
  useEffect(() => {
    const motivo = (state as { fimDeSessao?: FimDeSessao } | null)?.fimDeSessao;
    if (motivo !== "expirada") return;
    notify.warning("Sua sessão expirou. Entre novamente para continuar.");
  }, [state]);

  const capacidade: CapacidadeView[] = useMemo(() => {
    if (!dado || dado.capacidades.length === 0) {
      return LANDING_COPY.features.map((item) => ({ ...item }));
    }
    return dado.capacidades.map((item) => ({
      icon: textoMeta(item.meta, "icone"),
      title: item.title,
      text: item.body ?? "",
      href: textoMeta(item.meta, "rota") || item.link || undefined,
    }));
  }, [dado]);

  if (!dado) {
    return (
      <div className="app-bg landing">
        <LandingHeader />
        <main id="conteudo" className="landing-main landing-carregando">
          {erro ? (
            <ErrorState message={erro} onRetry={recarregar} />
          ) : (
            <Skeleton rows={5} />
          )}
        </main>
        <AppFooter legais={[]} />
      </div>
    );
  }

  // Manutenção: o payload público continua acessível (a API deixa esse caminho
  // aberto de propósito), então o visitante é informado em vez de ver um 503
  // cru. Com o pulso liberado nesta aba, a vitrine volta a ser vitrine.
  if (dado.manutencao.ativa && !pulsoLiberado) {
    return <Maintenance estado={dado.manutencao} onLiberado={() => setPulsoLiberado(true)} />;
  }

  return (
    <div ref={raiz} className="app-bg landing">
      <LandingHeader />
      <main id="conteudo" className="landing-main">
        <Hero headline={dado.headline} subheadline={dado.subheadline} hero={dado.hero} />
        <BannerStrip banners={dado.banners} />
        <section id="recursos" className="landing-features" aria-label="Recursos do sistema">
          {capacidade.map((item, index) => (
            <FeatureCard key={`${item.title}-${index}`} feature={item} index={index} />
          ))}
        </section>
        <AboutSection metricas={dado.metricas} />
        <Testimonials depoimentos={dado.depoimentos} />
        <FaqAccordion faqs={dado.faqs} />
        <ContactSection contato={dado.contact} social={dado.social} />
      </main>
      <AppFooter legais={dado.legais} contexto="vitrine" />
      <WhatsappWidget whatsapp={dado.whatsapp} />
      <CookieBanner legalPublicado={dado.legais.some((doc) => doc.kind === "PRIVACY" && doc.published)} />
    </div>
  );
}
