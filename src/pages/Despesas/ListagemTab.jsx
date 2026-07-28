import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import { 
  Trash2, 
  Search, 
  FileText, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Pencil, 
  X, 
  Save 
} from 'lucide-react';

export default function ListagemTab() {
  const [despesas, setDespesas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Listas de apoio para selects
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

  // ESTADOS DO MODAL DE EDIÇÃO
  const [modalEditar, setModalEditar] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [formEdicao, setFormEdicao] = useState({
    id: null,
    data_pagamento: '',
    fornecedor_id: '',
    centro_custo_id: '',
    grupo_id: '',
    conta_id: '',
    origem: '',
    forma_pagamento: '',
    valor: '',
    observacao: ''
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    const [resDesp, resF, resCC, resG, resC] = await Promise.all([
      supabase
        .from('despesas')
        .select('*, centros_custo(sigla, descricao), grupos_despesa(descricao), contas_despesa(descricao), fornecedores(nome)')
        .order('data_pagamento', { ascending: false }),
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

  // ABRIR MODAL DE EDIÇÃO
  const handleAbrirEditar = (item) => {
    setFormEdicao({
      id: item.id,
      data_pagamento: item.data_pagamento || '',
      fornecedor_id: item.fornecedor_id || '',
      centro_custo_id: item.centro_custo_id || '',
      grupo_id: item.grupo_id || '',
      conta_id: item.conta_id || '',
      origem: item.origem || '',
      forma_pagamento: item.forma_pagamento || '',
      valor: item.valor ? String(item.valor) : '',
      observacao: item.observacao || ''
    });
    setModalEditar(true);
  };

  // SALVAR ALTERAÇÃO DA DESPESA
  const handleSalvarEdicao = async (e) => {
    e.preventDefault();

    if (!formEdicao.data_pagamento || !formEdicao.valor || !formEdicao.fornecedor_id || !formEdicao.conta_id) {
      return alert("Preencha todos os campos obrigatórios (*).");
    }

    setSalvandoEdicao(true);

    const dadosAtualizar = {
      data_pagamento: formEdicao.data_pagamento,
      fornecedor_id: Number(formEdicao.fornecedor_id),
      centro_custo_id: Number(formEdicao.centro_custo_id),
      grupo_id: Number(formEdicao.grupo_id),
      conta_id: Number(formEdicao.conta_id),
      origem: formEdicao.origem,
      forma_pagamento: formEdicao.forma_pagamento,
      valor: parseFloat(formEdicao.valor),
      observacao: formEdicao.observacao
    };

    const { error } = await supabase
      .from('despesas')
      .update(dadosAtualizar)
      .eq('id', formEdicao.id);

    setSalvandoEdicao(false);

    if (error) {
      alert("Erro ao atualizar despesa: " + error.message);
    } else {
      alert("Despesa atualizada com sucesso!");
      setModalEditar(false);
      carregarDados(); // Recarrega para trazer relacionamentos atualizados
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
      if (busca) {
        const termo = busca.toLowerCase();
        const forn = d.fornecedores?.nome?.toLowerCase() || '';
        const cc = d.centros_custo?.sigla?.toLowerCase() || '';
        const conta = d.contas_despesa?.descricao?.toLowerCase() || '';
        const obs = d.observacao?.toLowerCase() || '';
        if (!forn.includes(termo) && !cc.includes(termo) && !conta.includes(termo) && !obs.includes(termo)) return false;
      }

      if (filtroDataInicio && d.data_pagamento < filtroDataInicio) return false;
      if (filtroDataFim && d.data_pagamento > filtroDataFim) return false;
      if (filtroFornecedor && d.fornecedor_id !== Number(filtroFornecedor)) return false;
      if (filtroOrigem && d.origem !== filtroOrigem) return false;
      if (filtroCC && d.centro_custo_id !== Number(filtroCC)) return false;
      if (filtroGrupo && d.grupo_id !== Number(filtroGrupo)) return false;
      if (filtroConta && d.conta_id !== Number(filtroConta)) return false;

      return true;
    });
  }, [despesas, busca, filtroDataInicio, filtroDataFim, filtroFornecedor, filtroOrigem, filtroCC, filtroGrupo, filtroConta]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, filtroDataInicio, filtroDataFim, filtroFornecedor, filtroOrigem, filtroCC, filtroGrupo, filtroConta]);

  // DADOS PAGINADOS (20 REGISTROS POR PÁGINA)
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
          <div>
            <label className="block text-gray-600 font-semibold mb-1">Data Início</label>
            <input type="date" className="w-full p-2 border rounded bg-white" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} />
          </div>

          <div>
            <label className="block text-gray-600 font-semibold mb-1">Data Fim</label>
            <input type="date" className="w-full p-2 border rounded bg-white" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} />
          </div>

          <div>
            <label className="block text-gray-600 font-semibold mb-1">Fornecedor / Prestador</label>
            <select className="w-full p-2 border rounded bg-white" value={filtroFornecedor} onChange={e => setFiltroFornecedor(e.target.value)}>
              <option value="">Todos Fornecedores</option>
              {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>

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

          <div>
            <label className="block text-gray-600 font-semibold mb-1">Centro de Custo</label>
            <select className="w-full p-2 border rounded bg-white" value={filtroCC} onChange={e => { setFiltroCC(e.target.value); setFiltroGrupo(''); setFiltroConta(''); }}>
              <option value="">Todos Centros de Custo</option>
              {centrosCusto.map(cc => <option key={cc.id} value={cc.id}>{cc.codigo} - {cc.descricao}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-gray-600 font-semibold mb-1">Grupo</label>
            <select className="w-full p-2 border rounded bg-white disabled:opacity-50" value={filtroGrupo} onChange={e => { setFiltroGrupo(e.target.value); setFiltroConta(''); }} disabled={!filtroCC}>
              <option value="">Todos Grupos</option>
              {grupos.filter(g => g.centro_custo_id === Number(filtroCC)).map(g => <option key={g.id} value={g.id}>{g.codigo} - {g.descricao}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-gray-600 font-semibold mb-1">Conta</label>
            <select className="w-full p-2 border rounded bg-white disabled:opacity-50" value={filtroConta} onChange={e => setFiltroConta(e.target.value)} disabled={!filtroGrupo}>
              <option value="">Todas Contas</option>
              {contas.filter(c => c.grupo_id === Number(filtroGrupo)).map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.descricao}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-gray-600 font-semibold mb-1">Busca Rápida</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
              <input type="text" placeholder="Observação, nome..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full pl-8 p-1.5 border rounded bg-white outline-none" />
            </div>
          </div>
        </div>
      </div>

      {/* RESUMO DE CONTAGEM */}
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
                <th className="p-3 text-center w-24">Ações</th>
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
                  
                  {/* COLUNA DE AÇÕES (EDITAR E EXCLUIR) */}
                  <td className="p-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => handleAbrirEditar(d)} 
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" 
                        title="Editar despesa"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => handleExcluir(d.id)} 
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" 
                        title="Excluir despesa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* COMPONENTE DE PAGINAÇÃO */}
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

      {/* MODAL EDITAR DESPESA */}
      {modalEditar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative border border-gray-200 animate-in fade-in zoom-in duration-150">
            
            {/* CABEÇALHO DO MODAL */}
            <div className="p-5 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-[#003366] flex items-center gap-2">
                <Pencil size={20} className="text-indigo-600" /> Editar Despesa
              </h3>
              <button 
                onClick={() => setModalEditar(false)} 
                className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* FORMULÁRIO DE EDIÇÃO */}
            <form onSubmit={handleSalvarEdicao} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Data */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Data *</label>
                  <input 
                    type="date" 
                    className="w-full p-2.5 border rounded bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                    value={formEdicao.data_pagamento} 
                    onChange={e => setFormEdicao({...formEdicao, data_pagamento: e.target.value})} 
                    required 
                  />
                </div>

                {/* Valor */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Valor (R$) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="w-full p-2.5 border rounded bg-gray-50 text-sm font-bold text-red-600 outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder="0.00" 
                    value={formEdicao.valor} 
                    onChange={e => setFormEdicao({...formEdicao, valor: e.target.value})} 
                    required 
                  />
                </div>

                {/* Fornecedor */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fornecedor / Prestador *</label>
                  <select 
                    className="w-full p-2.5 border rounded bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                    value={formEdicao.fornecedor_id} 
                    onChange={e => setFormEdicao({...formEdicao, fornecedor_id: e.target.value})} 
                    required
                  >
                    <option value="">Selecione o Fornecedor...</option>
                    {fornecedores.map(f => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Centro de Custo */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Centro de Custo *</label>
                  <select 
                    className="w-full p-2.5 border rounded bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                    value={formEdicao.centro_custo_id} 
                    onChange={e => setFormEdicao({
                      ...formEdicao, 
                      centro_custo_id: e.target.value, 
                      grupo_id: '', 
                      conta_id: '' 
                    })} 
                    required
                  >
                    <option value="">Selecione...</option>
                    {centrosCusto.map(cc => (
                      <option key={cc.id} value={cc.id}>{cc.codigo} - {cc.descricao}</option>
                    ))}
                  </select>
                </div>

                {/* Grupo */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Grupo *</label>
                  <select 
                    className="w-full p-2.5 border rounded bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" 
                    value={formEdicao.grupo_id} 
                    onChange={e => setFormEdicao({
                      ...formEdicao, 
                      grupo_id: e.target.value, 
                      conta_id: '' 
                    })} 
                    disabled={!formEdicao.centro_custo_id} 
                    required
                  >
                    <option value="">Selecione...</option>
                    {grupos
                      .filter(g => g.centro_custo_id === Number(formEdicao.centro_custo_id))
                      .map(g => (
                        <option key={g.id} value={g.id}>{g.codigo} - {g.descricao}</option>
                      ))}
                  </select>
                </div>

                {/* Conta */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Conta *</label>
                  <select 
                    className="w-full p-2.5 border rounded bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" 
                    value={formEdicao.conta_id} 
                    onChange={e => setFormEdicao({...formEdicao, conta_id: e.target.value})} 
                    disabled={!formEdicao.grupo_id} 
                    required
                  >
                    <option value="">Selecione...</option>
                    {contas
                      .filter(c => c.grupo_id === Number(formEdicao.grupo_id))
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.codigo} - {c.descricao}</option>
                      ))}
                  </select>
                </div>

                {/* Origem */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Origem / Banco</label>
                  <select 
                    className="w-full p-2.5 border rounded bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                    value={formEdicao.origem} 
                    onChange={e => setFormEdicao({...formEdicao, origem: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    <option value="Bradesco">Bradesco</option>
                    <option value="Santander">Santander</option>
                    <option value="Sicoob">Sicoob</option>
                    <option value="Tribanco">Tribanco</option>
                    <option value="Tesouraria">Tesouraria</option>
                  </select>
                </div>

                {/* Forma de Pagamento */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Forma de Pagamento</label>
                  <select 
                    className="w-full p-2.5 border rounded bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                    value={formEdicao.forma_pagamento} 
                    onChange={e => setFormEdicao({...formEdicao, forma_pagamento: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    <option value="Cartão">Cartão</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="PIX">PIX</option>
                  </select>
                </div>

                {/* Observação */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Observação</label>
                  <textarea 
                    rows="3" 
                    className="w-full p-2.5 border rounded bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                    value={formEdicao.observacao} 
                    onChange={e => setFormEdicao({...formEdicao, observacao: e.target.value})}
                  />
                </div>

              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="flex justify-end gap-3 border-t pt-4 mt-4">
                <button 
                  type="button" 
                  onClick={() => setModalEditar(false)} 
                  className="px-5 py-2.5 rounded-lg border text-gray-600 font-semibold hover:bg-gray-100 text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={salvandoEdicao} 
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
                >
                  <Save size={18} /> {salvandoEdicao ? "Salvando..." : "Salvar Alteração"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}