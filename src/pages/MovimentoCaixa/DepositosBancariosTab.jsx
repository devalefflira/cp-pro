import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { 
  Landmark, PlusCircle, History, Scale, CheckCircle, 
  Trash2, DollarSign, ArrowUpRight, ArrowDownRight, Wallet 
} from 'lucide-react';

export default function DepositosBancariosTab() {
  const [subAba, setSubAba] = useState('diferencas'); // 'novo', 'tesouraria', 'depositos', 'diferencas'
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [responsavelNome, setResponsavelNome] = useState('');

  const [sangriasTesouraria, setSangriasTesouraria] = useState([]);
  const [depositos, setDepositos] = useState([]);

  // Formulário de Depósito
  const [formDeposito, setFormDeposito] = useState({
    data_deposito: new Date().toISOString().split('T')[0],
    banco: '4437 Sicoob',
    conta: '42307',
    cliente: 'J C MACHADO DIAS LTDA',
    nome_depositante: '',
    cpf_depositante: '',
    valor_depositado: ''
  });

  useEffect(() => {
    carregarUsuario();
    carregarDados();
  }, []);

  const carregarUsuario = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome, email')
        .eq('id', session.user.id)
        .single();
      setResponsavelNome(profile?.nome || session.user.email);
    }
  };

  const carregarDados = async () => {
    setLoading(true);

    // 1. Busca todas as sangrias em dinheiro na Tesouraria
    const { data: sangrias } = await supabase
      .from('movimento_caixa')
      .select('*')
      .eq('tipo_documento', 'Sangria')
      .eq('forma_pagamento', 'Dinheiro')
      .eq('banco_operador', 'Tesouraria')
      .eq('tipo_operacao', 'Saída -')
      .order('data_operacao', { ascending: false });

    // 2. Busca todos os depósitos bancários registrados
    const { data: deps } = await supabase
      .from('depositos_bancarios')
      .select('*')
      .order('data_deposito', { ascending: false });

    setSangriasTesouraria(sangrias || []);
    setDepositos(deps || []);
    setLoading(false);
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

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const formatarData = (d) => d ? d.split('-').reverse().join('/') : '';

  // Totais
  const totalSangriasTesouraria = sangriasTesouraria.reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
  const totalDepositado = depositos.reduce((acc, curr) => acc + Number(curr.valor_depositado || 0), 0);
  const diferencaSaldo = totalSangriasTesouraria - totalDepositado;

  const handleSalvarDeposito = async (e) => {
    e.preventDefault();
    const valorFloat = parseValorParaFloat(formDeposito.valor_depositado);

    if (valorFloat <= 0) {
      return alert("Informe um valor de depósito válido.");
    }

    setLoading(true);

    const payload = {
      data_deposito: formDeposito.data_deposito,
      banco: formDeposito.banco,
      conta: formDeposito.conta,
      cliente: formDeposito.cliente,
      nome_depositante: formDeposito.nome_depositante,
      cpf_depositante: formDeposito.cpf_depositante,
      valor_depositado: valorFloat,
      responsavel: responsavelNome || 'Sistema'
    };

    const { error } = await supabase.from('depositos_bancarios').insert([payload]);

    setLoading(false);
    if (error) {
      alert("Erro ao gravar depósito: " + error.message);
    } else {
      setSucesso(true);
      setFormDeposito({
        data_deposito: new Date().toISOString().split('T')[0],
        banco: '4437 Sicoob',
        conta: '42307',
        cliente: 'J C MACHADO DIAS LTDA',
        nome_depositante: '',
        cpf_depositante: '',
        valor_depositado: ''
      });
      carregarDados();
      setTimeout(() => setSucesso(false), 4000);
    }
  };

  const handleExcluirDeposito = async (id) => {
    if (!confirm("Deseja realmente excluir este registro de depósito?")) return;
    await supabase.from('depositos_bancarios').delete().eq('id', id);
    carregarDados();
  };

  return (
    <div className="space-y-6">

      {/* CARDS RESUMO DO FLUXO DE TESOURARIA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">ENTRADAS NA TESOURARIA (SANGRIAS)</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{formatarMoeda(totalSangriasTesouraria)}</p>
            <span className="text-[11px] text-gray-400">{sangriasTesouraria.length} sangrias em dinheiro</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Wallet size={24} /></div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">TOTAL DEPOSITADO NO BANCO</p>
            <p className="text-2xl font-black text-indigo-900 mt-1">{formatarMoeda(totalDepositado)}</p>
            <span className="text-[11px] text-gray-400">{depositos.length} depósitos registrados</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Landmark size={24} /></div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">SALDO PENDENTE NA TESOURARIA</p>
            <p className={`text-2xl font-black mt-1 ${diferencaSaldo >= 0 ? 'text-blue-900' : 'text-red-600'}`}>
              {formatarMoeda(diferencaSaldo)}
            </p>
            <span className="text-[11px] text-gray-400 font-medium">Disponível para novos depósitos</span>
          </div>
          <div className={`p-3 rounded-xl ${diferencaSaldo >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
            <Scale size={24} />
          </div>
        </div>
      </div>

      {/* NAVEGAÇÃO DE SUB-ABAS */}
      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-wrap gap-2 justify-between items-center">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSubAba('diferencas')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              subAba === 'diferencas' ? 'bg-[#0f172a] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Scale size={15} /> Conferência & Diferenças
          </button>
          
          <button
            onClick={() => setSubAba('tesouraria')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              subAba === 'tesouraria' ? 'bg-[#0f172a] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Wallet size={15} /> Lançamentos em Tesouraria ({sangriasTesouraria.length})
          </button>

          <button
            onClick={() => setSubAba('depositos')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              subAba === 'depositos' ? 'bg-[#0f172a] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <History size={15} /> Depósitos Bancários ({depositos.length})
          </button>
        </div>

        <button
          onClick={() => setSubAba('novo')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
            subAba === 'novo' ? 'bg-emerald-700 text-white shadow-sm' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          <PlusCircle size={15} /> Incluir Depósito Bancário
        </button>
      </div>

      {/* 1. FORMULÁRIO DE INCLUSÃO DE DEPÓSITO BANCÁRIO */}
      {subAba === 'novo' && (
        <div className="bg-white p-6 rounded-xl border shadow-sm max-w-3xl mx-auto space-y-6">
          <div className="border-b pb-3">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <Landmark className="text-emerald-600" size={18} /> Novo Registro de Depósito Bancário
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Cadastre o comprovante do depósito para abater do saldo disponível na tesouraria.</p>
          </div>

          {sucesso && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
              <CheckCircle size={18} className="text-emerald-600" /> Depósito registrado com sucesso!
            </div>
          )}

          <form onSubmit={handleSalvarDeposito} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Data do Depósito *</label>
                <input
                  type="date"
                  required
                  value={formDeposito.data_deposito}
                  onChange={e => setFormDeposito({ ...formDeposito, data_deposito: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Valor Depositado (R$) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="0,00"
                  value={formDeposito.valor_depositado}
                  onChange={e => setFormDeposito({ ...formDeposito, valor_depositado: aplicarMascaraMoeda(e.target.value) })}
                  className="w-full p-2.5 border rounded-lg bg-gray-50 font-black text-gray-900 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Banco Destino *</label>
                <input
                  type="text"
                  required
                  value={formDeposito.banco}
                  onChange={e => setFormDeposito({ ...formDeposito, banco: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-white font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Conta Destino *</label>
                <input
                  type="text"
                  required
                  value={formDeposito.conta}
                  onChange={e => setFormDeposito({ ...formDeposito, conta: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-white font-semibold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold text-gray-700 mb-1">Cliente / Favorecido *</label>
                <input
                  type="text"
                  required
                  value={formDeposito.cliente}
                  onChange={e => setFormDeposito({ ...formDeposito, cliente: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-white font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nome do Depositante</label>
                <input
                  type="text"
                  placeholder="Nome de quem realizou o depósito..."
                  value={formDeposito.nome_depositante}
                  onChange={e => setFormDeposito({ ...formDeposito, nome_depositante: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">CPF do Depositante</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={formDeposito.cpf_depositante}
                  onChange={e => setFormDeposito({ ...formDeposito, cpf_depositante: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setSubAba('diferencas')}
                className="px-5 py-2.5 border rounded-lg text-gray-600 font-semibold hover:bg-gray-50"
              >
                Voltar à Conferência
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-8 rounded-lg shadow-md"
              >
                {loading ? "Gravando..." : "Salvar Depósito"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. SUB-ABA: CONFERÊNCIA & DIFERENÇAS */}
      {subAba === 'diferencas' && (
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
          <div className="border-b pb-3 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Scale size={18} className="text-primary" /> Balanço de Sangrias e Depósitos
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Visão consolidada comparando a entrada de dinheiro físico da Tesouraria e os depósitos bancários.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ÚLTIMAS SANGRIAS DA TESOURARIA */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-xs uppercase text-emerald-800 flex items-center gap-1.5">
                  <ArrowDownRight size={16} /> Entradas da Tesouraria (Sangrias)
                </h4>
                <span className="text-xs font-black text-emerald-700">{formatarMoeda(totalSangriasTesouraria)}</span>
              </div>
              <div className="border rounded-xl max-h-80 overflow-y-auto divide-y divide-gray-100 text-xs">
                {sangriasTesouraria.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 italic">Nenhuma sangria em dinheiro registrada.</div>
                ) : (
                  sangriasTesouraria.map(s => (
                    <div key={s.id} className="p-3 hover:bg-gray-50 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-800">{formatarData(s.data_operacao)} &bull; {s.responsavel}</p>
                        <span className="text-[10px] text-gray-500">{s.descricao || 'Sangria em dinheiro para tesouraria'}</span>
                      </div>
                      <span className="font-black text-emerald-600">{formatarMoeda(s.valor)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ÚLTIMOS DEPÓSITOS BANCÁRIOS */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-xs uppercase text-indigo-900 flex items-center gap-1.5">
                  <ArrowUpRight size={16} /> Saídas para Banco (Depósitos)
                </h4>
                <span className="text-xs font-black text-indigo-900">{formatarMoeda(totalDepositado)}</span>
              </div>
              <div className="border rounded-xl max-h-80 overflow-y-auto divide-y divide-gray-100 text-xs">
                {depositos.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 italic">Nenhum depósito bancário registrado.</div>
                ) : (
                  depositos.map(d => (
                    <div key={d.id} className="p-3 hover:bg-gray-50 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-800">{formatarData(d.data_deposito)} &bull; {d.banco}</p>
                        <span className="text-[10px] text-gray-500">Conta: {d.conta} &bull; {d.nome_depositante || 'Depositante não inf.'}</span>
                      </div>
                      <span className="font-black text-indigo-900">{formatarMoeda(d.valor_depositado)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. SUB-ABA: LANÇAMENTOS EM TESOURARIA */}
      {subAba === 'tesouraria' && (
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <h3 className="font-bold text-gray-800 text-sm">Lançamentos de Sangria em Dinheiro (Tesouraria)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-500 uppercase font-bold">
                  <th className="p-3">Data Op.</th>
                  <th className="p-3">Responsável</th>
                  <th className="p-3">Data/Hora Reg.</th>
                  <th className="p-3">Tipo Doc.</th>
                  <th className="p-3">Forma Pgto</th>
                  <th className="p-3">Local</th>
                  <th className="p-3 text-right">Valor Sangria</th>
                  <th className="p-3">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sangriasTesouraria.length === 0 ? (
                  <tr><td colSpan="8" className="p-6 text-center text-gray-400 italic">Nenhum lançamento de sangria localizado.</td></tr>
                ) : (
                  sangriasTesouraria.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="p-3 font-semibold text-gray-700">{formatarData(s.data_operacao)}</td>
                      <td className="p-3 text-gray-600">{s.responsavel}</td>
                      <td className="p-3 text-gray-500">{s.data_lancamento}</td>
                      <td className="p-3 font-bold text-gray-800">{s.tipo_documento}</td>
                      <td className="p-3 text-gray-600">{s.forma_pagamento}</td>
                      <td className="p-3 font-semibold text-indigo-900">{s.banco_operador}</td>
                      <td className="p-3 text-right font-black text-emerald-600">{formatarMoeda(s.valor)}</td>
                      <td className="p-3 text-gray-600">{s.descricao || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. SUB-ABA: HISTÓRICO DE DEPÓSITOS BANCÁRIOS */}
      {subAba === 'depositos' && (
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <h3 className="font-bold text-gray-800 text-sm">Histórico de Depósitos Bancários Realizados</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-500 uppercase font-bold">
                  <th className="p-3">Data Depósito</th>
                  <th className="p-3">Banco</th>
                  <th className="p-3">Conta</th>
                  <th className="p-3">Cliente / Favorecido</th>
                  <th className="p-3">Depositante</th>
                  <th className="p-3">CPF Depositante</th>
                  <th className="p-3 text-right">Valor Depositado</th>
                  <th className="p-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {depositos.length === 0 ? (
                  <tr><td colSpan="8" className="p-6 text-center text-gray-400 italic">Nenhum depósito bancário registrado.</td></tr>
                ) : (
                  depositos.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="p-3 font-semibold text-gray-700">{formatarData(d.data_deposito)}</td>
                      <td className="p-3 font-bold text-gray-800">{d.banco}</td>
                      <td className="p-3 text-gray-600">{d.conta}</td>
                      <td className="p-3 font-semibold text-gray-700">{d.cliente}</td>
                      <td className="p-3 text-gray-600">{d.nome_depositante || '-'}</td>
                      <td className="p-3 text-gray-500">{d.cpf_depositante || '-'}</td>
                      <td className="p-3 text-right font-black text-indigo-900">{formatarMoeda(d.valor_depositado)}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleExcluirDeposito(d.id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
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
        </div>
      )}

    </div>
  );
}