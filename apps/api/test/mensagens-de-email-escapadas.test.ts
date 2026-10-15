import { describe, expect, it } from "vitest";
import {
  avisoDeNotificacao,
  avisoDeSegundoFator,
  mensagemDeRecuperacao,
  mensagemDeVerificacao,
} from "../src/lib/mail/mensagens";

// N76 (F7): as três mensagens antigas mandavam o primeiro nome de quem pediu direto
// para dentro do HTML, sem escape, e o link da verificação ia cru para o atributo
// `href`. O `textoSeguro` que fecha essa porta já existia neste módulo — ele só era
// aplicado no aviso de notificação (N59), a única das quatro que interpola dado de
// terceiro.
//
// O dano aqui é auto-XSS, não XSS entre pessoas: quem escreve o nome no cadastro
// injeta markup na própria mensagem. Mas ela é lida fora do produto, no cliente de
// e-mail, onde um `<img onerror>` executa no contexto de quem abriu — e o mesmo nome
// chega por aqui quando um ADMIN cadastra um usuário da equipe. Escapar é a
// correção; o teste existe para as quatro mensagens não voltarem a divergir.
//
// Teste puro, sem banco e sem servidor: ele mede a string que o módulo devolve.
// Os endereços são de exemplo, nenhum é caixa postal de ninguém.

// Só o PRIMEIRO token do nome é interpolado (o módulo recorta o primeiro nome),
// então é nele que a marca precisa estar para a prova valer.
const PRIMEIRO_NOME_COM_MARCA = "<b>Ana</b> da Silva";
const PRIMEIRO_NOME_COM_ASPA = '"citada" da Silva';

interface QuatroMensagens {
  rotulo: string;
  html: string;
  texto: string;
}

/** As quatro mensagens que o produto sabe mandar, para o mesmo nome. */
function mensagensPara(nome: string): QuatroMensagens[] {
  return [
    mensagemDeRecuperacao({
      para: "ana@nexus.test", nome, codigo: "482913", validadeEmMinutos: 15,
    }),
    mensagemDeVerificacao({
      para: "ana@nexus.test", nome,
      link: "https://produto.test/confirmar-email?codigo=482913",
      codigo: "482913", validadeEmDias: 7,
    }),
    avisoDeSegundoFator({ para: "ana@nexus.test", nome, acao: "ativado" }),
    avisoDeNotificacao({
      para: "ana@nexus.test", nome,
      empresa: "Empresa <x>", titulo: 'Venda "confirmada"', corpo: "<i>corpo</i>",
      link: "https://produto.test/app/vendas",
    }),
  ].map((m) => ({ rotulo: m.rotulo ?? "", html: m.html ?? "", texto: m.texto }));
}

describe("Escape de HTML nas mensagens de e-mail (N76)", () => {
  it("nenhuma das quatro mensagens devolve o nome como marca crua", () => {
    for (const m of mensagensPara(PRIMEIRO_NOME_COM_MARCA)) {
      expect(m.html, m.rotulo).not.toContain("<b>Ana</b>");
      expect(m.html, m.rotulo).toContain("&lt;b&gt;Ana&lt;/b&gt;");
      // A estrutura da mensagem continua de pé: o escape não comeu o HTML do módulo.
      expect(m.html, m.rotulo).toContain("<h2>");
      expect(m.html, m.rotulo).toContain("Nexus Business Manager");
    }
  });

  it("a aspa digitada no nome não fecha atributo nem texto", () => {
    for (const m of mensagensPara(PRIMEIRO_NOME_COM_ASPA)) {
      expect(m.html, m.rotulo).toContain("&quot;citada&quot;");
      expect(m.html, m.rotulo).not.toContain('<p>Olá, "citada"');
    }
  });

  it("o texto puro preserva o nome como ele foi digitado", () => {
    // Escape é regra de HTML. Em `text/plain` a marca não executa, e reescrever o
    // nome da pessoa para `&lt;b&gt;` seria trocar o texto por entidade.
    for (const m of mensagensPara(PRIMEIRO_NOME_COM_MARCA)) {
      expect(m.texto, m.rotulo).toContain("Olá, <b>Ana</b>.");
      expect(m.texto, m.rotulo).not.toContain("&lt;");
    }
  });

  it("o dado de terceiro do aviso de notificação continua escapado", () => {
    // É a mensagem que já fazia isso direito; entra aqui para as quatro ficarem na
    // mesma régua e para ninguém "simplificar" o escape dela no futuro.
    const [aviso] = mensagensPara("Ana").slice(-1);
    expect(aviso!.html).not.toContain("<i>corpo</i>");
    expect(aviso!.html).not.toContain("<x>");
    expect(aviso!.html).toContain("&lt;i&gt;corpo&lt;/i&gt;");
    expect(aviso!.html).toContain("Empresa &lt;x&gt;");
    expect(aviso!.html).toContain("&quot;confirmada&quot;");
    expect(aviso!.rotulo).toBe("aviso-de-notificacao");
  });

  it("o link da verificação não fecha o atributo antes da hora", () => {
    const linkQuebraAtributo = 'https://produto.test/a?x=1" onmouseover="alert(1)';
    const m = mensagemDeVerificacao({
      para: "ana@nexus.test",
      nome: "Ana",
      link: linkQuebraAtributo,
      codigo: "482913",
      validadeEmDias: 7,
    });
    const casado = /<a href="([^"]*)">/.exec(m.html ?? "");
    expect(casado, m.html).not.toBeNull();
    // Dentro do atributo não sobrou aspa nenhuma: ela sai percent-encoded.
    expect(casado![1]).not.toContain('"');
    expect(casado![1]).toContain("https://produto.test/a?x=1");
    // O texto puro mostra o link exatamente como ele é.
    expect(m.texto).toContain(linkQuebraAtributo);
  });

  it("um link com marca também não abre markup na mensagem", () => {
    const m = mensagemDeVerificacao({
      para: "ana@nexus.test",
      nome: "Ana",
      link: "https://produto.test/<script>alert(1)</script>",
      codigo: "482913",
      validadeEmDias: 7,
    });
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain('<a href="https://produto.test/%3Cscript%3E');
  });

  it("o nome vazio continua virando o tratamento neutro", () => {
    const m = mensagemDeRecuperacao({
      para: "ana@nexus.test", nome: "   ", codigo: "482913", validadeEmMinutos: 15,
    });
    expect(m.html).toContain("Olá, você.");
  });

  it("só as tags que este módulo escreve aparecem no HTML", () => {
    // Guarda estrutural: se algum escape for retirado no futuro, uma tag que não
    // está na lista do módulo aparece aqui. As quatro mensagens montam o mesmo
    // esqueleto — div, h2, p, code, strong e a âncora dos dois links.
    const permitidas = new Set(["div", "h2", "p", "code", "a", "strong"]);
    const vistas = new Set<string>();
    for (const m of mensagensPara(PRIMEIRO_NOME_COM_MARCA)) {
      for (const achada of m.html.match(/<\/?([a-zA-Z][a-zA-Z0-9]*)/g) ?? []) {
        const nome = achada.replace(/<\/?/, "").toLowerCase();
        expect(permitidas.has(nome), `${m.rotulo}: ${achada}`).toBe(true);
        vistas.add(nome);
      }
    }
    // E a mensagem não virou texto puro: as tags do esqueleto continuam lá.
    expect([...vistas].sort()).toEqual(["a", "code", "div", "h2", "p", "strong"]);
  });
});
