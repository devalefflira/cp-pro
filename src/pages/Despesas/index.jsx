import { useState } from 'react';
import { LayoutDashboard, List, PlusCircle, Layers, FileText } from 'lucide-react';
import DashboardTab from './DashboardTab';
import ListagemTab from './ListagemTab';
import LancarTab from './LancarTab';
import EstruturaTab from './EstruturaTab';
import RelatoriosTab from './RelatoriosTab'; // 👈 Importação da nova aba

export default function Despesas() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'listagem', 'lancar', 'estrutura', 'relatorios'

  return (
    <div className="space-y-6 pb-10">
      
      {/* CABEÇALHO DO MÓDULO COM AS NAVEGAÇÕES POR ABAS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold text-primary flex items-center gap-2">
          Gestão de Despesas
        </h2>

        <div className="flex bg-white rounded-lg shadow-sm border p-1 text-sm overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <LayoutDashboard size={16} /> Dashboard
          </button>

          <button
            onClick={() => setActiveTab('listagem')}
            className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'listagem' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <List size={16} /> Listagem
          </button>

          <button
            onClick={() => setActiveTab('lancar')}
            className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'lancar' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <PlusCircle size={16} /> Nova Despesa
          </button>

          <button
            onClick={() => setActiveTab('relatorios')}
            className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'relatorios' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText size={16} /> Relatórios
          </button>

          <button
            onClick={() => setActiveTab('estrutura')}
            className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'estrutura' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Layers size={16} /> Estrutura (CC)
          </button>
        </div>
      </div>

      {/* CONTEÚDO DA ABA ATIVA */}
      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'listagem' && <ListagemTab />}
      {activeTab === 'lancar' && <LancarTab irParaListagem={() => setActiveTab('listagem')} />}
      {activeTab === 'relatorios' && <RelatoriosTab />}
      {activeTab === 'estrutura' && <EstruturaTab />}

    </div>
  );
}