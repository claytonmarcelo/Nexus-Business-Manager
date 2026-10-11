import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AboutSection } from "../components/landing/AboutSection";
import { BannerStrip } from "../components/landing/BannerStrip";
import { ContactSection, temContato } from "../components/landing/ContactSection";
import { CookieBanner } from "../components/landing/CookieBanner";
import { FaqAccordion } from "../components/landing/FaqAccordion";
import { FeatureCard, type CapacidadeView } from "../components/landing/FeatureCard";
import { Hero } from "../components/landing/Hero";
import { LandingFooter } from "../components/landing/LandingFooter";
import { LandingHeader, type SecaoAncora } from "../components/landing/LandingHeader";
import { LANDING_COPY, SECOES_LANDING } from "../components/landing/copy";
import { Maintenance } from "../components/landing/Maintenance";
import { Testimonials } from "../components/landing/Testimonials";
import { WhatsappWidget } from "../components/landing/WhatsappWidget";
import { ErrorState, Skeleton } from "../components/StateView";
import { lerConteudoPublico } from "../lib/landingApi";
import { aplicarCores, aplicarSeo } from "../lib/landingEstilo";
import { textoMeta, type PayloadLanding } from "../lib/landingTypes";
import { tokenStore } from "../lib/tokenStore";

// A página pública deixou de ser HTML fixo: todo o texto, cor, item e documento
// legal vem do CMS. O que continua aqui é casca e critério de exibição - qual
// seção entra, qual âncora existe e o que fazer enquanto o conteúdo não chega.
export function Landing() {
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
  // quando ele chega. O tema escolhido pela pessoa continua vivo no /app, que
  // não recebe nenhuma dessas variáveis.
  useEffect(() => {
    if (!dado) return;
    aplicarCores(dado.cores, raiz.current);
    aplicarSeo(dado.seo);
  }, [dado]);

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

  const secoes = useMemo<SecaoAncora[]>(() => {
    const lista: SecaoAncora[] = [SECOES_LANDING.recursos, SECOES_LANDING.sobre];
    if (!dado) return lista;
    if (dado.depoimentos.length > 0) lista.push(SECOES_LANDING.depoimentos);
    if (dado.faqs.length > 0) lista.push(SECOES_LANDING.faqs);
    if (temContato(dado.contact, dado.social)) lista.push(SECOES_LANDING.contato);
    return lista;
  }, [dado]);

  if (!dado) {
    return (
      <div className="app-bg landing">
        <LandingHeader secoes={[]} />
        <main id="conteudo" className="landing-main landing-carregando">
          {erro ? (
            <ErrorState message={erro} onRetry={recarregar} />
          ) : (
            <Skeleton rows={5} />
          )}
        </main>
        <LandingFooter legais={[]} />
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
      <LandingHeader secoes={secoes} />
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
      <LandingFooter legais={dado.legais} />
      <WhatsappWidget whatsapp={dado.whatsapp} />
      <CookieBanner legalPublicado={dado.legais.some((doc) => doc.kind === "PRIVACY" && doc.published)} />
    </div>
  );
}
