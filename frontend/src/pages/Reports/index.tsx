import { useState } from 'react';
import api from '../../services/api';

type ReportType = 'clients' | 'products' | 'financial' | 'stock';

const reportLabels: Record<ReportType, string> = {
  clients: 'Clientes',
  products: 'Produtos',
  financial: 'Financeiro',
  stock: 'Estoque',
};

const reportIcons: Record<ReportType, string> = {
  clients: '👥',
  products: '📦',
  financial: '💰',
  stock: '📊',
};

export function Reports() {
  const [loading, setLoading] = useState<{ type: ReportType; format: string } | null>(null);

  async function handleDownload(type: ReportType, format: string) {
    setLoading({ type, format });
    try {
      const token = localStorage.getItem('@nexus:token');
      const baseUrl = '/api';
      const url = format === 'pdf'
        ? `${baseUrl}/reports/pdf/${type}`
        : `${baseUrl}/reports/xlsx/${type}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Erro ao baixar relatorio');
        return;
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `relatorio_${type}_${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } catch {
      alert('Erro ao baixar relatorio');
    } finally {
      setLoading(null);
    }
  }

  const reportTypes: ReportType[] = ['clients', 'products', 'financial', 'stock'];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Relatorios</h1>
        <p className="text-gray-500 mt-1">Exporte dados em PDF ou Excel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((type) => {
          const isLoading = loading?.type === type;
          return (
            <div key={type} className="card">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{reportIcons[type]}</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Relatorio de {reportLabels[type]}</h3>
                  <p className="text-sm text-gray-500">
                    {type === 'clients' && 'Lista completa de clientes cadastrados'}
                    {type === 'products' && 'Catalogo de produtos com precos e quantidades'}
                    {type === 'financial' && 'Todas as receitas e despesas registradas'}
                    {type === 'stock' && 'Movimentacoes e saldo atual do estoque'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleDownload(type, 'pdf')}
                  disabled={!!isLoading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {isLoading && loading?.format === 'pdf' ? '...' : '📄'} PDF
                </button>
                <button
                  onClick={() => handleDownload(type, 'xlsx')}
                  disabled={!!isLoading}
                  className="btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  {isLoading && loading?.format === 'xlsx' ? '...' : '📊'} Excel
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Sobre os Relatorios</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-bold">PDF</span>
            <span>Relatorio formatado com cabecalho, tabelas e data de geracao. Pronto para imprimir ou enviar.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-bold">Excel</span>
            <span>Planilha com dados exportados. Abra no Excel, Google Sheets ou LibreOffice para filtrar e analisar.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
