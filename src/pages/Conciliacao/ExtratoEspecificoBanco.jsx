import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, CheckCircle, Database } from 'lucide-react';

export default function ExtratoEspecificoBanco({ bancoNome, dataInicio, dataFim, tipoOperacao }) {
  const [loading, setLoading] = useState(false);
  const [transacoes, setTransacoes] = useState([]);
  const [termoBusca, setTermoBusca] = useState('');

  const [totais, setTotais] = useState({
    entradas: 0,
    saidas: 0,
    saldo: 0,
    conciliados: 0,
    totalCount: 0
  });

  useEffect(() => {
    carregarDadosEmLotes();
  }, [bancoNome, dataInicio, dataFim, tipoOperacao]);

  // FUNÇÃO DE CARREGAMENTO EM LOTES (PAGINAÇÃO COMPLETA PARA SUPORTAR +1000 REGISTROS)
  const carregarDadosEmLotes = async () => {
    setLoading(true);
    let allData = [];
    let faixaInicio = 0;
    const tamanhoLote = 1000;
    let continuar = true;

    try {
      while (continuar) {
        let query = supabase
          .from('extrato_transacoes')
          .select('*', { count: 'exact' })
          .ilike('banco', `%${bancoNome}%`)
          .order('data_transacao', { ascending: false })
          .range(faixaInicio, faixaInicio + tamanhoLote - 1);

        if (dataInicio) query = query.gte('data_transacao', dataInicio);
        if (dataFim) query = query.lte('data_transacao', dataFim);

        const { data, error } = await query;

        if (error) {
          console.error("Erro ao buscar lote do extrato:", error);
          break;
        }

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < tamanhoLote) {
            continuar = false;
          } else {
            faixaInicio += tamanhoLote;
          }
        } else {
          continuar = false;
        }
      }

      setTransacoes(allData);
      
      let ent = 0;
      let sai = 0;
      let concCount = 0;

      allData.forEach(t => {
        const val = Number(t.valor) || 0;
        if (val < 0) {
          sai += Math.abs(val);
        } else {
          ent += val;
        }
        if (t.conciliado) concCount++;
      });

      setTotais({
        entradas: ent,
        saidas: sai,
        saldo: ent - sai,
        conciliados: concCount,
        totalCount: allData.length
      });

    } catch (err) {
      console.error("Erro geral ao carregar lotes:", err);
    }

    setLoading(false);
  };

  const listaFiltrada = transacoes.filter(t => {
    if (tipoOperacao === 'Entradas' && Number(t.valor) < 0) return false;
    if (tipoOperacao === 'Saídas' && Number(t.valor) >= 0) return false;
    if (termoBusca) {
      const texto = `${t.descricao || ''} ${t.memo || ''}`.toLowerCase();
      return texto.includes(termoBusca.toLowerCase());
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* CARDS RESUMO DO BANCO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[10px] font-extrabold text-gray-400 uppercase">ENTRADAS ({bancoNome})</p>
            <p className="text-xl font-black text-emerald-600 mt-1">
              R$ {totais.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp size={22}/></div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[10px] font-extrabold text-gray-400 uppercase">SAÍDAS ({bancoNome})</p>
            <p className="text-xl font-black text-red-600 mt-1">
              R$ {totais.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-2.5 bg-red-50 text-red-600 rounded-xl"><TrendingDown size={22}/></div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[10px] font-extrabold text-gray-400 uppercase">SALDO PERÍODO</p>
            <p className={`text-xl font-black mt-1 ${totais.saldo >= 0 ? 'text-indigo-900' : 'text-red-600'}`}>
              R$ {totais.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><DollarSign size={22}/></div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[10px] font-extrabold text-gray-400 uppercase">ÍNDICE CONCILIADO</p>
            <p className="text-xl font-black text-indigo-950 mt-1">
              {totais.totalCount > 0 ? ((totais.conciliados / totais.totalCount) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><CheckCircle size={22}/></div>
        </div>
      </div>

      {/* TABELA DE REGISTROS COM CONTADOR DE DUPLA VERIFICAÇÃO */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <input
            type="text"
            value={termoBusca}
            onChange={e => setTermoBusca(e.target.value)}
            placeholder={`Buscar transações no ${bancoNome}...`}
            className="p-2 border rounded-lg text-xs w-full max-w-xs bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-primary/20"
          />

          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-900 px-3 py-1.5 rounded-lg text-xs font-bold">
              <Database size={14} className="text-indigo-600"/>
              <span>Total de Registros Carregados: <strong>{totais.totalCount}</strong></span>
              {listaFiltrada.length !== totais.totalCount && (
                <span className="text-[10px] text-gray-400 font-normal">(filtrados: {listaFiltrada.length})</span>
              )}
            </div>

            <button onClick={carregarDadosEmLotes} className="p-2 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors" title="Atualizar dados">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""}/>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-500 uppercase font-bold">
                <th className="p-3">Data</th>
                <th className="p-3">Descrição / Favorecido</th>
                <th className="p-3 text-right">Valor (R$)</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="4" className="p-6 text-center text-gray-400 italic">Carregando todos os registros do {bancoNome}...</td></tr>
              ) : listaFiltrada.length === 0 ? (
                <tr><td colSpan="4" className="p-6 text-center text-gray-400 italic">Nenhum registro encontrado.</td></tr>
              ) : (
                listaFiltrada.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="p-3 font-semibold text-gray-700">
                      {new Date(t.data_transacao + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-3 font-semibold text-gray-800">{t.descricao || t.memo}</td>
                    <td className={`p-3 text-right font-black ${Number(t.valor) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      R$ {Number(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        t.conciliado ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {t.conciliado ? 'Conciliado' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}