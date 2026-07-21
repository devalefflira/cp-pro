import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  LayoutDashboard, 
  PlusCircle, 
  List, 
  Wallet, 
  FileText, 
  Tag, 
  CheckSquare, 
  Calculator, 
  Settings, 
  Crown, 
  LogOut, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const menuItems = [
    { path: '/', label: 'Visão Geral', icon: LayoutDashboard },
    { path: '/incluir', label: 'Incluir Lançamento', icon: PlusCircle },
    { path: '/listagem', label: 'Listagem', icon: List },
    { path: '/despesas', label: 'Despesas', icon: Wallet },
    { path: '/relatorios', label: 'Relatórios', icon: FileText },
    { path: '/etiquetas', label: 'Etiquetas', icon: Tag },
    { path: '/tarefas', label: 'Tarefas', icon: CheckSquare },
    { path: '/calculadoras', label: 'Calculadoras', icon: Calculator },
    { path: '/grupos', label: 'Cadastros Auxiliares', icon: Settings },
  ];

  return (
    <aside 
      className={`bg-[#003366] text-white min-h-screen p-4 flex flex-col justify-between transition-all duration-300 relative ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* BOTÃO RETRÁTIL (TOGGLE) */}
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-7 bg-white text-[#003366] p-1 rounded-full border border-gray-300 shadow-md hover:bg-gray-100 transition-colors z-50"
        title={collapsed ? "Expandir menu" : "Encolher menu"}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div>
        {/* LOGO DA MARCA + COROA AMARELA */}
        <div className="flex items-center gap-3 mb-8 px-2 overflow-hidden">
          <img 
            src="/rocket.svg" 
            alt="Rocket Logo" 
            className="w-8 h-8 shrink-0 object-contain" 
          />
          {!collapsed && (
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-bold tracking-wider whitespace-nowrap">
                CP PRO
              </span>
              <Crown size={18} className="text-yellow-400 fill-yellow-400 shrink-0" />
            </div>
          )}
        </div>

        {/* MENU NAVEGAÇÃO */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : ''}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors font-semibold text-sm ${
                  active 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:bg-[#00264d] hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon size={20} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* RODAPÉ E BOTÃO DE SAÍDA */}
      <div className="pt-4 border-t border-blue-900">
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sair' : ''}
          className={`flex items-center gap-3 p-3 w-full rounded-lg text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-colors font-semibold text-sm ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut size={20} className="shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}