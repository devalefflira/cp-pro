import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import { ArrowDownCircle, CreditCard, Building, Users, RefreshCw, ChevronRight } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#e57373', '#ba68c8', '#4db6ac'];

export default function DashboardTab() {
  const [despesas, setDespesas] = useState([]);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [contas, setContas] = useState([]);

  const anoAtual = new Date().getFullYear();
  const [filtroAno, setFiltroAno] = useState(anoAtual);
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth());
  const [filtroCC, setFiltroCC] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState('');

  // Estados para Navegação Drill-Down no Gráfico
  const [ccSelecionadoDrill, setCcSelecionadoDrill] = useState(null); // Objeto do CC selecionado
  const [grupoSelecionadoDrill, setGrupoSelecionadoDrill] = useState(null); // Objeto do Grupo selecionado

  const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    const [resDesp, resCC, resGrupos, resContas] = await Promise.all([
      supabase.from('despesas').select('*, centros_custo(id, sigla, descricao), grupos_despesa(id, codigo, descricao), contas_despesa(id, codigo, descricao), fornecedores(nome)'),
      supabase.from('centros_custo').select('*'),
      supabase.from('grupos_despesa').select('*'),
      supabase.from('contas_despesa').select('*')
    ]);
    setDespesas(resDesp.data || []);
    setCentrosCusto(resCC.data || []);
    setGrupos(resGrupos.data || []);
    setContas(resContas.data || []);
  };

  const despesasFiltradas = useMemo(() => {
    return despesas.filter(d => {
      if (!d.data_pagamento) return false;
      const dataPgto = new Date(d.data_pagamento + 'T12:00:00');
      if (dataPgto.getFullYear() !== filtroAno) return false;
      if (filtroMes !== null && dataPgto.getMonth() !== filtroMes) return false;
      if (filtroCC && d.centro_custo_id !== Number(filtroCC)) return false;
      if (filtroGrupo && d.grupo_id !== Number(filtroGrupo)) return false;
      return true;
    });
  }, [despesas, filtroAno, filtroMes, filtroCC, filtroGrupo]);

  const totalDespesas = despesasFiltradas.reduce((acc, curr) => acc + Number(curr.valor), 0);

  // --- GRÁFICO 1: POR CENTRO DE CUSTO ---
  const dadosCentroCusto = useMemo(() => {
    const agrupado = {};
    despesasFiltradas.forEach(d => {
      const cc = d.centros_custo;
      const key = cc ? `${cc.sigla}` : 'Sem CC';
      if (!agrupado[key]) {
        agrupado[key] = {
          name: key,
          fullName: cc ? `${cc.sigla} - ${cc.descricao}` : 'Sem CC',
          value: 0,
          rawObj: cc
        };
      }
      agrupado[key].value += Number(d.valor);
    });
    return Object.values(agrupado);
  }, [despesasFiltradas]);

  // --- GRÁFICO DRILL-DOWN NÍVEL 2: POR GRUPO (DO CC SELECIONADO) ---
  const dadosGruposDrill = useMemo(() => {
    if (!ccSelecionadoDrill) return [];
    const despDoCC = despesasFiltradas.filter(d => d.centro_custo_id === ccSelecionadoDrill.id);
    const agrupado = {};
    despDoCC.forEach(d => {
      const g = d.grupos_despesa;
      const key = g ? g.descricao : 'Outros';
      if (!agrupado[key]) {
        agrupado[key] = {
          name: key,
          fullName: g ? `${g.codigo} - ${g.descricao}` : key,
          value: 0,
          rawObj: g
        };
      }
      agrupado[key].value += Number(d.valor);
    });
    return Object.values(agrupado);
  }, [despesasFiltradas, ccSelecionadoDrill]);

  const totalGruposDrill = useMemo(() => dadosGruposDrill.reduce((a, b) => a + b.value, 0), [dadosGruposDrill]);

  // --- GRÁFICO DRILL-DOWN NÍVEL 3: POR CONTA (DO GRUPO SELECIONADO) ---
  const dadosContasDrill = useMemo(() => {
    if (!grupoSelecionadoDrill) return [];
    const despDoGrupo = despesasFiltradas.filter(d => d.grupo_id === grupoSelecionadoDrill.id);
    const agrupado = {};
    despDoGrupo.forEach(d => {
      const c = d.contas_despesa;
      const key = c ? c.descricao : 'Outros';
      if (!agrupado[key]) {
        agrupado[key] = {
          name: key,
          fullName: c ? `${c.codigo} - ${c.descricao}` : key,
          value: 0
        };
      }
      agrupado[key].value += Number(d.valor);
    });
    return Object.values(agrupado);
  }, [despesasFiltradas, grupoSelecionadoDrill]);

  const totalContasDrill = useMemo(() => dadosContasDrill.reduce((a, b) => a + b.value, 0), [dadosContasDrill]);

  // Outros Agrupamentos
  const dadosEvolucao = useMemo(() => {
    const despAno = despesas.filter(d => d.data_pagamento && new Date(d.data_pagamento + 'T12:00:00').getFullYear() === filtroAno);
    const agrupado = {};
    meses.forEach(m => agrupado[m] = 0);
    despAno.forEach(d => {
      const mes = new Date(d.data_pagamento + 'T12:00:00').getMonth();
      agrupado[meses[mes]] += Number(d.valor);
    });
    return Object.keys(agrupado).map(k => ({ name: k, Valor: agrupado[k] }));
  }, [despesas, filtroAno]);

  const agruparPor = (chave, nomeFallback) => {
    const agrupado = {};
    despesasFiltradas.forEach(d => {
      const nome = (typeof chave === 'function' ? chave(d) : d[chave]) || nomeFallback;
      agrupado[nome] = (agrupado[nome] || 0) + Number(d.valor);
    });
    return Object.keys(agrupado).map(k => ({ name: k, value: agrupado[k] }));
  };

  const dadosFormaPagamento = useMemo(() => agruparPor('forma_pagamento', 'Não Informado'), [despesasFiltradas]);
  const dadosOrigem = useMemo(() => agruparPor('origem', 'Não Informado'), [despesasFiltradas]);
  
  const rankingFornecedores = useMemo(() => {
    return agruparPor(d => d.fornecedores?.nome, 'Outros')
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [despesasFiltradas]);

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Renderizador da legenda com Tooltip nativo (Exibe nome completo no hover)
  const renderCustomLegend = (props) => {
    const { payload } = props;
    return (
      <ul className="flex flex-wrap justify-center gap-2 text-xs mt-2">
        {payload.map((entry, index) => {
          const item = dadosCentroCusto[index] || {};
          return (
            <li 
              key={`item-${index}`} 
              className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
              title={item.fullName || entry.value}
            >
              <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: entry.color }}></span>
              <span className="font-semibold text-gray-700">{entry.value}</span>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* FILTROS DE PERÍODO E CATEGORIA */}
      <div className="space-y-4">
        <div className="bg-gray-50 p-2 rounded-xl border flex flex-col xl:flex-row justify-between gap-4">
          <div className="flex bg-gray-200 rounded-full p-1">
            <button onClick={() => setFiltroAno(anoAtual)} className={`px-6 py-1.5 rounded-full text-sm font-bold ${filtroAno === anoAtual ? 'bg-slate-500 text-white shadow' : 'text-slate-500'}`}>Este ano</button>
            <button onClick={() => setFiltroAno(anoAtual - 1)} className={`px-6 py-1.5 rounded-full text-sm font-bold ${filtroAno === anoAtual - 1 ? 'bg-slate-500 text-white shadow' : 'text-slate-500'}`}>Ano anterior</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {meses.map((m, i) => (
              <button key={m} onClick={() => setFiltroMes(prev => prev === i ? null : i)} className={`px-4 py-1.5 rounded-full text-xs font-bold border ${filtroMes === i ? 'bg-slate-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>{m}</button>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border flex gap-4">
          <select className="flex-1 p-2 border rounded text-sm" value={filtroCC} onChange={e => {setFiltroCC(e.target.value); setFiltroGrupo('');}}>
            <option value="">Todos Centros de Custo</option>
            {centrosCusto.map(cc => <option key={cc.id} value={cc.id}>{cc.sigla} - {cc.descricao}</option>)}
          </select>
          <select className="flex-1 p-2 border rounded text-sm disabled:opacity-50" value={filtroGrupo} onChange={e => setFiltroGrupo(e.target.value)} disabled={!filtroCC}>
            <option value="">Todos Grupos</option>
            {grupos.filter(g => g.centro_custo_id === Number(filtroCC)).map(g => <option key={g.id} value={g.id}>{g.descricao}</option>)}
          </select>
        </div>
      </div>

      {/* CARD TOTALIZADOR */}
      <div className="bg-white p-6 rounded-xl border shadow-sm relative overflow-hidden flex flex-col justify-center">
        <div className="absolute top-0 right-0 p-4 opacity-10 text-red-600"><ArrowDownCircle size={64}/></div>
        <h3 className="text-gray-500 font-semibold mb-1 text-sm uppercase">Total de Despesas (Filtro)</h3>
        <p className="text-4xl font-bold text-red-600">{formatarMoeda(totalDespesas)}</p>
      </div>

      {/* GRÁFICOS LINHA 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border h-96">
          <h3 className="font-bold text-gray-700 mb-4">Evolução Mensal ({filtroAno})</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={dadosEvolucao}>
              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="name" fontSize={12}/>
              <YAxis fontSize={12} tickFormatter={(v)=>`R$${v/1000}k`}/>
              <Tooltip formatter={(v)=>formatarMoeda(v)}/>
              <Bar dataKey="Valor" fill="#003366" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* GRÁFICO DE CENTROS DE CUSTO COM TOOLTIP PERCENTUAL E HOVER LEGENDA */}
        <div className="bg-white p-6 rounded-xl border h-96 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-gray-700">Por Centro de Custo</h3>
            <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">Clique na fatia para detalhar</span>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie 
                data={dadosCentroCusto} 
                cx="50%" 
                cy="45%" 
                innerRadius={55} 
                outerRadius={75} 
                paddingAngle={4} 
                dataKey="value"
                onClick={(entry) => {
                  if (entry && entry.rawObj) {
                    setCcSelecionadoDrill(entry.rawObj);
                    setGrupoSelecionadoDrill(null); // reseta o 3º nível
                  }
                }}
                className="cursor-pointer"
              >
                {dadosCentroCusto.map((e, i) => (
                  <Cell 
                    key={i} 
                    fill={COLORS[i % COLORS.length]} 
                    stroke={ccSelecionadoDrill?.id === e.rawObj?.id ? '#000' : 'none'}
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => {
                  const perc = totalDespesas > 0 ? ((value / totalDespesas) * 100).toFixed(1) : 0;
                  return [`${formatarMoeda(value)} (${perc}%)`, 'Valor'];
                }}
                labelFormatter={(label) => {
                  const found = dadosCentroCusto.find(d => d.name === label);
                  return found ? found.fullName : label;
                }}
              />
              <Legend content={renderCustomLegend} verticalAlign="bottom"/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- SEÇÃO DRILL-DOWN INTERATIVA (EXIBIDA AO CLICAR NO GRÁFICO PAI) --- */}
      {ccSelecionadoDrill && (
        <div className="bg-blue-50/40 p-6 rounded-2xl border-2 border-blue-200 space-y-6">
          <div className="flex justify-between items-center border-b border-blue-200 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-900">
              <span className="bg-blue-600 text-white px-2 py-0.5 rounded">{ccSelecionadoDrill.sigla}</span>
              <span>{ccSelecionadoDrill.descricao}</span>
              {grupoSelecionadoDrill && (
                <>
                  <ChevronRight size={16} className="text-gray-400"/>
                  <span className="bg-indigo-600 text-white px-2 py-0.5 rounded">{grupoSelecionadoDrill.descricao}</span>
                </>
              )}
            </div>
            <button 
              onClick={() => { setCcSelecionadoDrill(null); setGrupoSelecionadoDrill(null); }}
              className="text-xs bg-white text-gray-600 hover:text-red-600 px-3 py-1 rounded border font-semibold shadow-sm transition-colors"
            >
              Fechar Detalhamento
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* GRÁFICO FILHO 1: GRUPOS DO CENTRO DE CUSTO SELECIONADO */}
            <div className="bg-white p-5 rounded-xl border h-80">
              <h4 className="font-bold text-gray-700 text-sm mb-3">
                Grupos em {ccSelecionadoDrill.sigla}
              </h4>
              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie 
                    data={dadosGruposDrill} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={45} 
                    outerRadius={65} 
                    paddingAngle={3} 
                    dataKey="value"
                    onClick={(entry) => {
                      if (entry && entry.rawObj) setGrupoSelecionadoDrill(entry.rawObj);
                    }}
                    className="cursor-pointer"
                  >
                    {dadosGruposDrill.map((e, i) => (
                      <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val) => {
                      const perc = totalGruposDrill > 0 ? ((val / totalGruposDrill) * 100).toFixed(1) : 0;
                      return [`${formatarMoeda(val)} (${perc}%)`, 'Valor'];
                    }}
                  />
                  <Legend verticalAlign="bottom"/>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* GRÁFICO FILHO 2: CONTAS DO GRUPO SELECIONADO (NÍVEL 3) */}
            <div className="bg-white p-5 rounded-xl border h-80">
              <h4 className="font-bold text-gray-700 text-sm mb-3">
                {grupoSelecionadoDrill ? `Contas do Grupo: ${grupoSelecionadoDrill.descricao}` : 'Selecione um Grupo ao lado para ver as Contas'}
              </h4>
              {grupoSelecionadoDrill ? (
                <ResponsiveContainer width="100%" height="85%">
                  <PieChart>
                    <Pie data={dadosContasDrill} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                      {dadosContasDrill.map((e, i) => (
                        <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val) => {
                        const perc = totalContasDrill > 0 ? ((val / totalContasDrill) * 100).toFixed(1) : 0;
                        return [`${formatarMoeda(val)} (${perc}%)`, 'Valor'];
                      }}
                    />
                    <Legend verticalAlign="bottom"/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
                  Clique em um Grupo no gráfico ao lado para visualizar a distribuição por Contas.
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* GRÁFICOS LINHA 2: FORMA DE PAGAMENTO E ORIGEM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border h-80">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <CreditCard size={18} className="text-indigo-600" />
            Saídas por Forma de Pagamento
          </h3>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie data={dadosFormaPagamento} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3} dataKey="value">
                {dadosFormaPagamento.map((e, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v)=>formatarMoeda(v)}/>
              <Legend verticalAlign="bottom"/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl border h-80">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Building size={18} className="text-emerald-600" />
            Saídas por Origem
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={dadosOrigem}>
              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="name" fontSize={12}/>
              <YAxis fontSize={12}/>
              <Tooltip formatter={(v)=>formatarMoeda(v)}/>
              <Bar dataKey="value" fill="#10B981" radius={[4,4,0,0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RANKING DE FORNECEDORES */}
      <div className="bg-white p-6 rounded-xl border">
        <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Users size={18} className="text-blue-600" />
          Top 5 Fornecedores / Prestadores no Período
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rankingFornecedores} layout="vertical" margin={{ left: 80, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
              <XAxis type="number" fontSize={12} tickFormatter={(v)=>`R$${v}`}/>
              <YAxis dataKey="name" type="category" fontSize={12} width={160}/>
              <Tooltip formatter={(v)=>formatarMoeda(v)}/>
              <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={25} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}