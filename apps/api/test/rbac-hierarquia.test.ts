import { describe, it, expect, afterAll } from "vitest";
import { app, makeAccount, login, cleanup, uid, type Fixture } from "./helpers";
import { prisma } from "../src/lib/prisma";
import { podeAtribuirPapel } from "../src/lib/rbac";

// A1 do prompt de mercado — a hierarquia de papéis deixa de ser um "if" copiado
// em cada rota e passa a morar numa função só (`podeAtribuirPapel`, em
// `lib/rbac.ts`), consultada por toda escrita de papel. O retrato antes disto:
//  · o POST /users aceitava `role: "OWNER"` de qualquer papel com `user:write`,
//    então um ADMIN se auto-concedia o "*" do RBAC — bastava um convite;
//  · o PATCH protegia quem estava SENDO promovido a OWNER, mas não quem já era:
//    o mesmo ADMIN rebaixava o proprietário a STAFF e tomava a empresa;
//  · ADMIN mexia em outro ADMIN, ninguém era seguro em relação ao próprio papel
//    e uma empresa podia acordar sem nenhum proprietário.
// As regras provadas aqui são as que o produto vende: só OWNER cria ou retira
// OWNER; ADMIN cuida de MANAGER e STAFF; MANAGER e STAFF não gerenciam ninguém;
// ninguém altera o próprio papel; e a empresa nunca fica sem dono.
describe("Hierarquia de papéis (A1)", () => {
  const criados: { userIds: string[]; companyIds: string[] } = { userIds: [], companyIds: [] };
  const tokens = new Map<string, string>();

  afterAll(async () => {
    await cleanup(criados);
  });

  // Conta nova, empresa nova, token na mão.
  async function conta(role: "OWNER" | "ADMIN" | "MANAGER" | "STAFF"): Promise<Fixture> {
    const f = await makeAccount(role);
    criados.userIds.push(f.userId);
    criados.companyIds.push(f.companyId);
    tokens.set(f.userId, await login(f.email, f.password));
    return f;
  }

  // Membro criado pelo OWNER dentro da empresa dele — é assim que um ADMIN,
  // MANAGER ou STAFF de teste entra num cenário real, sem escrever no banco.
  async function criadoPor(
    dono: Fixture,
    role: "OWNER" | "ADMIN" | "MANAGER" | "STAFF",
  ): Promise<Fixture> {
    const email = `${uid("m")}@nexus.test`;
    const senha = "SenhaForte123!";
    const res = await app.inject({
      method: "POST",
      url: "/api/users",
      headers: { authorization: `Bearer ${tokens.get(dono.userId)}` },
      payload: { email, name: "Membro de teste", password: senha, role },
    });
    if (res.statusCode !== 201) throw new Error(`criação falhou: ${res.statusCode} ${res.body}`);
    const corpo = res.json() as { id: string; email: string };
    const f: Fixture = { userId: corpo.id, companyId: dono.companyId, email: corpo.email, password: senha };
    criados.userIds.push(f.userId);
    tokens.set(f.userId, await login(f.email, senha));
    return f;
  }

  async function chamar(
    method: "POST" | "PATCH",
    url: string,
    ator: Fixture,
    body: unknown,
  ) {
    return app.inject({
      method,
      url,
      headers: { authorization: `Bearer ${tokens.get(ator.userId)}` },
      payload: body as object,
    });
  }

  const convite = (role: string) => ({
    email: `${uid("c")}@nexus.test`,
    name: "Convidado de teste",
    password: "SenhaForte123!",
    role,
  });

  const papelDe = async (userId: string, companyId: string) =>
    (
      await prisma.companyUser.findUnique({
        where: { userId_companyId: { userId, companyId } },
      })
    )?.role;

  // ---- 1. OWNER só nasce das mãos do OWNER ----

  it("ADMIN não consegue criar um membro como OWNER", async () => {
    const admin = await conta("ADMIN");
    const res = await chamar("POST", "/api/users", admin, convite("OWNER"));
    expect(res.statusCode).toBe(403);
    expect(res.json().message).toBe("Só o proprietário pode criar um proprietário.");
    expect(await papelDe(admin.userId, admin.companyId)).toBe("ADMIN");
    // a empresa deste ADMIN não tem dono nenhum — nem passou a ter um falso
    const donos = await prisma.companyUser.count({
      where: { companyId: admin.companyId, role: "OWNER" },
    });
    expect(donos).toBe(0);
  });

  it("ADMIN não consegue rebaixar um OWNER", async () => {
    const dono = await conta("OWNER");
    const admin = await criadoPor(dono, "ADMIN");

    const res = await chamar("PATCH", `/api/users/${dono.userId}/role`, admin, { role: "STAFF" });
    expect(res.statusCode).toBe(403);
    expect(res.json().message).toBe("Só o proprietário pode criar ou rebaixar um proprietário.");
    expect(await papelDe(dono.userId, dono.companyId)).toBe("OWNER");
  });

  it("ADMIN não se promove a OWNER nem mexe no próprio papel", async () => {
    const dono = await conta("OWNER");
    const admin = await criadoPor(dono, "ADMIN");

    const sePromova = await chamar("PATCH", `/api/users/${admin.userId}/role`, admin, { role: "OWNER" });
    expect(sePromova.statusCode).toBe(403);
    expect(sePromova.json().message).toBe("Você não pode alterar o seu próprio papel.");

    const seRebaixe = await chamar("PATCH", `/api/users/${admin.userId}/role`, admin, { role: "STAFF" });
    expect(seRebaixe.statusCode).toBe(403);
    expect(seRebaixe.json().message).toBe("Você não pode alterar o seu próprio papel.");
    expect(await papelDe(admin.userId, admin.companyId)).toBe("ADMIN");
  });

  // ---- 2. ADMIN cuida só de MANAGER e STAFF ----

  it("ADMIN não altera outro ADMIN", async () => {
    const dono = await conta("OWNER");
    const a = await criadoPor(dono, "ADMIN");
    const b = await criadoPor(dono, "ADMIN");

    const mexida = await chamar("PATCH", `/api/users/${b.userId}/role`, a, { role: "STAFF" });
    expect(mexida.statusCode).toBe(403);
    expect(mexida.json().message).toBe("O administrador cuida só de gerentes e atendentes.");
    expect(await papelDe(b.userId, b.companyId)).toBe("ADMIN");
  });

  it("ADMIN cria MANAGER e STAFF, mas não cria outro ADMIN", async () => {
    const dono = await conta("OWNER");
    const admin = await criadoPor(dono, "ADMIN");

    for (const papel of ["MANAGER", "STAFF"] as const) {
      const res = await chamar("POST", "/api/users", admin, convite(papel));
      expect(res.statusCode, papel).toBe(201);
      expect(res.json().role).toBe(papel);
    }

    const outroAdmin = await chamar("POST", "/api/users", admin, convite("ADMIN"));
    expect(outroAdmin.statusCode).toBe(403);
    expect(outroAdmin.json().message).toBe("O administrador cuida só de gerentes e atendentes.");
  });

  // ---- 3. A empresa nunca fica sem proprietário ----

  it("o último proprietário não consegue sair do papel", async () => {
    const dono = await conta("OWNER");

    // Único dono da empresa se rebaixando: a resposta honesta é 409, porque o
    // que está em jogo antes de qualquer coisa é a empresa perder o dono.
    const seRebaixe = await chamar("PATCH", `/api/users/${dono.userId}/role`, dono, { role: "ADMIN" });
    expect(seRebaixe.statusCode).toBe(409);
    expect(seRebaixe.json().message).toBe(
      "A empresa precisa continuar com pelo menos um proprietário.",
    );
    expect(await papelDe(dono.userId, dono.companyId)).toBe("OWNER");
  });

  it("com dois donos ninguém mexe no próprio papel, e rebaixar o outro é lícito", async () => {
    const primeiro = await conta("OWNER");
    const segundo = await criadoPor(primeiro, "OWNER");

    const primeiroSai = await chamar(
      "PATCH",
      `/api/users/${primeiro.userId}/role`,
      primeiro,
      { role: "ADMIN" },
    );
    expect(primeiroSai.statusCode).toBe(403);
    expect(primeiroSai.json().message).toBe("Você não pode alterar o seu próprio papel.");

    const rebaixaColega = await chamar(
      "PATCH",
      `/api/users/${segundo.userId}/role`,
      primeiro,
      { role: "STAFF" },
    );
    expect(rebaixaColega.statusCode).toBe(200);
    expect(await papelDe(segundo.userId, segundo.companyId)).toBe("STAFF");

    // Sobrou um dono só: quem tenta rebaixá-lo agora é o ex-dono, já STAFF, e
    // cai primeiro na regra de que só OWNER mexe em OWNER.
    const orphanato = await chamar(
      "PATCH",
      `/api/users/${primeiro.userId}/role`,
      segundo,
      { role: "STAFF" },
    );
    expect(orphanato.statusCode).toBe(403);

    // O próprio dono único tentando sair: 409, pelo mesmo motivo de sempre.
    const ultimoSaindo = await chamar(
      "PATCH",
      `/api/users/${primeiro.userId}/role`,
      primeiro,
      { role: "MANAGER" },
    );
    expect(ultimoSaindo.statusCode).toBe(409);
  });

  // ---- 4. Quem não gerencia equipe não encosta na rota ----

  it("MANAGER e STAFF ficam fora de toda rota de papel", async () => {
    const dono = await conta("OWNER");
    const gerente = await criadoPor(dono, "MANAGER");
    const atendente = await criadoPor(dono, "STAFF");

    for (const ator of [gerente, atendente]) {
      const cria = await chamar("POST", "/api/users", ator, convite("STAFF"));
      expect(cria.statusCode).toBe(403);
      const mexe = await chamar("PATCH", `/api/users/${dono.userId}/role`, ator, { role: "STAFF" });
      expect(mexe.statusCode).toBe(403);
    }
  });

  // ---- 5. O proprietário continua no controle ----

  it("o proprietário cria ADMIN e OWNER e altera gerente", async () => {
    const dono = await conta("OWNER");
    const adm = await chamar("POST", "/api/users", dono, convite("ADMIN"));
    expect(adm.statusCode).toBe(201);
    const outro = await chamar("POST", "/api/users", dono, convite("OWNER"));
    expect(outro.statusCode).toBe(201);

    const troca = await chamar(
      "PATCH",
      `/api/users/${(adm.json() as { id: string }).id}/role`,
      dono,
      { role: "MANAGER" },
    );
    expect(troca.statusCode).toBe(200);
    expect(troca.json().role).toBe("MANAGER");
  });

  it("o administrador definitivo do sistema não perde o OWNER", async () => {
    const dono = await conta("OWNER");
    const plataforma = await makeAccount("STAFF", { plataforma: true });
    criados.userIds.push(plataforma.userId);
    criados.companyIds.push(plataforma.companyId);
    tokens.set(plataforma.userId, await login(plataforma.email, plataforma.password));

    // O administrador da plataforma entra como OWNER na empresa do dono, e o
    // dono tenta rebaixá-lo: a trava de plataforma responde antes de qualquer
    // outra regra, porque derrubar essa conta é derrubar o produto inteiro.
    await prisma.companyUser.create({
      data: { userId: plataforma.userId, companyId: dono.companyId, role: "OWNER" },
    });
    const derruba = await chamar(
      "PATCH",
      `/api/users/${plataforma.userId}/role`,
      dono,
      { role: "STAFF" },
    );
    expect(derruba.statusCode).toBe(409);
    expect(derruba.json().message).toBe(
      "O administrador definitivo do sistema não pode ser rebaixado de OWNER",
    );
    expect(await papelDe(plataforma.userId, dono.companyId)).toBe("OWNER");
  });

  // ---- 6. A regra pura, sem HTTP, para a leitura do contrato ----

  it("podeAtribuirPapel decide as regras sem tocar no banco", () => {
    const sim = (a: Parameters<typeof podeAtribuirPapel>[0]) =>
      expect(podeAtribuirPapel(a).ok).toBe(true);
    const nao = (
      a: Parameters<typeof podeAtribuirPapel>[0],
      status: 403 | 409,
      mensagem: string,
    ) => expect(podeAtribuirPapel(a)).toEqual({ ok: false, status, mensagem });

    sim({ ator: "ADMIN", novoPapel: "MANAGER" });
    sim({ ator: "ADMIN", novoPapel: "STAFF" });
    sim({ ator: "ADMIN", alvoAtual: "STAFF", novoPapel: "MANAGER" });
    sim({ ator: "OWNER", novoPapel: "OWNER" });
    sim({ ator: "OWNER", alvoAtual: "OWNER", novoPapel: "ADMIN", donosRestantes: 1 });
    sim({ ator: "OWNER", alvoAtual: "ADMIN", novoPapel: "OWNER" });

    nao({ ator: "ADMIN", novoPapel: "OWNER" }, 403, "Só o proprietário pode criar um proprietário.");
    nao({ ator: "ADMIN", novoPapel: "ADMIN" }, 403, "O administrador cuida só de gerentes e atendentes.");
    nao(
      { ator: "ADMIN", alvoAtual: "ADMIN", novoPapel: "STAFF" },
      403,
      "O administrador cuida só de gerentes e atendentes.",
    );
    nao(
      { ator: "ADMIN", alvoAtual: "OWNER", novoPapel: "STAFF" },
      403,
      "Só o proprietário pode criar ou rebaixar um proprietário.",
    );
    nao(
      { ator: "OWNER", alvoAtual: "STAFF", novoPapel: "ADMIN", alvoEhOProprioAtor: true },
      403,
      "Você não pode alterar o seu próprio papel.",
    );
    nao(
      { ator: "OWNER", alvoAtual: "OWNER", novoPapel: "ADMIN", donosRestantes: 0 },
      409,
      "A empresa precisa continuar com pelo menos um proprietário.",
    );
    nao(
      { ator: "MANAGER", novoPapel: "STAFF" },
      403,
      "Quem cuida da equipe é o administrador ou o proprietário.",
    );
    nao(
      { ator: "STAFF", alvoAtual: "STAFF", novoPapel: "MANAGER" },
      403,
      "Quem cuida da equipe é o administrador ou o proprietário.",
    );
  });
});
