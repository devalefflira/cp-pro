import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Printer } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export default function RelatorioEvolucaoContaPrint() {
  const [searchParams] = useSearchParams();
  const inicio = searchParams.get('inicio');
  const fim = searchParams.get('fim');
  const contaId = searchParams.get('conta_id');

  const [loading, setLoading] = useState(true);
  const [contaInfo, setContaInfo] = useState(null);
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [totalGeral, setTotalGeral] = useState(0);

  useEffect(() => {
    carregarDados();
  }, [inicio, fim, contaId]);

  const carregarDados = async () => {
    setLoading(true);

    // 1. Busca dados da conta + grupo + centro de custo
    const { data: dataConta } = await supabase
      .from('contas_despesa')
      .select('*, grupos_despesa(*, centros_custo(*))')
      .eq('id', contaId)
      .single();

    setContaInfo(dataConta);

    // 2. Busca lançamentos daquela conta no período
    const { data: dataDespesas } = await supabase
      .from('despesas')
      .select('*, fornecedores(nome)')
      .eq('conta_id', contaId)
      .gte('data_pagamento', inicio)
      .lte('data_pagamento', fim)
      .order('data_pagamento', { ascending: true });

    const lista = dataDespesas || [];
    setLancamentos(lista);

    // 3. Agrupamento mensal para o Gráfico de Linha (Eixo X: Mês/Ano, Eixo Y: Valor)
    const mapaMeses = {};
    let soma = 0;

    lista.forEach(item => {
      const val = Number(item.valor) || 0;
      soma += val;

      // Exemplo de chave: '07/2026'
      const [ano, mes] = item.data_pagamento.split('-');
      const chaveMes = `${mes}/${ano}`;

      if (!mapaMeses[chaveMes]) {
        mapaMeses[chaveMes] = 0;
      }
      mapaMeses[chaveMes] += val;
    });

    const arrayGrafico = Object.keys(mapaMeses).map(m => ({
      mesAno: m,
      valor: mapaMeses[m]
    }));

    setDadosGrafico(arrayGrafico);
    setTotalGeral(soma);
    setLoading(false);
  };

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatarData = (d) => d ? d.split('-').reverse().join('/') : '';

  return (
    <div className="bg-white min-h-screen p-8 text-black text-sm">
      
      {/* BARRA DE AÇÃO IMPRESSÃO */}
      <div className="flex justify-between items-center mb-8 print:hidden border-b pb-4">
        <h1 className="text-xl font-bold">Relatório de Evolução de Despesas por Conta</h1>
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-5 py-2 rounded font-bold flex items-center gap-2 shadow hover:bg-blue-700">
          <Printer size={18} /> Imprimir / Salvar PDF
        </button>
      </div>

      {/* CABEÇALHO DO RELATÓRIO */}
      <div className="text-center border-b pb-4 mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-wider">Evolução Mensal de Despesa por Conta</h2>
        {contaInfo && (
          <p className="text-sm font-bold text-indigo-900 mt-1">
            {contaInfo.grupos_despesa?.centros_custo?.sigla} &rsaquo; {contaInfo.grupos_despesa?.descricao} &rsaquo; {contaInfo.codigo} - {contaInfo.descricao}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-0.5">Período: {formatarData(inicio)} até {formatarData(fim)}</p>
      </div>

      {loading ? (
        <div className="text-center py-20 font-bold text-gray-500">Gerando relatório de evolução...</div>
      ) : (
        <div className="space-y-8">
          
          {/* GRÁFICO DE LINHA (EIXO Y: VALOR | EIXO X: MÊS/ANO) */}
          <div className="border p-4 rounded-xl bg-gray-50/50">
            <h3 className="font-bold text-gray-700 text-xs uppercase mb-4 tracking-wider">
              Gráfico de Evolução Temporal (Mês / Ano)
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosGrafico} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mesAno" fontSize={12} fontStyle="bold" />
                  <YAxis fontSize={12} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip formatter={(value) => [formatarMoeda(value), "Total Mês"]} />
                  <Line 
                    type="monotone" 
                    dataKey="valor" 
                    stroke="#4f46e5" 
                    strokeWidth={3} 
                    dot={{ r: 6, fill: '#4f46e5' }} 
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TABELA DETALHADA LOGO ABAIXO */}
          <div>
            <h3 className="font-bold text-gray-800 text-sm uppercase mb-3">
              Detalhamento de Lançamentos da Conta ({lancamentos.length} registros)
            </h3>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-black bg-gray-100 font-bold uppercase">
                  <th className="p-2">Data PGTO</th>
                  <th className="p-2">Fornecedor / Prestador</th>
                  <th className="p-2">Origem / Banco</th>
                  <th className="p-2">Forma PGTO</th>
                  <th className="p-2">Observação</th>
                  <th className="p-2 text-right">Valor R$</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lancamentos.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="p-2 font-medium">{formatarData(item.data_pagamento)}</td>
                    <td className="p-2 font-bold">{item.fornecedores?.nome || 'Não Informado'}</td>
                    <td className="p-2">{item.origem || '-'}</td>
                    <td className="p-2">{item.forma_pagamento || '-'}</td>
                    <td className="p-2 text-gray-600 max-w-xs truncate">{item.observacao || '-'}</td>
                    <td className="p-2 text-right font-bold text-red-700">{formatarMoeda(item.valor)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-black font-extrabold text-sm bg-gray-100">
                  <td colSpan="5" className="p-2.5 text-right uppercase">Total Acumulado da Conta:</td>
                  <td className="p-2.5 text-right text-red-700">{formatarMoeda(totalGeral)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>
      )}
    </div>
  );
}