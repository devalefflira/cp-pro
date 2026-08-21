import { useState } from 'react';
import { LayoutDashboard, PlusCircle, ListFilter, FileText, Landmark } from 'lucide-react';
import DashboardTab from './DashboardTab';
import NovoLancamentoTab from './NovoLancamentoTab';
import ListagemTab from './ListagemTab';
import RelatoriosTab from './RelatoriosTab';
import DepositosBancariosTab from './DepositosBancariosTab';

export default function MovimentoCaixaIndex() {
  const [abaAtiva, setAbaAtiva] = useState('listagem');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Movimento Caixa Geral</h1>
          <p className="text-xs text-gray-500 font-medium">Controle de entradas, saídas diárias e depósitos da tesouraria.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setAbaAtiva('dashboard')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
              abaAtiva === 'dashboard' ? 'bg-[#0f172a] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <LayoutDashboard size={16} /> Dashboard
          </button>

          <button
            onClick={() => setAbaAtiva('novo')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
              abaAtiva === 'novo' ? 'bg-[#0f172a] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <PlusCircle size={16} /> Novo Lançamento
          </button>

          <button
            onClick={() => setAbaAtiva('listagem')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
              abaAtiva === 'listagem' ? 'bg-[#0f172a] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ListFilter size={16} /> Listagem
          </button>

          <button
            onClick={() => setAbaAtiva('depositos')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
              abaAtiva === 'depositos' ? 'bg-indigo-900 text-white shadow-sm' : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <Landmark size={16} /> Depósitos Bancários
          </button>

          <button
            onClick={() => setAbaAtiva('relatorios')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
              abaAtiva === 'relatorios' ? 'bg-[#0f172a] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileText size={16} /> Relatórios
          </button>
        </div>
      </div>

      <div>
        {abaAtiva === 'dashboard' && <DashboardTab />}
        {abaAtiva === 'novo' && <NovoLancamentoTab />}
        {abaAtiva === 'listagem' && <ListagemTab />}
        {abaAtiva === 'depositos' && <DepositosBancariosTab />}
        {abaAtiva === 'relatorios' && <RelatoriosTab />}
      </div>
    </div>
  );
}