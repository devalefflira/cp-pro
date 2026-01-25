import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { FileText, DollarSign, Clock, CheckCircle, AlertCircle, Percent, TrendingDown, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#FF6B6B', '#4ECDC4'];
const MESES = [
  { id: 0, nome: 'jan' }, { id: 1, nome: 'fev' }, { id: 2, nome: 'mar' }, { id: 3, nome: 'abr' },
  { id: 4, nome: 'mai' }, { id: 5, nome: 'jun' }, { id: 6, nome: 'jul' }, { id: 7, nome: 'ago' },
  { id: 8, nome: 'set' }, { id: 9, nome: 'out' }, { id: 10, nome: 'nov' }, { id: 11, nome: 'dez' }
];

export default function Dashboard() {
  // Estado dos Filtros
  const dataAtual = new Date();
  const [anoSelecionado, setAnoSelecionado] = useState(dataAtual.getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState(dataAtual.getMonth()); // Começa com o mês atual

  // Estado dos Dados
  const [resumo, setResumo] = useState({
    totalDocs: 0,
    valorTotal: 0,
    valorPendente: 0,
    valorPago: 0,
    juros: 0,
    desconto: 0,
    pagosEmDia: 0,
    pagosEmAtraso: 0
  });
  const [dadosGraficoBarra, setDadosGraficoBarra] = useState([]);
  const [dadosGraficoPizza, setDadosGraficoPizza] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    buscarDados();
  }, [anoSelecionado, mesSelecionado]);

  // Lógica de Troca de Ano (Regra de Negócio: Ao ir para Ano Anterior, seleciona JAN)
  const handleTrocaAno = (novoAno) => {
    setAnoSelecionado(novoAno);
    if (novoAno === dataAtual.getFullYear() - 1) {
        setMesSelecionado(0); // Seleciona Janeiro
    } else {
        // Se voltar para o ano atual, volta para o mês atual
        setMesSelecionado(dataAtual.getMonth());
    }
  };

  // Lógica de Troca de Mês (Clicar no mesmo mês desmarca)
  const handleTrocaMes = (mesId) => {
    if (mesSelecionado === mesId) {
        setMesSelecionado(null); // Desmarca para ver o ano todo
    } else {
        setMesSelecionado(mesId);
    }
  };

  const buscarDados = async () => {
    setLoading(true);

    // 1. Definir o range de datas
    let dataInicio, dataFim;
    const dataBase = new Date(anoSelecionado, mesSelecionado !== null ? mesSelecionado : 0, 1);

    if (mesSelecionado !== null) {
        // Filtro por Mês Específico
        dataInicio = startOfMonth(dataBase).toISOString();
        dataFim = endOfMonth(dataBase).toISOString();
    } else {
        // Filtro pelo Ano Inteiro
        dataInicio = startOfYear(new Date(anoSelecionado, 0, 1)).toISOString();
        dataFim = endOfYear(new Date(anoSelecionado, 0, 1)).toISOString();
    }

    // 2. Buscar lançamentos brutos no Supabase
    const { data, error } = await supabase
      .from('lancamentos')
      .select(`
        *,
        tipos_documento (descricao)
      `)
      .gte('data_vencimento', dataInicio)
      .lte('data_vencimento', dataFim);

    if (error) {
        alert('Erro ao carregar dashboard');
        setLoading(false);
        return;
    }

    // 3. Processar Cálculos no Frontend
    let totais = {
        totalDocs: data.length,
        valorTotal: 0,
        valorPendente: 0,
        valorPago: 0,
        juros: 0,
        desconto: 0,
        pagosEmDia: 0, // Soma de valor
        pagosEmAtraso: 0 // Soma de valor
    };

    const mapTiposQtd = {};
    const mapTiposValor = {};

    data.forEach(l => {
        const valor = Number(l.valor);
        const valorPago = Number(l.valor_pago || 0);
        
        totais.valorTotal += valor;

        // Pendente vs Pago
        if (l.status === 'Pago') {
            totais.valorPago += valorPago;
            totais.juros += Number(l.juros || 0);
            totais.desconto += Number(l.desconto || 0);

            // Em dia vs Atraso (Baseado na coluna dias_atraso)
            if ((l.dias_atraso || 0) > 0) {
                totais.pagosEmAtraso += valorPago; // Soma o valor pago com atraso
            } else {
                totais.pagosEmDia += valorPago; // Soma o valor pago em dia
            }

        } else {
            totais.valorPendente += valor;
        }

        // Gráficos
        const tipo = l.tipos_documento?.descricao || 'Outros';
        
        // Qtd
        if (!mapTiposQtd[tipo]) mapTiposQtd[tipo] = 0;
        mapTiposQtd[tipo]++;

        // Valor
        if (!mapTiposValor[tipo]) mapTiposValor[tipo] = 0;
        mapTiposValor[tipo] += valor;
    });

    setResumo(totais);

    // Formatar para Recharts
    const arrayBarra = Object.keys(mapTiposQtd).map(tipo => ({ name: tipo, quantidade: mapTiposQtd[tipo] }));
    const arrayPizza = Object.keys(mapTiposValor).map(tipo => ({ name: tipo, value: mapTiposValor[tipo] }));

    setDadosGraficoBarra(arrayBarra);
    setDadosGraficoPizza(arrayPizza);
    setLoading(false);
  };

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 pb-10">
      <h2 className="text-3xl font-bold text-primary">Visão Geral</h2>

      {/* --- ÁREA DE FILTROS (ANO E MÊS) --- */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
        
        {/* Seletor de Ano */}
        <div className="flex gap-2">
            <button 
                onClick={() => handleTrocaAno(dataAtual.getFullYear())}
                className={`px-6 py-2 rounded-full font-bold transition-colors ${anoSelecionado === dataAtual.getFullYear() ? 'bg-[#5D6D7E] text-white shadow-lg' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
            >
                Este ano
            </button>
            <button 
                onClick={() => handleTrocaAno(dataAtual.getFullYear() - 1)}
                className={`px-6 py-2 rounded-full font-bold transition-colors ${anoSelecionado === dataAtual.getFullYear() - 1 ? 'bg-[#5D6D7E] text-white shadow-lg' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
            >
                Ano anterior
            </button>
        </div>

        {/* Seletor de Meses */}
        <div className="flex flex-wrap gap-2">
            {MESES.map((m) => (
                <button
                    key={m.id}
                    onClick={() => handleTrocaMes(m.id)}
                    className={`px-3 py-1 text-sm rounded-full font-bold transition-all uppercase ${
                        mesSelecionado === m.id 
                        ? 'bg-[#5D6D7E] text-white shadow' 
                        : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-100'
                    }`}
                >
                    {m.nome}
                </button>
            ))}
        </div>
      </div>

      {loading ? (
          <div className="text-center py-20 text-gray-500">Calculando indicadores...</div>
      ) : (
        <>
            {/* --- CARDS LINHA 1 (PRINCIPAIS) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500 flex flex-col justify-between h-32 relative overflow-hidden">
                    <div>
                        <p className="text-gray-500 text-sm font-semibold mb-1">Total Documentos</p>
                        <h3 className="text-3xl font-bold text-gray-800">{resumo.totalDocs}</h3>
                    </div>
                    <div className="absolute right-4 top-4 bg-blue-50 p-3 rounded-full text-blue-500"><FileText size={24} /></div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500 flex flex-col justify-between h-32 relative overflow-hidden">
                    <div>
                        <p className="text-gray-500 text-sm font-semibold mb-1">Valor Total</p>
                        <h3 className="text-2xl font-bold text-gray-800">{formatarMoeda(resumo.valorTotal)}</h3>
                    </div>
                    <div className="absolute right-4 top-4 bg-green-50 p-3 rounded-full text-green-500"><DollarSign size={24} /></div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-500 flex flex-col justify-between h-32 relative overflow-hidden">
                    <div>
                        <p className="text-gray-500 text-sm font-semibold mb-1">Valor Pendente</p>
                        <h3 className="text-2xl font-bold text-yellow-600">{formatarMoeda(resumo.valorPendente)}</h3>
                    </div>
                    <div className="absolute right-4 top-4 bg-yellow-50 p-3 rounded-full text-yellow-600"><Clock size={24} /></div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-800 flex flex-col justify-between h-32 relative overflow-hidden">
                    <div>
                        <p className="text-gray-500 text-sm font-semibold mb-1">Valor Pago</p>
                        <h3 className="text-2xl font-bold text-blue-900">{formatarMoeda(resumo.valorPago)}</h3>
                    </div>
                    <div className="absolute right-4 top-4 bg-blue-50 p-3 rounded-full text-blue-800"><CheckCircle size={24} /></div>
                </div>
            </div>

            {/* --- CARDS LINHA 2 (DETALHES) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Juros/Multa */}
                <div className="bg-white p-6 rounded-xl shadow-sm border-b-4 border-pink-500 flex flex-col justify-between h-28 relative">
                    <p className="text-gray-500 text-sm font-semibold">Juros/Multa</p>
                    <h3 className="text-xl font-bold text-pink-600">{formatarMoeda(resumo.juros)}</h3>
                    <div className="absolute right-4 top-4 text-pink-200"><TrendingUp size={20} /></div>
                </div>

                {/* Desconto/Abatimento */}
                <div className="bg-white p-6 rounded-xl shadow-sm border-b-4 border-purple-500 flex flex-col justify-between h-28 relative">
                    <p className="text-gray-500 text-sm font-semibold">Descont/Abatimento</p>
                    <h3 className="text-xl font-bold text-purple-600">{formatarMoeda(resumo.desconto)}</h3>
                    <div className="absolute right-4 top-4 text-purple-200"><TrendingDown size={20} /></div>
                </div>

                {/* Pagos em dia */}
                <div className="bg-white p-6 rounded-xl shadow-sm border-b-4 border-green-400 flex flex-col justify-between h-28 relative">
                    <p className="text-gray-500 text-sm font-semibold">Pagos em dia</p>
                    <h3 className="text-xl font-bold text-green-600">{formatarMoeda(resumo.pagosEmDia)}</h3>
                    <div className="absolute right-4 top-4 text-green-200"><CheckCircle size={20} /></div>
                </div>

                {/* Pagos em Atraso */}
                <div className="bg-white p-6 rounded-xl shadow-sm border-b-4 border-red-400 flex flex-col justify-between h-28 relative">
                    <p className="text-gray-500 text-sm font-semibold">Pagos em Atraso</p>
                    <h3 className="text-xl font-bold text-red-600">{formatarMoeda(resumo.pagosEmAtraso)}</h3>
                    <div className="absolute right-4 top-4 text-red-200"><AlertCircle size={20} /></div>
                </div>
            </div>

            {/* --- GRÁFICOS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                
                {/* Gráfico de Barras */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-primary mb-4">Quantidade por Tipo de Documento</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosGraficoBarra}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{fontSize: 12}} interval={0} />
                        <YAxis />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="quantidade" fill="#0056b3" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                    </ResponsiveContainer>
                </div>
                </div>

                {/* Gráfico de Pizza */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-primary mb-4">Valor por Tipo de Documento</h3>
                <div className="h-64 flex">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={dadosGraficoPizza}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        >
                        {dadosGraficoPizza.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatarMoeda(value)} />
                        <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
                    </PieChart>
                    </ResponsiveContainer>
                </div>
                </div>
            </div>

            {/* --- TABELA RESUMO RÁPIDO --- */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-4">
                <h3 className="text-lg font-bold text-gray-700 mb-4">Resumo Detalhado por Tipo</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                        <tr>
                        <th className="p-3 rounded-l-lg">Tipo</th>
                        <th className="p-3">Qtd</th>
                        <th className="p-3 text-right rounded-r-lg">Valor Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {dadosGraficoPizza.map((d, i) => {
                             const qtd = dadosGraficoBarra.find(b => b.name === d.name)?.quantidade || 0;
                             return (
                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-3 font-medium flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                                        {d.name}
                                    </td>
                                    <td className="p-3 text-gray-600">{qtd}</td>
                                    <td className="p-3 text-right font-bold text-gray-800">{formatarMoeda(d.value)}</td>
                                </tr>
                             )
                        })}
                    </tbody>
                    </table>
                </div>
            </div>
        </>
      )}
    </div>
  );
}