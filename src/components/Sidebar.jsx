import { Link, useLocation } from 'react-router-dom';
// Importe o ícone CheckSquare aqui
import { LayoutDashboard, PlusCircle, List, FileText, Users, CheckSquare, LogOut, Rocket } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // Função auxiliar para destacar o link ativo
  const isActive = (path) => location.pathname === path 
    ? "bg-blue-700 text-white shadow-lg" 
    : "text-blue-100 hover:bg-blue-800 hover:text-white";

  return (
    <aside className="w-64 bg-primary h-screen fixed left-0 top-0 flex flex-col justify-between z-50">
      
      {/* Topo: Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8 text-white">
          <Rocket size={32} />
          <h1 className="text-2xl font-bold tracking-wider">CP PRO</h1>
        </div>

        {/* Navegação */}
        <nav className="space-y-2">
          
          <Link to="/dashboard" className={`flex items-center gap-3 p-3 rounded-lg transition-all font-medium ${isActive('/dashboard')}`}>
            <LayoutDashboard size={20} />
            Visão Geral
          </Link>

          <Link to="/incluir" className={`flex items-center gap-3 p-3 rounded-lg transition-all font-medium ${isActive('/incluir')}`}>
            <PlusCircle size={20} />
            Incluir Lançamento
          </Link>

          <Link to="/listagem" className={`flex items-center gap-3 p-3 rounded-lg transition-all font-medium ${isActive('/listagem')}`}>
            <List size={20} />
            Listagem
          </Link>

          <Link to="/relatorios" className={`flex items-center gap-3 p-3 rounded-lg transition-all font-medium ${isActive('/relatorios')}`}>
            <FileText size={20} />
            Relatórios
          </Link>

          <Link to="/grupos" className={`flex items-center gap-3 p-3 rounded-lg transition-all font-medium ${isActive('/grupos')}`}>
            <Users size={20} />
            Cadastrar Grupos
          </Link>

          {/* --- NOVO LINK TAREFAS --- */}
          <Link to="/tarefas" className={`flex items-center gap-3 p-3 rounded-lg transition-all font-medium ${isActive('/tarefas')}`}>
             <CheckSquare size={20} />
             Tarefas
          </Link>

        </nav>
      </div>

      {/* Rodapé: Sair */}
      <div className="p-6">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 p-3 text-blue-200 hover:text-white transition-colors w-full"
        >
          <LogOut size={20} />
          Sair
        </button>
      </div>
    </aside>
  );
}