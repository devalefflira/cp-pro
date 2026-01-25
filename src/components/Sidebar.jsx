import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, PlusCircle, List, FileText, 
  Users, CheckSquare, LogOut, Rocket, Calculator, X 
} from 'lucide-react';
import { supabase } from '../services/supabase';

export default function Sidebar({ isOpen, toggle }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path 
    ? "bg-blue-700 text-white shadow-lg" 
    : "text-blue-100 hover:bg-blue-800 hover:text-white";

  // --- ESTA É A FUNÇÃO QUE ESTAVA FALTANDO ---
  const handleLinkClick = () => {
    // Se a tela for pequena (celular), fecha o menu ao clicar num link
    if (window.innerWidth < 768) {
      toggle();
    }
  };

  return (
    <aside 
      className={`
        bg-primary h-screen fixed left-0 top-0 flex flex-col justify-between z-40 shadow-2xl
        transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64' : 'w-20'} 
      `}
    >
      {/* --- TOPO --- */}
      <div className="p-4">
        
        {/* --- LOGO (BOTÃO DE TOGGLE) --- */}
        <div 
          onClick={toggle} 
          className={`
            flex items-center gap-3 mb-8 text-white cursor-pointer hover:bg-blue-800 p-2 rounded-lg transition-colors
            ${isOpen ? 'justify-start' : 'justify-center'}
          `}
          title={isOpen ? "Recolher Menu" : "Expandir Menu"}
        >
          <Rocket size={32} className="min-w-[32px]" />
          
          <h1 className={`text-2xl font-bold tracking-wider whitespace-nowrap overflow-hidden transition-all duration-300 ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
            CP PRO
          </h1>
        </div>

        {/* --- NAVEGAÇÃO --- */}
        <nav className="space-y-2">
          
          <Link to="/dashboard" onClick={handleLinkClick} className={`flex items-center gap-3 p-3 rounded-lg transition-all font-medium ${isActive('/dashboard')} ${isOpen ? '' : 'justify-center'}`}>
            <LayoutDashboard size={20} className="min-w-[20px]" />
            <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>Visão Geral</span>
          </Link>

          <Link to="/incluir" onClick={handleLinkClick} className={`flex items-center gap-3 p-3 rounded-lg transition-all font-medium ${isActive('/incluir')} ${isOpen ? '' : 'justify-center'}`}>
            <PlusCircle size={20} className="min-w-[20px]" />
            <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>Incluir</span>
          </Link>

          <Link to="/listagem" onClick={handleLinkClick} className={`flex items-center gap-3 p-3 rounded-lg transition-all font-medium ${isActive('/listagem')} ${isOpen ? '' : 'justify-center'}`}>
            <List size={20} className="min-w-[20px]" />
            <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>Listagem</span>
          </Link>

          <Link to="/relatorios" onClick={handleLinkClick} className={`flex items-center gap-3 p-3 rounded-lg transition-all font-medium ${isActive('/relatorios')} ${isOpen ? '' : 'justify-center'}`}>
            <FileText size={20} className="min-w-[20px]" />
            <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>Relatórios</span>
          </Link>

          <Link to="/grupos" onClick={handleLinkClick} className={`flex items-center gap-3 p-3 rounded-lg transition-all font-medium ${isActive('/grupos')} ${isOpen ? '' : 'justify-center'}`}>
            <Users size={20} className="min-w-[20px]" />
            <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>Grupos</span>
          </Link>

          <Link to="/tarefas" onClick={handleLinkClick} className={`flex items-center gap-3 p-3 rounded-lg transition-all font-medium ${isActive('/tarefas')} ${isOpen ? '' : 'justify-center'}`}>
             <CheckSquare size={20} className="min-w-[20px]" />
             <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>Tarefas</span>
          </Link>

          <Link to="/calculadoras" onClick={handleLinkClick} className={`flex items-center gap-3 p-3 rounded-lg transition-all font-medium ${isActive('/calculadoras')} ${isOpen ? '' : 'justify-center'}`}>
             <Calculator size={20} className="min-w-[20px]" />
             <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>Calculadoras</span>
          </Link>

        </nav>
      </div>

      {/* --- RODAPÉ --- */}
      <div className="p-4">
        <button 
          onClick={handleLogout}
          className={`flex items-center gap-3 p-3 text-blue-200 hover:text-white transition-colors w-full rounded-lg hover:bg-blue-900 ${isOpen ? '' : 'justify-center'}`}
        >
          <LogOut size={20} className="min-w-[20px]" />
          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>Sair</span>
        </button>
      </div>
    </aside>
  );
}