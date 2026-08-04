import { useState, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import { 
  Filter, 
  Search, 
  RotateCcw, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Building, 
  FileSpreadsheet, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CheckCircle2 
} from 'lucide-react';

export default function ExtratosTab() {
  const [transacoes, setTransacoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // FILTROS
  const [banco, setBanco] = useState('TODOS');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipoOperacao, setTipoOperacao] = useState('TODAS');

  const bancosDisponiveis = [
    { id: 'Bradesco', label: 'Bradesco' },
    { id: 'Santander', label: 'Santander' },
    { id: 'Sicoob', label: 'Sicoob' },
    { id: 'Tribanco', label: 'Tribanco' },
    { id: 'TODOS', label: 'Todos' }
  ];

  const tiposOperacao = [
    { id: 'TODAS', label: 'Todas' },
    { id: 'Entrada', label: 'Entradas' },
    { id: 'Saída', label: 'Saídas' }
  ];

  const carregarExtrato = async () => {
    setLoading(true);
    setHasSearched(true);

    let query = supabase
      .from('extrato_transacoes')
      .select('*')
      .order('data_transacao', { ascending: false });

    if (banco !== 'TODOS') query = query.eq('banco', banco);
    if (dataInicio) query = query.gte('data_transacao', dataInicio);
    if (dataFim) query = query.lte('data_transacao', dataFim);
    if (tipoOperacao !== 'TODAS') query = query.eq('tipo_operacao', tipoOperacao);

    const { data, error } = await query;
    if (error) {
      alert("Erro ao carregar extrato: " + error.message);
    } else {
      setTransacoes(data || []);
    }
    setLoading(false);
  };

  const limparFiltros = () => {
    setBanco('TODOS');
    setDataInicio('');
    setDataFim('');
    setTipoOperacao('TODAS');
    setTransacoes([]);
    setHasSearched(false);
  };

  // CÁLCULOS DO MINI DASHBOARD
  const resumoDashboard = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    let conciliadosCount = 0;

    transacoes.forEach(t => {
      const val = Number(t.valor) || 0;
      if (t.tipo_operacao === 'Entrada') {
        entradas += val;
      } else if (t.tipo_operacao === 'Saída') {
        saidas += val;
      }
      if (t.conciliado) {
        conciliadosCount++;
      }
    });

    const saldo = entradas - saidas;
    const percConciliado = transacoes.length > 0 ? ((conciliadosCount / transacoes.length) * 100).toFixed(1) : 0;

    return {
      entradas,
      saidas,
      saldo,
      totalRegistros: transacoes.length,
      conciliadosCount,
      percConciliado
    };
  }, [transacoes]);

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatarData = (d) => d ? d.split('-').reverse().join('/') : '';

  return (
    <div className="space-y-6">
      
      {/* PAINEL DE FILTROS DO EXTRATO */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
            <Filter size={18} className="text-primary" /> Filtros de Visualização de Extrato
          </h3>
          <button 
            onClick={limparFiltros} 
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={14}/> Limpar Filtros
          </button>
        </div>

        {/* 1. SELEÇÃO DE BANCO (BOTÕES) */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
            <Building size={14}/> Escolha o Banco
          </label>
          <div className="flex flex-wrap gap-2">
            {bancosDisponiveis.map(b => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBanco(b.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                  banco === b.id
                    ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-md scale-105'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. SELEÇÃO DE PERÍODO & TIPO DE OPERAÇÃO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Início</label>
              <input 
                type="date" 
                value={dataInicio} 
                onChange={e => setDataInicio(e.target.value)} 
                className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs font-medium outline-none focus:ring-2 focus:ring-primary" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Fim</label>
              <input 
                type="date" 
                value={dataFim} 
                onChange={e => setDataFim(e.target.value)} 
                className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs font-medium outline-none focus:ring-2 focus:ring-primary" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tipo de Operação</label>
            <div className="flex gap-1.5">
              {tiposOperacao.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTipoOperacao(t.id)}
                  className={`flex-1 py-2.5 px-2 rounded-lg text-xs font-bold transition-all border text-center ${
                    tipoOperacao === t.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* BOTÃO APLICAR FILTRO */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button 
            type="button" 
            onClick={limparFiltros} 
            className="px-5 py-2.5 border rounded-lg text-gray-600 font-semibold hover:bg-gray-50 text-xs transition-colors"
          >
            Limpar
          </button>

          <button 
            type="button" 
            onClick={carregarExtrato} 
            disabled={loading}
            className="bg-primary hover:bg-blue-900 text-white font-bold py-2.5 px-8 rounded-lg shadow-md text-xs flex items-center justify-center gap-2 transition-transform hover:scale-105 disabled:opacity-50"
          >
            <Search size={16}/> {loading ? "Buscando Lançamentos..." : "Aplicar Filtro"}
          </button>
        </div>

      </div>

      {/* ÁREA DE RESULTADOS (MINI DASHBOARD + LISTAGEM) */}
      <div className="space-y-6">
        
        {!hasSearched ? (
          <div className="bg-white p-12 rounded-xl border shadow-sm text-center py-16 text-gray-400 space-y-2">
            <FileSpreadsheet size={48} className="mx-auto opacity-40 text-gray-400" />
            <p className="text-sm font-semibold text-gray-600">Nenhum extrato listado no momento.</p>
            <p className="text-xs text-gray-400">Escolha o banco, o período ou a operação acima e clique em <strong>"Aplicar Filtro"</strong> para visualizar os lançamentos.</p>
          </div>
        ) : loading ? (
          <div className="bg-white p-12 rounded-xl border shadow-sm text-center py-12 text-gray-500 font-medium">
            Carregando lançamentos do extrato...
          </div>
        ) : (
          <>
            {/* MINI DASHBOARD INFORMATIVO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card Entradas */}
              <div className="bg-white p-5 rounded-xl border shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-gray-500 uppercase">Entradas</span>
                  <div className="p-2 bg-green-100 text-green-700 rounded-lg"><TrendingUp size={18}/></div>
                </div>
                <p className="text-2xl font-extrabold text-green-600">{formatarMoeda(resumoDashboard.entradas)}</p>
              </div>

              {/* Card Saídas */}
              <div className="bg-white p-5 rounded-xl border shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-gray-500 uppercase">Saídas</span>
                  <div className="p-2 bg-red-100 text-red-700 rounded-lg"><TrendingDown size={18}/></div>
                </div>
                <p className="text-2xl font-extrabold text-red-600">{formatarMoeda(resumoDashboard.saidas)}</p>
              </div>

              {/* Card Saldo do Período */}
              <div className="bg-white p-5 rounded-xl border shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-gray-500 uppercase">Saldo Período</span>
                  <div className="p-2 bg-blue-100 text-blue-800 rounded-lg"><DollarSign size={18}/></div>
                </div>
                <p className={`text-2xl font-extrabold ${resumoDashboard.saldo >= 0 ? 'text-blue-900' : 'text-red-600'}`}>
                  {formatarMoeda(resumoDashboard.saldo)}
                </p>
              </div>

              {/* Card Índice de Conciliação */}
              <div className="bg-white p-5 rounded-xl border shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-gray-500 uppercase">Índice Conciliado</span>
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg"><CheckCircle2 size={18}/></div>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-indigo-900">{resumoDashboard.percConciliado}%</p>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {resumoDashboard.conciliadosCount} de {resumoDashboard.totalRegistros} itens
                  </span>
                </div>
              </div>

            </div>

            {/* TABELA DO EXTRATO */}
            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-bold text-gray-800 text-sm">
                  Resultado do Extrato ({transacoes.length} lançamentos)
                </h3>
                <span className="text-xs bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full">
                  Banco: {banco}
                </span>
              </div>

              {transacoes.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  Nenhuma transação encontrada para os filtros selecionados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b text-gray-500 uppercase font-bold">
                        <th className="p-3">Data</th>
                        <th className="p-3">Banco</th>
                        <th className="p-3">Operação</th>
                        <th className="p-3">Descrição / Memo</th>
                        <th className="p-3">Categoria / Subcategoria</th>
                        <th className="p-3">Origem / Destino</th>
                        <th className="p-3 text-right">Valor R$</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {transacoes.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="p-3 font-medium whitespace-nowrap">{formatarData(t.data_transacao)}</td>
                          <td className="p-3 font-bold text-gray-700 whitespace-nowrap">{t.banco}</td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`flex items-center gap-1 font-bold ${t.tipo_operacao === 'Entrada' ? 'text-green-600' : 'text-red-600'}`}>
                              {t.tipo_operacao === 'Entrada' ? <ArrowUpCircle size={14}/> : <ArrowDownCircle size={14}/>}
                              {t.tipo_operacao}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-gray-800 max-w-xs truncate" title={t.descricao}>{t.descricao}</td>
                          <td className="p-3 text-gray-500 max-w-xs truncate">
                            {t.categoria_macro || 'N/A'} {t.subcategoria ? `› ${t.subcategoria}` : ''}
                          </td>
                          <td className="p-3">{t.origem_destino || '-'}</td>
                          <td className={`p-3 text-right font-bold whitespace-nowrap ${t.tipo_operacao === 'Entrada' ? 'text-green-600' : 'text-red-600'}`}>
                            {formatarMoeda(t.valor)}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${t.conciliado ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                              {t.conciliado ? 'Conciliado' : 'Pendente'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

      </div>

    </div>
  );
}