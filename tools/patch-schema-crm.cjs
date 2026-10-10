// Patch: adiciona o modelo Lead (CRM) e back-relations ao schema.prisma.
const fs = require("fs");
const path = require("path");
const NL = String.fromCharCode(10);
const file = path.join(__dirname, "..", "apps", "api", "prisma", "schema.prisma");
let t = fs.readFileSync(file, "utf8");
if (t.includes("model Lead")) { console.log("ja aplicado"); process.exit(0); }

function patchModel(modelName, findLine, addLines) {
  const start = t.indexOf("model " + modelName + " {");
  if (start < 0) throw new Error("modelo nao encontrado: " + modelName);
  const end = t.indexOf(NL + "}", start);
  const block = t.slice(start, end);
  if (!block.includes(findLine)) throw new Error("linha nao achada em " + modelName + ": " + findLine);
  const patched = block.replace(findLine, findLine + NL + addLines);
  t = t.slice(0, start) + patched + t.slice(end);
}

patchModel("Company", "  financeEntries  FinanceEntry[]", "  leads           Lead[]");
patchModel("Client", "  financeEntries  FinanceEntry[]", "  leads           Lead[]");
patchModel("User", "  financeEntries  FinanceEntry[]", "  leads           Lead[]");

t += NL + `
model Lead {
  id        String     @id @default(uuid()) @db.VarChar(36)
  companyId String     @map("company_id") @db.VarChar(36)
  clientId  String?    @map("client_id") @db.VarChar(36)
  userId    String?    @map("user_id") @db.VarChar(36)
  name      String     @db.VarChar(160)
  email     String?    @db.VarChar(160)
  phone     String?    @db.VarChar(40)
  source    String?    @db.VarChar(60)
  status    LeadStatus @default(NEW)
  value     Decimal    @default(0) @db.Decimal(14, 2)
  notes     String?    @db.VarChar(1000)
  createdAt DateTime   @default(now()) @map("created_at")
  updatedAt DateTime   @updatedAt @map("updated_at")
  company   Company    @relation(fields: [companyId], references: [id], onDelete: Cascade)
  client    Client?    @relation(fields: [clientId], references: [id], onDelete: SetNull)
  user      User?      @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([companyId, status, createdAt])
  @@map("leads")
}
`;
fs.writeFileSync(file, t);
console.log("schema crm ok");
