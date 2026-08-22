import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { LayoutDashboard, PlusCircle, ListFilter, FileText, Landmark, Banknote, ShieldAlert } from 'lucide-react';
import DashboardTab from './DashboardTab';
import NovoLancamentoTab from './NovoLancamentoTab';
import ListagemTab from './ListagemTab';
import RelatoriosTab from './RelatoriosTab';
import DepositosBancariosTab from './DepositosBancariosTab';
import RetiradasTab from './RetiradasTab';

export default function MovimentoCaixaIndex() {
  const [abaAtiva, setAbaAtiva] = useState('listagem');
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  const [temPermissao, setTemPermissao] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    verificarAcessoModulo();
  }, []);

  const verificarAcessoModulo = async () => {
    setVerificandoAcesso(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate('/');
      return;
    }

    const email = session.user.email;

    // Administrador principal e administradores têm acesso automático
    if (email === 'admin@cppro.com') {
      setTemPermissao(true);
      setVerificandoAcesso(false);
      return;
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (profile?.role === 'admin') {
      setTemPermissao(true);
      setVerificandoAcesso(false);
      return;
    }

    // Consulta permissão explícita na matriz
    const { data: perm } = await supabase
      .from('permissoes_usuario')
      .select('pode_visualizar')
      .eq('user_id', session.user.id)
      .eq('modulo', 'movimento_caixa')
      .single();

    if (perm && perm.pode_visualizar === true) {
      setTemPermissao(true);
    } else {
      setTemPermissao(false);
    }
    setVerificandoAcesso(false);
  };

  if (verificandoAcesso) {
    return (
      <div className="bg-white p-12 rounded-xl border shadow-sm text-center text-xs font-semibold text-gray-400">
        Verificando permissões de acesso ao Caixa Geral...
      </div>
    );
  }

  if (!temPermissao) {
    return (
      <div className="bg-white p-12 rounded-xl border border-red-200 shadow-sm text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert size={26} />
        </div>
        <h2 className="text-lg font-bold text-gray-800">Acesso Restrito</h2>
        <p className="text-xs text-gray-500">
          Você não possui permissão para visualizar ou gerenciar o módulo <strong>Movimento Caixa Geral</strong>.
        </p>
        <button
          onClick={() => navigate('/contas-a-pagar')}
          className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-lg shadow hover:bg-blue-900 transition-colors"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Movimento Caixa Geral</h1>
          <p className="text-xs text-gray-500 font-medium">Controle de entradas, saídas diárias, depósitos e comprovantes de retirada.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setAbaAtiva('dashboard')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
              abaAtiva === 'dashboard' ? 'bg-[#0f172a] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <LayoutDashboard size={16} /> Dashboard
          </button>

          <button
            onClick={() => setAbaAtiva('novo')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
              abaAtiva === 'novo' ? 'bg-[#0f172a] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <PlusCircle size={16} /> Novo Lançamento
          </button>

          <button
            onClick={() => setAbaAtiva('listagem')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
              abaAtiva === 'listagem' ? 'bg-[#0f172a] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ListFilter size={16} /> Listagem
          </button>

          <button
            onClick={() => setAbaAtiva('depositos')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
              abaAtiva === 'depositos' ? 'bg-indigo-900 text-white shadow-sm' : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <Landmark size={16} /> Depósitos Bancários
          </button>

          <button
            onClick={() => setAbaAtiva('retiradas')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
              abaAtiva === 'retiradas' ? 'bg-emerald-700 text-white shadow-sm' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <Banknote size={16} /> Retiradas
          </button>

          <button
            onClick={() => setAbaAtiva('relatorios')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
              abaAtiva === 'relatorios' ? 'bg-[#0f172a] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileText size={16} /> Relatórios
          </button>
        </div>
      </div>

      <div>
        {abaAtiva === 'dashboard' && <DashboardTab />}
        {abaAtiva === 'novo' && <NovoLancamentoTab />}
        {abaAtiva === 'listagem' && <ListagemTab />}
        {abaAtiva === 'depositos' && <DepositosBancariosTab />}
        {abaAtiva === 'retiradas' && <RetiradasTab />}
        {abaAtiva === 'relatorios' && <RelatoriosTab />}
      </div>
    </div>
  );
}