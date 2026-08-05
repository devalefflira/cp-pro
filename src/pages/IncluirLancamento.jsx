import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { PlusCircle, RotateCcw, Save, CheckCircle, Search, ChevronDown, Check } from 'lucide-react';

// COMPONENTE COMBOBOX REUTILIZÁVEL COM TRATAMENTO SEGURO DE BUSCA
function SearchableSelect({ label, placeholder, options, value, onChange, required, displayKey = 'nome', valueKey = 'id' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const inputSearchRef = useRef(null);

  const selectedOption = options.find(opt => String(opt[valueKey]) === String(value));

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtro resiliente (trata campos nulos e indefinições)
  const filteredOptions = options.filter(opt => {
    const text = String(opt[displayKey] || opt.nome || opt.descricao || '').toLowerCase();
    return text.includes((searchTerm || '').toLowerCase());
  });

  const handleSelect = (opt) => {
    onChange(opt[valueKey]);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="block font-bold text-gray-700 mb-1">{label} {required && '*'}</label>
      
      {/* Botão do Campo */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setTimeout(() => inputSearchRef.current?.focus(), 50);
        }}
        className={`w-full p-2.5 border rounded-lg bg-white font-semibold text-left flex justify-between items-center outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
          !selectedOption ? 'text-gray-400 font-normal' : 'text-gray-800'
        }`}
      >
        <span className="truncate">
          {selectedOption ? (selectedOption[displayKey] || selectedOption.nome || selectedOption.descricao) : placeholder}
        </span>
        <ChevronDown size={16} className="text-gray-400 shrink-0 ml-1" />
      </button>

      {/* Menu Suspenso de Busca */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b bg-gray-50 flex items-center gap-2">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              ref={inputSearchRef}
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Digite para filtrar..."
              className="w-full bg-transparent text-xs outline-none font-medium text-gray-800"
            />
          </div>

          <div className="overflow-y-auto max-h-48 divide-y divide-gray-50">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-gray-400 text-xs italic">Nenhum resultado encontrado.</div>
            ) : (
              filteredOptions.map(opt => (
                <button
                  key={opt[valueKey]}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-indigo-50 hover:text-indigo-900 flex justify-between items-center transition-colors ${
                    String(opt[valueKey]) === String(value) ? 'bg-indigo-50/60 text-indigo-900 font-bold' : 'text-gray-700'
                  }`}
                >
                  <span className="truncate">{opt[displayKey] || opt.nome || opt.descricao}</span>
                  {String(opt[valueKey]) === String(value) && <Check size={14} className="text-indigo-600 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function IncluirLancamento() {
  const dataInputRef = useRef(null);
  const formRef = useRef(null);

  const [fornecedores, setFornecedores] = useState([]);
  const [tiposDoc, setTiposDoc] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [razoes, setRazoes] = useState([]);
  const [bancos, setBancos] = useState([]);

  const [form, setForm] = useState({
    data_vencimento: new Date().toISOString().split('T')[0],
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
  });

  const [loading, setLoading] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  useEffect(() => {
    carregarListasAuxiliares();
    if (dataInputRef.current) {
      dataInputRef.current.focus();
    }
  }, []);

  const carregarListasAuxiliares = async () => {
    const [resForn, resTipos, resParc, resRaz, resBancos] = await Promise.all([
      supabase.from('fornecedores').select('*').order('nome'),
      supabase.from('tipos_documento').select('*').order('descricao'),
      supabase.from('parcelas').select('*').order('descricao'),
      supabase.from('razoes').select('*').order('nome'),
      supabase.from('bancos').select('*').order('nome')
    ]);

    // Mapeia garantindo o atributo nome completo
    const fornFormatados = (resForn.data || []).map(f => ({
      id: f.id,
      nome: f.cpf_cnpj ? `${f.nome} (${f.cpf_cnpj})` : f.nome
    }));

    setFornecedores(fornFormatados);
    setTiposDoc(resTipos.data || []);
    setParcelas(resParc.data || []);
    setRazoes(resRaz.data || []);
    setBancos(resBancos.data || []);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      const formElements = Array.from(
        formRef.current.querySelectorAll('input, select, textarea, button[type="button"], button[type="submit"]')
      ).filter(el => !el.disabled && el.type !== 'hidden');

      const currentIndex = formElements.indexOf(e.target);
      if (currentIndex !== -1 && currentIndex < formElements.length - 1) {
        formElements[currentIndex + 1].focus();
      }
    }
  };

  const handleSalvar = async (e) => {
    if (e) e.preventDefault();

    if (!form.data_vencimento || !form.fornecedor_id || !form.valor) {
      return alert("Preencha todos os campos obrigatórios (*).");
    }

    setLoading(true);

    const payload = {
      ...form,
      fornecedor_id: parseInt(form.fornecedor_id),
      tipo_documento_id: form.tipo_documento_id ? parseInt(form.tipo_documento_id) : null,
      parcela_id: form.parcela_id ? parseInt(form.parcela_id) : null,
      razao_id: form.razao_id ? parseInt(form.razao_id) : null,
      banco_id: form.banco_id ? parseInt(form.banco_id) : null,
      valor: parseFloat(form.valor)
    };

    const { error } = await supabase.from('lancamentos').insert([payload]);

    if (error) {
      alert("Erro ao salvar lançamento: " + error.message);
    } else {
      setMensagemSucesso("Lançamento salvo com sucesso!");
      setTimeout(() => setMensagemSucesso(''), 4000);

      setForm({
        data_vencimento: new Date().toISOString().split('T')[0],
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
      });

      if (dataInputRef.current) {
        dataInputRef.current.focus();
      }
    }
    setLoading(false);
  };

  const handleLimpar = () => {
    setForm({
      data_vencimento: new Date().toISOString().split('T')[0],
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
    });
    if (dataInputRef.current) dataInputRef.current.focus();
  };

  return (
    <div className="space-y-6">
      
      {mensagemSucesso && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
          <CheckCircle size={18} className="text-emerald-600"/> {mensagemSucesso}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            <PlusCircle className="text-primary" size={22} /> Novo Lançamento de Conta a Pagar
          </h3>
          <span className="text-xs text-gray-400 font-semibold">Pressione <strong>Enter</strong> para avançar para o próximo campo</span>
        </div>

        <form ref={formRef} onKeyDown={handleKeyDown} onSubmit={handleSalvar} className="space-y-6 text-xs">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. DATA DE VENCIMENTO */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Data Vencimento *</label>
              <input
                ref={dataInputRef}
                type="date"
                required
                value={form.data_vencimento}
                onChange={e => setForm({ ...form, data_vencimento: e.target.value })}
                className="w-full p-2.5 border rounded-lg bg-gray-50 font-semibold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* 2. FORNECEDOR / PRESTADOR (COM BUSCA) */}
            <SearchableSelect
              label="Fornecedor / Prestador"
              placeholder="Digite para buscar fornecedor..."
              options={fornecedores}
              value={form.fornecedor_id}
              onChange={val => setForm({ ...form, fornecedor_id: val })}
              required
              displayKey="nome"
              valueKey="id"
            />

            {/* 3. TIPO DE DOCUMENTO (COM BUSCA) */}
            <SearchableSelect
              label="Tipo de Documento"
              placeholder="Digite para buscar tipo..."
              options={tiposDoc}
              value={form.tipo_documento_id}
              onChange={val => setForm({ ...form, tipo_documento_id: val })}
              required
              displayKey="descricao"
              valueKey="id"
            />

            {/* 4. Nº DO DOCUMENTO */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Nº Documento *</label>
              <input
                type="text"
                value={form.numero_documento}
                onChange={e => setForm({ ...form, numero_documento: e.target.value })}
                className="w-full p-2.5 border rounded-lg bg-gray-50 font-semibold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Número identificador"
              />
            </div>

            {/* 5. NOTA FISCAL */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Nota Fiscal *</label>
              <input
                type="text"
                value={form.nota_fiscal}
                onChange={e => setForm({ ...form, nota_fiscal: e.target.value })}
                className="w-full p-2.5 border rounded-lg bg-gray-50 font-semibold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Número da Nota Fiscal"
              />
            </div>

            {/* 6. PARCELA */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Parcela *</label>
              <select
                value={form.parcela_id}
                onChange={e => setForm({ ...form, parcela_id: e.target.value })}
                className="w-full p-2.5 border rounded-lg bg-white font-semibold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">Selecione a parcela...</option>
                {parcelas.map(p => (
                  <option key={p.id} value={p.id}>{p.descricao}</option>
                ))}
              </select>
            </div>

            {/* 7. RAZÃO / CENTRO DE CUSTO (COM BUSCA) */}
            <SearchableSelect
              label="Razão / Centro de Custo"
              placeholder="Digite para buscar razão..."
              options={razoes}
              value={form.razao_id}
              onChange={val => setForm({ ...form, razao_id: val })}
              required
              displayKey="nome"
              valueKey="id"
            />

            {/* 8. BANCO (COM BUSCA) */}
            <SearchableSelect
              label="Banco"
              placeholder="Digite para buscar banco..."
              options={bancos}
              value={form.banco_id}
              onChange={val => setForm({ ...form, banco_id: val })}
              required
              displayKey="nome"
              valueKey="id"
            />

            {/* 9. STATUS */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Status *</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full p-2.5 border rounded-lg bg-amber-50 text-amber-900 font-bold outline-none border-amber-200"
              >
                <option value="Pendente">Pendente</option>
                <option value="Pago">Pago</option>
              </select>
            </div>

            {/* 10. VALOR (R$) */}
            <div>
              <label className="block font-bold text-gray-800 mb-1 text-sm">Valor (R$) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={form.valor}
                onChange={e => setForm({ ...form, valor: e.target.value })}
                onWheel={(e) => e.target.blur()}
                className="w-full p-2.5 border rounded-lg bg-white font-extrabold text-indigo-900 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="0,00"
              />
            </div>

          </div>

          {/* 11. OBSERVAÇÃO */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Observação</label>
            <textarea
              rows={2}
              value={form.observacao}
              onChange={e => setForm({ ...form, observacao: e.target.value })}
              className="w-full p-2.5 border rounded-lg bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Anotações adicionais do lançamento..."
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleLimpar}
              className="px-5 py-2.5 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw size={15}/> Limpar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-2 transition-transform hover:scale-105"
            >
              <Save size={16}/> {loading ? "Salvando..." : "Salvar e Adicionar Novo"}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}