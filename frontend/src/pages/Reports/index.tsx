import { useState } from 'react';
import api from '../../services/api';

type ReportType = 'clients' | 'products' | 'financial' | 'stock';
type ReportFormat = 'json' | 'csv';

const reportLabels: Record<ReportType, string> = {
  clients: 'Clientes',
  products: 'Produtos',
  financial: 'Financeiro',
  stock: 'Estoque',
};

export function Reports() {
  const [loading, setLoading] = useState<ReportType | null>(null);

  async function handleExport(type: ReportType, format: ReportFormat) {
    setLoading(type);
    try {
      const res = await api.get(`/reports/${type}`);

      if (format === 'csv') {
        const data = res.data;
        if (data.length === 0) { alert('Nenhum dado encontrado'); return; }

        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(';')];
        for (const row of data) {
          csvRows.push(headers.map((h) => String(row[h] ?? '')).join(';'));
        }

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_${type}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_${type}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao gerar relatorio');
    } finally {
      setLoading(null);
    }
  }

  const reportTypes: ReportType[] = ['clients', 'products', 'financial', 'stock'];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Relatorios</h1>
        <p className="text-gray-500 mt-1">Exporte dados do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((type) => (
          <div key={type} className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Relatorio de {reportLabels[type]}</h3>
            <p className="text-sm text-gray-500 mb-4">Exportar dados de {reportLabels[type].toLowerCase()} cadastrados</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleExport(type, 'json')}
                disabled={loading === type}
                className="btn-primary flex-1"
              >
                {loading === type ? 'Exportando...' : 'Exportar JSON'}
              </button>
              <button
                onClick={() => handleExport(type, 'csv')}
                disabled={loading === type}
                className="btn-secondary flex-1"
              >
                {loading === type ? 'Exportando...' : 'Exportar CSV'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Informacoes</h3>
        <p className="text-sm text-gray-500">
          Os relatorios exportam todos os dados cadastrados no sistema. JSON para integracoes e CSV para abrir em Excel/Planilhas.
        </p>
      </div>
    </div>
  );
}
