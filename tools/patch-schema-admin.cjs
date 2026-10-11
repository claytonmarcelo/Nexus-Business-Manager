// Patch idempotente do schema Prisma para os modulos administrativos
// (Configuracoes, CMS, Operacoes, Gateways).
//
//   node tools/patch-schema-admin.cjs        # aplica
//   node tools/patch-schema-admin.cjs --check # só valida as âncoras
//
// Depois da aplicação: parar a API e rodar
//   npx prisma migrate dev --name add_admin_cms_ops
//
// O script é bloco-a-bloco (não depende de alinhamento exato de colunas do
// "prisma format") e ESTOURA erro se alguma âncora não existir — assim nunca
// existe aplicação parcial silenciosa.
const fs = require("fs");
const P = "apps/api/prisma/schema.prisma";
const check = process.argv.includes("--check");

let src = fs.readFileSync(P, "utf8");
const feitos = [];

// Localiza o corpo de um bloco (model/enum) e devolve [inicio, fim) do conteúdo.
function blocoFonte(nome) {
  const re = new RegExp("^model\\s+" + nome + "\\s*\\{|^enum\\s+" + nome + "\\s*\\{", "m");
  const m = re.exec(src);
  if (!m) throw new Error("bloco nao encontrado: " + nome);
  const inicio = m.index + m[0].length;
  const fim = src.indexOf("\n}", inicio);
  if (fim < 0) throw new Error("bloco sem fechamento: " + nome);
  return { ini: inicio, fim, texto: src.slice(inicio, fim) };
}

// Insere linhas antes do marcador `dica` dentro do bloco; lança erro se faltar.
function inserirEm(nome, dica, linhas, idMarcto) {
  if (src.includes(idMarcto)) return false;
  const b = blocoFonte(nome);
  const idx = b.texto.indexOf(dica);
  if (idx < 0) throw new Error("ancora nao encontrada em " + nome + ": " + dica);
  const abs = b.ini + idx;
  src = src.slice(0, abs) + linhas + src.slice(abs);
  feitos.push(idMarcto);
  return true;
}

// ---- Company: dados fiscais, endereço, identidade visual e preferências ----
inserirEm(
  "Company",
  "  createdAt",
  `  legalName String? @map("legal_name") @db.VarChar(160)
  tradeName String? @map("trade_name") @db.VarChar(160)
  cnpj      String? @db.VarChar(18)
  phone     String? @db.VarChar(32)
  email     String? @db.VarChar(160)
  zipCode   String? @map("zip_code") @db.VarChar(16)
  street    String? @db.VarChar(160)
  number    String? @db.VarChar(32)
  district  String? @db.VarChar(80)
  city      String? @db.VarChar(80)
  stateUf   String? @map("state_uf") @db.VarChar(2)
  logoUrl   String? @map("logo_url") @db.VarChar(255)
  currency  String  @default("BRL") @db.VarChar(8)
  timezone  String  @default("America/Sao_Paulo") @db.VarChar(64)
  language  String  @default("pt-BR") @db.VarChar(8)
  revenueTarget Decimal? @map("revenue_target") @db.Decimal(14, 2)
`,
  "company-campos",
);

inserirEm(
  "Company",
  "  @@map(\"companies\")",
  `  notificationPreferences NotificationPreference[]
  notifications     Notification[]
  paymentGateways   PaymentGateway[]
`,
  "company-relacoes",
);

// ---- User: telefone, avatar e notificações ----
inserirEm("User", "  passwordHash", `  phone     String? @db.VarChar(32)
  avatarUrl String? @map("avatar_url") @db.VarChar(255)
`, "user-campos");

inserirEm(
  "User",
  "  @@map(\"users\")",
  `  notifications       Notification[]
  notificationPreferences NotificationPreference[]
`,
  "user-relacoes",
);

// ---- Novos modelos: configurações, CMS, operação e integrações ----
const NOVOS = `
// ===== Configuracoes por empresa e por usuario (Configuracoes / Notificacoes) =====
model NotificationPreference {
  id            String   @id @default(uuid()) @db.VarChar(36)
  userId        String   @map("user_id") @db.VarChar(36)
  companyId     String   @map("company_id") @db.VarChar(36)
  saleAlerts    Boolean  @default(true) @map("sale_alerts")
  lowStock      Boolean  @default(true) @map("low_stock")
  dailyReport   Boolean  @default(false) @map("daily_report")
  overdueBills  Boolean  @default(true) @map("overdue_bills")
  newLead       Boolean  @default(true) @map("new_lead")
  emailChannel  Boolean  @default(false) @map("email_channel")
  inAppChannel  Boolean  @default(true) @map("in_app_channel")
  updatedAt     DateTime @updatedAt @map("updated_at")
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  company       Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([userId, companyId])
  @@map("notification_preferences")
}

// Prioridade e exigencia da secao 44. O indice (companyId, userId, readAt)
// atende a listagem; dedupe_key impede que as varreduras periodicas (contas
// vencidas, compromissos proximos) criem o mesmo aviso duas vezes. Em MySQL
// NULL nao viola unique, entao avisos sem chave seguem liberados.
enum NotificationPriority {
  LOW
  MEDIUM
  HIGH
}

model Notification {
  id        String               @id @default(uuid()) @db.VarChar(36)
  userId    String               @map("user_id") @db.VarChar(36)
  companyId String               @map("company_id") @db.VarChar(36)
  kind      String               @db.VarChar(40)
  title     String               @db.VarChar(160)
  body      String?              @db.VarChar(400)
  link      String?              @db.VarChar(200)
  priority  NotificationPriority @default(MEDIUM)
  dedupeKey String?              @unique @map("dedupe_key") @db.VarChar(120)
  readAt    DateTime?            @map("read_at")
  createdAt DateTime             @default(now()) @map("created_at")
  user      User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  company   Company              @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([companyId, userId, readAt])
  @@map("notifications")
}

// ===== CMS da landing page publica (conteudo global da plataforma) =====
// Linha única de id "default"; os blocos Json guardam cores, whatsapp, SEO e
// manutenção. Sem @default em Json: MySQL exige expressão, não literal.
model LandingConfig {
  id          String   @id @db.VarChar(36)
  headline    String?  @db.VarChar(200)
  subheadline String?  @db.VarChar(400)
  colors      Json
  whatsapp    Json
  seo         Json
  maintenance Json
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("landing_configs")
}

enum LandingItemKind {
  BANNER
  TESTIMONIAL
  FAQ
}

model LandingItem {
  id        String          @id @default(uuid()) @db.VarChar(36)
  kind      LandingItemKind
  title     String          @db.VarChar(200)
  body      String?         @db.Text
  imageUrl  String?         @map("image_url") @db.VarChar(255)
  link      String?         @db.VarChar(200)
  author    String?         @db.VarChar(120)
  role      String?         @db.VarChar(120)
  order     Int             @default(0) @map("sort_order")
  active    Boolean         @default(true)
  createdAt DateTime        @default(now()) @map("created_at")
  updatedAt DateTime        @updatedAt @map("updated_at")

  @@index([kind, active, order])
  @@map("landing_items")
}

enum LegalKind {
  TERMS
  PRIVACY
  LGPD
}

model LegalDocument {
  id        String    @id @default(uuid()) @db.VarChar(36)
  kind      LegalKind @unique
  title     String    @db.VarChar(160)
  content   String?   @db.Text
  published Boolean   @default(false)
  updatedAt DateTime  @updatedAt @map("updated_at")

  @@map("legal_documents")
}

// ===== Operacoes: modelos de e-mail transacional e rotinas agendadas =====
model EmailTemplate {
  id        String   @id @default(uuid()) @db.VarChar(36)
  slug      String   @unique @db.VarChar(60)
  name      String   @db.VarChar(120)
  subject   String   @db.VarChar(200)
  body      String?  @db.Text
  variables Json
  active    Boolean  @default(true)
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("email_templates")
}

model CronJob {
  id          String    @id @default(uuid()) @db.VarChar(36)
  slug        String    @unique @db.VarChar(60)
  name        String    @db.VarChar(120)
  description String?   @db.VarChar(400)
  schedule    String    @db.VarChar(60)
  enabled     Boolean   @default(true)
  lastRunAt   DateTime? @map("last_run_at")
  lastStatus  String?   @map("last_status") @db.VarChar(20)
  lastMessage String?   @map("last_message") @db.VarChar(400)
  durationMs  Int?      @map("duration_ms")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  @@map("cron_jobs")
}

// ===== Integradores de pagamento (credenciais por empresa e ambiente) =====
enum GatewayProvider {
  MERCADO_PAGO
  EFI
  STRIPE
}

enum GatewayEnvironment {
  SANDBOX
  PRODUCTION
}

model PaymentGateway {
  id               String              @id @default(uuid()) @db.VarChar(36)
  companyId        String              @map("company_id") @db.VarChar(36)
  provider         GatewayProvider
  environment      GatewayEnvironment  @default(SANDBOX)
  displayName      String?             @map("display_name") @db.VarChar(120)
  publicKey        String?             @map("public_key") @db.VarChar(255)
  credentialCipher String?             @map("credential_cipher") @db.Text
  webhookCipher    String?             @map("webhook_cipher") @db.Text
  active           Boolean             @default(false)
  lastCheckAt      DateTime?           @map("last_check_at")
  lastCheckStatus  String?             @map("last_check_status") @db.VarChar(20)
  lastCheckMessage String?             @map("last_check_message") @db.VarChar(400)
  createdAt        DateTime            @default(now()) @map("created_at")
  updatedAt        DateTime            @updatedAt @map("updated_at")
  company          Company             @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, provider, environment])
  @@index([companyId])
  @@map("payment_gateways")
}
`;

if (!src.includes("model LandingConfig")) {
  src = src.replace(/\s*$/, "\n") + NOVOS;
  feitos.push("novos-modelos");
}

// Validas de conteúdo (independem de alinhamento).
const VALIDAS = [
  ["Notification", "priority"], ["Notification", "dedupe_key"],
  ["Company", "legalName"], ["Company", "revenueTarget"], ["Company", "paymentGateways"],
  ["User", "avatarUrl"], ["User", "notifications"],
  ["LandingConfig", "maintenance"], ["LandingItem", "sort_order"],
  ["LegalDocument", "published"], ["EmailTemplate", "variables"],
  ["CronJob", "lastRunAt"], ["PaymentGateway", "credentialCipher"],
];
if (!check) {
  for (const [modelo, campo] of VALIDAS) {
    const b = blocoFonte(modelo);
    if (!b.texto.includes(campo)) throw new Error("valida falhou: " + modelo + "." + campo);
  }
  fs.writeFileSync(P, src, "utf8");
  const bruto = fs.readFileSync(P);
  if (bruto[0] === 0xef && bruto[1] === 0xbb && bruto[2] === 0xbf) {
    fs.writeFileSync(P, bruto.subarray(3), "utf8"); // regra global: sem BOM
  }
  console.log("schema aplicado:", feitos.join(", ") || "nada (ja estava aplicado)");
} else {
  console.log("ancoras ok;", feitos.length ? "faltou aplicar: " + feitos.join(", ") : "nada pendente");
  for (const [modelo, campo] of VALIDAS) {
    const b = blocoFonte(modelo);
    console.log(" ", modelo + "." + campo, b.texto.includes(campo) ? "presente" : "AUSENTE");
  }
}
