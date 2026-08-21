import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Printer, FileDown, ArrowLeft } from 'lucide-react';

export default function RelatorioMovimentoCaixaPrint() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tipoRelatorio = searchParams.get('tipo') || 'tipo_operacao';
  const inicio = searchParams.get('inicio');
  const fim = searchParams.get('fim');
  const itensParam = searchParams.get('itens');

  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, [tipoRelatorio, inicio, fim, itensParam]);

  const carregarDados = async () => {
    setLoading(true);
    let query = supabase.from('movimento_caixa').select('*').order('data_operacao', { ascending: false });

    if (inicio) query = query.gte('data_operacao', inicio);
    if (fim) query = query.lte('data_operacao', fim);

    // Aplica o filtro de itens selecionados na página de impressão
    if (itensParam) {
      const itensArray = itensParam.split(',');
      if (itensArray.length > 0) {
        if (tipoRelatorio === 'tipo_operacao') query = query.in('tipo_operacao', itensArray);
        else if (tipoRelatorio === 'forma_pagamento') query = query.in('forma_pagamento', itensArray);
        else if (tipoRelatorio === 'tipo_documento') query = query.in('tipo_documento', itensArray);
      }
    }

    const { data } = await query;
    setDados(data || []);
    setLoading(false);
  };

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const formatarData = (d) => d ? d.split('-').reverse().join('/') : '';

  const totalEntradas = dados.filter(d => d.tipo_operacao?.includes('Entrada')).reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
  const totalSaidas = dados.filter(d => d.tipo_operacao?.includes('Saída')).reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
  const saldo = totalEntradas - totalSaidas;

  const getTituloRelatorio = () => {
    if (tipoRelatorio === 'forma_pagamento') return 'Movimento Caixa Geral - Por Forma de Pagamento';
    if (tipoRelatorio === 'tipo_documento') return 'Movimento Caixa Geral - Por Tipo de Documento';
    return 'Movimento Caixa Geral - Por Tipo de Operação';
  };

  // GERAÇÃO DIRETA DO PDF EM MODO PAISAGEM (A4 LANDSCAPE)
  const gerarPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const dataHoraGeracao = new Date().toLocaleString('pt-BR');
    const periodoStr = `${inicio ? formatarData(inicio) : 'Início'} até ${fim ? formatarData(fim) : 'Hoje'}`;
    const filtroStr = itensParam ? `Filtro: ${itensParam}` : 'Filtro: Todos';

    // Título e Cabeçalho
    doc.setFontSize(16);
    doc.setTextColor(0, 51, 102);
    doc.text(getTituloRelatorio(), 14, 15);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Período: ${periodoStr} | ${filtroStr}`, 14, 21);
    doc.text(`Emissão: ${dataHoraGeracao}`, doc.internal.pageSize.width - 14, 15, { align: 'right' });
    doc.text("CP PRO • Gestão Financeira", doc.internal.pageSize.width - 14, 21, { align: 'right' });

    const corpoTabela = dados.map(r => [
      formatarData(r.data_operacao),
      r.responsavel || '-',
      r.data_lancamento || '-',
      r.tipo_documento || '-',
      r.forma_pagamento || '-',
      r.banco_operador || '-',
      r.tipo_operacao || '-',
      formatarMoeda(r.valor || 0),
      r.descricao || '-'
    ]);

    autoTable(doc, {
      startY: 26,
      head: [['Data Op.', 'Responsável', 'Data/Hora Reg.', 'Tipo Doc.', 'Forma Pgto', 'Banco/Operador', 'Operação', 'Valor', 'Descrição']],
      body: corpoTabela,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold', halign: 'left' },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center' },
        1: { cellWidth: 28 },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 28 },
        6: { cellWidth: 22, halign: 'center' },
        7: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
        8: { cellWidth: 'auto' }
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 6) {
          const text = String(data.cell.raw || '');
          if (text.includes('Entrada')) {
            data.cell.styles.textColor = [16, 185, 129];
          } else {
            data.cell.styles.textColor = [239, 68, 68];
          }
          data.cell.styles.fontStyle = 'bold';
        }
      },
      didDrawPage: function () {
        const str = 'Pág. ' + doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(str, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 8);
      }
    });

    const finalY = doc.lastAutoTable.finalY + 6;
    if (finalY + 25 < doc.internal.pageSize.height) {
      doc.setFontSize(9);
      doc.setTextColor(50);
      doc.text(`Total de Entradas (+): ${formatarMoeda(totalEntradas)}`, doc.internal.pageSize.width - 80, finalY);
      doc.text(`Total de Saídas (-): ${formatarMoeda(totalSaidas)}`, doc.internal.pageSize.width - 80, finalY + 5);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 51, 102);
      doc.text(`Saldo Geral: ${formatarMoeda(saldo)}`, doc.internal.pageSize.width - 80, finalY + 11);
    }

    doc.save(`Relatorio_Caixa_Geral_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6 print:p-0 print:bg-white">
      
      <style>{`
        @page {
          size: landscape;
          margin: 10mm;
        }
        @media print {
          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      {/* BARRA SUPERIOR DE AÇÕES */}
      <div className="max-w-6xl mx-auto mb-6 flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm print:hidden">
        <button
          onClick={() => navigate('/movimento-caixa')}
          className="flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors"
        >
          <ArrowLeft size={16} /> Voltar ao Sistema
        </button>

        <div className="flex gap-3">
          <button
            onClick={gerarPDF}
            className="flex items-center gap-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg shadow transition-colors"
          >
            <FileDown size={16} /> Gerar PDF (jsPDF)
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 px-5 py-2 rounded-lg shadow transition-colors"
          >
            <Printer size={16} /> Imprimir Relatório
          </button>
        </div>
      </div>

      {/* DOCUMENTO DO RELATÓRIO */}
      <div className="print-container max-w-6xl mx-auto bg-white p-8 rounded-xl border shadow-sm print:border-none print:shadow-none">
        
        {/* CABEÇALHO */}
        <div className="flex justify-between items-start border-b pb-4 mb-6">
          <div>
            <h1 className="text-xl font-black tracking-tight text-[#003366]">{getTituloRelatorio()}</h1>
            <p className="text-xs text-gray-500 font-semibold mt-1">
              Período: <strong>{inicio ? formatarData(inicio) : 'Início'}</strong> até <strong>{fim ? formatarData(fim) : 'Hoje'}</strong>
              {itensParam && <span className="ml-2 font-normal text-gray-400">| Filtro: <strong className="text-gray-700">{itensParam}</strong></span>}
            </p>
          </div>
          <div className="text-right text-[11px] text-gray-500 space-y-0.5">
            <p className="font-bold text-gray-800">CP PRO &bull; Gestão Financeira</p>
            <p>Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        {/* TABELA DE DADOS */}
        {loading ? (
          <div className="py-16 text-center text-xs text-gray-400 font-semibold">Carregando lançamentos...</div>
        ) : dados.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 font-semibold">Nenhum lançamento localizado com os filtros selecionados.</div>
        ) : (
          <div>
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#003366] text-white uppercase text-[10px] font-bold">
                  <th className="py-2 px-3">Data Op.</th>
                  <th className="py-2 px-3">Responsável</th>
                  <th className="py-2 px-3">Data/Hora Reg.</th>
                  <th className="py-2 px-3">Tipo Doc.</th>
                  <th className="py-2 px-3">Forma Pgto</th>
                  <th className="py-2 px-3">Banco / Operador</th>
                  <th className="py-2 px-3 text-center">Operação</th>
                  <th className="py-2 px-3 text-right">Valor (R$)</th>
                  <th className="py-2 px-3">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 border-b border-gray-200">
                {dados.map((r, idx) => (
                  <tr key={r.id || idx} className="hover:bg-gray-50 even:bg-gray-50/50">
                    <td className="py-2 px-3 font-semibold text-gray-800">{formatarData(r.data_operacao)}</td>
                    <td className="py-2 px-3 text-gray-700">{r.responsavel}</td>
                    <td className="py-2 px-3 text-gray-500 text-[10px]">{r.data_lancamento}</td>
                    <td className="py-2 px-3 font-bold text-gray-800">{r.tipo_documento}</td>
                    <td className="py-2 px-3 text-gray-700">{r.forma_pagamento}</td>
                    <td className="py-2 px-3 font-semibold text-indigo-950">{r.banco_operador}</td>
                    <td className="py-2 px-3 text-center font-bold">
                      <span className={r.tipo_operacao?.includes('Entrada') ? 'text-emerald-600' : 'text-red-600'}>
                        {r.tipo_operacao}
                      </span>
                    </td>
                    <td className={`py-2 px-3 text-right font-black ${r.tipo_operacao?.includes('Entrada') ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatarMoeda(r.valor)}
                    </td>
                    <td className="py-2 px-3 text-gray-600 max-w-[200px] truncate">{r.descricao || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* QUADRO DE RESUMO E TOTALIZADORES */}
            <div className="mt-6 flex justify-end">
              <div className="w-80 bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
                <div className="flex justify-between text-gray-700 font-semibold">
                  <span>Total de Entradas (+):</span>
                  <span className="font-bold text-emerald-600">{formatarMoeda(totalEntradas)}</span>
                </div>
                <div className="flex justify-between text-gray-700 font-semibold">
                  <span>Total de Saídas (-):</span>
                  <span className="font-bold text-red-600">{formatarMoeda(totalSaidas)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-2 font-black text-sm text-[#003366]">
                  <span>Saldo Geral do Caixa:</span>
                  <span className={saldo >= 0 ? 'text-[#003366]' : 'text-red-600'}>{formatarMoeda(saldo)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}