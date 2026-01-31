import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Eraser, PlusCircle, CheckCircle, ChevronDown, Search, History, X } from 'lucide-react';

// --- COMPONENTE CUSTOMIZADO: SELECT PESQUISÁVEL ---
const SearchableSelect = ({ 
  label, 
  options, 
  value, 
  onChange, 
  onNext, 
  placeholder, 
  fieldKey, 
  inputRef 
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
    if (onNext) onNext(); 
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0]);
      } else if (onNext) {
        onNext(); 
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
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
          ref={inputRef}
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
          onKeyDown={handleKeyDown}
        />
        <div className="absolute right-3 top-3 text-gray-400 pointer-events-none">
          {isOpen ? <Search size={20}/> : <ChevronDown size={20}/>}
        </div>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-200 mt-1 max-h-60 overflow-y-auto rounded shadow-lg">
          {filteredOptions.map((opt) => (
            <li
              key={opt.id}
              onClick={() => handleSelect(opt)}
              className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0 text-gray-700"
            >
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


export default function IncluirLancamento() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // --- ESTADOS DO MODAL ÚLTIMOS LANÇAMENTOS ---
  const [modalUltimosAberto, setModalUltimosAberto] = useState(false);
  const [ultimosLancamentos, setUltimosLancamentos] = useState([]);

  // --- REFERÊNCIAS ---
  const refs = {
    vencimento: useRef(),
    fornecedor: useRef(),
    tipo: useRef(),
    doc: useRef(),
    nf: useRef(),
    parcela: useRef(),
    razao: useRef(),
    banco: useRef(),
    status: useRef(),
    valor: useRef(),
    obs: useRef(),
    btnSalvar: useRef()
  };

  const [listas, setListas] = useState({
    fornecedores: [],
    tipos_documento: [],
    bancos: [],
    razoes: [],
    parcelas: []
  });

  const formInicial = {
    data_vencimento: '',
    fornecedor_id: '',
    tipo_documento_id: '',
    numero_documento: '',
    nota_fiscal: '',
    parcela_id: '',
    razao_id: '',
    banco_id: '',
    status: 'Pendente',
    valor: '',
    observacao: ''
  };
  const [form, setForm] = useState(formInicial);

  useEffect(() => {
    async function carregarListas() {
      const [f, t, b, r, p] = await Promise.all([
        supabase.from('fornecedores').select('*').order('nome'),
        supabase.from('tipos_documento').select('*').order('descricao'),
        supabase.from('bancos').select('*').order('nome'),
        supabase.from('razoes').select('*').order('nome'),
        supabase.from('parcelas').select('*').order('descricao')
      ]);

      setListas({
        fornecedores: f.data || [],
        tipos_documento: t.data || [],
        bancos: b.data || [],
        razoes: r.data || [],
        parcelas: p.data || []
      });
    }
    carregarListas();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleEnterKey = (e, nextRef) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      nextRef?.current?.focus();
    }
  };

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatarData = (d) => d ? d.split('-').reverse().join('/') : '-';

  const ajustarDataUtil = (dataStr) => {
    if (!dataStr) return dataStr;
    const data = new Date(dataStr + 'T12:00:00');
    const diaSemana = data.getDay(); 

    if (diaSemana === 6) data.setDate(data.getDate() + 2);
    else if (diaSemana === 0) data.setDate(data.getDate() + 1);
    else return dataStr;
    
    return data.toISOString().split('T')[0];
  };

  const handleAbrirUltimos = async () => {
    const { data, error } = await supabase
      .from('lancamentos')
      .select(`*, fornecedores(nome), tipos_documento(descricao)`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      alert('Erro ao buscar últimos lançamentos: ' + error.message);
    } else {
      setUltimosLancamentos([...data].reverse());
      setModalUltimosAberto(true);
    }
  };

  // --- VALIDAÇÃO E SALVAMENTO ---
  const executarSalvamento = async () => {
    // Validação de TODOS os campos obrigatórios (exceto observação)
    if (
        !form.data_vencimento || 
        !form.fornecedor_id ||
        !form.tipo_documento_id ||
        !form.numero_documento ||
        !form.nota_fiscal ||
        !form.parcela_id ||
        !form.razao_id ||
        !form.banco_id ||
        !form.valor
    ) {
      alert("Por favor, preencha todos os campos obrigatórios (*)");
      return false;
    }

    setLoading(true);
    const vencimentoReal = ajustarDataUtil(form.data_vencimento);

    const { error } = await supabase.from('lancamentos').insert([{
      ...form,
      data_vencimento: vencimentoReal,
      valor: parseFloat(form.valor),
      // Removemos os '|| null' pois agora são obrigatórios, exceto observação
      fornecedor_id: form.fornecedor_id,
      tipo_documento_id: form.tipo_documento_id,
      parcela_id: form.parcela_id,
      razao_id: form.razao_id,
      banco_id: form.banco_id
    }]);

    setLoading(false);

    if (error) {
      alert('Erro ao salvar: ' + error.message);
      return false;
    }
    return true;
  };

  const handleSalvarSair = async (e) => {
    if(e) e.preventDefault();
    const sucesso = await executarSalvamento();
    if (sucesso) {
      alert('Lançamento salvo! Indo para a listagem...');
      navigate('/listagem');
    }
  };

  const handleSalvarNovo = async (e) => {
    if(e) e.preventDefault();
    const sucesso = await executarSalvamento();
    if (sucesso) {
      alert('Lançamento salvo com sucesso!');
      setForm(formInicial); 
      setTimeout(() => refs.vencimento.current?.focus(), 100);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="flex justify-center pb-10">
      <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-md border border-gray-200 relative">
        
        {/* CABEÇALHO DO CARD COM BOTÃO ÚLTIMOS */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b pb-4 gap-4">
            <h2 className="text-3xl font-bold text-primary text-center md:text-left">Incluir Lançamento</h2>
            <button
                onClick={handleAbrirUltimos}
                type="button"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center gap-2 text-sm"
            >
                <History size={18} /> Últimos Lançamentos
            </button>
        </div>

        <form className="flex flex-col gap-4">
          
          {/* Data Vencimento */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Data Vencimento *</label>
            <input 
              ref={refs.vencimento}
              type="date" 
              name="data_vencimento"
              value={form.data_vencimento} 
              onChange={handleChange}
              onKeyDown={(e) => handleEnterKey(e, refs.fornecedor)}
              className="w-full p-3 border rounded bg-gray-50 focus:ring-2 focus:ring-secondary outline-none"
              required
            />
            <span className="text-xs text-gray-400 mt-1 block">Finais de semana serão ajustados para segunda-feira automaticamente.</span>
          </div>

          {/* Fornecedor */}
          <SearchableSelect
            inputRef={refs.fornecedor}
            label="Fornecedor *"
            placeholder="Digite para buscar..."
            options={listas.fornecedores}
            fieldKey="nome"
            value={form.fornecedor_id}
            onChange={(val) => setForm({...form, fornecedor_id: val})}
            onNext={() => refs.tipo.current?.focus()}
          />

          {/* Tipo de Documento */}
          <SearchableSelect
            inputRef={refs.tipo}
            label="Tipo de Documento *"
            placeholder="Selecione o tipo..."
            options={listas.tipos_documento}
            fieldKey="descricao"
            value={form.tipo_documento_id}
            onChange={(val) => setForm({...form, tipo_documento_id: val})}
            onNext={() => refs.doc.current?.focus()}
          />

          {/* Nº Documento */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Nº Documento *</label>
            <input 
              ref={refs.doc}
              type="text" 
              name="numero_documento" 
              value={form.numero_documento} 
              onChange={handleChange} 
              onKeyDown={(e) => handleEnterKey(e, refs.nf)}
              className="w-full p-3 border rounded bg-gray-50 focus:ring-2 focus:ring-secondary outline-none" 
            />
          </div>

          {/* Nota Fiscal */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Nota Fiscal *</label>
            <input 
              ref={refs.nf}
              type="text" 
              name="nota_fiscal" 
              value={form.nota_fiscal} 
              onChange={handleChange} 
              onKeyDown={(e) => handleEnterKey(e, refs.parcela)}
              className="w-full p-3 border rounded bg-gray-50 focus:ring-2 focus:ring-secondary outline-none" 
            />
          </div>

          {/* Parcela */}
          <SearchableSelect
            inputRef={refs.parcela}
            label="Parcela *"
            placeholder="Selecione..."
            options={listas.parcelas}
            fieldKey="descricao"
            value={form.parcela_id}
            onChange={(val) => setForm({...form, parcela_id: val})}
            onNext={() => refs.razao.current?.focus()}
          />

          {/* Razão / Centro de Custo */}
          <SearchableSelect
            inputRef={refs.razao}
            label="Razão / Centro de Custo *"
            placeholder="Selecione..."
            options={listas.razoes}
            fieldKey="nome"
            value={form.razao_id}
            onChange={(val) => setForm({...form, razao_id: val})}
            onNext={() => refs.banco.current?.focus()}
          />

          {/* Banco */}
          <SearchableSelect
            inputRef={refs.banco}
            label="Banco *"
            placeholder="Selecione..."
            options={listas.bancos}
            fieldKey="nome"
            value={form.banco_id}
            onChange={(val) => setForm({...form, banco_id: val})}
            onNext={() => refs.status.current?.focus()}
          />

          {/* Status */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Status *</label>
            <select 
              ref={refs.status}
              name="status" 
              value={form.status} 
              onChange={handleChange} 
              onKeyDown={(e) => handleEnterKey(e, refs.valor)}
              className={`w-full p-3 border rounded font-bold outline-none focus:ring-2 focus:ring-secondary ${form.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
            >
              <option value="Pendente">Pendente</option>
              <option value="Pago">Pago</option>
            </select>
          </div>

          {/* Valor */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Valor (R$) *</label>
            <input 
              ref={refs.valor}
              type="number" 
              step="0.01" 
              name="valor"
              placeholder="0.00"
              value={form.valor} 
              onChange={handleChange}
              onKeyDown={(e) => handleEnterKey(e, refs.obs)}
              className="w-full p-3 border rounded bg-gray-50 focus:ring-2 focus:ring-secondary outline-none text-xl font-mono"
              required
            />
          </div>

          {/* Observação (Único opcional) */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Observação</label>
            <textarea 
              ref={refs.obs}
              name="observacao" 
              rows="3"
              value={form.observacao} 
              onChange={handleChange}
              className="w-full p-3 border rounded bg-gray-50 focus:ring-2 focus:ring-secondary outline-none"
            ></textarea>
          </div>

          {/* BOTÕES */}
          <div className="flex flex-col md:flex-row justify-end gap-4 mt-6 pt-6 border-t">
            <button 
              type="button" 
              onClick={() => setForm(formInicial)}
              className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 font-semibold order-3 md:order-1"
            >
              <Eraser size={20} /> Limpar
            </button>
            <button 
              ref={refs.btnSalvar}
              type="button"
              onClick={handleSalvarNovo}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded font-bold shadow transition-colors disabled:opacity-50 order-2"
            >
              <PlusCircle size={20} /> {loading ? 'Salvando...' : 'Salvar e Adicionar Novo'}
            </button>
            <button 
              type="button" 
              onClick={handleSalvarSair}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-blue-800 text-white rounded font-bold shadow-lg transition-colors disabled:opacity-50 order-1 md:order-3"
            >
              {loading ? 'Salvando...' : 'Salvar e Sair'} <CheckCircle size={20} />
            </button>
          </div>

        </form>
      </div>

      {/* MODAL ÚLTIMOS LANÇAMENTOS */}
      {modalUltimosAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg relative">
            <button
              onClick={() => setModalUltimosAberto(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
            >
              <X size={24} />
            </button>

            <h3 className="text-2xl font-bold text-primary mb-6 flex items-center gap-2">
              <History size={24} /> Últimos 5 Lançamentos
            </h3>

            <div className="space-y-3">
              {ultimosLancamentos.map((l) => (
                <div key={l.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:bg-blue-50 transition-colors">
                   <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-gray-800 text-lg">{l.fornecedores?.nome || 'Sem Fornecedor'}</p>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${l.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {l.status}
                      </span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <p className="text-gray-500">{l.tipos_documento?.descricao} • {formatarData(l.data_vencimento)}</p>
                      <p className="font-bold text-primary text-base">{formatarMoeda(l.valor)}</p>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}