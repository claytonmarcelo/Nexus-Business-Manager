import { useEffect, useState } from "react";
import { notify } from "../../lib/notify";
import { extractErrorMessage } from "../../lib/api";
import { BotaoSalvar, Bloco, Campo, CampoArea, CampoCor, CampoLigado, CampoNumero } from "../Fields";
import type { ConfiguracaoEditor, MudancaConfig } from "../../lib/cmsApi";
import type { EsquemaCores } from "../../lib/landingTypes";

type Rede = ConfiguracaoEditor["social"]["redes"][number];

// ===== Aba Conteúdo =====
// Cada bloco grava sozinho. O servidor faz o merge bloco a bloco, então salvar
// as cores não apaga o WhatsApp — e a tela deixa isso visível ao dar um botão
// de "Salvar" por bloco em vez de um botão único que fingiria gravar tudo.

const CORES: { chave: keyof EsquemaCores; rotulo: string }[] = [
  { chave: "fundo", rotulo: "Fundo" },
  { chave: "painel", rotulo: "Painel" },
  { chave: "texto", rotulo: "Texto" },
  { chave: "textoSuave", rotulo: "Texto suave" },
  { chave: "marca", rotulo: "Marca" },
  { chave: "destaque", rotulo: "Destaque" },
  { chave: "borda", rotulo: "Borda" },
];

interface Props {
  config: ConfiguracaoEditor;
  podeEscrever: boolean;
  salvar: (mudanca: MudancaConfig) => Promise<void>;
}

export function ConteudoPanel({ config, podeEscrever, salvar }: Props) {
  const [rascunho, setRascunho] = useState(config);
  const [ocupado, setOcupado] = useState<string | null>(null);

  // Depois de gravar, a verdade é a que o servidor devolveu: o rascunho volta
  // a ser ela (inclusive os campos que o merge preservou).
  useEffect(() => setRascunho(config), [config]);

  async function gravar(bloco: string, mudanca: MudancaConfig) {
    setOcupado(bloco);
    try {
      await salvar(mudanca);
      notify.success("Bloco salvo na vitrine.");
    } catch (err) {
      notify.error(extractErrorMessage(err));
    } finally {
      setOcupado(null);
    }
  }

  const set = <K extends keyof typeof rascunho>(chave: K, valor: (typeof rascunho)[K]) =>
    setRascunho((atual) => ({ ...atual, [chave]: valor }));

  const setCor = (chave: keyof EsquemaCores, valor: string) =>
    setRascunho((atual) => ({ ...atual, cores: { ...atual.cores, [chave]: valor } }));

  const setHero = (campo: string, valor: string | number) =>
    setRascunho((atual) => ({ ...atual, hero: { ...atual.hero, [campo]: valor } }));

  const setWhats = (campo: string, valor: string | boolean) =>
    setRascunho((atual) => ({ ...atual, whatsapp: { ...atual.whatsapp, [campo]: valor } }));

  const setContato = (campo: string, valor: string) =>
    setRascunho((atual) => ({ ...atual, contact: { ...atual.contact, [campo]: valor } }));

  const setRede = (indice: number, campo: keyof Rede, valor: string) =>
    setRascunho((atual) => {
      const redes = atual.social.redes.map((r, i) => (i === indice ? { ...r, [campo]: valor } : r));
      return { ...atual, social: { redes } };
    });

  return (
    <div className="nx-painel">
      <Bloco
        titulo="Textos do topo"
        sub="O headline é o H1 da página pública e entra no compartilhamento quando o SEO está vazio."
        acao={
          <BotaoSalvar
            desabilitado={!podeEscrever}
            ocupado={ocupado === "textos"}
            aoSalvar={() => gravar("textos", {
              headline: rascunho.headline,
              subheadline: rascunho.subheadline,
            })}
          />
        }
      >
        <div className="nx-grade">
          <Campo
            rotulo="Headline *"
            valor={rascunho.headline}
            maxLength={200}
            desabilitado={!podeEscrever}
            aoMudar={(v) => set("headline", v)}
            dica="Entre 3 e 200 caracteres. É a frase grande da vitrine."
          />
          <CampoArea
            rotulo="Subheadline *"
            valor={rascunho.subheadline}
            rows={3}
            maxLength={400}
            desabilitado={!podeEscrever}
            aoMudar={(v) => set("subheadline", v)}
            dica="Uma frase completa, de 3 a 400 caracteres."
          />
        </div>
      </Bloco>

      <Bloco
        titulo="Cores da vitrine"
        sub="As sete cores viram variáveis CSS da página pública. O resto do sistema continua no tema da pessoa."
        acao={
          <BotaoSalvar
            desabilitado={!podeEscrever}
            ocupado={ocupado === "cores"}
            aoSalvar={() => gravar("cores", { cores: rascunho.cores })}
          />
        }
      >
        <div className="nx-grade nx-grade-cores">
          {CORES.map((c) => (
            <CampoCor
              key={c.chave}
              rotulo={c.rotulo}
              valor={rascunho.cores[c.chave]}
              desabilitado={!podeEscrever}
              aoMudar={(v) => setCor(c.chave, v)}
            />
          ))}
        </div>
      </Bloco>

      <Bloco
        titulo="Herói"
        sub="Selo acima do título, os dois botões de entrada e a imagem de fundo com escurecimento e desfoque."
        acao={
          <BotaoSalvar
            desabilitado={!podeEscrever}
            ocupado={ocupado === "hero"}
            aoSalvar={() => gravar("hero", { hero: rascunho.hero })}
          />
        }
      >
        <div className="nx-grade">
          <Campo rotulo="Selo (eyebrow)" valor={rascunho.hero.eyebrow} maxLength={80}
            desabilitado={!podeEscrever} aoMudar={(v) => setHero("eyebrow", v)} />
          <Campo rotulo="Imagem de fundo (URL)" valor={rascunho.hero.imagemUrl} maxLength={300}
            placeholder="https://…" desabilitado={!podeEscrever}
            dica="Vazio deixa o fundo liso da paleta."
            aoMudar={(v) => setHero("imagemUrl", v)} />
          <Campo rotulo="Botão principal" valor={rascunho.hero.ctaPrimario} maxLength={60}
            desabilitado={!podeEscrever} aoMudar={(v) => setHero("ctaPrimario", v)} />
          <Campo rotulo="Destino do botão principal" valor={rascunho.hero.rotaPrimario} maxLength={200}
            placeholder="/login" desabilitado={!podeEscrever} aoMudar={(v) => setHero("rotaPrimario", v)} />
          <Campo rotulo="Botão secundário" valor={rascunho.hero.ctaSecundario} maxLength={60}
            desabilitado={!podeEscrever} aoMudar={(v) => setHero("ctaSecundario", v)} />
          <Campo rotulo="Destino do botão secundário" valor={rascunho.hero.rotaSecundario} maxLength={200}
            placeholder="/cadastro" desabilitado={!podeEscrever} aoMudar={(v) => setHero("rotaSecundario", v)} />
          <CampoNumero rotulo="Escurecer a imagem (0 a 1)" valor={rascunho.hero.overlay} min={0} max={1} passo={0.05}
            desabilitado={!podeEscrever} aoMudar={(v) => setHero("overlay", v)}
            dica="Sem overlay o texto some sobre a foto." />
          <CampoNumero rotulo="Desfoque (px)" valor={rascunho.hero.desfoque} min={0} max={20}
            desabilitado={!podeEscrever} aoMudar={(v) => setHero("desfoque", v)} />
        </div>
      </Bloco>

      <Bloco
        titulo="WhatsApp"
        sub="O botão flutuante só aparece na vitrine com o canal ligado e um número preenchido."
        acao={
          <BotaoSalvar
            desabilitado={!podeEscrever}
            ocupado={ocupado === "whatsapp"}
            aoSalvar={() => gravar("whatsapp", { whatsapp: rascunho.whatsapp })}
          />
        }
      >
        <div className="nx-grade">
          <CampoLigado rotulo="Botão de WhatsApp ativo" valor={rascunho.whatsapp.ativo}
            desabilitado={!podeEscrever} aoMudar={(v) => setWhats("ativo", v)} />
          <Campo rotulo="Número" valor={rascunho.whatsapp.numero} maxLength={24}
            placeholder="+55 11 90000-0000" desabilitado={!podeEscrever}
            aoMudar={(v) => setWhats("numero", v)} />
          <Campo rotulo="Rótulo do botão" valor={rascunho.whatsapp.rotulo} maxLength={60}
            desabilitado={!podeEscrever} aoMudar={(v) => setWhats("rotulo", v)} />
          <CampoArea rotulo="Mensagem pré-preenchida" valor={rascunho.whatsapp.mensagem} rows={2} maxLength={300}
            desabilitado={!podeEscrever} aoMudar={(v) => setWhats("mensagem", v)} />
          <div className="field">
            <span className="field-label">Posição na tela</span>
            <select
              className="input"
              value={rascunho.whatsapp.posicao}
              disabled={!podeEscrever}
              aria-label="Posição do botão de WhatsApp"
              onChange={(e) => setWhats("posicao", e.target.value)}
            >
              <option value="direita">Direita</option>
              <option value="esquerda">Esquerda</option>
            </select>
          </div>
        </div>
      </Bloco>

      <Bloco
        titulo="Contato"
        sub="O telefone vira link discável e o endereço aparece no rodapé da vitrine."
        acao={
          <BotaoSalvar
            desabilitado={!podeEscrever}
            ocupado={ocupado === "contato"}
            aoSalvar={() => gravar("contato", { contact: rascunho.contact })}
          />
        }
      >
        <div className="nx-grade">
          <Campo rotulo="E-mail" valor={rascunho.contact.email} type="email" maxLength={120}
            desabilitado={!podeEscrever} aoMudar={(v) => setContato("email", v)} />
          <Campo rotulo="Telefone" valor={rascunho.contact.telefone} maxLength={32}
            desabilitado={!podeEscrever} aoMudar={(v) => setContato("telefone", v)} />
          <Campo rotulo="Endereço" valor={rascunho.contact.endereco} maxLength={200}
            desabilitado={!podeEscrever} aoMudar={(v) => setContato("endereco", v)} />
          <Campo rotulo="Horário de atendimento" valor={rascunho.contact.horario} maxLength={120}
            desabilitado={!podeEscrever} aoMudar={(v) => setContato("horario", v)} />
        </div>
      </Bloco>

      <Bloco
        titulo="Redes sociais"
        sub="Até dez links; o rodapé mostra somente os preenchidos."
        acao={
          <BotaoSalvar
            desabilitado={!podeEscrever}
            ocupado={ocupado === "social"}
            aoSalvar={() => gravar("social", { social: { redes: rascunho.social.redes } })}
          />
        }
      >
        <div className="cms-redes">
          {rascunho.social.redes.map((rede, i) => (
            <div className="cms-rede" key={i}>
              <Campo rotulo="Rede" valor={rede.rede} maxLength={30} placeholder="linkedin"
                desabilitado={!podeEscrever} aoMudar={(v) => setRede(i, "rede", v)} />
              <Campo rotulo="Rótulo" valor={rede.rotulo} maxLength={60} placeholder="LinkedIn da Nexus"
                desabilitado={!podeEscrever} aoMudar={(v) => setRede(i, "rotulo", v)} />
              <Campo rotulo="URL (https)" valor={rede.url} maxLength={300} placeholder="https://…"
                desabilitado={!podeEscrever} aoMudar={(v) => setRede(i, "url", v)} />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={!podeEscrever}
                onClick={() => setRascunho((atual) => ({
                  ...atual,
                  social: { redes: atual.social.redes.filter((_, j) => j !== i) },
                }))}
              >
                Remover
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={!podeEscrever || rascunho.social.redes.length >= 10}
          onClick={() => setRascunho((atual) => ({
            ...atual,
            social: { redes: [...atual.social.redes, { rede: "", rotulo: "", url: "" }] },
          }))}
        >
          Adicionar rede
        </button>
      </Bloco>
    </div>
  );
}
