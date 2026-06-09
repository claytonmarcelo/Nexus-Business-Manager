import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

type ImportType = 'products' | 'clients' | 'suppliers';

const importOptions: { type: ImportType; label: string; desc: string; accept: string }[] = [
  { type: 'products', label: 'Produtos', desc: 'Importar catalogo de produtos (CSV)', accept: '.csv,.xlsx,.xls' },
  { type: 'clients', label: 'Clientes', desc: 'Importar lista de clientes (CSV)', accept: '.csv,.xlsx,.xls' },
  { type: 'suppliers', label: 'Fornecedores', desc: 'Importar fornecedores (CSV)', accept: '.csv,.xlsx,.xls' },
];

export function Import() {
  const [importType, setImportType] = useState<ImportType>('products');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  async function handleSubmit() {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post(`/import/${importType}`, form);
      setResult(res.data.data || { imported: 0, errors: 0 });
      showToast('Importacao concluida com sucesso.');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Erro ao importar arquivo.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h1 className="page-title">Importacao de Dados</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
          Importe dados de arquivos CSV ou Excel para o sistema
        </p>
      </div>

      <div className="nexus-card p-6">
        <div className="flex flex-wrap gap-3 mb-6">
          {importOptions.map((opt) => (
            <button
              key={opt.type}
              onClick={() => { setImportType(opt.type); setFile(null); setResult(null); }}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
              style={{
                background: importType === opt.type ? 'rgba(212, 149, 86, 0.12)' : 'var(--nexus-card-soft)',
                color: importType === opt.type ? 'var(--nexus-gold)' : 'var(--nexus-muted)',
                border: importType === opt.type ? '1px solid var(--nexus-gold)' : '1px solid var(--nexus-border)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div
          className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all"
          style={{ borderColor: 'var(--nexus-border)' }}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--nexus-gold)'; }}
          onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--nexus-border)'; }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = 'var(--nexus-border)';
            const f = e.dataTransfer.files[0];
            if (f) setFile(f);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept={importOptions.find((o) => o.type === importType)?.accept}
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
          />
          <DocumentArrowUpIcon className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--nexus-muted-2)' }} />
          {file ? (
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>{file.name}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--nexus-muted-2)' }}>{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>Clique ou arraste o arquivo aqui</p>
              <p className="text-xs mt-1" style={{ color: 'var(--nexus-muted-2)' }}>
                {importOptions.find((o) => o.type === importType)?.desc}
              </p>
            </div>
          )}
        </div>

        {file && (
          <div className="mt-6 flex items-center gap-4">
            <span className="text-sm" style={{ color: 'var(--nexus-muted)' }}>
              {importOptions.find((o) => o.type === importType)?.label}: {file.name}
            </span>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary ml-auto"
              style={{ height: '44px', padding: '0 1.5rem' }}
            >
              {loading ? 'Importando...' : 'Importar'}
            </button>
          </div>
        )}

        {result && (
          <div className="mt-6 p-4 rounded-lg" style={{ background: 'rgba(125, 218, 106, 0.08)', border: '1px solid rgba(125, 218, 106, 0.2)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--nexus-success)' }}>
              Importacao concluida: {result.imported} registros importados
              {result.errors > 0 && `, ${result.errors} erros`}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
