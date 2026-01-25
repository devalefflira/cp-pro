import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Save, Eraser, PlusCircle, CheckCircle } from 'lucide-react';

export default function IncluirLancamento() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

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

  // --- FUNÇÃO PARA JOGAR SÁBADO/DOMINGO PARA SEGUNDA ---
  const ajustarDataUtil = (dataStr) => {
    if (!dataStr) return dataStr;
    
    // Cria a data usando meio-dia (T12:00) para evitar problemas de fuso horário voltando o dia
    const data = new Date(dataStr + 'T12:00:00');
    const diaSemana = data.getDay(); // 0 = Domingo, 6 = Sábado

    if (diaSemana === 6) { 
      // É Sábado: Adiciona 2 dias -> Segunda
      data.setDate(data.getDate() + 2);
    } else if (diaSemana === 0) {
      // É Domingo: Adiciona 1 dia -> Segunda
      data.setDate(data.getDate() + 1);
    } else {
      // É dia útil, não muda nada
      return dataStr;
    }

    // Retorna no formato YYYY-MM-DD
    return data.toISOString().split('T')[0];
  };

  // --- LÓGICA CENTRAL DE SALVAMENTO ---
  const executarSalvamento = async () => {
    if (!form.data_vencimento || !form.valor || !form.fornecedor_id) {
      alert("Preencha os campos obrigatórios (*)");
      return false;
    }

    setLoading(true);

    // APLICA A REGRA DE NEGÓCIO AQUI
    // Se o usuário digitou sábado/domingo, vencimentoReal vira segunda-feira
    const vencimentoReal = ajustarDataUtil(form.data_vencimento);
    
    // Opcional: Avisar o usuário se a data mudou (pode remover se quiser "silencioso")
    if (vencimentoReal !== form.data_vencimento) {
      // alert(`Atenção: A data ${form.data_vencimento} cai num fim de semana. Será salvo como ${vencimentoReal} (Segunda-feira).`);
    }

    const { error } = await supabase.from('lancamentos').insert([{
      ...form,
      data_vencimento: vencimentoReal, // Usa a data ajustada
      valor: parseFloat(form.valor),
      fornecedor_id: form.fornecedor_id || null,
      tipo_documento_id: form.tipo_documento_id || null,
      parcela_id: form.parcela_id || null,
      razao_id: form.razao_id || null,
      banco_id: form.banco_id || null
    }]);

    setLoading(false);

    if (error) {
      alert('Erro ao salvar: ' + error.message);
      return false;
    }
    return true;
  };

  const handleSalvarSair = async (e) => {
    e.preventDefault();
    const sucesso = await executarSalvamento();
    if (sucesso) {
      alert('Lançamento salvo! Indo para a listagem...');
      navigate('/listagem');
    }
  };

  const handleSalvarNovo = async (e) => {
    e.preventDefault();
    const sucesso = await executarSalvamento();
    if (sucesso) {
      alert('Lançamento salvo com sucesso!');
      setForm(formInicial); 
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-3xl font-bold text-primary mb-8 border-b pb-4">Incluir Lançamento</h2>

      <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Data Vencimento */}
        <div>
          <label className="block font-semibold text-gray-700 mb-2">Data Vencimento *</label>
          <input 
            type="date" 
            name="data_vencimento"
            value={form.data_vencimento} 
            onChange={handleChange}
            className="w-full p-3 border rounded bg-gray-50 focus:ring-2 focus:ring-secondary outline-none"
            required
          />
          {/* Dica visual para o usuário saber que sábado/domingo ajusta automático */}
          <span className="text-xs text-gray-400 mt-1 block">Finais de semana serão ajustados para segunda-feira automaticamente.</span>
        </div>

        {/* Fornecedor */}
        <div>
          <label className="block font-semibold text-gray-700 mb-2">Fornecedor *</label>
          <select 
            name="fornecedor_id" 
            value={form.fornecedor_id} 
            onChange={handleChange}
            className="w-full p-3 border rounded bg-gray-50 focus:ring-2 focus:ring-secondary outline-none"
            required
          >
            <option value="">Selecione...</option>
            {listas.fornecedores.map(item => (
              <option key={item.id} value={item.id}>{item.nome}</option>
            ))}
          </select>
        </div>

        {/* Tipo de Documento */}
        <div>
          <label className="block font-semibold text-gray-700 mb-2">Tipo de Documento</label>
          <select name="tipo_documento_id" value={form.tipo_documento_id} onChange={handleChange} className="w-full p-3 border rounded bg-gray-50 outline-none">
            <option value="">Selecione...</option>
            {listas.tipos_documento.map(item => <option key={item.id} value={item.id}>{item.descricao}</option>)}
          </select>
        </div>

        {/* Nº Documento */}
        <div>
          <label className="block font-semibold text-gray-700 mb-2">Nº Documento</label>
          <input type="text" name="numero_documento" value={form.numero_documento} onChange={handleChange} className="w-full p-3 border rounded bg-gray-50 outline-none" />
        </div>

        {/* Nota Fiscal */}
        <div>
          <label className="block font-semibold text-gray-700 mb-2">Nota Fiscal</label>
          <input type="text" name="nota_fiscal" value={form.nota_fiscal} onChange={handleChange} className="w-full p-3 border rounded bg-gray-50 outline-none" />
        </div>

        {/* Parcela */}
        <div>
          <label className="block font-semibold text-gray-700 mb-2">Parcela</label>
          <select name="parcela_id" value={form.parcela_id} onChange={handleChange} className="w-full p-3 border rounded bg-gray-50 outline-none">
            <option value="">Selecione...</option>
            {listas.parcelas.map(item => <option key={item.id} value={item.id}>{item.descricao}</option>)}
          </select>
        </div>

        {/* Razão / Centro de Custo */}
        <div>
          <label className="block font-semibold text-gray-700 mb-2">Razão / Centro de Custo</label>
          <select name="razao_id" value={form.razao_id} onChange={handleChange} className="w-full p-3 border rounded bg-gray-50 outline-none">
            <option value="">Selecione...</option>
            {listas.razoes.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
        </div>

        {/* Banco */}
        <div>
          <label className="block font-semibold text-gray-700 mb-2">Banco</label>
          <select name="banco_id" value={form.banco_id} onChange={handleChange} className="w-full p-3 border rounded bg-gray-50 outline-none">
            <option value="">Selecione...</option>
            {listas.bancos.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block font-semibold text-gray-700 mb-2">Status</label>
          <select 
            name="status" 
            value={form.status} 
            onChange={handleChange} 
            className={`w-full p-3 border rounded font-bold outline-none ${form.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
          >
            <option value="Pendente">Pendente</option>
            <option value="Pago">Pago</option>
          </select>
        </div>

        {/* Valor */}
        <div>
          <label className="block font-semibold text-gray-700 mb-2">Valor (R$) *</label>
          <input 
            type="number" 
            step="0.01" 
            name="valor"
            placeholder="0.00"
            value={form.valor} 
            onChange={handleChange}
            className="w-full p-3 border rounded bg-gray-50 focus:ring-2 focus:ring-secondary outline-none text-lg font-mono"
            required
          />
        </div>

        {/* Observação (Ocupa as duas colunas) */}
        <div className="md:col-span-2">
          <label className="block font-semibold text-gray-700 mb-2">Observação</label>
          <textarea 
            name="observacao" 
            rows="3"
            value={form.observacao} 
            onChange={handleChange}
            className="w-full p-3 border rounded bg-gray-50 outline-none"
          ></textarea>
        </div>

        {/* --- ÁREA DOS BOTÕES --- */}
        <div className="md:col-span-2 flex flex-col md:flex-row justify-end gap-4 mt-6 pt-6 border-t">
          
          <button 
            type="button" 
            onClick={() => setForm(formInicial)}
            className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 font-semibold order-3 md:order-1"
          >
            <Eraser size={20} />
            Limpar
          </button>
          
          <button 
            type="button"
            onClick={handleSalvarNovo}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded font-bold shadow transition-colors disabled:opacity-50 order-2"
          >
            <PlusCircle size={20} />
            {loading ? 'Salvando...' : 'Salvar e Adicionar Novo'}
          </button>

          <button 
            type="button" 
            onClick={handleSalvarSair}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-blue-800 text-white rounded font-bold shadow-lg transition-colors disabled:opacity-50 order-1 md:order-3"
          >
            {loading ? 'Salvando...' : 'Salvar e Sair'}
            <CheckCircle size={20} />
          </button>

        </div>

      </form>
    </div>
  );
}