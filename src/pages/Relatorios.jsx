import { useState } from 'react';
import { supabase } from '../services/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, Search, Calendar, FileText } from 'lucide-react'; // <--- FileText adicionado aqui
import { format } from 'date-fns';

export default function Relatorios() {
  // Estado do Relatório Semanal
  const [range, setRange] = useState({ inicio: '', fim: '' });
  const [dadosSemana, setDadosSemana] = useState([]);
  
  // Estado do Relatório Diário
  const [dia, setDia] = useState('');
  const [dadosDia, setDadosDia] = useState([]);

  // Auxiliar de Formatação
  const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // --- BUSCA SEMANAL ---
  const buscarSemana = async () => {
    if (!range.inicio || !range.fim) return alert('Selecione as datas!');
    
    const { data, error } = await supabase
      .from('lancamentos')
      .select(`*, fornecedores(nome), tipos_documento(descricao)`)
      .gte('data_vencimento', range.inicio)
      .lte('data_vencimento', range.fim)
      .order('data_vencimento');

    if (error) alert('Erro: ' + error.message);
    else setDadosSemana(data || []);
  };

  // --- BUSCA DIÁRIA ---
  const buscarDia = async (dataSelecionada) => {
    setDia(dataSelecionada);
    if (!dataSelecionada) return;

    const { data, error } = await supabase
      .from('lancamentos')
      .select(`*, fornecedores(nome), tipos_documento(descricao), bancos(nome), razoes(nome), parcelas(descricao)`)
      .eq('data_vencimento', dataSelecionada);

    if (error) alert('Erro: ' + error.message);
    else setDadosDia(data || []);
  };

  // --- GERAR PDF GENÉRICO ---
  const gerarPDF = (titulo, dados, colunas) => {
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102); // Azul Primary
    doc.text("CP PRO - " + titulo, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 28);

    // Preparar linhas da tabela
    const tableRows = dados.map(item => colunas.map(col => {
      // Lógica para extrair o dado correto (seja simples ou objeto aninhado)
      if (col.field.includes('.')) {
        const [obj, key] = col.field.split('.');
        return item[obj]?.[key] || '-';
      }
      if (col.field === 'valor') return formatMoney(item.valor);
      
      // Formata data do formato YYYY-MM-DD para DD/MM/YYYY
      if (col.field === 'data_vencimento' && item.data_vencimento) {
        const parts = item.data_vencimento.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      
      return item[col.field];
    }));

    autoTable(doc, {
      head: [colunas.map(c => c.header)],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 51, 102] }
    });

    // Rodapé com Total
    const total = dados.reduce((acc, curr) => acc + Number(curr.valor), 0);
    doc.setFontSize(12);
    doc.setTextColor(0);
    // Posiciona o total logo após o fim da tabela
    doc.text(`Valor Total do Período: ${formatMoney(total)}`, 14, doc.lastAutoTable.finalY + 10);

    doc.save(`${titulo.replace(/ /g, '_')}.pdf`);
  };

  return (
    <div className="space-y-10 pb-10">
      <h2 className="text-3xl font-bold text-primary">Relatórios</h2>

      {/* --- RELATÓRIO 1: TOTAL DA SEMANA (POR PERÍODO) --- */}
      <section className="bg-white p-6 rounded-lg shadow border border-blue-100">
        <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Calendar className="text-secondary"/> Total por Período
        </h3>
        
        <div className="flex flex-wrap gap-4 items-end mb-6">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Data Início</label>
            <input type="date" className="p-2 border rounded" value={range.inicio} onChange={e => setRange({...range, inicio: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Data Fim</label>
            <input type="date" className="p-2 border rounded" value={range.fim} onChange={e => setRange({...range, fim: e.target.value})} />
          </div>
          <button onClick={buscarSemana} className="bg-primary text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-secondary">
            <Search size={18} /> Filtrar
          </button>
          
          {dadosSemana.length > 0 && (
            <button 
              onClick={() => gerarPDF('Relatório Semanal', dadosSemana, [
                {header: 'Vencimento', field: 'data_vencimento'},
                {header: 'Fornecedor', field: 'fornecedores.nome'},
                {header: 'Tipo', field: 'tipos_documento.descricao'},
                {header: 'Valor', field: 'valor'},
                {header: 'Status', field: 'status'}
              ])}
              className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-700 ml-auto"
            >
              <FileDown size={18} /> Exportar PDF
            </button>
          )}
        </div>

        {/* Prévia da Tabela Semanal */}
        {dadosSemana.length > 0 && (
          <div className="overflow-x-auto border rounded">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 uppercase">
                <tr>
                  <th className="p-3">Vencimento</th>
                  <th className="p-3">Fornecedor</th>
                  <th className="p-3">Valor</th>
                </tr>
              </thead>
              <tbody>
                {dadosSemana.map(d => (
                  <tr key={d.id} className="border-t">
                    <td className="p-3">{d.data_vencimento}</td>
                    <td className="p-3">{d.fornecedores?.nome}</td>
                    <td className="p-3 font-bold">{formatMoney(d.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* --- RELATÓRIO 2: DETALHADO DIÁRIO --- */}
      <section className="bg-white p-6 rounded-lg shadow border border-blue-100">
        <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          {/* AQUI ESTAVA O ERRO: FileText estava sendo usado mas não importado */}
          <FileText className="text-secondary"/> Relatório Diário Detalhado
        </h3>

        <div className="flex items-end gap-4 mb-6">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm text-gray-500 mb-1">Selecione o Dia</label>
            <input 
              type="date" 
              className="w-full p-2 border rounded" 
              value={dia} 
              onChange={(e) => buscarDia(e.target.value)} 
            />
          </div>
          
          {dadosDia.length > 0 && (
            <button 
              onClick={() => gerarPDF(`Relatório Diário - ${dia}`, dadosDia, [
                {header: 'Fornecedor', field: 'fornecedores.nome'},
                {header: 'Documento', field: 'numero_documento'},
                {header: 'NF', field: 'nota_fiscal'},
                {header: 'Banco', field: 'bancos.nome'},
                {header: 'Razão', field: 'razoes.nome'},
                {header: 'Valor', field: 'valor'}
              ])}
              className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-700"
            >
              <FileDown size={18} /> Exportar PDF
            </button>
          )}
        </div>

        {/* Prévia da Tabela Diária */}
        {dadosDia.length > 0 ? (
          <div className="overflow-x-auto border rounded">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 uppercase">
                <tr>
                  <th className="p-3">Fornecedor</th>
                  <th className="p-3">Tipo Doc</th>
                  <th className="p-3">Banco</th>
                  <th className="p-3">Razão</th>
                  <th className="p-3">Valor</th>
                </tr>
              </thead>
              <tbody>
                {dadosDia.map(d => (
                  <tr key={d.id} className="border-t">
                    <td className="p-3">{d.fornecedores?.nome}</td>
                    <td className="p-3">{d.tipos_documento?.descricao}</td>
                    <td className="p-3">{d.bancos?.nome}</td>
                    <td className="p-3 text-blue-800 bg-blue-50">{d.razoes?.nome}</td>
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