import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, List, FileText, Settings, LogOut, CheckSquare, Calculator, Tag, Crown, Zap, Wallet } from 'lucide-react';
import { supabase } from '../services/supabase';
import { differenceInDays, addDays, startOfDay } from 'date-fns';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  // --- CÁLCULO DO PERÍODO DE TESTE ---
  const dataInicioTeste = new Date(2026, 0, 31); // 31/01/2026 (Mês 0 = Janeiro)
  const diasTotais = 90;
  const dataFimTeste = addDays(dataInicioTeste, diasTotais);
  const hoje = startOfDay(new Date());

  const diasRestantes = differenceInDays(dataFimTeste, hoje);
  // Calcula porcentagem para a barra de progresso (Inverso: quanto menos dias, mais cheia ou vazia, depende do design. Aqui: começa cheia e esvazia)
  const porcentagemRestante = Math.max(0, Math.min(100, (diasRestantes / diasTotais) * 100));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path ? "bg-secondary" : "hover:bg-blue-800";

  return (
    <div className="bg-primary text-white w-64 min-h-screen flex flex-col p-4">
      <h1 className="text-2xl font-bold mb-8 text-center tracking-wider border-b border-blue-800 pb-4">CP PRO</h1>

      <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
        <Link to="/dashboard" className={`flex items-center gap-3 p-3 rounded transition-colors ${isActive('/dashboard')}`}>
          <LayoutDashboard size={20} /> Visão Geral
        </Link>
        <Link to="/incluir" className={`flex items-center gap-3 p-3 rounded transition-colors ${isActive('/incluir')}`}>
          <PlusCircle size={20} /> Incluir Lançamento
        </Link>
        <Link to="/listagem" className={`flex items-center gap-3 p-3 rounded transition-colors ${isActive('/listagem')}`}>
          <List size={20} /> Listagem
        </Link>
        <Link to="/despesas" className={`flex items-center gap-3 p-3 rounded transition-colors ${isActive('/despesas')}`}>
          <Wallet size={20} /> Despesas
        </Link>
        <Link to="/relatorios" className={`flex items-center gap-3 p-3 rounded transition-colors ${isActive('/relatorios')}`}>
          <FileText size={20} /> Relatórios
        </Link>
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

      <button onClick={handleLogout} className="flex items-center gap-3 p-3 rounded hover:bg-red-600 transition-colors text-red-200 hover:text-white mt-4 border-t border-blue-800 pt-4">
        <LogOut size={20} /> Sair
      </button>
    </div>
  );
}