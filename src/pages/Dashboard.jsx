import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { FileText, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Cores para o Gráfico de Pizza
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function Dashboard() {
  const [resumo, setResumo] = useState(null);
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      // 1. Busca os Totais Gerais (Card)
      const { data: dadosResumo } = await supabase
        .from('view_resumo_financeiro')
        .select('*')
        .single();

      // 2. Busca dados para os Gráficos (Por Tipo)
      const { data: dadosTipo } = await supabase
        .from('view_grafico_tipo')
        .select('*');

      setResumo(dadosResumo);
      setDadosGrafico(dadosTipo || []);
      setLoading(false);
    }

    carregarDados();
  }, []);

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (loading) return <div className="p-8 text-center">Carregando Dashboard...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-3xl font-bold text-primary">Visão Geral</h2>

      {/* --- CARDS DE RESUMO --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Total Docs */}
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-semibold">Total Documentos</p>
            <h3 className="text-2xl font-bold text-gray-800">{resumo?.total_docs || 0}</h3>
          </div>
          <div className="bg-blue-100 p-3 rounded-full text-blue-600"><FileText size={24} /></div>
        </div>

        {/* Card 2: Valor Total */}
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-600 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-semibold">Valor Total</p>
            <h3 className="text-2xl font-bold text-gray-800">{formatarMoeda(resumo?.valor_total || 0)}</h3>
          </div>
          <div className="bg-green-100 p-3 rounded-full text-green-600"><DollarSign size={24} /></div>
        </div>

        {/* Card 3: Pendente */}
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-500 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-semibold">Valor Pendente</p>
            <h3 className="text-2xl font-bold text-yellow-600">{formatarMoeda(resumo?.valor_pendente || 0)}</h3>
          </div>
          <div className="bg-yellow-100 p-3 rounded-full text-yellow-600"><Clock size={24} /></div>
        </div>

        {/* Card 4: Pago */}
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-800 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-semibold">Valor Pago</p>
            <h3 className="text-2xl font-bold text-blue-900">{formatarMoeda(resumo?.valor_pago || 0)}</h3>
          </div>
          <div className="bg-blue-100 p-3 rounded-full text-blue-800"><CheckCircle size={24} /></div>
        </div>
      </div>

      {/* --- GRÁFICOS E TABELA --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico de Barras: Quantidade por Tipo */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-700 mb-4">Quantidade por Tipo de Documento</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tipo" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantidade" fill="#0055AA" name="Qtd" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Pizza: Valor por Tipo */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-700 mb-4">Valor por Tipo de Documento</h3>
          <div className="h-64 flex">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dadosGrafico}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="valor_total"
                  nameKey="tipo"
                >
                  {dadosGrafico.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatarMoeda(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- LISTAGEM RESUMIDA --- */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-700 mb-4">Resumo Detalhado por Tipo</h3>
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-3">Tipo de Documento</th>
              <th className="p-3">Quantidade</th>
              <th className="p-3 text-right">Valor Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {dadosGrafico.map((d, i) => (
              <tr key={i}>
                <td className="p-3 font-medium">{d.tipo}</td>
                <td className="p-3 text-gray-600">{d.quantidade}</td>
                <td className="p-3 text-right font-bold text-primary">{formatarMoeda(d.valor_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}