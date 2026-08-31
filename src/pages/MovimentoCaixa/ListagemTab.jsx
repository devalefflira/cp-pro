import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { PlusCircle, Layers, CheckCircle, Trash2, Plus, ArrowDown } from 'lucide-react';

export default function NovoLancamentoTab() {
  const [modo, setModo] = useState('individual');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [responsavelNome, setResponsavelNome] = useState('');
  const [dataHoraAtual, setDataHoraAtual] = useState('');

  // Formulário Individual
  const [formIndividual, setFormIndividual] = useState({
    data_operacao: '',
    tipo_documento: 'PIX',
    valor: '',
    forma_pagamento: 'PIX',
    banco_operador: 'Bradesco',
    tipo_operacao: 'Entrada +',
    descricao: ''
  });

  // Formulário em Lote
  const [formLote, setFormLote] = useState({
    data_operacao: '',
    tipo_documento: 'PIX',
    forma_pagamento: 'PIX',
    banco_operador: 'Bradesco',
    tipo_operacao: 'Entrada +',
    descricaoPadrao: ''
  });

  const [valorInputLote, setValorInputLote] = useState('');
  const [listaPreviaLote, setListaPreviaLote] = useState([]);
  const inputValorLoteRef = useRef(null);

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

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatarData = (d) => d ? d.split('-').reverse().join('/') : '';

  const handleAdicionarValorLote = (e) => {
    if (e) e.preventDefault();
    if (!formLote.data_operacao) {
      return alert("Por favor, preencha o campo Data Operação antes de adicionar os valores.");
    }

    const valorFloat = parseValorParaFloat(valorInputLote);
    if (valorFloat <= 0) return;

    setListaPreviaLote(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        valor: valorFloat,
        data_operacao: formLote.data_operacao,
        tipo_documento: formLote.tipo_documento,
        forma_pagamento: formLote.forma_pagamento,
        banco_operador: formLote.banco_operador,
        tipo_operacao: formLote.tipo_operacao,
        descricao: formLote.descricaoPadrao
      }
    ]);

    setValorInputLote('');
    if (inputValorLoteRef.current) {
      inputValorLoteRef.current.focus();
    }
  };

  const handleRemoverItemPrevia = (id) => {
    setListaPreviaLote(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmitIndividual = async (e) => {
    e.preventDefault();
    if (!formIndividual.data_operacao) {
      return alert("Informe a Data da Operação.");
    }
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
        data_operacao: '',
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

  const handleSubmitLote = async () => {
    if (listaPreviaLote.length === 0) {
      return alert("Adicione ao menos um valor à lista prévia antes de salvar.");
    }

    setLoading(true);

    const payloadLote = listaPreviaLote.map((item, idx) => ({
      responsavel: responsavelNome || 'Sistema',
      data_lancamento: dataHoraAtual,
      data_operacao: item.data_operacao,
      tipo_documento: item.tipo_documento,
      valor: item.valor,
      forma_pagamento: item.forma_pagamento,
      banco_operador: item.banco_operador,
      tipo_operacao: item.tipo_operacao,
      descricao: item.descricao 
        ? `${item.descricao} (Item ${idx + 1}/${listaPreviaLote.length})` 
        : `Lançamento em Lote (${idx + 1}/${listaPreviaLote.length})`
    }));

    const { error } = await supabase.from('movimento_caixa').insert(payloadLote);

    setLoading(false);
    if (error) {
      alert("Erro ao salvar lote: " + error.message);
    } else {
      setSucesso(true);
      setMensagemSucesso(`${payloadLote.length} lançamentos em lote gravados com sucesso!`);
      setListaPreviaLote([]);
      setValorInputLote('');
      setTimeout(() => setSucesso(false), 4000);
    }
  };

  const totalAcumuladoLote = listaPreviaLote.reduce((acc, curr) => acc + curr.valor, 0);

  return (
    <div className="bg-white p-8 rounded-xl border shadow-sm max-w-5xl mx-auto space-y-6">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            {modo === 'individual' ? <PlusCircle className="text-primary" /> : <Layers className="text-indigo-600" />}
            {modo === 'individual' ? 'Novo Lançamento no Caixa Geral' : 'Lançamento em Lote com Entrada Contínua'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {modo === 'individual' ? 'Cadastre uma operação unitária.' : 'Defina os critérios gerais, digite os valores dando Enter e revise na lista antes de salvar.'}
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
            onClick={() => { setModo('lote'); setTimeout(() => inputValorLoteRef.current?.focus(), 100); }}
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
              <input 
                type="date" 
                required 
                value={formIndividual.data_operacao} 
                onChange={e => setFormIndividual({ ...formIndividual, data_operacao: e.target.value })} 
                className="w-full p-2.5 border rounded-lg bg-gray-50 font-semibold" 
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Tipo Documento *</label>
              <select value={formIndividual.tipo_documento} onChange={e => setFormIndividual({ ...formIndividual, tipo_documento: e.target.value })} className="w-full p-2.5 border rounded-lg bg-white font-semibold">
                <option value="PIX">PIX</option>
                <option value="Cartão">Cartão</option>
                <option value="Cheque">Cheque</option>
                <option value="Vale">Vale</option>
                <option value="Despesa">Despesa</option>
                <option value="Devolução">Devolução</option>
                <option value="Fatura AtualCard">Fatura AtualCard</option>
                <option value="Sangria">Sangria</option>
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
                <option value="Cheque">Cheque</option>
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
                <option value="Tesouraria">Tesouraria</option>
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
            <button type="button" onClick={() => setFormIndividual({ data_operacao: '', tipo_documento: 'PIX', valor: '', forma_pagamento: 'PIX', banco_operador: 'Bradesco', tipo_operacao: 'Entrada +', descricao: '' })} className="px-5 py-2.5 border rounded-lg text-gray-600 font-semibold hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={loading} className="bg-primary hover:bg-blue-900 text-white font-bold py-2.5 px-8 rounded-lg shadow-md">{loading ? "Salvando..." : "Salvar Lançamento"}</button>
          </div>
        </form>
      )}

      {/* --- FORMULÁRIO EM LOTE --- */}
      {modo === 'lote' && (
        <div className="space-y-6 text-xs">
          
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <Layers size={16} className="text-indigo-600" /> Critérios Comuns para o Lote
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Data Operação *</label>
                <input 
                  type="date" 
                  required 
                  value={formLote.data_operacao} 
                  onChange={e => setFormLote({ ...formLote, data_operacao: e.target.value })} 
                  className="w-full p-2.5 border rounded-lg bg-white font-semibold" 
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Tipo Documento *</label>
                <select value={formLote.tipo_documento} onChange={e => setFormLote({ ...formLote, tipo_documento: e.target.value })} className="w-full p-2.5 border rounded-lg bg-white font-semibold">
                  <option value="PIX">PIX</option>
                  <option value="Cartão">Cartão</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Vale">Vale</option>
                  <option value="Despesa">Despesa</option>
                  <option value="Devolução">Devolução</option>
                  <option value="Fatura AtualCard">Fatura AtualCard</option>
                  <option value="Sangria">Sangria</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Forma de Pagamento *</label>
                <select value={formLote.forma_pagamento} onChange={e => setFormLote({ ...formLote, forma_pagamento: e.target.value })} className="w-full p-2.5 border rounded-lg bg-white font-semibold">
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="Cartão">Cartão</option>
                  <option value="Cheque">Cheque</option>
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
                  <option value="Tesouraria">Tesouraria</option>
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

              <div>
                <label className="block font-bold text-gray-700 mb-1">Descrição Base (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ex: Vendas de balcão..." 
                  value={formLote.descricaoPadrao} 
                  onChange={e => setFormLote({ ...formLote, descricaoPadrao: e.target.value })} 
                  className="w-full p-2.5 border rounded-lg bg-white" 
                />
              </div>
            </div>
          </div>

          {/* CAMPO DE ENTRADA CONTÍNUA COM ENTER */}
          <form onSubmit={handleAdicionarValorLote} className="bg-indigo-50/70 p-5 rounded-xl border border-indigo-100 flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 w-full">
              <label className="block font-bold text-indigo-950 mb-1 text-xs">
                Digite o Valor (R$) e pressione <span className="bg-indigo-200 px-1.5 py-0.5 rounded font-black text-indigo-900">ENTER ↵</span> para adicionar:
              </label>
              <input
                ref={inputValorLoteRef}
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                value={valorInputLote}
                onChange={e => setValorInputLote(aplicarMascaraMoeda(e.target.value))}
                className="w-full p-3 border-2 border-indigo-300 focus:border-indigo-600 rounded-lg bg-white font-black text-gray-900 text-base outline-none shadow-sm"
              />
            </div>

            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow flex items-center justify-center gap-2 text-xs w-full sm:w-auto h-[46px]"
            >
              <Plus size={16} /> Adicionar Valor
            </button>
          </form>

          {/* TABELA DE PRÉVIA */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-extrabold text-gray-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <ArrowDown size={14} className="text-indigo-600" /> Lista Prévia para Conferência ({listaPreviaLote.length} {listaPreviaLote.length === 1 ? 'item' : 'itens'})
              </h4>
              <span className="text-xs text-gray-600 font-medium">
                Total Acumulado: <strong className="text-emerald-700 font-black text-sm">{formatarMoeda(totalAcumuladoLote)}</strong>
              </span>
            </div>

            {listaPreviaLote.length === 0 ? (
              <div className="text-center py-10 border border-dashed rounded-xl text-gray-400 bg-gray-50/50">
                Nenhum valor adicionado à lista ainda. Digite um valor acima e pressione <strong>Enter</strong>.
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-xl shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 border-b text-gray-600 font-bold uppercase text-[10px]">
                      <th className="p-2.5 text-center w-12">#</th>
                      <th className="p-2.5">Data Op.</th>
                      <th className="p-2.5">Tipo Doc.</th>
                      <th className="p-2.5">Forma Pgto</th>
                      <th className="p-2.5">Banco / Operador</th>
                      <th className="p-2.5 text-center">Operação</th>
                      <th className="p-2.5 text-right">Valor</th>
                      <th className="p-2.5 text-center w-16">Remover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {listaPreviaLote.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="p-2.5 text-center font-bold text-gray-400">{idx + 1}</td>
                        <td className="p-2.5 font-semibold text-gray-700">{formatarData(item.data_operacao)}</td>
                        <td className="p-2.5 font-bold text-gray-800">{item.tipo_documento}</td>
                        <td className="p-2.5 text-gray-600">{item.forma_pagamento}</td>
                        <td className="p-2.5 font-semibold text-indigo-900">{item.banco_operador}</td>
                        <td className="p-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.tipo_operacao.includes('Entrada') ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                            {item.tipo_operacao}
                          </span>
                        </td>
                        <td className={`p-2.5 text-right font-black text-sm ${item.tipo_operacao.includes('Entrada') ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatarMoeda(item.valor)}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoverItemPrevia(item.id)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Remover este item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <button 
              type="button" 
              onClick={() => setListaPreviaLote([])} 
              disabled={listaPreviaLote.length === 0}
              className="px-5 py-2.5 border rounded-lg text-gray-600 font-semibold hover:bg-gray-50 disabled:opacity-30"
            >
              Limpar Lista Prévia
            </button>

            <button 
              type="button" 
              onClick={handleSubmitLote}
              disabled={loading || listaPreviaLote.length === 0} 
              className="bg-[#0f172a] hover:bg-slate-800 text-white font-bold py-2.5 px-8 rounded-lg shadow-md flex items-center gap-2 disabled:opacity-40"
            >
              <Layers size={16} /> {loading ? "Gravando..." : `Confirmar e Salvar ${listaPreviaLote.length} Lançamentos`}
            </button>
          </div>

        </div>
      )}

    </div>
  );
}