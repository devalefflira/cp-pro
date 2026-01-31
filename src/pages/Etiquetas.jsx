import { useState } from 'react';
import { Tag, ExternalLink } from 'lucide-react';

export default function Etiquetas() {
  const [dataSelecionada, setDataSelecionada] = useState('');

  const handleVisualizar = () => {
    if (!dataSelecionada) return alert('Por favor, selecione uma data.');
    // Abre a visualização em nova aba
    window.open(`/print/etiquetas?data=${dataSelecionada}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-primary flex items-center gap-2">
        <Tag /> Gerador de Etiquetas
      </h2>

      <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200 max-w-2xl">
        <p className="text-gray-600 mb-6">
          Selecione a data de vencimento dos lançamentos para gerar as etiquetas de organização (grampear nos boletos).
        </p>

        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="w-full md:w-1/2">
            <label className="block font-bold text-gray-700 mb-2">Data de Vencimento</label>
            <input 
              type="date" 
              className="w-full p-3 border rounded bg-gray-50 focus:ring-2 focus:ring-primary outline-none"
              value={dataSelecionada}
              onChange={(e) => setDataSelecionada(e.target.value)}
            />
          </div>

          <button 
            onClick={handleVisualizar}
            className="w-full md:w-auto bg-primary hover:bg-blue-800 text-white font-bold py-3 px-6 rounded shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-2"
          >
            <ExternalLink size={20} />
            Visualizar Etiquetas
          </button>
        </div>
      </div>
    </div>
  );
}