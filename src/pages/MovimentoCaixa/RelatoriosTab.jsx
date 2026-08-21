import { useState } from 'react';
import { supabase } from '../../services/supabase';
import { FileText, Search, Printer } from 'lucide-react';

export default function RelatoriosTab() {
  const [tipoRelatorio, setTipoRelatorio] = useState('tipo_operacao');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gerado, setGerado] = useState(false);

  const gerarRelatorio = async () => {
    setLoading(true);
    let query = supabase.from('movimento_caixa').select('*').order('data_operacao', { ascending: false });

    if (dataInicio) query = query.gte('data_operacao', dataInicio);
    if (dataFim) query = query.lte('data_operacao', dataFim);

    const { data } = await query;
    setDados(data || []);
    setLoading(false);
    setGerado(true);
  };

  const handleAbrirImpressao = () => {
    const params = new URLSearchParams();
    if (tipoRelatorio) params.append('tipo', tipoRelatorio);
    if (dataInicio) params.append('inicio', dataInicio);
    if (dataFim) params.append('fim', dataFim);
    window.open(`/print/movimento-caixa?${params.toString()}`, '_blank');
  };

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatarData = (d) => d ? d.split('-').reverse().join('/') : '';

  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
      <div className="border-b pb-3 flex justify-between items-center">
        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
          <FileText size={18} className="text-primary" /> Relatórios do Caixa Geral
        </h3>
        {gerado && (
          <button onClick={handleAbrirImpressao} className="bg-primary hover:bg-blue-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow">
            <Printer size={14} /> Imprimir / PDF
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-xs">
        <div>
          <label className="block font-bold text-gray-500 uppercase mb-1">Tipo de Relatório</label>
          <select value={tipoRelatorio} onChange={e => setTipoRelatorio(e.target.value)} className="w-full p-2.5 border rounded-lg bg-white font-semibold">
            <option value="tipo_operacao">Por Tipo Operação</option>
            <option value="forma_pagamento">Por Forma de Pagamento</option>
            <option value="tipo_documento">Por Tipo Documento</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-gray-500 uppercase mb-1">Data Início</label>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full p-2.5 border rounded-lg bg-gray-50" />
        </div>

        <div>
          <label className="block font-bold text-gray-500 uppercase mb-1">Data Fim</label>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full p-2.5 border rounded-lg bg-gray-50" />
        </div>

        <button onClick={gerarRelatorio} disabled={loading} className="bg-primary hover:bg-blue-900 text-white font-bold py-2.5 px-6 rounded-lg shadow text-xs flex items-center justify-center gap-2">
          <Search size={14} /> {loading ? "Gerando..." : "Gerar Relatório"}
        </button>
      </div>

      {gerado && (
        <div className="overflow-x-auto pt-4">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-500 uppercase font-bold">
                <th className="p-3">Data Operação</th>
                <th className="p-3">Responsável</th>
                <th className="p-3">Data/Hora Lançamento</th>
                <th className="p-3">Tipo Documento</th>
                <th className="p-3">Forma Pagamento</th>
                <th className="p-3">Banco / Operador</th>
                <th className="p-3">Tipo Operação</th>
                <th className="p-3 text-right">Valor</th>
                <th className="p-3">Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dados.length === 0 ? (
                <tr><td colSpan="9" className="p-6 text-center text-gray-400 italic">Nenhum registro encontrado para o período.</td></tr>
              ) : (
                dados.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="p-3 font-semibold text-gray-700">{formatarData(r.data_operacao)}</td>
                    <td className="p-3 text-gray-600">{r.responsavel}</td>
                    <td className="p-3 text-gray-500">{r.data_lancamento}</td>
                    <td className="p-3 font-bold text-gray-800">{r.tipo_documento}</td>
                    <td className="p-3 text-gray-600">{r.forma_pagamento}</td>
                    <td className="p-3 font-semibold text-indigo-900">{r.banco_operador}</td>
                    <td className="p-3 font-extrabold">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${r.tipo_operacao.includes('Entrada') ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {r.tipo_operacao}
                      </span>
                    </td>
                    <td className={`p-3 text-right font-black ${r.tipo_operacao.includes('Entrada') ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatarMoeda(r.valor)}
                    </td>
                    <td className="p-3 text-gray-600">{r.descricao || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}