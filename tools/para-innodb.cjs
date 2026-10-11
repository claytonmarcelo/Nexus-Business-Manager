// ===== tools/para-innodb.cjs — reparo de engine e chaves estrangeiras =====
// Descoberto na Fase 1 da auditoria: o WAMP local força default_storage_engine=
// MYISAM no my.ini, e o Prisma cria tabelas sem fixar o engine. Resultado: um
// banco 100% MyISAM, onde o MySQL IGNORA chaves estrangeiras em silêncio e não
// existe atomicidade em transação. Isolamento multiempresa, seed, vendas com
// estoque e qualquer $transaction dependem de InnoDB.
//
// O que este script faz, nesta ordem e de forma idempotente (pode rodar duas
// vezes sem estragar nada):
//   1. converte cada tabela do schema para InnoDB (dados preservados);
//   2. limpa violações de integridade deixadas pelas limpezas de teste antigas
//      (quando o FK ainda não existia no banco): filho órfão de CASCADE é
//      apagado, de SET NULL vira NULL, de RESTRICT faz o script PARAR — nada
//      de destruir dado de negócio às cegas;
//   3. adiciona os FOREIGN KEYs que ainda não existem, usando exatamente as
//      declarações da migration 20261011164338_add_platform_role (o momento em
//      que o Prisma reenquadrou o schema inteiro, FK por FK).
//
// Uso: node tools/para-innodb.cjs          (aplica o reparo)
//      node tools/para-innodb.cjs --check   (só relata, não escreve)
// Pré-requisito: apps/api/.env com DATABASE_URL apontando para o banco dev.
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const RAIZ = path.join(__dirname, "..");
const ENV_API = path.join(RAIZ, "apps", "api", ".env");
const MIGRATION_FKS = path.join(
  RAIZ,
  "apps",
  "api",
  "prisma",
  "migrations",
  "20261011164338_add_platform_role",
  "migration.sql",
);

// leitura do .env sem depender de dotenv instalado na raiz
function carregarEnv(arquivo) {
  if (!fs.existsSync(arquivo)) return;
  for (const linha of fs.readFileSync(arquivo, "utf8").split(/\r?\n/)) {
    const m = linha.match(/^([A-Z0-9_]+)=(.*)$/i);
    if (m && !process.env[m[1]]) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      } else {
        const corte = v.indexOf(" #");
        if (corte >= 0) v = v.slice(0, corte).trim();
      }
      process.env[m[1]] = v;
    }
  }
}
carregarEnv(ENV_API);
if (!process.env.DATABASE_URL) {
  console.error("[para-innodb] DATABASE_URL ausente (apps/api/.env).");
  process.exit(1);
}

const CHECK_ONLY = process.argv.includes("--check");
const prisma = new PrismaClient();

// ---- 1. extrai os FKs declarados na migration (nome, alter completo) ----
function extrairFks() {
  const sql = fs.readFileSync(MIGRATION_FKS, "utf8");
  const re = /ALTER TABLE `([^`]+)` ADD CONSTRAINT `([^`]+)` FOREIGN KEY[^\n]+?;(?=\r?\n|$)/g;
  const out = [];
  let m;
  while ((m = re.exec(sql)) !== null) {
    const stmt = m[0].replace(/\s+/g, " ");
    const col = stmt.match(/FOREIGN KEY \(`([^`]+)`\)/)[1];
    const ref = stmt.match(/REFERENCES `([^`]+)`\(`([^`]+)`\)/);
    const onDelete = (stmt.match(/ON DELETE (SET NULL|CASCADE|RESTRICT|NO ACTION)/) || [null, "RESTRICT"])[1];
    out.push({
      tabela: m[1],
      nome: m[2],
      coluna: col,
      refTabela: ref[1],
      refColuna: ref[2],
      onDelete,
      stmt,
    });
  }
  return out;
}

async function main() {
  const banco = (await prisma.$queryRawUnsafe("SELECT DATABASE() b"))[0].b;
  console.log("[para-innodb] banco:", banco, CHECK_ONLY ? "(somente leitura)" : "");

  // ---- 0. engines atuais ----
  const tabelas = await prisma.$queryRawUnsafe(
    "SELECT TABLE_NAME t, ENGINE e FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE='BASE TABLE' ORDER BY t",
    banco,
  );
  const myisam = tabelas.filter((x) => x.e !== "InnoDB");
  console.log("[para-innodb] tabelas:", tabelas.length, "| fora do InnoDB:", myisam.length);

  // ---- 1. converte para InnoDB ----
  for (const { t } of myisam) {
    if (CHECK_ONLY) { console.log("  converteria:", t); continue; }
    await prisma.$executeRawUnsafe("ALTER TABLE `" + t + "` ENGINE=InnoDB");
    console.log("  convertida:", t);
  }

  // ---- 2 + 3. violações e FKs faltantes ----
  const existentes = new Set(
    (await prisma.$queryRawUnsafe(
      "SELECT CONSTRAINT_NAME n FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=?",
      banco,
    )).map((r) => r.n),
  );
  let adicionados = 0, pulados = 0, limpos = 0;
  const bloqueios = [];
  for (const fk of extrairFks()) {
    if (existentes.has(fk.nome)) { pulados++; continue; }
    const viol = await prisma.$queryRawUnsafe(
      "SELECT c.`" + fk.coluna + "` v FROM `" + fk.tabela + "` c LEFT JOIN `" + fk.refTabela +
      "` p ON p.`" + fk.refColuna + "` = c.`" + fk.coluna + "` WHERE c.`" + fk.coluna + "` IS NOT NULL AND p.`" + fk.refColuna + "` IS NULL");
    if (viol.length > 0) {
      if (fk.onDelete === "CASCADE") {
        if (!CHECK_ONLY) {
          await prisma.$executeRawUnsafe(
            "DELETE c FROM `" + fk.tabela + "` c LEFT JOIN `" + fk.refTabela + "` p ON p.`" + fk.refColuna +
            "` = c.`" + fk.coluna + "` WHERE c.`" + fk.coluna + "` IS NOT NULL AND p.`" + fk.refColuna + "` IS NULL");
        }
        limpos += viol.length;
        console.log("  órfãos removidos (" + fk.tabela + "." + fk.coluna + "):", viol.length);
      } else if (fk.onDelete === "SET NULL") {
        if (!CHECK_ONLY) {
          await prisma.$executeRawUnsafe(
            "UPDATE `" + fk.tabela + "` c LEFT JOIN `" + fk.refTabela + "` p ON p.`" + fk.refColuna + "` = c.`" +
            fk.coluna + "` SET c.`" + fk.coluna + "` = NULL WHERE c.`" + fk.coluna + "` IS NOT NULL AND p.`" +
            fk.refColuna + "` IS NULL");
        }
        limpos += viol.length;
        console.log("  referência solta zerada (" + fk.tabela + "." + fk.coluna + "):", viol.length);
      } else {
        bloqueios.push(fk.tabela + "." + fk.coluna + " (" + viol.length + " linhas, RESTRICT)");
        continue;
      }
    }
    if (CHECK_ONLY) { console.log("  adicionaria FK:", fk.nome); continue; }
    try {
      await prisma.$executeRawUnsafe(fk.stmt);
      adicionados++;
    } catch (e) {
      bloqueios.push(fk.nome + " — " + String(e.message ?? e).split("\n")[0]);
    }
  }

  console.log("[para-innodb] FKs: adicionados " + adicionados + ", já existiam " + pulados + ", linhas arrumadas " + limpos);
  if (bloqueios.length) {
    console.error("[para-innodb] BLOQUEIOS (decisão manual, nada foi destruído):\n  " + bloqueios.join("\n  "));
    await prisma.$disconnect();
    process.exit(2);
  }

  // ---- resumo final ----
  const depois = await prisma.$queryRawUnsafe(
    "SELECT ENGINE e, COUNT(*) n FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE='BASE TABLE' GROUP BY e",
    banco,
  );
  const fksDepois = await prisma.$queryRawUnsafe(
    "SELECT COUNT(*) n FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=?", banco,
  );
  console.log("[para-innodb] engines:", depois, "| FKs ativos:", fksDepois[0].n.toString());
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
