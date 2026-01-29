import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { FileText, DollarSign, Clock, CheckCircle, AlertCircle, TrendingDown, TrendingUp, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { startOfMonth, endOfMonth, format } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#FF6B6B', '#4ECDC4'];

export default function Dashboard() {
  // Configuração Inicial: Data de Hoje
  const dataHoje = new Date();
  
  // Estado dos Filtros (Inicia com o Mês Atual Completo)
  const [datas, setDatas] = useState({
    inicio: format(startOfMonth(dataHoje), 'yyyy-MM-dd'),
    fim: format(endOfMonth(dataHoje), 'yyyy-MM-dd')
  });

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

  // Carrega os dados ao entrar na tela (Montagem)
  useEffect(() => {
    buscarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Array vazio = só executa 1x ao montar. Depois só no botão Filtrar.

  const handleDataChange = (e) => {
    setDatas({ ...datas, [e.target.name]: e.target.value });
  };

  const buscarDados = async () => {
    if(!datas.inicio || !datas.fim) {
        alert("Por favor, selecione ambas as datas.");
        return;
    }

    setLoading(true);

    // Buscar lançamentos filtrados por data de vencimento
    const { data, error } = await supabase
      .from('lancamentos')
      .select(`
        *,
        tipos_documento (descricao)
      `)
      .gte('data_vencimento', datas.inicio)
      .lte('data_vencimento', datas.fim);

    if (error) {
        alert('Erro ao carregar dashboard: ' + error.message);
        setLoading(false);
        return;
    }

    // Processar Cálculos no Frontend
    let totais = {
        totalDocs: data.length,
        valorTotal: 0,
        valorPendente: 0,
        valorPago: 0,
        juros: 0,
        desconto: 0,
        pagosEmDia: 0,
        pagosEmAtraso: 0
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

            if ((l.dias_atraso || 0) > 0) {
                totais.pagosEmAtraso += valorPago;
            } else {
                totais.pagosEmDia += valorPago;
            }

        } else {
            totais.valorPendente += valor;
        }

        // Dados para Gráficos
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

      {/* --- ÁREA DE FILTROS (DATA RANGE) --- */}
      <div className="flex flex-col md:flex-row gap-4 items-end bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
        
        {/* Data Inicial */}
        <div className="w-full md:w-auto">
            <label className="block text-sm font-bold text-gray-700 mb-1">Data Inicial</label>
            <input 
                type="date" 
                name="inicio"
                value={datas.inicio}
                onChange={handleDataChange}
                className="p-2 border border-gray-300 rounded-lg w-full md:w-48 text-gray-700 focus:ring-2 focus:ring-primary outline-none"
            />
        </div>

        {/* Data Final */}
        <div className="w-full md:w-auto">
            <label className="block text-sm font-bold text-gray-700 mb-1">Data Final</label>
            <input 
                type="date" 
                name="fim"
                value={datas.fim}
                onChange={handleDataChange}
                className="p-2 border border-gray-300 rounded-lg w-full md:w-48 text-gray-700 focus:ring-2 focus:ring-primary outline-none"
            />
        </div>

        {/* Botão Filtrar */}
        <button 
            onClick={buscarDados}
            className="w-full md:w-auto bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 shadow-md"
        >
            <Search size={20} />
            Filtrar
        </button>
      </div>

      {loading ? (
          <div className="text-center py-20 text-gray-500 text-lg flex flex-col items-center">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
             Calculando indicadores...
          </div>
      ) : (
        <>
            {/* --- CARDS LINHA 1 (PRINCIPAIS) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500 flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-gray-500 text-sm font-semibold mb-1">Total Documentos</p>
                        <h3 className="text-3xl font-bold text-gray-800">{resumo.totalDocs}</h3>
                    </div>
                    <div className="absolute right-4 top-4 bg-blue-50 p-3 rounded-full text-blue-500 group-hover:bg-blue-100 transition-colors"><FileText size={24} /></div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500 flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-gray-500 text-sm font-semibold mb-1">Valor Total</p>
                        <h3 className="text-2xl font-bold text-gray-800">{formatarMoeda(resumo.valorTotal)}</h3>
                    </div>
                    <div className="absolute right-4 top-4 bg-green-50 p-3 rounded-full text-green-500 group-hover:bg-green-100 transition-colors"><DollarSign size={24} /></div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-500 flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-gray-500 text-sm font-semibold mb-1">Valor Pendente</p>
                        <h3 className="text-2xl font-bold text-yellow-600">{formatarMoeda(resumo.valorPendente)}</h3>
                    </div>
                    <div className="absolute right-4 top-4 bg-yellow-50 p-3 rounded-full text-yellow-600 group-hover:bg-yellow-100 transition-colors"><Clock size={24} /></div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-800 flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-gray-500 text-sm font-semibold mb-1">Valor Pago</p>
                        <h3 className="text-2xl font-bold text-blue-900">{formatarMoeda(resumo.valorPago)}</h3>
                    </div>
                    <div className="absolute right-4 top-4 bg-blue-50 p-3 rounded-full text-blue-800 group-hover:bg-blue-100 transition-colors"><CheckCircle size={24} /></div>
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
                    <p className="text-gray-500 text-sm font-semibold">Desc/Abatimento</p>
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