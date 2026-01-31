import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, ArrowLeft, Users } from 'lucide-react';

export default function RelatorioFornecedorPrint() {
  const [searchParams] = useSearchParams();
  const inicio = searchParams.get('inicio');
  const fim = searchParams.get('fim');
  const status = searchParams.get('status');
  const fornecedorId = searchParams.get('fornecedor_id');

  const [dadosAgrupados, setDadosAgrupados] = useState({});
  const [loading, setLoading] = useState(true);
  const [totalGeral, setTotalGeral] = useState(0);

  const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (d) => d ? d.split('-').reverse().join('/') : '-';

  useEffect(() => {
    if (inicio && fim) buscarDados();
  }, [inicio, fim, status, fornecedorId]);

  const buscarDados = async () => {
    setLoading(true);

    let query = supabase
      .from('lancamentos')
      .select(`*, fornecedores(nome), tipos_documento(descricao)`)
      .gte('data_vencimento', inicio)
      .lte('data_vencimento', fim)
      .order('fornecedor_id') // Agrupa visualmente
      .order('data_vencimento');

    if (status) query = query.eq('status', status);
    if (fornecedorId) query = query.eq('fornecedor_id', fornecedorId);

    const { data, error } = await query;

    if (error) {
      alert('Erro: ' + error.message);
    } else {
      processarDados(data || []);
    }
    setLoading(false);
  };

  const processarDados = (dados) => {
    const grupos = {};
    let total = 0;

    dados.forEach(item => {
      const nomeFornecedor = item.fornecedores?.nome || 'Fornecedor Desconhecido';
      
      if (!grupos[nomeFornecedor]) {
        grupos[nomeFornecedor] = {
          nome: nomeFornecedor,
          itens: [],
          total: 0
        };
      }

      grupos[nomeFornecedor].itens.push(item);
      grupos[nomeFornecedor].total += Number(item.valor);
      total += Number(item.valor);
    });

    setDadosAgrupados(grupos);
    setTotalGeral(total);
  };

  // --- GERAR PDF ---
  const gerarPDF = () => {
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.text("Relatório por Fornecedor", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Período: ${formatDate(inicio)} até ${formatDate(fim)}`, 14, 26);
    if (status) doc.text(`Status: ${status.toUpperCase()}`, 14, 31);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 200, 20, { align: 'right' });

    let finalY = status ? 35 : 30;

    // Para cada Fornecedor, cria uma tabela ou bloco
    Object.values(dadosAgrupados).forEach((grupo) => {
        // Título do Grupo (Fornecedor)
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        
        // Verifica se cabe na página
        if (finalY + 15 > 280) {
            doc.addPage();
            finalY = 20;
        }

        doc.text(grupo.nome, 14, finalY + 8);

        const body = grupo.itens.map(l => [
            formatDate(l.data_vencimento),
            l.tipos_documento?.descricao || '-',
            l.numero_documento || '-',
            l.status,
            formatMoney(l.valor)
        ]);

        // Linha de Total do Fornecedor
        body.push([
            { content: 'TOTAL FORNECEDOR', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [245, 245, 245] } },
            { content: formatMoney(grupo.total), styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } }
        ]);

        autoTable(doc, {
            startY: finalY + 10,
            head: [['Vencimento', 'Tipo', 'Doc', 'Status', 'Valor']],
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [60, 60, 60], textColor: 255 },
            columnStyles: {
                0: { halign: 'center', cellWidth: 30 },
                3: { halign: 'center', cellWidth: 25 },
                4: { halign: 'right', fontStyle: 'bold', cellWidth: 35 }
            },
            styles: { fontSize: 9 },
            margin: { left: 14, right: 14 }
        });

        finalY = doc.lastAutoTable.finalY + 5;
    });

    // Total Geral
    doc.setFillColor(0, 51, 102);
    doc.rect(14, finalY + 5, 182, 12, 'F');
    doc.setTextColor(255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL GERAL DO PERÍODO: ${formatMoney(totalGeral)}`, 190, finalY + 13, { align: 'right' });

    doc.save(`Relatorio_Fornecedor_${inicio}_${fim}.pdf`);
  };

  if (!inicio || !fim) return <div className="p-10 text-center">Período inválido.</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      
      {/* HEADER DE CONTROLE */}
      <div className="max-w-5xl mx-auto bg-white p-4 rounded-lg shadow-md mb-8 flex justify-between items-center print:hidden">
         <div className="flex items-center gap-4">
             <h1 className="text-xl font-bold text-primary flex items-center gap-2">
                <Users /> Relatório por Fornecedor
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

      {/* ÁREA DE VISUALIZAÇÃO */}
      <div className="max-w-5xl mx-auto bg-white p-12 shadow-2xl min-h-[800px]">
          {loading ? (
             <div className="text-center py-20">Carregando dados...</div>
          ) : (
            <>
                <div className="text-center mb-8 border-b pb-4">
                    <h2 className="text-2xl font-bold text-[#003366]">Extrato por Fornecedor</h2>
                    <p className="text-gray-500 mt-1">Período: <strong>{formatDate(inicio)}</strong> até <strong>{formatDate(fim)}</strong></p>
                    {status && <p className="text-sm font-bold bg-yellow-100 inline-block px-2 rounded mt-2 text-yellow-800">Filtro: {status}</p>}
                </div>

                {Object.keys(dadosAgrupados).length === 0 ? (
                    <p className="text-center text-gray-400 mt-10">Nenhum registro encontrado com estes filtros.</p>
                ) : (
                    <div className="space-y-8">
                        {Object.values(dadosAgrupados).map((grupo, idx) => (
                            <div key={idx} className="border rounded-lg overflow-hidden">
                                <div className="bg-gray-100 p-3 font-bold text-gray-800 flex justify-between items-center border-b">
                                    <span>{grupo.nome}</span>
                                    <span className="text-blue-900 bg-white px-3 py-1 rounded border shadow-sm">{formatMoney(grupo.total)}</span>
                                </div>
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                        <tr>
                                            <th className="p-3 text-left">Vencimento</th>
                                            <th className="p-3 text-left">Tipo</th>
                                            <th className="p-3 text-left">Doc</th>
                                            <th className="p-3 text-center">Status</th>
                                            <th className="p-3 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {grupo.itens.map((l, i) => (
                                            <tr key={i} className="hover:bg-blue-50">
                                                <td className="p-3">{formatDate(l.data_vencimento)}</td>
                                                <td className="p-3 text-gray-600">{l.tipos_documento?.descricao}</td>
                                                <td className="p-3 text-gray-600">{l.numero_documento}</td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${l.status === 'Pago' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                        {l.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right font-medium">{formatMoney(l.valor)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}

                        {/* Total Geral no Final */}
                        <div className="bg-[#003366] text-white p-6 rounded-lg flex justify-between items-center text-xl font-bold mt-8 shadow-lg">
                            <span>TOTAL GERAL DO PERÍODO</span>
                            <span>{formatMoney(totalGeral)}</span>
                        </div>
                    </div>
                )}
            </>
          )}
      </div>
    </div>
  );
}