import type { ConfiguracaoWhatsapp } from "../../lib/landingTypes";

// Botão flutuante do WhatsApp. Só aparece com o canal ligado E número
// cadastrado: ícone que abre chat vazio ou link quebrado não entra na tela.
// O número vai para o link só com dígitos, como exige o wa.me.
export function WhatsappWidget({ whatsapp }: { whatsapp: ConfiguracaoWhatsapp }) {
  const digitos = whatsapp.numero.replace(/[^0-9]/g, "");
  if (!whatsapp.ativo || digitos.length < 10) return null;

  const destino = whatsapp.mensagem
    ? `https://wa.me/${digitos}?text=${encodeURIComponent(whatsapp.mensagem)}`
    : `https://wa.me/${digitos}`;

  return (
    <a
      className={"landing-whatsapp" + (whatsapp.posicao === "esquerda" ? " is-esquerda" : "")}
      href={destino}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={whatsapp.rotulo || "Falar no WhatsApp"}
      title={whatsapp.rotulo || "Falar no WhatsApp"}
    >
      <span aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" focusable="false">
          <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 5L2 22l5.2-1.36a9.9 9.9 0 0 0 4.84 1.24h.01c5.5 0 9.96-4.46 9.96-9.96A9.9 9.9 0 0 0 19 4.9 9.9 9.9 0 0 0 12.04 2Zm0 18.13a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.09.81.83-3.02-.2-.31a8.16 8.16 0 1 1 6.94 3.85Zm4.5-6.13c-.25-.13-1.46-.72-1.68-.8-.23-.08-.39-.13-.56.12-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.24a7.5 7.5 0 0 1-1.38-1.72c-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.16.17-.25.25-.42.08-.16.04-.31-.02-.44-.06-.12-.56-1.35-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.42.06-.64.31-.22.25-.84.82-.84 2s.62 2.32.71 2.48c.09.16 1.23 1.88 2.98 2.64 1.75.76 1.75.51 2.07.48.31-.06 1-.4 1.14-.79.14-.39.14-.72.1-.79-.04-.06-.17-.11-.42-.23Z" />
        </svg>
      </span>
    </a>
  );
}
