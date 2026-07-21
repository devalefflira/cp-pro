import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { 
  FileText, 
  Users, 
  ExternalLink, 
  Calendar, 
  BarChart2, 
  TrendingUp, 
  TrendingDown 
} from 'lucide-react';
import { 
  subMonths, 
  subYears, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear, 
  format 
} from 'date-fns';

export default function Relatorios() {
  // --- ESTADOS EXISTENTES ---
  const [range, setRange] = useState({ inicio: '', fim: '' });
  const [dia, setDia] = useState('');
  const [filtrosFornecedor, setFiltrosFornecedor] = useState({
    inicio: '', fim: '', status: '', fornecedor_id: ''
  });
  const [listaFornecedores, setListaFornecedores] = useState([]);

  // --- ESTADOS DO NOVO RELATÓRIO COMPARATIVO ---
  const [tipoComparacao, setTipoComparacao] = useState('mes_anterior');
  const [moduloComparacao, setModuloComparacao] = useState('lancamentos'); // 'lancamentos' ou 'despesas'
  const [loadingComparativo, setLoadingComparativo] = useState(false);
  const [dadosBaseComparativo, setDadosBaseComparativo] = useState([]);

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase.from('fornecedores').select('*').order('nome');
      setListaFornecedores(data || []);
    }
    carregar();
  }, []);

  // --- AÇÕES EXISTENTES ---
  
  // 1. Ação Período
  const handleVisualizarPeriodo = () => {
    if (!range.inicio || !range.fim) return alert('Selecione as datas inicial e final!');
    window.open(`/print/periodo?inicio=${range.inicio}&fim=${range.fim}`, '_blank');
  };

  // 2. Ação Diário
  const handleAbrirPreviewDiario = () => {
    if (!dia) return alert("Selecione um dia!");
    window.open(`/print/diario?data=${dia}`, '_blank');
  };

  // 3. Ação Fornecedor
  const handleVisualizarFornecedor = () => {
    if (!filtrosFornecedor.inicio || !filtrosFornecedor.fim) {
      return alert("Selecione o período (Início e Fim)!");
    }
    let url = `/print/fornecedor?inicio=${filtrosFornecedor.inicio}&fim=${filtrosFornecedor.fim}`;
    if (filtrosFornecedor.status) url += `&status=${filtrosFornecedor.status}`;
    if (filtrosFornecedor.fornecedor_id) url += `&fornecedor_id=${filtrosFornecedor.fornecedor_id}`;
    
    window.open(url, '_blank');
  };

  // --- LÓGICA DO NOVO RELATÓRIO COMPARATIVO ---
  useEffect(() => {
    carregarDadosComparativos();
  }, [moduloComparacao]);

  const carregarDadosComparativos = async () => {
    setLoadingComparativo(true);
    const tabela = moduloComparacao === 'lancamentos' ? 'lancamentos' : 'despesas';
    
    const { data, error } = await supabase
      .from(tabela)
      .select('*');

    if (error) {
      console.error('Erro ao carregar dados comparativos:', error);
    } else {
      setDadosBaseComparativo(data || []);
    }
    setLoadingComparativo(false);
  };

  // Cálculo das janelas temporais de comparação
  const intervalos = useMemo(() => {
    const hoje = new Date();

    switch (tipoComparacao) {
      case 'mes_anterior': {
        // Mês atual vs Mês anterior
        const p1Inicio = startOfMonth(hoje);
        const p1Fim = endOfMonth(hoje);
        const p2Inicio = startOfMonth(subMonths(hoje, 1));
        const p2Fim = endOfMonth(subMonths(hoje, 1));
        return {
          labelP1: format(p1Inicio, 'MMM/yyyy'),
          labelP2: format(p2Inicio, 'MMM/yyyy'),
          p1Inicio, p1Fim, p2Inicio, p2Fim
        };
      }
      case 'mes_ano_anterior': {
        // Mês atual vs Mesmo Mês do Ano Anterior
        const p1Inicio = startOfMonth(hoje);
        const p1Fim = endOfMonth(hoje);
        const p2Inicio = startOfMonth(subYears(hoje, 1));
        const p2Fim = endOfMonth(subYears(hoje, 1));
        return {
          labelP1: format(p1Inicio, 'MMM/yyyy'),
          labelP2: format(p2Inicio, 'MMM/yyyy'),
          p1Inicio, p1Fim, p2Inicio, p2Fim
        };
      }
      case 'tri_anterior': {
        // Últimos 3 meses vs 3 meses Anteriores
        const p1Inicio = startOfMonth(subMonths(hoje, 2));
        const p1Fim = endOfMonth(hoje);
        const p2Inicio = startOfMonth(subMonths(hoje, 5));
        const p2Fim = endOfMonth(subMonths(hoje, 3));
        return {
          labelP1: `${format(p1Inicio, 'MMM')} - ${format(p1Fim, 'MMM/yy')}`,
          labelP2: `${format(p2Inicio, 'MMM')} - ${format(p2Fim, 'MMM/yy')}`,
          p1Inicio, p1Fim, p2Inicio, p2Fim
        };
      }
      case 'tri_ano_anterior': {
        // Últimos 3 meses vs Mesmos 3 meses do Ano anterior
        const p1Inicio = startOfMonth(subMonths(hoje, 2));
        const p1Fim = endOfMonth(hoje);
        const p2Inicio = startOfMonth(subYears(subMonths(hoje, 2), 1));
        const p2Fim = endOfMonth(subYears(hoje, 1));
        return {
          labelP1: `${format(p1Inicio, 'MMM')} - ${format(p1Fim, 'MMM/yy')}`,
          labelP2: `${format(p2Inicio, 'MMM')} - ${format(p2Fim, 'MMM/yy')}`,
          p1Inicio, p1Fim, p2Inicio, p2Fim
        };
      }
      case 'ano_vs_ano': {
        // Ano vs Ano
        const p1Inicio = startOfYear(hoje);
        const p1Fim = endOfYear(hoje);
        const p2Inicio = startOfYear(subYears(hoje, 1));
        const p2Fim = endOfYear(subYears(hoje, 1));
        return {
          labelP1: format(p1Inicio, 'yyyy'),
          labelP2: format(p2Inicio, 'yyyy'),
          p1Inicio, p1Fim, p2Inicio, p2Fim
        };
      }
      default:
        return null;
    }
  }, [tipoComparacao]);

  // Totais do comparativo
  const resultadoComparativo = useMemo(() => {
    if (!intervalos || dadosBaseComparativo.length === 0) {
      return { totalP1: 0, totalP2: 0, qtdP1: 0, qtdP2: 0, diferenca: 0, variacaoPerc: 0 };
    }

    const campoData = moduloComparacao === 'lancamentos' ? 'data_vencimento' : 'data_pagamento';

    let totalP1 = 0, qtdP1 = 0;
    let totalP2 = 0, qtdP2 = 0;

    dadosBaseComparativo.forEach(item => {
      const dStr = item[campoData];
      if (!dStr) return;

      const dataItem = new Date(dStr + 'T12:00:00');
      const val = Number(item.valor) || 0;

      if (dataItem >= intervalos.p1Inicio && dataItem <= intervalos.p1Fim) {
        totalP1 += val;
        qtdP1++;
      } else if (dataItem >= intervalos.p2Inicio && dataItem <= intervalos.p2Fim) {
        totalP2 += val;
        qtdP2++;
      }
    });

    const diferenca = totalP1 - totalP2;
    const variacaoPerc = totalP2 > 0 ? ((totalP1 - totalP2) / totalP2) * 100 : 0;

    return { totalP1, totalP2, qtdP1, qtdP2, diferenca, variacaoPerc };
  }, [dadosBaseComparativo, intervalos, moduloComparacao]);

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-10 pb-10">
      <h2 className="text-3xl font-bold text-primary">Relatórios</h2>

      {/* BLOCO 1: TOTAL POR PERÍODO */}
      <section className="bg-white p-6 rounded-lg shadow border border-blue-100">
        <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Calendar className="text-secondary"/> Total por Período
        </h3>
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Data Inicial</label>
            <input type="date" className="p-2 border rounded w-full md:w-auto" value={range.inicio} onChange={e => setRange({...range, inicio: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Data Final</label>
            <input type="date" className="p-2 border rounded w-full md:w-auto" value={range.fim} onChange={e => setRange({...range, fim: e.target.value})} />
          </div>
          <button onClick={handleVisualizarPeriodo} className="bg-[#0f172a] text-white px-6 py-2 rounded flex items-center gap-2 hover:bg-blue-900 shadow-lg transition-transform hover:scale-105">
            <ExternalLink size={18} /> Visualizar Relatório
          </button>
        </div>
      </section>

      {/* BLOCO 2: RELATÓRIO DIÁRIO DETALHADO */}
      <section className="bg-white p-6 rounded-lg shadow border border-blue-100">
        <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <FileText className="text-secondary"/> Relatório Diário Detalhado
        </h3>
        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm text-gray-500 mb-1">Selecione o Dia</label>
            <input type="date" className="w-full p-2 border rounded" value={dia} onChange={(e) => setDia(e.target.value)} />
          </div>
          <button onClick={handleAbrirPreviewDiario} className="bg-[#0f172a] text-white px-6 py-2 rounded flex items-center gap-2 hover:bg-blue-900 shadow-lg transition-transform hover:scale-105">
            <ExternalLink size={18} /> Visualizar Relatório
          </button>
        </div>
      </section>

      {/* BLOCO 3: TOTALIZADOR POR FORNECEDOR */}
      <section className="bg-white p-6 rounded-lg shadow border border-blue-100">
        <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Users className="text-secondary"/> Relatório Totalizador por Fornecedor
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
                <label className="block text-sm text-gray-500 mb-1">Data Inicial</label>
                <input type="date" className="w-full p-2 border rounded" 
                    value={filtrosFornecedor.inicio} 
                    onChange={e => setFiltrosFornecedor({...filtrosFornecedor, inicio: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm text-gray-500 mb-1">Data Final</label>
                <input type="date" className="w-full p-2 border rounded" 
                    value={filtrosFornecedor.fim} 
                    onChange={e => setFiltrosFornecedor({...filtrosFornecedor, fim: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm text-gray-500 mb-1">Status</label>
                <select className="w-full p-2 border rounded" 
                    value={filtrosFornecedor.status} 
                    onChange={e => setFiltrosFornecedor({...filtrosFornecedor, status: e.target.value})}>
                    <option value="">STATUS (Todos)</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Pago">Pago</option>
                </select>
            </div>
            <div>
                <label className="block text-sm text-gray-500 mb-1">Fornecedor</label>
                <select className="w-full p-2 border rounded" 
                    value={filtrosFornecedor.fornecedor_id} 
                    onChange={e => setFiltrosFornecedor({...filtrosFornecedor, fornecedor_id: e.target.value})}>
                    <option value="">Todos Fornecedores</option>
                    {listaFornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
            </div>
            
            <button 
                onClick={handleVisualizarFornecedor}
                className="bg-[#0f172a] text-white px-4 py-2 rounded flex items-center justify-center gap-2 hover:bg-blue-900 shadow-lg transition-transform hover:scale-105"
            >
              <ExternalLink size={18} /> Visualizar Relatório
            </button>
        </div>
      </section>

      {/* BLOCO 4: RELATÓRIO COMPARATIVO (NOVO) */}
      <section className="bg-white p-6 rounded-lg shadow border border-blue-100 space-y-6">
        <h3 className="text-xl font-bold text-gray-700 flex items-center gap-2">
          <BarChart2 className="text-secondary"/> Relatório Comparativo de Gastos
        </h3>

        {/* CONTROLES DE COMPARAÇÃO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Origem dos Dados
            </label>
            <select
              value={moduloComparacao}
              onChange={(e) => setModuloComparacao(e.target.value)}
              className="w-full p-2 border rounded text-sm font-semibold outline-none bg-white"
            >
              <option value="lancamentos">Contas a Pagar (Lançamentos)</option>
              <option value="despesas">Gestão de Despesas (Centros de Custo)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Tipo de Comparação
            </label>
            <select
              value={tipoComparacao}
              onChange={(e) => setTipoComparacao(e.target.value)}
              className="w-full p-2 border rounded text-sm font-semibold outline-none bg-white"
            >
              <option value="mes_anterior">Mês atual vs Mês anterior</option>
              <option value="mes_ano_anterior">Mês atual vs Mesmo Mês do Ano Anterior</option>
              <option value="tri_anterior">Últimos 3 meses vs 3 meses Anteriores</option>
              <option value="tri_ano_anterior">Últimos 3 meses vs Mesmos 3 meses do Ano anterior</option>
              <option value="ano_vs_ano">Ano vs Ano</option>
            </select>
          </div>
        </div>

        {/* PAINEL DE RESULTADOS DA COMPARAÇÃO */}
        {loadingComparativo ? (
          <div className="text-center py-8 text-gray-500">Calculando comparação...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center pt-2">
            
            {/* PERÍODO ANTERIOR / BASE */}
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 text-center">
              <span className="text-xs font-bold uppercase text-gray-400">
                Período Base ({intervalos?.labelP2})
              </span>
              <h4 className="text-2xl font-bold text-gray-700 mt-1">
                {formatarMoeda(resultadoComparativo.totalP2)}
              </h4>
              <p className="text-xs text-gray-400 mt-1">
                {resultadoComparativo.qtdP2} registros
              </p>
            </div>

            {/* CARD CENTRAL DE VARIAÇÃO */}
            <div className="p-5 rounded-lg border border-blue-100 bg-blue-50/30 text-center flex flex-col items-center justify-center">
              <span className="text-xs font-bold uppercase text-gray-500 mb-1">Variação Nominal / %</span>
              
              <div className="flex items-center gap-2">
                {resultadoComparativo.variacaoPerc > 0 ? (
                  <TrendingUp size={24} className="text-red-500" />
                ) : resultadoComparativo.variacaoPerc < 0 ? (
                  <TrendingDown size={24} className="text-green-500" />
                ) : null}

                <span className={`text-2xl font-extrabold ${
                  resultadoComparativo.variacaoPerc > 0 
                    ? 'text-red-600' 
                    : resultadoComparativo.variacaoPerc < 0 
                    ? 'text-green-600' 
                    : 'text-gray-700'
                }`}>
                  {resultadoComparativo.variacaoPerc > 0 ? '+' : ''}
                  {resultadoComparativo.variacaoPerc.toFixed(1)}%
                </span>
              </div>

              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full mt-2 ${
                resultadoComparativo.diferenca > 0 
                  ? 'bg-red-100 text-red-700' 
                  : resultadoComparativo.diferenca < 0 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                Diferença: {resultadoComparativo.diferenca > 0 ? '+' : ''}
                {formatarMoeda(resultadoComparativo.diferenca)}
              </span>
            </div>

            {/* PERÍODO ATUAL */}
            <div className="bg-blue-50/50 p-5 rounded-lg border border-blue-200 text-center">
              <span className="text-xs font-bold uppercase text-primary">
                Período Atual ({intervalos?.labelP1})
              </span>
              <h4 className="text-2xl font-bold text-primary mt-1">
                {formatarMoeda(resultadoComparativo.totalP1)}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {resultadoComparativo.qtdP1} registros
              </p>
            </div>

          </div>
        )}
      </section>

    </div>
  );
}