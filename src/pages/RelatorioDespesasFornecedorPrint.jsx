import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Printer } from 'lucide-react';

export default function RelatorioDespesasFornecedorPrint() {
  const [searchParams] = useSearchParams();
  const inicio = searchParams.get('inicio');
  const fim = searchParams.get('fim');
  const fornId = searchParams.get('fornecedor_id');

  const [loading, setLoading] = useState(true);
  const [agrupado, setAgrupado] = useState([]);
  const [totalGeral, setTotalGeral] = useState(0);

  useEffect(() => {
    carregarDados();
  }, [inicio, fim, fornId]);

  const carregarDados = async () => {
    setLoading(true);

    let query = supabase
      .from('despesas')
      .select('*, fornecedores(nome), centros_custo(sigla), contas_despesa(descricao)')
      .gte('data_pagamento', inicio)
      .lte('data_pagamento', fim)
      .order('data_pagamento', { ascending: true });

    if (fornId) {
      query = query.eq('fornecedor_id', fornId);
    }

    const { data } = await query;
    const lista = data || [];

    // Agrupar por Fornecedor
    const mapFornecedores = {};
    let total = 0;

    lista.forEach(d => {
      const nomeForn = d.fornecedores?.nome || 'Fornecedor Não Identificado';
      const val = Number(d.valor);
      total += val;

      if (!mapFornecedores[nomeForn]) {
        mapFornecedores[nomeForn] = { total: 0, itens: [] };
      }
      mapFornecedores[nomeForn].total += val;
      mapFornecedores[nomeForn].itens.push(d);
    });

    const listaAgrupada = Object.keys(mapFornecedores).map(key => ({
      fornecedor: key,
      total: mapFornecedores[key].total,
      itens: mapFornecedores[key].itens
    })).sort((a, b) => b.total - a.total); // Ordena pelos maiores fornecedores

    setAgrupado(listaAgrupada);
    setTotalGeral(total);
    setLoading(false);
  };

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatarData = (d) => d ? d.split('-').reverse().join('/') : '';

  return (
    <div className="bg-white min-h-screen p-8 text-black text-sm">
      <div className="flex justify-between items-center mb-8 print:hidden border-b pb-4">
        <h1 className="text-xl font-bold">Relatório de Despesas por Fornecedor / Prestador</h1>
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-5 py-2 rounded font-bold flex items-center gap-2 shadow hover:bg-blue-700">
          <Printer size={18} /> Imprimir / Salvar PDF
        </button>
      </div>

      <div className="text-center border-b pb-4 mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-wider">Despesas por Fornecedor / Prestador</h2>
        <p className="text-gray-600 font-medium">Período de {formatarData(inicio)} até {formatarData(fim)}</p>
      </div>

      {loading ? (
        <div className="text-center py-20 font-bold text-gray-500">Carregando relatório...</div>
      ) : (
        <div className="space-y-6">
          {agrupado.map((f, idx) => (
            <div key={idx} className="border rounded overflow-hidden">
              <div className="bg-gray-100 p-2.5 font-bold flex justify-between items-center border-b text-sm">
                <span>{f.fornecedor}</span>
                <span className="text-red-700">{formatarMoeda(f.total)} ({f.itens.length} lançamentos)</span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b text-gray-500">
                  <tr>
                    <th className="p-2">Data</th>
                    <th className="p-2">Centro Custo / Conta</th>
                    <th className="p-2">Origem / Forma</th>
                    <th className="p-2">Observação</th>
                    <th className="p-2 text-right">Valor R$</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {f.itens.map(item => (
                    <tr key={item.id}>
                      <td className="p-2">{formatarData(item.data_pagamento)}</td>
                      <td className="p-2">{item.centros_custo?.sigla} &rsaquo; {item.contas_despesa?.descricao}</td>
                      <td className="p-2">{item.origem || '-'} ({item.forma_pagamento || '-'})</td>
                      <td className="p-2 text-gray-500">{item.observacao || '-'}</td>
                      <td className="p-2 text-right font-medium">{formatarMoeda(item.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <div className="border-t-2 border-black pt-3 flex justify-between items-center font-extrabold text-base">
            <span>TOTAL GERAL DO PERÍODO:</span>
            <span className="text-red-700">{formatarMoeda(totalGeral)}</span>
          </div>
        </div>
      )}
    </div>
  );
}