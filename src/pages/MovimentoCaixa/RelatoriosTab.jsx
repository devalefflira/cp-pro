import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { FileText, Search, Printer, CheckSquare, Square, ChevronDown, Clock, Wallet, Landmark } from 'lucide-react';

export default function RelatoriosTab() {
  const [tipoRelatorio, setTipoRelatorio] = useState('tipo_operacao');

  // Filtros padrão (para relatórios convencionais)
  const [tipoOperacaoFiltro, setTipoOperacaoFiltro] = useState('TODAS'); // 'TODAS', 'Entrada +', 'Saída -'
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Filtros Independentes: TESOURARIA (Sangrias)
  const [dataInicioTesouraria, setDataInicioTesouraria] = useState('');
  const [dataFimTesouraria, setDataFimTesouraria] = useState('');
  const [horaInicioTesouraria, setHoraInicioTesouraria] = useState('00:00');
  const [horaFimTesouraria, setHoraFimTesouraria] = useState('23:59');

  // Filtros Independentes: DEPÓSITOS BANCÁRIOS
  const [dataInicioDepositos, setDataInicioDepositos] = useState('');
  const [dataFimDepositos, setDataFimDepositos] = useState('');
  const [horaInicioDepositos, setHoraInicioDepositos] = useState('00:00');
  const [horaFimDepositos, setHoraFimDepositos] = useState('23:59');
  
  const [dados, setDados] = useState([]);
  const [dadosSangrias, setDadosSangrias] = useState([]);
  const [dadosDepositos, setDadosDepositos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gerado, setGerado] = useState(false);

  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const dropdownRef = useRef(null);

  const getOpcoesDisponiveis = () => {
    if (tipoRelatorio === 'tipo_operacao') return ['Entrada +', 'Saída -'];
    if (tipoRelatorio === 'forma_pagamento') return ['Dinheiro', 'PIX', 'Cartão', 'Cheque', 'Depósito', 'TED'];
    if (tipoRelatorio === 'tipo_documento') return ['PIX', 'Cartão', 'Cheque', 'Vale', 'Despesa', 'Devolução', 'Fatura AtualCard', 'Sangria'];
    return [];
  };

  const opcoes = getOpcoesDisponiveis();

  useEffect(() => {
    setItensSelecionados(getOpcoesDisponiveis());
  }, [tipoRelatorio]);

  useEffect(() => {
    const handleClickFora = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  const handleToggleItem = (item) => {
    setItensSelecionados(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleSelecionarTodos = () => {
    if (itensSelecionados.length === opcoes.length) {
      setItensSelecionados([]);
    } else {
      setItensSelecionados([...opcoes]);
    }
  };

  const montarTimestamp = (dataStr, dataHoraRegStr, created_at, horaManual) => {
    let hora = horaManual || '00:00';
    if (!horaManual && dataHoraRegStr && dataHoraRegStr.includes(',')) {
      hora = dataHoraRegStr.split(',')[1]?.trim().slice(0, 5) || '00:00';
    } else if (!horaManual && created_at) {
      const dt = new Date(created_at);
      hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    const dataFinal = dataStr || (created_at ? created_at.split('T')[0] : '1970-01-01');
    return new Date(`${dataFinal}T${hora.length === 5 ? hora + ':00' : hora}`);
  };

  const gerarRelatorio = async () => {
    setLoading(true);

    if (tipoRelatorio === 'numerarios') {
      const { data: sangrias } = await supabase
        .from('movimento_caixa')
        .select('*')
        .eq('tipo_documento', 'Sangria')
        .eq('forma_pagamento', 'Dinheiro')
        .eq('banco_operador', 'Tesouraria')
        .eq('tipo_operacao', 'Saída -')
        .order('data_operacao', { ascending: true });

      const { data: deps } = await supabase
        .from('depositos_bancarios')
        .select('*')
        .order('data_deposito', { ascending: true });

      const dtInicioTes = dataInicioTesouraria ? new Date(`${dataInicioTesouraria}T${horaInicioTesouraria || '00:00'}:00`) : null;
      const dtFimTes = dataFimTesouraria ? new Date(`${dataFimTesouraria}T${horaFimTesouraria || '23:59'}:59`) : null;

      const dtInicioDep = dataInicioDepositos ? new Date(`${dataInicioDepositos}T${horaInicioDepositos || '00:00'}:00`) : null;
      const dtFimDep = dataFimDepositos ? new Date(`${dataFimDepositos}T${horaFimDepositos || '23:59'}:59`) : null;

      const sangriasFiltradas = (sangrias || []).filter(s => {
        const timestampItem = montarTimestamp(s.data_operacao, s.data_lancamento, s.created_at);
        if (dtInicioTes && timestampItem < dtInicioTes) return false;
        if (dtFimTes && timestampItem > dtFimTes) return false;
        return true;
      });

      const depsFiltrados = (deps || []).filter(d => {
        const timestampItem = montarTimestamp(d.data_operacao || d.data_deposito, null, d.created_at, d.hora_operacao);
        if (dtInicioDep && timestampItem < dtInicioDep) return false;
        if (dtFimDep && timestampItem > dtFimDep) return false;
        return true;
      });

      setDadosSangrias(sangriasFiltradas);
      setDadosDepositos(depsFiltrados);
    } else {
      let query = supabase.from('movimento_caixa').select('*').order('data_operacao', { ascending: false });

      if (dataInicio) query = query.gte('data_operacao', dataInicio);
      if (dataFim) query = query.lte('data_operacao', dataFim);

      // Filtro de Tipo de Operação
      if (tipoRelatorio !== 'tipo_operacao' && tipoOperacaoFiltro !== 'TODAS') {
        query = query.eq('tipo_operacao', tipoOperacaoFiltro);
      }

      if (itensSelecionados.length > 0) {
        if (tipoRelatorio === 'tipo_operacao') query = query.in('tipo_operacao', itensSelecionados);
        else if (tipoRelatorio === 'forma_pagamento') query = query.in('forma_pagamento', itensSelecionados);
        else if (tipoRelatorio === 'tipo_documento') query = query.in('tipo_documento', itensSelecionados);
      }

      const { data } = await query;
      setDados(data || []);
    }

    setLoading(false);
    setGerado(true);
  };

  const handleAbrirImpressao = () => {
    const params = new URLSearchParams();
    params.append('tipo', tipoRelatorio);

    if (tipoRelatorio === 'numerarios') {
      if (dataInicioTesouraria) params.append('dtIniTes', dataInicioTesouraria);
      if (dataFimTesouraria) params.append('dtFimTes', dataFimTesouraria);
      if (horaInicioTesouraria) params.append('hrIniTes', horaInicioTesouraria);
      if (horaFimTesouraria) params.append('hrFimTes', horaFimTesouraria);

      if (dataInicioDepositos) params.append('dtIniDep', dataInicioDepositos);
      if (dataFimDepositos) params.append('dtFimDep', dataFimDepositos);
      if (horaInicioDepositos) params.append('hrIniDep', horaInicioDepositos);
      if (horaFimDepositos) params.append('hrFimDep', horaFimDepositos);

      window.open(`/print/controle-numerarios?${params.toString()}`, '_blank');
    } else {
      if (dataInicio) params.append('inicio', dataInicio);
      if (dataFim) params.append('fim', dataFim);
      if (tipoRelatorio !== 'tipo_operacao' && tipoOperacaoFiltro !== 'TODAS') {
        params.append('tipoOp', tipoOperacaoFiltro);
      }
      if (itensSelecionados.length > 0) params.append('itens', itensSelecionados.join(','));
      window.open(`/print/movimento-caixa?${params.toString()}`, '_blank');
    }
  };

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const formatarData = (d) => d ? d.split('-').reverse().join('/') : '';

  const totalSangrias = dadosSangrias.reduce((acc, c) => acc + Number(c.valor || 0), 0);
  const totalDepositos = dadosDepositos.reduce((acc, c) => acc + Number(c.valor_depositado || 0), 0);
  const saldoNumerarios = totalSangrias - totalDepositos;

  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
      
      <div className="border-b pb-3 flex justify-between items-center">
        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
          <FileText size={18} className="text-primary" /> Relatórios do Caixa Geral
        </h3>
        {gerado && (
          <button 
            onClick={handleAbrirImpressao} 
            className="bg-primary hover:bg-blue-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
          >
            <Printer size={14} /> Imprimir / PDF
          </button>
        )}
      </div>

      {/* SELETOR PRINCIPAL DE TIPO DE RELATÓRIO */}
      <div className="space-y-4 text-xs">
        <div>
          <label className="block font-bold text-gray-700 uppercase mb-1">Tipo de Relatório</label>
          <select 
            value={tipoRelatorio} 
            onChange={e => { setTipoRelatorio(e.target.value); setGerado(false); }} 
            className="w-full md:w-96 p-2.5 border rounded-lg bg-white font-bold text-gray-800 shadow-sm"
          >
            <option value="tipo_operacao">Por Tipo Operação</option>
            <option value="forma_pagamento">Por Forma de Pagamento</option>
            <option value="tipo_documento">Por Tipo Documento</option>
            <option value="numerarios">Controle de Numerários: Tesouraria x Depósitos</option>
          </select>
        </div>

        {/* 1. SEÇÃO DE FILTROS PARA RELATÓRIOS CONVENCIONAIS */}
        {tipoRelatorio !== 'numerarios' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end pt-2">
            <div className="relative" ref={dropdownRef}>
              <label className="block font-bold text-gray-500 uppercase mb-1">
                Filtro de Itens ({itensSelecionados.length}/{opcoes.length})
              </label>
              <button
                type="button"
                onClick={() => setDropdownAberto(!dropdownAberto)}
                className="w-full p-2.5 border rounded-lg bg-white font-semibold text-left flex justify-between items-center"
              >
                <span className="truncate text-gray-800">
                  {itensSelecionados.length === opcoes.length 
                    ? 'Todos Selecionados' 
                    : itensSelecionados.length === 0 
                      ? 'Nenhum selecionado' 
                      : `${itensSelecionados.length} selecionado(s)`}
                </span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {dropdownAberto && (
                <div className="absolute left-0 right-0 mt-1 bg-white border rounded-xl shadow-xl z-50 p-2 space-y-1 max-h-60 overflow-y-auto">
                  <button
                    type="button"
                    onClick={handleSelecionarTodos}
                    className="w-full text-left p-1.5 rounded-lg hover:bg-gray-50 text-indigo-900 font-black flex items-center gap-2 border-b pb-2 mb-1"
                  >
                    {itensSelecionados.length === opcoes.length ? <CheckSquare size={16} className="text-indigo-600"/> : <Square size={16} className="text-gray-400"/>}
                    <span>Selecionar Todos / Limpar</span>
                  </button>
                  {opcoes.map(opcao => (
                    <label key={opcao} onClick={() => handleToggleItem(opcao)} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 cursor-pointer font-semibold text-gray-700">
                      <input type="checkbox" checked={itensSelecionados.includes(opcao)} onChange={() => {}} className="w-4 h-4 text-indigo-600 rounded" />
                      <span>{opcao}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* NOVO CAMPO: TIPO DE OPERAÇÃO */}
            {tipoRelatorio !== 'tipo_operacao' && (
              <div>
                <label className="block font-bold text-gray-500 uppercase mb-1">Tipo de Operação</label>
                <select 
                  value={tipoOperacaoFiltro} 
                  onChange={e => setTipoOperacaoFiltro(e.target.value)} 
                  className="w-full p-2.5 border rounded-lg bg-white font-bold text-gray-800"
                >
                  <option value="TODAS">Todas (Entradas e Saídas)</option>
                  <option value="Entrada +" className="text-emerald-700 font-bold">Entradas (+)</option>
                  <option value="Saída -" className="text-red-700 font-bold">Saídas (-)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block font-bold text-gray-500 uppercase mb-1">Data Início</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full p-2.5 border rounded-lg bg-gray-50" />
            </div>

            <div>
              <label className="block font-bold text-gray-500 uppercase mb-1">Data Fim</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full p-2.5 border rounded-lg bg-gray-50" />
            </div>

            <div>
              <button 
                onClick={gerarRelatorio} 
                disabled={loading} 
                className="w-full bg-primary hover:bg-blue-900 text-white font-bold py-2.5 px-6 rounded-lg shadow text-xs flex items-center justify-center gap-2"
              >
                <Search size={14} /> {loading ? "Gerando..." : "Gerar Relatório"}
              </button>
            </div>
          </div>
        ) : (
          /* 2. SEÇÃO DE FILTROS SEPARADOS: TESOURARIA X DEPÓSITOS */
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* BLOCO DE FILTROS DA TESOURARIA */}
              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-3">
                <h4 className="font-extrabold text-xs uppercase text-emerald-900 flex items-center gap-1.5">
                  <Wallet size={16} className="text-emerald-700" /> Tesouraria (Sangrias em Dinheiro)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-600 mb-1">Data Inicial</label>
                    <input 
                      type="date" 
                      value={dataInicioTesouraria} 
                      onChange={e => setDataInicioTesouraria(e.target.value)} 
                      className="w-full p-2 border rounded-lg bg-white" 
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-600 mb-1">Hora Inicial</label>
                    <input 
                      type="time" 
                      value={horaInicioTesouraria} 
                      onChange={e => setHoraInicioTesouraria(e.target.value)} 
                      className="w-full p-2 border rounded-lg bg-white font-semibold text-emerald-950" 
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-600 mb-1">Data Final</label>
                    <input 
                      type="date" 
                      value={dataFimTesouraria} 
                      onChange={e => setDataFimTesouraria(e.target.value)} 
                      className="w-full p-2 border rounded-lg bg-white" 
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-600 mb-1">Hora Final</label>
                    <input 
                      type="time" 
                      value={horaFimTesouraria} 
                      onChange={e => setHoraFimTesouraria(e.target.value)} 
                      className="w-full p-2 border rounded-lg bg-white font-semibold text-emerald-950" 
                    />
                  </div>
                </div>
              </div>

              {/* BLOCO DE FILTROS DOS DEPÓSITOS BANCÁRIOS */}
              <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-200 space-y-3">
                <h4 className="font-extrabold text-xs uppercase text-indigo-950 flex items-center gap-1.5">
                  <Landmark size={16} className="text-indigo-700" /> Depósitos Bancários (Operação no Banco)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-600 mb-1">Data Inicial</label>
                    <input 
                      type="date" 
                      value={dataInicioDepositos} 
                      onChange={e => setDataInicioDepositos(e.target.value)} 
                      className="w-full p-2 border rounded-lg bg-white" 
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-600 mb-1">Hora Inicial</label>
                    <input 
                      type="time" 
                      value={horaInicioDepositos} 
                      onChange={e => setHoraInicioDepositos(e.target.value)} 
                      className="w-full p-2 border rounded-lg bg-white font-semibold text-indigo-950" 
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-600 mb-1">Data Final</label>
                    <input 
                      type="date" 
                      value={dataFimDepositos} 
                      onChange={e => setDataFimDepositos(e.target.value)} 
                      className="w-full p-2 border rounded-lg bg-white" 
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-600 mb-1">Hora Final</label>
                    <input 
                      type="time" 
                      value={horaFimDepositos} 
                      onChange={e => setHoraFimDepositos(e.target.value)} 
                      className="w-full p-2 border rounded-lg bg-white font-semibold text-indigo-950" 
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={gerarRelatorio} 
                disabled={loading} 
                className="bg-primary hover:bg-blue-900 text-white font-bold py-2.5 px-10 rounded-lg shadow text-xs flex items-center gap-2"
              >
                <Search size={14} /> {loading ? "Processando..." : "Gerar Relatório de Numerários"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PRÉ-VISUALIZAÇÃO DOS RESULTADOS */}
      {gerado && (
        tipoRelatorio === 'numerarios' ? (
          <div className="space-y-6 pt-4 border-t">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* TABELA ESQUERDA: SANGRIAS TESOURARIA */}
              <div className="border rounded-xl p-4 bg-gray-50/50 space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="font-extrabold text-xs uppercase text-emerald-800">
                    Entradas Tesouraria (Sangrias Dinheiro)
                  </h4>
                  <span className="font-black text-emerald-700 text-sm">{formatarMoeda(totalSangrias)}</span>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-emerald-100 text-emerald-950 font-bold uppercase text-[10px]">
                        <th className="p-2">Data/Hora Reg.</th>
                        <th className="p-2">Responsável</th>
                        <th className="p-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {dadosSangrias.length === 0 ? (
                        <tr><td colSpan="3" className="p-4 text-center text-gray-400 italic">Nenhum registro dentro da janela de data/hora informada.</td></tr>
                      ) : (
                        dadosSangrias.map(s => (
                          <tr key={s.id} className="hover:bg-white">
                            <td className="p-2 font-medium">
                              {formatarData(s.data_operacao)} {s.data_lancamento?.includes(',') ? s.data_lancamento.split(',')[1]?.trim() : ''}
                            </td>
                            <td className="p-2">{s.responsavel}</td>
                            <td className="p-2 text-right font-bold text-emerald-700">{formatarMoeda(s.valor)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TABELA DIREITA: DEPÓSITOS BANCÁRIOS */}
              <div className="border rounded-xl p-4 bg-gray-50/50 space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="font-extrabold text-xs uppercase text-indigo-900">
                    Saídas para Banco (Depósitos Efetuados)
                  </h4>
                  <span className="font-black text-indigo-900 text-sm">{formatarMoeda(totalDepositos)}</span>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-indigo-100 text-indigo-950 font-bold uppercase text-[10px]">
                        <th className="p-2">Data/Hora Op.</th>
                        <th className="p-2">Banco/Conta</th>
                        <th className="p-2">Depositante</th>
                        <th className="p-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {dadosDepositos.length === 0 ? (
                        <tr><td colSpan="4" className="p-4 text-center text-gray-400 italic">Nenhum registro dentro da janela de data/hora informada.</td></tr>
                      ) : (
                        dadosDepositos.map(d => (
                          <tr key={d.id} className="hover:bg-white">
                            <td className="p-2 font-medium">{formatarData(d.data_operacao || d.data_deposito)} {d.hora_operacao || ''}</td>
                            <td className="p-2">{d.banco} ({d.conta})</td>
                            <td className="p-2 truncate max-w-[120px]">{d.nome_depositante || '-'}</td>
                            <td className="p-2 text-right font-bold text-indigo-900">{formatarMoeda(d.valor_depositado)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* QUADRO DE RESUMO */}
            <div className="flex justify-end pt-2">
              <div className="w-80 bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-700 font-semibold">
                  <span>Total Sangrias (Tesouraria):</span>
                  <span className="font-bold text-emerald-700">{formatarMoeda(totalSangrias)}</span>
                </div>
                <div className="flex justify-between text-gray-700 font-semibold">
                  <span>Total Depósitos Bancários:</span>
                  <span className="font-bold text-indigo-900">{formatarMoeda(totalDepositos)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-2 font-black text-sm text-[#003366]">
                  <span>Saldo / Diferença:</span>
                  <span className={saldoNumerarios >= 0 ? 'text-[#003366]' : 'text-red-600'}>{formatarMoeda(saldoNumerarios)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto pt-4 border-t">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-500 uppercase font-bold">
                  <th className="p-3">Data Operação</th>
                  <th className="p-3">Responsável</th>
                  <th className="p-3">Data/Hora Lançamento</th>
                  <th className="p-3">Tipo Documento</th>
                  <th className="p-3">Forma Pagamento</th>
                  <th className="p-3">Banco / Operador</th>
                  <th className="p-3">Tipo Operação</th>
                  <th className="p-3 text-right">Valor</th>
                  <th className="p-3">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dados.length === 0 ? (
                  <tr><td colSpan="9" className="p-6 text-center text-gray-400 italic">Nenhum registro encontrado para os filtros selecionados.</td></tr>
                ) : (
                  dados.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="p-3 font-semibold text-gray-700">{formatarData(r.data_operacao)}</td>
                      <td className="p-3 text-gray-600">{r.responsavel}</td>
                      <td className="p-3 text-gray-500">{r.data_lancamento}</td>
                      <td className="p-3 font-bold text-gray-800">{r.tipo_documento}</td>
                      <td className="p-3 text-gray-600">{r.forma_pagamento}</td>
                      <td className="p-3 font-semibold text-indigo-900">{r.banco_operador}</td>
                      <td className="p-3 font-extrabold">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${r.tipo_operacao.includes('Entrada') ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {r.tipo_operacao}
                        </span>
                      </td>
                      <td className={`p-3 text-right font-black ${r.tipo_operacao.includes('Entrada') ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatarMoeda(r.valor)}
                      </td>
                      <td className="p-3 text-gray-600">{r.descricao || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )
      )}

    </div>
  );
}