import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { Save, X, Plus, Search, ChevronDown } from 'lucide-react';

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
    function handleClickOutside(event) { if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false); }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  return (
    <div className="relative mb-1 flex-1" ref={wrapperRef}>
      <label className="block font-semibold text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input type="text" className="w-full p-3 border rounded bg-gray-50 focus:ring-2 focus:ring-secondary outline-none pr-10" placeholder={placeholder} value={search} onClick={() => setIsOpen(true)} onChange={(e) => { setSearch(e.target.value); setIsOpen(true); if(e.target.value==='') onChange(''); }} />
        <div className="absolute right-3 top-3 text-gray-400 pointer-events-none">{isOpen ? <Search size={20} /> : <ChevronDown size={20} />}</div>
      </div>
      {isOpen && (
        <ul className="absolute z-50 w-full bg-white border border-gray-200 mt-1 max-h-60 overflow-y-auto rounded shadow-lg">
          {filteredOptions.map((opt) => (
            <li key={opt.id} onClick={() => { onChange(opt.id); setSearch(opt[fieldKey]); setIsOpen(false); }} className="p-3 hover:bg-blue-50 cursor-pointer border-b text-gray-700">
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

  // Adicionado forma_pagamento e origem
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

  return (
    <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200">
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
          <button type="button" onClick={() => setModalForn(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 h-[50px] mb-1 rounded-lg flex items-center shadow"><Plus size={24} /></button>
        </div>

        <div>
          <label className="block font-semibold text-gray-700 mb-1">Data *</label>
          <input type="date" className="w-full p-3 border rounded bg-gray-50 focus:ring-2 outline-none" value={form.data_pagamento} onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })} required />
        </div>
        <div className="relative">
          <label className="block font-semibold text-gray-700 mb-1">Valor (R$) *</label>
          <style>{`input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }`}</style>
          <input type="number" step="0.01" className="w-full p-3 border rounded bg-gray-50 text-red-600 font-bold outline-none" placeholder="0.00" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
        </div>

        {/* --- NOVOS CAMPOS --- */}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
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
    </div>
  );
}