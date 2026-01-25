import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Trash2, Edit, ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function Listagem() {
  const navigate = useNavigate();
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Dados para os Selects dos Filtros
  const [fornecedores, setFornecedores] = useState([]);
  const [tiposDoc, setTiposDoc] = useState([]);

  // Estado dos Filtros (ADICIONADO: status)
  const filtrosIniciais = {
    dataInicio: '',
    dataFim: '',
    fornecedor_id: '',
    tipo_documento_id: '',
    valorMin: '',
    valorMax: '',
    notaFiscal: '',
    numDocumento: '',
    status: '' // <--- Novo Filtro
  };
  const [filtros, setFiltros] = useState(filtrosIniciais);

  // Paginação
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 10;
  const [totalItens, setTotalItens] = useState(0);

  // 1. Carregar listas auxiliares
  useEffect(() => {
    async function carregarAuxiliares() {
      const f = await supabase.from('fornecedores').select('*').order('nome');
      const t = await supabase.from('tipos_documento').select('*').order('descricao');
      setFornecedores(f.data || []);
      setTiposDoc(t.data || []);
    }
    carregarAuxiliares();
  }, []);

  // 2. Buscar Lançamentos
  useEffect(() => {
    buscarLancamentos();
  }, [pagina, filtros]);

  const buscarLancamentos = async () => {
    setLoading(true);
    let query = supabase
      .from('lancamentos')
      .select(`
        *,
        fornecedores (nome),
        tipos_documento (descricao),
        bancos (nome),
        razoes (nome),
        parcelas (descricao)
      `, { count: 'exact' });

    // Filtros
    if (filtros.dataInicio) query = query.gte('data_vencimento', filtros.dataInicio);
    if (filtros.dataFim) query = query.lte('data_vencimento', filtros.dataFim);
    if (filtros.fornecedor_id) query = query.eq('fornecedor_id', filtros.fornecedor_id);
    if (filtros.tipo_documento_id) query = query.eq('tipo_documento_id', filtros.tipo_documento_id);
    if (filtros.valorMin) query = query.gte('valor', filtros.valorMin);
    if (filtros.valorMax) query = query.lte('valor', filtros.valorMax);
    if (filtros.notaFiscal) query = query.ilike('nota_fiscal', `%${filtros.notaFiscal}%`);
    if (filtros.numDocumento) query = query.ilike('numero_documento', `%${filtros.numDocumento}%`);
    
    // NOVO FILTRO DE STATUS
    if (filtros.status) query = query.eq('status', filtros.status);

    const inicio = (pagina - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina - 1;
    
    query = query.range(inicio, fim).order('data_vencimento', { ascending: false });

    const { data, count, error } = await query;

    if (error) {
      alert('Erro ao buscar dados');
    } else {
      setLancamentos(data || []);
      setTotalItens(count || 0);
    }
    setLoading(false);
  };

  // --- AÇÕES ---

  const handleLimparFiltros = () => {
    setFiltros(filtrosIniciais);
    setPagina(1);
  };

  const handleExcluir = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return;
    const { error } = await supabase.from('lancamentos').delete().eq('id', id);
    if (error) alert('Erro ao excluir: ' + error.message);
    else buscarLancamentos();
  };

  const handleAlterarStatus = async (lancamento) => {
    const novoStatus = lancamento.status === 'Pendente' ? 'Pago' : 'Pendente';
    const confirmacao = confirm(`Deseja alterar o status deste lançamento para ${novoStatus.toUpperCase()}?`);
    if (!confirmacao) return;

    const { error } = await supabase
      .from('lancamentos')
      .update({ status: novoStatus })
      .eq('id', lancamento.id);

    if (error) alert('Erro ao atualizar status: ' + error.message);
    else buscarLancamentos();
  };

  // --- LÓGICA DE PAGINAÇÃO AVANÇADA (Blocos de 5) ---
  const renderPaginacao = () => {
    const totalPaginas = Math.ceil(totalItens / itensPorPagina);
    const maxBotoesVisiveis = 5;
    
    // Calcula em qual "bloco" de páginas estamos (Ex: Bloco 1 (1-5), Bloco 2 (6-10))
    // A fórmula mágica para achar o primeiro número do bloco atual:
    const paginaInicialBloco = Math.floor((pagina - 1) / maxBotoesVisiveis) * maxBotoesVisiveis + 1;
    
    // O último número é o inicial + 4, mas não pode passar do total de páginas
    const paginaFinalBloco = Math.min(paginaInicialBloco + maxBotoesVisiveis - 1, totalPaginas);

    const botoes = [];

    // Botão Anterior (<)
    botoes.push(
      <button 
        key="prev"
        onClick={() => setPagina(old => Math.max(old - 1, 1))}
        disabled={pagina === 1}
        className="p-2 border rounded hover:bg-gray-200 disabled:opacity-50 mx-1"
      >
        <ChevronLeft size={24} />
      </button>
    );

    // Botões Numéricos (1, 2, 3, 4, 5...)
    for (let i = paginaInicialBloco; i <= paginaFinalBloco; i++) {
      botoes.push(
        <button
          key={i}
          onClick={() => setPagina(i)}
          className={`px-4 py-2 mx-1 border rounded font-bold transition-colors ${
            pagina === i 
              ? 'bg-primary text-white border-primary' // Estilo Ativo
              : 'bg-white text-gray-700 hover:bg-gray-100' // Estilo Normal
          }`}
        >
          {i}
        </button>
      );
    }

    // Botão Próximo (>)
    botoes.push(
      <button 
        key="next"
        onClick={() => setPagina(old => (old < totalPaginas ? old + 1 : old))}
        disabled={pagina >= totalPaginas}
        className="p-2 border rounded hover:bg-gray-200 disabled:opacity-50 mx-1"
      >
        <ChevronRight size={24} />
      </button>
    );

    return botoes;
  };

  const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  
  const formatarData = (data) => {
    if (!data) return '-';
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-primary">Listagem de Lançamentos</h2>

      {/* --- ÁREA DE FILTROS --- */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input type="date" className="p-2 border rounded" value={filtros.dataInicio} onChange={e => setFiltros({...filtros, dataInicio: e.target.value})} />
          <input type="date" className="p-2 border rounded" value={filtros.dataFim} onChange={e => setFiltros({...filtros, dataFim: e.target.value})} />
          
          <select className="p-2 border rounded" value={filtros.fornecedor_id} onChange={e => setFiltros({...filtros, fornecedor_id: e.target.value})}>
            <option value="">Todos Fornecedores</option>
            {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>

          <select className="p-2 border rounded" value={filtros.tipo_documento_id} onChange={e => setFiltros({...filtros, tipo_documento_id: e.target.value})}>
            <option value="">Todos Tipos Doc</option>
            {tiposDoc.map(t => <option key={t.id} value={t.id}>{t.descricao}</option>)}
          </select>

          <input type="number" placeholder="Valor Mín" className="p-2 border rounded" value={filtros.valorMin} onChange={e => setFiltros({...filtros, valorMin: e.target.value})} />
          <input type="number" placeholder="Valor Máx" className="p-2 border rounded" value={filtros.valorMax} onChange={e => setFiltros({...filtros, valorMax: e.target.value})} />
          <input type="text" placeholder="Buscar NF" className="p-2 border rounded" value={filtros.notaFiscal} onChange={e => setFiltros({...filtros, notaFiscal: e.target.value})} />
          <input type="text" placeholder="Buscar Nº Doc" className="p-2 border rounded" value={filtros.numDocumento} onChange={e => setFiltros({...filtros, numDocumento: e.target.value})} />
        </div>

        {/* LINHA INFERIOR DOS FILTROS (STATUS + LIMPAR) */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            {/* NOVO FILTRO DE STATUS */}
            <div className="w-full md:w-1/4">
                <select 
                    className="w-full p-2 border rounded font-semibold text-gray-700" 
                    value={filtros.status} 
                    onChange={e => setFiltros({...filtros, status: e.target.value})}
                >
                    <option value="">STATUS (Todos)</option>
                    <option value="Pendente">PENDENTE</option>
                    <option value="Pago">PAGO</option>
                </select>
            </div>

            <button onClick={handleLimparFiltros} className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-4 py-2 rounded transition-colors">
                <X size={18} /> Limpar Filtros
            </button>
        </div>
      </div>

      {/* --- TABELA --- */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-600 font-semibold text-sm uppercase tracking-wider">
              <tr>
                <th className="p-4 border-b">Vencimento</th>
                <th className="p-4 border-b">Fornecedor</th>
                <th className="p-4 border-b">Tipo</th>
                <th className="p-4 border-b">Nº Doc</th>
                <th className="p-4 border-b">Parcela</th>
                <th className="p-4 border-b">Razão</th>
                <th className="p-4 border-b">Banco</th>
                <th className="p-4 border-b">Valor</th>
                <th className="p-4 border-b">Status</th>
                <th className="p-4 border-b text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="10" className="p-8 text-center text-gray-500">Carregando...</td></tr>
              ) : lancamentos.length === 0 ? (
                <tr><td colSpan="10" className="p-8 text-center text-gray-500">Nenhum lançamento encontrado.</td></tr>
              ) : (
                lancamentos.map((l) => (
                  <tr key={l.id} className="hover:bg-blue-50 transition-colors text-sm">
                    <td className="p-4 text-gray-700 font-medium">{formatarData(l.data_vencimento)}</td>
                    <td className="p-4 text-gray-900 font-bold uppercase">{l.fornecedores?.nome || '-'}</td>
                    <td className="p-4 text-gray-600">{l.tipos_documento?.descricao || '-'}</td>
                    <td className="p-4 text-gray-600">{l.numero_documento || '-'}</td>
                    <td className="p-4 text-gray-600">{l.parcelas?.descricao || '-'}</td>
                    <td className="p-4 text-gray-600 font-medium text-blue-800 bg-blue-50/50 rounded">{l.razoes?.nome || '-'}</td>
                    <td className="p-4 text-gray-600">{l.bancos?.nome || 'N/A'}</td>
                    <td className={`p-4 font-bold ${l.status === 'Pago' ? 'text-green-600' : 'text-red-500'}`}>
                      {formatarMoeda(l.valor)}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        l.status === 'Pago' ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-100 text-yellow-700' // Ajuste visual conforme imagem (amarelo padrão) ou lógica real
                      } ${l.status === 'Pago' ? '!bg-green-100 !text-green-700' : ''}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleAlterarStatus(l)} 
                          className="p-1 text-blue-500 hover:bg-blue-100 rounded border border-blue-200" 
                        >
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleExcluir(l.id)} className="p-1 text-red-500 hover:bg-red-100 rounded border border-red-200">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* --- RODAPÉ COM PAGINAÇÃO AVANÇADA --- */}
        <div className="p-4 bg-gray-50 border-t flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm text-gray-500 font-medium">
            Mostrando <strong>{lancamentos.length}</strong> de <strong>{totalItens}</strong> registros
          </span>
          
          <div className="flex gap-1">
            {renderPaginacao()}
          </div>
        </div>
      </div>
    </div>
  );
}