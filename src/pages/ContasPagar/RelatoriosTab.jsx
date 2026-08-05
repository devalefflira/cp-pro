import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Calendar, FileText, Users, ExternalLink } from 'lucide-react';

export default function RelatoriosTab() {
  const [dataInicioPeriodo, setDataInicioPeriodo] = useState('');
  const [dataFimPeriodo, setDataFimPeriodo] = useState('');

  const [dataDiario, setDataDiario] = useState('');

  const [dataInicioForn, setDataInicioForn] = useState('');
  const [dataFimForn, setDataFimForn] = useState('');
  const [statusForn, setStatusForn] = useState('TODOS');
  const [fornecedorId, setFornecedorId] = useState('TODOS');
  const [fornecedores, setFornecedores] = useState([]);

  useEffect(() => {
    carregarFornecedores();
  }, []);

  const carregarFornecedores = async () => {
    const { data } = await supabase.from('fornecedores').select('*').order('nome');
    setFornecedores(data || []);
  };

  const abrirImpressao = (url) => {
    window.open(url, '_blank', 'width=1000,height=800');
  };

  return (
    <div className="space-y-6">
      
      {/* RELATÓRIO 1: TOTAL POR PERÍODO */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
          <Calendar size={18} className="text-primary"/> Total por Período
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Inicial</label>
            <input 
              type="date" 
              value={dataInicioPeriodo} 
              onChange={e => setDataInicioPeriodo(e.target.value)} 
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Final</label>
            <input 
              type="date" 
              value={dataFimPeriodo} 
              onChange={e => setDataFimPeriodo(e.target.value)} 
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs" 
            />
          </div>

          <button
            onClick={() => abrirImpressao(`/print/periodo?inicio=${dataInicioPeriodo}&fim=${dataFimPeriodo}`)}
            className="bg-[#0f172a] hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-lg text-xs flex items-center justify-center gap-2 shadow"
          >
            <ExternalLink size={15}/> Visualizar Relatório
          </button>
        </div>
      </div>

      {/* RELATÓRIO 2: RELATÓRIO DIÁRIO DETALHADO */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
          <FileText size={18} className="text-primary"/> Relatório Diário Detalhado
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Selecione o Dia</label>
            <input 
              type="date" 
              value={dataDiario} 
              onChange={e => setDataDiario(e.target.value)} 
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs" 
            />
          </div>

          <div className="md:col-span-2">
            <button
              onClick={() => abrirImpressao(`/print/diario?data=${dataDiario}`)}
              className="bg-[#0f172a] hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-lg text-xs flex items-center justify-center gap-2 shadow"
            >
              <ExternalLink size={15}/> Visualizar Relatório
            </button>
          </div>
        </div>
      </div>

      {/* RELATÓRIO 3: TOTALIZADOR POR FORNECEDOR */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
          <Users size={18} className="text-primary"/> Relatório Totalizador por Fornecedor
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Inicial</label>
            <input 
              type="date" 
              value={dataInicioForn} 
              onChange={e => setDataInicioForn(e.target.value)} 
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Final</label>
            <input 
              type="date" 
              value={dataFimForn} 
              onChange={e => setDataFimForn(e.target.value)} 
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
            <select 
              value={statusForn} 
              onChange={e => setStatusForn(e.target.value)} 
              className="w-full p-2.5 border rounded-lg bg-white text-xs font-semibold"
            >
              <option value="TODOS">STATUS (Todos)</option>
              <option value="Pendente">Pendente</option>
              <option value="Pago">Pago</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fornecedor</label>
            <select 
              value={fornecedorId} 
              onChange={e => setFornecedorId(e.target.value)} 
              className="w-full p-2.5 border rounded-lg bg-white text-xs font-semibold"
            >
              <option value="TODOS">Todos Fornecedores</option>
              {fornecedores.map(f => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => abrirImpressao(`/print/fornecedor?inicio=${dataInicioForn}&fim=${dataFimForn}&status=${statusForn}&fornecedor=${fornecedorId}`)}
            className="bg-[#0f172a] hover:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-lg text-xs flex items-center justify-center gap-2 shadow"
          >
            <ExternalLink size={15}/> Visualizar Relatório
          </button>
        </div>
      </div>

    </div>
  );
}