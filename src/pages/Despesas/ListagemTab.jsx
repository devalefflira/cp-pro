import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabase';

export default function ListagemTab() {
  const [despesas, setDespesas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDespesas();
  }, []);

  const carregarDespesas = async () => {
    const { data } = await supabase.from('despesas').select(`*, centros_custo(sigla, descricao), grupos_despesa(descricao), contas_despesa(descricao), fornecedores(nome)`).order('data_pagamento', { ascending: false });
    if (data) setDespesas(data);
    setLoading(false);
  };

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatarData = (d) => d ? d.split('-').reverse().join('/') : '-';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <h3 className="font-bold text-gray-700">Listagem Completa de Despesas</h3>
        <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{despesas.length} registros</span>
      </div>
      
      <div className="overflow-x-auto w-full"> 
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="bg-white text-gray-500 font-semibold text-xs uppercase tracking-wider border-b">
            <tr>
              <th className="px-4 py-3">Data Pgto</th>
              <th className="px-4 py-3">Fornecedor</th>
              <th className="px-4 py-3">Hierarquia (CC &gt; Grupo &gt; Conta)</th>
              <th className="px-4 py-3">Observação</th>
              <th className="px-4 py-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {loading ? (
              <tr><td colSpan="5" className="p-10 text-center">Carregando...</td></tr>
            ) : despesas.length === 0 ? (
              <tr><td colSpan="5" className="p-10 text-center text-gray-400">Nenhuma despesa encontrada.</td></tr>
            ) : (
              despesas.map((d) => (
                <tr key={d.id} className="hover:bg-red-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-700">{formatarData(d.data_pagamento)}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{d.fornecedores?.nome}</td>
                  <td className="px-4 py-3 text-xs">
                     <span className="font-bold text-primary">{d.centros_custo?.sigla}</span> &rsaquo; {d.grupos_despesa?.descricao} &rsaquo; {d.contas_despesa?.descricao}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={d.observacao}>{d.observacao || '-'}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">{formatarMoeda(d.valor)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}