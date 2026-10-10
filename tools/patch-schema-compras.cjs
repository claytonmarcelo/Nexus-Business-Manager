// Patch unico: adiciona Supplier/Purchase/PurchaseItem e back-relations ao schema.prisma.
// Sem regex e sem barras invertidas: o wf.cjs consome escapes ao gravar no mount.
const fs = require("fs");
const path = require("path");
const NL = String.fromCharCode(10);
const file = path.join(__dirname, "..", "apps", "api", "prisma", "schema.prisma");
let t = fs.readFileSync(file, "utf8");
if (t.includes("model Supplier")) { console.log("ja aplicado"); process.exit(0); }

function patchModel(modelName, findLine, addLines) {
  const start = t.indexOf("model " + modelName + " {");
  if (start < 0) throw new Error("modelo nao encontrado: " + modelName);
  const end = t.indexOf(NL + "}", start);
  const block = t.slice(start, end);
  if (!block.includes(findLine)) throw new Error("linha nao achada em " + modelName);
  const patched = block.replace(findLine, findLine + NL + addLines);
  t = t.slice(0, start) + patched + t.slice(end);
}

patchModel("Company", "  sales         Sale[]", "  suppliers     Supplier[]" + NL + "  purchases     Purchase[]");
patchModel("Product", "  saleItems     SaleItem[]", "  purchaseItems PurchaseItem[]");
patchModel("User", "  sales           Sale[]", "  purchases Purchase[]");

t += NL + `
model Supplier {
  id        String     @id @default(uuid()) @db.VarChar(36)
  companyId String     @map("company_id") @db.VarChar(36)
  name      String     @db.VarChar(160)
  email     String?    @db.VarChar(160)
  phone     String?    @db.VarChar(40)
  document  String?    @db.VarChar(25)
  notes     String?    @db.VarChar(500)
  active    Boolean    @default(true)
  createdAt DateTime   @default(now()) @map("created_at")
  updatedAt DateTime   @updatedAt @map("updated_at")
  company   Company    @relation(fields: [companyId], references: [id], onDelete: Cascade)
  purchases Purchase[]

  @@unique([companyId, name])
  @@index([companyId, active])
  @@map("suppliers")
}

model Purchase {
  id         String         @id @default(uuid()) @db.VarChar(36)
  companyId  String         @map("company_id") @db.VarChar(36)
  supplierId String         @map("supplier_id") @db.VarChar(36)
  userId     String?        @map("user_id") @db.VarChar(36)
  status     PurchaseStatus @default(DRAFT)
  total      Decimal        @db.Decimal(14, 2)
  notes      String?        @db.VarChar(500)
  createdAt  DateTime       @default(now()) @map("created_at")
  updatedAt  DateTime       @updatedAt @map("updated_at")
  company    Company        @relation(fields: [companyId], references: [id], onDelete: Cascade)
  supplier   Supplier       @relation(fields: [supplierId], references: [id], onDelete: Restrict)
  user       User?          @relation(fields: [userId], references: [id], onDelete: SetNull)
  items      PurchaseItem[]

  @@index([companyId, status, createdAt])
  @@map("purchases")
}

model PurchaseItem {
  id         String   @id @default(uuid()) @db.VarChar(36)
  purchaseId String   @map("purchase_id") @db.VarChar(36)
  productId  String   @map("product_id") @db.VarChar(36)
  quantity   Decimal  @db.Decimal(12, 3)
  unitCost   Decimal  @map("unit_cost") @db.Decimal(12, 2)
  lineTotal  Decimal  @map("line_total") @db.Decimal(14, 2)
  purchase   Purchase @relation(fields: [purchaseId], references: [id], onDelete: Cascade)
  product    Product  @relation(fields: [productId], references: [id], onDelete: Restrict)

  @@index([purchaseId])
  @@map("purchase_items")
}
`;
fs.writeFileSync(file, t);
console.log("schema atualizado");
