import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { PlusCircle, CheckCircle } from 'lucide-react';

export default function NovoLancamentoTab() {
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [responsavelNome, setResponsavelNome] = useState('');
  const [dataHoraAtual, setDataHoraAtual] = useState('');

  const [form, setForm] = useState({
    data_operacao: new Date().toISOString().split('T')[0],
    tipo_documento: 'PIX',
    valor: '',
    forma_pagamento: 'PIX',
    banco_operador: 'Bradesco',
    tipo_operacao: 'Entrada +',
    descricao: ''
  });

  useEffect(() => {
    carregarUsuarioLogado();
    atualizarRelogio();
    const timer = setInterval(atualizarRelogio, 1000);
    return () => clearInterval(timer);
  }, []);

  const carregarUsuarioLogado = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome, email')
        .eq('id', session.user.id)
        .single();

      if (profile?.nome) {
        setResponsavelNome(profile.nome);
      } else {
        setResponsavelNome(session.user.email);
      }
    }
  };

  const atualizarRelogio = () => {
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR');
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setDataHoraAtual(`${dataFormatada}, ${horaFormatada}`);
  };

  // Máscara monetária dinâmica: transforma dígitos em formato 1.550,50
  const handleValorChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setForm(prev => ({ ...prev, valor: '' }));
      return;
    }
    const valorNumerico = (Number(raw) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    setForm(prev => ({ ...prev, valor: valorNumerico }));
  };

  // Converte "1.550,50" para float 1550.50 antes de salvar no PostgreSQL
  const parseValorParaFloat = (valStr) => {
    if (!valStr) return 0;
    const limpo = valStr.toString().replace(/\./g, '').replace(',', '.');
    return parseFloat(limpo) || 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valorFloat = parseValorParaFloat(form.valor);

    if (valorFloat <= 0) {
      return alert("Informe um valor válido maior que zero.");
    }

    setLoading(true);

    const payload = {
      responsavel: responsavelNome || 'Sistema',
      data_lancamento: dataHoraAtual,
      data_operacao: form.data_operacao,
      tipo_documento: form.tipo_documento,
      valor: valorFloat,
      forma_pagamento: form.forma_pagamento,
      banco_operador: form.banco_operador,
      tipo_operacao: form.tipo_operacao,
      descricao: form.descricao
    };

    const { error } = await supabase.from('movimento_caixa').insert([payload]);

    setLoading(false);
    if (error) {
      alert("Erro ao salvar lançamento: " + error.message);
    } else {
      setSucesso(true);
      setForm({
        data_operacao: new Date().toISOString().split('T')[0],
        tipo_documento: 'PIX',
        valor: '',
        forma_pagamento: 'PIX',
        banco_operador: 'Bradesco',
        tipo_operacao: 'Entrada +',
        descricao: ''
      });
      setTimeout(() => setSucesso(false), 4000);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl border shadow-sm max-w-3xl mx-auto space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <PlusCircle className="text-primary" /> Novo Lançamento no Caixa Geral
        </h2>
      </div>

      {sucesso && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle size={18} className="text-emerald-600" /> Lançamento salvo com sucesso!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Responsável</label>
            <input 
              type="text" 
              disabled 
              value={responsavelNome} 
              className="w-full p-2.5 border rounded-lg bg-gray-100 font-bold text-gray-800" 
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Data/Hora Lançamento</label>
            <input 
              type="text" 
              disabled 
              value={dataHoraAtual} 
              className="w-full p-2.5 border rounded-lg bg-gray-100 font-semibold text-gray-600" 
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Data Operação *</label>
            <input 
              type="date" 
              required 
              value={form.data_operacao} 
              onChange={e => setForm({ ...form, data_operacao: e.target.value })} 
              className="w-full p-2.5 border rounded-lg bg-gray-50" 
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Tipo Documento *</label>
            <select 
              value={form.tipo_documento} 
              onChange={e => setForm({ ...form, tipo_documento: e.target.value })} 
              className="w-full p-2.5 border rounded-lg bg-white font-semibold"
            >
              <option value="PIX">PIX</option>
              <option value="Cartão">Cartão</option>
              <option value="Vale">Vale</option>
              <option value="Despesa">Despesa</option>
              <option value="Devolução">Devolução</option>
              <option value="Fatura AtualCard">Fatura AtualCard</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Valor (R$) *</label>
            <input 
              type="text" 
              inputMode="numeric"
              required 
              placeholder="0,00" 
              value={form.valor} 
              onChange={handleValorChange} 
              className="w-full p-2.5 border rounded-lg bg-gray-50 font-extrabold text-gray-900" 
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Forma de Pagamento *</label>
            <select 
              value={form.forma_pagamento} 
              onChange={e => setForm({ ...form, forma_pagamento: e.target.value })} 
              className="w-full p-2.5 border rounded-lg bg-white font-semibold"
            >
              <option value="Dinheiro">Dinheiro</option>
              <option value="PIX">PIX</option>
              <option value="Cartão">Cartão</option>
              <option value="Depósito">Depósito</option>
              <option value="TED">TED</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Banco / Operador *</label>
            <select 
              value={form.banco_operador} 
              onChange={e => setForm({ ...form, banco_operador: e.target.value })} 
              className="w-full p-2.5 border rounded-lg bg-white font-semibold"
            >
              <option value="Bradesco">Bradesco</option>
              <option value="Santander">Santander</option>
              <option value="Sicoob">Sicoob</option>
              <option value="Tribanco">Tribanco</option>
              <option value="Cielo">Cielo</option>
              <option value="AtualCard">AtualCard</option>
              <option value="RomCard">RomCard</option>
              <option value="Safra">Safra</option>
              <option value="WebNex">WebNex</option>
              <option value="N/A">N/A</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Tipo Operação *</label>
            <select 
              value={form.tipo_operacao} 
              onChange={e => setForm({ ...form, tipo_operacao: e.target.value })} 
              className="w-full p-2.5 border rounded-lg bg-white font-extrabold"
            >
              <option value="Entrada +" className="text-emerald-600">Entrada (+)</option>
              <option value="Saída -" className="text-red-600">Saída (-)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block font-bold text-gray-700 mb-1">Descrição</label>
            <textarea 
              rows="3" 
              placeholder="Detalhes do lançamento..." 
              value={form.descricao} 
              onChange={e => setForm({ ...form, descricao: e.target.value })} 
              className="w-full p-2.5 border rounded-lg bg-gray-50"
            ></textarea>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button 
            type="button" 
            onClick={() => setForm({ data_operacao: new Date().toISOString().split('T')[0], tipo_documento: 'PIX', valor: '', forma_pagamento: 'PIX', banco_operador: 'Bradesco', tipo_operacao: 'Entrada +', descricao: '' })} 
            className="px-5 py-2.5 border rounded-lg text-gray-600 font-semibold hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={loading} 
            className="bg-primary hover:bg-blue-900 text-white font-bold py-2.5 px-8 rounded-lg shadow-md"
          >
            {loading ? "Salvando..." : "Salvar Lançamento"}
          </button>
        </div>
      </form>
    </div>
  );
}