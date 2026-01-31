import { Link, useLocation, useNavigate } from 'react-router-dom';
// ATENÇÃO AQUI: Adicionamos o 'Tag' na lista de importações abaixo
import { LayoutDashboard, PlusCircle, List, FileText, Settings, LogOut, CheckSquare, Calculator, Tag } from 'lucide-react';
import { supabase } from '../services/supabase';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path ? "bg-secondary" : "hover:bg-blue-800";

  return (
    <div className="bg-primary text-white w-64 min-h-screen flex flex-col p-4">
      <h1 className="text-2xl font-bold mb-10 text-center tracking-wider">CP PRO</h1>
      
      <nav className="flex-1 space-y-2">
        <Link to="/dashboard" className={`flex items-center gap-3 p-3 rounded transition-colors ${isActive('/dashboard')}`}>
          <LayoutDashboard size={20} /> Visão Geral
        </Link>
        <Link to="/incluir" className={`flex items-center gap-3 p-3 rounded transition-colors ${isActive('/incluir')}`}>
          <PlusCircle size={20} /> Incluir Lançamento
        </Link>
        <Link to="/listagem" className={`flex items-center gap-3 p-3 rounded transition-colors ${isActive('/listagem')}`}>
          <List size={20} /> Listagem
        </Link>
        <Link to="/relatorios" className={`flex items-center gap-3 p-3 rounded transition-colors ${isActive('/relatorios')}`}>
          <FileText size={20} /> Relatórios
        </Link>
        
        {/* LINK ETIQUETAS COM O ÍCONE TAG */}
        <Link to="/etiquetas" className={`flex items-center gap-3 p-3 rounded transition-colors ${isActive('/etiquetas')}`}>
          <Tag size={20} /> Etiquetas
        </Link>

        <Link to="/tarefas" className={`flex items-center gap-3 p-3 rounded transition-colors ${isActive('/tarefas')}`}>
          <CheckSquare size={20} /> Tarefas
        </Link>
        <Link to="/calculadoras" className={`flex items-center gap-3 p-3 rounded transition-colors ${isActive('/calculadoras')}`}>
          <Calculator size={20} /> Calculadoras
        </Link>
        <Link to="/grupos" className={`flex items-center gap-3 p-3 rounded transition-colors ${isActive('/grupos')}`}>
          <Settings size={20} /> Cadastros Auxiliares
        </Link>
      </nav>

      <button onClick={handleLogout} className="flex items-center gap-3 p-3 rounded hover:bg-red-600 mt-auto transition-colors text-red-200 hover:text-white">
        <LogOut size={20} /> Sair
      </button>
    </div>
  );
}