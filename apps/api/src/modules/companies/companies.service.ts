import { Prisma } from "@prisma/client";
import type { Company } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { conflict, notFound } from "../../lib/errors";
import { audit } from "../../lib/audit";
import {
  FUSOS_BRASIL, IDIOMAS, MOEDAS, UFS, somenteDigitos,
} from "../../lib/brFields";
import type { CreateCompanyInput, UpdateCompanyInput } from "./companies.schemas";
import { SUPER_ADMIN_EMAIL } from "../../lib/passwordPolicy";

export interface CreatedCompany {
  id: string;
  name: string;
  slug: string;
}

// Cria empresa e vincula o usuário autenticado como OWNER (transação única, seção 8.3).
export async function createCompany(
  input: CreateCompanyInput,
  ownerId: string,
  ip?: string,
): Promise<CreatedCompany> {
  const exists = await prisma.company.findUnique({ where: { slug: input.slug } });
  if (exists) throw conflict("Já existe uma empresa com este slug");

  const owner = await prisma.user.findUnique({ where: { id: ownerId } });
  if (!owner) throw conflict("Usuário proprietário não encontrado");

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.create({ data: { name: input.name, slug: input.slug } });
    await tx.companyUser.create({
      data: { userId: ownerId, companyId: company.id, role: "OWNER" },
    });
    // Regra definitiva: o administrador global é OWNER de toda empresa criada.
    const superAdmin = await tx.user.findUnique({ where: { email: SUPER_ADMIN_EMAIL } });
    if (superAdmin && superAdmin.id !== ownerId) {
      await tx.companyUser.upsert({
        where: { userId_companyId: { userId: superAdmin.id, companyId: company.id } },
        update: { role: "OWNER" },
        create: { userId: superAdmin.id, companyId: company.id, role: "OWNER" },
      });
    }
    await audit({
      userId: ownerId,
      companyId: company.id,
      action: "company.create",
      entity: "company",
      entityId: company.id,
      ip: ip ?? null,
    });
    return { id: company.id, name: company.name, slug: company.slug };
  });
}

export async function listCompaniesForUser(userId: string) {
  const memberships = await prisma.companyUser.findMany({
    where: { userId },
    include: { company: true },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => ({
    id: m.company.id,
    name: m.company.name,
    slug: m.company.slug,
    role: m.role,
    active: m.company.active,
  }));
}

// ===== Configurações da empresa ativa (seção 37) =====
// A empresa nunca vem de parâmetro: a rota resolve o id pelo token, e aqui
// chega só o recorte parcial do formulário.

// O que a tela manda pode vir com máscara, maiúscula misturada ou espaço
// sobrando. A normalização é do servidor porque a mesma regra tem de valer para
// quem chama a API direto — senão o banco aceitaria o mesmo CNPJ escrito de dois
// jeitos diferentes.
const GUARDA: Record<string, (valor: string) => string> = {
  cnpj: somenteDigitos,
  phone: somenteDigitos,
  zipCode: somenteDigitos,
  stateUf: (v) => v.toUpperCase(),
  currency: (v) => v.toUpperCase(),
  email: (v) => v.toLowerCase(),
};

// O shape que a tela de Configurações lê. revenueTarget sai como número porque
// Decimal vira texto no JSON, e a tela teria que adivinhar o tipo.
export interface EmpresaConfig {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  legalName: string | null;
  tradeName: string | null;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  district: string | null;
  city: string | null;
  stateUf: string | null;
  logoUrl: string | null;
  currency: string;
  timezone: string;
  language: string;
  revenueTarget: number | null;
}

function serializaEmpresa(c: Company): EmpresaConfig {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    active: c.active,
    legalName: c.legalName,
    tradeName: c.tradeName,
    cnpj: c.cnpj,
    phone: c.phone,
    email: c.email,
    zipCode: c.zipCode,
    street: c.street,
    number: c.number,
    district: c.district,
    city: c.city,
    stateUf: c.stateUf,
    logoUrl: c.logoUrl,
    currency: c.currency,
    timezone: c.timezone,
    language: c.language,
    revenueTarget: c.revenueTarget === null ? null : Number(c.revenueTarget.toString()),
  };
}

export async function getCompanySettings(companyId: string): Promise<EmpresaConfig> {
  const empresa = await prisma.company.findUnique({ where: { id: companyId } });
  if (!empresa) throw notFound("Empresa não encontrada");
  return serializaEmpresa(empresa);
}

// Decimal no banco tem duas casas: comparar "1500" com 1500.00 como texto faria
// a tela gravar de novo o que já estava igual.
function mesmoValor(campo: string, anterior: unknown, novo: unknown): boolean {
  if (campo === "revenueTarget") {
    const a = anterior === null || anterior === undefined ? null : Number(String(anterior));
    const b = novo === null || novo === undefined ? null : Number(String(novo));
    if (a === null || b === null) return a === b;
    return Math.round(a * 100) === Math.round(b * 100);
  }
  const a = anterior === null || anterior === undefined ? null : String(anterior);
  const b = novo === null || novo === undefined ? null : String(novo);
  return a === b;
}

export async function updateCompanySettings(
  companyId: string,
  input: UpdateCompanyInput,
  ator: { userId: string; ip?: string },
): Promise<{ empresa: EmpresaConfig; alterados: string[] }> {
  const atual = await prisma.company.findUnique({ where: { id: companyId } });
  if (!atual) throw notFound("Empresa não encontrada");

  const guardados: Record<string, unknown> = atual;
  const mudancas: Record<string, string | number | null> = {};

  for (const [campo, valor] of Object.entries(input)) {
    if (valor === undefined) continue;
    const aparado = typeof valor === "string" ? valor.trim() : valor;
    const regra = GUARDA[campo];
    const normal = typeof aparado === "string" && regra ? regra(aparado) : aparado;
    // "" e null dizem a mesma coisa na tela: "sem valor".
    const novo = normal === "" ? null : normal;
    if (mesmoValor(campo, guardados[campo], novo)) continue;
    mudancas[campo] = novo;
  }

  const alterados = Object.keys(mudancas);
  if (alterados.length === 0) {
    // Nada mudou: devolve a empresa atual sem escrever e sem sujar a auditoria.
    return { empresa: serializaEmpresa(atual), alterados: [] };
  }

  const antes: Record<string, unknown> = {};
  for (const campo of alterados) antes[campo] = guardados[campo] ?? null;

  const empresa = await prisma.company.update({
    where: { id: companyId },
    data: mudancas as Prisma.CompanyUpdateInput,
  });

  const depois: Record<string, unknown> = {};
  for (const campo of alterados) depois[campo] = (empresa as Record<string, unknown>)[campo] ?? null;

  // Configuração da empresa é alteração sensível: CNPJ e endereço mudam o
  // documento que a operação emite, e a meta muda a régua do painel. A trilha
  // guarda o de/para de cada campo, não o formulário inteiro.
  await audit({
    userId: ator.userId,
    companyId,
    action: "company.settings.updated",
    entity: "company",
    entityId: companyId,
    ip: ator.ip ?? null,
    metadata: { campos: alterados, antes, depois },
  });

  return { empresa: serializaEmpresa(empresa), alterados };
}

// Listas fixas do produto (UF, moeda, idioma e os fusos do Brasil). Saem da API
// para a tela não manter cópia à parte da regra: o que a checagem aceita é o
// que a lista oferece.
export function opcoesDeConfiguracao() {
  return {
    ufs: UFS,
    moedas: MOEDAS,
    idiomas: IDIOMAS,
    fusos: FUSOS_BRASIL,
  };
}

