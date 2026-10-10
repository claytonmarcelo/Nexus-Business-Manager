// Patch: adiciona FinanceCategory/FinanceEntry e back-relations ao schema.prisma.
const fs = require("fs");
const path = require("path");
const NL = String.fromCharCode(10);
const file = path.join(__dirname, "..", "apps", "api", "prisma", "schema.prisma");
let t = fs.readFileSync(file, "utf8");
if (t.includes("model FinanceEntry")) { console.log("ja aplicado"); process.exit(0); }

function patchModel(modelName, findLine, addLines) {
  const start = t.indexOf("model " + modelName + " {");
  if (start < 0) throw new Error("modelo nao encontrado: " + modelName);
  const end = t.indexOf(NL + "}", start);
  const block = t.slice(start, end);
  if (!block.includes(findLine)) throw new Error("linha nao achada em " + modelName + ": " + findLine);
  const patched = block.replace(findLine, findLine + NL + addLines);
  t = t.slice(0, start) + patched + t.slice(end);
}

patchModel("Company", "  purchases     Purchase[]", "  financeCategories FinanceCategory[]" + NL + "  financeEntries  FinanceEntry[]");
patchModel("Client", "  sales     Sale[]", "  financeEntries  FinanceEntry[]");
patchModel("Supplier", "  purchases Purchase[]", "  financeEntries  FinanceEntry[]");
patchModel("User", "  purchases Purchase[]", "  financeEntries  FinanceEntry[]");

t += NL + `
model FinanceCategory {
  id        String         @id @default(uuid()) @db.VarChar(36)
  companyId String         @map("company_id") @db.VarChar(36)
  name      String         @db.VarChar(80)
  type      EntryType
  createdAt DateTime       @default(now()) @map("created_at")
  company   Company        @relation(fields: [companyId], references: [id], onDelete: Cascade)
  entries   FinanceEntry[]

  @@unique([companyId, name, type])
  @@map("finance_categories")
}

model FinanceEntry {
  id         String            @id @default(uuid()) @db.VarChar(36)
  companyId  String            @map("company_id") @db.VarChar(36)
  categoryId String?           @map("category_id") @db.VarChar(36)
  clientId   String?           @map("client_id") @db.VarChar(36)
  supplierId String?           @map("supplier_id") @db.VarChar(36)
  userId     String?           @map("user_id") @db.VarChar(36)
  type       EntryType
  status     EntryStatus       @default(PENDING)
  description String           @db.VarChar(200)
  amount     Decimal           @db.Decimal(14, 2)
  dueDate    DateTime          @map("due_date") @db.Date
  paidAt     DateTime?         @map("paid_at")
  notes      String?           @db.VarChar(500)
  createdAt  DateTime          @default(now()) @map("created_at")
  updatedAt  DateTime          @updatedAt @map("updated_at")
  company    Company           @relation(fields: [companyId], references: [id], onDelete: Cascade)
  category   FinanceCategory?  @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  client     Client?           @relation(fields: [clientId], references: [id], onDelete: SetNull)
  supplier   Supplier?         @relation(fields: [supplierId], references: [id], onDelete: SetNull)
  user       User?             @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([companyId, status, dueDate])
  @@map("finance_entries")
}
`;
fs.writeFileSync(file, t);
console.log("schema financeiro ok");
