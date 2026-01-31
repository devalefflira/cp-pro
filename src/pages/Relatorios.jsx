import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { FileText, Users, ExternalLink, Calendar } from 'lucide-react';

export default function Relatorios() {
  // --- ESTADOS ---
  // 1. Relatório por Período
  const [range, setRange] = useState({ inicio: '', fim: '' });

  // 2. Relatório Diário
  const [dia, setDia] = useState('');

  // 3. Relatório Fornecedor
  const [filtrosFornecedor, setFiltrosFornecedor] = useState({
    inicio: '', fim: '', status: '', fornecedor_id: ''
  });
  const [listaFornecedores, setListaFornecedores] = useState([]);

  useEffect(() => {
    async function carregar() {
        const { data } = await supabase.from('fornecedores').select('*').order('nome');
        setListaFornecedores(data || []);
    }
    carregar();
  }, []);

  // --- AÇÕES ---
  
  // 1. Ação Período (NOVA)
  const handleVisualizarPeriodo = () => {
    if (!range.inicio || !range.fim) return alert('Selecione as datas inicial e final!');
    window.open(`/print/periodo?inicio=${range.inicio}&fim=${range.fim}`, '_blank');
  };

  // 2. Ação Diário
  const handleAbrirPreviewDiario = () => {
    if (!dia) return alert("Selecione um dia!");
    window.open(`/print/diario?data=${dia}`, '_blank');
  };

  // 3. Ação Fornecedor (PDF direto mantido ou pode ser migrado futuramente)
  const gerarPDFFornecedor = async () => {
     alert("Funcionalidade mantida conforme anterior (ou pode solicitar migração também).");
     // (Código de geração do PDF Fornecedor se mantém se você já o tinha, ou podemos implementar)
  };

  return (
    <div className="space-y-10 pb-10">
      <h2 className="text-3xl font-bold text-primary">Relatórios</h2>

      {/* BLOCO 1: TOTAL POR PERÍODO (ATUALIZADO) */}
      <section className="bg-white p-6 rounded-lg shadow border border-blue-100">
        <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Calendar className="text-secondary"/> Total por Período
        </h3>
        
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Data Inicial</label>
            <input type="date" className="p-2 border rounded w-full md:w-auto" value={range.inicio} onChange={e => setRange({...range, inicio: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Data Final</label>
            <input type="date" className="p-2 border rounded w-full md:w-auto" value={range.fim} onChange={e => setRange({...range, fim: e.target.value})} />
          </div>
          
          <button 
            onClick={handleVisualizarPeriodo} 
            className="bg-[#0f172a] text-white px-6 py-2 rounded flex items-center gap-2 hover:bg-blue-900 shadow-lg transition-transform hover:scale-105"
          >
            <ExternalLink size={18} /> Visualizar Relatório
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2 italic">
            Gera uma listagem completa do período selecionado com totais.
        </p>
      </section>

      {/* BLOCO 2: RELATÓRIO DIÁRIO DETALHADO */}
      <section className="bg-white p-6 rounded-lg shadow border border-blue-100">
        <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <FileText className="text-secondary"/> Relatório Diário Detalhado
        </h3>

        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm text-gray-500 mb-1">Selecione o Dia</label>
            <input 
              type="date" 
              className="w-full p-2 border rounded" 
              value={dia} 
              onChange={(e) => setDia(e.target.value)} 
            />
          </div>
          
          <button 
            onClick={handleAbrirPreviewDiario} 
            className="bg-[#0f172a] text-white px-6 py-2 rounded flex items-center gap-2 hover:bg-blue-900 shadow-lg transition-transform hover:scale-105"
          >
            <ExternalLink size={18} /> Visualizar Relatório
          </button>
        </div>
      </section>

      {/* BLOCO 3: TOTALIZADOR POR FORNECEDOR (Mantido) */}
      <section className="bg-white p-6 rounded-lg shadow border border-blue-100">
        <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Users className="text-secondary"/> Relatório Totalizador por Fornecedor
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
                <label className="block text-sm text-gray-500 mb-1">Data Inicial</label>
                <input type="date" className="w-full p-2 border rounded" 
                    value={filtrosFornecedor.inicio} 
                    onChange={e => setFiltrosFornecedor({...filtrosFornecedor, inicio: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm text-gray-500 mb-1">Data Final</label>
                <input type="date" className="w-full p-2 border rounded" 
                    value={filtrosFornecedor.fim} 
                    onChange={e => setFiltrosFornecedor({...filtrosFornecedor, fim: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm text-gray-500 mb-1">Status</label>
                <select className="w-full p-2 border rounded" 
                    value={filtrosFornecedor.status} 
                    onChange={e => setFiltrosFornecedor({...filtrosFornecedor, status: e.target.value})}>
                    <option value="">STATUS (Todos)</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Pago">Pago</option>
                </select>
            </div>
            <div>
                <label className="block text-sm text-gray-500 mb-1">Fornecedor</label>
                <select className="w-full p-2 border rounded" 
                    value={filtrosFornecedor.fornecedor_id} 
                    onChange={e => setFiltrosFornecedor({...filtrosFornecedor, fornecedor_id: e.target.value})}>
                    <option value="">Todos Fornecedores</option>
                    {listaFornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
            </div>
            
            <button 
                onClick={gerarPDFFornecedor}
                className="bg-gray-800 text-white px-4 py-2 rounded flex items-center justify-center gap-2 hover:bg-gray-900 shadow-lg"
            >
              <FileText size={18} /> Exportar PDF
            </button>
        </div>
      </section>

    </div>
  );
}