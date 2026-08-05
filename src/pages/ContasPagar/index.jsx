import { useState } from 'react';
import { LayoutDashboard, PlusCircle, List, FileText, Tag } from 'lucide-react';

// Importa os componentes reutilizados e ajustados
import Dashboard from '../Dashboard';
import IncluirLancamento from '../IncluirLancamento';
import Listagem from '../Listagem';
import Etiquetas from '../Etiquetas';
import RelatoriosTab from './RelatoriosTab';

export default function ContasPagar() {
  const [activeTab, setActiveTab] = useState('visao_geral'); // 'visao_geral', 'incluir', 'listagem', 'relatorios', 'etiquetas'

  return (
    <div className="space-y-6 pb-10">
      
      {/* CABEÇALHO COM A BARRA DE ABAS NO CANTO SUPERIOR DIREITO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold text-primary flex items-center gap-2">
          Contas a Pagar
        </h2>

        <div className="flex bg-white rounded-lg shadow-sm border p-1 text-sm overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('visao_geral')}
            className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'visao_geral' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <LayoutDashboard size={16} /> Visão Geral
          </button>

          <button
            onClick={() => setActiveTab('incluir')}
            className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'incluir' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <PlusCircle size={16} /> Incluir Lançamento
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
            onClick={() => setActiveTab('relatorios')}
            className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'relatorios' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText size={16} /> Relatórios
          </button>

          <button
            onClick={() => setActiveTab('etiquetas')}
            className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'etiquetas' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Tag size={16} /> Etiquetas
          </button>
        </div>
      </div>

      {/* CONTEÚDO DA ABA SELECIONADA */}
      {activeTab === 'visao_geral' && <Dashboard />}
      {activeTab === 'incluir' && <IncluirLancamento />}
      {activeTab === 'listagem' && <Listagem />}
      {activeTab === 'relatorios' && <RelatoriosTab />}
      {activeTab === 'etiquetas' && <Etiquetas />}

    </div>
  );
}