import type { ItemBanner } from "../../lib/landingTypes";

// Faixa de banners cadastrada no CMS. Só aparece com conteúdo publicado; sem
// item, a seção inteira não entra na página.
export function BannerStrip({ banners }: { banners: ItemBanner[] }) {
  if (banners.length === 0) return null;
  return (
    <section className="landing-banners" id="destaques" aria-label="Destaques">
      {banners.map((banner) => (
        <article className="landing-banner card-surface" key={banner.id}>
          {banner.imageUrl && (
            <img className="landing-banner-img" src={banner.imageUrl} alt="" loading="lazy" />
          )}
          <div className="landing-banner-body">
            <h3>{banner.title}</h3>
            {banner.body && <p>{banner.body}</p>}
            {banner.link && (
              <a
                href={banner.link}
                target={banner.link.startsWith("/") ? undefined : "_blank"}
                rel="noopener noreferrer"
              >
                Ver
              </a>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
