import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import { ArrowDownCircle, CreditCard, Building, Users } from 'lucide-react';
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#e57373', '#ba68c8'];

export default function DashboardTab() {
  const [despesas, setDespesas] = useState([]);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [grupos, setGrupos] = useState([]);

  const anoAtual = new Date().getFullYear();
  const [filtroAno, setFiltroAno] = useState(anoAtual);
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth());
  const [filtroCC, setFiltroCC] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState('');

  const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    const [resDesp, resCC, resGrupos] = await Promise.all([
      supabase.from('despesas').select('*, centros_custo(sigla), grupos_despesa(descricao), contas_despesa(descricao), fornecedores(nome)'),
      supabase.from('centros_custo').select('*'),
      supabase.from('grupos_despesa').select('*')
    ]);
    setDespesas(resDesp.data || []);
    setCentrosCusto(resCC.data || []);
    setGrupos(resGrupos.data || []);
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

  // --- DADOS DOS GRÁFICOS ---
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
      let nome = nomeFallback;
      if (typeof chave === 'string') {
        nome = d[chave] || nomeFallback;
      } else if (typeof chave === 'function') {
        nome = chave(d) || nomeFallback;
      }
      agrupado[nome] = (agrupado[nome] || 0) + Number(d.valor);
    });
    return Object.keys(agrupado).map(k => ({ name: k, value: agrupado[k] }));
  };

  // 1. Saídas por Forma de Pagamento
  const dadosFormaPagamento = useMemo(() => {
    return agruparPor('forma_pagamento', 'Não Informado');
  }, [despesasFiltradas]);

  // 2. Saídas por Origem
  const dadosOrigem = useMemo(() => {
    return agruparPor('origem', 'Não Informado');
  }, [despesasFiltradas]);

  // 3. Top 5 Fornecedores / Prestadores
  const rankingFornecedores = useMemo(() => {
    const agrupado = agruparPor(d => d.fornecedores?.nome, 'Outros');
    return agrupado
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Pega apenas os 5 maiores
  }, [despesasFiltradas]);

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      
      {/* FILTROS */}
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
        <div className="bg-white p-6 rounded-xl border h-80">
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

        <div className="bg-white p-6 rounded-xl border h-80">
          <h3 className="font-bold text-gray-700 mb-4">Por Centro de Custo</h3>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie data={agruparPor(d => d.centros_custo?.sigla, 'Sem CC')} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {agruparPor(d => d.centros_custo?.sigla, '').map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v)=>formatarMoeda(v)}/>
              <Legend verticalAlign="bottom"/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRÁFICOS LINHA 2 (NOVOS: FORMA DE PAGAMENTO E ORIGEM) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Forma de Pagamento */}
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

        {/* Origem */}
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

      {/* GRÁFICOS LINHA 3 (RANKING DE FORNECEDORES) */}
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