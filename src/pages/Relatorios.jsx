import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, Search, Calendar, FileText, Users } from 'lucide-react'; // Adicionei Users para o ícone
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
  // Estados Relatório 1 (Total por Período)
  const [range, setRange] = useState({ inicio: '', fim: '' });
  const [dadosSemana, setDadosSemana] = useState([]);

  // Estados Relatório 2 (Diário)
  const [dia, setDia] = useState('');
  const [dadosDia, setDadosDia] = useState([]);

  // Estados Relatório 3 (Totalizador por Fornecedor)
  const [filtrosFornecedor, setFiltrosFornecedor] = useState({
    inicio: '',
    fim: '',
    status: '',
    fornecedor_id: ''
  });
  const [listaFornecedores, setListaFornecedores] = useState([]);

  const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Carregar lista de fornecedores para o select
  useEffect(() => {
    async function carregar() {
        const { data } = await supabase.from('fornecedores').select('*').order('nome');
        setListaFornecedores(data || []);
    }
    carregar();
  }, []);

  // --- BUSCAS EXISTENTES ---
  const buscarSemana = async () => {
    if (!range.inicio || !range.fim) return alert('Selecione as datas!');
    const { data, error } = await supabase
      .from('lancamentos')
      .select('*')
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
      .order('id', { ascending: true }); // Ordena por data de criação (mais velho -> mais novo)
    if (error) alert('Erro: ' + error.message);
    else setDadosDia(data || []);
  };

  // ==================================================================================
  // 1. GERADOR PDF: TOTAL DA SEMANA
  // ==================================================================================
  const gerarPDFSemanal = () => {
    const doc = new jsPDF();
    const dataHoraGeracao = format(new Date(), 'dd/MM/yyyy, HH:mm');

    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.text("Total da Semana", 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Gerado em: ${dataHoraGeracao}`, 200, 25, { align: 'right' });

    const resumoPorDia = {};
    let totalGeral = 0;

    dadosSemana.forEach(item => {
        const data = item.data_vencimento;
        if (!resumoPorDia[data]) resumoPorDia[data] = 0;
        resumoPorDia[data] += Number(item.valor);
        totalGeral += Number(item.valor);
    });

    const linhasTabela = Object.keys(resumoPorDia).sort().map(dataIso => {
        const dataObj = new Date(dataIso + 'T12:00:00');
        const diaSemana = format(dataObj, 'EEEE', { locale: ptBR });
        const diaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
        
        return [
            format(dataObj, 'dd/MM/yyyy'),
            diaCapitalizado,
            formatMoney(resumoPorDia[dataIso])
        ];
    });

    linhasTabela.push(['Total da Semana', '', formatMoney(totalGeral)]);

    autoTable(doc, {
        startY: 35,
        head: [['Vencimento', 'Dia', 'Valor']],
        body: linhasTabela,
        theme: 'striped',
        headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: { 0: { halign: 'center' }, 1: { halign: 'left' }, 2: { halign: 'right' } },
        didParseCell: function (data) {
            if (data.row.index === linhasTabela.length - 1) {
                data.cell.styles.fillColor = [0, 51, 102];
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

    doc.save('Total_Semana.pdf');
  };

  // ==================================================================================
  // 2. GERADOR PDF: RELATÓRIO DIÁRIO
  // ==================================================================================
  const gerarPDFDiario = () => {
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

  // ==================================================================================
  // 3. GERADOR PDF: TOTALIZADOR POR FORNECEDOR
  // ==================================================================================
  const gerarPDFFornecedor = async () => {
    if (!filtrosFornecedor.inicio || !filtrosFornecedor.fim) {
        return alert("Selecione o período (Data Inicial e Final)");
    }

    let query = supabase
        .from('lancamentos')
        .select(`*, fornecedores(nome)`)
        .gte('data_vencimento', filtrosFornecedor.inicio)
        .lte('data_vencimento', filtrosFornecedor.fim);

    if (filtrosFornecedor.status) {
        query = query.eq('status', filtrosFornecedor.status);
    }
    if (filtrosFornecedor.fornecedor_id) {
        query = query.eq('fornecedor_id', filtrosFornecedor.fornecedor_id);
    }

    const { data, error } = await query;
    if (error) return alert("Erro ao buscar dados: " + error.message);
    if (!data || data.length === 0) return alert("Nenhum dado encontrado para este filtro.");

    // --- Processamento dos Dados (Agrupamento) ---
    const agrupado = {};
    let totalGeralValor = 0;
    
    data.forEach(item => {
        const nomeFornecedor = item.fornecedores?.nome || 'Fornecedor Desconhecido';
        
        if (!agrupado[nomeFornecedor]) {
            agrupado[nomeFornecedor] = {
                nome: nomeFornecedor,
                valorTotal: 0,
                juros: 0,
                desconto: 0,
                pagosEmDia: 0,
                pagosEmAtraso: 0
            };
        }

        const valor = Number(item.valor);
        const valorPago = Number(item.valor_pago || 0);

        agrupado[nomeFornecedor].valorTotal += valor;
        totalGeralValor += valor;
        
        if (item.status === 'Pago') {
            agrupado[nomeFornecedor].juros += Number(item.juros || 0);
            agrupado[nomeFornecedor].desconto += Number(item.desconto || 0);

            if ((item.dias_atraso || 0) > 0) {
                agrupado[nomeFornecedor].pagosEmAtraso += valorPago;
            } else {
                agrupado[nomeFornecedor].pagosEmDia += valorPago;
            }
        }
    });

    // Converter para array e ordenar
    const linhas = Object.values(agrupado)
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map(f => [
            f.nome,
            formatMoney(f.valorTotal),
            formatMoney(f.juros),
            formatMoney(f.desconto),
            formatMoney(f.pagosEmDia),
            formatMoney(f.pagosEmAtraso)
        ]);

    // Adiciona Total Geral
    linhas.push([
        'TOTAL GERAL', 
        formatMoney(totalGeralValor), 
        '-', '-', '-', '-'
    ]);

    // --- Geração do PDF ---
    const doc = new jsPDF();
    const dataHoraGeracao = format(new Date(), 'dd/MM/yyyy, HH:mm');
    const periodo = `${format(new Date(filtrosFornecedor.inicio + 'T12:00:00'), 'dd/MM/yyyy')} a ${format(new Date(filtrosFornecedor.fim + 'T12:00:00'), 'dd/MM/yyyy')}`;

    doc.setFontSize(16);
    doc.setTextColor(0, 51, 102);
    doc.text("Relatório Totalizador por Fornecedor", 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Período: ${periodo}`, 105, 22, { align: 'center' });
    doc.text(`Gerado em: ${dataHoraGeracao}`, 200, 22, { align: 'right' });

    autoTable(doc, {
        startY: 30,
        head: [['Fornecedor', 'Valor Total', 'Juros/Multa', 'Desc/Abat', 'Pagos Dia', 'Pagos Atraso']],
        body: linhas,
        theme: 'striped',
        headStyles: { fillColor: [0, 51, 102], halign: 'center' },
        columnStyles: {
            0: { halign: 'left', fontStyle: 'bold' },
            1: { halign: 'right', fontStyle: 'bold', textColor: [0, 51, 102] },
            2: { halign: 'right', textColor: [220, 53, 69] }, // Vermelho
            3: { halign: 'right', textColor: [40, 167, 69] }, // Verde
            4: { halign: 'right' },
            5: { halign: 'right' }
        },
        didParseCell: function (data) {
            // Estilo da última linha (Total Geral)
            if (data.row.index === linhas.length - 1) {
                data.cell.styles.fillColor = [0, 51, 102];
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

    doc.save(`Totalizador_Fornecedor.pdf`);
  };


  return (
    <div className="space-y-10 pb-10">
      <h2 className="text-3xl font-bold text-primary">Relatórios</h2>

      {/* BLOCO 1: TOTAL POR PERÍODO */}
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
        {dadosSemana.length > 0 && (
            <div className="text-sm text-gray-500 italic mt-2">
                {dadosSemana.length} lançamentos encontrados. Clique em "Exportar PDF" para ver o resumo.
            </div>
        )}
      </section>

      {/* BLOCO 2: RELATÓRIO DIÁRIO */}
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
        
        {/* Prévia da Tabela Diária */}
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
                        <span className="px-2 py-1 rounded text-white text-xs font-bold shadow-sm"
                          style={{ backgroundColor: rgbToHex(getCor(d.tipos_documento?.descricao)) }}>
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

      {/* BLOCO 3: TOTALIZADOR POR FORNECEDOR (NOVO) */}
      <section className="bg-white p-6 rounded-lg shadow border border-blue-100">
        <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Users className="text-secondary"/> Relatório Totalizador por Fornecedor
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
                <label className="block text-sm text-gray-500 mb-1">Data Inicial</label>
                <input type="date" className="w-full p-2 border rounded" 
                    value={filtrosFornecedor.inicio} 
                    onChange={e => setFiltrosFornecedor({...filtrosFornecedor, inicio: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm text-gray-500 mb-1">Data Final</label>
                <input type="date" className="w-full p-2 border rounded" 
                    value={filtrosFornecedor.fim} 
                    onChange={e => setFiltrosFornecedor({...filtrosFornecedor, fim: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm text-gray-500 mb-1">Status</label>
                <select className="w-full p-2 border rounded" 
                    value={filtrosFornecedor.status} 
                    onChange={e => setFiltrosFornecedor({...filtrosFornecedor, status: e.target.value})}>
                    <option value="">STATUS (Todos)</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Pago">Pago</option>
                </select>
            </div>
            <div>
                <label className="block text-sm text-gray-500 mb-1">Fornecedor</label>
                <select className="w-full p-2 border rounded" 
                    value={filtrosFornecedor.fornecedor_id} 
                    onChange={e => setFiltrosFornecedor({...filtrosFornecedor, fornecedor_id: e.target.value})}>
                    <option value="">Todos Fornecedores</option>
                    {listaFornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
            </div>
            
            <button 
                onClick={gerarPDFFornecedor}
                className="bg-[#0f172a] text-white px-4 py-2 rounded flex items-center justify-center gap-2 hover:bg-blue-900 shadow-lg"
            >
              <Search size={18} /> Filtrar e Exportar
            </button>
        </div>
      </section>

    </div>
  );
}