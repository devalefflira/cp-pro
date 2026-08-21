import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { PlusCircle, Layers, CheckCircle, Trash2 } from 'lucide-react';

export default function NovoLancamentoTab() {
  const [modo, setModo] = useState('individual'); // 'individual' ou 'lote'
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [responsavelNome, setResponsavelNome] = useState('');
  const [dataHoraAtual, setDataHoraAtual] = useState('');

  // Formulário Individual
  const [formIndividual, setFormIndividual] = useState({
    data_operacao: new Date().toISOString().split('T')[0],
    tipo_documento: 'PIX',
    valor: '',
    forma_pagamento: 'PIX',
    banco_operador: 'Bradesco',
    tipo_operacao: 'Entrada +',
    descricao: ''
  });

  // Formulário em Lote
  const [formLote, setFormLote] = useState({
    quantidade: 5,
    data_operacao: new Date().toISOString().split('T')[0],
    tipo_documento: 'PIX',
    forma_pagamento: 'PIX',
    banco_operador: 'Bradesco',
    tipo_operacao: 'Entrada +',
    descricaoPadrao: ''
  });

  // Array dinâmico de valores para os lançamentos em lote
  const [valoresLote, setValoresLote] = useState(Array(5).fill(''));

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
      setResponsavelNome(profile?.nome || session.user.email);
    }
  };

  const atualizarRelogio = () => {
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR');
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setDataHoraAtual(`${dataFormatada}, ${horaFormatada}`);
  };

  // Máscara monetária pt-BR (ex: 1.550,50)
  const aplicarMascaraMoeda = (valorRaw) => {
    let raw = String(valorRaw).replace(/\D/g, '');
    if (!raw) return '';
    return (Number(raw) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const parseValorParaFloat = (valStr) => {
    if (!valStr) return 0;
    const limpo = valStr.toString().replace(/\./g, '').replace(',', '.');
    return parseFloat(limpo) || 0;
  };

  // Atualiza a quantidade e redimensiona a lista de valores
  const handleQuantidadeChange = (novaQtd) => {
    const qtd = Math.max(1, Math.min(100, parseInt(novaQtd) || 1));
    setFormLote(prev => ({ ...prev, quantidade: qtd }));
    setValoresLote(prev => {
      const novoArray = Array(qtd).fill('');
      for (let i = 0; i < Math.min(prev.length, qtd); i++) {
        novoArray[i] = prev[i];
      }
      return novoArray;
    });
  };

  const handleValorLoteChange = (index, value) => {
    const formatado = aplicarMascaraMoeda(value);
    setValoresLote(prev => {
      const copy = [...prev];
      copy[index] = formatado;
      return copy;
    });
  };

  // Submit Individual
  const handleSubmitIndividual = async (e) => {
    e.preventDefault();
    const valorFloat = parseValorParaFloat(formIndividual.valor);

    if (valorFloat <= 0) {
      return alert("Informe um valor válido maior que zero.");
    }

    setLoading(true);

    const payload = {
      responsavel: responsavelNome || 'Sistema',
      data_lancamento: dataHoraAtual,
      data_operacao: formIndividual.data_operacao,
      tipo_documento: formIndividual.tipo_documento,
      valor: valorFloat,
      forma_pagamento: formIndividual.forma_pagamento,
      banco_operador: formIndividual.banco_operador,
      tipo_operacao: formIndividual.tipo_operacao,
      descricao: formIndividual.descricao
    };

    const { error } = await supabase.from('movimento_caixa').insert([payload]);

    setLoading(false);
    if (error) {
      alert("Erro ao salvar lançamento: " + error.message);
    } else {
      setSucesso(true);
      setMensagemSucesso("Lançamento individual salvo com sucesso!");
      setFormIndividual({
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

  // Submit em Lote
  const handleSubmitLote = async (e) => {
    e.preventDefault();

    const valoresValidos = valoresLote
      .map(v => parseValorParaFloat(v))
      .filter(v => v > 0);

    if (valoresValidos.length === 0) {
      return alert("Preencha ao menos um valor válido para salvar os lançamentos em lote.");
    }

    setLoading(true);

    const payloadLote = valoresValidos.map((val, idx) => ({
      responsavel: responsavelNome || 'Sistema',
      data_lancamento: dataHoraAtual,
      data_operacao: formLote.data_operacao,
      tipo_documento: formLote.tipo_documento,
      valor: val,
      forma_pagamento: formLote.forma_pagamento,
      banco_operador: formLote.banco_operador,
      tipo_operacao: formLote.tipo_operacao,
      descricao: formLote.descricaoPadrao 
        ? `${formLote.descricaoPadrao} (Item ${idx + 1}/${valoresValidos.length})`
        : `Lançamento em Lote (${idx + 1}/${valoresValidos.length})`
    }));

    const { error } = await supabase.from('movimento_caixa').insert(payloadLote);

    setLoading(false);
    if (error) {
      alert("Erro ao salvar lançamentos em lote: " + error.message);
    } else {
      setSucesso(true);
      setMensagemSucesso(`${payloadLote.length} lançamentos em lote salvos com sucesso!`);
      setValoresLote(Array(formLote.quantidade).fill(''));
      setTimeout(() => setSucesso(false), 4000);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl border shadow-sm max-w-4xl mx-auto space-y-6">
      
      {/* SELETOR DE MODO (INDIVIDUAL VS LOTE) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            {modo === 'individual' ? <PlusCircle className="text-primary" /> : <Layers className="text-indigo-600" />}
            {modo === 'individual' ? 'Novo Lançamento no Caixa Geral' : 'Lançamento em Lote no Caixa Geral'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {modo === 'individual' ? 'Cadastre uma operação unitária.' : 'Replique os critérios da operação e preencha múltiplos valores.'}
          </p>
        </div>

        <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setModo('individual')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              modo === 'individual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <PlusCircle size={15} /> Individual
          </button>
          <button
            type="button"
            onClick={() => setModo('lote')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              modo === 'lote' ? 'bg-[#0f172a] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layers size={15} /> Lançar em Lote
          </button>
        </div>
      </div>

      {sucesso && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
          <CheckCircle size={18} className="text-emerald-600" /> {mensagemSucesso}
        </div>
      )}

      {/* --- FORMULÁRIO INDIVIDUAL --- */}
      {modo === 'individual' && (
        <form onSubmit={handleSubmitIndividual} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Responsável</label>
              <input type="text" disabled value={responsavelNome} className="w-full p-2.5 border rounded-lg bg-gray-100 font-bold text-gray-800" />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Data/Hora Lançamento</label>
              <input type="text" disabled value={dataHoraAtual} className="w-full p-2.5 border rounded-lg bg-gray-100 font-semibold text-gray-600" />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Data Operação *</label>
              <input type="date" required value={formIndividual.data_operacao} onChange={e => setFormIndividual({ ...formIndividual, data_operacao: e.target.value })} className="w-full p-2.5 border rounded-lg bg-gray-50 font-semibold" />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Tipo Documento *</label>
              <select value={formIndividual.tipo_documento} onChange={e => setFormIndividual({ ...formIndividual, tipo_documento: e.target.value })} className="w-full p-2.5 border rounded-lg bg-white font-semibold">
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
                value={formIndividual.valor} 
                onChange={e => setFormIndividual({ ...formIndividual, valor: aplicarMascaraMoeda(e.target.value) })} 
                className="w-full p-2.5 border rounded-lg bg-gray-50 font-extrabold text-gray-900 text-sm" 
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Forma de Pagamento *</label>
              <select value={formIndividual.forma_pagamento} onChange={e => setFormIndividual({ ...formIndividual, forma_pagamento: e.target.value })} className="w-full p-2.5 border rounded-lg bg-white font-semibold">
                <option value="Dinheiro">Dinheiro</option>
                <option value="PIX">PIX</option>
                <option value="Cartão">Cartão</option>
                <option value="Depósito">Depósito</option>
                <option value="TED">TED</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Banco / Operador *</label>
              <select value={formIndividual.banco_operador} onChange={e => setFormIndividual({ ...formIndividual, banco_operador: e.target.value })} className="w-full p-2.5 border rounded-lg bg-white font-semibold">
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
              <select value={formIndividual.tipo_operacao} onChange={e => setFormIndividual({ ...formIndividual, tipo_operacao: e.target.value })} className="w-full p-2.5 border rounded-lg bg-white font-extrabold">
                <option value="Entrada +" className="text-emerald-600">Entrada (+)</option>
                <option value="Saída -" className="text-red-600">Saída (-)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-gray-700 mb-1">Descrição</label>
              <textarea rows="3" placeholder="Detalhes do lançamento..." value={formIndividual.descricao} onChange={e => setFormIndividual({ ...formIndividual, descricao: e.target.value })} className="w-full p-2.5 border rounded-lg bg-gray-50"></textarea>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setFormIndividual({ data_operacao: new Date().toISOString().split('T')[0], tipo_documento: 'PIX', valor: '', forma_pagamento: 'PIX', banco_operador: 'Bradesco', tipo_operacao: 'Entrada +', descricao: '' })} className="px-5 py-2.5 border rounded-lg text-gray-600 font-semibold hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={loading} className="bg-primary hover:bg-blue-900 text-white font-bold py-2.5 px-8 rounded-lg shadow-md">{loading ? "Salvando..." : "Salvar Lançamento"}</button>
          </div>
        </form>
      )}

      {/* --- FORMULÁRIO EM LOTE --- */}
      {modo === 'lote' && (
        <form onSubmit={handleSubmitLote} className="space-y-6 text-xs">
          
          {/* CRITÉRIOS PADRÃO COMPARTILHADOS */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <Layers size={16} className="text-indigo-600" /> Critérios Comuns para o Lote
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Quantidade de Lançamentos *</label>
                <input 
                  type="number" 
                  min="1" 
                  max="100" 
                  required 
                  value={formLote.quantidade} 
                  onChange={e => handleQuantidadeChange(e.target.value)} 
                  className="w-full p-2.5 border rounded-lg bg-white font-black text-indigo-900 text-sm focus:ring-2 focus:ring-indigo-500" 
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Data Operação *</label>
                <input type="date" required value={formLote.data_operacao} onChange={e => setFormLote({ ...formLote, data_operacao: e.target.value })} className="w-full p-2.5 border rounded-lg bg-white font-semibold" />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Tipo Documento *</label>
                <select value={formLote.tipo_documento} onChange={e => setFormLote({ ...formLote, tipo_documento: e.target.value })} className="w-full p-2.5 border rounded-lg bg-white font-semibold">
                  <option value="PIX">PIX</option>
                  <option value="Cartão">Cartão</option>
                  <option value="Vale">Vale</option>
                  <option value="Despesa">Despesa</option>
                  <option value="Devolução">Devolução</option>
                  <option value="Fatura AtualCard">Fatura AtualCard</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Forma de Pagamento *</label>
                <select value={formLote.forma_pagamento} onChange={e => setFormLote({ ...formLote, forma_pagamento: e.target.value })} className="w-full p-2.5 border rounded-lg bg-white font-semibold">
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="Cartão">Cartão</option>
                  <option value="Depósito">Depósito</option>
                  <option value="TED">TED</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Banco / Operador *</label>
                <select value={formLote.banco_operador} onChange={e => setFormLote({ ...formLote, banco_operador: e.target.value })} className="w-full p-2.5 border rounded-lg bg-white font-semibold">
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
                <select value={formLote.tipo_operacao} onChange={e => setFormLote({ ...formLote, tipo_operacao: e.target.value })} className="w-full p-2.5 border rounded-lg bg-white font-extrabold">
                  <option value="Entrada +" className="text-emerald-600">Entrada (+)</option>
                  <option value="Saída -" className="text-red-600">Saída (-)</option>
                </select>
              </div>

              <div className="sm:col-span-2 md:col-span-3">
                <label className="block font-bold text-gray-700 mb-1">Descrição Base (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ex: Recebimento de vendas da manhã..." 
                  value={formLote.descricaoPadrao} 
                  onChange={e => setFormLote({ ...formLote, descricaoPadrao: e.target.value })} 
                  className="w-full p-2.5 border rounded-lg bg-white" 
                />
              </div>
            </div>
          </div>

          {/* CAMPOS DINÂMICOS APENAS DE VALORES */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="font-extrabold text-gray-800 text-xs uppercase tracking-wide">
                Informe os {valoresLote.length} Valores do Lote:
              </label>
              <span className="text-[11px] text-gray-500 font-medium">
                Total do Lote: <strong className="text-emerald-700 font-black">
                  R$ {valoresLote.reduce((acc, v) => acc + parseValorParaFloat(v), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-80 overflow-y-auto p-1">
              {valoresLote.map((val, idx) => (
                <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 font-bold flex items-center justify-center text-xs shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase">Valor R$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0,00"
                      value={val}
                      onChange={e => handleValorLoteChange(idx, e.target.value)}
                      className="w-full p-1.5 border-b border-gray-300 font-black text-gray-900 text-xs focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button 
              type="button" 
              onClick={() => setValoresLote(Array(formLote.quantidade).fill(''))} 
              className="px-5 py-2.5 border rounded-lg text-gray-600 font-semibold hover:bg-gray-50"
            >
              Limpar Valores
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="bg-[#0f172a] hover:bg-slate-800 text-white font-bold py-2.5 px-8 rounded-lg shadow-md flex items-center gap-2"
            >
              <Layers size={16} /> {loading ? "Gravando..." : `Salvar ${valoresLote.filter(v => parseValorParaFloat(v) > 0).length} Lançamentos`}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}