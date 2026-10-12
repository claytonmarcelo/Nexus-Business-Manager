import type { ConfiguracaoContato, ConfiguracaoSocial } from "../../lib/landingTypes";

// Critério único de "tem como falar com a gente": a seção some quando nada foi
// cadastrado. Rodapé com "Contato" que não mostra telefone nem e-mail é o tipo
// de vazio que denuncia fachada.
export function temContato(contato: ConfiguracaoContato, social: ConfiguracaoSocial): boolean {
  return Boolean(
    contato.email ||
      contato.telefone ||
      contato.endereco ||
      contato.horario ||
      (social.redes?.length ?? 0) > 0,
  );
}

// Contato e redes vêm dos blocos `contact` e `social` do CMS.
export function ContactSection({
  contato,
  social,
}: {
  contato: ConfiguracaoContato;
  social: ConfiguracaoSocial;
}) {
  if (!temContato(contato, social)) return null;
  const redes = social.redes ?? [];

  return (
    <section className="landing-contato" id="contato" aria-label="Contato">
      <h2>Contato</h2>
      <dl className="landing-contato-lista">
        {contato.email && (
          <div>
            <dt>E-mail</dt>
            <dd>
              <a href={`mailto:${contato.email}`}>{contato.email}</a>
            </dd>
          </div>
        )}
        {contato.telefone && (
          <div>
            <dt>Telefone</dt>
            <dd>
              <a href={`tel:${contato.telefone.replace(/[^0-9+]/g, "")}`}>{contato.telefone}</a>
            </dd>
          </div>
        )}
        {contato.horario && (
          <div>
            <dt>Horário</dt>
            <dd>{contato.horario}</dd>
          </div>
        )}
        {contato.endereco && (
          <div>
            <dt>Endereço</dt>
            <dd>{contato.endereco}</dd>
          </div>
        )}
      </dl>
      {redes.length > 0 && (
        <ul className="landing-redes" aria-label="Redes sociais">
          {redes.map((rede) => (
            <li key={rede.rede}>
              <a href={rede.url} target="_blank" rel="noopener noreferrer">
                {rede.rotulo || rede.rede}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
