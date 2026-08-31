import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Search, RotateCcw, Trash2, Edit, Filter, X, Check } from 'lucide-react';

export default function ListagemTab() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipoDocFiltro, setTipoDocFiltro] = useState('TODOS');
  const [formaPgtoFiltro, setFormaPgtoFiltro] = useState('TODOS');
  const [bancoFiltro, setBancoFiltro] = useState('TODOS');
  const [tipoOpFiltro, setTipoOpFiltro] = useState('TODOS');
  const [valorMin, setValorMin] = useState('');
  const [valorMax, setValorMax] = useState('');

  // Paginação
  const [itensPorPagina, setItensPorPagina] = useState(20);
  const [paginaAtual, setPaginaAtual] = useState(1);

  // Modal de Edição
  const [itemEdicao, setItemEdicao] = useState(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [formEdicao, setFormEdicao] = useState({
    data_operacao: '',
    tipo_documento: 'PIX',
    forma_pagamento: 'PIX',
    banco_operador: 'Bradesco',
    tipo_operacao: 'Entrada +',
    valor: '',
    descricao: ''
  });

  useEffect(() => {
    carregarRegistros();
  }, [itensPorPagina, paginaAtual]);

  const carregarRegistros = async () => {
    setLoading(true);
    let query = supabase.from('movimento_caixa').select('*').order('data_operacao', { ascending: false });

    if (dataInicio) query = query.gte('data_operacao', dataInicio);
    if (dataFim) query = query.lte('data_operacao', dataFim);
    if (tipoDocFiltro !== 'TODOS') query = query.eq('tipo_documento', tipoDocFiltro);
    if (formaPgtoFiltro !== 'TODOS') query = query.eq('forma_pagamento', formaPgtoFiltro);
    if (bancoFiltro !== 'TODOS') query = query.eq('banco_operador', bancoFiltro);
    if (tipoOpFiltro !== 'TODOS') query = query.eq('tipo_operacao', tipoOpFiltro);
    if (valorMin) query = query.gte('valor', parseFloat(valorMin));
    if (valorMax) query = query.lte('valor', parseFloat(valorMax));

    const { data } = await query;
    setRegistros(data || []);
    setLoading(false);
  };

  const limparFiltros = () => {
    setDataInicio('');
    setDataFim('');
    setTipoDocFiltro('TODOS');
    setFormaPgtoFiltro('TODOS');
    setBancoFiltro('TODOS');
    setTipoOpFiltro('TODOS');
    setValorMin('');
    setValorMax('');
    setPaginaAtual(1);
    carregarRegistros();
  };

  const aplicarMascaraMoeda = (valorRaw) => {
    let raw = String(valorRaw).replace(/\D/g, '');
    if (!raw) return '';
    return (Number(raw) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const parseValorParaFloat = (valStr) => {
    if (!valStr) return 0;
    const limpo = valStr.toString().replace(/\./g, '').replace(',', '.');
    return parseFloat(limpo) || 0;
  };

  const handleExcluir = async (id) => {
    if (!confirm("Deseja realmente excluir este lançamento?")) return;
    await supabase.from('movimento_caixa').delete().eq('id', id);
    carregarRegistros();
  };

  const handleAbrirEdicao = (r) => {
    setItemEdicao(r);
    setFormEdicao({
      data_operacao: r.data_operacao || '',
      tipo_documento: r.tipo_documento || 'PIX',
      forma_pagamento: r.forma_pagamento || 'PIX',
      banco_operador: r.banco_operador || 'Bradesco',
      tipo_operacao: r.tipo_operacao || 'Entrada +',
      valor: (Number(r.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      descricao: r.descricao || ''
    });
  };

  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
    if (!formEdicao.data_operacao) {
      return alert("Informe a Data da Operação.");
    }
    const valFloat = parseValorParaFloat(formEdicao.valor);
    if (valFloat <= 0) {
      return alert("Informe um valor válido maior que zero.");
    }

    setSalvandoEdicao(true);

    const { error } = await supabase
      .from('movimento_caixa')
      .update({
        data_operacao: formEdicao.data_operacao,
        tipo_documento: formEdicao.tipo_documento,
        forma_pagamento: formEdicao.forma_pagamento,
        banco_operador: formEdicao.banco_operador,
        tipo_operacao: formEdicao.tipo_operacao,
        valor: valFloat,
        descricao: formEdicao.descricao
      })
      .eq('id', itemEdicao.id);

    setSalvandoEdicao(false);

    if (error) {
      alert("Erro ao salvar alterações: " + error.message);
    } else {
      setItemEdicao(null);
      carregarRegistros();
    }
  };

  const indiceInicio = (paginaAtual - 1) * itensPorPagina;
  const registrosPaginados = registros.slice(indiceInicio, indiceInicio + Number(itensPorPagina));
  const totalPaginas = Math.ceil(registros.length / itensPorPagina) || 1;

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatarData = (d) => d ? d.split('-').reverse().join('/') : '';

  return (
    <div className="space-y-6">
      {/* FILTROS */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
            <Filter size={18} className="text-primary" /> Filtros de Movimento
          </h3>
          <button onClick={limparFiltros} className="text-xs text-blue-600 font-semibold flex items-center gap-1">
            <RotateCcw size={14} /> Limpar Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-bold text-gray-500 uppercase mb-1">Data Início</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50" />
          </div>
          <div>
            <label className="block font-bold text-gray-500 uppercase mb-1">Data Fim</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50" />
          </div>
          <div>
            <label className="block font-bold text-gray-500 uppercase mb-1">Tipo Documento</label>
            <select value={tipoDocFiltro} onChange={e => setTipoDocFiltro(e.target.value)} className="w-full p-2 border rounded-lg bg-white font-semibold">
              <option value="TODOS">Todos</option>
              <option value="PIX">PIX</option>
              <option value="Cartão">Cartão</option>
              <option value="Cheque">Cheque</option>
              <option value="Vale">Vale</option>
              <option value="Despesa">Despesa</option>
              <option value="Devolução">Devolução</option>
              <option value="Fatura AtualCard">Fatura AtualCard</option>
              <option value="Sangria">Sangria</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-gray-500 uppercase mb-1">Forma de Pagamento</label>
            <select value={formaPgtoFiltro} onChange={e => setFormaPgtoFiltro(e.target.value)} className="w-full p-2 border rounded-lg bg-white font-semibold">
              <option value="TODOS">Todas</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="PIX">PIX</option>
              <option value="Cartão">Cartão</option>
              <option value="Cheque">Cheque</option>
              <option value="Depósito">Depósito</option>
              <option value="TED">TED</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-gray-500 uppercase mb-1">Banco / Operador</label>
            <select value={bancoFiltro} onChange={e => setBancoFiltro(e.target.value)} className="w-full p-2 border rounded-lg bg-white font-semibold">
              <option value="TODOS">Todos</option>
              <option value="Bradesco">Bradesco</option>
              <option value="Santander">Santander</option>
              <option value="Sicoob">Sicoob</option>
              <option value="Tribanco">Tribanco</option>
              <option value="Cielo">Cielo</option>
              <option value="AtualCard">AtualCard</option>
              <option value="RomCard">RomCard</option>
              <option value="Safra">Safra</option>
              <option value="WebNex">WebNex</option>
              <option value="Tesouraria">Tesouraria</option>
              <option value="N/A">N/A</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-gray-500 uppercase mb-1">Tipo Operação</label>
            <select value={tipoOpFiltro} onChange={e => setTipoOpFiltro(e.target.value)} className="w-full p-2 border rounded-lg bg-white font-semibold">
              <option value="TODOS">Todas</option>
              <option value="Entrada +">Entrada (+)</option>
              <option value="Saída -">Saída (-)</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-gray-500 uppercase mb-1">Valor Mínimo (R$)</label>
            <input type="number" step="0.01" value={valorMin} onChange={e => setValorMin(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50" placeholder="0.00" />
          </div>
          <div>
            <label className="block font-bold text-gray-500 uppercase mb-1">Valor Máximo (R$)</label>
            <input type="number" step="0.01" value={valorMax} onChange={e => setValorMax(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50" placeholder="0.00" />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={carregarRegistros} className="bg-primary hover:bg-blue-900 text-white font-bold py-2 px-6 rounded-lg shadow text-xs flex items-center gap-2">
            <Search size={14} /> Filtrar Movimentos
          </button>
        </div>
      </div>

      {/* TABELA DE LISTAGEM */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
            <span>Exibir</span>
            <select value={itensPorPagina} onChange={e => { setItensPorPagina(e.target.value); setPaginaAtual(1); }} className="p-1 border rounded bg-white">
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>itens por página (Total: {registros.length})</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-500 uppercase font-bold">
                <th className="p-3">Data Operação</th>
                <th className="p-3">Tipo Documento</th>
                <th className="p-3">Forma Pagamento</th>
                <th className="p-3">Banco / Operador</th>
                <th className="p-3">Tipo Operação</th>
                <th className="p-3 text-right">Valor</th>
                <th className="p-3">Descrição</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="8" className="p-6 text-center text-gray-400 italic">Carregando registros...</td></tr>
              ) : registrosPaginados.length === 0 ? (
                <tr><td colSpan="8" className="p-6 text-center text-gray-400 italic">Nenhum lançamento encontrado.</td></tr>
              ) : (
                registrosPaginados.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="p-3 font-semibold text-gray-700">{formatarData(r.data_operacao)}</td>
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
                    <td className="p-3 text-center whitespace-nowrap space-x-1">
                      <button 
                        onClick={() => handleAbrirEdicao(r)} 
                        title="Editar lançamento"
                        className="text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleExcluir(r.id)} 
                        title="Excluir lançamento"
                        className="text-red-600 hover:text-red-800 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINAÇÃO FINAL */}
        <div className="flex justify-between items-center pt-4 border-t text-xs font-semibold text-gray-600">
          <span>Página {paginaAtual} de {totalPaginas}</span>
          <div className="flex gap-2">
            <button disabled={paginaAtual === 1} onClick={() => setPaginaAtual(p => p - 1)} className="px-3 py-1 border rounded bg-gray-50 disabled:opacity-40">Anterior</button>
            <button disabled={paginaAtual >= totalPaginas} onClick={() => setPaginaAtual(p => p + 1)} className="px-3 py-1 border rounded bg-gray-50 disabled:opacity-40">Próxima</button>
          </div>
        </div>
      </div>

      {/* MODAL DE EDIÇÃO */}
      {itemEdicao && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl border">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Edit size={20} className="text-primary" /> Editar Lançamento no Caixa Geral
              </h3>
              <button onClick={() => setItemEdicao(null)} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicao} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Data Operação *</label>
                  <input
                    type="date"
                    required
                    value={formEdicao.data_operacao}
                    onChange={e => setFormEdicao({ ...formEdicao, data_operacao: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-gray-50 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tipo Documento *</label>
                  <select
                    value={formEdicao.tipo_documento}
                    onChange={e => setFormEdicao({ ...formEdicao, tipo_documento: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-white font-semibold"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Cartão">Cartão</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Vale">Vale</option>
                    <option value="Despesa">Despesa</option>
                    <option value="Devolução">Devolução</option>
                    <option value="Fatura AtualCard">Fatura AtualCard</option>
                    <option value="Sangria">Sangria</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Valor (R$) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={formEdicao.valor}
                    onChange={e => setFormEdicao({ ...formEdicao, valor: aplicarMascaraMoeda(e.target.value) })}
                    className="w-full p-2.5 border rounded-lg bg-gray-50 font-extrabold text-gray-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Forma de Pagamento *</label>
                  <select
                    value={formEdicao.forma_pagamento}
                    onChange={e => setFormEdicao({ ...formEdicao, forma_pagamento: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-white font-semibold"
                  >
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="PIX">PIX</option>
                    <option value="Cartão">Cartão</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Depósito">Depósito</option>
                    <option value="TED">TED</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Banco / Operador *</label>
                  <select
                    value={formEdicao.banco_operador}
                    onChange={e => setFormEdicao({ ...formEdicao, banco_operador: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-white font-semibold"
                  >
                    <option value="Bradesco">Bradesco</option>
                    <option value="Santander">Santander</option>
                    <option value="Sicoob">Sicoob</option>
                    <option value="Tribanco">Tribanco</option>
                    <option value="Cielo">Cielo</option>
                    <option value="AtualCard">AtualCard</option>
                    <option value="RomCard">RomCard</option>
                    <option value="Safra">Safra</option>
                    <option value="WebNex">WebNex</option>
                    <option value="Tesouraria">Tesouraria</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tipo Operação *</label>
                  <select
                    value={formEdicao.tipo_operacao}
                    onChange={e => setFormEdicao({ ...formEdicao, tipo_operacao: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-white font-extrabold"
                  >
                    <option value="Entrada +" className="text-emerald-600">Entrada (+)</option>
                    <option value="Saída -" className="text-red-600">Saída (-)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">Descrição</label>
                  <textarea
                    rows="3"
                    value={formEdicao.descricao}
                    onChange={e => setFormEdicao({ ...formEdicao, descricao: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-gray-50"
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setItemEdicao(null)}
                  className="px-5 py-2.5 border rounded-lg text-gray-600 font-semibold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoEdicao}
                  className="bg-primary hover:bg-blue-900 text-white font-bold py-2.5 px-8 rounded-lg shadow-md flex items-center gap-2"
                >
                  <Check size={16} /> {salvandoEdicao ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}