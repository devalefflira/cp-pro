import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import { Trash2, Search, FileText, Filter, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

export default function ListagemTab() {
  const [despesas, setDespesas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Listas para os Selects
  const [fornecedores, setFornecedores] = useState([]);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [contas, setContas] = useState([]);

  // ESTADOS DOS FILTROS
  const [busca, setBusca] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroFornecedor, setFiltroFornecedor] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState('');
  const [filtroCC, setFiltroCC] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState('');
  const [filtroConta, setFiltroConta] = useState('');

  // PAGINAÇÃO
  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 20;

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    const [resDesp, resF, resCC, resG, resC] = await Promise.all([
      supabase.from('despesas').select('*, centros_custo(sigla, descricao), grupos_despesa(descricao), contas_despesa(descricao), fornecedores(nome)').order('data_pagamento', { ascending: false }),
      supabase.from('fornecedores').select('*').order('nome'),
      supabase.from('centros_custo').select('*').order('codigo'),
      supabase.from('grupos_despesa').select('*').order('codigo'),
      supabase.from('contas_despesa').select('*').order('codigo')
    ]);

    setDespesas(resDesp.data || []);
    setFornecedores(resF.data || []);
    setCentrosCusto(resCC.data || []);
    setGrupos(resG.data || []);
    setContas(resC.data || []);
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

  const limparFiltros = () => {
    setBusca('');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setFiltroFornecedor('');
    setFiltroOrigem('');
    setFiltroCC('');
    setFiltroGrupo('');
    setFiltroConta('');
    setPaginaAtual(1);
  };

  // MULTI-FILTRAGEM EM MEMÓRIA
  const despesasFiltradas = useMemo(() => {
    return despesas.filter(d => {
      // 1. Busca textual
      if (busca) {
        const termo = busca.toLowerCase();
        const forn = d.fornecedores?.nome?.toLowerCase() || '';
        const cc = d.centros_custo?.sigla?.toLowerCase() || '';
        const conta = d.contas_despesa?.descricao?.toLowerCase() || '';
        const obs = d.observacao?.toLowerCase() || '';
        if (!forn.includes(termo) && !cc.includes(termo) && !conta.includes(termo) && !obs.includes(termo)) return false;
      }

      // 2. Período
      if (filtroDataInicio && d.data_pagamento < filtroDataInicio) return false;
      if (filtroDataFim && d.data_pagamento > filtroDataFim) return false;

      // 3. Fornecedor
      if (filtroFornecedor && d.fornecedor_id !== Number(filtroFornecedor)) return false;

      // 4. Origem
      if (filtroOrigem && d.origem !== filtroOrigem) return false;

      // 5. Centro de Custo
      if (filtroCC && d.centro_custo_id !== Number(filtroCC)) return false;

      // 6. Grupo
      if (filtroGrupo && d.grupo_id !== Number(filtroGrupo)) return false;

      // 7. Conta
      if (filtroConta && d.conta_id !== Number(filtroConta)) return false;

      return true;
    });
  }, [despesas, busca, filtroDataInicio, filtroDataFim, filtroFornecedor, filtroOrigem, filtroCC, filtroGrupo, filtroConta]);

  // RESETAR PÁGINA AO FILTRAR
  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, filtroDataInicio, filtroDataFim, filtroFornecedor, filtroOrigem, filtroCC, filtroGrupo, filtroConta]);

  // DADOS PAGINADOS
  const totalPaginas = Math.ceil(despesasFiltradas.length / ITENS_POR_PAGINA) || 1;
  const despesasPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
    return despesasFiltradas.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [despesasFiltradas, paginaAtual]);

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatarData = (d) => d ? d.split('-').reverse().join('/') : '';

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 space-y-6">
      
      {/* PAINEL DE FILTROS AVANÇADOS */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2">
            <Filter size={18} className="text-primary"/> Filtros de Pesquisa
          </h4>
          <button onClick={limparFiltros} className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
            <RotateCcw size={14}/> Limpar Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          
          {/* Período */}
          <div>
            <label className="block text-gray-600 font-semibold mb-1">Data Início</label>
            <input type="date" className="w-full p-2 border rounded bg-white" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} />
          </div>

          <div>
            <label className="block text-gray-600 font-semibold mb-1">Data Fim</label>
            <input type="date" className="w-full p-2 border rounded bg-white" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} />
          </div>

          {/* Fornecedor */}
          <div>
            <label className="block text-gray-600 font-semibold mb-1">Fornecedor / Prestador</label>
            <select className="w-full p-2 border rounded bg-white" value={filtroFornecedor} onChange={e => setFiltroFornecedor(e.target.value)}>
              <option value="">Todos Fornecedores</option>
              {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>

          {/* Origem */}
          <div>
            <label className="block text-gray-600 font-semibold mb-1">Origem / Banco</label>
            <select className="w-full p-2 border rounded bg-white" value={filtroOrigem} onChange={e => setFiltroOrigem(e.target.value)}>
              <option value="">Todas Origens</option>
              <option value="Bradesco">Bradesco</option>
              <option value="Santander">Santander</option>
              <option value="Sicoob">Sicoob</option>
              <option value="Tribanco">Tribanco</option>
              <option value="Tesouraria">Tesouraria</option>
            </select>
          </div>

          {/* Centro de Custo */}
          <div>
            <label className="block text-gray-600 font-semibold mb-1">Centro de Custo</label>
            <select className="w-full p-2 border rounded bg-white" value={filtroCC} onChange={e => { setFiltroCC(e.target.value); setFiltroGrupo(''); setFiltroConta(''); }}>
              <option value="">Todos Centros de Custo</option>
              {centrosCusto.map(cc => <option key={cc.id} value={cc.id}>{cc.codigo} - {cc.descricao}</option>)}
            </select>
          </div>

          {/* Grupo */}
          <div>
            <label className="block text-gray-600 font-semibold mb-1">Grupo</label>
            <select className="w-full p-2 border rounded bg-white disabled:opacity-50" value={filtroGrupo} onChange={e => { setFiltroGrupo(e.target.value); setFiltroConta(''); }} disabled={!filtroCC}>
              <option value="">Todos Grupos</option>
              {grupos.filter(g => g.centro_custo_id === Number(filtroCC)).map(g => <option key={g.id} value={g.id}>{g.codigo} - {g.descricao}</option>)}
            </select>
          </div>

          {/* Conta */}
          <div>
            <label className="block text-gray-600 font-semibold mb-1">Conta</label>
            <select className="w-full p-2 border rounded bg-white disabled:opacity-50" value={filtroConta} onChange={e => setFiltroConta(e.target.value)} disabled={!filtroGrupo}>
              <option value="">Todas Contas</option>
              {contas.filter(c => c.grupo_id === Number(filtroGrupo)).map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.descricao}</option>)}
            </select>
          </div>

          {/* Busca por Palavra-chave */}
          <div>
            <label className="block text-gray-600 font-semibold mb-1">Busca Rápida</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
              <input type="text" placeholder="Observação, nome..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full pl-8 p-1.5 border rounded bg-white outline-none" />
            </div>
          </div>

        </div>
      </div>

      {/* CABEÇALHO RESUMO */}
      <div className="flex justify-between items-center">
        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
          {despesasFiltradas.length} lançamentos encontrados
        </span>
        <span className="text-xs text-gray-500 font-medium">
          Exibindo {despesasPaginadas.length} por página (máx: 20)
        </span>
      </div>

      {/* TABELA DE DESPESAS */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 font-medium">Carregando lançamentos...</div>
      ) : despesasFiltradas.length === 0 ? (
        <div className="text-center py-12 text-gray-400 flex flex-col items-center">
          <FileText size={40} className="mb-2 opacity-50" />
          <p>Nenhuma despesa encontrada para os filtros selecionados.</p>
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
              {despesasPaginadas.map((d) => (
                <tr key={d.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-3 whitespace-nowrap font-medium text-gray-600 text-xs">{formatarData(d.data_pagamento)}</td>
                  <td className="p-3 font-semibold text-gray-800 break-words max-w-[200px]">{d.fornecedores?.nome || <span className="text-gray-400 font-normal">Não informado</span>}</td>
                  <td className="p-3 max-w-[260px]">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-blue-100 text-blue-900 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200">{d.centros_custo?.sigla || 'CC'}</span>
                        <span className="text-xs font-semibold text-gray-700 truncate">{d.grupos_despesa?.descricao}</span>
                      </div>
                      <span className="text-xs text-gray-500 truncate pl-1">&rsaquo; {d.contas_despesa?.descricao}</span>
                    </div>
                  </td>
                  <td className="p-3 whitespace-nowrap text-xs">
                    <span className="font-semibold text-gray-700 block">{d.origem || '-'}</span>
                    <span className="text-gray-400">{d.forma_pagamento || '-'}</span>
                  </td>
                  <td className="p-3 text-xs text-gray-500 max-w-[200px] truncate" title={d.observacao}>{d.observacao || '-'}</td>
                  <td className="p-3 text-right font-bold text-red-600 whitespace-nowrap">{formatarMoeda(d.valor)}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => handleExcluir(d.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir despesa">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* COMPONENTE DE PAGINAÇÃO (MÁX 20 REGISTROS) */}
      {despesasFiltradas.length > ITENS_POR_PAGINA && (
        <div className="flex justify-between items-center border-t pt-4 text-xs font-medium text-gray-600">
          <div>
            Página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))}
              disabled={paginaAtual === 1}
              className="p-2 border rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1 font-semibold"
            >
              <ChevronLeft size={16}/> Anterior
            </button>
            <button
              onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas))}
              disabled={paginaAtual === totalPaginas}
              className="p-2 border rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1 font-semibold"
            >
              Próximo <ChevronRight size={16}/>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}