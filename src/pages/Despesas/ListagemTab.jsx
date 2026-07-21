import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Trash2, Search, FileText } from 'lucide-react';

export default function ListagemTab() {
  const [despesas, setDespesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setSearch] = useState('');

  useEffect(() => {
    carregarDespesas();
  }, []);

  const carregarDespesas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('despesas')
      .select('*, centros_custo(sigla, descricao), grupos_despesa(descricao), contas_despesa(descricao), fornecedores(nome)')
      .order('data_pagamento', { ascending: false });

    if (error) {
      console.error('Erro ao carregar despesas:', error);
    } else {
      setDespesas(data || []);
    }
    setLoading(false);
  };

  const handleExcluir = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este lançamento de despesa?")) return;

    const { error } = await supabase.from('despesas').delete().eq('id', id);
    if (error) {
      alert("Erro ao excluir: " + error.message);
    } else {
      setDespesas(despesas.filter(d => d.id !== id));
    }
  };

  const despesasFiltradas = despesas.filter(d => {
    const termo = busca.toLowerCase();
    const forn = d.fornecedores?.nome?.toLowerCase() || '';
    const cc = d.centros_custo?.sigla?.toLowerCase() || '';
    const conta = d.contas_despesa?.descricao?.toLowerCase() || '';
    const obs = d.observacao?.toLowerCase() || '';
    return forn.includes(termo) || cc.includes(termo) || conta.includes(termo) || obs.includes(termo);
  });

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatarData = (d) => d ? d.split('-').reverse().join('/') : '';

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 space-y-4">
      
      {/* CABEÇALHO E BUSCA */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b pb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-bold text-gray-800">Listagem de Despesas</h3>
          <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
            {despesasFiltradas.length} registros
          </span>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por fornecedor, conta..."
            value={busca}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* TABELA DE DESPESAS COM LAYOUT RESPONSIVO */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 font-medium">Carregando lançamentos...</div>
      ) : despesasFiltradas.length === 0 ? (
        <div className="text-center py-12 text-gray-400 flex flex-col items-center">
          <FileText size={40} className="mb-2 opacity-50" />
          <p>Nenhuma despesa encontrada.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-500 text-xs uppercase font-bold tracking-wider">
                <th className="p-3 w-28">Data</th>
                <th className="p-3">Fornecedor / Prestador</th>
                <th className="p-3">Classificação (CC / Conta)</th>
                <th className="p-3">Origem / PGTO</th>
                <th className="p-3 max-w-xs">Observação</th>
                <th className="p-3 text-right">Valor R$</th>
                <th className="p-3 text-center w-16">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {despesasFiltradas.map((d) => (
                <tr key={d.id} className="hover:bg-blue-50/30 transition-colors">
                  
                  {/* DATA */}
                  <td className="p-3 whitespace-nowrap font-medium text-gray-600 text-xs">
                    {formatarData(d.data_pagamento)}
                  </td>

                  {/* FORNECEDOR */}
                  <td className="p-3 font-semibold text-gray-800 break-words max-w-[200px]">
                    {d.fornecedores?.nome || <span className="text-gray-400 font-normal">Não informado</span>}
                  </td>

                  {/* HIERARQUIA ORGANIZADA EM LINHAS */}
                  <td className="p-3 max-w-[260px]">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-blue-100 text-blue-900 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200">
                          {d.centros_custo?.sigla || 'CC'}
                        </span>
                        <span className="text-xs font-semibold text-gray-700 truncate">
                          {d.grupos_despesa?.descricao}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 truncate pl-1">
                        &rsaquo; {d.contas_despesa?.descricao}
                      </span>
                    </div>
                  </td>

                  {/* ORIGEM E FORMA DE PAGAMENTO */}
                  <td className="p-3 whitespace-nowrap text-xs">
                    <span className="font-semibold text-gray-700 block">
                      {d.origem || '-'}
                    </span>
                    <span className="text-gray-400">
                      {d.forma_pagamento || '-'}
                    </span>
                  </td>

                  {/* OBSERVAÇÃO */}
                  <td className="p-3 text-xs text-gray-500 max-w-[200px] truncate" title={d.observacao}>
                    {d.observacao || '-'}
                  </td>

                  {/* VALOR */}
                  <td className="p-3 text-right font-bold text-red-600 whitespace-nowrap">
                    {formatarMoeda(d.valor)}
                  </td>

                  {/* AÇÕES (EXCLUIR) */}
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleExcluir(d.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Excluir despesa"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}