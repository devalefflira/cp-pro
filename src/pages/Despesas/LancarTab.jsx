import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { Save, X, Plus, Search, ChevronDown, CreditCard, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

const SearchableSelect = ({ label, options, value, onChange, placeholder, fieldKey }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!value) setSearch('');
    else {
      const selected = options.find(o => o.id === value);
      if (selected) setSearch(selected[fieldKey]);
    }
  }, [value, options, fieldKey]);

  const filteredOptions = options.filter(opt => opt[fieldKey].toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    function handleClickOutside(event) { 
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false); 
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  return (
    <div className="relative mb-1 flex-1" ref={wrapperRef}>
      {label && <label className="block font-semibold text-gray-700 mb-1">{label}</label>}
      <div className="relative">
        <input 
          type="text" 
          className="w-full p-2.5 border rounded bg-gray-50 focus:ring-2 focus:ring-secondary outline-none pr-10 text-sm" 
          placeholder={placeholder} 
          value={search} 
          onClick={() => setIsOpen(true)} 
          onChange={(e) => { setSearch(e.target.value); setIsOpen(true); if(e.target.value==='') onChange(''); }} 
        />
        <div className="absolute right-3 top-3 text-gray-400 pointer-events-none">
          {isOpen ? <Search size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>
      {isOpen && (
        <ul className="absolute z-50 w-full bg-white border border-gray-200 mt-1 max-h-56 overflow-y-auto rounded shadow-lg text-sm">
          {filteredOptions.map((opt) => (
            <li 
              key={opt.id} 
              onClick={() => { onChange(opt.id); setSearch(opt[fieldKey]); setIsOpen(false); }} 
              className="p-2.5 hover:bg-blue-50 cursor-pointer border-b text-gray-700"
            >
              {opt[fieldKey]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default function LancarTab({ irParaListagem }) {
  const [loading, setLoading] = useState(false);
  const [fornecedores, setFornecedores] = useState([]);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [contas, setContas] = useState([]);

  // FORMULÁRIO INDIVIDUAL PADRÃO
  const formInicial = { 
    centro_custo_id: '', 
    grupo_id: '', 
    conta_id: '', 
    fornecedor_id: '', 
    data_pagamento: '', 
    valor: '', 
    forma_pagamento: '', 
    origem: '', 
    observacao: '' 
  };
  const [form, setForm] = useState(formInicial);

  const [modalForn, setModalForn] = useState(false);
  const [novoForn, setNovoForn] = useState({ nome: '', cpf_cnpj: '' });

  // --- ESTADOS DO MODAL DE CARTÃO DE CRÉDITO CORPORATIVO ---
  const [modalCartao, setModalCartao] = useState(false);
  const [fatura, setFatura] = useState({
    totalFatura: '',
    dataPagamento: '',
    origem: 'Sicoob',
    temMercadoria: true,
    valorMercadoria: '',
    fornecedorPadraoId: ''
  });

  const [itensDespesa, setItensDespesa] = useState([]);

  useEffect(() => {
    async function carregar() {
      const [resF, resCC, resG, resC] = await Promise.all([
        supabase.from('fornecedores').select('*').order('nome'),
        supabase.from('centros_custo').select('*').order('codigo'),
        supabase.from('grupos_despesa').select('*').order('codigo'),
        supabase.from('contas_despesa').select('*').order('codigo')
      ]);
      setFornecedores(resF.data || []); 
      setCentrosCusto(resCC.data || []); 
      setGrupos(resG.data || []); 
      setContas(resC.data || []);
    }
    carregar();
  }, []);

  // --- CÁLCULOS DA FATURA DO CARTÃO ---
  const numTotalFatura = parseFloat(fatura.totalFatura) || 0;
  const numValorMercadoria = fatura.temMercadoria ? (parseFloat(fatura.valorMercadoria) || 0) : 0;
  const numTotalDespesas = itensDespesa.reduce((acc, item) => acc + (parseFloat(item.valor) || 0), 0);
  const saldoAAlocar = numTotalFatura - (numValorMercadoria + numTotalDespesas);

  // MANIPULAÇÃO DAS LINHAS DE DESPESA DA FATURA
  const handleAdicionarLinhaDespesa = () => {
    setItensDespesa([
      ...itensDespesa,
      {
        id: Date.now(),
        valor: '',
        centro_custo_id: '',
        grupo_id: '',
        conta_id: '',
        fornecedor_id: fatura.fornecedorPadraoId || '',
        observacao: ''
      }
    ]);
  };

  const handleRemoverLinhaDespesa = (id) => {
    setItensDespesa(itensDespesa.filter(item => item.id !== id));
  };

  const handleAtualizarItemDespesa = (id, campo, valor) => {
    setItensDespesa(itensDespesa.map(item => {
      if (item.id === id) {
        const itemAtualizado = { ...item, [campo]: valor };
        if (campo === 'centro_custo_id') {
          itemAtualizado.grupo_id = '';
          itemAtualizado.conta_id = '';
        } else if (campo === 'grupo_id') {
          itemAtualizado.conta_id = '';
        }
        return itemAtualizado;
      }
      return item;
    }));
  };

  // SALVAR FURA DE CARTÃO
  const handleSalvarFaturaCartao = async () => {
    if (Math.abs(saldoAAlocar) > 0.01) {
      return alert("O saldo a alocar precisa ser exatamente R$ 0,00 antes de salvar.");
    }

    if (!fatura.dataPagamento) {
      return alert("Informe a data de pagamento da fatura.");
    }

    // Validar se todas as linhas de despesa preencheram os campos obrigatórios
    for (let i = 0; i < itensDespesa.length; i++) {
      const item = itensDespesa[i];
      if (!item.valor || !item.centro_custo_id || !item.grupo_id || !item.conta_id) {
        return alert(`Preencha todos os campos obrigatórios na linha de despesa #${i + 1}.`);
      }
    }

    setLoading(true);

    // Preparar payload apenas dos itens de despesa operacionais
    const payloadDespesas = itensDespesa.map(item => ({
      centro_custo_id: Number(item.centro_custo_id),
      grupo_id: Number(item.grupo_id),
      conta_id: Number(item.conta_id),
      fornecedor_id: item.fornecedor_id ? Number(item.fornecedor_id) : null,
      data_pagamento: fatura.dataPagamento,
      valor: parseFloat(item.valor),
      forma_pagamento: 'Cartão',
      origem: fatura.origem,
      observacao: item.observacao ? `[Fatura Cartão] ${item.observacao}` : '[Fatura Cartão]'
    }));

    const { error } = await supabase.from('despesas').insert(payloadDespesas);
    setLoading(false);

    if (error) {
      alert("Erro ao lançar despesas da fatura: " + error.message);
    } else {
      alert(`Fatura processada com sucesso! ${payloadDespesas.length} despesas foram lançadas.`);
      setModalCartao(false);
      setItensDespesa([]);
      setFatura({
        totalFatura: '',
        dataPagamento: '',
        origem: 'Sicoob',
        temMercadoria: true,
        valorMercadoria: '',
        fornecedorPadraoId: ''
      });
      irParaListagem();
    }
  };

  // SALVAR DESPESA AVULSA
  const handleSalvarDespesa = async (e) => {
    e.preventDefault();
    if (!form.conta_id || !form.fornecedor_id || !form.data_pagamento || !form.valor) {
      return alert("Preencha os campos obrigatórios (*).");
    }
    setLoading(true);
    const { error } = await supabase.from('despesas').insert([{ ...form, valor: parseFloat(form.valor) }]);
    setLoading(false);

    if (error) alert("Erro: " + error.message);
    else { 
      alert("Despesa lançada com sucesso!"); 
      setForm(formInicial); 
      irParaListagem(); 
    }
  };

  const handleSalvarFornecedor = async () => {
    if (!novoForn.nome) return alert("Nome é obrigatório.");
    setLoading(true);
    const { data, error } = await supabase.from('fornecedores').insert([novoForn]).select();
    setLoading(false);
    if (error) alert("Erro: " + error.message);
    else {
      setFornecedores([...fornecedores, data[0]].sort((a,b)=>a.nome.localeCompare(b.nome)));
      setForm({...form, fornecedor_id: data[0].id});
      setModalForn(false); 
      setNovoForn({nome:'', cpf_cnpj:''});
    }
  };

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 space-y-6">
      
      {/* BARRA SUPERIOR COM BOTÃO DE FATURA CARTÃO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <h3 className="text-xl font-bold text-gray-800">Lançamento de Despesa Avulsa</h3>
        
        <button
          type="button"
          onClick={() => setModalCartao(true)}
          className="bg-indigo-900 hover:bg-indigo-950 text-white font-bold py-2.5 px-5 rounded-lg shadow-md flex items-center gap-2 transition-all hover:scale-105 text-sm"
        >
          <CreditCard size={18} /> Lançar Fatura de Cartão de Crédito
        </button>
      </div>

      {/* FORMULÁRIO PADRÃO INDIVIDUAL */}
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
          <select className="w-full p-3 border rounded bg-gray-50 focus:ring-2 disabled:opacity-50 outline-none" value={form.grupo_id} onChange={(e) => setForm({ ...form, grupo_id: e.target.value, conta_id: '' })} disabled={!form.centro_custo_id} required>
            <option value="">Selecione...</option>
            {grupos.filter(g => g.centro_custo_id === Number(form.centro_custo_id)).map(g => <option key={g.id} value={g.id}>{g.codigo} - {g.descricao}</option>)}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block font-semibold text-gray-700 mb-1">Conta *</label>
          <select className="w-full p-3 border rounded bg-gray-50 focus:ring-2 disabled:opacity-50 outline-none" value={form.conta_id} onChange={(e) => setForm({ ...form, conta_id: e.target.value })} disabled={!form.grupo_id} required>
            <option value="">Selecione...</option>
            {contas.filter(c => c.grupo_id === Number(form.grupo_id)).map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.descricao}</option>)}
          </select>
        </div>

        <div className="md:col-span-2 flex items-end gap-2">
          <SearchableSelect label="Fornecedor / Prestador *" placeholder="Digite para buscar..." options={fornecedores} fieldKey="nome" value={form.fornecedor_id} onChange={(val) => setForm({...form, fornecedor_id: val})} />
          <button type="button" onClick={() => setModalForn(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 h-[46px] mb-1 rounded-lg flex items-center shadow"><Plus size={22} /></button>
        </div>

        <div>
          <label className="block font-semibold text-gray-700 mb-1">Data *</label>
          <input type="date" className="w-full p-3 border rounded bg-gray-50 focus:ring-2 outline-none" value={form.data_pagamento} onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })} required />
        </div>

        <div>
          <label className="block font-semibold text-gray-700 mb-1">Valor (R$) *</label>
          <input type="number" step="0.01" className="w-full p-3 border rounded bg-gray-50 text-red-600 font-bold outline-none" placeholder="0.00" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
        </div>

        <div>
          <label className="block font-semibold text-gray-700 mb-1">Forma de Pagamento</label>
          <select className="w-full p-3 border rounded bg-gray-50 focus:ring-2 outline-none" value={form.forma_pagamento} onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })}>
            <option value="">Selecione...</option>
            <option value="Cartão">Cartão</option>
            <option value="Cheque">Cheque</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="PIX">PIX</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-gray-700 mb-1">Origem</label>
          <select className="w-full p-3 border rounded bg-gray-50 focus:ring-2 outline-none" value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })}>
            <option value="">Selecione...</option>
            <option value="Bradesco">Bradesco</option>
            <option value="Santander">Santander</option>
            <option value="Sicoob">Sicoob</option>
            <option value="Tribanco">Tribanco</option>
            <option value="Tesouraria">Tesouraria</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block font-semibold text-gray-700 mb-1">Observação</label>
          <textarea rows="3" className="w-full p-3 border rounded bg-gray-50 outline-none" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })}></textarea>
        </div>

        <div className="md:col-span-2 flex justify-end gap-4 border-t pt-6">
          <button type="submit" disabled={loading} className="px-8 py-3 bg-green-600 text-white rounded font-bold shadow-lg hover:bg-green-700 transition-colors">
            <Save size={20} className="inline mr-2"/> Salvar
          </button>
        </div>
      </form>

      {/* MODAL NOVO FORNECEDOR */}
      {modalForn && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-md relative">
            <button onClick={() => setModalForn(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500"><X size={24} /></button>
            <h3 className="text-xl font-bold text-primary mb-4">Novo Fornecedor</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Nome *" className="w-full p-3 border rounded bg-gray-50 outline-none" value={novoForn.nome} onChange={e=>setNovoForn({...novoForn, nome:e.target.value})}/>
              <input type="text" placeholder="CPF/CNPJ" className="w-full p-3 border rounded bg-gray-50 outline-none" value={novoForn.cpf_cnpj} onChange={e=>setNovoForn({...novoForn, cpf_cnpj:e.target.value})}/>
            </div>
            <button onClick={handleSalvarFornecedor} disabled={loading} className="mt-6 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold transition-colors">Salvar</button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL SEGREGAÇÃO DE FATURA DE CARTÃO DE CRÉDITO                             */}
      {/* ========================================================================= */}
      {modalCartao && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-8 overflow-hidden relative border border-gray-200 animate-in fade-in zoom-in duration-150">
            
            {/* CABEÇALHO MODAL */}
            <div className="p-5 bg-indigo-950 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CreditCard size={24} className="text-indigo-300" />
                <h3 className="text-lg font-extrabold tracking-wide">
                  Segregação de Fatura - Cartão de Crédito Corporativo
                </h3>
              </div>
              <button onClick={() => setModalCartao(false)} className="text-gray-300 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              
              {/* PAINEL DE DADOS DA FATURA */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Total da Fatura (R$) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={fatura.totalFatura}
                    onChange={e => setFatura({...fatura, totalFatura: e.target.value})}
                    className="w-full p-2.5 border rounded-lg bg-white text-base font-extrabold text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Data Pagamento Fatura *</label>
                  <input 
                    type="date"
                    value={fatura.dataPagamento}
                    onChange={e => setFatura({...fatura, dataPagamento: e.target.value})}
                    className="w-full p-2.5 border rounded-lg bg-white text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Origem / Banco *</label>
                  <select
                    value={fatura.origem}
                    onChange={e => setFatura({...fatura, origem: e.target.value})}
                    className="w-full p-2.5 border rounded-lg bg-white text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Sicoob">Sicoob</option>
                    <option value="Bradesco">Bradesco</option>
                    <option value="Santander">Santander</option>
                    <option value="Tribanco">Tribanco</option>
                    <option value="Tesouraria">Tesouraria</option>
                  </select>
                </div>
              </div>

              {/* TOGGLE & CAMPO DE COMPRA DE MERCADORIAS PRA REVENDA */}
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={fatura.temMercadoria}
                      onChange={e => setFatura({...fatura, temMercadoria: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                  <div>
                    <span className="font-bold text-gray-800 text-sm block">Compra de Mercadorias para Revenda (CMV/Estoque)</span>
                    <span className="text-xs text-gray-500">Este valor abate da fatura sem gerar lançamento no módulo de despesas.</span>
                  </div>
                </div>

                {fatura.temMercadoria && (
                  <div className="w-full md:w-64">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Total Mercadorias (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={fatura.valorMercadoria}
                      onChange={e => setFatura({...fatura, valorMercadoria: e.target.value})}
                      className="w-full p-2 border rounded-lg bg-white font-bold text-green-700 outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                )}
              </div>

              {/* PAINEL DE SALDO E RESUMO DE SEGREGACÃO */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="bg-gray-100 p-3 rounded-lg border">
                  <span className="text-[11px] font-bold text-gray-500 uppercase block">Total Fatura</span>
                  <span className="text-lg font-bold text-gray-800">{formatarMoeda(numTotalFatura)}</span>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <span className="text-[11px] font-bold text-green-700 uppercase block">Mercadorias (Revenda)</span>
                  <span className="text-lg font-bold text-green-700">{formatarMoeda(numValorMercadoria)}</span>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <span className="text-[11px] font-bold text-blue-700 uppercase block">Despesas Alocadas</span>
                  <span className="text-lg font-bold text-blue-700">{formatarMoeda(numTotalDespesas)}</span>
                </div>
                <div className={`p-3 rounded-lg border font-bold ${
                  Math.abs(saldoAAlocar) < 0.01 
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-800' 
                    : 'bg-amber-100 border-amber-300 text-amber-900'
                }`}>
                  <span className="text-[11px] uppercase block">Saldo a Alocar</span>
                  <span className="text-lg flex items-center justify-center gap-1">
                    {Math.abs(saldoAAlocar) < 0.01 ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
                    {formatarMoeda(saldoAAlocar)}
                  </span>
                </div>
              </div>

              {/* LISTA DE DESPESAS ALOCADAS */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="font-bold text-gray-800 text-sm">Lançamentos de Despesas Operacionais</h4>
                  <button
                    type="button"
                    onClick={handleAdicionarLinhaDespesa}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-lg shadow flex items-center gap-1.5 transition-colors"
                  >
                    <Plus size={16} /> Adicionar Despesa
                  </button>
                </div>

                {itensDespesa.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm italic border-2 border-dashed rounded-xl">
                    Nenhuma despesa adicionada à fatura. Clique em "+ Adicionar Despesa" acima.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {itensDespesa.map((item, idx) => (
                      <div key={item.id} className="p-3 bg-gray-50 border rounded-xl grid grid-cols-1 md:grid-cols-12 gap-2 items-center text-xs relative">
                        
                        {/* Indicador de linha */}
                        <div className="md:col-span-1 font-bold text-gray-400">
                          #{idx + 1}
                        </div>

                        {/* Valor */}
                        <div className="md:col-span-2">
                          <input 
                            type="number" 
                            step="0.01" 
                            placeholder="Valor R$ *" 
                            value={item.valor} 
                            onChange={e => handleAtualizarItemDespesa(item.id, 'valor', e.target.value)} 
                            className="w-full p-2 border rounded font-bold text-red-600 bg-white outline-none"
                          />
                        </div>

                        {/* Centro de Custo */}
                        <div className="md:col-span-2">
                          <select 
                            value={item.centro_custo_id} 
                            onChange={e => handleAtualizarItemDespesa(item.id, 'centro_custo_id', e.target.value)} 
                            className="w-full p-2 border rounded bg-white outline-none"
                          >
                            <option value="">Centro Custo *</option>
                            {centrosCusto.map(cc => <option key={cc.id} value={cc.id}>{cc.codigo} - {cc.descricao}</option>)}
                          </select>
                        </div>

                        {/* Grupo */}
                        <div className="md:col-span-2">
                          <select 
                            value={item.grupo_id} 
                            onChange={e => handleAtualizarItemDespesa(item.id, 'grupo_id', e.target.value)} 
                            disabled={!item.centro_custo_id} 
                            className="w-full p-2 border rounded bg-white disabled:opacity-50 outline-none"
                          >
                            <option value="">Grupo *</option>
                            {grupos.filter(g => g.centro_custo_id === Number(item.centro_custo_id)).map(g => <option key={g.id} value={g.id}>{g.descricao}</option>)}
                          </select>
                        </div>

                        {/* Conta */}
                        <div className="md:col-span-2">
                          <select 
                            value={item.conta_id} 
                            onChange={e => handleAtualizarItemDespesa(item.id, 'conta_id', e.target.value)} 
                            disabled={!item.grupo_id} 
                            className="w-full p-2 border rounded bg-white disabled:opacity-50 outline-none"
                          >
                            <option value="">Conta *</option>
                            {contas.filter(c => c.grupo_id === Number(item.grupo_id)).map(c => <option key={c.id} value={c.id}>{c.descricao}</option>)}
                          </select>
                        </div>

                        {/* Fornecedor */}
                        <div className="md:col-span-2">
                          <select 
                            value={item.fornecedor_id} 
                            onChange={e => handleAtualizarItemDespesa(item.id, 'fornecedor_id', e.target.value)} 
                            className="w-full p-2 border rounded bg-white outline-none"
                          >
                            <option value="">Fornecedor...</option>
                            {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                          </select>
                        </div>

                        {/* Botão Excluir Linha */}
                        <div className="md:col-span-1 text-center">
                          <button 
                            type="button" 
                            onClick={() => handleRemoverLinhaDespesa(item.id)} 
                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" 
                            title="Remover linha"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Observação da Linha */}
                        <div className="md:col-span-12">
                          <input 
                            type="text" 
                            placeholder="Observação / Detalhe do gasto (ex: Peça veículo placa ABC-1234)..." 
                            value={item.observacao} 
                            onChange={e => handleAtualizarItemDespesa(item.id, 'observacao', e.target.value)} 
                            className="w-full p-1.5 border rounded text-xs bg-white text-gray-600 outline-none"
                          />
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RODAPÉ E BOTÕES DE AÇÃO */}
              <div className="flex justify-between items-center border-t pt-4">
                <button 
                  type="button" 
                  onClick={() => setModalCartao(false)} 
                  className="px-5 py-2.5 border rounded-lg text-gray-600 font-semibold hover:bg-gray-100 text-sm"
                >
                  Cancelar
                </button>

                <button 
                  type="button" 
                  onClick={handleSalvarFaturaCartao} 
                  disabled={loading || Math.abs(saldoAAlocar) > 0.01} 
                  className="px-8 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save size={18} /> {loading ? "Processando Fatura..." : "Salvar e Lançar Despesas"}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}