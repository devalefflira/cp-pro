import { useState, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import {
    Filter,
    Search,
    RotateCcw,
    Building,
    Clock,
    CheckCircle2,
    FileSpreadsheet,
    ArrowRightLeft,
    DollarSign,
    AlertCircle
} from 'lucide-react';

export default function TitulosPagosTab() {
    const [titulos, setTitulos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // FILTROS DE PESQUISA
    const [bancoFiltro, setBancoFiltro] = useState('TODOS');
    const [statusFiltro, setStatusFiltro] = useState('NAO_CONCILIADOS'); // 'NAO_CONCILIADOS', 'CONCILIADOS', 'TODOS'
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');

    // MODAL DE VÍNCULO COM EXTRATO
    const [tituloSelecionado, setTituloSelecionado] = useState(null);
    const [extratoCandidatos, setExtratoCandidatos] = useState([]);
    const [loadingExtrato, setLoadingExtrato] = useState(false);
    const [extratoIdSelecionado, setExtratoIdSelecionado] = useState('');

    const bancosDisponiveis = [
        { id: 'Bradesco', label: 'Bradesco' },
        { id: 'Santander', label: 'Santander' },
        { id: 'Sicoob', label: 'Sicoob' },
        { id: 'Tribanco', label: 'Tribanco' },
        { id: 'TODOS', label: 'Todos' }
    ];

    const statusOptions = [
        { id: 'NAO_CONCILIADOS', label: 'Pendentes' },
        { id: 'CONCILIADOS', label: 'Conciliados' },
        { id: 'TODOS', label: 'Todos' }
    ];

    // BUSCA TÍTULOS PAGOS COM OS FILTROS
    const carregarTitulos = async () => {
        setLoading(true);
        setHasSearched(true);

        let query = supabase
            .from('titulos_pagos_importados')
            .select('*')
            .order('data_pagamento', { ascending: false });

        if (bancoFiltro !== 'TODOS') query = query.eq('banco', bancoFiltro);
        if (statusFiltro === 'NAO_CONCILIADOS') query = query.eq('conciliado', false);
        if (statusFiltro === 'CONCILIADOS') query = query.eq('conciliado', true);
        if (dataInicio) query = query.gte('data_pagamento', dataInicio);
        if (dataFim) query = query.lte('data_pagamento', dataFim);

        const { data, error } = await query;
        if (error) {
            alert("Erro ao buscar títulos pagos: " + error.message);
        } else {
            setTitulos(data || []);
        }
        setLoading(false);
    };

    const limparFiltros = () => {
        setBancoFiltro('TODOS');
        setStatusFiltro('NAO_CONCILIADOS');
        setDataInicio('');
        setDataFim('');
        setTitulos([]);
        setHasSearched(false);
    };

    // MINI DASHBOARD
    const resumoDashboard = useMemo(() => {
        let totalPago = 0;
        let conciliadosCount = 0;

        titulos.forEach(t => {
            const val = Number(t.valor_pago) || 0;
            totalPago += val;
            if (t.conciliado) conciliadosCount++;
        });

        const percConciliado = titulos.length > 0 ? ((conciliadosCount / titulos.length) * 100).toFixed(1) : 0;

        return {
            totalPago,
            totalRegistros: titulos.length,
            conciliadosCount,
            percConciliado
        };
    }, [titulos]);

    // ABRIR MODAL DE CONCILIAÇÃO BUSCANDO LANÇAMENTOS DO EXTRATO NO BANCO CORRESPONDENTE
    const handleAbrirModalConciliar = async (titulo) => {
        setTituloSelecionado(titulo);
        setExtratoIdSelecionado('');
        setLoadingExtrato(true);

        try {
            const dataPagamento = new Date(titulo.data_pagamento + 'T12:00:00');

            // Calcula intervalo de -3 dias a +3 dias
            const dataMin = new Date(dataPagamento);
            dataMin.setDate(dataMin.getDate() - 3);

            const dataMax = new Date(dataPagamento);
            dataMax.setDate(dataMax.getDate() + 3);

            const dataMinStr = dataMin.toISOString().split('T')[0];
            const dataMaxStr = dataMax.toISOString().split('T')[0];

            const valorProcurado = Number(titulo.valor_pago) || 0;

            // 1. Busca no extrato mantendo filtro do banco, status pendente e janela de +- 3 dias
            let queryExtrato = supabase
                .from('extrato_transacoes')
                .select('*')
                .eq('conciliado', false)
                .gte('data_transacao', dataMinStr)
                .lte('data_transacao', dataMaxStr)
                .order('data_transacao', { ascending: false });

            if (titulo.banco) {
                queryExtrato = queryExtrato.ilike('banco', `%${titulo.banco}%`);
            }

            const { data } = await queryExtrato;
            const candidatosBrutos = data || [];

            // 2. Filtra prioritariamente por valor exato (com pequena tolerância de centavos)
            let candidatosFiltrados = candidatosBrutos.filter(
                e => Math.abs(Number(e.valor) - valorProcurado) < 0.01
            );

            // 3. Fallback: Se não encontrar valor 100% idêntico, exibe todos os lançamentos da janela de +- 3 dias
            if (candidatosFiltrados.length === 0) {
                candidatosFiltrados = candidatosBrutos;
            }

            setExtratoCandidatos(candidatosFiltrados);

            // Se houver um resultado exato único, seleciona automaticamente no radio button para agilizar
            if (candidatosFiltrados.length === 1) {
                setExtratoIdSelecionado(String(candidatosFiltrados[0].id));
            }
        } catch (err) {
            alert("Erro ao buscar lançamentos correspondentes: " + err.message);
        } finally {
            setLoadingExtrato(false);
        }
    };

    // VINCULAR TÍTULO PAGO AO EXTRATO SELECIONADO
    const handleConfirmarViculo = async () => {
        if (!extratoIdSelecionado) {
            return alert("Selecione um lançamento do extrato para vincular.");
        }

        setLoading(true);

        const extratoMatch = extratoCandidatos.find(e => e.id === Number(extratoIdSelecionado));

        let abatimento = 0;
        let jurosMulta = 0;
        const valOriginal = Number(tituloSelecionado.valor_pago) || 0;
        const valExtrato = Number(extratoMatch?.valor) || 0;

        if (valOriginal > 0 && valExtrato > 0) {
            if (valOriginal > valExtrato) abatimento = valOriginal - valExtrato;
            else if (valExtrato > valOriginal) jurosMulta = valExtrato - valOriginal;
        }

        // 1. Atualiza o lançamento no Extrato
        const { error: errExtrato } = await supabase.from('extrato_transacoes').update({
            conciliado: true,
            conciliado_com_id: tituloSelecionado.id,
            tipo_conciliacao: 'Manual',
            categoria_macro: '9. Pagamento a Fornecedores',
            subcategoria: '9.1 Títulos Pagos',
            fornecedor_nome: tituloSelecionado.fornecedor,
            cnpj: tituloSelecionado.cnpj,
            nota_fiscal: tituloSelecionado.nota_fiscal,
            parcela: tituloSelecionado.parcela,
            valor_original_titulo: valOriginal,
            valor_abatimento: abatimento,
            valor_juros_multa: jurosMulta
        }).eq('id', extratoMatch.id);

        if (errExtrato) {
            alert("Erro ao atualizar extrato: " + errExtrato.message);
            setLoading(false);
            return;
        }

        // 2. Marca o Título Pago como conciliado
        await supabase.from('titulos_pagos_importados').update({
            conciliado: true
        }).eq('id', tituloSelecionado.id);

        alert("Título conciliado com o extrato com sucesso!");
        setTituloSelecionado(null);
        carregarTitulos();
    };

    const handleDesfazerConciliacaoTitulo = async (titulo) => {
        if (!confirm("Deseja desfazer a conciliação deste título?")) return;

        setLoading(true);

        // Desfaz no extrato
        await supabase.from('extrato_transacoes').update({
            conciliado: false,
            conciliado_com_id: null,
            tipo_conciliacao: null,
            fornecedor_nome: null,
            cnpj: null,
            nota_fiscal: null,
            parcela: null,
            valor_original_titulo: 0,
            valor_abatimento: 0,
            valor_juros_multa: 0
        }).eq('conciliado_com_id', titulo.id);

        // Desfaz no título
        await supabase.from('titulos_pagos_importados').update({
            conciliado: false
        }).eq('id', titulo.id);

        carregarTitulos();
    };

    const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const formatarData = (d) => d ? d.split('-').reverse().join('/') : '';

    return (
        <div className="space-y-6">

            {/* PAINEL DE FILTROS COM BOTÕES */}
            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                        <Filter size={18} className="text-primary" /> Filtros de Visualização de Títulos Pagos
                    </h3>
                    <button onClick={limparFiltros} className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                        <RotateCcw size={14} /> Limpar Filtros
                    </button>
                </div>

                {/* ESCOLHA O BANCO */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                        <Building size={14} /> Escolha o Banco do Título
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {bancosDisponiveis.map(b => (
                            <button
                                key={b.id}
                                type="button"
                                onClick={() => setBancoFiltro(b.id)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${bancoFiltro === b.id
                                    ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-md scale-105'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                    }`}
                            >
                                {b.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">

                    {/* Período */}
                    <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Pagamento Início</label>
                            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Pagamento Fim</label>
                            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full p-2.5 border rounded-lg bg-gray-50 text-xs" />
                        </div>
                    </div>

                    {/* Status */}
                    <div className="lg:col-span-6">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                            <Clock size={14} /> Status da Conciliação
                        </label>
                        <div className="flex gap-1.5">
                            {statusOptions.map(st => (
                                <button
                                    key={st.id}
                                    type="button"
                                    onClick={() => setStatusFiltro(st.id)}
                                    className={`flex-1 py-2.5 px-2 rounded-lg text-xs font-bold border text-center ${statusFiltro === st.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    {st.label}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onClick={limparFiltros} className="px-5 py-2.5 border rounded-lg text-gray-600 font-semibold hover:bg-gray-50 text-xs">Limpar</button>
                    <button type="button" onClick={carregarTitulos} disabled={loading} className="bg-primary hover:bg-blue-900 text-white font-bold py-2.5 px-8 rounded-lg shadow-md text-xs flex items-center justify-center gap-2">
                        <Search size={16} /> {loading ? "Buscando..." : "Aplicar Filtro"}
                    </button>
                </div>
            </div>

            {/* RESULTADO E MINI DASHBOARD */}
            <div className="space-y-6">
                {!hasSearched ? (
                    <div className="bg-white p-12 rounded-xl border shadow-sm text-center py-16 text-gray-400 space-y-2">
                        <FileSpreadsheet size={48} className="mx-auto opacity-40 text-gray-400" />
                        <p className="text-sm font-semibold text-gray-600">Nenhum título pago listado no momento.</p>
                        <p className="text-xs text-gray-400">Escolha o banco, o período ou o status e clique em <strong>"Aplicar Filtro"</strong>.</p>
                    </div>
                ) : loading ? (
                    <div className="bg-white p-12 rounded-xl border shadow-sm text-center py-12 text-gray-500 font-medium">Carregando títulos pagos...</div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between">
                                <span className="text-xs font-bold text-gray-500 uppercase">Total Pago nos Títulos</span>
                                <p className="text-2xl font-extrabold text-red-600">{formatarMoeda(resumoDashboard.totalPago)}</p>
                            </div>

                            <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between">
                                <span className="text-xs font-bold text-gray-500 uppercase">Total de Títulos</span>
                                <p className="text-2xl font-extrabold text-blue-900">{resumoDashboard.totalRegistros} itens</p>
                            </div>

                            <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between">
                                <span className="text-xs font-bold text-gray-500 uppercase">Índice Conciliado</span>
                                <div>
                                    <p className="text-2xl font-extrabold text-indigo-900">{resumoDashboard.percConciliado}%</p>
                                    <span className="text-[11px] text-gray-400 font-medium">{resumoDashboard.conciliadosCount} de {resumoDashboard.totalRegistros} conciliações</span>
                                </div>
                            </div>
                        </div>

                        {/* TABELA DE TÍTULOS PAGOS */}
                        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                            <div className="flex justify-between items-center border-b pb-2">
                                <h3 className="font-bold text-gray-800 text-sm">
                                    Títulos Pagos Encontrados ({titulos.length})
                                </h3>
                                <span className="text-xs bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full">
                                    Banco: {bancoFiltro}
                                </span>
                            </div>

                            {titulos.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    Nenhum título pago encontrado para os filtros aplicados.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-gray-50 border-b text-gray-500 uppercase font-bold">
                                                <th className="p-3">Data PGTO</th>
                                                <th className="p-3">Banco</th>
                                                <th className="p-3">Fornecedor / Prestador</th>
                                                <th className="p-3">CNPJ</th>
                                                <th className="p-3">NF / Parcela</th>
                                                <th className="p-3 text-right">Valor Pago R$</th>
                                                <th className="p-3 text-center">Status</th>
                                                <th className="p-3 text-center">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {titulos.map((t) => (
                                                <tr key={t.id} className="hover:bg-gray-50">
                                                    <td className="p-3 font-medium whitespace-nowrap">{formatarData(t.data_pagamento)}</td>
                                                    <td className="p-3 font-bold text-gray-700">{t.banco || '-'}</td>
                                                    <td className="p-3 font-semibold text-gray-800">{t.fornecedor}</td>
                                                    <td className="p-3 text-gray-500">{t.cnpj || '-'}</td>
                                                    <td className="p-3 text-gray-600">NF: {t.nota_fiscal || '-'} (Parc: {t.parcela || '-'})</td>
                                                    <td className="p-3 text-right font-bold text-red-600 whitespace-nowrap">{formatarMoeda(t.valor_pago)}</td>
                                                    <td className="p-3 text-center whitespace-nowrap">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${t.conciliado ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                                            {t.conciliado ? 'Conciliado' : 'Pendente'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-center whitespace-nowrap">
                                                        {!t.conciliado ? (
                                                            <button
                                                                onClick={() => handleAbrirModalConciliar(t)}
                                                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded font-bold transition-colors shadow-sm flex items-center gap-1 mx-auto"
                                                            >
                                                                <ArrowRightLeft size={13} /> Conciliar
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleDesfazerConciliacaoTitulo(t)}
                                                                className="text-red-600 hover:text-red-800 font-bold hover:underline"
                                                            >
                                                                Desfazer
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* MODAL DE VÍNCULO COM EXTRATO BANCÁRIO */}
            {tituloSelecionado && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-2xl space-y-4 shadow-2xl border">
                        <h3 className="font-bold text-lg text-gray-800 border-b pb-2 flex items-center gap-2">
                            <ArrowRightLeft className="text-indigo-600" /> Conciliar Título Pago com Extrato Bancário
                        </h3>

                        <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100 text-xs space-y-1">
                            <p className="text-gray-600">Fornecedor: <strong className="text-gray-900">{tituloSelecionado.fornecedor}</strong></p>
                            <p className="text-gray-600">CNPJ: <strong className="text-gray-900">{tituloSelecionado.cnpj || '-'}</strong> | NF: <strong className="text-gray-900">{tituloSelecionado.nota_fiscal || '-'}</strong></p>
                            <p className="text-gray-600">Valor Título Pago: <strong className="text-red-700 text-sm">{formatarMoeda(tituloSelecionado.valor_pago)}</strong> em {formatarData(tituloSelecionado.data_pagamento)} (Banco: {tituloSelecionado.banco})</p>
                        </div>

                        <div>
                            <label className="block font-bold text-xs uppercase text-gray-700 mb-2">
                                Selecione o Lançamento Correspondente no Extrato do {tituloSelecionado.banco} *
                            </label>

                            {loadingExtrato ? (
                                <div className="py-8 text-center text-xs text-gray-500 font-medium">Buscando lançamentos no extrato do banco...</div>
                            ) : extratoCandidatos.length === 0 ? (
                                <div className="p-4 border border-amber-200 bg-amber-50 text-amber-800 rounded-lg text-xs flex items-center gap-2">
                                    <AlertCircle size={18} /> Nenhuma transação pendente encontrada no extrato do banco {tituloSelecionado.banco}.
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {extratoCandidatos.map(ext => (
                                        <label
                                            key={ext.id}
                                            className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer text-xs transition-colors ${extratoIdSelecionado === String(ext.id)
                                                ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                                                : 'bg-white hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="radio"
                                                    name="extratoRadio"
                                                    value={ext.id}
                                                    checked={extratoIdSelecionado === String(ext.id)}
                                                    onChange={e => setExtratoIdSelecionado(e.target.value)}
                                                    className="text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <div>
                                                    <p className="font-bold text-gray-800">{ext.descricao}</p>
                                                    <span className="text-gray-500">{formatarData(ext.data_transacao)} &bull; {ext.banco}</span>
                                                </div>
                                            </div>

                                            <span className="font-extrabold text-red-600 text-sm whitespace-nowrap">
                                                {formatarMoeda(ext.valor)}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <button
                                type="button"
                                onClick={() => setTituloSelecionado(null)}
                                className="px-4 py-2 border rounded font-bold text-gray-600 hover:bg-gray-50 text-xs"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmarViculo}
                                disabled={loading || !extratoIdSelecionado}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded shadow text-xs disabled:opacity-40"
                            >
                                Confirmar Conciliação
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}