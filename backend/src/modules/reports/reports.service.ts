import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { query } from '../../shared/database/connection';
import { RowDataPacket } from 'mysql2';

interface ReportRow extends RowDataPacket {
  [key: string]: unknown;
}

export async function generateClientReport(companyId: number): Promise<ReportRow[]> {
  return query<ReportRow[]>(
    `SELECT id, name, phone, email, document, address, notes, created_at
     FROM clients WHERE active = TRUE AND company_id = ? ORDER BY name`, [companyId]
  );
}

export async function generateProductReport(companyId: number): Promise<ReportRow[]> {
  return query<ReportRow[]>(
    `SELECT id, name, sku, category, price, quantity, (price * quantity) as stock_value, created_at
     FROM products WHERE active = TRUE AND company_id = ? ORDER BY name`, [companyId]
  );
}

export async function generateFinancialReport(companyId: number): Promise<ReportRow[]> {
  return query<ReportRow[]>(
    `SELECT id, type, category, description, value, transaction_date, created_at
     FROM transactions WHERE company_id = ? ORDER BY transaction_date DESC`, [companyId]
  );
}

export async function generateSalesReport(companyId: number): Promise<ReportRow[]> {
  return query<ReportRow[]>(
    `SELECT s.id, c.name as client, s.total_value, s.status, s.created_at
     FROM sales s
     LEFT JOIN clients c ON c.id = s.client_id
     WHERE s.company_id = ? ORDER BY s.created_at DESC`, [companyId]
  );
}

export async function generateStockReport(companyId: number): Promise<ReportRow[]> {
  return query<ReportRow[]>(
    `SELECT p.id, p.name, p.sku, p.category, p.price, p.quantity, (p.price * p.quantity) as stock_value,
            (SELECT COALESCE(SUM(quantity), 0) FROM stock_movements WHERE product_id = p.id AND type = 'in' AND company_id = ?) as total_entries,
            (SELECT COALESCE(SUM(quantity), 0) FROM stock_movements WHERE product_id = p.id AND type = 'out' AND company_id = ?) as total_exits
     FROM products p WHERE p.active = TRUE AND p.company_id = ? ORDER BY p.name`,
    [companyId, companyId, companyId]
  );
}

const reportHeaders: Record<string, { label: string; align?: string }[]> = {
  clients: [
    { label: 'ID' }, { label: 'Nome' }, { label: 'Telefone' },
    { label: 'Email' }, { label: 'Documento' }, { label: 'Endereco' },
    { label: 'Observacoes' }, { label: 'Cadastro' },
  ],
  products: [
    { label: 'ID' }, { label: 'Nome' }, { label: 'SKU' },
    { label: 'Categoria' }, { label: 'Preco', align: 'right' },
    { label: 'Qtd', align: 'right' }, { label: 'Valor Estoque', align: 'right' },
    { label: 'Cadastro' },
  ],
  financial: [
    { label: 'ID' }, { label: 'Tipo' }, { label: 'Categoria' },
    { label: 'Descricao' }, { label: 'Valor', align: 'right' },
    { label: 'Data' }, { label: 'Registro' },
  ],
  stock: [
    { label: 'ID' }, { label: 'Nome' }, { label: 'SKU' },
    { label: 'Categoria' }, { label: 'Preco', align: 'right' },
    { label: 'Qtd', align: 'right' }, { label: 'Valor Estoque', align: 'right' },
    { label: 'Entradas', align: 'right' }, { label: 'Saidas', align: 'right' },
  ],
  sales: [
    { label: 'ID' }, { label: 'Cliente' },
    { label: 'Valor Total', align: 'right' },
    { label: 'Status' }, { label: 'Data' },
  ],
};

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return '-';
  if (typeof v === 'number') return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  return String(v);
}

export async function generatePDF(companyId: number, type: string): Promise<Buffer> {
  const data = await getReportData(companyId, type);
  const headers = reportHeaders[type] || [];
  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: type === 'financial' ? 'landscape' : 'portrait' });
  const buffers: Buffer[] = [];

  doc.on('data', (chunk) => buffers.push(chunk));

  const titleMap: Record<string, string> = {
    clients: 'Relatorio de Clientes',
    products: 'Relatorio de Produtos',
    financial: 'Relatorio Financeiro',
    stock: 'Relatorio de Estoque',
  };

  doc.fontSize(18).font('Helvetica-Bold').text('Nexus Business Manager', { align: 'center' });
  doc.fontSize(14).text(titleMap[type] || type, { align: 'center' });
  doc.moveDown();
  doc.fontSize(9).font('Helvetica').text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });
  doc.moveDown(1.5);

  const tableTop = doc.y;
  const colWidth = (doc.page.width - 60) / headers.length;

  doc.font('Helvetica-Bold').fontSize(8);
  headers.forEach((h, i) => {
    doc.text(h.label, 30 + i * colWidth, tableTop, { width: colWidth, align: (h.align || 'left') as any });
  });

  doc.moveDown(0.5);
  const lineY = doc.y;
  doc.moveTo(30, lineY).lineTo(doc.page.width - 30, lineY).stroke('#ccc');
  doc.moveDown(0.5);

  doc.font('Helvetica').fontSize(7.5);

  for (const row of data) {
    const values = Object.values(row);
    const y = doc.y;

    if (y > doc.page.height - 60) {
      doc.addPage();
    }

    const rowY = doc.y;
    headers.forEach((h, i) => {
      doc.text(formatVal(values[i]), 30 + i * colWidth, rowY, {
        width: colWidth,
        align: (h.align || 'left') as any,
      });
    });
    doc.moveDown(0.8);
  }

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
}

export async function generateExcel(companyId: number, type: string): Promise<Buffer> {
  const data = await getReportData(companyId, type);
  const headers = reportHeaders[type] || [];

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(type);

  ws.columns = headers.map((h) => ({ header: h.label, key: h.label, width: 20 }));

  for (const row of data) {
    ws.addRow(Object.values(row).map((v) => formatVal(v)));
  }

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

async function getReportData(companyId: number, type: string): Promise<ReportRow[]> {
  switch (type) {
    case 'clients': return generateClientReport(companyId);
    case 'products': return generateProductReport(companyId);
    case 'financial': return generateFinancialReport(companyId);
    case 'stock': return generateStockReport(companyId);
    case 'sales': return generateSalesReport(companyId);
    default: return [];
  }
}
