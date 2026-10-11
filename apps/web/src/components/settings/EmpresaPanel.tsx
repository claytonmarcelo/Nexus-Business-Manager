import { useEffect, useState, type ReactNode } from "react";
import { extractErrorMessage, extractFieldErrors } from "../../lib/api";
import { notify } from "../../lib/notify";
import { mascarar, type TipoMascara } from "../../lib/masks";
import { formatCurrency } from "../../lib/format";
import { Bloco, BotaoSalvar, Campo, CampoEscolha, CampoNumeroOpcional } from "../Fields";
import {
  type CampoTextoEmpresa,
  type EmpresaConfig,
  type MudancaEmpresa,
  type OpcoesConfig,
  type ResultadoGravacao,
} from "../../lib/settingsApi";

// ===== Aba "Empresa" =====
// A empresa inteira num formulário só seria um botão único capaz de estragar
// tudo o que a pessoa não olhou. Aqui cada bloco tem seu botão, manda só o que
// mudou e mostra o erro do servidor embaixo do campo correspondente. A chave do
// payload ausente significa "não toca neste campo", e "" significa "limpa".

type CampoBloco = CampoTextoEmpresa | "currency" | "timezone" | "language";

interface Descritor {
  campo: CampoBloco;
  rotulo: string;
  dica?: string;
  mascara?: TipoMascara;
  tipo?: "text" | "email" | "url";
  maxLength?: number;
  /** Quando existe, o campo é uma lista fechada: o valor vem da API, não do teclado. */
  escolha?: { valor: string; rotulo: string }[];
}

function textoDaEmpresa(empresa: EmpresaConfig, campo: CampoBloco): string {
  const bruto = empresa[campo];
  return typeof bruto === "string" ? bruto : "";
}

function originalDe(empresa: EmpresaConfig, d: Descritor): string {
  return mascarar(d.mascara, textoDaEmpresa(empresa, d.campo));
}

interface BlocoProps {
  titulo: string;
  sub: string;
  empresa: EmpresaConfig;
  descritores: Descritor[];
  podeEscrever: boolean;
  aoGravar: (mudanca: MudancaEmpresa) => Promise<ResultadoGravacao>;
  /** Nó extra abaixo da grade, montado com os valores do próprio bloco (a prévia da logo). */
  rodape?: (valores: Record<string, string>) => ReactNode;
}

function BlocoTexto({ titulo, sub, empresa, descritores, podeEscrever, aoGravar, rodape }: BlocoProps) {
  const [valores, setValores] = useState<Record<string, string>>(() => semear());
  const [erros, setErros] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);

  // O servidor é a fonte: cada gravação devolve a empresa nova e o bloco volta
  // a refletir ela — inclusive o que a normalização fez com o texto digitado.
  useEffect(() => {
    setValores(semear());
    setErros({});
  }, [empresa]);

  function semear(): Record<string, string> {
    const sementeira: Record<string, string> = {};
    for (const d of descritores) sementeira[d.campo] = originalDe(empresa, d);
    return sementeira;
  }

  const mudou = descritores.some((d) => valores[d.campo] !== originalDe(empresa, d));

  async function gravar() {
    const mudanca: MudancaEmpresa = {};
    for (const d of descritores) {
      if (valores[d.campo] !== originalDe(empresa, d)) mudanca[d.campo] = valores[d.campo];
    }
    if (Object.keys(mudanca).length === 0) {
      notify.info("Nada para gravar: os campos já estão assim.");
      return;
    }

    setOcupado(true);
    setErros({});
    try {
      const { alterados } = await aoGravar(mudanca);
      notify.success(
        alterados.length === 0
          ? "Nada para gravar: os campos já estavam assim."
          : "Dados da empresa atualizados.",
      );
    } catch (e) {
      setErros(extractFieldErrors(e));
      notify.error(extractErrorMessage(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Bloco
      titulo={titulo}
      sub={sub}
      acao={
        podeEscrever ? (
          <BotaoSalvar aoSalvar={gravar} ocupado={ocupado} desabilitado={!mudou} />
        ) : (
          <span className="nx-bloco-nota">Só quem administra a empresa grava aqui</span>
        )
      }
    >
      <div className="nx-grade">
        {descritores.map((d) => {
          const aoMudar = (novo: string) => setValores((atual) => ({ ...atual, [d.campo]: novo }));
          if (d.escolha) {
            return (
              <CampoEscolha
                key={d.campo}
                rotulo={d.rotulo}
                valor={valores[d.campo]}
                opcoes={opcoesComValorAtual(d.escolha, valores[d.campo])}
                aoMudar={aoMudar}
                dica={d.dica}
                erro={erros[d.campo]}
                desabilitado={!podeEscrever}
              />
            );
          }
          return (
            <Campo
              key={d.campo}
              rotulo={d.rotulo}
              valor={valores[d.campo]}
              aoMudar={(v) => aoMudar(mascarar(d.mascara, v))}
              type={d.tipo ?? "text"}
              maxLength={d.maxLength}
              dica={d.dica}
              erro={erros[d.campo]}
              desabilitado={!podeEscrever}
            />
          );
        })}
      </div>
      {rodape ? rodape(valores) : null}
    </Bloco>
  );
}

/** Um valor antigo fora da lista não pode sumir do select: ele fica marcado como atual. */
function opcoesComValorAtual(
  lista: { valor: string; rotulo: string }[],
  atual: string,
): { valor: string; rotulo: string }[] {
  if (!atual || lista.some((o) => o.valor === atual)) return lista;
  return [{ valor: atual, rotulo: atual + " (valor atual)" }, ...lista];
}

function PreviaLogo({ url }: { url: string }) {
  const [falhou, setFalhou] = useState(false);
  const endereco = url.trim();

  if (endereco === "" || !/^https?:\/\//i.test(endereco)) {
    return (
      <p className="nx-bloco-sub">
        Sem logo cadastrada: o painel e a vitrine seguem mostrando o nome da empresa.
      </p>
    );
  }
  if (falhou) {
    return (
      <p className="nx-bloco-sub">
        O endereço informado não carregou uma imagem. Confira o link — ele precisa ser público.
      </p>
    );
  }
  return (
    <div className="nx-previa">
      <img
        className="nx-previa-img"
        src={endereco}
        alt="Pré-visualização da logo cadastrada"
        onError={() => setFalhou(true)}
      />
      <span className="field-hint">
        Pré-visualização do endereço salvo. Enviar o arquivo ainda não existe no produto.
      </span>
    </div>
  );
}

function BlocoMeta({
  empresa, podeEscrever, aoGravar,
}: {
  empresa: EmpresaConfig;
  podeEscrever: boolean;
  aoGravar: (mudanca: MudancaEmpresa) => Promise<ResultadoGravacao>;
}) {
  const [meta, setMeta] = useState<number | null>(empresa.revenueTarget);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    setMeta(empresa.revenueTarget);
    setErros({});
  }, [empresa]);

  const mudou = meta !== empresa.revenueTarget;

  async function gravar() {
    setOcupado(true);
    setErros({});
    try {
      const { alterados } = await aoGravar({ revenueTarget: meta });
      notify.success(
        alterados.length === 0
          ? "Nada para gravar: a meta já é essa."
          : meta === null
            ? "A empresa está sem meta de receita."
            : "Meta de receita atualizada.",
      );
    } catch (e) {
      setErros(extractFieldErrors(e));
      notify.error(extractErrorMessage(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Bloco
      titulo="Meta de receita do mês"
      sub="É a régua do painel: o card de meta compara a venda do mês com este valor."
      acao={
        podeEscrever ? (
          <BotaoSalvar aoSalvar={gravar} ocupado={ocupado} desabilitado={!mudou} />
        ) : (
          <span className="nx-bloco-nota">Só quem administra a empresa grava aqui</span>
        )
      }
    >
      <div className="nx-grade">
        <CampoNumeroOpcional
          rotulo="Valor da meta"
          valor={meta}
          aoMudar={setMeta}
          min={0}
          max={9_999_999_999.99}
          passo={0.01}
          desabilitado={!podeEscrever}
          erro={erros.revenueTarget}
          dica={
            meta === null
              ? "Vazio significa sem meta: o painel explica como definir uma."
              : "No formato da empresa: " + formatCurrency(meta) + " por mês."
          }
        />
      </div>
    </Bloco>
  );
}

export interface EmpresaPanelProps {
  empresa: EmpresaConfig;
  opcoes: OpcoesConfig;
  podeEscrever: boolean;
  aoGravar: (mudanca: MudancaEmpresa) => Promise<ResultadoGravacao>;
}

export function EmpresaPanel({ empresa, opcoes, podeEscrever, aoGravar }: EmpresaPanelProps) {
  const ufs = opcoes.ufs.map((uf) => ({ valor: uf, rotulo: uf }));
  const moedas = opcoes.moedas.map((m) => ({ valor: m.codigo, rotulo: m.codigo + " · " + m.rotulo }));
  const idiomas = opcoes.idiomas.map((i) => ({ valor: i.codigo, rotulo: i.rotulo }));
  const fusos = opcoes.fusos.map((f) => ({ valor: f, rotulo: f }));

  return (
    <div className="nx-painel">
      <BlocoTexto
        titulo="Identificação"
        sub="O que a empresa é, para os documentos que o sistema ajuda a emitir."
        empresa={empresa}
        podeEscrever={podeEscrever}
        aoGravar={aoGravar}
        descritores={[
          {
            campo: "name",
            rotulo: "Nome da empresa",
            maxLength: 120,
            dica: "Sempre preenchido: é como o painel apresenta a empresa.",
          },
          { campo: "legalName", rotulo: "Razão social", maxLength: 160 },
          { campo: "tradeName", rotulo: "Nome fantasia", maxLength: 160 },
          {
            campo: "cnpj",
            rotulo: "CNPJ",
            mascara: "cnpj",
            maxLength: 18,
            dica: "A API confere os 14 dígitos e o dígito verificador.",
          },
          { campo: "email", rotulo: "E-mail de contato", tipo: "email", maxLength: 160 },
          { campo: "phone", rotulo: "Telefone", mascara: "telefone", maxLength: 19 },
        ]}
      />

      <BlocoTexto
        titulo="Endereço"
        sub="Usado nos documentos e no rodapé do que a empresa emite."
        empresa={empresa}
        podeEscrever={podeEscrever}
        aoGravar={aoGravar}
        descritores={[
          { campo: "zipCode", rotulo: "CEP", mascara: "cep", maxLength: 9 },
          { campo: "street", rotulo: "Logradouro", maxLength: 160 },
          { campo: "number", rotulo: "Número", maxLength: 32 },
          { campo: "district", rotulo: "Bairro", maxLength: 80 },
          { campo: "city", rotulo: "Cidade", maxLength: 80 },
          { campo: "stateUf", rotulo: "Estado (UF)", escolha: ufs, maxLength: 2 },
        ]}
      />

      <BlocoTexto
        titulo="Formato de números e datas"
        sub="Estes três valores governam o painel inteiro: o símbolo e o separador dos valores, o fuso de cada data e hora, e o idioma da numeração."
        empresa={empresa}
        podeEscrever={podeEscrever}
        aoGravar={aoGravar}
        descritores={[
          { campo: "currency", rotulo: "Moeda", escolha: moedas, dica: "Também é o símbolo usado na meta de receita." },
          { campo: "timezone", rotulo: "Fuso horário", escolha: fusos, dica: "Os horários das agendas e dos relatórios são lidos por aqui." },
          { campo: "language", rotulo: "Idioma da numeração", escolha: idiomas, dica: "Muda a escrita de números e datas; o texto do painel continua em português." },
        ]}
      />

      <BlocoTexto
        titulo="Identidade visual"
        sub="A logo aparece no topo do painel e na vitrine pública."
        empresa={empresa}
        podeEscrever={podeEscrever}
        aoGravar={aoGravar}
        descritores={[
          {
            campo: "logoUrl",
            rotulo: "Endereço da logo",
            tipo: "url",
            maxLength: 255,
            dica: "http(s) completo. Enviar o arquivo ainda não existe no produto.",
          },
        ]}
        rodape={(valores) => <PreviaLogo key={valores.logoUrl ?? ""} url={valores.logoUrl ?? ""} />}
      />

      <BlocoMeta empresa={empresa} podeEscrever={podeEscrever} aoGravar={aoGravar} />
    </div>
  );
}
