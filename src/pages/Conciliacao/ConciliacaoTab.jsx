import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import { 
  Zap, 
  RefreshCw, 
  Filter, 
  RotateCcw, 
  Building, 
  Search, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CheckCircle2,
  FileSpreadsheet,
  Sparkles,
  Layers,
  AlertTriangle
} from 'lucide-react';

export default function ConciliacaoTab() {
  const [extrato, setExtrato] = useState([]);
  const [titulosPendentes, setTitulosPendentes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // FILTROS
  const [bancoFiltro, setBancoFiltro] = useState('TODOS');
  const [tipoOperacaoFiltro, setTipoOperacaoFiltro] = useState('TODAS');
  const [statusFiltro, setStatusFiltro] = useState('NAO_CONCILIADOS');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // MODAL MANUAL
  const [itemEditando, setItemEditando] = useState(null);
  const [naoSeAplicaTitulo, setNaoSeAplicaTitulo] = useState(false);
  const [formManual, setFormEditandoManual] = useState({
    tipo_operacao: 'Entrada',
    categoria_macro: '',
    subcategoria: '',
    origem_destino: '',
    fornecedor_nome: '',
    cnpj: '',
    nota_fiscal: '',
    valor_nota_fiscal: '',
    parcela: '',
    valor_original_titulo: '',
    valor_abatimento: 0,
    valor_juros_multa: 0
  });

  const bancosDisponiveis = [
    { id: 'Bradesco', label: 'Bradesco' },
    { id: 'Santander', label: 'Santander' },
    { id: 'Sicoob', label: 'Sicoob' },
    { id: 'Tribanco', label: 'Tribanco' },
    { id: 'TODOS', label: 'Todos' }
  ];

  const tiposOperacao = [
    { id: 'TODAS', label: 'Todas' },
    { id: 'Entrada', label: 'Entradas' },
    { id: 'Saída', label: 'Saídas' }
  ];

  const statusConciliacaoOptions = [
    { id: 'NAO_CONCILIADOS', label: 'Pendentes' },
    { id: 'CONCILIADOS', label: 'Conciliados' },
    { id: 'TODOS', label: 'Todos' }
  ];

  const categoriasMacro = [
    "1. Receitas e Recebíveis (Entradas de Operação)",
    "2. Despesas Operacionais e Administrativas (Saídas)",
    "3. Transferências e Movimentações Internas (Neutras)",
    "4. Tarifas, Impostos e Encargos (Custos Financeiros/Fiscais)",
    "5. Investimentos e Aplicações (Patrimonial)",
    "6. Empréstimos, Financiamentos e Garantias (Passivo)",
    "7. Ajustes, Estornos e Eventos Excepcionais (Correções)",
    "8. Saldos e Controles Técnicos (Metadados)",
    "9. Pagamento a Fornecedores"
  ];

  const subcategorias = [
    "1.1 Recebimento Vendas PIX", "1.2 Recebimentos Vendas Cartões", "1.3 Boleto (Liquidação/Recebimento)", "1.4 Antecipação de Recebíveis", "1.4 Depósito",
    "2.1 Folha de Pagamento", "2.2 Cartão Corporativo", "2.3 Cheque (Emitido/Compensado)", "2.4 Saque", "2.5 Seguro", "2.6 Consórcios", "2.7 Outros Gastos",
    "3.1 Transferência Mesma Titularidade (Conta A para Conta B)", "3.2 Transferência Terceiros (Saídas/Entradas de apoio)", "3.3 Transf. p/Sócio (PF)", "3.4 Aporte de Capital / Investimento de Sócios",
    "4.1 Tarifas e Outros Encargos", "4.2 Taxas (Gerais)", "4.3 Pagamento de Tributos (Guias)", "4.4 Retenção de Impostos na Fonte", "4.5 IOF",
    "5.1 Investimento (Aplicação/Resgate)", "5.2 Previdência",
    "6.1 Empréstimo / Financiamento", "6.2 Uso de Cheque Especial", "6.3 Fiança Bancária / Depósito Recursal",
    "7.1 Cancelamento / Estorno", "7.2 Devolução de Cheque", "7.3 Chargeback", "7.4 Liberação de Depósito Bloqueado", "7.5 Bloqueio Judicial", "7.6 Desbloqueio Judicial", "7.7 Ajuste de Saldo",
    "8.1 Saldo Anterior", "8.2 Saldo Conta Corrente", "8.3 Operações Automáticas", "8.4 N/A (Não Aplicável)",
    "9.1 Títulos Pagos", "9.2 Pix para Fornecedor"
  ];

  const origensDestinos = [
    "Destino Bradesco", "Destino Santander", "Destino Sicoob", "Destino Tribanco",
    "Origem Bradesco", "Origem Santander", "Origem Sicoob", "Origem Tribanco"
  ];

  useEffect(() => {
    carregarTitulosPendentes();
  }, []);

  const carregarTitulosPendentes = async () => {
    const { data } = await supabase.from('titulos_pagos_importados').select('*').eq('conciliado', false);
    setTitulosPendentes(data || []);
  };

  const carregarDadosConciliacao = async () => {
    setLoading(true);
    setHasSearched(true);

    let query = supabase.from('extrato_transacoes').select('*').order('data_transacao', { ascending: false });

    if (bancoFiltro !== 'TODOS') query = query.eq('banco', bancoFiltro);
    if (tipoOperacaoFiltro !== 'TODAS') query = query.eq('tipo_operacao', tipoOperacaoFiltro);
    if (statusFiltro === 'NAO_CONCILIADOS') query = query.eq('conciliado', false);
    if (statusFiltro === 'CONCILIADOS') query = query.eq('conciliado', true);
    if (dataInicio) query = query.gte('data_transacao', dataInicio);
    if (dataFim) query = query.lte('data_transacao', dataFim);

    const { data } = await query;
    setExtrato(data || []);
    setLoading(false);
  };

  const limparFiltros = () => {
    setBancoFiltro('TODOS');
    setTipoOperacaoFiltro('TODAS');
    setStatusFiltro('NAO_CONCILIADOS');
    setDataInicio('');
    setDataFim('');
    setExtrato([]);
    setHasSearched(false);
  };

  const resumoDashboard = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    let conciliadosCount = 0;

    extrato.forEach(t => {
      const val = Number(t.valor) || 0;
      // Critério unificado: valores negativos são saídas, positivos são entradas
      if (val < 0 || t.tipo_operacao === 'Saída') {
        saidas += Math.abs(val);
      } else if (val > 0 || t.tipo_operacao === 'Entrada') {
        entradas += val;
      }

      if (t.conciliado) conciliadosCount++;
    });

    return {
      entradas, 
      saidas, 
      saldo: entradas - saidas, 
      totalRegistros: extrato.length,
      conciliadosCount, 
      percConciliado: extrato.length > 0 ? ((conciliadosCount / extrato.length) * 100).toFixed(1) : 0
    };
  }, [extrato]);

  // AÇÃO 1: EXECUTAR CORRESPONDÊNCIA AUTOMÁTICA
  const handleExecutarCorrespondenciaAutomatica = async () => {
    setLoading(true);
    const { data: regras, error: errRegras } = await supabase.from('regras_correspondencia').select('*');
    
    if (errRegras || !regras || regras.length === 0) {
      setLoading(false);
      return alert("Nenhuma regra cadastrada na aba Correspondências. Cadastre ao menos um padrão antes.");
    }

    // Busca transações não conciliadas e não categorizadas do extrato
    let queryExtrato = supabase.from('extrato_transacoes').select('*').eq('conciliado', false);
    if (bancoFiltro !== 'TODOS') {
      queryExtrato = queryExtrato.eq('banco', bancoFiltro);
    }

    const { data: pendentes } = await queryExtrato;
    let categorizadosCount = 0;

    if (pendentes && pendentes.length > 0) {
      for (const ext of pendentes) {
        const textoExtrato = (ext.descricao + ' ' + (ext.memo || '')).toUpperCase();

        // Procura regra correspondente (prioriza regra do mesmo banco ou regra 'Geral')
        const regraMatch = regras.find(r => {
          const padrao = (r.padrao_descricao || '').toUpperCase();
          const bancoRegra = (r.banco || '').toUpperCase();
          const matchTexto = textoExtrato.includes(padrao);
          const matchBanco = bancoRegra === 'GERAL' || bancoRegra === ext.banco.toUpperCase();
          return matchTexto && matchBanco;
        });

        if (regraMatch) {
          categorizadosCount++;
          await supabase.from('extrato_transacoes').update({
            categoria_macro: regraMatch.categoria_macro,
            subcategoria: regraMatch.subcategoria,
            tipo_operacao: regraMatch.tipo_operacao
          }).eq('id', ext.id);
        }
      }
    }

    setLoading(false);
    alert(`Correspondência concluída! ${categorizadosCount} lançamentos do extrato foram categorizados automaticamente.`);
    carregarDadosConciliacao();
  };

  // AÇÃO 2: EXECUTAR CONCILIAÇÃO AUTOMÁTICA (TÍTULOS PAGOS)
  const handleConciliacaoAutomatica = async () => {
    setLoading(true);

    const { count } = await supabase.from('titulos_pagos_importados').select('*', { count: 'exact', head: true });
    if (!count || count === 0) {
      setLoading(false);
      return alert("Aviso: Não houve importação de Títulos Pagos para o período. Importe os Títulos Pagos antes de conciliar.");
    }

    const { data: pendentesExtrato } = await supabase.from('extrato_transacoes').select('*').eq('conciliado', false);
    let conciliadosContador = 0;

    if (pendentesExtrato && pendentesExtrato.length > 0) {
      for (const ext of pendentesExtrato) {
        const match = titulosPendentes.find(t => 
          t.data_pagamento === ext.data_transacao && 
          Math.abs(Number(t.valor_pago) - Number(ext.valor)) < 0.01
        );

        if (match) {
          conciliadosContador++;
          await supabase.from('extrato_transacoes').update({
            conciliado: true,
            conciliado_com_id: match.id,
            tipo_conciliacao: 'Auto',
            categoria_macro: '9. Pagamento a Fornecedores',
            subcategoria: '9.1 Títulos Pagos',
            fornecedor_nome: match.fornecedor,
            cnpj: match.cnpj,
            nota_fiscal: match.nota_fiscal,
            parcela: match.parcela,
            valor_original_titulo: match.valor_pago
          }).eq('id', ext.id);

          await supabase.from('titulos_pagos_importados').update({ conciliado: true }).eq('id', match.id);
        }
      }
    }

    if (conciliadosContador === 0) {
      alert("Nenhum pagamento correspondente foi localizado entre o Extrato e os Títulos Pagos.");
    } else {
      alert(`Conciliação Automática concluída! ${conciliadosContador} pagamentos de Títulos Pagos foram vinculados ao Extrato.`);
    }

    carregarDadosConciliacao();
  };

  // AÇÃO 3: CONCILIAR EM MASSA (TRANSAÇÕES NÃO-FORNECEDOR JÁ CATEGORIZADAS)
  const handleConciliarEmMassa = async () => {
    setLoading(true);

    // Busca transações não conciliadas que já possuem categoria e subcategoria e que NÃO sejam Títulos Pagos
    const { data: pendentes } = await supabase
      .from('extrato_transacoes')
      .select('*')
      .eq('conciliado', false)
      .not('categoria_macro', 'is', null)
      .not('subcategoria', 'is', null);

    if (!pendentes || pendentes.length === 0) {
      setLoading(false);
      return alert("Nenhum lançamento categorizado pendente de conciliação foi encontrado.");
    }

    let conciliadosContador = 0;
    let pendentesOrigemDestino = 0;

    for (const item of pendentes) {
      // Ignora Pagamento a Fornecedores / Títulos Pagos
      if (item.categoria_macro?.includes("9. Pagamento a Fornecedores") || item.subcategoria?.includes("9.1 Títulos Pagos")) {
        continue;
      }

      // Validação obrigatória para Transferências entre Mesma Titularidade
      const isTransferenciaInterna = item.categoria_macro?.includes("3. Transferências e Movimentações Internas") && 
                                    item.subcategoria?.includes("3.1 Transferência Mesma Titularidade");

      if (isTransferenciaInterna && (!item.origem_destino || item.origem_destino.trim() === '' || item.origem_destino === 'Não Aplicável')) {
        pendentesOrigemDestino++;
        continue; // Pula este item até que o usuário informe a Origem/Destino
      }

      // Conclui conciliação em massa marcando Não se Aplica para dados de fornecedor
      await supabase.from('extrato_transacoes').update({
        conciliado: true,
        tipo_conciliacao: 'Auto',
        fornecedor_nome: null,
        cnpj: null,
        nota_fiscal: null,
        parcela: null,
        valor_original_titulo: 0,
        valor_abatimento: 0,
        valor_juros_multa: 0
      }).eq('id', item.id);

      conciliadosContador++;
    }

    let mensagem = `Conciliação em Massa concluída! ${conciliadosContador} lançamentos foram conciliados automaticamente.`;
    if (pendentesOrigemDestino > 0) {
      mensagem += `\n\nAtenção: ${pendentesOrigemDestino} lançamentos de Transferência Interna exigem o preenchimento obrigatório de Origem/Destino e não foram conciliados.`;
    }

    alert(mensagem);
    carregarDadosConciliacao();
  };

  const handleAtualizarValorOriginal = (valOrigStr) => {
    const valOrig = parseFloat(valOrigStr) || 0;
    const valPago = Number(itemEditando?.valor) || 0;
    
    let abatimento = 0;
    let jurosMulta = 0;

    if (valOrig > 0) {
      if (valOrig > valPago) abatimento = valOrig - valPago;
      else if (valPago > valOrig) jurosMulta = valPago - valOrig;
    }

    setFormEditandoManual(prev => ({
      ...prev,
      valor_original_titulo: valOrigStr,
      valor_abatimento: abatimento,
      valor_juros_multa: jurosMulta
    }));
  };

  const handleAbrirModalManual = (item) => {
    setItemEditando(item);
    const isFornecedor = item.categoria_macro?.includes("9. Pagamento a Fornecedores") || item.subcategoria?.includes("9.1 Títulos Pagos");
    
    // Se não for fornecedor, ativa por padrão o toggle "Não se aplica"
    setNaoSeAplicaTitulo(!isFornecedor);

    setFormEditandoManual({
      tipo_operacao: item.tipo_operacao || 'Saída',
      categoria_macro: item.categoria_macro || '9. Pagamento a Fornecedores',
      subcategoria: item.subcategoria || '9.1 Títulos Pagos',
      origem_destino: item.origem_destino || '',
      fornecedor_nome: item.fornecedor_nome || '',
      cnpj: item.cnpj || '',
      nota_fiscal: item.nota_fiscal || '',
      valor_nota_fiscal: item.valor_nota_fiscal || item.valor || '',
      parcela: item.parcela || '',
      valor_original_titulo: item.valor_original_titulo || item.valor || '',
      valor_abatimento: item.valor_abatimento || 0,
      valor_juros_multa: item.valor_juros_multa || 0
    });
  };

  const handleSalvarCategorizacaoManual = async (e) => {
    e.preventDefault();

    // Validação de Origem/Destino obrigatória para Transferências de Mesma Titularidade
    const isTransfInterna = formManual.categoria_macro?.includes("3. Transferências e Movimentações Internas") && 
                             formManual.subcategoria?.includes("3.1 Transferência Mesma Titularidade");

    if (isTransfInterna && (!formManual.origem_destino || formManual.origem_destino === '' || formManual.origem_destino === 'Não Aplicável')) {
      return alert("Para Transferências de Mesma Titularidade (PJ para PJ), é obrigatório selecionar a Origem / Destino.");
    }

    const payloadAtualizacao = {
      tipo_operacao: formManual.tipo_operacao,
      categoria_macro: formManual.categoria_macro,
      subcategoria: formManual.subcategoria,
      origem_destino: formManual.origem_destino,
      conciliado: true,
      tipo_conciliacao: 'Manual'
    };

    if (naoSeAplicaTitulo) {
      payloadAtualizacao.fornecedor_nome = null;
      payloadAtualizacao.cnpj = null;
      payloadAtualizacao.nota_fiscal = null;
      payloadAtualizacao.valor_nota_fiscal = 0;
      payloadAtualizacao.parcela = null;
      payloadAtualizacao.valor_original_titulo = 0;
      payloadAtualizacao.valor_abatimento = 0;
      payloadAtualizacao.valor_juros_multa = 0;
    } else {
      payloadAtualizacao.fornecedor_nome = formManual.fornecedor_nome;
      payloadAtualizacao.cnpj = formManual.cnpj;
      payloadAtualizacao.nota_fiscal = formManual.nota_fiscal;
      payloadAtualizacao.valor_nota_fiscal = parseFloat(formManual.valor_nota_fiscal) || 0;
      payloadAtualizacao.parcela = formManual.parcela;
      payloadAtualizacao.valor_original_titulo = parseFloat(formManual.valor_original_titulo) || 0;
      payloadAtualizacao.valor_abatimento = formManual.valor_abatimento;
      payloadAtualizacao.valor_juros_multa = formManual.valor_juros_multa;
    }

    const { error } = await supabase.from('extrato_transacoes').update(payloadAtualizacao).eq('id', itemEditando.id);

    if (error) alert("Erro ao conciliar: " + error.message);
    else {
      alert("Transação conciliada com sucesso!");
      setItemEditando(null);
      carregarDadosConciliacao();
    }
  };

  const handleDesfazerConciliacao = async (id) => {
    if (!confirm("Deseja desfazer a conciliação desta transação?")) return;
    await supabase.from('extrato_transacoes').update({
      conciliado: false, conciliado_com_id: null, tipo_conciliacao: null,
      categoria_macro: null, subcategoria: null, origem_destino: null
    }).eq('id', id);
    carregarDadosConciliacao();
  };

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatarData = (d) => d ? d.split('-').reverse().join('/') : '';

  return (
    <div className="space-y-6">
      
      {/* BARRA SUPERIOR DE AUTOMATIZAÇÕES (3 BOTÕES) */}
      <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            <Zap className="text-amber-500" size={22}/> Ações de Automação Bancária
          </h3>
          <p className="text-xs text-gray-500">Execute regras de correspondência, conciliação por títulos ou conciliação em massa.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
          {/* BOTÃO 1: EXECUTAR CORRESPONDÊNCIA */}
          <button
            onClick={handleExecutarCorrespondenciaAutomatica}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg shadow flex items-center justify-center gap-1.5 text-xs transition-transform hover:scale-105"
          >
            <Sparkles size={16} /> Correspondência Automática
          </button>

          {/* BOTÃO 2: CONCILIAR EM MASSA */}
          <button
            onClick={handleConciliarEmMassa}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow flex items-center justify-center gap-1.5 text-xs transition-transform hover:scale-105"
          >
            <Layers size={16} /> Conciliar em Massa
          </button>

          {/* BOTÃO 3: EXECUTAR CONCILIAÇÃO (TÍTULOS PAGOS) */}
          <button
            onClick={handleConciliacaoAutomatica}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg shadow flex items-center justify-center gap-1.5 text-xs transition-transform hover:scale-105"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Conciliação Automática
          </button>
        </div>
      </div>

      {/* PAINEL DE FILTROS */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
            <Filter size={18} className="text-primary" /> Filtros de Conciliação
          </h3>
          <button onClick={limparFiltros} className="text-xs text-blue-600 font-semibold flex items-center gap-1">
            <RotateCcw size={14}/> Limpar Filtros
          </button>
        </div>

        {/* BOTÕES BANCO */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
            <Building size={14}/> Escolha o Banco
          </label>
          <div className="flex flex-wrap gap-2">
            {bancosDisponiveis.map(b => (
              <button key={b.id} type="button" onClick={() => setBancoFiltro(b.id)} className={`px-4 py-2 rounded-lg text-xs font-bold border ${bancoFiltro === b.id ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-md scale-105' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Início</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Fim</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs" />
            </div>
          </div>

          <div className="lg:col-span-3">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tipo de Operação</label>
            <div className="flex gap-1.5">
              {tiposOperacao.map(t => (
                <button key={t.id} type="button" onClick={() => setTipoOperacaoFiltro(t.id)} className={`flex-1 py-2.5 px-2 rounded-lg text-xs font-bold border text-center ${tipoOperacaoFiltro === t.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
              <Clock size={14}/> Status da Conciliação
            </label>
            <div className="flex gap-1.5">
              {statusConciliacaoOptions.map(st => (
                <button key={st.id} type="button" onClick={() => setStatusFiltro(st.id)} className={`flex-1 py-2.5 px-2 rounded-lg text-xs font-bold border text-center ${statusFiltro === st.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={limparFiltros} className="px-5 py-2.5 border rounded-lg text-gray-600 font-semibold hover:bg-gray-50 text-xs">Limpar</button>
          <button type="button" onClick={carregarDadosConciliacao} disabled={loading} className="bg-primary hover:bg-blue-900 text-white font-bold py-2.5 px-8 rounded-lg shadow-md text-xs flex items-center justify-center gap-2">
            <Search size={16}/> {loading ? "Carregando..." : "Aplicar Filtro"}
          </button>
        </div>
      </div>

      {/* RESULTADO E MINI DASHBOARD */}
      <div className="space-y-6">
        {!hasSearched ? (
          <div className="bg-white p-12 rounded-xl border shadow-sm text-center py-16 text-gray-400 space-y-2">
            <FileSpreadsheet size={48} className="mx-auto opacity-40 text-gray-400" />
            <p className="text-sm font-semibold text-gray-600">Nenhum lançamento listado para conciliação no momento.</p>
            <p className="text-xs text-gray-400">Ajuste os botões acima e clique em <strong>"Aplicar Filtro"</strong>.</p>
          </div>
        ) : loading ? (
          <div className="bg-white p-12 rounded-xl border shadow-sm text-center py-12 text-gray-500 font-medium">Carregando lançamentos...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase">Entradas</span>
                <p className="text-2xl font-extrabold text-green-600">{formatarMoeda(resumoDashboard.entradas)}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase">Saídas</span>
                <p className="text-2xl font-extrabold text-red-600">{formatarMoeda(resumoDashboard.saidas)}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase">Saldo Período</span>
                <p className={`text-2xl font-extrabold ${resumoDashboard.saldo >= 0 ? 'text-blue-900' : 'text-red-600'}`}>{formatarMoeda(resumoDashboard.saldo)}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase">Índice Conciliado</span>
                <p className="text-2xl font-extrabold text-indigo-900">{resumoDashboard.percConciliado}%</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b text-gray-500 uppercase font-bold">
                      <th className="p-3">Data</th>
                      <th className="p-3">Banco</th>
                      <th className="p-3">Descrição / MEMO</th>
                      <th className="p-3">Categoria / Subcategoria</th>
                      <th className="p-3">Fornecedor / NF</th>
                      <th className="p-3 text-right">Valor R$</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {extrato.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium whitespace-nowrap">{formatarData(t.data_transacao)}</td>
                        <td className="p-3 font-bold text-gray-700">{t.banco}</td>
                        <td className="p-3 font-semibold text-gray-800">{t.descricao}</td>
                        <td className="p-3 text-gray-500">
                          {t.categoria_macro ? (
                            <span>
                              <strong className="text-gray-700 block">{t.categoria_macro}</strong>
                              {t.subcategoria && <span className="text-[10px] text-gray-400">&rsaquo; {t.subcategoria}</span>}
                            </span>
                          ) : <span className="italic text-gray-400">Não categorizado</span>}
                        </td>
                        <td className="p-3">
                          {t.fornecedor_nome ? `${t.fornecedor_nome} (NF: ${t.nota_fiscal || '-'})` : '-'}
                        </td>
                        <td className={`p-3 text-right font-bold whitespace-nowrap ${t.tipo_operacao === 'Entrada' ? 'text-green-600' : 'text-red-600'}`}>
                          {formatarMoeda(t.valor)}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${t.conciliado ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                            {t.conciliado ? `Conciliado (${t.tipo_conciliacao || 'Sim'})` : 'Pendente'}
                          </span>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {!t.conciliado ? (
                            <button onClick={() => handleAbrirModalManual(t)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded font-bold transition-colors">
                              Conciliar
                            </button>
                          ) : (
                            <button onClick={() => handleDesfazerConciliacao(t.id)} className="text-red-600 hover:text-red-800 font-bold hover:underline">
                              Desfazer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL MANUAL COM TOGGLE "NÃO SE APLICA" */}
      {itemEditando && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl border">
            <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Categorizar & Conciliar Transação</h3>
            
            <div className="bg-gray-50 p-3 rounded-lg border text-xs space-y-1">
              <p className="text-gray-600">Descrição: <strong className="text-gray-900">{itemEditando.descricao}</strong></p>
              <p className="text-gray-600">Banco: <strong className="text-gray-900">{itemEditando.banco}</strong></p>
              <p className="text-gray-600">Valor Pago no Extrato: <strong className="text-indigo-900 text-sm">{formatarMoeda(itemEditando.valor)}</strong> em {formatarData(itemEditando.data_transacao)}</p>
            </div>

            <form onSubmit={handleSalvarCategorizacaoManual} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tipo de Operação</label>
                  <select value={formManual.tipo_operacao} onChange={e=>setFormEditandoManual({...formManual, tipo_operacao: e.target.value})} className="w-full p-2 border rounded bg-white font-semibold">
                    <option value="Entrada">Entrada</option>
                    <option value="Saída">Saída</option>
                    <option value="Sem Operação/Neutro">Sem Operação/Neutro</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Categoria Macro</label>
                  <select value={formManual.categoria_macro} onChange={e=>setFormEditandoManual({...formManual, categoria_macro: e.target.value})} className="w-full p-2 border rounded bg-white">
                    {categoriasMacro.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">Subcategoria</label>
                  <select value={formManual.subcategoria} onChange={e=>setFormEditandoManual({...formManual, subcategoria: e.target.value})} className="w-full p-2 border rounded bg-white">
                    {subcategorias.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">
                    Origem / Destino (Transferências PJ/PJ) {formManual.categoria_macro?.includes("3. Transferências") && <span className="text-red-500">*</span>}
                  </label>
                  <select value={formManual.origem_destino} onChange={e=>setFormEditandoManual({...formManual, origem_destino: e.target.value})} className="w-full p-2 border rounded bg-white font-semibold">
                    <option value="">Não Aplicável</option>
                    {origensDestinos.map(od => <option key={od} value={od}>{od}</option>)}
                  </select>
                </div>
              </div>

              {/* SEÇÃO DE DADOS DO FORNECEDOR COM TOGGLE "NÃO SE APLICA" */}
              <div className="border-t pt-3 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-gray-800 text-xs uppercase text-indigo-950">
                    Dados do Fornecedor & Título Financeiro
                  </h4>

                  {/* TOGGLE NÃO SE APLICA */}
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 select-none">
                    <span>Não se aplica</span>
                    <input 
                      type="checkbox" 
                      checked={naoSeAplicaTitulo} 
                      onChange={e => setNaoSeAplicaTitulo(e.target.checked)} 
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 relative"></div>
                  </label>
                </div>

                <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 transition-opacity ${naoSeAplicaTitulo ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div>
                    <label className="block font-semibold mb-1">Fornecedor (Razão Social)</label>
                    <input type="text" disabled={naoSeAplicaTitulo} value={formManual.fornecedor_nome} onChange={e=>setFormEditandoManual({...formManual, fornecedor_nome: e.target.value})} className="w-full p-2 border rounded bg-white" placeholder="Razão Social" />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">CNPJ</label>
                    <input type="text" disabled={naoSeAplicaTitulo} value={formManual.cnpj} onChange={e=>setFormEditandoManual({...formManual, cnpj: e.target.value})} className="w-full p-2 border rounded bg-white" placeholder="00.000.000/0001-00" />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Nota Fiscal</label>
                    <input type="text" disabled={naoSeAplicaTitulo} value={formManual.nota_fiscal} onChange={e=>setFormEditandoManual({...formManual, nota_fiscal: e.target.value})} className="w-full p-2 border rounded bg-white" />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Valor Nota Fiscal (R$)</label>
                    <input type="number" step="0.01" disabled={naoSeAplicaTitulo} value={formManual.valor_nota_fiscal} onChange={e=>setFormEditandoManual({...formManual, valor_nota_fiscal: e.target.value})} className="w-full p-2 border rounded bg-white" />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Parcela</label>
                    <input type="text" disabled={naoSeAplicaTitulo} value={formManual.parcela} onChange={e=>setFormEditandoManual({...formManual, parcela: e.target.value})} className="w-full p-2 border rounded bg-white" placeholder="1/3" />
                  </div>

                  <div>
                    <label className="block font-bold text-indigo-900 mb-1">Valor Original Título (R$) *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      disabled={naoSeAplicaTitulo}
                      value={formManual.valor_original_titulo} 
                      onChange={e => handleAtualizarValorOriginal(e.target.value)} 
                      className="w-full p-2 border rounded bg-white font-bold text-gray-800" 
                    />
                  </div>
                </div>

                {!naoSeAplicaTitulo && (
                  <div className="grid grid-cols-2 gap-3 bg-indigo-50/60 p-3 rounded-lg border border-indigo-100">
                    <div>
                      <span className="block font-bold text-emerald-800 text-[11px] uppercase">Abatimento / Desconto</span>
                      <span className="text-sm font-extrabold text-emerald-700">{formatarMoeda(formManual.valor_abatimento)}</span>
                    </div>
                    <div>
                      <span className="block font-bold text-red-800 text-[11px] uppercase">Juros / Multa</span>
                      <span className="text-sm font-extrabold text-red-700">{formatarMoeda(formManual.valor_juros_multa)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setItemEditando(null)} className="px-4 py-2 border rounded font-bold text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded shadow">
                  Salvar Conciliação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}