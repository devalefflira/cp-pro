import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Printer } from 'lucide-react';

export default function RelatorioDespesasCentroCustoPrint() {
  const [searchParams] = useSearchParams();
  const inicio = searchParams.get('inicio');
  const fim = searchParams.get('fim');
  const ccId = searchParams.get('centro_custo_id');

  const [loading, setLoading] = useState(true);
  const [despesas, setDespesas] = useState([]);
  const [totalGeral, setTotalGeral] = useState(0);

  useEffect(() => {
    carregarDados();
  }, [inicio, fim, ccId]);

  const carregarDados = async () => {
    setLoading(true);

    let query = supabase
      .from('despesas')
      .select('*, centros_custo(sigla, descricao), grupos_despesa(descricao), contas_despesa(descricao), fornecedores(nome)')
      .gte('data_pagamento', inicio)
      .lte('data_pagamento', fim)
      .order('data_pagamento', { ascending: true });

    if (ccId) {
      query = query.eq('centro_custo_id', ccId);
    }

    const { data } = await query;
    const lista = data || [];
    setDespesas(lista);

    const total = lista.reduce((acc, curr) => acc + Number(curr.valor), 0);
    setTotalGeral(total);

    setLoading(false);
  };

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatarData = (d) => d ? d.split('-').reverse().join('/') : '';

  return (
    <div className="bg-white min-h-screen p-8 text-black text-sm">
      <div className="flex justify-between items-center mb-8 print:hidden border-b pb-4">
        <h1 className="text-xl font-bold">Relatório de Despesas por Centro de Custo</h1>
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-5 py-2 rounded font-bold flex items-center gap-2 shadow hover:bg-blue-700">
          <Printer size={18} /> Imprimir / Salvar PDF
        </button>
      </div>

      <div className="text-center border-b pb-4 mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-wider">Despesas por Centro de Custo</h2>
        <p className="text-gray-600 font-medium">Período de {formatarData(inicio)} até {formatarData(fim)}</p>
      </div>

      {loading ? (
        <div className="text-center py-20 font-bold text-gray-500">Carregando relatório...</div>
      ) : (
        <div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-black bg-gray-100 font-bold uppercase">
                <th className="p-2">Data</th>
                <th className="p-2">Centro Custo</th>
                <th className="p-2">Grupo / Conta</th>
                <th className="p-2">Fornecedor</th>
                <th className="p-2">Origem / Forma</th>
                <th className="p-2 text-right">Valor R$</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {despesas.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="p-2">{formatarData(d.data_pagamento)}</td>
                  <td className="p-2 font-bold">{d.centros_custo?.sigla}</td>
                  <td className="p-2">{d.grupos_despesa?.descricao} &rsaquo; {d.contas_despesa?.descricao}</td>
                  <td className="p-2 font-medium">{d.fornecedores?.nome || '-'}</td>
                  <td className="p-2">{d.origem || '-'} ({d.forma_pagamento || '-'})</td>
                  <td className="p-2 text-right font-bold text-red-700">{formatarMoeda(d.valor)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black font-extrabold text-sm bg-gray-100">
                <td colSpan="5" className="p-3 text-right uppercase">Total do Período:</td>
                <td className="p-3 text-right text-red-700">{formatarMoeda(totalGeral)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}