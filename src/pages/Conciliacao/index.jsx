import { useState } from 'react';
import { Upload, FileText, ArrowLeftRight, Sparkles, FileCheck2 } from 'lucide-react';
import ImportarTab from './ImportarTab';
import ExtratosTab from './ExtratosTab';
import ConciliacaoTab from './ConciliacaoTab';
import CorrespondenciasTab from './CorrespondenciasTab';
import TitulosPagosTab from './TitulosPagosTab';

export default function Conciliacao() {
  const [activeTab, setActiveTab] = useState('importar'); // 'importar', 'extratos', 'conciliacao', 'correspondencias', 'titulos'

  return (
    <div className="space-y-6 pb-10">
      
      {/* CABEÇALHO DO MÓDULO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold text-primary flex items-center gap-2">
          Conciliação Bancária
        </h2>

        <div className="flex bg-white rounded-lg shadow-sm border p-1 text-sm overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('importar')}
            className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'importar' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Upload size={16} /> Importar Arquivos
          </button>

          <button
            onClick={() => setActiveTab('extratos')}
            className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'extratos' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText size={16} /> Visualizar Extratos
          </button>

          <button
            onClick={() => setActiveTab('titulos')}
            className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'titulos' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileCheck2 size={16} /> Títulos Pagos
          </button>

          <button
            onClick={() => setActiveTab('conciliacao')}
            className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'conciliacao' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ArrowLeftRight size={16} /> Conciliação Bancária
          </button>

          <button
            onClick={() => setActiveTab('correspondencias')}
            className={`px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'correspondencias' ? 'bg-[#0f172a] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Sparkles size={16} /> Correspondências
          </button>
        </div>
      </div>

      {/* CONTEÚDO DA ABA ATIVA */}
      {activeTab === 'importar' && <ImportarTab />}
      {activeTab === 'extratos' && <ExtratosTab />}
      {activeTab === 'titulos' && <TitulosPagosTab />}
      {activeTab === 'conciliacao' && <ConciliacaoTab />}
      {activeTab === 'correspondencias' && <CorrespondenciasTab />}

    </div>
  );
}