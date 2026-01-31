import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, ArrowLeft, Calendar } from 'lucide-react';

export default function RelatorioPeriodoPrint() {
  const [searchParams] = useSearchParams();
  const inicio = searchParams.get('inicio');
  const fim = searchParams.get('fim');

  const [listaDiaria, setListaDiaria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalGeral, setTotalGeral] = useState(0);

  const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (d) => d ? d.split('-').reverse().join('/') : '-';
  
  // Função para pegar o dia da semana (Ex: "Segunda")
  const getDiaSemana = (dataStr) => {
    if (!dataStr) return '-';
    // Adiciona T12:00:00 para garantir que o fuso não mude o dia
    const date = new Date(dataStr + 'T12:00:00');
    const diaCompleto = format(date, 'EEEE', { locale: ptBR }); // ex: 'segunda-feira'
    // Pega só a primeira parte (antes do hífen) e capitaliza
    const diaSimples = diaCompleto.split('-')[0];
    return diaSimples.charAt(0).toUpperCase() + diaSimples.slice(1);
  };

  useEffect(() => {
    if (inicio && fim) buscarDados();
  }, [inicio, fim]);

  const buscarDados = async () => {
    setLoading(true);
    // Busca apenas data e valor de todos os lançamentos do período
    const { data, error } = await supabase
      .from('lancamentos')
      .select(`data_vencimento, valor`) 
      .gte('data_vencimento', inicio)
      .lte('data_vencimento', fim)
      .order('data_vencimento', { ascending: true });

    if (error) {
      alert('Erro: ' + error.message);
    } else {
      // --- LÓGICA DE AGRUPAMENTO ---
      const agrupado = {};
      let total = 0;

      (data || []).forEach(item => {
        const dataVenc = item.data_vencimento;
        const valor = Number(item.valor);
        
        // Se ainda não tem essa data no objeto, cria zerada
        if (!agrupado[dataVenc]) {
            agrupado[dataVenc] = 0;
        }
        
        // Soma o valor
        agrupado[dataVenc] += valor;
        total += valor;
      });

      // Transforma o objeto em array ordenado por data
      const arrayFinal = Object.keys(agrupado).sort().map(date => ({
          data_vencimento: date,
          valorTotal: agrupado[date]
      }));

      setListaDiaria(arrayFinal);
      setTotalGeral(total);
    }
    setLoading(false);
  };

  // --- GERAR PDF ---
  const gerarPDF = () => {
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.text("Relatório Agrupado por Dia", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Período: ${formatDate(inicio)} até ${formatDate(fim)}`, 14, 26);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 200, 20, { align: 'right' });

    // Monta o corpo da tabela (Dia / Vencimento / Valor Total)
    const body = listaDiaria.map(l => [
      getDiaSemana(l.data_vencimento),
      formatDate(l.data_vencimento),
      formatMoney(l.valorTotal)
    ]);

    // Adiciona linha de total na tabela
    body.push([
        { content: 'TOTAL DO PERÍODO', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: formatMoney(totalGeral), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Dia', 'Vencimento', 'Valor Total']],
      body: body,
      theme: 'grid',
      headStyles: { 
          fillColor: [0, 51, 102], 
          textColor: 255,
          halign: 'center' 
      },
      columnStyles: {
        0: { halign: 'center' }, // Dia
        1: { halign: 'center' }, // Vencimento
        2: { halign: 'right' }   // Valor
      },
      styles: {
          cellPadding: 3,
          fontSize: 11
      }
    });

    doc.save(`Relatorio_Agrupado_${inicio}_${fim}.pdf`);
  };

  if (!inicio || !fim) return <div className="p-10 text-center">Período inválido.</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      
      {/* HEADER DE CONTROLE */}
      <div className="max-w-3xl mx-auto bg-white p-4 rounded-lg shadow-md mb-8 flex justify-between items-center print:hidden">
         <div className="flex items-center gap-4">
             <h1 className="text-xl font-bold text-primary flex items-center gap-2">
                <Calendar /> Relatório por Período
             </h1>
             <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded text-sm font-bold border">
                {formatDate(inicio)} à {formatDate(fim)}
             </span>
         </div>
         <div className="flex gap-4">
             <button onClick={() => window.close()} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded flex items-center gap-2">
                <ArrowLeft size={20}/> Fechar
             </button>
             <button onClick={gerarPDF} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-bold shadow flex items-center gap-2">
                <FileDown size={20}/> Gerar PDF
             </button>
         </div>
      </div>

      {/* ÁREA DE VISUALIZAÇÃO (FOLHA A4 SIMULADA) */}
      <div className="max-w-3xl mx-auto bg-white p-12 shadow-2xl min-h-[800px]">
          {loading ? (
             <div className="text-center py-20">Carregando e agrupando dados...</div>
          ) : (
            <>
                <div className="text-center mb-8 border-b pb-4">
                    <h2 className="text-2xl font-bold text-[#003366]">Relatório Financeiro Diário</h2>
                    <p className="text-gray-500 mt-1">Período: <strong>{formatDate(inicio)}</strong> até <strong>{formatDate(fim)}</strong></p>
                </div>

                {/* Tabela Agrupada */}
                <table className="w-full text-base border-collapse border border-gray-300">
                    <thead className="bg-[#003366] text-white">
                        <tr>
                            <th className="p-3 border border-gray-300 text-center w-1/3">Dia</th>
                            <th className="p-3 border border-gray-300 text-center w-1/3">Vencimento</th>
                            <th className="p-3 border border-gray-300 text-right w-1/3">Valor Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {listaDiaria.map((l, i) => (
                            <tr key={i} className="hover:bg-gray-50 even:bg-gray-50/50">
                                <td className="p-3 border border-gray-300 text-center font-medium text-gray-700">
                                    {getDiaSemana(l.data_vencimento)}
                                </td>
                                <td className="p-3 border border-gray-300 text-center text-gray-600">
                                    {formatDate(l.data_vencimento)}
                                </td>
                                <td className="p-3 border border-gray-300 text-right font-bold text-gray-900">
                                    {formatMoney(l.valorTotal)}
                                </td>
                            </tr>
                        ))}
                        {/* Linha de Total */}
                        <tr className="bg-gray-100 font-bold text-lg">
                            <td colSpan="2" className="p-4 border border-gray-300 text-right text-gray-800">
                                TOTAL DO PERÍODO
                            </td>
                            <td className="p-4 border border-gray-300 text-right text-blue-900">
                                {formatMoney(totalGeral)}
                            </td>
                        </tr>
                    </tbody>
                </table>
                
                {listaDiaria.length === 0 && (
                    <p className="text-center text-gray-400 mt-10">Nenhum registro encontrado.</p>
                )}
            </>
          )}
      </div>
    </div>
  );
}