import { useState } from 'react';
import { supabase } from '../../services/supabase';
import { Filter, Search, RotateCcw, Building, Save, Sparkles, Check } from 'lucide-react';

export default function CorrespondenciasTab() {
  const [banco, setBanco] = useState('Tribanco');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [transacoesBrutas, setTransacoesBrutas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Mapeamento local das descrições únicas
  const [classificacoes, setClassificacoes] = useState({});

  const bancosDisponiveis = [
    { id: 'Bradesco', label: 'Bradesco' },
    { id: 'Santander', label: 'Santander' },
    { id: 'Sicoob', label: 'Sicoob' },
    { id: 'Tribanco', label: 'Tribanco' },
    { id: 'TODOS', label: 'Todos' }
  ];

  const categoriasMacro = [
    "1. Receitas e Recebíveis (Entradas de Operação)",
    "2. Despesas Operacionais e Administrativas (Saídas)",
    "3. Transferências e Movimentações Internas (Neutras)",
    "4. Tarifas, Impostos e Encargos (Custos Financeiros/Fiscais)",
    "5. Investimentos e Aplicações (Patrimonial)",
    "6. Empréstimos, Financiamentos e Garantias (Passivo)",
    "7. Ajustes, Estornos e Eventos Excepcionais (Correções)",
    "8. Saldos e Controles Técnicos (Metadados)",
    "9. Pagamento a Fornecedores"
  ];

  const subcategorias = [
    "1.1 Recebimento Vendas PIX", "1.2 Recebimentos Vendas Cartões", "1.3 Boleto (Liquidação/Recebimento)", "1.4 Antecipação de Recebíveis", "1.4 Depósito",
    "2.1 Folha de Pagamento", "2.2 Cartão Corporativo", "2.3 Cheque (Emitido/Compensado)", "2.4 Saque", "2.5 Seguro", "2.6 Consórcios", "2.7 Outros Gastos",
    "3.1 Transferência Mesma Titularidade (Conta A para Conta B)", "3.2 Transferência Terceiros (Saídas/Entradas de apoio)", "3.3 Transf. p/Sócio (PF)", "3.4 Aporte de Capital / Investimento de Sócios",
    "4.1 Tarifas e Outros Encargos", "4.2 Taxas (Gerais)", "4.3 Pagamento de Tributos (Guias)", "4.4 Retenção de Impostos na Fonte", "4.5 IOF",
    "5.1 Investimento (Aplicação/Resgate)", "5.2 Previdência",
    "6.1 Empréstimo / Financiamento", "6.2 Uso de Cheque Especial", "6.3 Fiança Bancária / Depósito Recursal",
    "7.1 Cancelamento / Estorno", "7.2 Devolução de Cheque", "7.3 Chargeback", "7.4 Liberação de Depósito Bloqueado", "7.5 Bloqueio Judicial", "7.6 Desbloqueio Judicial", "7.7 Ajuste de Saldo",
    "8.1 Saldo Anterior", "8.2 Saldo Conta Corrente", "8.3 Operações Automáticas", "8.4 N/A (Não Aplicável)",
    "9.1 Títulos Pagos", "9.2 Pix para Fornecedor"
  ];

  const carregarDescricoesUnicas = async () => {
    setLoading(true);
    setHasSearched(true);

    let queryExtrato = supabase.from('extrato_transacoes').select('*');
    if (banco !== 'TODOS') queryExtrato = queryExtrato.eq('banco', banco);
    if (dataInicio) queryExtrato = queryExtrato.gte('data_transacao', dataInicio);
    if (dataFim) queryExtrato = queryExtrato.lte('data_transacao', dataFim);

    const [resExtrato, resRegras] = await Promise.all([
      queryExtrato,
      supabase.from('regras_correspondencia').select('*')
    ]);

    const extr = resExtrato.data || [];
    const reg = resRegras.data || [];

    setTransacoesBrutas(extr);

    // Agrupar descrições únicas
    const mapaUnicos = {};
    extr.forEach(item => {
      const desc = item.descricao.trim();
      if (!mapaUnicos[desc]) {
        const padraoSugerido = desc.includes('-') ? desc.split('-')[0].trim() : desc;
        const regraEncontrada = reg.find(r => desc.toUpperCase().includes(r.padrao_descricao.toUpperCase()));

        mapaUnicos[desc] = {
          descricaoOriginal: desc,
          padrao: padraoSugerido,
          qtdOcorrencias: 1,
          tipoOperacao: item.tipo_operacao || 'Entrada',
          categoriaMacro: regraEncontrada ? regraEncontrada.categoria_macro : '',
          subcategoria: regraEncontrada ? regraEncontrada.subcategoria : '',
          salvo: !!regraEncontrada
        };
      } else {
        mapaUnicos[desc].qtdOcorrencias += 1;
      }
    });

    setClassificacoes(mapaUnicos);
    setLoading(false);
  };

  const handleAtualizarCampo = (descOriginal, campo, valor) => {
    setClassificacoes(prev => ({
      ...prev,
      [descOriginal]: {
        ...prev[descOriginal],
        [campo]: valor,
        salvo: false
      }
    }));
  };

  // SALVA APENAS A REGRA DE CORRESPONDÊNCIA (RÁPIDO, SEM ALTERAR EXTRATO AGORA)
  const handleSalvarRegraApenas = async (item) => {
    if (!item.padrao || !item.categoriaMacro || !item.subcategoria) {
      return alert("Selecione o Padrão, Categoria Macro e Subcategoria.");
    }

    const { error } = await supabase.from('regras_correspondencia').insert([{
      banco: banco === 'TODOS' ? 'Geral' : banco,
      padrao_descricao: item.padrao.trim().toUpperCase(),
      categoria_macro: item.categoriaMacro,
      subcategoria: item.subcategoria,
      tipo_operacao: item.tipoOperacao
    }]);

    if (error) {
      alert("Erro ao salvar regra: " + error.message);
    } else {
      setClassificacoes(prev => ({
        ...prev,
        [item.descricaoOriginal]: {
          ...prev[item.descricaoOriginal],
          salvo: true
        }
      }));
    }
  };

  return (
    <div className="space-y-6">
      
      {/* PAINEL DE FILTROS */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
            <Filter size={18} className="text-primary" /> Mapeamento de Descrições Padrão
          </h3>
          <button onClick={() => { setHasSearched(false); setTransacoesBrutas([]); }} className="text-xs text-blue-600 font-semibold flex items-center gap-1">
            <RotateCcw size={14}/> Resetar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
              <Building size={14}/> Banco
            </label>
            <div className="flex flex-wrap gap-1.5">
              {bancosDisponiveis.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBanco(b.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                    banco === b.id ? 'bg-[#0f172a] text-white border-[#0f172a]' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Início</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 text-xs" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Fim</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 text-xs" />
          </div>

          <button onClick={carregarDescricoesUnicas} disabled={loading} className="bg-primary hover:bg-blue-900 text-white font-bold py-2.5 px-6 rounded-lg shadow text-xs flex items-center justify-center gap-2">
            <Search size={16}/> Buscar Padrões de Extrato
          </button>
        </div>
      </div>

      {/* PAINEL DE PADRÕES */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        {!hasSearched ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            Selecione o banco e o período e clique em <strong>"Buscar Padrões de Extrato"</strong>.
          </div>
        ) : loading ? (
          <div className="text-center py-12 text-gray-500">Buscando padrões de extrato...</div>
        ) : Object.keys(classificacoes).length === 0 ? (
          <div className="text-center py-12 text-gray-400">Nenhum padrão encontrado no período.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500"/> Padrões Encontrados ({Object.keys(classificacoes).length} únicos)
              </h4>
              <span className="text-xs text-gray-500">Defina o padrão e salve a correspondência.</span>
            </div>

            <div className="space-y-3">
              {Object.values(classificacoes).map((item, idx) => (
                <div key={idx} className={`p-4 border rounded-xl space-y-3 transition-colors ${item.salvo ? 'bg-emerald-50/60 border-emerald-200' : 'bg-gray-50/60'}`}>
                  
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 border-b pb-2">
                    <div>
                      <span className="text-xs text-gray-400 font-semibold block">Descrição Original de Exemplo:</span>
                      <p className="font-bold text-gray-800 text-xs">{item.descricaoOriginal}</p>
                    </div>
                    <span className="bg-blue-100 text-blue-900 font-extrabold text-[11px] px-2.5 py-1 rounded-full self-start md:self-auto">
                      {item.qtdOcorrencias}x no período
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs items-end">
                    
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">Padrão Identificador (De-Para) *</label>
                      <input 
                        type="text" 
                        value={item.padrao} 
                        onChange={e => handleAtualizarCampo(item.descricaoOriginal, 'padrao', e.target.value)} 
                        className="w-full p-2 border rounded bg-white font-bold text-indigo-900" 
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-600 mb-1">Categoria Macro *</label>
                      <select 
                        value={item.categoriaMacro} 
                        onChange={e => handleAtualizarCampo(item.descricaoOriginal, 'categoriaMacro', e.target.value)} 
                        className="w-full p-2 border rounded bg-white"
                      >
                        <option value="">Selecione...</option>
                        {categoriasMacro.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-600 mb-1">Subcategoria *</label>
                      <select 
                        value={item.subcategoria} 
                        onChange={e => handleAtualizarCampo(item.descricaoOriginal, 'subcategoria', e.target.value)} 
                        className="w-full p-2 border rounded bg-white"
                      >
                        <option value="">Selecione...</option>
                        {subcategorias.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    {/* BOTÃO SALVAR REGRAS */}
                    <button 
                      onClick={() => handleSalvarRegraApenas(item)} 
                      className={`font-bold py-2 px-4 rounded shadow flex items-center justify-center gap-1.5 transition-colors ${
                        item.salvo 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {item.salvo ? <Check size={16}/> : <Save size={16} />}
                      {item.salvo ? "Salvo!" : "Salvar Correspondência"}
                    </button>

                  </div>

                </div>
              ))}
            </div>

          </div>
        )}
      </div>

    </div>
  );
}