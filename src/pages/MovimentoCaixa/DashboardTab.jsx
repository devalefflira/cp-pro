import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { TrendingUp, TrendingDown, DollarSign, Layers } from 'lucide-react';

export default function DashboardTab() {
  const [totais, setTotais] = useState({ entradas: 0, saidas: 0, saldo: 0, total: 0 });
  const [porBanco, setPorBanco] = useState({});
  const [porForma, setPorForma] = useState({});

  useEffect(() => {
    carregarDadosDashboard();
  }, []);

  const carregarDadosDashboard = async () => {
    const { data } = await supabase.from('movimento_caixa').select('*');
    if (!data) return;

    let ent = 0;
    let sai = 0;
    const bancos = {};
    const formas = {};

    data.forEach(r => {
      const val = Number(r.valor) || 0;
      if (r.tipo_operacao.includes('Entrada')) {
        ent += val;
      } else {
        sai += val;
      }

      bancos[r.banco_operador] = (bancos[r.banco_operador] || 0) + val;
      formas[r.forma_pagamento] = (formas[r.forma_pagamento] || 0) + val;
    });

    setTotais({
      entradas: ent,
      saidas: sai,
      saldo: ent - sai,
      total: data.length
    });
    setPorBanco(bancos);
    setPorForma(formas);
  };

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[10px] font-extrabold text-gray-400 uppercase">TOTAL ENTRADAS</p>
            <p className="text-xl font-black text-emerald-600 mt-1">{formatarMoeda(totais.entradas)}</p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp size={22}/></div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[10px] font-extrabold text-gray-400 uppercase">TOTAL SAÍDAS</p>
            <p className="text-xl font-black text-red-600 mt-1">{formatarMoeda(totais.saidas)}</p>
          </div>
          <div className="p-2.5 bg-red-50 text-red-600 rounded-xl"><TrendingDown size={22}/></div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[10px] font-extrabold text-gray-400 uppercase">SALDO GERAL</p>
            <p className={`text-xl font-black mt-1 ${totais.saldo >= 0 ? 'text-indigo-900' : 'text-red-600'}`}>{formatarMoeda(totais.saldo)}</p>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><DollarSign size={22}/></div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[10px] font-extrabold text-gray-400 uppercase">TOTAL LANÇAMENTOS</p>
            <p className="text-xl font-black text-gray-900 mt-1">{totais.total} itens</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Layers size={22}/></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <h3 className="font-bold text-gray-800 text-sm border-b pb-2">Movimento por Banco / Operador</h3>
          <div className="space-y-2">
            {Object.entries(porBanco).map(([banco, valor]) => (
              <div key={banco} className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded-lg">
                <span className="font-bold text-gray-700">{banco}</span>
                <span className="font-black text-indigo-900">{formatarMoeda(valor)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <h3 className="font-bold text-gray-800 text-sm border-b pb-2">Movimento por Forma de Pagamento</h3>
          <div className="space-y-2">
            {Object.entries(porForma).map(([forma, valor]) => (
              <div key={forma} className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded-lg">
                <span className="font-bold text-gray-700">{forma}</span>
                <span className="font-black text-emerald-800">{formatarMoeda(valor)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}