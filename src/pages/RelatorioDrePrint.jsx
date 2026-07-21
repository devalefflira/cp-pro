import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Printer } from 'lucide-react';

export default function RelatorioDrePrint() {
  const [searchParams] = useSearchParams();
  const inicio = searchParams.get('inicio');
  const fim = searchParams.get('fim');

  const [loading, setLoading] = useState(true);
  const [estrutura, setEstrutura] = useState([]);
  const [totalGeral, setTotalGeral] = useState(0);

  useEffect(() => {
    carregarDados();
  }, [inicio, fim]);

  const carregarDados = async () => {
    setLoading(true);

    const [resCC, resG, resC, resDesp] = await Promise.all([
      supabase.from('centros_custo').select('*').order('codigo'),
      supabase.from('grupos_despesa').select('*').order('codigo'),
      supabase.from('contas_despesa').select('*').order('codigo'),
      supabase.from('despesas').select('*').gte('data_pagamento', inicio).lte('data_pagamento', fim)
    ]);

    const ccs = resCC.data || [];
    const grupos = resG.data || [];
    const contas = resC.data || [];
    const despesas = resDesp.data || [];

    let somaGeral = 0;

    // Montar árvore com totais acumulados estilo DRE
    const DRE = ccs.map(cc => {
      let totalCC = 0;

      const gruposDoCC = grupos.filter(g => g.centro_custo_id === cc.id).map(g => {
        let totalGrupo = 0;

        const contasDoGrupo = contas.filter(c => c.grupo_id === g.id).map(c => {
          const totalConta = despesas
            .filter(d => d.conta_id === c.id)
            .reduce((acc, curr) => acc + Number(curr.valor), 0);

          totalGrupo += totalConta;
          return { ...c, total: totalConta };
        }).filter(c => c.total > 0); // Exibe apenas contas com movimento

        totalCC += totalGrupo;
        return { ...g, total: totalGrupo, contas: contasDoGrupo };
      }).filter(g => g.total > 0);

      somaGeral += totalCC;
      return { ...cc, total: totalCC, grupos: gruposDoCC };
    }).filter(cc => cc.total > 0);

    setEstrutura(DRE);
    setTotalGeral(somaGeral);
    setLoading(false);
  };

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatarData = (d) => d ? d.split('-').reverse().join('/') : '';

  return (
    <div className="bg-white min-h-screen p-8 text-black text-sm">
      {/* BARRA DE AÇÃO IMPRESSÃO */}
      <div className="flex justify-between items-center mb-8 print:hidden border-b pb-4">
        <h1 className="text-xl font-bold">Demonstrativo de Despesas (Estilo DRE)</h1>
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-5 py-2 rounded font-bold flex items-center gap-2 shadow hover:bg-blue-700">
          <Printer size={18} /> Imprimir / Salvar PDF
        </button>
      </div>

      {/* CABEÇALHO DO RELATÓRIO */}
      <div className="text-center border-b pb-4 mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-wider">Demonstrativo de Despesas Gerencial (DRE)</h2>
        <p className="text-gray-600 font-medium">Período de {formatarData(inicio)} até {formatarData(fim)}</p>
      </div>

      {loading ? (
        <div className="text-center py-20 font-bold text-gray-500">Gerando DRE...</div>
      ) : (
        <div className="space-y-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-black text-xs uppercase bg-gray-100">
                <th className="py-2 px-3">Código & Conta / Estrutura</th>
                <th className="py-2 px-3 text-right">Valor R$</th>
                <th className="py-2 px-3 text-right">% DRE</th>
              </tr>
            </thead>
            <tbody>
              {estrutura.map(cc => (
                <>
                  {/* LINHA CENTRO DE CUSTO (NÍVEL 1) */}
                  <tr key={`cc-${cc.id}`} className="bg-gray-200/80 font-bold border-t-2 border-gray-400">
                    <td className="py-2 px-3 text-base">{cc.codigo} - {cc.descricao} ({cc.sigla})</td>
                    <td className="py-2 px-3 text-right text-base">{formatarMoeda(cc.total)}</td>
                    <td className="py-2 px-3 text-right text-base">{totalGeral > 0 ? ((cc.total / totalGeral) * 100).toFixed(1) : 0}%</td>
                  </tr>

                  {cc.grupos.map(g => (
                    <>
                      {/* LINHA GRUPO (NÍVEL 2) */}
                      <tr key={`g-${g.id}`} className="font-semibold bg-gray-50/80 border-b border-gray-200">
                        <td className="py-1.5 px-3 pl-8 text-gray-800">{g.codigo} - {g.descricao}</td>
                        <td className="py-1.5 px-3 text-right text-gray-800">{formatarMoeda(g.total)}</td>
                        <td className="py-1.5 px-3 text-right text-gray-500">{totalGeral > 0 ? ((g.total / totalGeral) * 100).toFixed(1) : 0}%</td>
                      </tr>

                      {/* LINHAS CONTAS (NÍVEL 3) */}
                      {g.contas.map(c => (
                        <tr key={`c-${c.id}`} className="border-b border-gray-100 text-xs">
                          <td className="py-1 px-3 pl-14 text-gray-600">{c.codigo} - {c.descricao}</td>
                          <td className="py-1 px-3 text-right text-gray-700">{formatarMoeda(c.total)}</td>
                          <td className="py-1 px-3 text-right text-gray-400">{totalGeral > 0 ? ((c.total / totalGeral) * 100).toFixed(1) : 0}%</td>
                        </tr>
                      ))}
                    </>
                  ))}
                </>
              ))}

              {/* TOTALIZADOR FINAL */}
              <tr className="border-t-4 border-black font-extrabold text-lg bg-gray-100">
                <td className="py-3 px-3">TOTAL GERAL DE DESPESAS OPERACIONAIS</td>
                <td className="py-3 px-3 text-right text-red-700">{formatarMoeda(totalGeral)}</td>
                <td className="py-3 px-3 text-right">100,0%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}