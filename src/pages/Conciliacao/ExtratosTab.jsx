import { useState } from 'react';
import { Filter } from 'lucide-react';

import ExtratoBradesco from './ExtratoBradesco';
import ExtratoSantander from './ExtratoSantander';
import ExtratoSicoob from './ExtratoSicoob';
import ExtratoTribanco from './ExtratoTribanco';

export default function ExtratosTab() {
  const [bancoSelecionado, setBancoSelecionado] = useState('Bradesco');
  const [dataInicio, setDataInicio] = useState('2026-07-01');
  const [dataFim, setDataFim] = useState('2026-07-31');
  const [tipoOperacao, setTipoOperacao] = useState('Todas');

  return (
    <div className="space-y-6">
      
      {/* BARRA DE FILTROS SUPERIOR */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
            <Filter size={18} className="text-primary"/> Seleção de Extrato Bancário
          </h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">ESCOLHA O BANCO</label>
            <div className="flex flex-wrap gap-2">
              {['Bradesco', 'Santander', 'Sicoob', 'Tribanco'].map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBancoSelecionado(b)}
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition-colors ${
                    bancoSelecionado === b ? 'bg-[#0f172a] text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end pt-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">DATA INÍCIO</label>
              <input 
                type="date" 
                value={dataInicio} 
                onChange={e => setDataInicio(e.target.value)} 
                className="w-full p-2 border rounded-lg bg-gray-50 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">DATA FIM</label>
              <input 
                type="date" 
                value={dataFim} 
                onChange={e => setDataFim(e.target.value)} 
                className="w-full p-2 border rounded-lg bg-gray-50 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">TIPO DE OPERAÇÃO</label>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                {['Todas', 'Entradas', 'Saídas'].map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setTipoOperacao(tipo)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                      tipoOperacao === tipo ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    {tipo}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RENDERIZAÇÃO CONDICIONAL DO COMPONENTE DO BANCO SELECIONADO */}
      {bancoSelecionado === 'Bradesco' && (
        <ExtratoBradesco dataInicio={dataInicio} dataFim={dataFim} tipoOperacao={tipoOperacao} />
      )}
      {bancoSelecionado === 'Santander' && (
        <ExtratoSantander dataInicio={dataInicio} dataFim={dataFim} tipoOperacao={tipoOperacao} />
      )}
      {bancoSelecionado === 'Sicoob' && (
        <ExtratoSicoob dataInicio={dataInicio} dataFim={dataFim} tipoOperacao={tipoOperacao} />
      )}
      {bancoSelecionado === 'Tribanco' && (
        <ExtratoTribanco dataInicio={dataInicio} dataFim={dataFim} tipoOperacao={tipoOperacao} />
      )}

    </div>
  );
}