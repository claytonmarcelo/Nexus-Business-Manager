import { useCallback, useEffect, useMemo, useState } from "react";
import { extractErrorMessage } from "../../lib/api";
import { notify } from "../../lib/notify";
import { confirmAction } from "../../lib/confirm";
import { Modal, useDirty } from "../Modal";
import { EmptyState, ErrorState, LoadingInline } from "../StateView";
import { Campo, CampoEscolha, CampoLigado, CampoNumero } from "./Campos";
import {
  KINDS,
  criarItem,
  lerItens,
  removerItem,
  atualizarItem,
  type ItemEnviar,
  type KindItem,
} from "../../lib/cmsApi";
import { numeroMeta, textoMeta, type ItemEditorado } from "../../lib/landingTypes";

// ===== Aba Itens =====
// Uma tabela por tipo de conteúdo, porque os cinco tipos dividem a mesma
// landing_items e cada um tem os seus extras no `meta` Json. O formulário só
// mostra o campo que aquele tipo usa: pedir "estrelas" numa FAQ seria mentira.

interface Rascunho {
  id: string | null;
  kind: KindItem;
  title: string;
  body: string;
  imageUrl: string;
  link: string;
  author: string;
  role: string;
  order: number;
  active: boolean;
  // Extras do meta, sempre como texto; a conversão para número acontece na
  // hora de gravar, para o campo não apagar o que a pessoa está digitando.
  icone: string;
  rota: string;
  estrelas: string;
  empresa: string;
  valor: string;
  formato: string;
  unidade: string;
}

function rascunhoNovo(kind: KindItem): Rascunho {
  return {
    id: null, kind, title: "", body: "", imageUrl: "", link: "", author: "", role: "",
    order: 0, active: true,
    icone: "", rota: "", estrelas: "", empresa: "", valor: "", formato: "numero", unidade: "",
  };
}

function rascunhoDoItem(item: ItemEditorado): Rascunho {
  return {
    id: item.id,
    kind: item.kind as KindItem,
    title: item.title,
    body: item.body ?? "",
    imageUrl: item.imageUrl ?? "",
    link: item.link ?? "",
    author: item.author ?? "",
    role: item.role ?? "",
    order: item.order,
    active: item.active,
    icone: textoMeta(item.meta, "icone"),
    rota: textoMeta(item.meta, "rota"),
    estrelas: String(numeroMeta(item.meta, "estrelas") ?? ""),
    empresa: textoMeta(item.meta, "empresa"),
    valor: String(numeroMeta(item.meta, "valor") ?? ""),
    formato: textoMeta(item.meta, "formato") || "numero",
    unidade: textoMeta(item.meta, "unidade"),
  };
}

/** Monta o `meta` só com o que o tipo usa e o que a pessoa preencheu. */
function metaDoRascunho(r: Rascunho): Record<string, unknown> | null {
  const meta: Record<string, unknown> = {};
  if (r.kind === "FEATURE") {
    if (r.icone.trim()) meta.icone = r.icone.trim();
    if (r.rota.trim()) meta.rota = r.rota.trim();
  }
  if (r.kind === "TESTIMONIAL") {
    const estrelas = Number(r.estrelas);
    if (r.estrelas.trim() !== "" && Number.isFinite(estrelas)) meta.estrelas = estrelas;
    if (r.empresa.trim()) meta.empresa = r.empresa.trim();
  }
  if (r.kind === "METRIC") {
    const valor = Number(r.valor.replace(",", "."));
    if (r.valor.trim() !== "" && Number.isFinite(valor)) meta.valor = valor;
    meta.formato = r.formato;
    if (r.unidade.trim()) meta.unidade = r.unidade.trim();
  }
  return Object.keys(meta).length > 0 ? meta : null;
}

function corpoDoRascunho(r: Rascunho): ItemEnviar {
  const limpo = (v: string) => (v.trim() === "" ? null : v.trim());
  return {
    kind: r.kind,
    title: r.title.trim(),
    body: limpo(r.body),
    imageUrl: limpo(r.imageUrl),
    link: limpo(r.link),
    author: limpo(r.author),
    role: limpo(r.role),
    order: r.order,
    active: r.active,
    meta: metaDoRascunho(r),
  };
}

function resumoDoItem(item: ItemEditorado): string {
  if (item.kind === "FEATURE") {
    const icone = textoMeta(item.meta, "icone");
    return icone ? "Ícone " + icone : "Sem ícone";
  }
  if (item.kind === "TESTIMONIAL") {
    const estrelas = numeroMeta(item.meta, "estrelas");
    return (estrelas ? estrelas + " estrelas" : "Sem estrelas") +
      (textoMeta(item.meta, "empresa") ? " · " + textoMeta(item.meta, "empresa") : "");
  }
  if (item.kind === "METRIC") {
    const valor = numeroMeta(item.meta, "valor");
    return valor === null ? "Sem valor" : valor + " (" + textoMeta(item.meta, "formato") + ")";
  }
  return item.link ?? (item.body ? item.body.slice(0, 60) : "—");
}

interface Props {
  podeEscrever: boolean;
}

export function ItensPanel({ podeEscrever }: Props) {
  const [kind, setKind] = useState<KindItem>("FEATURE");
  const [itens, setItens] = useState<ItemEditorado[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<Rascunho | null>(null);
  const [salvando, setSalvando] = useState(false);
  const sujo = useDirty(editando);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setItens(await lerItens(kind));
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, [kind]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const tipo = useMemo(() => KINDS.find((k) => k.kind === kind) ?? KINDS[0], [kind]);

  async function salvar() {
    if (!editando) return;
    if (editando.title.trim().length < 2) {
      notify.error("Dê um título com pelo menos 2 caracteres.");
      return;
    }
    setSalvando(true);
    try {
      const corpo = corpoDoRascunho(editando);
      if (editando.id) await atualizarItem(editando.id, corpo);
      else await criarItem(corpo);
      notify.success(editando.id ? "Item atualizado." : "Item criado.");
      setEditando(null);
      await carregar();
    } catch (e) {
      notify.error(extractErrorMessage(e));
    } finally {
      setSalvando(false);
    }
  }

  async function alternar(item: ItemEditorado) {
    try {
      await atualizarItem(item.id, { active: !item.active });
      notify.success(item.active ? "Item escondido da vitrine." : "Item visível na vitrine.");
      await carregar();
    } catch (e) {
      notify.error(extractErrorMessage(e));
    }
  }

  async function excluir(item: ItemEditorado) {
    await confirmAction({
      title: "Excluir item do site",
      text: "Excluir o item {nome}?",
      nome: item.title,
      detalhe: "Ele sai da vitrine na hora e não volta: o conteúdo é apagado do banco.",
      confirmLabel: "Excluir",
      danger: true,
      action: async () => {
        await removerItem(item.id);
        notify.success("Item excluído.");
        await carregar();
      },
    });
  }

  const mudar = (mudanca: Partial<Rascunho>) =>
    setEditando((atual) => (atual ? { ...atual, ...mudanca } : atual));

  return (
    <div className="cms-painel">
      <div className="cms-tipos" role="group" aria-label="Tipo de conteúdo">
        {KINDS.map((k) => (
          <button
            key={k.kind}
            type="button"
            className={"btn btn-sm " + (k.kind === kind ? "btn-brand" : "btn-ghost")}
            aria-pressed={k.kind === kind}
            title={k.hint}
            onClick={() => setKind(k.kind)}
          >
            {k.plural}
          </button>
        ))}
      </div>

      <div className="cms-acima-da-lista">
        <p className="cms-dica">{tipo.hint}. O que estiver inativo não aparece na página pública.</p>
        {podeEscrever ? (
          <button
            type="button"
            className="btn btn-brand btn-sm"
            onClick={() => setEditando(rascunhoNovo(kind))}
          >
            Novo {tipo.rotulo.toLowerCase()}
          </button>
        ) : null}
      </div>

      {carregando ? (
        <LoadingInline label="Carregando o conteúdo…" />
      ) : erro ? (
        <ErrorState message={erro} onRetry={carregar} />
      ) : !itens || itens.length === 0 ? (
        <EmptyState
          title={"Nenhum " + tipo.rotulo.toLowerCase() + " cadastrado"}
          description={
            podeEscrever
              ? "Crie o primeiro para ver a seção aparecer na vitrine."
              : "Quem responde pelo site público ainda não cadastrou nada aqui."
          }
        />
      ) : (
        <div className="card-surface table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Título</th>
                <th scope="col">Detalhe</th>
                <th scope="col">Ordem</th>
                <th scope="col">Situação</th>
                {podeEscrever ? <th scope="col" className="col-acoes">Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td className="cms-celula-suave">{resumoDoItem(item)}</td>
                  <td>{item.order}</td>
                  <td>
                    <span className={"status-pill " + (item.active ? "is-on" : "is-off")}>
                      {item.active ? "Visível" : "Escondido"}
                    </span>
                  </td>
                  {podeEscrever ? (
                    <td>
                      <div className="row-actions">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditando(rascunhoDoItem(item))}>
                          Editar
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void alternar(item)}>
                          {item.active ? "Esconder" : "Mostrar"}
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void excluir(item)}>
                          Excluir
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editando ? (
        <Modal
          title={(editando.id ? "Editar " : "Novo ") + tipo.rotulo.toLowerCase()}
          subtitle={tipo.hint}
          onClose={() => setEditando(null)}
          onSubmit={salvar}
          busy={salvando}
          busyLabel="Salvando…"
          dirty={sujo}
          size="lg"
        >
          <div className="cms-grade">
            <Campo rotulo="Título *" valor={editando.title} maxLength={200}
              dica="De 2 a 200 caracteres." aoMudar={(v) => mudar({ title: v })} />
            <CampoNumero rotulo="Ordem" valor={editando.order} min={0} max={999}
              dica="Menor aparece primeiro." aoMudar={(v) => mudar({ order: v })} />
            <div className="field field-full">
              <span className="field-label">Texto</span>
              <textarea className="input" rows={4} value={editando.body} maxLength={4000}
                aria-label="Texto do item" onChange={(e) => mudar({ body: e.target.value })} />
            </div>

            {kind === "BANNER" ? (
              <>
                <Campo rotulo="Imagem (URL)" valor={editando.imageUrl} maxLength={255}
                  placeholder="https://…" aoMudar={(v) => mudar({ imageUrl: v })} />
                <Campo rotulo="Link" valor={editando.link} maxLength={200}
                  placeholder="/cadastro" aoMudar={(v) => mudar({ link: v })} />
              </>
            ) : null}

            {kind === "FEATURE" ? (
              <>
                <Campo rotulo="Ícone (1 caractere)" valor={editando.icone} maxLength={8}
                  dica="Um glifo, como ▦ ou ." aoMudar={(v) => mudar({ icone: v })} />
                <Campo rotulo="Âncora no site" valor={editando.rota} maxLength={200}
                  placeholder="#recursos" aoMudar={(v) => mudar({ rota: v })} />
              </>
            ) : null}

            {kind === "TESTIMONIAL" ? (
              <>
                <Campo rotulo="Autor" valor={editando.author} maxLength={120}
                  aoMudar={(v) => mudar({ author: v })} />
                <Campo rotulo="Cargo" valor={editando.role} maxLength={120}
                  aoMudar={(v) => mudar({ role: v })} />
                <CampoNumero rotulo="Estrelas" valor={Number(editando.estrelas) || 0} min={0} max={5}
                  aoMudar={(v) => mudar({ estrelas: String(v) })} />
                <Campo rotulo="Empresa" valor={editando.empresa} maxLength={120}
                  aoMudar={(v) => mudar({ empresa: v })} />
              </>
            ) : null}

            {kind === "METRIC" ? (
              <>
                <Campo rotulo="Valor" valor={editando.valor} maxLength={24}
                  dica="Só números, com vírgula se precisar."
                  aoMudar={(v) => mudar({ valor: v })} />
                <CampoEscolha rotulo="Formato" valor={editando.formato}
                  opcoes={[
                    { valor: "numero", rotulo: "Número" },
                    { valor: "moeda", rotulo: "Moeda (R$)" },
                    { valor: "porcentagem", rotulo: "Porcentagem (%)" },
                    { valor: "texto", rotulo: "Texto livre" },
                  ]}
                  aoMudar={(v) => mudar({ formato: v })} />
                <Campo rotulo="Unidade" valor={editando.unidade} maxLength={24}
                  aoMudar={(v) => mudar({ unidade: v })} />
              </>
            ) : null}

            <CampoLigado rotulo="Visível na vitrine" valor={editando.active}
              aoMudar={(v) => mudar({ active: v })} />
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
