import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  LayoutDashboard, Wallet, ArrowLeftRight, FileText, 
  CheckSquare, Calculator, Settings, Crown, LogOut, ChevronLeft, 
  ChevronRight, ShieldAlert, Users, CircleDollarSign 
} from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [userRole, setUserRole] = useState('user');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    carregarPerfil();
  }, []);

  const carregarPerfil = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUserEmail(session.user.email);
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      setUserRole(data?.role || 'user');
    }
  };

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('cp_session_version');
    navigate('/');
  };

  const handleDeslogarTodos = async () => {
    if (!confirm("Deseja deslogar todos os usuários comuns ativos?")) return;
    const { error } = await supabase.rpc('invalidar_sessoes_usuarios');
    if (error) alert("Erro: " + error.message);
    else alert("Usuários deslogados com sucesso!");
  };

  const menuItems = [
    { path: '/contas-a-pagar', label: 'Contas a Pagar', icon: LayoutDashboard, roles: ['admin', 'gestor', 'user'] },
    { path: '/movimento-caixa', label: 'Movimento Caixa', icon: CircleDollarSign, roles: ['admin', 'gestor', 'user'] },
    { path: '/despesas', label: 'Despesas', icon: Wallet, roles: ['admin', 'gestor', 'user'] },
    { path: '/conciliacao', label: 'Conciliação Bancária', icon: ArrowLeftRight, roles: ['admin', 'gestor'] },
    { path: '/usuarios', label: 'Gestão de Usuários', icon: Users, roles: ['admin'] },
    { path: '/relatorios', label: 'Relatórios Gerenciais', icon: FileText, roles: ['admin', 'gestor'] },
    { path: '/tarefas', label: 'Tarefas', icon: CheckSquare, roles: ['admin', 'gestor', 'user'] },
    { path: '/calculadoras', label: 'Calculadoras', icon: Calculator, roles: ['admin', 'gestor', 'user'] },
    { path: '/grupos', label: 'Cadastros Auxiliares', icon: Settings, roles: ['admin', 'gestor', 'user'] },
  ];

  return (
    <aside className={`bg-[#003366] text-white min-h-screen p-4 flex flex-col justify-between transition-all duration-300 relative ${collapsed ? 'w-20' : 'w-64'}`}>
      
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-7 bg-white text-[#003366] p-1 rounded-full border border-gray-300 shadow-md hover:bg-gray-100 transition-colors z-50"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div>
        <div className="flex items-center gap-3 mb-8 px-2 overflow-hidden">
          <img src="/rocket.svg" alt="CP PRO" className="w-8 h-8 shrink-0 object-contain" />
          {!collapsed && (
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-bold tracking-wider whitespace-nowrap">CP PRO</span>
              <Crown size={18} className="text-yellow-400 fill-yellow-400 shrink-0" />
            </div>
          )}
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            if (userEmail !== 'admin@cppro.com' && !item.roles.includes(userRole)) return null;

            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : ''}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors font-semibold text-sm ${
                  active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-300 hover:bg-[#00264d] hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon size={20} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-blue-900 space-y-2">
        {userEmail === 'admin@cppro.com' && (
          <button
            onClick={handleDeslogarTodos}
            title={collapsed ? 'Deslogar Todos' : ''}
            className={`flex items-center gap-3 p-2.5 w-full rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600 hover:text-white transition-colors font-bold text-xs ${collapsed ? 'justify-center' : ''}`}
          >
            <ShieldAlert size={18} className="shrink-0 text-red-400" />
            {!collapsed && <span>Deslogar Todos Usuários</span>}
          </button>
        )}

        <button
          onClick={handleLogout}
          title={collapsed ? 'Sair' : ''}
          className={`flex items-center gap-3 p-3 w-full rounded-lg text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-colors font-semibold text-sm ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={20} className="shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}