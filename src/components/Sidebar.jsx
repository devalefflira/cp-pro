import { Link, useLocation } from 'react-router-dom';
import { Rocket, LayoutDashboard, PlusSquare, List, FileText, Settings, LogOut } from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();

  // Função auxiliar para verificar se o link está ativo
  const isActive = (path) => {
    return location.pathname === path ? 'bg-secondary' : 'hover:bg-white/10';
  };

  return (
    <aside className="w-64 h-screen bg-primary text-white flex flex-col fixed left-0 top-0 shadow-xl">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-white/10">
        <Rocket size={32} className="text-blue-300" />
        <span className="text-2xl font-bold tracking-wider">CP PRO</span>
      </div>

      {/* Navegação */}
      <nav className="flex-1 p-4 space-y-2">
        <Link to="/dashboard" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive('/dashboard')}`}>
          <LayoutDashboard size={20} />
          <span>Visão Geral</span>
        </Link>

        <Link to="/incluir" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive('/incluir')}`}>
          <PlusSquare size={20} />
          <span>Incluir Lançamento</span>
        </Link>

        <Link to="/listagem" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive('/listagem')}`}>
          <List size={20} />
          <span>Listagem</span>
        </Link>

        <Link to="/relatorios" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive('/relatorios')}`}>
          <FileText size={20} />
          <span>Relatórios</span>
        </Link>

        <Link to="/grupos" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive('/grupos')}`}>
          <Settings size={20} />
          <span>Cadastrar Grupos</span>
        </Link>
      </nav>

      {/* Botão Sair */}
      <div className="p-4 border-t border-white/10">
        <Link to="/" className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-500/20 text-red-200 transition-colors">
          <LogOut size={20} />
          <span>Sair</span>
        </Link>
      </div>
    </aside>
  );
}