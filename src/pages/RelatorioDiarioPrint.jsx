import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, Printer, ArrowLeft } from 'lucide-react';

// --- CORES (Reutilizadas) ---
const CORES_DOCS = {
  'Boleto': [66, 133, 244],
  'Cartão': [156, 39, 176],
  'Cheque': [40, 167, 69],
  'Custódia': [255, 143, 0],
  'Empréstimo': [220, 53, 69],
  'Financiamento': [63, 81, 181],
  'Imposto': [121, 85, 72],
  'Consórcio': [233, 30, 99],
  'PIX': [0, 150, 136],
  'Seguro': [26, 35, 126],
  'Transferência': [117, 117, 117]
};

const getCor = (tipo) => CORES_DOCS[tipo] || [128, 128, 128];
const rgbToHex = (rgbArray) => {
    if(!rgbArray) return '#888';
    const [r, g, b] = rgbArray;
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

export default function RelatorioDiarioPrint() {
  const [searchParams] = useSearchParams();
  const dia = searchParams.get('data');

  const [dados, setDados] = useState([]);
  const [resumo, setResumo] = useState([]);
  const [totalGeral, setTotalGeral] = useState(0);
  const [loading, setLoading] = useState(true);

  const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  useEffect(() => {
    if (dia) buscarDados();
  }, [dia]);

  const buscarDados = async () => {
    setLoading(true);
    // Busca idêntica à original, ordenada por criação
    const { data, error } = await supabase
      .from('lancamentos')
      .select(`*, fornecedores(nome), tipos_documento(descricao), bancos(nome), razoes(nome), parcelas(descricao)`)
      .eq('data_vencimento', dia)
      .order('created_at', { ascending: true }); // Mantendo a ordem solicitada anteriormente

    if (error) {
      alert('Erro: ' + error.message);
    } else {
      processarResumo(data || []);
      setDados(data || []);
    }
    setLoading(false);
  };

  // Calcula o resumo agrupado (Igual ao que o PDF fazia internamente)
  const processarResumo = (items) => {
    const resumoMap = {};
    let total = 0;

    items.forEach(item => {
      const tipo = item.tipos_documento?.descricao || 'Outros';
      const razao = item.razoes?.nome || '-';
      const banco = item.bancos?.nome || ''; 
      const chave = `${tipo}-${razao}-${banco}`;

      total += Number(item.valor);

      if (!resumoMap[chave]) resumoMap[chave] = { tipo, razao, banco, valor: 0 };
      resumoMap[chave].valor += Number(item.valor);
    });

    // Ordena por tipo e converte para array
    const resumoArray = Object.values(resumoMap).sort((a, b) => a.tipo.localeCompare(b.tipo));
    setResumo(resumoArray);
    setTotalGeral(total);
  };

  // --- GERAÇÃO DO PDF (Lógica Original) ---
  const gerarPDF = () => {
    const doc = new jsPDF();
    const dataFormatada = format(new Date(dia + 'T12:00:00'), 'dd/MM/yyyy');
    const dataHoraGeracao = format(new Date(), 'dd/MM/yyyy, HH:mm:ss');
    const diaSemana = format(new Date(dia + 'T12:00:00'), 'EEEE', { locale: ptBR });
    const diaSemanaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.text("Relatório Diário", 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${dataHoraGeracao}`, 200, 15, { align: 'right' });

    // Tabela Resumo
    const bodyResumo = resumo.map(r => [dataFormatada, r.tipo, r.razao, r.banco, formatMoney(r.valor)]);
    bodyResumo.push(['Total Geral', '', '', '', formatMoney(totalGeral)]);

    autoTable(doc, {
      startY: 25,
      head: [[{ content: diaSemanaCapitalizado, colSpan: 1, styles: { fillColor: [60, 90, 120] } }, 'Tipo Documento', 'Razão', 'Banco', 'Valor']],
      body: bodyResumo,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { halign: 'center', valign: 'middle', fontStyle: 'bold', fillColor: [240, 240, 240] }, 4: { halign: 'right', fontStyle: 'bold' } },
      didParseCell: function (data) {
        if (data.row.index === bodyResumo.length - 1) {
            data.cell.styles.fillColor = [0, 51, 102];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
            if (data.column.index === 0) data.cell.colSpan = 4;
        } else if (data.column.index === 1) {
            data.cell.styles.fillColor = getCor(data.cell.raw);
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    // Tabela Detalhada
    const bodyDetalhe = dados.map(d => ({
        fornecedor: d.fornecedores?.nome || '',
        tipo: d.tipos_documento?.descricao || '',
        doc: d.numero_documento || '',
        nf: d.nota_fiscal || '',
        parcela: d.parcelas?.descricao || '',
        razao: d.razoes?.nome || '',
        banco: d.bancos?.nome || '',
        valor: formatMoney(d.valor)
    }));

    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        columns: [
            { header: 'Fornecedor', dataKey: 'fornecedor' },
            { header: 'Tipo', dataKey: 'tipo' },
            { header: 'Nº Doc', dataKey: 'doc' },
            { header: 'NF', dataKey: 'nf' },
            { header: 'Parcela', dataKey: 'parcela' },
            { header: 'Razão', dataKey: 'razao' },
            { header: 'Banco', dataKey: 'banco' },
            { header: 'Valor', dataKey: 'valor' },
        ],
        body: bodyDetalhe,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 51, 102] },
        columnStyles: { valor: { halign: 'right' } },
        didParseCell: function(data) {
            if (data.section === 'body' && data.column.dataKey === 'tipo') {
                data.cell.styles.fillColor = getCor(data.cell.raw);
                data.cell.styles.textColor = [255, 255, 255];
                data.cell.styles.fontStyle = 'bold';
            }
        },
        didDrawPage: function (data) {
            const str = 'Pág. ' + doc.internal.getNumberOfPages();
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text(str, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
        }
    });

    doc.save(`Relatorio_Diario_${dataFormatada.replace(/\//g, '-')}.pdf`);
  };

  if (!dia) return <div className="p-8 text-center text-gray-500">Data inválida.</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      
      {/* HEADER DE CONTROLE */}
      <div className="max-w-5xl mx-auto bg-white p-4 rounded-lg shadow-md mb-8 flex justify-between items-center print:hidden">
         <div className="flex items-center gap-4">
             <h1 className="text-2xl font-bold text-primary">Pré-visualização de Relatório</h1>
             <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                {format(new Date(dia + 'T12:00:00'), 'dd/MM/yyyy')}
             </span>
         </div>
         <div className="flex gap-4">
             <button 
               onClick={() => window.close()} 
               className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded flex items-center gap-2"
             >
                <ArrowLeft size={20}/> Fechar
             </button>
             <button 
               onClick={gerarPDF} 
               className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-bold shadow flex items-center gap-2"
             >
                <FileDown size={20}/> Gerar PDF
             </button>
         </div>
      </div>

      {/* ÁREA DO RELATÓRIO (LAYOUT A4 VIRTUAL) */}
      <div className="max-w-5xl mx-auto bg-white p-12 shadow-2xl min-h-[1000px] relative">
          
          {loading ? (
             <div className="text-center py-20">Carregando dados...</div>
          ) : (
            <>
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-[#003366]">Relatório Diário</h2>
                    <p className="text-gray-500 mt-2">
                        {format(new Date(dia + 'T12:00:00'), 'EEEE, dd de MMMM de yyyy', { locale: ptBR })}
                    </p>
                </div>

                {/* TABELA DE RESUMO */}
                <div className="mb-10">
                    <h3 className="text-lg font-bold text-gray-700 mb-2 border-b pb-1">Resumo por Tipo</h3>
                    <table className="w-full text-sm border-collapse border border-gray-300">
                        <thead className="bg-[#003366] text-white">
                            <tr>
                                <th className="p-2 border border-gray-300 text-left">Dia</th>
                                <th className="p-2 border border-gray-300 text-left">Tipo Documento</th>
                                <th className="p-2 border border-gray-300 text-left">Razão</th>
                                <th className="p-2 border border-gray-300 text-left">Banco</th>
                                <th className="p-2 border border-gray-300 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {resumo.map((r, i) => (
                                <tr key={i} className="even:bg-gray-50">
                                    {i === 0 && (
                                        <td className="p-2 border border-gray-300 font-bold bg-gray-100 text-center align-middle" rowSpan={resumo.length}>
                                            {format(new Date(dia + 'T12:00:00'), 'EEEE', { locale: ptBR })}
                                        </td>
                                    )}
                                    <td className="p-2 border border-gray-300 font-bold text-white" style={{backgroundColor: rgbToHex(getCor(r.tipo))}}>
                                        {r.tipo}
                                    </td>
                                    <td className="p-2 border border-gray-300">{r.razao}</td>
                                    <td className="p-2 border border-gray-300">{r.banco}</td>
                                    <td className="p-2 border border-gray-300 text-right font-bold">{formatMoney(r.valor)}</td>
                                </tr>
                            ))}
                            <tr className="bg-[#003366] text-white font-bold">
                                <td colSpan="4" className="p-2 border border-gray-300 text-right">TOTAL GERAL</td>
                                <td className="p-2 border border-gray-300 text-right">{formatMoney(totalGeral)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* TABELA DE DETALHES */}
                <div>
                    <h3 className="text-lg font-bold text-gray-700 mb-2 border-b pb-1">Detalhamento dos Lançamentos</h3>
                    <table className="w-full text-xs border-collapse border border-gray-300">
                        <thead className="bg-[#003366] text-white">
                            <tr>
                                <th className="p-2 border border-gray-300 text-left">Fornecedor</th>
                                <th className="p-2 border border-gray-300 text-left">Tipo</th>
                                <th className="p-2 border border-gray-300 text-left">Nº Doc</th>
                                <th className="p-2 border border-gray-300 text-left">NF</th>
                                <th className="p-2 border border-gray-300 text-left">Parcela</th>
                                <th className="p-2 border border-gray-300 text-left">Razão</th>
                                <th className="p-2 border border-gray-300 text-left">Banco</th>
                                <th className="p-2 border border-gray-300 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dados.map((d, i) => (
                                <tr key={i} className="hover:bg-blue-50 even:bg-gray-50">
                                    <td className="p-2 border border-gray-300 font-medium">{d.fornecedores?.nome}</td>
                                    <td className="p-2 border border-gray-300 font-bold text-white" style={{backgroundColor: rgbToHex(getCor(d.tipos_documento?.descricao))}}>
                                        {d.tipos_documento?.descricao}
                                    </td>
                                    <td className="p-2 border border-gray-300">{d.numero_documento}</td>
                                    <td className="p-2 border border-gray-300">{d.nota_fiscal}</td>
                                    <td className="p-2 border border-gray-300">{d.parcelas?.descricao}</td>
                                    <td className="p-2 border border-gray-300">{d.razoes?.nome}</td>
                                    <td className="p-2 border border-gray-300">{d.bancos?.nome}</td>
                                    <td className="p-2 border border-gray-300 text-right font-bold">{formatMoney(d.valor)}</td>
                                </tr>
                            ))}
                            {dados.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="p-4 text-center text-gray-500 italic">Nenhum lançamento encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </>
          )}
      </div>
    </div>
  );
}