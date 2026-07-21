import { useState } from 'react';
import { Wallet, PieChart, PlusCircle, Layers, List as ListIcon } from 'lucide-react';

import DashboardTab from './DashboardTab';
import ListagemTab from './ListagemTab';
import LancarTab from './LancarTab';
import EstruturaTab from './EstruturaTab';

export default function Despesas() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="pb-10 max-w-6xl mx-auto">
      {/* CABEÇALHO E MENU DE ABAS */}
      <div className="flex flex-col lg:flex-row justify-between items-center mb-8 gap-4">
        <h2 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Wallet size={32} /> Gestão de Despesas
        </h2>
        
        <div className="flex bg-white rounded-lg shadow-sm border p-1 overflow-x-auto w-full lg:w-auto text-sm">
          <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
            <PieChart size={16} /> Dashboard
          </button>
          <button onClick={() => setActiveTab('listagem')} className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'listagem' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
            <ListIcon size={16} /> Listagem
          </button>
          <button onClick={() => setActiveTab('lancar')} className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'lancar' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
            <PlusCircle size={16} /> Nova Despesa
          </button>
          <button onClick={() => setActiveTab('cadastros')} className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'cadastros' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
            <Layers size={16} /> Estrutura (CC)
          </button>
        </div>
      </div>

      {/* RENDERIZAÇÃO DA ABA ATIVA */}
      <div className="mt-4">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'listagem' && <ListagemTab />}
        {activeTab === 'lancar' && <LancarTab irParaListagem={() => setActiveTab('listagem')} />}
        {activeTab === 'cadastros' && <EstruturaTab />}
      </div>
    </div>
  );
}