import { useState } from 'react';
import { supabase } from '../services/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, Search, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- MAPA DE CORES ---
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

export default function Relatorios() {
  const [range, setRange] = useState({ inicio: '', fim: '' });
  const [dadosSemana, setDadosSemana] = useState([]);
  const [dia, setDia] = useState('');
  const [dadosDia, setDadosDia] = useState([]);

  const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // --- BUSCAS ---
  const buscarSemana = async () => {
    if (!range.inicio || !range.fim) return alert('Selecione as datas!');
    const { data, error } = await supabase
      .from('lancamentos')
      .select('*') // Traz tudo para somar, não precisa de joins complexos aqui se for só totais
      .gte('data_vencimento', range.inicio)
      .lte('data_vencimento', range.fim)
      .order('data_vencimento');

    if (error) alert('Erro: ' + error.message);
    else setDadosSemana(data || []);
  };

  const buscarDia = async (dataSelecionada) => {
    setDia(dataSelecionada);
    if (!dataSelecionada) return;
    const { data, error } = await supabase
      .from('lancamentos')
      .select(`*, fornecedores(nome), tipos_documento(descricao), bancos(nome), razoes(nome), parcelas(descricao)`)
      .eq('data_vencimento', dataSelecionada)
      .order('tipo_documento_id', { ascending: true });

    if (error) alert('Erro: ' + error.message);
    else setDadosDia(data || []);
  };

  // ==================================================================================
  // 1. GERADOR DE PDF: TOTAL DA SEMANA
  // ==================================================================================
  const gerarPDFSemanal = () => {
    const doc = new jsPDF();
    const dataHoraGeracao = format(new Date(), 'dd/MM/yyyy, HH:mm');

    // 1. TÍTULO
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.text("Total da Semana", 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Gerado em: ${dataHoraGeracao}`, 200, 25, { align: 'right' });

    // 2. PROCESSAMENTO (AGRUPAR POR DIA)
    const resumoPorDia = {};
    let totalGeral = 0;

    dadosSemana.forEach(item => {
        const data = item.data_vencimento;
        if (!resumoPorDia[data]) {
            resumoPorDia[data] = 0;
        }
        resumoPorDia[data] += Number(item.valor);
        totalGeral += Number(item.valor);
    });

    // Converter objeto em array ordenado e formatado
    const linhasTabela = Object.keys(resumoPorDia).sort().map(dataIso => {
        const dataObj = new Date(dataIso + 'T12:00:00'); // T12 previne timezone
        const diaSemana = format(dataObj, 'EEEE', { locale: ptBR });
        const diaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
        
        return [
            format(dataObj, 'dd/MM/yyyy'), // Coluna Vencimento
            diaCapitalizado,               // Coluna Dia
            formatMoney(resumoPorDia[dataIso]) // Coluna Valor
        ];
    });

    // Adiciona Linha de Total
    linhasTabela.push(['Total da Semana', '', formatMoney(totalGeral)]);

    // 3. DESENHAR TABELA
    autoTable(doc, {
        startY: 35,
        head: [['Vencimento', 'Dia', 'Valor']],
        body: linhasTabela,
        theme: 'striped', // Listrado cinza/branco igual imagem
        headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
            0: { halign: 'center' },
            1: { halign: 'left' },
            2: { halign: 'right' }
        },
        // Estilização customizada para a linha de Total
        didParseCell: function (data) {
            const isLastRow = data.row.index === linhasTabela.length - 1;
            if (isLastRow) {
                data.cell.styles.fillColor = [0, 51, 102];
                data.cell.styles.textColor = [255, 255, 255];
                data.cell.styles.fontStyle = 'bold';
                // Mescla "Total da Semana" com a coluna vazia do meio, se desejar, ou deixa separado
            }
        },
        // Rodapé com Paginação
        didDrawPage: function (data) {
            const str = 'Pág. ' + doc.internal.getNumberOfPages() + '/1'; // Simplificado para 1 página por enquanto
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text(str, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
        }
    });

    doc.save('Total_Semana.pdf');
  };

  // ==================================================================================
  // 2. GERADOR DE PDF: RELATÓRIO DIÁRIO (MANTIDO DO ANTERIOR)
  // ==================================================================================
  const gerarPDFDiario = () => {
    const doc = new jsPDF();
    const dataFormatada = format(new Date(dia + 'T12:00:00'), 'dd/MM/yyyy');
    const dataHoraGeracao = format(new Date(), 'dd/MM/yyyy, HH:mm:ss');
    const diaSemana = format(new Date(dia + 'T12:00:00'), 'EEEE', { locale: ptBR });
    const diaSemanaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

    // TÍTULO
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.text("Relatório Diário", 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${dataHoraGeracao}`, 200, 15, { align: 'right' });

    // RESUMO
    const resumoMap = {};
    let totalGeral = 0;

    dadosDia.forEach(item => {
      const tipo = item.tipos_documento?.descricao || 'Outros';
      const razao = item.razoes?.nome || '-';
      const banco = item.bancos?.nome || ''; 
      const chave = `${tipo}-${razao}-${banco}`;

      totalGeral += Number(item.valor);

      if (!resumoMap[chave]) resumoMap[chave] = { tipo, razao, banco, valor: 0 };
      resumoMap[chave].valor += Number(item.valor);
    });

    const resumoArray = Object.values(resumoMap).sort((a, b) => a.tipo.localeCompare(b.tipo));
    const bodyResumo = resumoArray.map(r => [dataFormatada, r.tipo, r.razao, r.banco, formatMoney(r.valor)]);
    bodyResumo.push(['Total Geral', '', '', '', formatMoney(totalGeral)]);

    autoTable(doc, {
      startY: 25,
      head: [[{ content: diaSemanaCapitalizado, colSpan: 1, styles: { fillColor: [60, 90, 120] } }, 'Tipo Documento', 'Razão', 'Banco', 'Valor']],
      body: bodyResumo,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'center', valign: 'middle', fontStyle: 'bold', fillColor: [240, 240, 240] },
        4: { halign: 'right', fontStyle: 'bold' }
      },
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

    // DETALHE
    const bodyDetalhe = dadosDia.map(d => ({
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
            const str = 'Pág. ' + doc.internal.getNumberOfPages() + '/1';
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text(str, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
        }
    });

    doc.save(`Relatorio_Diario_${dataFormatada.replace(/\//g, '-')}.pdf`);
  };

  return (
    <div className="space-y-10 pb-10">
      <h2 className="text-3xl font-bold text-primary">Relatórios</h2>

      {/* BLOCO DE RELATÓRIO SEMANAL */}
      <section className="bg-white p-6 rounded-lg shadow border border-blue-100">
        <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Calendar className="text-secondary"/> Total por Período
        </h3>
        <div className="flex flex-wrap gap-4 items-end mb-6">
          <input type="date" className="p-2 border rounded" value={range.inicio} onChange={e => setRange({...range, inicio: e.target.value})} />
          <input type="date" className="p-2 border rounded" value={range.fim} onChange={e => setRange({...range, fim: e.target.value})} />
          <button onClick={buscarSemana} className="bg-primary text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-secondary">
            <Search size={18} /> Filtrar
          </button>
          
          {dadosSemana.length > 0 && (
            <button onClick={gerarPDFSemanal} className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-700 ml-auto shadow">
              <FileDown size={18} /> Exportar PDF
            </button>
          )}
        </div>

        {/* PRÉVIA NA TELA (Opcional: Listagem simples para conferência) */}
        {dadosSemana.length > 0 && (
            <div className="text-sm text-gray-500 italic mt-2">
                {dadosSemana.length} lançamentos encontrados. Clique em "Exportar PDF" para ver o resumo totalizado.
            </div>
        )}
      </section>

      {/* BLOCO DE RELATÓRIO DIÁRIO */}
      <section className="bg-white p-6 rounded-lg shadow border border-blue-100">
        <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <FileText className="text-secondary"/> Relatório Diário Detalhado
        </h3>

        <div className="flex items-end gap-4 mb-6">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm text-gray-500 mb-1">Selecione o Dia</label>
            <input type="date" className="w-full p-2 border rounded" value={dia} onChange={(e) => buscarDia(e.target.value)} />
          </div>
          
          {dadosDia.length > 0 && (
            <button onClick={gerarPDFDiario} className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-700 shadow-lg">
              <FileDown size={18} /> Gerar PDF Diário
            </button>
          )}
        </div>

        {dadosDia.length > 0 ? (
          <div className="overflow-x-auto border rounded max-h-96">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 uppercase sticky top-0">
                <tr>
                  <th className="p-3">Fornecedor</th>
                  <th className="p-3">Tipo Doc</th>
                  <th className="p-3">Banco</th>
                  <th className="p-3">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dadosDia.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="p-3">{d.fornecedores?.nome}</td>
                    <td className="p-3">
                        <span 
                          className="px-2 py-1 rounded text-white text-xs font-bold shadow-sm"
                          style={{ backgroundColor: rgbToHex(getCor(d.tipos_documento?.descricao)) }}
                        >
                            {d.tipos_documento?.descricao}
                        </span>
                    </td>
                    <td className="p-3">{d.bancos?.nome}</td>
                    <td className="p-3 font-bold">{formatMoney(d.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : dia && <p className="text-gray-500 italic">Nenhum lançamento neste dia.</p>}
      </section>
    </div>
  );
}