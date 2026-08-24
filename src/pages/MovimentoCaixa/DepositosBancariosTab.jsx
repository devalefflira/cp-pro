import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { 
  Landmark, PlusCircle, History, Scale, CheckCircle, 
  Trash2, Edit, X, Check, ArrowUpRight, ArrowDownRight, Wallet, Hash, Clock, Calendar
} from 'lucide-react';

export default function DepositosBancariosTab() {
  const [subAba, setSubAba] = useState('depositos'); // 'diferencas', 'tesouraria', 'depositos', 'novo'
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [responsavelNome, setResponsavelNome] = useState('');

  const [sangriasTesouraria, setSangriasTesouraria] = useState([]);
  const [depositos, setDepositos] = useState([]);

  // Estado dos 5 blocos do ID da Operação (Inclusão)
  const [idOperacaoBlocks, setIdOperacaoBlocks] = useState(['', '', '', '', '']);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];

  // Formulário de Inclusão de Depósito
  const [formDeposito, setFormDeposito] = useState({
    data_deposito: new Date().toISOString().split('T')[0],
    data_operacao: '',
    hora_operacao: '',
    numero_operacao: '',
    banco: '4437 Sicoob',
    conta: '42307',
    cliente: 'J C MACHADO DIAS LTDA',
    nome_depositante: '',
    cpf_depositante: '',
    valor_depositado: ''
  });

  // Estado para o Modal de Edição
  const [itemEdicao, setItemEdicao] = useState(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [idOperacaoEditBlocks, setIdOperacaoEditBlocks] = useState(['', '', '', '', '']);
  const editInputRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];
  const [formEdicao, setFormEdicao] = useState({
    data_deposito: '',
    data_operacao: '',
    hora_operacao: '',
    numero_operacao: '',
    banco: '',
    conta: '',
    cliente: '',
    nome_depositante: '',
    cpf_depositante: '',
    valor_depositado: ''
  });

  useEffect(() => {
    carregarUsuario();
    carregarDados();
  }, []);

  const carregarUsuario = async () => {
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

  const carregarDados = async () => {
    setLoading(true);

    const { data: sangrias } = await supabase
      .from('movimento_caixa')
      .select('*')
      .eq('tipo_documento', 'Sangria')
      .eq('forma_pagamento', 'Dinheiro')
      .eq('banco_operador', 'Tesouraria')
      .eq('tipo_operacao', 'Saída -')
      .order('data_operacao', { ascending: false });

    const { data: deps } = await supabase
      .from('depositos_bancarios')
      .select('*')
      .order('data_deposito', { ascending: false });

    setSangriasTesouraria(sangrias || []);
    setDepositos(deps || []);
    setLoading(false);
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

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const formatarData = (d) => d ? d.split('-').reverse().join('/') : '';

  // Limites dos blocos do ID da Operação: 8-4-4-4-12
  const blockLengths = [8, 4, 4, 4, 12];

  // Controle de digitação dos blocos (Inclusão)
  const handleBlockChange = (index, value) => {
    const cleanVal = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const maxLen = blockLengths[index];
    const truncated = cleanVal.slice(0, maxLen);

    const newBlocks = [...idOperacaoBlocks];
    newBlocks[index] = truncated;
    setIdOperacaoBlocks(newBlocks);

    // Auto-focus no próximo bloco ao preencher o tamanho total
    if (truncated.length === maxLen && index < 4) {
      inputRefs[index + 1].current?.focus();
    }
  };

  // Controle de digitação dos blocos (Edição)
  const handleEditBlockChange = (index, value) => {
    const cleanVal = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const maxLen = blockLengths[index];
    const truncated = cleanVal.slice(0, maxLen);

    const newBlocks = [...idOperacaoEditBlocks];
    newBlocks[index] = truncated;
    setIdOperacaoEditBlocks(newBlocks);

    if (truncated.length === maxLen && index < 4) {
      editInputRefs[index + 1].current?.focus();
    }
  };

  // Validação do ID da Operação
  const validarIdOperacao = (blocks) => {
    const todosVazios = blocks.every(b => b.trim() === '');
    if (todosVazios) return { valido: true, idFormatado: null };

    for (let i = 0; i < 5; i++) {
      if (blocks[i].length < blockLengths[i]) {
        return {
          valido: false,
          erro: `O campo ${i + 1} do ID da Operação deve ter exatamente ${blockLengths[i]} caracteres (atual: ${blocks[i].length}).`
        };
      }
    }
    return { valido: true, idFormatado: blocks.join('-') };
  };

  // Totais
  const totalSangriasTesouraria = sangriasTesouraria.reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
  const totalDepositado = depositos.reduce((acc, curr) => acc + Number(curr.valor_depositado || 0), 0);
  const diferencaSaldo = totalSangriasTesouraria - totalDepositado;

  // Salvar Novo Depósito
  const handleSalvarDeposito = async (e) => {
    e.preventDefault();
    const valorFloat = parseValorParaFloat(formDeposito.valor_depositado);

    if (valorFloat <= 0) {
      return alert("Informe um valor de depósito válido.");
    }

    const { valido, erro, idFormatado } = validarIdOperacao(idOperacaoBlocks);
    if (!valido) {
      return alert(erro);
    }

    setLoading(true);

    const payload = {
      data_deposito: formDeposito.data_deposito,
      data_operacao: formDeposito.data_operacao || null,
      hora_operacao: formDeposito.hora_operacao || null,
      numero_operacao: formDeposito.numero_operacao || null,
      id_operacao: idFormatado,
      banco: formDeposito.banco,
      conta: formDeposito.conta,
      cliente: formDeposito.cliente,
      nome_depositante: formDeposito.nome_depositante || null,
      cpf_depositante: formDeposito.cpf_depositante || null,
      valor_depositado: valorFloat,
      responsavel: responsavelNome || 'Sistema'
    };

    const { error } = await supabase.from('depositos_bancarios').insert([payload]);

    setLoading(false);
    if (error) {
      alert("Erro ao gravar depósito: " + error.message);
    } else {
      setSucesso(true);
      setMensagemSucesso("Depósito bancário gravado com sucesso!");
      setFormDeposito({
        data_deposito: new Date().toISOString().split('T')[0],
        data_operacao: '',
        hora_operacao: '',
        numero_operacao: '',
        banco: '4437 Sicoob',
        conta: '42307',
        cliente: 'J C MACHADO DIAS LTDA',
        nome_depositante: '',
        cpf_depositante: '',
        valor_depositado: ''
      });
      setIdOperacaoBlocks(['', '', '', '', '']);
      carregarDados();
      setTimeout(() => setSucesso(false), 4000);
    }
  };

  // Abrir Modal de Edição
  const handleAbrirEdicao = (dep) => {
    setItemEdicao(dep);
    
    // Divide o id_operacao em 5 blocos se existir
    let blocks = ['', '', '', '', ''];
    if (dep.id_operacao) {
      const split = dep.id_operacao.split('-');
      if (split.length === 5) {
        blocks = split;
      }
    }
    setIdOperacaoEditBlocks(blocks);

    setFormEdicao({
      data_deposito: dep.data_deposito || '',
      data_operacao: dep.data_operacao || '',
      hora_operacao: dep.hora_operacao || '',
      numero_operacao: dep.numero_operacao || '',
      banco: dep.banco || '',
      conta: dep.conta || '',
      cliente: dep.cliente || '',
      nome_depositante: dep.nome_depositante || '',
      cpf_depositante: dep.cpf_depositante || '',
      valor_depositado: (Number(dep.valor_depositado) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    });
  };

  // Salvar Edição do Depósito
  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
    const valorFloat = parseValorParaFloat(formEdicao.valor_depositado);

    if (valorFloat <= 0) {
      return alert("Informe um valor de depósito válido.");
    }

    const { valido, erro, idFormatado } = validarIdOperacao(idOperacaoEditBlocks);
    if (!valido) {
      return alert(erro);
    }

    setSalvandoEdicao(true);

    const { error } = await supabase
      .from('depositos_bancarios')
      .update({
        data_deposito: formEdicao.data_deposito,
        data_operacao: formEdicao.data_operacao || null,
        hora_operacao: formEdicao.hora_operacao || null,
        numero_operacao: formEdicao.numero_operacao || null,
        id_operacao: idFormatado,
        banco: formEdicao.banco,
        conta: formEdicao.conta,
        cliente: formEdicao.cliente,
        nome_depositante: formEdicao.nome_depositante || null,
        cpf_depositante: formEdicao.cpf_depositante || null,
        valor_depositado: valorFloat
      })
      .eq('id', itemEdicao.id);

    setSalvandoEdicao(false);

    if (error) {
      alert("Erro ao atualizar depósito: " + error.message);
    } else {
      setItemEdicao(null);
      carregarDados();
    }
  };

  const handleExcluirDeposito = async (id) => {
    if (!confirm("Deseja realmente excluir este registro de depósito?")) return;
    await supabase.from('depositos_bancarios').delete().eq('id', id);
    carregarDados();
  };

  return (
    <div className="space-y-6">

      {/* CARDS RESUMO DO FLUXO DE TESOURARIA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">ENTRADAS NA TESOURARIA (SANGRIAS)</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{formatarMoeda(totalSangriasTesouraria)}</p>
            <span className="text-[11px] text-gray-400">{sangriasTesouraria.length} sangrias em dinheiro</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Wallet size={24} /></div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">TOTAL DEPOSITADO NO BANCO</p>
            <p className="text-2xl font-black text-indigo-900 mt-1">{formatarMoeda(totalDepositado)}</p>
            <span className="text-[11px] text-gray-400">{depositos.length} depósitos registrados</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Landmark size={24} /></div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">SALDO PENDENTE NA TESOURARIA</p>
            <p className={`text-2xl font-black mt-1 ${diferencaSaldo >= 0 ? 'text-blue-900' : 'text-red-600'}`}>
              {formatarMoeda(diferencaSaldo)}
            </p>
            <span className="text-[11px] text-gray-400 font-medium">Disponível para novos depósitos</span>
          </div>
          <div className={`p-3 rounded-xl ${diferencaSaldo >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
            <Scale size={24} />
          </div>
        </div>
      </div>

      {/* NAVEGAÇÃO DE SUB-ABAS */}
      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-wrap gap-2 justify-between items-center">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSubAba('diferencas')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              subAba === 'diferencas' ? 'bg-[#0f172a] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Scale size={15} /> Conferência & Diferenças
          </button>
          
          <button
            onClick={() => setSubAba('tesouraria')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              subAba === 'tesouraria' ? 'bg-[#0f172a] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Wallet size={15} /> Lançamentos em Tesouraria ({sangriasTesouraria.length})
          </button>

          <button
            onClick={() => setSubAba('depositos')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              subAba === 'depositos' ? 'bg-[#0f172a] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <History size={15} /> Depósitos Bancários ({depositos.length})
          </button>
        </div>

        <button
          onClick={() => setSubAba('novo')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
            subAba === 'novo' ? 'bg-emerald-700 text-white shadow-sm' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          <PlusCircle size={15} /> Incluir Depósito Bancário
        </button>
      </div>

      {/* 1. FORMULÁRIO DE INCLUSÃO DE DEPÓSITO BANCÁRIO */}
      {subAba === 'novo' && (
        <div className="bg-white p-6 rounded-xl border shadow-sm max-w-4xl mx-auto space-y-6">
          <div className="border-b pb-3">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <Landmark className="text-emerald-600" size={18} /> Novo Registro de Depósito Bancário
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Cadastre o comprovante do depósito com data, hora e códigos da operação bancária.</p>
          </div>

          {sucesso && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
              <CheckCircle size={18} className="text-emerald-600" /> {mensagemSucesso}
            </div>
          )}

          <form onSubmit={handleSalvarDeposito} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Data do Registro (Sistema) *</label>
                <input
                  type="date"
                  required
                  value={formDeposito.data_deposito}
                  onChange={e => setFormDeposito({ ...formDeposito, data_deposito: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <Calendar size={13} className="text-indigo-600" /> Data da Operação (Comprovante)
                </label>
                <input
                  type="date"
                  value={formDeposito.data_operacao}
                  onChange={e => setFormDeposito({ ...formDeposito, data_operacao: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-white font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <Clock size={13} className="text-indigo-600" /> Hora da Operação
                </label>
                <input
                  type="time"
                  value={formDeposito.hora_operacao}
                  onChange={e => setFormDeposito({ ...formDeposito, hora_operacao: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-white font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Valor Depositado (R$) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="0,00"
                  value={formDeposito.valor_depositado}
                  onChange={e => setFormDeposito({ ...formDeposito, valor_depositado: aplicarMascaraMoeda(e.target.value) })}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 font-black text-gray-900 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Banco Destino *</label>
                <input
                  type="text"
                  required
                  value={formDeposito.banco}
                  onChange={e => setFormDeposito({ ...formDeposito, banco: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-white font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Conta Destino *</label>
                <input
                  type="text"
                  required
                  value={formDeposito.conta}
                  onChange={e => setFormDeposito({ ...formDeposito, conta: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-white font-semibold"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block font-bold text-gray-700 mb-1">Cliente / Favorecido *</label>
                <input
                  type="text"
                  required
                  value={formDeposito.cliente}
                  onChange={e => setFormDeposito({ ...formDeposito, cliente: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-white font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nome do Depositante</label>
                <input
                  type="text"
                  placeholder="Nome de quem realizou o depósito..."
                  value={formDeposito.nome_depositante}
                  onChange={e => setFormDeposito({ ...formDeposito, nome_depositante: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">CPF do Depositante</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={formDeposito.cpf_depositante}
                  onChange={e => setFormDeposito({ ...formDeposito, cpf_depositante: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <Hash size={13} className="text-gray-500" /> Número de Operação
                </label>
                <input
                  type="text"
                  placeholder="Ex: 849204"
                  value={formDeposito.numero_operacao}
                  onChange={e => setFormDeposito({ ...formDeposito, numero_operacao: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-white font-semibold"
                />
              </div>

              {/* ID DA OPERAÇÃO COM 5 CAMPOS ESTILO SERIAL (8-4-4-4-12) */}
              <div className="md:col-span-3 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-800 text-xs uppercase tracking-wider">
                  ID da Operação (8 - 4 - 4 - 4 - 12 caracteres)
                </label>
                <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                  <input
                    ref={inputRefs[0]}
                    type="text"
                    maxLength={8}
                    placeholder="8 chars"
                    value={idOperacaoBlocks[0]}
                    onChange={e => handleBlockChange(0, e.target.value)}
                    className="w-full sm:w-28 p-2 text-center border-2 rounded-lg font-mono font-bold text-xs uppercase focus:border-indigo-600 bg-white"
                  />
                  <span className="font-bold text-gray-400">-</span>
                  <input
                    ref={inputRefs[1]}
                    type="text"
                    maxLength={4}
                    placeholder="4 chars"
                    value={idOperacaoBlocks[1]}
                    onChange={e => handleBlockChange(1, e.target.value)}
                    className="w-full sm:w-20 p-2 text-center border-2 rounded-lg font-mono font-bold text-xs uppercase focus:border-indigo-600 bg-white"
                  />
                  <span className="font-bold text-gray-400">-</span>
                  <input
                    ref={inputRefs[2]}
                    type="text"
                    maxLength={4}
                    placeholder="4 chars"
                    value={idOperacaoBlocks[2]}
                    onChange={e => handleBlockChange(2, e.target.value)}
                    className="w-full sm:w-20 p-2 text-center border-2 rounded-lg font-mono font-bold text-xs uppercase focus:border-indigo-600 bg-white"
                  />
                  <span className="font-bold text-gray-400">-</span>
                  <input
                    ref={inputRefs[3]}
                    type="text"
                    maxLength={4}
                    placeholder="4 chars"
                    value={idOperacaoBlocks[3]}
                    onChange={e => handleBlockChange(3, e.target.value)}
                    className="w-full sm:w-20 p-2 text-center border-2 rounded-lg font-mono font-bold text-xs uppercase focus:border-indigo-600 bg-white"
                  />
                  <span className="font-bold text-gray-400">-</span>
                  <input
                    ref={inputRefs[4]}
                    type="text"
                    maxLength={12}
                    placeholder="12 caracteres"
                    value={idOperacaoBlocks[4]}
                    onChange={e => handleBlockChange(4, e.target.value)}
                    className="w-full sm:flex-1 p-2 text-center border-2 rounded-lg font-mono font-bold text-xs uppercase focus:border-indigo-600 bg-white"
                  />
                </div>
                <span className="block text-[10px] text-gray-400">
                  Preencha todos os caracteres alfanuméricos de cada bloco. O cursor pulará automaticamente para o próximo campo.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setSubAba('depositos')}
                className="px-5 py-2.5 border rounded-lg text-gray-600 font-semibold hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-8 rounded-lg shadow-md"
              >
                {loading ? "Gravando..." : "Salvar Depósito"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. SUB-ABA: CONFERÊNCIA & DIFERENÇAS */}
      {subAba === 'diferencas' && (
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
          <div className="border-b pb-3 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Scale size={18} className="text-primary" /> Balanço de Sangrias e Depósitos
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Visão consolidada comparando a entrada de dinheiro físico da Tesouraria e os depósitos bancários.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ÚLTIMAS SANGRIAS DA TESOURARIA */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-xs uppercase text-emerald-800 flex items-center gap-1.5">
                  <ArrowDownRight size={16} /> Entradas da Tesouraria (Sangrias)
                </h4>
                <span className="text-xs font-black text-emerald-700">{formatarMoeda(totalSangriasTesouraria)}</span>
              </div>
              <div className="border rounded-xl max-h-80 overflow-y-auto divide-y divide-gray-100 text-xs">
                {sangriasTesouraria.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 italic">Nenhuma sangria em dinheiro registrada.</div>
                ) : (
                  sangriasTesouraria.map(s => (
                    <div key={s.id} className="p-3 hover:bg-gray-50 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-800">{formatarData(s.data_operacao)} &bull; {s.responsavel}</p>
                        <span className="text-[10px] text-gray-500">{s.descricao || 'Sangria em dinheiro para tesouraria'}</span>
                      </div>
                      <span className="font-black text-emerald-600">{formatarMoeda(s.valor)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ÚLTIMOS DEPÓSITOS BANCÁRIOS */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-xs uppercase text-indigo-900 flex items-center gap-1.5">
                  <ArrowUpRight size={16} /> Saídas para Banco (Depósitos)
                </h4>
                <span className="text-xs font-black text-indigo-900">{formatarMoeda(totalDepositado)}</span>
              </div>
              <div className="border rounded-xl max-h-80 overflow-y-auto divide-y divide-gray-100 text-xs">
                {depositos.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 italic">Nenhum depósito bancário registrado.</div>
                ) : (
                  depositos.map(d => (
                    <div key={d.id} className="p-3 hover:bg-gray-50 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-800">{formatarData(d.data_deposito)} &bull; {d.banco}</p>
                        <span className="text-[10px] text-gray-500">
                          {d.data_operacao ? `Op: ${formatarData(d.data_operacao)} ${d.hora_operacao || ''} • ` : ''}
                          Conta: {d.conta} &bull; {d.nome_depositante || 'Depositante não inf.'}
                        </span>
                      </div>
                      <span className="font-black text-indigo-900">{formatarMoeda(d.valor_depositado)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. SUB-ABA: LANÇAMENTOS EM TESOURARIA */}
      {subAba === 'tesouraria' && (
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <h3 className="font-bold text-gray-800 text-sm">Lançamentos de Sangria em Dinheiro (Tesouraria)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-500 uppercase font-bold">
                  <th className="p-3">Data Op.</th>
                  <th className="p-3">Responsável</th>
                  <th className="p-3">Data/Hora Reg.</th>
                  <th className="p-3">Tipo Doc.</th>
                  <th className="p-3">Forma Pgto</th>
                  <th className="p-3">Local</th>
                  <th className="p-3 text-right">Valor Sangria</th>
                  <th className="p-3">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sangriasTesouraria.length === 0 ? (
                  <tr><td colSpan="8" className="p-6 text-center text-gray-400 italic">Nenhum lançamento de sangria localizado.</td></tr>
                ) : (
                  sangriasTesouraria.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="p-3 font-semibold text-gray-700">{formatarData(s.data_operacao)}</td>
                      <td className="p-3 text-gray-600">{s.responsavel}</td>
                      <td className="p-3 text-gray-500">{s.data_lancamento}</td>
                      <td className="p-3 font-bold text-gray-800">{s.tipo_documento}</td>
                      <td className="p-3 text-gray-600">{s.forma_pagamento}</td>
                      <td className="p-3 font-semibold text-indigo-900">{s.banco_operador}</td>
                      <td className="p-3 text-right font-black text-emerald-600">{formatarMoeda(s.valor)}</td>
                      <td className="p-3 text-gray-600">{s.descricao || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. SUB-ABA: HISTÓRICO DE DEPÓSITOS BANCÁRIOS (COM BOTÃO DE EDITAR) */}
      {subAba === 'depositos' && (
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <h3 className="font-bold text-gray-800 text-sm">Histórico de Depósitos Bancários Realizados</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-500 uppercase font-bold">
                  <th className="p-3">Data Depósito</th>
                  <th className="p-3">Data/Hora Op.</th>
                  <th className="p-3">Nº / ID Op.</th>
                  <th className="p-3">Banco</th>
                  <th className="p-3">Conta</th>
                  <th className="p-3">Cliente / Favorecido</th>
                  <th className="p-3">Depositante</th>
                  <th className="p-3">CPF Depositante</th>
                  <th className="p-3 text-right">Valor Depositado</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {depositos.length === 0 ? (
                  <tr><td colSpan="10" className="p-6 text-center text-gray-400 italic">Nenhum depósito bancário registrado.</td></tr>
                ) : (
                  depositos.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="p-3 font-semibold text-gray-700 whitespace-nowrap">{formatarData(d.data_deposito)}</td>
                      <td className="p-3 text-gray-600 whitespace-nowrap">
                        {d.data_operacao ? `${formatarData(d.data_operacao)} ${d.hora_operacao || ''}` : '-'}
                      </td>
                      <td className="p-3 font-mono text-[10px] text-gray-700 max-w-[140px] truncate" title={d.id_operacao || d.numero_operacao}>
                        {d.numero_operacao ? `Nº ${d.numero_operacao}` : ''}
                        {d.id_operacao ? ` ${d.id_operacao}` : ''}
                        {!d.numero_operacao && !d.id_operacao ? '-' : ''}
                      </td>
                      <td className="p-3 font-bold text-gray-800 whitespace-nowrap">{d.banco}</td>
                      <td className="p-3 text-gray-600 whitespace-nowrap">{d.conta}</td>
                      <td className="p-3 font-semibold text-gray-700 max-w-[150px] truncate" title={d.cliente}>{d.cliente}</td>
                      <td className="p-3 text-gray-600">{d.nome_depositante || '-'}</td>
                      <td className="p-3 text-gray-500 whitespace-nowrap">{d.cpf_depositante || '-'}</td>
                      <td className="p-3 text-right font-black text-indigo-900 whitespace-nowrap">{formatarMoeda(d.valor_depositado)}</td>
                      <td className="p-3 text-center whitespace-nowrap space-x-1">
                        <button
                          onClick={() => handleAbrirEdicao(d)}
                          title="Editar depósito"
                          className="text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleExcluirDeposito(d.id)}
                          title="Excluir depósito"
                          className="text-red-600 hover:text-red-800 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE DEPÓSITO BANCÁRIO */}
      {itemEdicao && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl border">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Edit size={20} className="text-primary" /> Editar Registro de Depósito Bancário
              </h3>
              <button onClick={() => setItemEdicao(null)} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicao} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Data do Depósito (Sistema) *</label>
                  <input
                    type="date"
                    required
                    value={formEdicao.data_deposito}
                    onChange={e => setFormEdicao({ ...formEdicao, data_deposito: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-gray-50 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar size={13} className="text-indigo-600" /> Data da Operação
                  </label>
                  <input
                    type="date"
                    value={formEdicao.data_operacao}
                    onChange={e => setFormEdicao({ ...formEdicao, data_operacao: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Clock size={13} className="text-indigo-600" /> Hora da Operação
                  </label>
                  <input
                    type="time"
                    value={formEdicao.hora_operacao}
                    onChange={e => setFormEdicao({ ...formEdicao, hora_operacao: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Valor Depositado (R$) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={formEdicao.valor_depositado}
                    onChange={e => setFormEdicao({ ...formEdicao, valor_depositado: aplicarMascaraMoeda(e.target.value) })}
                    className="w-full p-2.5 border rounded-lg bg-gray-50 font-black text-gray-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Banco Destino *</label>
                  <input
                    type="text"
                    required
                    value={formEdicao.banco}
                    onChange={e => setFormEdicao({ ...formEdicao, banco: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Conta Destino *</label>
                  <input
                    type="text"
                    required
                    value={formEdicao.conta}
                    onChange={e => setFormEdicao({ ...formEdicao, conta: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-white font-semibold"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block font-bold text-gray-700 mb-1">Cliente / Favorecido *</label>
                  <input
                    type="text"
                    required
                    value={formEdicao.cliente}
                    onChange={e => setFormEdicao({ ...formEdicao, cliente: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nome do Depositante</label>
                  <input
                    type="text"
                    value={formEdicao.nome_depositante}
                    onChange={e => setFormEdicao({ ...formEdicao, nome_depositante: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">CPF do Depositante</label>
                  <input
                    type="text"
                    value={formEdicao.cpf_depositante}
                    onChange={e => setFormEdicao({ ...formEdicao, cpf_depositante: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Hash size={13} className="text-gray-500" /> Número de Operação
                  </label>
                  <input
                    type="text"
                    value={formEdicao.numero_operacao}
                    onChange={e => setFormEdicao({ ...formEdicao, numero_operacao: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-white font-semibold"
                  />
                </div>

                {/* ID DA OPERAÇÃO NO MODAL DE EDIÇÃO */}
                <div className="md:col-span-3 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <label className="block font-bold text-slate-800 text-xs uppercase tracking-wider">
                    ID da Operação (8 - 4 - 4 - 4 - 12 caracteres)
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                    <input
                      ref={editInputRefs[0]}
                      type="text"
                      maxLength={8}
                      value={idOperacaoEditBlocks[0]}
                      onChange={e => handleEditBlockChange(0, e.target.value)}
                      className="w-full sm:w-28 p-2 text-center border-2 rounded-lg font-mono font-bold text-xs uppercase focus:border-indigo-600 bg-white"
                    />
                    <span className="font-bold text-gray-400">-</span>
                    <input
                      ref={editInputRefs[1]}
                      type="text"
                      maxLength={4}
                      value={idOperacaoEditBlocks[1]}
                      onChange={e => handleEditBlockChange(1, e.target.value)}
                      className="w-full sm:w-20 p-2 text-center border-2 rounded-lg font-mono font-bold text-xs uppercase focus:border-indigo-600 bg-white"
                    />
                    <span className="font-bold text-gray-400">-</span>
                    <input
                      ref={editInputRefs[2]}
                      type="text"
                      maxLength={4}
                      value={idOperacaoEditBlocks[2]}
                      onChange={e => handleEditBlockChange(2, e.target.value)}
                      className="w-full sm:w-20 p-2 text-center border-2 rounded-lg font-mono font-bold text-xs uppercase focus:border-indigo-600 bg-white"
                    />
                    <span className="font-bold text-gray-400">-</span>
                    <input
                      ref={editInputRefs[3]}
                      type="text"
                      maxLength={4}
                      value={idOperacaoEditBlocks[3]}
                      onChange={e => handleEditBlockChange(3, e.target.value)}
                      className="w-full sm:w-20 p-2 text-center border-2 rounded-lg font-mono font-bold text-xs uppercase focus:border-indigo-600 bg-white"
                    />
                    <span className="font-bold text-gray-400">-</span>
                    <input
                      ref={editInputRefs[4]}
                      type="text"
                      maxLength={12}
                      value={idOperacaoEditBlocks[4]}
                      onChange={e => handleEditBlockChange(4, e.target.value)}
                      className="w-full sm:flex-1 p-2 text-center border-2 rounded-lg font-mono font-bold text-xs uppercase focus:border-indigo-600 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setItemEdicao(null)}
                  className="px-5 py-2.5 border rounded-lg text-gray-600 font-semibold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoEdicao}
                  className="bg-primary hover:bg-blue-900 text-white font-bold py-2.5 px-8 rounded-lg shadow-md flex items-center gap-2"
                >
                  <Check size={16} /> {salvandoEdicao ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}