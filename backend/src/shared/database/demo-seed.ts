import { query } from "./connection";
import bcrypt from "bcryptjs";

const COMPANY_ID = 1;
const USER_ID = 1;

async function clean() {
  await query("DELETE FROM sale_items");
  await query("DELETE FROM purchase_items");
  await query("DELETE FROM stock_movements");
  await query("DELETE FROM notifications");
  await query("DELETE FROM audit_logs");
  await query("DELETE FROM appointments");
  await query("DELETE FROM transactions");
  await query("DELETE FROM sales");
  await query("DELETE FROM purchases");
  await query("DELETE FROM suppliers");
  await query("DELETE FROM products");
  await query("DELETE FROM clients");
  await query("DELETE FROM users WHERE id > 1");
}

async function seedClients() {
  const clients = [
    { name: "Joao Silva", phone: "11911111111", email: "joao.silva@email.com", document: "11111111111", address: "Rua das Flores, 100 - Sao Paulo, SP" },
    { name: "Maria Oliveira", phone: "11922222222", email: "maria.oliveira@email.com", document: "22222222222", address: "Av. Paulista, 1000 - Sao Paulo, SP" },
    { name: "Carlos Santos", phone: "11933333333", email: "carlos.santos@email.com", document: "33333333333", address: "Rua Augusta, 500 - Sao Paulo, SP" },
    { name: "Ana Costa", phone: "11944444444", email: "ana.costa@email.com", document: "44444444444", address: "Rua Oscar Freire, 200 - Sao Paulo, SP" },
    { name: "Pedro Almeida", phone: "11955555555", email: "pedro.almeida@email.com", document: "55555555555", address: "Av. Brigadeiro, 300 - Sao Paulo, SP" },
    { name: "Lucia Pereira", phone: "11966666666", email: "lucia.pereira@email.com", document: "66666666666", address: "Rua Haddock Lobo, 400 - Sao Paulo, SP" },
    { name: "Roberto Lima", phone: "11977777777", email: "roberto.lima@email.com", document: "77777777777", address: "Rua da Consolacao, 600 - Sao Paulo, SP" },
    { name: "Fernanda Rocha", phone: "11988888888", email: "fernanda.rocha@email.com", document: "88888888888", address: "Av. Reboucas, 700 - Sao Paulo, SP" },
    { name: "Rafael Souza", phone: "11999999999", email: "rafael.souza@email.com", document: "99999999999", address: "Rua Teodoro Sampaio, 800 - Sao Paulo, SP" },
    { name: "Juliana Dias", phone: "11888888888", email: "juliana.dias@email.com", document: "10101010101", address: "Rua Fradique Coutinho, 900 - Sao Paulo, SP" },
    { name: "Marcos Paulo", phone: "11777777777", email: "marcos.paulo@email.com", document: "12121212121", address: "Rua Harmonia, 150 - Sao Paulo, SP" },
    { name: "Bianca Martins", phone: "11666666666", email: "bianca.martins@email.com", document: "13131313131", address: "Av. Pompeia, 250 - Sao Paulo, SP" },
    { name: "Thiago Barbosa", phone: "11555555555", email: "thiago.barbosa@email.com", document: "14141414141", address: "Rua Cardeal Arcoverde, 350 - Sao Paulo, SP" },
    { name: "Camila Teixeira", phone: "11444444444", email: "camila.teixeira@email.com", document: "15151515151", address: "Rua Pio XI, 450 - Sao Paulo, SP" },
    { name: "Gustavo Nunes", phone: "11333333333", email: "gustavo.nunes@email.com", document: "16161616161", address: "Av. Ceci, 550 - Sao Paulo, SP" },
    { name: "Larissa Campos", phone: "11222222222", email: "larissa.campos@email.com", document: "17171717171", address: "Rua Diana, 650 - Sao Paulo, SP" },
    { name: "Felipe Cardoso", phone: "11111111112", email: "felipe.cardoso@email.com", document: "18181818181", address: "Rua Turiassu, 750 - Sao Paulo, SP" },
    { name: "Aline Ribeiro", phone: "11111111113", email: "aline.ribeiro@email.com", document: "19191919191", address: "Av. Sumare, 850 - Sao Paulo, SP" },
    { name: "Diego Moreira", phone: "11111111114", email: "diego.moreira@email.com", document: "20202020202", address: "Rua Ribeiro de Lima, 950 - Sao Paulo, SP" },
    { name: "Tatiane Gomes", phone: "11111111115", email: "tatiane.gomes@email.com", document: "21212121212", address: "Rua do Triunfo, 50 - Sao Paulo, SP" },
  ];

  for (const c of clients) {
    await query(
      "INSERT INTO clients (company_id, name, phone, email, document, address, notes, status, created_by, active) VALUES (?, ?, ?, ?, ?, ?, ?, 'ATIVO', ?, TRUE)",
      [COMPANY_ID, c.name, c.phone, c.email, c.document, c.address, "Cliente cadastrado na migracao de dados de demonstracao", USER_ID]
    );
  }
  console.log(`  ${clients.length} clientes inseridos`);
}

async function seedProducts() {
  const categories = {
    "Eletronicos": ["Smartphone X Pro", "Tablet Max 10", "Carregador USB-C", "Fone Bluetooth", "Mouse Wireless", "Teclado Mecanico", "Monitor 27 4K", "HD Externo 1TB", "Caixa de Som Portatil", "Webcam HD"],
    "Vestuario": ["Camiseta Premium", "Calca Jeans", "Tenis Esportivo", "Mochila Executiva", "Cinto de Couro"],
    "Alimentacao": ["Cafe Gourmet 500g", "Chocolate Artesanal", "Azeite Extra Virgem", "Vinho Tinto Reserva", "Granola Premium"],
    "Papelaria": ["Caderno Inteligente", "Caneta Executiva", "Agenda 2026", "Marca Texto Kit", "Post-it Profissional"],
    "Casa": ["Luminaria LED", "Vaso Decorativo", "Tapete Moderno", "Almofada Decorativa", "Kit Toalhas Luxo"],
  };

  let inserted = 0;
  for (const [category, products] of Object.entries(categories)) {
    for (const name of products) {
      const sku = `DEMO-${String(inserted + 1).padStart(4, "0")}`;
      const price = Math.round((Math.random() * 900 + 10) * 100) / 100;
      await query(
        "INSERT INTO products (company_id, name, sku, category, price, quantity, status, active, created_by) VALUES (?, ?, ?, ?, ?, FLOOR(RAND() * 100 + 5), 'ATIVO', TRUE, ?)",
        [COMPANY_ID, name, sku, category, price, USER_ID]
      );
      inserted++;
    }
  }
  console.log(`  ${inserted} produtos inseridos`);
}

async function seedSuppliers() {
  const suppliers = [
    { name: "Distribuidora ABC Ltda", contact: "Carlos Alberto" },
    { name: "TechWorld Comercio", contact: "Paulo Sergio" },
    { name: "Moda Brasil Industria", contact: "Renata Lima" },
    { name: "Alimentos Premium SA", contact: "Jose Roberto" },
    { name: "Papelaria Criativa ME", contact: "Marina Silva" },
    { name: "Casa & Estilo Decoracoes", contact: "Andre Santos" },
    { name: "Eletro Nacional Distribuidora", contact: "Fernando Costa" },
    { name: "Moveis e Acessorios Ltda", contact: "Luciana Oliveira" },
    { name: "Importadora Global Express", contact: "Ricardo Pereira" },
    { name: "Logistica e Suprimentos Total", contact: "Camila Rocha" },
  ];

  for (const s of suppliers) {
    await query(
      "INSERT INTO suppliers (company_id, company_name, phone, email, contact_name, active, created_by) VALUES (?, ?, ?, ?, ?, TRUE, ?)",
      [COMPANY_ID, s.name, `11${String(Math.floor(Math.random() * 90000000 + 10000000))}`, `contato@${s.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com.br`, s.contact, USER_ID]
    );
  }
  console.log(`  ${suppliers.length} fornecedores inseridos`);
}

async function seedSales() {
  const clientIds = await query("SELECT id FROM clients WHERE company_id = ?", [COMPANY_ID]) as any[];
  const productIds = await query("SELECT id, price FROM products WHERE company_id = ?", [COMPANY_ID]) as any[];

  for (let i = 0; i < 50; i++) {
    const client = clientIds[Math.floor(Math.random() * clientIds.length)];
    const itemCount = Math.floor(Math.random() * 3) + 1;
    let totalValue = 0;
    const items: { product_id: number; quantity: number; unit_price: number; total_price: number }[] = [];

    for (let j = 0; j < itemCount; j++) {
      const prod = productIds[Math.floor(Math.random() * productIds.length)];
      const qty = Math.floor(Math.random() * 5) + 1;
      const price = prod.price;
      const total = qty * price;
      totalValue += total;
      items.push({ product_id: prod.id, quantity: qty, unit_price: price, total_price: total });
    }

    const daysAgo = Math.floor(Math.random() * 90);
    const saleDate = new Date();
    saleDate.setDate(saleDate.getDate() - daysAgo);
    const dateStr = saleDate.toISOString().slice(0, 19).replace("T", " ");

    const statuses = ["ABERTA", "CONCLUIDA", "CONCLUIDA", "CONCLUIDA", "CANCELADA"];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    const result = await query("INSERT INTO sales (company_id, client_id, total_value, status, notes, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [COMPANY_ID, client.id, totalValue, status, "Venda gerada automaticamente para demonstracao", USER_ID, dateStr]) as any;
    const saleId = result.insertId;

    for (const item of items) {
      await query("INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)", [saleId, item.product_id, item.quantity, item.unit_price, item.total_price]);
    }
  }
  console.log("  50 vendas inseridas");
}

async function seedStockMovements() {
  const productIds = await query("SELECT id FROM products WHERE company_id = ?", [COMPANY_ID]) as any[];

  for (let i = 0; i < 50; i++) {
    const prod = productIds[Math.floor(Math.random() * productIds.length)];
    const type = Math.random() > 0.3 ? "in" : "out";
    const qty = Math.floor(Math.random() * 20) + 1;
    const daysAgo = Math.floor(Math.random() * 90);
    const movDate = new Date();
    movDate.setDate(movDate.getDate() - daysAgo);
    const dateStr = movDate.toISOString().slice(0, 19).replace("T", " ");

    await query("INSERT INTO stock_movements (company_id, product_id, type, quantity, description, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [COMPANY_ID, prod.id, type, qty, "Movimentacao gerada para demonstracao", USER_ID, dateStr]);
  }
  console.log("  50 movimentacoes de estoque inseridas");
}

async function seedTransactions() {
  const revenueCategories = ["Vendas", "Servicos", "Investimentos", "Outros"];
  const expenseCategories = ["Agua", "Luz", "Internet", "Salarios", "Aluguel", "Material", "Outros"];

  for (let i = 0; i < 30; i++) {
    const type = "revenue";
    const cat = revenueCategories[Math.floor(Math.random() * revenueCategories.length)];
    const value = Math.round((Math.random() * 9000 + 500) * 100) / 100;
    const daysAgo = Math.floor(Math.random() * 60);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const dateStr = date.toISOString().slice(0, 10);
    const timestamp = date.toISOString().slice(0, 19).replace("T", " ");

    await query("INSERT INTO transactions (company_id, type, category, description, value, status, transaction_date, created_by, created_at) VALUES (?, ?, ?, ?, ?, 'RECEBIDA', ?, ?, ?)",
      [COMPANY_ID, type, cat, `Receita de ${cat} - Gerado automaticamente`, value, dateStr, USER_ID, timestamp]);
  }

  for (let i = 0; i < 20; i++) {
    const type = "expense";
    const cat = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
    const value = Math.round((Math.random() * 3000 + 100) * 100) / 100;
    const daysAgo = Math.floor(Math.random() * 60);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const dateStr = date.toISOString().slice(0, 10);
    const timestamp = date.toISOString().slice(0, 19).replace("T", " ");

    const statuses = ["PAGO", "PAGO", "PAGO", "PENDENTE", "VENCIDO"];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    await query("INSERT INTO transactions (company_id, type, category, description, value, status, transaction_date, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [COMPANY_ID, type, cat, `Despesa de ${cat} - Gerado automaticamente`, value, status, dateStr, USER_ID, timestamp]);
  }
  console.log("  50 transacoes financeiras inseridas");
}

async function seedDemoUser() {
  const hashedPassword = await bcrypt.hash("123456", 10);
  await query(
    "INSERT INTO users (company_id, name, email, password, role, active) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)",
    [COMPANY_ID, "Administrador Demo", "admin@nexusdemo.com", hashedPassword, "admin", true]
  );
  console.log("  Usuario demo inserido: admin@nexusdemo.com / 123456");
}

async function main() {
  console.log("Iniciando migracao de dados de demonstracao...\n");

  console.log("Limpando dados existentes...");
  await clean();
  console.log("  OK\n");

  console.log("Criando usuario demo...");
  await seedDemoUser();

  console.log("Criando clientes...");
  await seedClients();

  console.log("Criando produtos...");
  await seedProducts();

  console.log("Criando fornecedores...");
  await seedSuppliers();

  console.log("Criando vendas...");
  await seedSales();

  console.log("Criando movimentacoes de estoque...");
  await seedStockMovements();

  console.log("Criando transacoes financeiras...");
  await seedTransactions();

  console.log("\nMigracao de dados de demonstracao concluida com sucesso!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Erro na migracao de dados de demonstracao:", err);
  process.exit(1);
});
