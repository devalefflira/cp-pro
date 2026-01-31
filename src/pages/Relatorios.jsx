  import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, Search, Calendar, FileText, Users, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Relatorios() {
  // Estados Relatório 1 (Total por Período)
  const [range, setRange] = useState({ inicio: '', fim: '' });
  const [dadosSemana, setDadosSemana] = useState([]);

  // Estados Relatório 2 (Diário) - SIMPLIFICADO
  const [dia, setDia] = useState('');

  // Estados Relatório 3 (Totalizador por Fornecedor)
  const [filtrosFornecedor, setFiltrosFornecedor] = useState({
    inicio: '',
    fim: '',
    status: '',
    fornecedor_id: ''
  });
  const [listaFornecedores, setListaFornecedores] = useState([]);

  const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  useEffect(() => {
    async function carregar() {
        const { data } = await supabase.from('fornecedores').select('*').order('nome');
        setListaFornecedores(data || []);
    }
    carregar();
  }, []);

  // --- BUSCA SEMANAL (MANTIDA IGUAL) ---
  const buscarSemana = async () => {
    if (!range.inicio || !range.fim) return alert('Selecione as datas!');
    const { data, error } = await supabase
      .from('lancamentos')
      .select('*')
      .gte('data_vencimento', range.inicio)
      .lte('data_vencimento', range.fim)
      .order('data_vencimento');

    if (error) alert('Erro: ' + error.message);
    else setDadosSemana(data || []);
  };

  const gerarPDFSemanal = () => {
     // ... (Lógica original do PDF Semanal mantida, pode deixar como estava ou pedir se quiser o código completo dela aqui)
     // Para brevidade, assumo que você mantém o código da resposta anterior para esta função
     const doc = new jsPDF();
     // ... código da geração semanal ...
     doc.save('Total_Semana.pdf');
  };

  // --- AÇÃO DO RELATÓRIO DIÁRIO (NOVA LÓGICA) ---
  const handleAbrirPreviewDiario = () => {
    if (!dia) return alert("Selecione um dia!");
    // Abre a nova rota em uma nova aba
    window.open(`/print/diario?data=${dia}`, '_blank');
  };

  // --- PDF FORNECEDOR (MANTIDO) ---
  const gerarPDFFornecedor = async () => {
     // ... (Lógica original mantida) ...
  };

  return (
    <div className="space-y-10 pb-10">
      <h2 className="text-3xl font-bold text-primary">Relatórios</h2>

      {/* BLOCO 1: TOTAL POR PERÍODO */}
      <section className="bg-white p-6 rounded-lg shadow border border-blue-100">
        <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Calendar className="text-secondary"/> Total por Período
        </h3>
        <div className="flex flex-wrap gap-4 items-end mb-6">
          <input type="date" className="p-2 border rounded" value={range.inicio} onChange={e => setRange({...range, inicio: e.target.value})} />
          <input type="date" className="p-2 border rounded" value={range.fim} onChange={e => setRange({...range, fim: e.target.value})} />
          <button onClick={buscarSemana} className="bg-primary text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-secondary">
            <Search size={18} /> Filtrar
          </button>
          {dadosSemana.length > 0 && (
            <button onClick={gerarPDFSemanal} className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-700 ml-auto shadow">
              <FileDown size={18} /> Exportar PDF
            </button>
          )}
        </div>
      </section>

      {/* BLOCO 2: RELATÓRIO DIÁRIO DETALHADO (MODIFICADO) */}
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
        <p className="text-sm text-gray-500 mt-2 italic">
            O relatório abrirá em uma nova aba para conferência antes da impressão.
        </p>
      </section>

      {/* BLOCO 3: TOTALIZADOR POR FORNECEDOR */}
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
                className="bg-[#0f172a] text-white px-4 py-2 rounded flex items-center justify-center gap-2 hover:bg-blue-900 shadow-lg"
            >
              <Search size={18} /> Filtrar e Exportar
            </button>
        </div>
      </section>

    </div>
  );
}