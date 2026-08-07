import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { LayoutDashboard, PlusCircle, List, FileText, FolderTree } from 'lucide-react';

import DashboardTab from './DashboardTab';
import ListagemTab from './ListagemTab';
import LancarTab from './LancarTab';
import RelatoriosTab from './RelatoriosTab';
import EstruturaTab from './EstruturaTab';

export default function Despesas() {
  const [activeTab, setActiveTab] = useState('despesas_nova');
  const [permissoes, setPermissoes] = useState({});
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    carregarPermissoes();
  }, []);

  const carregarPermissoes = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setUserEmail(session.user.email);

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    const role = profile?.role || 'user';

    if (session.user.email === 'admin@cppro.com' || role === 'admin') {
      setPermissoes({
        despesas_dashboard: true,
        despesas_listagem: true,
        despesas_nova: true,
        despesas_relatorios: true,
        despesas_estrutura: true
      });
      setActiveTab('despesas_dashboard');
      return;
    }

    const { data: perms } = await supabase.from('permissoes_usuario').select('*').eq('user_id', session.user.id);
    
    const mapaPerms = {};
    (perms || []).forEach(p => {
      mapaPerms[p.modulo] = p.pode_visualizar;
    });

    setPermissoes(mapaPerms);

    if (mapaPerms.despesas_dashboard) setActiveTab('despesas_dashboard');
    else if (mapaPerms.despesas_listagem) setActiveTab('despesas_listagem');
    else if (mapaPerms.despesas_nova) setActiveTab('despesas_nova');
    else if (mapaPerms.despesas_estrutura) setActiveTab('despesas_estrutura');
  };

  return (
    <div className="space-y-6 pb-10">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold text-primary flex items-center gap-2">
          Gestão de Despesas
        </h2>

        <div className="flex bg-white rounded-lg shadow-sm border p-1 text-sm overflow-x-auto w-full sm:w-auto">
          {(userEmail === 'admin@cppro.com' || permissoes.despesas_dashboard) && (
            <button
              onClick={() => setActiveTab('despesas_dashboard')}
              className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'despesas_dashboard' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <LayoutDashboard size={16} /> Dashboard
            </button>
          )}

          {(userEmail === 'admin@cppro.com' || permissoes.despesas_listagem) && (
            <button
              onClick={() => setActiveTab('despesas_listagem')}
              className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'despesas_listagem' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <List size={16} /> Listagem
            </button>
          )}

          {(userEmail === 'admin@cppro.com' || permissoes.despesas_nova) && (
            <button
              onClick={() => setActiveTab('despesas_nova')}
              className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'despesas_nova' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <PlusCircle size={16} /> Nova Despesa
            </button>
          )}

          {(userEmail === 'admin@cppro.com' || permissoes.despesas_relatorios) && (
            <button
              onClick={() => setActiveTab('despesas_relatorios')}
              className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'despesas_relatorios' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText size={16} /> Relatórios
            </button>
          )}

          {(userEmail === 'admin@cppro.com' || permissoes.despesas_estrutura) && (
            <button
              onClick={() => setActiveTab('despesas_estrutura')}
              className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'despesas_estrutura' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FolderTree size={16} /> Estrutura
            </button>
          )}
        </div>
      </div>

      {activeTab === 'despesas_dashboard' && <DashboardTab />}
      {activeTab === 'despesas_listagem' && <ListagemTab />}
      {activeTab === 'despesas_nova' && <LancarTab />}
      {activeTab === 'despesas_relatorios' && <RelatoriosTab />}
      {activeTab === 'despesas_estrutura' && <EstruturaTab />}

    </div>
  );
}