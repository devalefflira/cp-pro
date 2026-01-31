import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Trash2, Edit, ChevronLeft, ChevronRight, X, RotateCcw, History, FilePenLine, Search, ChevronDown, Save, MessageSquare, MessageCircle } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

// --- COMPONENTE CUSTOMIZADO: SELECT PESQUISÁVEL ---
const SearchableSelect = ({ 
  label, 
  options, 
  value, 
  onChange, 
  placeholder, 
  fieldKey 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!value) {
      setSearch('');
    } else {
      const selected = options.find(o => o.id === value);
      if (selected) setSearch(selected[fieldKey]);
    }
  }, [value, options, fieldKey]);

  const filteredOptions = options.filter(opt => 
    opt[fieldKey].toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (option) => {
    onChange(option.id);
    setSearch(option[fieldKey]);
    setIsOpen(false);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  return (
    <div className="relative mb-4" ref={wrapperRef}>
      <label className="block font-semibold text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          className="w-full p-3 border rounded bg-white focus:ring-2 focus:ring-secondary outline-none pr-10"
          placeholder={placeholder}
          value={search}
          onClick={() => setIsOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
            if(e.target.value === '') onChange('');
          }}
        />
        <div className="absolute right-3 top-3 text-gray-400 pointer-events-none">
          {isOpen ? <Search size={20}/> : <ChevronDown size={20}/>}
        </div>
      </div>
      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-200 mt-1 max-h-60 overflow-y-auto rounded shadow-lg">
          {filteredOptions.map((opt) => (
            <li key={opt.id} onClick={() => handleSelect(opt)} className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0 text-gray-700">
              {opt[fieldKey]}
            </li>
          ))}
        </ul>
      )}
      {isOpen && filteredOptions.length === 0 && (
        <div className="absolute z-50 w-full bg-white border p-3 text-gray-500 italic shadow-lg">
            Nenhum resultado encontrado.
        </div>
      )}
    </div>
  );
};

export default function Listagem() {
  const navigate = useNavigate();
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Listas Auxiliares
  const [listas, setListas] = useState({
    fornecedores: [], tipos_documento: [], bancos: [], razoes: [], parcelas: []
  });

  // Filtros
  const filtrosIniciais = {
    dataInicio: '', dataFim: '', fornecedor_id: '', tipo_documento_id: '', banco_id: '', 
    valorMin: '', valorMax: '', notaFiscal: '', numDocumento: '', status: '',
    comObservacao: false 
  };
  const [filtros, setFiltros] = useState(filtrosIniciais);

  // Paginação
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 10;
  const [totalItens, setTotalItens] = useState(0);

  // Modais
  const [modalAberto, setModalAberto] = useState(false);
  const [lancamentoEdicao, setLancamentoEdicao] = useState(null); 
  const [dadosPagamento, setDadosPagamento] = useState({ valor_pago: '', data_pagamento: '', juros: 0, desconto: 0, dias_atraso: 0 });
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [formEditar, setFormEditar] = useState({});
  const [modalUltimosAberto, setModalUltimosAberto] = useState(false);
  const [ultimosLancamentos, setUltimosLancamentos] = useState([]);
  const [modalObsAberto, setModalObsAberto] = useState(false);
  const [textoObs, setTextoObs] = useState('');

  // 1. Carregar listas
  useEffect(() => {
    async function carregarAuxiliares() {
      const [f, t, b, r, p] = await Promise.all([
        supabase.from('fornecedores').select('*').order('nome'),
        supabase.from('tipos_documento').select('*').order('descricao'),
        supabase.from('bancos').select('*').order('nome'),
        supabase.from('razoes').select('*').order('nome'),
        supabase.from('parcelas').select('*').order('descricao')
      ]);
      setListas({ fornecedores: f.data || [], tipos_documento: t.data || [], bancos: b.data || [], razoes: r.data || [], parcelas: p.data || [] });
    }
    carregarAuxiliares();
  }, []);

  // 2. Buscar Lançamentos
  useEffect(() => { buscarLancamentos(); }, [pagina, filtros]);

  const buscarLancamentos = async () => {
    setLoading(true);
    try {
        let query = supabase.from('lancamentos').select(`*, fornecedores(nome), tipos_documento(descricao), bancos(nome), razoes(nome), parcelas(descricao)`, { count: 'exact' });

        if (filtros.dataInicio) query = query.gte('data_vencimento', filtros.dataInicio);
        if (filtros.dataFim) query = query.lte('data_vencimento', filtros.dataFim);
        if (filtros.fornecedor_id) query = query.eq('fornecedor_id', filtros.fornecedor_id);
        if (filtros.tipo_documento_id) query = query.eq('tipo_documento_id', filtros.tipo_documento_id);
        if (filtros.banco_id) query = query.eq('banco_id', filtros.banco_id);
        if (filtros.comObservacao) query = query.neq('observacao', ''); 
        if (filtros.valorMin) query = query.gte('valor', filtros.valorMin);
        if (filtros.valorMax) query = query.lte('valor', filtros.valorMax);
        if (filtros.notaFiscal) query = query.ilike('nota_fiscal', `%${filtros.notaFiscal}%`);
        if (filtros.numDocumento) query = query.ilike('numero_documento', `%${filtros.numDocumento}%`);
        if (filtros.status) query = query.eq('status', filtros.status);

        const inicio = (pagina - 1) * itensPorPagina;
        const fim = inicio + itensPorPagina - 1;
        query = query.range(inicio, fim).order('data_vencimento', { ascending: false });

        const { data, count, error } = await query;
        if (error) throw error;
        setLancamentos(data || []);
        setTotalItens(count || 0);
    } catch (error) {
        console.error("Erro detalhado:", error);
        alert('Erro ao buscar dados: ' + (error.message || "Erro desconhecido"));
    } finally {
        setLoading(false);
    }
  };

  const handleAbrirUltimos = async () => {
    const { data, error } = await supabase.from('lancamentos').select(`*, fornecedores(nome), tipos_documento(descricao)`).order('created_at', { ascending: false }).limit(5);
    if (error) alert('Erro: ' + error.message);
    else { setUltimosLancamentos([...data].reverse()); setModalUltimosAberto(true); }
  };

  const handleAbrirObs = (obs) => { setTextoObs(obs); setModalObsAberto(true); };

  const handleAbrirEditar = (lancamento) => {
    setFormEditar({
      id: lancamento.id,
      data_vencimento: lancamento.data_vencimento,
      fornecedor_id: lancamento.fornecedor_id,
      tipo_documento_id: lancamento.tipo_documento_id,
      numero_documento: lancamento.numero_documento || '',
      nota_fiscal: lancamento.nota_fiscal || '',
      parcela_id: lancamento.parcela_id,
      razao_id: lancamento.razao_id,
      banco_id: lancamento.banco_id,
      status: lancamento.status,
      valor: lancamento.valor,
      observacao: lancamento.observacao || ''
    });
    setModalEditarAberto(true);
  };

  const handleSalvarEdicao = async () => {
    if (!formEditar.data_vencimento || !formEditar.valor || !formEditar.fornecedor_id) return alert("Preencha os campos obrigatórios (*)");
    const { error } = await supabase.from('lancamentos').update({ ...formEditar, valor: parseFloat(formEditar.valor) }).eq('id', formEditar.id);
    if (error) alert("Erro: " + error.message); else { alert("Atualizado com sucesso!"); setModalEditarAberto(false); buscarLancamentos(); }
  };

  const handleAbrirModalPagamento = (lancamento) => {
    setLancamentoEdicao(lancamento);
    setDadosPagamento({
      valor_pago: lancamento.valor_pago || lancamento.valor,
      data_pagamento: lancamento.data_pagamento || new Date().toISOString().split('T')[0],
      juros: lancamento.juros || 0,
      desconto: lancamento.desconto || 0,
      dias_atraso: lancamento.dias_atraso || 0
    });
    setModalAberto(true);
  };

  useEffect(() => {
    if (!modalAberto || !lancamentoEdicao) return;
    const valorOriginal = Number(lancamentoEdicao.valor);
    const valorPago = Number(dadosPagamento.valor_pago);
    let juros = 0, desconto = 0;
    if (valorPago > valorOriginal) juros = valorPago - valorOriginal;
    else if (valorPago < valorOriginal) desconto = valorOriginal - valorPago;
    let diasAtraso = 0;
    if (dadosPagamento.data_pagamento && lancamentoEdicao.data_vencimento) {
        diasAtraso = differenceInDays(parseISO(dadosPagamento.data_pagamento), parseISO(lancamentoEdicao.data_vencimento));
    }
    setDadosPagamento(prev => {
        if (prev.juros === juros && prev.desconto === desconto && prev.dias_atraso === diasAtraso) return prev;
        return { ...prev, juros, desconto, dias_atraso: diasAtraso };
    });
  }, [dadosPagamento.valor_pago, dadosPagamento.data_pagamento, lancamentoEdicao, modalAberto]);

  const handleSalvarPagamento = async () => {
    if (!lancamentoEdicao) return;
    const { error } = await supabase.from('lancamentos').update({ status: 'Pago', ...dadosPagamento }).eq('id', lancamentoEdicao.id);
    if (error) alert('Erro: ' + error.message); else { setModalAberto(false); buscarLancamentos(); }
  };

  const handleEstornar = async () => {
    if (!confirm("Estornar lançamento?")) return;
    const { error } = await supabase.from('lancamentos').update({ status: 'Pendente', valor_pago: null, data_pagamento: null, juros: 0, desconto: 0, dias_atraso: 0 }).eq('id', lancamentoEdicao.id);
    if (error) alert('Erro: ' + error.message); else { setModalAberto(false); buscarLancamentos(); }
  };

  const handleExcluir = async (id) => { if (confirm('Excluir?')) { await supabase.from('lancamentos').delete().eq('id', id); buscarLancamentos(); } };
  const handleLimparFiltros = () => { setFiltros(filtrosIniciais); setPagina(1); };
  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatarData = (d) => d ? d.split('-').reverse().join('/') : '-';

  const renderPaginacao = () => {
    const totalPaginas = Math.ceil(totalItens / itensPorPagina);
    const maxBotoes = 5;
    const pagInicial = Math.floor((pagina - 1) / maxBotoes) * maxBotoes + 1;
    const pagFinal = Math.min(pagInicial + maxBotoes - 1, totalPaginas);
    const botoes = [];
    botoes.push(<button key="prev" onClick={() => setPagina(old => Math.max(old - 1, 1))} disabled={pagina === 1} className="p-2 border rounded hover:bg-gray-200 disabled:opacity-50 mx-1"><ChevronLeft size={24} /></button>);
    for (let i = pagInicial; i <= pagFinal; i++) {
      botoes.push(<button key={i} onClick={() => setPagina(i)} className={`px-4 py-2 mx-1 border rounded font-bold transition-colors ${pagina === i ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>{i}</button>);
    }
    botoes.push(<button key="next" onClick={() => setPagina(old => (old < totalPaginas ? old + 1 : old))} disabled={pagina >= totalPaginas} className="p-2 border rounded hover:bg-gray-200 disabled:opacity-50 mx-1"><ChevronRight size={24} /></button>);
    return botoes;
  };

  return (
    <div className="space-y-6 relative w-full"> {/* Garante largura total */}
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-3xl font-bold text-primary">Listagem</h2>
        <button onClick={handleAbrirUltimos} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center gap-2">
          <History size={20} /> Últimos
        </button>
      </div>

      {/* FILTROS (Compactado) */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <input type="date" className="p-2 border rounded" value={filtros.dataInicio} onChange={e => setFiltros({...filtros, dataInicio: e.target.value})} />
          <input type="date" className="p-2 border rounded" value={filtros.dataFim} onChange={e => setFiltros({...filtros, dataFim: e.target.value})} />
          <select className="p-2 border rounded" value={filtros.fornecedor_id} onChange={e => setFiltros({...filtros, fornecedor_id: e.target.value})}>
            <option value="">Todos Fornecedores</option>
            {listas.fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
          <select className="p-2 border rounded" value={filtros.tipo_documento_id} onChange={e => setFiltros({...filtros, tipo_documento_id: e.target.value})}>
            <option value="">Todos Tipos Doc</option>
            {listas.tipos_documento.map(t => <option key={t.id} value={t.id}>{t.descricao}</option>)}
          </select>
          <select className="p-2 border rounded" value={filtros.banco_id} onChange={e => setFiltros({...filtros, banco_id: e.target.value})}>
            <option value="">Todos Bancos</option>
            {listas.bancos.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
          </select>
          <input type="number" placeholder="Valor Mín" className="p-2 border rounded" value={filtros.valorMin} onChange={e => setFiltros({...filtros, valorMin: e.target.value})} />
          <input type="number" placeholder="Valor Máx" className="p-2 border rounded" value={filtros.valorMax} onChange={e => setFiltros({...filtros, valorMax: e.target.value})} />
          <input type="text" placeholder="Buscar NF" className="p-2 border rounded" value={filtros.notaFiscal} onChange={e => setFiltros({...filtros, notaFiscal: e.target.value})} />
          <input type="text" placeholder="Buscar Nº Doc" className="p-2 border rounded" value={filtros.numDocumento} onChange={e => setFiltros({...filtros, numDocumento: e.target.value})} />
          
          <div className="flex items-center gap-2 lg:col-span-3">
             <select className="p-2 border rounded font-semibold text-gray-700 w-full md:w-auto" value={filtros.status} onChange={e => setFiltros({...filtros, status: e.target.value})}>
                <option value="">STATUS (Todos)</option>
                <option value="Pendente">PENDENTE</option>
                <option value="Pago">PAGO</option>
            </select>
             <button onClick={() => setFiltros({...filtros, comObservacao: !filtros.comObservacao})} className={`px-3 py-2 rounded-full font-bold text-xs border ${filtros.comObservacao ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {filtros.comObservacao ? 'Com Obs' : 'Obs'}
             </button>
             <button onClick={handleLimparFiltros} className="text-red-500 hover:bg-red-50 px-3 py-2 rounded text-xs flex items-center gap-1"><X size={14} /> Limpar</button>
          </div>
        </div>
      </div>

      {/* TABELA RESPONSIVA */}
      {/* CORREÇÃO PRINCIPAL: 
         max-w-full impede que o container cresça além da tela.
         overflow-x-auto habilita o scroll interno.
      */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 w-full max-w-full overflow-hidden">
        <div className="overflow-x-auto w-full"> 
          <table className="w-full text-left border-collapse whitespace-nowrap"> 
            <thead className="bg-gray-50 text-gray-600 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 border-b">Vencimento</th>
                <th className="px-3 py-3 border-b">Fornecedor</th>
                <th className="px-3 py-3 border-b">Tipo</th>
                <th className="px-3 py-3 border-b">Nº Doc</th>
                <th className="px-3 py-3 border-b">NF</th>
                <th className="px-3 py-3 border-b">Parcela</th>
                <th className="px-3 py-3 border-b">Razão</th>
                <th className="px-3 py-3 border-b">Banco</th>
                <th className="px-3 py-3 border-b">Valor</th>
                <th className="px-3 py-3 border-b">Status</th>
                <th className="px-3 py-3 border-b text-center">Ações</th>
                <th className="px-3 py-3 border-b bg-blue-50 text-blue-800">Pago</th>
                <th className="px-3 py-3 border-b bg-blue-50 text-blue-800">Juros</th>
                <th className="px-3 py-3 border-b bg-blue-50 text-blue-800">Desc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs"> {/* Fonte reduzida para text-xs */}
              {loading ? <tr><td colSpan="14" className="p-8 text-center">Carregando...</td></tr> : 
               lancamentos.map((l) => (
                  <tr key={l.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-3 py-3 font-medium text-gray-700">
                        <div className="flex items-center gap-1">
                            {formatarData(l.data_vencimento)}
                            {l.observacao && l.observacao.trim() !== '' && (
                                <button onClick={() => handleAbrirObs(l.observacao)} className="text-blue-500 hover:bg-blue-100 p-0.5 rounded-full">
                                    <MessageCircle size={14} fill="currentColor" className="opacity-80"/>
                                </button>
                            )}
                        </div>
                    </td>
                    <td className="px-3 py-3 font-bold uppercase text-gray-900">{l.fornecedores?.nome}</td>
                    <td className="px-3 py-3 text-gray-600">{l.tipos_documento?.descricao}</td>
                    <td className="px-3 py-3 text-gray-600">{l.numero_documento}</td>
                    <td className="px-3 py-3 text-gray-600">{l.nota_fiscal || '-'}</td>
                    <td className="px-3 py-3 text-gray-600">{l.parcelas?.descricao}</td>
                    <td className="px-3 py-3 text-gray-600 font-medium text-blue-800 bg-blue-50/50 rounded">{l.razoes?.nome}</td>
                    <td className="px-3 py-3 text-gray-600">{l.bancos?.nome || 'N/A'}</td>
                    <td className={`px-3 py-3 font-bold ${l.status === 'Pago' ? 'text-green-600' : 'text-red-500'}`}>{formatarMoeda(l.valor)}</td>
                    <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${l.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{l.status}</span></td>
                    
                    <td className="px-3 py-3">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => handleAbrirModalPagamento(l)} className="p-1 text-green-600 hover:bg-green-100 rounded border border-green-200"><Edit size={14} /></button>
                        <button onClick={() => handleAbrirEditar(l)} className="p-1 text-blue-500 hover:bg-blue-100 rounded border border-blue-200"><FilePenLine size={14} /></button>
                        <button onClick={() => handleExcluir(l.id)} className="p-1 text-red-500 hover:bg-red-100 rounded border border-red-200"><Trash2 size={14} /></button>
                      </div>
                    </td>

                    <td className="px-3 py-3 font-bold text-gray-700 bg-gray-50/50">{l.valor_pago ? formatarMoeda(l.valor_pago) : '-'}</td>
                    <td className="px-3 py-3 text-red-600 bg-gray-50/50">{l.juros > 0 ? formatarMoeda(l.juros) : '-'}</td>
                    <td className="px-3 py-3 text-green-600 bg-gray-50/50">{l.desconto > 0 ? formatarMoeda(l.desconto) : '-'}</td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-gray-50 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <span className="text-gray-500 font-medium"><strong>{lancamentos.length}</strong> de <strong>{totalItens}</strong> reg.</span>
          <div className="flex gap-1">{renderPaginacao()}</div>
        </div>
      </div>

      {/* MODAL OBSERVAÇÃO */}
      {modalObsAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md relative border border-gray-100">
                <button onClick={() => setModalObsAberto(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500"><X size={24} /></button>
                <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2"><MessageCircle size={24} /> Observação</h3>
                <div className="bg-blue-50 p-4 rounded-lg text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">{textoObs}</div>
                <div className="mt-6 flex justify-end"><button onClick={() => setModalObsAberto(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-bold">Fechar</button></div>
            </div>
        </div>
      )}

      {/* MODAL PAGAMENTO (Mantido) */}
      {modalAberto && lancamentoEdicao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-[#D0E8F2] p-8 rounded-2xl shadow-2xl w-full max-w-2xl border-4 border-white relative max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
                 <h3 className="text-2xl font-bold text-primary">Baixar Documento</h3>
                 <button onClick={() => setModalAberto(false)} className="text-gray-500 hover:text-red-500"><X size={24}/></button>
             </div>
             <p className="text-gray-800 text-lg mb-6 leading-relaxed">
              Vencimento <strong>{formatarData(lancamentoEdicao.data_vencimento)}</strong>, 
              Fornecedor <strong>{lancamentoEdicao.fornecedores?.nome}</strong>, 
              Valor <strong>{formatarMoeda(lancamentoEdicao.valor)}</strong>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex flex-col"><label className="font-bold text-lg mb-1">Valor pago</label><input type="number" step="0.01" className="p-3 rounded-lg border-none shadow-sm text-xl font-bold" value={dadosPagamento.valor_pago} onChange={e => setDadosPagamento({...dadosPagamento, valor_pago: e.target.value})} /></div>
              <div className="flex flex-col"><label className="font-bold text-lg mb-1">Data Pagamento</label><input type="date" className="p-3 rounded-lg border-none shadow-sm text-lg" value={dadosPagamento.data_pagamento} onChange={e => setDadosPagamento({...dadosPagamento, data_pagamento: e.target.value})} /></div>
              <div className="flex flex-col"><label className="font-bold text-lg mb-1">Juros/Multa</label><div className="p-3 rounded-lg bg-gray-200 text-gray-600 text-lg font-bold border border-gray-300">{formatarMoeda(dadosPagamento.juros)}</div></div>
              <div className="flex flex-col"><label className="font-bold text-lg mb-1 text-right">Desconto</label><div className="p-3 rounded-lg bg-gray-200 text-gray-600 text-lg font-bold border border-gray-300 text-right">{formatarMoeda(dadosPagamento.desconto)}</div></div>
              <div className="flex flex-col col-start-2"><label className="font-bold text-lg mb-1 text-right">Dias Atraso</label><div className={`p-3 rounded-lg text-lg font-bold border border-gray-300 text-right ${dadosPagamento.dias_atraso > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>{dadosPagamento.dias_atraso}</div></div>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center pt-4 border-t border-blue-200 gap-4">
               <button onClick={handleEstornar} className="bg-[#8B5CF6] hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center gap-2 w-full md:w-auto justify-center"><RotateCcw size={20} /> Estornar</button>
              <div className="flex gap-4 w-full md:w-auto justify-center">
                <button onClick={() => setModalAberto(false)} className="bg-[#EF4444] hover:bg-red-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105">Cancelar</button>
                <button onClick={handleSalvarPagamento} className="bg-[#3B82F6] hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIÇÃO */}
      {modalEditarAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-2xl border border-gray-200 relative max-h-[90vh] overflow-y-auto">
                <button onClick={() => setModalEditarAberto(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500"><X size={24}/></button>
                <h3 className="text-2xl font-bold text-primary mb-6 text-center">Editar Lançamento</h3>
                <form className="flex flex-col gap-4">
                    <div><label className="block font-semibold text-gray-700 mb-1">Data Vencimento *</label><input type="date" value={formEditar.data_vencimento} onChange={e => setFormEditar({...formEditar, data_vencimento: e.target.value})} className="w-full p-3 border rounded bg-gray-50 focus:ring-2 focus:ring-secondary outline-none"/></div>
                    <SearchableSelect label="Fornecedor *" placeholder="Buscar..." options={listas.fornecedores} fieldKey="nome" value={formEditar.fornecedor_id} onChange={(val) => setFormEditar({...formEditar, fornecedor_id: val})}/>
                    <SearchableSelect label="Tipo *" placeholder="Selecione..." options={listas.tipos_documento} fieldKey="descricao" value={formEditar.tipo_documento_id} onChange={(val) => setFormEditar({...formEditar, tipo_documento_id: val})}/>
                    <div><label className="block font-semibold text-gray-700 mb-1">Nº Doc</label><input type="text" value={formEditar.numero_documento} onChange={e => setFormEditar({...formEditar, numero_documento: e.target.value})} className="w-full p-3 border rounded bg-gray-50 outline-none" /></div>
                    <div><label className="block font-semibold text-gray-700 mb-1">NF</label><input type="text" value={formEditar.nota_fiscal} onChange={e => setFormEditar({...formEditar, nota_fiscal: e.target.value})} className="w-full p-3 border rounded bg-gray-50 outline-none" /></div>
                    <SearchableSelect label="Parcela" placeholder="Selecione..." options={listas.parcelas} fieldKey="descricao" value={formEditar.parcela_id} onChange={(val) => setFormEditar({...formEditar, parcela_id: val})} />
                    <SearchableSelect label="Razão" placeholder="Selecione..." options={listas.razoes} fieldKey="nome" value={formEditar.razao_id} onChange={(val) => setFormEditar({...formEditar, razao_id: val})} />
                    <SearchableSelect label="Banco" placeholder="Selecione..." options={listas.bancos} fieldKey="nome" value={formEditar.banco_id} onChange={(val) => setFormEditar({...formEditar, banco_id: val})} />
                    <div><label className="block font-semibold text-gray-700 mb-1">Status</label><select value={formEditar.status} onChange={e => setFormEditar({...formEditar, status: e.target.value})} className="w-full p-3 border rounded font-bold outline-none"><option value="Pendente">Pendente</option><option value="Pago">Pago</option></select></div>
                    <div><label className="block font-semibold text-gray-700 mb-1">Valor *</label><input type="number" step="0.01" value={formEditar.valor} onChange={e => setFormEditar({...formEditar, valor: e.target.value})} className="w-full p-3 border rounded bg-gray-50 text-xl font-mono outline-none" /></div>
                    <div><label className="block font-semibold text-gray-700 mb-1">Observação</label><textarea rows="3" value={formEditar.observacao} onChange={e => setFormEditar({...formEditar, observacao: e.target.value})} className="w-full p-3 border rounded bg-gray-50 outline-none"></textarea></div>
                    <div className="flex justify-end gap-4 mt-6 pt-6 border-t"><button type="button" onClick={() => setModalEditarAberto(false)} className="px-6 py-3 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 font-semibold">Cancelar</button><button type="button" onClick={handleSalvarEdicao} className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded font-bold shadow transition-colors"><Save size={20} /> Salvar</button></div>
                </form>
            </div>
        </div>
      )}

      {/* MODAL ÚLTIMOS LANÇAMENTOS */}
      {modalUltimosAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg relative">
            <button onClick={() => setModalUltimosAberto(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500"><X size={24} /></button>
            <h3 className="text-2xl font-bold text-primary mb-6 flex items-center gap-2"><History size={24} /> Últimos 5</h3>
            <div className="space-y-3">
              {ultimosLancamentos.map((l) => (
                <div key={l.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:bg-blue-50 transition-colors">
                   <div className="flex justify-between items-start mb-2"><p className="font-bold text-gray-800 text-lg">{l.fornecedores?.nome}</p><span className={`px-2 py-1 rounded text-xs font-bold ${l.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{l.status}</span></div>
                   <div className="flex justify-between items-center text-sm"><p className="text-gray-500">{l.tipos_documento?.descricao} • {formatarData(l.data_vencimento)}</p><p className="font-bold text-primary text-base">{formatarMoeda(l.valor)}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}