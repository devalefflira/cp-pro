import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../services/supabase';
import { PlusCircle, Save, X, Plus, Wallet, Layers, PieChart, ArrowDownCircle, Filter, FolderTree, Folder, FileText, List as ListIcon, Search, ChevronDown } from 'lucide-react';
// IMPORTAÇÃO PARA OS GRÁFICOS
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

// CORES PARA OS GRÁFICOS DE PIZZA
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// --- COMPONENTE CUSTOMIZADO: SELECT PESQUISÁVEL (Reaproveitado) ---
const SearchableSelect = ({ label, options, value, onChange, placeholder, fieldKey }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!value) setSearch('');
    else {
      const selected = options.find(o => o.id === value);
      if (selected) setSearch(selected[fieldKey] + (selected.cpf_cnpj ? ` (${selected.cpf_cnpj})` : ''));
    }
  }, [value, options, fieldKey]);

  const filteredOptions = options.filter(opt => 
    opt[fieldKey].toLowerCase().includes(search.toLowerCase()) || 
    (opt.cpf_cnpj && opt.cpf_cnpj.includes(search))
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  return (
    <div className="relative mb-1" ref={wrapperRef}>
      <label className="block font-semibold text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          className="w-full p-3 border rounded bg-gray-50 focus:ring-2 focus:ring-secondary outline-none pr-10"
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
      {isOpen && (
        <ul className="absolute z-50 w-full bg-white border border-gray-200 mt-1 max-h-60 overflow-y-auto rounded shadow-lg">
          {filteredOptions.length > 0 ? filteredOptions.map((opt) => (
            <li
              key={opt.id}
              onClick={() => {
                onChange(opt.id);
                setSearch(opt[fieldKey] + (opt.cpf_cnpj ? ` (${opt.cpf_cnpj})` : ''));
                setIsOpen(false);
              }}
              className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0 text-gray-700"
            >
              {opt[fieldKey]} {opt.cpf_cnpj && <span className="text-xs text-gray-400">({opt.cpf_cnpj})</span>}
            </li>
          )) : (
            <li className="p-3 text-gray-500 italic">Nenhum resultado.</li>
          )}
        </ul>
      )}
    </div>
  );
};


export default function Despesas() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'listagem', 'lancar', 'cadastros'
  const [loading, setLoading] = useState(false);

  // --- ESTADOS DE DADOS ---
  const [fornecedores, setFornecedores] = useState([]);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [contas, setContas] = useState([]);
  const [despesas, setDespesas] = useState([]); 

  // --- FILTROS (COMPARTILHADOS ENTRE DASHBOARD E LISTAGEM) ---
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth(); 
  
  const [filtroAno, setFiltroAno] = useState(anoAtual);
  const [filtroMes, setFiltroMes] = useState(mesAtual); 
  const [filtroCC, setFiltroCC] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState('');
  const [filtroConta, setFiltroConta] = useState('');

  const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  // --- FORMULÁRIOS ---
  const formInicial = { centro_custo_id: '', grupo_id: '', conta_id: '', fornecedor_id: '', data_pagamento: '', valor: '', observacao: '' };
  const [form, setForm] = useState(formInicial);
  const [modalFornecedor, setModalFornecedor] = useState(false);
  const [novoFornecedor, setNovoFornecedor] = useState({ nome: '', cpf_cnpj: '' });

  // Modais de Estrutura
  const [modalCC, setModalCC] = useState(false);
  const [novoCC, setNovoCC] = useState({ codigo: '', sigla: '', descricao: '' });
  const [modalGrupo, setModalGrupo] = useState(false);
  const [novoGrupo, setNovoGrupo] = useState({ codigo: '', descricao: '', centro_custo_id: '' });
  const [modalConta, setModalConta] = useState(false);
  const [novaConta, setNovaConta] = useState({ codigo: '', descricao: '', grupo_id: '' });

  // --- HELPERS ---
  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatarData = (d) => d ? d.split('-').reverse().join('/') : '-';

  // --- EFEITOS E CARREGAMENTO ---
  useEffect(() => {
    carregarDadosBase();
    carregarDespesas();
  }, []);

  const carregarDadosBase = async () => {
    const [resFornecedores, resCC, resGrupos, resContas] = await Promise.all([
      supabase.from('fornecedores').select('*').order('nome'),
      supabase.from('centros_custo').select('*').order('codigo'),
      supabase.from('grupos_despesa').select('*').order('codigo'),
      supabase.from('contas_despesa').select('*').order('codigo')
    ]);
    setFornecedores(resFornecedores.data || []);
    setCentrosCusto(resCC.data || []);
    setGrupos(resGrupos.data || []);
    setContas(resContas.data || []);
  };

  const carregarDespesas = async () => {
    const { data } = await supabase.from('despesas').select(`*, centros_custo(sigla, descricao), grupos_despesa(descricao), contas_despesa(descricao), fornecedores(nome)`).order('data_pagamento', { ascending: false });
    if (data) setDespesas(data);
  };

  // --- LÓGICA DE FILTROS ---
  const formGruposFiltrados = grupos.filter(g => g.centro_custo_id === Number(form.centro_custo_id));
  const formContasFiltradas = contas.filter(c => c.grupo_id === Number(form.grupo_id));
  
  const filtroGruposFiltrados = grupos.filter(g => g.centro_custo_id === Number(filtroCC));
  const filtroContasFiltradas = contas.filter(c => c.grupo_id === Number(filtroGrupo));

  const handleFiltroCCChange = (e) => { setFiltroCC(e.target.value); setFiltroGrupo(''); setFiltroConta(''); };
  const handleFiltroGrupoChange = (e) => { setFiltroGrupo(e.target.value); setFiltroConta(''); };

  // DADOS FILTRADOS PRINCIPAIS
  const despesasFiltradas = useMemo(() => {
    return despesas.filter(d => {
      if (!d.data_pagamento) return false;
      const dataPgto = new Date(d.data_pagamento + 'T12:00:00');
      if (dataPgto.getFullYear() !== filtroAno) return false;
      if (filtroMes !== null && dataPgto.getMonth() !== filtroMes) return false;
      if (filtroCC && d.centro_custo_id !== Number(filtroCC)) return false;
      if (filtroGrupo && d.grupo_id !== Number(filtroGrupo)) return false;
      if (filtroConta && d.conta_id !== Number(filtroConta)) return false;
      return true;
    });
  }, [despesas, filtroAno, filtroMes, filtroCC, filtroGrupo, filtroConta]);

  const totalDespesas = despesasFiltradas.reduce((acc, curr) => acc + Number(curr.valor), 0);

  // --- DADOS PARA OS GRÁFICOS ---
  const dadosGraficoEvolucao = useMemo(() => {
      // Se não tiver mês selecionado, mostra evolução do ano (meses)
      // Se tiver mês, mostra (dias) - Vamos simplificar para meses sempre, usando as despesas do ANO
      const despesasDoAno = despesas.filter(d => {
          if(!d.data_pagamento) return false;
          return new Date(d.data_pagamento + 'T12:00:00').getFullYear() === filtroAno;
      });
      const agrupado = {};
      meses.forEach(m => agrupado[m] = 0);
      
      despesasDoAno.forEach(d => {
          const mes = new Date(d.data_pagamento + 'T12:00:00').getMonth();
          agrupado[meses[mes]] += Number(d.valor);
      });
      return Object.keys(agrupado).map(k => ({ name: k, Valor: agrupado[k] }));
  }, [despesas, filtroAno]);

  const dadosGraficoCC = useMemo(() => {
      const agrupado = {};
      despesasFiltradas.forEach(d => {
          const cc = d.centros_custo?.sigla || 'Sem CC';
          agrupado[cc] = (agrupado[cc] || 0) + Number(d.valor);
      });
      return Object.keys(agrupado).map(k => ({ name: k, value: agrupado[k] }));
  }, [despesasFiltradas]);

  const dadosGraficoGrupo = useMemo(() => {
      const agrupado = {};
      despesasFiltradas.forEach(d => {
          const g = d.grupos_despesa?.descricao || 'Sem Grupo';
          agrupado[g] = (agrupado[g] || 0) + Number(d.valor);
      });
      return Object.keys(agrupado).map(k => ({ name: k, value: agrupado[k] }));
  }, [despesasFiltradas]);

  // --- AÇÕES ---
  const handleSalvarDespesa = async (e) => {
    e.preventDefault();
    if (!form.conta_id || !form.fornecedor_id || !form.data_pagamento || !form.valor) return alert("Preencha os campos obrigatórios.");
    
    setLoading(true);
    const { error } = await supabase.from('despesas').insert([{ ...form, valor: parseFloat(form.valor) }]);
    setLoading(false);

    if (error) alert("Erro ao salvar: " + error.message);
    else {
      alert("Despesa salva com sucesso!");
      setForm(formInicial);
      carregarDespesas(); 
      setActiveTab('listagem'); 
    }
  };

  const handleSalvarFornecedor = async () => {
    if (!novoFornecedor.nome) return alert("Nome é obrigatório.");
    setLoading(true);
    const { data, error } = await supabase.from('fornecedores').insert([novoFornecedor]).select();
    setLoading(false);
    if (!error) {
      setFornecedores([...fornecedores, data[0]].sort((a, b) => a.nome.localeCompare(b.nome)));
      setForm({ ...form, fornecedor_id: data[0].id });
      setModalFornecedor(false);
      setNovoFornecedor({ nome: '', cpf_cnpj: '' });
    }
  };

  const handleSalvarCC = async (e) => {
      e.preventDefault();
      const { data } = await supabase.from('centros_custo').insert([novoCC]).select();
      if(data) { setCentrosCusto([...centrosCusto, data[0]].sort((a,b)=>a.codigo.localeCompare(b.codigo))); setModalCC(false); setNovoCC({codigo:'',sigla:'',descricao:''});}
  };
  const handleSalvarGrupo = async (e) => {
      e.preventDefault();
      const { data } = await supabase.from('grupos_despesa').insert([novoGrupo]).select();
      if(data) { setGrupos([...grupos, data[0]].sort((a,b)=>a.codigo.localeCompare(b.codigo))); setModalGrupo(false); setNovoGrupo({codigo:'',descricao:'',centro_custo_id:''});}
  };
  const handleSalvarConta = async (e) => {
      e.preventDefault();
      const { data } = await supabase.from('contas_despesa').insert([novaConta]).select();
      if(data) { setContas([...contas, data[0]].sort((a,b)=>a.codigo.localeCompare(b.codigo))); setModalConta(false); setNovaConta({codigo:'',descricao:'',grupo_id:''});}
  };


  // --- RENDERIZAÇÃO DO COMPONENTE FILTROS (Reaproveitado nas duas abas) ---
  const ComponenteFiltros = () => (
      <div className="space-y-4 mb-6">
          <div className="bg-gray-50 p-2 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row items-center justify-between gap-4">
             <div className="flex bg-gray-200 rounded-full p-1 w-full xl:w-auto">
                <button onClick={() => setFiltroAno(anoAtual)} className={`flex-1 xl:flex-none px-6 py-1.5 rounded-full text-sm font-bold transition-all ${filtroAno === anoAtual ? 'bg-slate-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Este ano</button>
                <button onClick={() => setFiltroAno(anoAtual - 1)} className={`flex-1 xl:flex-none px-6 py-1.5 rounded-full text-sm font-bold transition-all ${filtroAno === anoAtual - 1 ? 'bg-slate-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Ano anterior</button>
             </div>
             <div className="flex flex-wrap justify-center gap-1.5">
                {meses.map((m, i) => (
                    <button key={m} onClick={() => setFiltroMes(prev => prev === i ? null : i)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${filtroMes === i ? 'bg-slate-500 text-white border-slate-500 shadow-sm scale-105' : 'bg-white text-slate-500 border-gray-200 hover:border-slate-300 hover:bg-slate-50'}`}>{m}</button>
                ))}
             </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Centro de Custo</label>
              <select className="w-full p-2.5 border rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-secondary outline-none text-gray-700" value={filtroCC} onChange={handleFiltroCCChange}>
                <option value="">TODOS</option>
                {centrosCusto.map(cc => <option key={cc.id} value={cc.id}>{cc.sigla} - {cc.descricao}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Grupo</label>
              <select className="w-full p-2.5 border rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-secondary outline-none disabled:opacity-50 text-gray-700" value={filtroGrupo} onChange={handleFiltroGrupoChange} disabled={!filtroCC}>
                <option value="">TODOS</option>
                {filtroGruposFiltrados.map(g => <option key={g.id} value={g.id}>{g.codigo} - {g.descricao}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Conta</label>
              <select className="w-full p-2.5 border rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-secondary outline-none disabled:opacity-50 text-gray-700" value={filtroConta} onChange={(e) => setFiltroConta(e.target.value)} disabled={!filtroGrupo}>
                <option value="">TODOS</option>
                {filtroContasFiltradas.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.descricao}</option>)}
              </select>
            </div>
         </div>
      </div>
  );

  return (
    <div className="pb-10 max-w-6xl mx-auto">
      
      {/* CABEÇALHO E TABS */}
      <div className="flex flex-col lg:flex-row justify-between items-center mb-8 gap-4">
        <h2 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Wallet size={32} /> Gestão de Despesas
        </h2>
        <div className="flex bg-white rounded-lg shadow-sm border p-1 overflow-x-auto w-full lg:w-auto text-sm">
          <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
            <PieChart size={16} /> Dashboard
          </button>
          <button onClick={() => setActiveTab('listagem')} className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'listagem' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
            <ListIcon size={16} /> Listagem
          </button>
          <button onClick={() => setActiveTab('lancar')} className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'lancar' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
            <PlusCircle size={16} /> Nova Despesa
          </button>
          <button onClick={() => setActiveTab('cadastros')} className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'cadastros' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
            <Layers size={16} /> Estrutura (CC)
          </button>
        </div>
      </div>

      {/* --- ABA 1: DASHBOARD (GRÁFICOS) --- */}
      {activeTab === 'dashboard' && (
        <div>
          <ComponenteFiltros />
          
          <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm relative overflow-hidden mb-6 flex flex-col justify-center">
             <div className="absolute top-0 right-0 p-4 opacity-10 text-red-600"><ArrowDownCircle size={64}/></div>
             <h3 className="text-gray-500 font-semibold mb-1 text-sm uppercase tracking-wider">Total de Despesas (Filtro)</h3>
             <p className="text-4xl font-bold text-red-600">{formatarMoeda(totalDespesas)}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Gráfico 1: Evolução Ano */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-700 mb-4">Evolução Mensal ({filtroAno})</h3>
                <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={dadosGraficoEvolucao}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                       <XAxis dataKey="name" fontSize={12}/>
                       <YAxis fontSize={12} tickFormatter={(value) => `R$${value/1000}k`}/>
                       <Tooltip formatter={(value) => formatarMoeda(value)} />
                       <Bar dataKey="Valor" fill="#003366" radius={[4, 4, 0, 0]} />
                     </BarChart>
                   </ResponsiveContainer>
                </div>
             </div>

             {/* Gráfico 2: Por Centro de Custo */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center">
                <h3 className="font-bold text-gray-700 mb-4 self-start">Despesas por Centro de Custo</h3>
                <div className="h-64 w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <RechartsPieChart>
                       <Pie data={dadosGraficoCC} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                         {dadosGraficoCC.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                       </Pie>
                       <Tooltip formatter={(value) => formatarMoeda(value)} />
                       <Legend verticalAlign="bottom" height={36}/>
                     </RechartsPieChart>
                   </ResponsiveContainer>
                </div>
             </div>
             
             {/* Gráfico 3: Por Grupo (Ocupa linha toda se quiser dar destaque, aqui deixei meia tela) */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 md:col-span-2">
                <h3 className="font-bold text-gray-700 mb-4">Distribuição por Grupo</h3>
                <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={dadosGraficoGrupo} layout="vertical" margin={{ left: 50 }}>
                       <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                       <XAxis type="number" fontSize={12}/>
                       <YAxis dataKey="name" type="category" fontSize={12} width={100}/>
                       <Tooltip formatter={(value) => formatarMoeda(value)} />
                       <Bar dataKey="value" fill="#FF8042" radius={[0, 4, 4, 0]} />
                     </BarChart>
                   </ResponsiveContainer>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* --- ABA 2: LISTAGEM --- */}
      {activeTab === 'listagem' && (
        <div>
          <ComponenteFiltros />
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-700">Listagem de Despesas Filtradas</h3>
              <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{despesasFiltradas.length} registros</span>
            </div>
            <div className="overflow-x-auto w-full"> 
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-white text-gray-500 font-semibold text-xs uppercase tracking-wider border-b">
                  <tr>
                    <th className="px-4 py-3">Data Pgto</th>
                    <th className="px-4 py-3">Fornecedor</th>
                    <th className="px-4 py-3">Hierarquia (CC &gt; Grupo &gt; Conta)</th>
                    <th className="px-4 py-3">Observação</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {despesasFiltradas.length === 0 ? (
                    <tr><td colSpan="5" className="p-10 text-center text-gray-400">Nenhuma despesa encontrada.</td></tr>
                  ) : (
                    despesasFiltradas.map((d) => (
                      <tr key={d.id} className="hover:bg-red-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-700">{formatarData(d.data_pagamento)}</td>
                        <td className="px-4 py-3 font-bold text-gray-900">{d.fornecedores?.nome}</td>
                        <td className="px-4 py-3 text-xs">
                           <span className="font-bold text-primary">{d.centros_custo?.sigla}</span> &rsaquo; {d.grupos_despesa?.descricao} &rsaquo; {d.contas_despesa?.descricao}
                        </td>
                        <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={d.observacao}>{d.observacao || '-'}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">{formatarMoeda(d.valor)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- ABA 3: LANÇAMENTO --- */}
      {activeTab === 'lancar' && (
        <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2 flex items-center gap-2">
             <PlusCircle className="text-primary"/> Inserir Nova Despesa
          </h3>
          <form onSubmit={handleSalvarDespesa} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Centro de Custo *</label>
              <select className="w-full p-3 border rounded bg-gray-50 focus:ring-2 focus:ring-secondary outline-none" value={form.centro_custo_id} onChange={(e) => setForm({ ...form, centro_custo_id: e.target.value, grupo_id: '', conta_id: '' })} required>
                <option value="">Selecione...</option>
                {centrosCusto.map(cc => <option key={cc.id} value={cc.id}>{cc.codigo} - {cc.descricao}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Grupo *</label>
              <select className="w-full p-3 border rounded bg-gray-50 focus:ring-2 focus:ring-secondary outline-none disabled:opacity-50" value={form.grupo_id} onChange={(e) => setForm({ ...form, grupo_id: e.target.value, conta_id: '' })} disabled={!form.centro_custo_id} required>
                <option value="">Selecione...</option>
                {formGruposFiltrados.map(g => <option key={g.id} value={g.id}>{g.codigo} - {g.descricao}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">Conta *</label>
              <select className="w-full p-3 border rounded bg-gray-50 focus:ring-2 focus:ring-secondary outline-none disabled:opacity-50" value={form.conta_id} onChange={(e) => setForm({ ...form, conta_id: e.target.value })} disabled={!form.grupo_id} required>
                <option value="">Selecione...</option>
                {formContasFiltradas.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.descricao}</option>)}
              </select>
            </div>

            <div className="md:col-span-2 border-t border-gray-100 my-2"></div>

            <div className="md:col-span-2 flex items-end gap-2">
               <div className="flex-1">
                  <SearchableSelect 
                     label="Fornecedor / Prestador *" 
                     placeholder="Digite para buscar..." 
                     options={fornecedores} 
                     fieldKey="nome" 
                     value={form.fornecedor_id} 
                     onChange={(val) => setForm({...form, fornecedor_id: val})} 
                  />
               </div>
               <button type="button" onClick={() => setModalFornecedor(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 h-[50px] mb-1 rounded-lg flex items-center justify-center transition-colors shadow">
                 <Plus size={24} />
               </button>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Data de Pagamento *</label>
              <input type="date" className="w-full p-3 border rounded bg-gray-50 focus:ring-2 focus:ring-secondary outline-none" value={form.data_pagamento} onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })} required />
            </div>

            {/* ESCONDENDO AS SETINHAS DO TYPE NUMBER VIA INLINE CSS OU TAILWIND */}
            <div className="relative">
              <label className="block font-semibold text-gray-700 mb-1">Valor (R$) *</label>
              <style>{`input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }`}</style>
              <input type="number" step="0.01" className="w-full p-3 border rounded bg-gray-50 focus:ring-2 focus:ring-secondary outline-none font-mono text-lg text-red-600 font-bold" placeholder="0.00" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">Histórico / Observação</label>
              <textarea rows="3" className="w-full p-3 border rounded bg-gray-50 focus:ring-2 focus:ring-secondary outline-none" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })}></textarea>
            </div>

            <div className="md:col-span-2 flex justify-end gap-4 mt-4 border-t pt-6">
              <button type="button" onClick={() => { setForm(formInicial); setActiveTab('listagem'); }} className="px-6 py-3 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 font-semibold">Cancelar</button>
              <button type="submit" disabled={loading} className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded font-bold shadow-lg transition-colors"><Save size={20} /> {loading ? 'Salvando...' : 'Salvar Despesa'}</button>
            </div>
          </form>
        </div>
      )}

      {/* --- ABA 4: ESTRUTURA --- */}
      {activeTab === 'cadastros' && (
        <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 mb-6 gap-4">
              <h3 className="text-xl font-bold text-gray-800">Hierarquia de Despesas</h3>
              <div className="flex flex-wrap gap-2">
                 <button onClick={() => setModalCC(true)} className="bg-primary hover:bg-blue-800 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors"><Plus size={16}/> Centro de Custo</button>
                 <button onClick={() => setModalGrupo(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors"><Plus size={16}/> Grupo</button>
                 <button onClick={() => setModalConta(true)} className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors"><Plus size={16}/> Conta</button>
              </div>
           </div>

           <div className="space-y-4">
              {centrosCusto.length === 0 ? (
                 <p className="text-gray-500 text-center py-10">Nenhuma estrutura cadastrada ainda.</p>
              ) : (
                centrosCusto.map(cc => (
                  <div key={cc.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center gap-2">
                         <FolderTree className="text-primary" size={20} />
                         <span className="font-bold text-gray-800 text-lg">{cc.codigo} - {cc.descricao}</span>
                         <span className="bg-white border text-xs font-bold px-2 py-0.5 rounded text-gray-500 ml-2">{cc.sigla}</span>
                      </div>
                      <div className="p-4 space-y-4">
                         {grupos.filter(g => g.centro_custo_id === cc.id).map(g => (
                            <div key={g.id} className="ml-4 border-l-2 border-indigo-100 pl-4">
                               <div className="flex items-center gap-2 mb-2">
                                  <Folder className="text-indigo-500" size={16} />
                                  <span className="font-bold text-gray-700">{g.codigo} - {g.descricao}</span>
                               </div>
                               <div className="ml-5 space-y-2 mt-1">
                                  {contas.filter(c => c.grupo_id === g.id).map(c => (
                                     <div key={c.id} className="flex items-center gap-2 text-sm text-gray-600 bg-slate-50 p-2 rounded border border-slate-100 w-fit">
                                        <FileText className="text-slate-400" size={14} />
                                        <span>{c.codigo} - {c.descricao}</span>
                                     </div>
                                  ))}
                               </div>
                            </div>
                         ))}
                      </div>
                  </div>
                ))
              )}
           </div>
        </div>
      )}

      {/* --- MODAIS CONTINUAM EXATAMENTE IGUAIS --- */}
      {/* (Mantenha o código dos modais CC, Grupo, Conta e Fornecedor da resposta anterior) */}
      
    </div>
  );
}