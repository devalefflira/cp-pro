import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { LayoutDashboard, PlusCircle, List, FileText, Tag } from 'lucide-react';

import Dashboard from '../Dashboard';
import IncluirLancamento from '../IncluirLancamento';
import Listagem from '../Listagem';
import Etiquetas from '../Etiquetas';
import RelatoriosTab from './RelatoriosTab';

export default function ContasPagar() {
  const [activeTab, setActiveTab] = useState('cp_incluir');
  const [permissoes, setPermissoes] = useState({});
  const [userRole, setUserRole] = useState('user');
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
    setUserRole(role);

    if (session.user.email === 'admin@cppro.com' || role === 'admin') {
      setPermissoes({
        cp_visao_geral: true,
        cp_incluir: true,
        cp_listagem: true,
        cp_relatorios: true,
        cp_etiquetas: true
      });
      setActiveTab('cp_visao_geral');
      return;
    }

    const { data: perms } = await supabase.from('permissoes_usuario').select('*').eq('user_id', session.user.id);
    
    const mapaPerms = {};
    (perms || []).forEach(p => {
      mapaPerms[p.modulo] = p.pode_visualizar;
    });

    setPermissoes(mapaPerms);

    // Seleciona a primeira aba visível para o usuário
    if (mapaPerms.cp_visao_geral) setActiveTab('cp_visao_geral');
    else if (mapaPerms.cp_incluir) setActiveTab('cp_incluir');
    else if (mapaPerms.cp_listagem) setActiveTab('cp_listagem');
    else if (mapaPerms.cp_etiquetas) setActiveTab('cp_etiquetas');
  };

  return (
    <div className="space-y-6 pb-10">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold text-primary flex items-center gap-2">
          Contas a Pagar
        </h2>

        <div className="flex bg-white rounded-lg shadow-sm border p-1 text-sm overflow-x-auto w-full sm:w-auto">
          {(userEmail === 'admin@cppro.com' || permissoes.cp_visao_geral) && (
            <button
              onClick={() => setActiveTab('cp_visao_geral')}
              className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'cp_visao_geral' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <LayoutDashboard size={16} /> Visão Geral
            </button>
          )}

          {(userEmail === 'admin@cppro.com' || permissoes.cp_incluir) && (
            <button
              onClick={() => setActiveTab('cp_incluir')}
              className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'cp_incluir' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <PlusCircle size={16} /> Incluir Lançamento
            </button>
          )}

          {(userEmail === 'admin@cppro.com' || permissoes.cp_listagem) && (
            <button
              onClick={() => setActiveTab('cp_listagem')}
              className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'cp_listagem' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <List size={16} /> Listagem
            </button>
          )}

          {(userEmail === 'admin@cppro.com' || permissoes.cp_relatorios) && (
            <button
              onClick={() => setActiveTab('cp_relatorios')}
              className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'cp_relatorios' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText size={16} /> Relatórios
            </button>
          )}

          {(userEmail === 'admin@cppro.com' || permissoes.cp_etiquetas) && (
            <button
              onClick={() => setActiveTab('cp_etiquetas')}
              className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'cp_etiquetas' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Tag size={16} /> Etiquetas
            </button>
          )}
        </div>
      </div>

      {activeTab === 'cp_visao_geral' && <Dashboard />}
      {activeTab === 'cp_incluir' && <IncluirLancamento />}
      {activeTab === 'cp_listagem' && <Listagem />}
      {activeTab === 'cp_relatorios' && <RelatoriosTab />}
      {activeTab === 'cp_etiquetas' && <Etiquetas />}

    </div>
  );
}