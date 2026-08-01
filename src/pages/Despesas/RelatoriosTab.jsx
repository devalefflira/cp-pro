import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { PieChart, Building, Users, ExternalLink, LineChart } from 'lucide-react';

export default function RelatoriosTab() {
  const [rangeDre, setRangeDre] = useState({ inicio: '', fim: '' });
  const [rangeDespCC, setRangeDespCC] = useState({ inicio: '', fim: '', centro_custo_id: '' });
  const [rangeDespForn, setRangeDespForn] = useState({ inicio: '', fim: '', fornecedor_id: '' });

  // ESTADOS DO NOVO RELATÓRIO POR CONTA
  const [rangeConta, setRangeConta] = useState({
    inicio: '',
    fim: '',
    centro_custo_id: '',
    grupo_id: '',
    conta_id: ''
  });

  const [listaCentrosCusto, setListaCentrosCusto] = useState([]);
  const [listaGrupos, setListaGrupos] = useState([]);
  const [listaContas, setListaContas] = useState([]);
  const [listaFornecedores, setListaFornecedores] = useState([]);

  useEffect(() => {
    async function carregarAuxiliares() {
      const [resCC, resG, resC, resF] = await Promise.all([
        supabase.from('centros_custo').select('*').order('codigo'),
        supabase.from('grupos_despesa').select('*').order('codigo'),
        supabase.from('contas_despesa').select('*').order('codigo'),
        supabase.from('fornecedores').select('*').order('nome')
      ]);
      setListaCentrosCusto(resCC.data || []);
      setListaGrupos(resG.data || []);
      setListaContas(resC.data || []);
      setListaFornecedores(resF.data || []);
    }
    carregarAuxiliares();
  }, []);

  const handleVisualizarDre = () => {
    if (!rangeDre.inicio || !rangeDre.fim) return alert('Selecione as datas inicial e final!');
    window.open(`/print/dre?inicio=${rangeDre.inicio}&fim=${rangeDre.fim}`, '_blank');
  };

  const handleVisualizarDespCC = () => {
    if (!rangeDespCC.inicio || !rangeDespCC.fim) return alert('Selecione as datas inicial e final!');
    let url = `/print/despesas-cc?inicio=${rangeDespCC.inicio}&fim=${rangeDespCC.fim}`;
    if (rangeDespCC.centro_custo_id) url += `&centro_custo_id=${rangeDespCC.centro_custo_id}`;
    window.open(url, '_blank');
  };

  const handleVisualizarDespForn = () => {
    if (!rangeDespForn.inicio || !rangeDespForn.fim) return alert('Selecione as datas inicial e final!');
    let url = `/print/despesas-fornecedor?inicio=${rangeDespForn.inicio}&fim=${rangeDespForn.fim}`;
    if (rangeDespForn.fornecedor_id) url += `&fornecedor_id=${rangeDespForn.fornecedor_id}`;
    window.open(url, '_blank');
  };

  // AÇÃO DO NOVO RELATÓRIO DE EVOLUÇÃO POR CONTA
  const handleVisualizarEvolucaoConta = () => {
    if (!rangeConta.inicio || !rangeConta.fim) {
      return alert('Selecione as datas inicial e final!');
    }
    if (!rangeConta.conta_id) {
      return alert('Selecione o Centro de Custo, Grupo e a Conta desejada!');
    }

    const url = `/print/evolucao-conta?inicio=${rangeConta.inicio}&fim=${rangeConta.fim}&conta_id=${rangeConta.conta_id}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. RELATÓRIO DE DESPESAS - ESTILO DRE */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <PieChart className="text-indigo-600" size={20} /> Relatório de Despesas - Estilo DRE
        </h3>
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Data Inicial</label>
            <input 
              type="date" 
              className="p-2.5 border rounded-lg bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-auto" 
              value={rangeDre.inicio} 
              onChange={e => setRangeDre({ ...rangeDre, inicio: e.target.value })} 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Data Final</label>
            <input 
              type="date" 
              className="p-2.5 border rounded-lg bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-auto" 
              value={rangeDre.fim} 
              onChange={e => setRangeDre({ ...rangeDre, fim: e.target.value })} 
            />
          </div>
          <button 
            onClick={handleVisualizarDre} 
            className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-bold py-2.5 px-6 rounded-lg shadow flex items-center gap-2 transition-transform hover:scale-105"
          >
            <ExternalLink size={16} /> Gerar DRE
          </button>
        </div>
      </section>

      {/* 2. EVOLUÇÃO DE DESPESAS POR CONTA (NOVO) */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-indigo-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <LineChart className="text-indigo-600" size={20} /> Evolução de Despesas por Conta (Gráfico de Linha)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Data Inicial *</label>
            <input 
              type="date" 
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs outline-none focus:ring-2 focus:ring-indigo-500" 
              value={rangeConta.inicio} 
              onChange={e => setRangeConta({ ...rangeConta, inicio: e.target.value })} 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Data Final *</label>
            <input 
              type="date" 
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs outline-none focus:ring-2 focus:ring-indigo-500" 
              value={rangeConta.fim} 
              onChange={e => setRangeConta({ ...rangeConta, fim: e.target.value })} 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Centro de Custo *</label>
            <select 
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs outline-none focus:ring-2 focus:ring-indigo-500" 
              value={rangeConta.centro_custo_id} 
              onChange={e => setRangeConta({ ...rangeConta, centro_custo_id: e.target.value, grupo_id: '', conta_id: '' })}
            >
              <option value="">Selecione...</option>
              {listaCentrosCusto.map(cc => (
                <option key={cc.id} value={cc.id}>{cc.codigo} - {cc.descricao}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Grupo *</label>
            <select 
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" 
              value={rangeConta.grupo_id} 
              onChange={e => setRangeConta({ ...rangeConta, grupo_id: e.target.value, conta_id: '' })}
              disabled={!rangeConta.centro_custo_id}
            >
              <option value="">Selecione...</option>
              {listaGrupos
                .filter(g => g.centro_custo_id === Number(rangeConta.centro_custo_id))
                .map(g => (
                  <option key={g.id} value={g.id}>{g.codigo} - {g.descricao}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Conta *</label>
            <select 
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" 
              value={rangeConta.conta_id} 
              onChange={e => setRangeConta({ ...rangeConta, conta_id: e.target.value })}
              disabled={!rangeConta.grupo_id}
            >
              <option value="">Selecione...</option>
              {listaContas
                .filter(c => c.grupo_id === Number(rangeConta.grupo_id))
                .map(c => (
                  <option key={c.id} value={c.id}>{c.codigo} - {c.descricao}</option>
                ))}
            </select>
          </div>

          <button 
            onClick={handleVisualizarEvolucaoConta} 
            className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold py-2.5 px-3 rounded-lg shadow flex items-center justify-center gap-1.5 transition-transform hover:scale-105"
          >
            <ExternalLink size={15} /> Visualizar
          </button>
        </div>
      </section>

      {/* 3. DESPESAS POR CENTRO DE CUSTO */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Building className="text-indigo-600" size={20} /> Despesas por Centro de Custo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Data Inicial</label>
            <input 
              type="date" 
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
              value={rangeDespCC.inicio} 
              onChange={e => setRangeDespCC({ ...rangeDespCC, inicio: e.target.value })} 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Data Final</label>
            <input 
              type="date" 
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
              value={rangeDespCC.fim} 
              onChange={e => setRangeDespCC({ ...rangeDespCC, fim: e.target.value })} 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Centro de Custo</label>
            <select 
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
              value={rangeDespCC.centro_custo_id} 
              onChange={e => setRangeDespCC({ ...rangeDespCC, centro_custo_id: e.target.value })}
            >
              <option value="">Todos Centros de Custo</option>
              {listaCentrosCusto.map(cc => (
                <option key={cc.id} value={cc.id}>{cc.sigla} - {cc.descricao}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={handleVisualizarDespCC} 
            className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-bold py-2.5 px-4 rounded-lg shadow flex items-center justify-center gap-2 transition-transform hover:scale-105"
          >
            <ExternalLink size={16} /> Visualizar Relatório
          </button>
        </div>
      </section>

      {/* 4. DESPESAS POR FORNECEDOR / PRESTADOR */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Users className="text-indigo-600" size={20} /> Despesas por Fornecedor / Prestador
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Data Inicial</label>
            <input 
              type="date" 
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
              value={rangeDespForn.inicio} 
              onChange={e => setRangeDespForn({ ...rangeDespForn, inicio: e.target.value })} 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Data Final</label>
            <input 
              type="date" 
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
              value={rangeDespForn.fim} 
              onChange={e => setRangeDespForn({ ...rangeDespForn, fim: e.target.value })} 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Fornecedor</label>
            <select 
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
              value={rangeDespForn.fornecedor_id} 
              onChange={e => setRangeDespForn({ ...rangeDespForn, fornecedor_id: e.target.value })}
            >
              <option value="">Todos Fornecedores</option>
              {listaFornecedores.map(f => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={handleVisualizarDespForn} 
            className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-bold py-2.5 px-4 rounded-lg shadow flex items-center justify-center gap-2 transition-transform hover:scale-105"
          >
            <ExternalLink size={16} /> Visualizar Relatório
          </button>
        </div>
      </section>

    </div>
  );
}