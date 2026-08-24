import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Printer, FileDown, ArrowLeft } from 'lucide-react';

export default function RelatorioNumerariosPrint() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inicio = searchParams.get('inicio');
  const fim = searchParams.get('fim');
  const horaInicio = searchParams.get('horaInicio') || '00:00';
  const horaFim = searchParams.get('horaFim') || '23:59';

  const [sangrias, setSangrias] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, [inicio, fim, horaInicio, horaFim]);

  const montarTimestamp = (dataStr, dataHoraRegStr, created_at, horaManual) => {
    let hora = horaManual || '00:00';
    if (!horaManual && dataHoraRegStr && dataHoraRegStr.includes(',')) {
      hora = dataHoraRegStr.split(',')[1]?.trim().slice(0, 5) || '00:00';
    } else if (!horaManual && created_at) {
      const dt = new Date(created_at);
      hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    const dataFinal = dataStr || (created_at ? created_at.split('T')[0] : '1970-01-01');
    return new Date(`${dataFinal}T${hora.length === 5 ? hora + ':00' : hora}`);
  };

  const carregarDados = async () => {
    setLoading(true);

    const { data: listaS } = await supabase
      .from('movimento_caixa')
      .select('*')
      .eq('tipo_documento', 'Sangria')
      .eq('forma_pagamento', 'Dinheiro')
      .eq('banco_operador', 'Tesouraria')
      .eq('tipo_operacao', 'Saída -')
      .order('data_operacao', { ascending: true });

    const { data: listaD } = await supabase
      .from('depositos_bancarios')
      .select('*')
      .order('data_deposito', { ascending: true });

    const dtInicioCorte = inicio ? new Date(`${inicio}T${horaInicio}:00`) : null;
    const dtFimCorte = fim ? new Date(`${fim}T${horaFim}:59`) : null;

    const sangriasFiltradas = (listaS || []).filter(s => {
      const timestampItem = montarTimestamp(s.data_operacao, s.data_lancamento, s.created_at);
      if (dtInicioCorte && timestampItem < dtInicioCorte) return false;
      if (dtFimCorte && timestampItem > dtFimCorte) return false;
      return true;
    });

    const depsFiltrados = (listaD || []).filter(d => {
      const timestampItem = montarTimestamp(d.data_operacao || d.data_deposito, null, d.created_at, d.hora_operacao);
      if (dtInicioCorte && timestampItem < dtInicioCorte) return false;
      if (dtFimCorte && timestampItem > dtFimCorte) return false;
      return true;
    });

    setSangrias(sangriasFiltradas);
    setDepositos(depsFiltrados);
    setLoading(false);
  };

  const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const formatarData = (d) => d ? d.split('-').reverse().join('/') : '';

  const totalSangrias = sangrias.reduce((acc, c) => acc + Number(c.valor || 0), 0);
  const totalDepositos = depositos.reduce((acc, c) => acc + Number(c.valor_depositado || 0), 0);
  const saldoDiferenca = totalSangrias - totalDepositos;

  const getJanelaTexto = () => {
    const inicioStr = inicio ? `${formatarData(inicio)} às ${horaInicio}` : 'Início';
    const fimStr = fim ? `${formatarData(fim)} às ${horaFim}` : 'Hoje';
    return `${inicioStr} até ${fimStr}`;
  };

  const gerarPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const dataHoraGeracao = new Date().toLocaleString('pt-BR');

    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text("Controle de Numerários: Tesouraria x Depósitos Bancários", 14, 14);

    doc.setFontSize(8.5);
    doc.setTextColor(100);
    doc.text(`Janela Operacional: ${getJanelaTexto()}`, 14, 19);
    doc.text(`Emissão: ${dataHoraGeracao}`, doc.internal.pageSize.width - 14, 14, { align: 'right' });
    doc.text("CP PRO • Gestão Financeira", doc.internal.pageSize.width - 14, 19, { align: 'right' });

    const bodySangrias = sangrias.map(s => [
      `${formatarData(s.data_operacao)} ${s.data_lancamento?.includes(',') ? s.data_lancamento.split(',')[1]?.trim() : ''}`,
      s.responsavel || '-',
      formatarMoeda(s.valor || 0)
    ]);

    autoTable(doc, {
      startY: 23,
      margin: { left: 14, right: doc.internal.pageSize.width / 2 + 3 },
      head: [['Data/Hora Op.', 'Responsável Caixa', 'Valor Sangria']],
      body: bodySangrias,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [16, 120, 80], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 32 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 26, halign: 'right', fontStyle: 'bold' } }
    });

    const bodyDepositos = depositos.map(d => [
      `${formatarData(d.data_operacao || d.data_deposito)} ${d.hora_operacao || ''}`,
      `${d.banco} (${d.conta})`,
      d.nome_depositante || '-',
      formatarMoeda(d.valor_depositado || 0)
    ]);

    autoTable(doc, {
      startY: 23,
      margin: { left: doc.internal.pageSize.width / 2 + 3, right: 14 },
      head: [['Data/Hora Op.', 'Banco/Conta', 'Depositante', 'Valor Depósito']],
      body: bodyDepositos,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 32 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 26, halign: 'right', fontStyle: 'bold' } }
    });

    const finalY = Math.max(doc.lastAutoTable.finalY, 110) + 6;

    doc.setFontSize(9);
    doc.setTextColor(50);
    doc.text(`Total Entradas Tesouraria: ${formatarMoeda(totalSangrias)}`, 14, finalY);
    doc.text(`Total Depósitos Bancários: ${formatarMoeda(totalDepositos)}`, doc.internal.pageSize.width / 2 + 3, finalY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text(`Saldo / Diferença: ${formatarMoeda(saldoDiferenca)}`, doc.internal.pageSize.width - 70, finalY);

    doc.setDrawColor(200);
    doc.rect(14, finalY + 4, doc.internal.pageSize.width - 28, 16);
    doc.setFontSize(8);
    doc.setTextColor(130);
    doc.text("Observações (Anotações manuais):", 16, finalY + 8);

    const signY = finalY + 34;
    const largura = (doc.internal.pageSize.width - 28) / 3;

    doc.line(14, signY, 14 + largura - 10, signY);
    doc.line(14 + largura + 5, signY, 14 + (largura * 2) - 5, signY);
    doc.line(14 + (largura * 2) + 10, signY, doc.internal.pageSize.width - 14, signY);

    doc.setFontSize(7.5);
    doc.setTextColor(60);
    doc.text("Responsável Caixa Geral", 14 + (largura - 10) / 2, signY + 4, { align: 'center' });
    doc.text("Responsável Tesouraria", 14 + largura + (largura - 10) / 2, signY + 4, { align: 'center' });
    doc.text("Responsável Depositante", 14 + (largura * 2) + 10 + (largura - 10) / 2, signY + 4, { align: 'center' });

    doc.save(`Controle_Numerarios_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6 print:p-0 print:bg-white">
      
      <style>{`
        @page {
          size: landscape;
          margin: 8mm;
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
      <div className="print-container max-w-6xl mx-auto bg-white p-6 rounded-xl border shadow-sm print:border-none print:shadow-none space-y-4">
        
        {/* CABEÇALHO */}
        <div className="flex justify-between items-start border-b pb-3">
          <div>
            <h1 className="text-lg font-black tracking-tight text-[#003366]">Controle de Numerários: Tesouraria x Depósitos Bancários</h1>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">
              Janela de Fechamento: <strong>{getJanelaTexto()}</strong>
            </p>
          </div>
          <div className="text-right text-[10px] text-gray-500 space-y-0.5">
            <p className="font-bold text-gray-800">CP PRO &bull; Gestão Financeira</p>
            <p>Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        {/* DUAS TABELAS LADO A LADO */}
        {loading ? (
          <div className="py-16 text-center text-xs text-gray-400 font-semibold">Carregando dados...</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 items-start">
            
            {/* SANGRIAS */}
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div className="bg-emerald-800 text-white p-2 font-bold text-[11px] uppercase flex justify-between items-center">
                <span>1. Entradas Tesouraria (Sangrias Dinheiro)</span>
                <span>{formatarMoeda(totalSangrias)}</span>
              </div>
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="bg-gray-100 border-b text-gray-700 font-bold uppercase">
                    <th className="p-1.5">Data/Hora Reg.</th>
                    <th className="p-1.5">Responsável</th>
                    <th className="p-1.5 text-right">Valor R$</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sangrias.length === 0 ? (
                    <tr><td colSpan="3" className="p-4 text-center text-gray-400 italic">Nenhum registro no período.</td></tr>
                  ) : (
                    sangrias.map((s, idx) => (
                      <tr key={s.id || idx} className="hover:bg-gray-50">
                        <td className="p-1.5 font-semibold">
                          {formatarData(s.data_operacao)} {s.data_lancamento?.includes(',') ? s.data_lancamento.split(',')[1]?.trim() : ''}
                        </td>
                        <td className="p-1.5 text-gray-700 truncate max-w-[110px]">{s.responsavel}</td>
                        <td className="p-1.5 text-right font-black text-emerald-700">{formatarMoeda(s.valor)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* DEPÓSITOS */}
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div className="bg-[#003366] text-white p-2 font-bold text-[11px] uppercase flex justify-between items-center">
                <span>2. Saídas p/ Banco (Depósitos Bancários)</span>
                <span>{formatarMoeda(totalDepositos)}</span>
              </div>
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="bg-gray-100 border-b text-gray-700 font-bold uppercase">
                    <th className="p-1.5">Data/Hora Op.</th>
                    <th className="p-1.5">Banco/Conta</th>
                    <th className="p-1.5">Depositante</th>
                    <th className="p-1.5 text-right">Valor R$</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {depositos.length === 0 ? (
                    <tr><td colSpan="4" className="p-4 text-center text-gray-400 italic">Nenhum registro no período.</td></tr>
                  ) : (
                    depositos.map((d, idx) => (
                      <tr key={d.id || idx} className="hover:bg-gray-50">
                        <td className="p-1.5 font-semibold">{formatarData(d.data_operacao || d.data_deposito)} {d.hora_operacao || ''}</td>
                        <td className="p-1.5 text-gray-700 truncate max-w-[90px]">{d.banco} ({d.conta})</td>
                        <td className="p-1.5 text-gray-600 truncate max-w-[100px]">{d.nome_depositante || '-'}</td>
                        <td className="p-1.5 text-right font-black text-indigo-950">{formatarMoeda(d.valor_depositado)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* QUADRO DE TOTAIS */}
        <div className="border-t-2 border-gray-300 pt-3 flex justify-between items-center text-xs">
          <div className="flex gap-6 font-semibold text-gray-700">
            <span>Total Sangrias: <strong className="text-emerald-700 font-black">{formatarMoeda(totalSangrias)}</strong></span>
            <span>Total Depósitos: <strong className="text-indigo-900 font-black">{formatarMoeda(totalDepositos)}</strong></span>
          </div>
          <div className="bg-gray-100 px-4 py-2 rounded-lg border border-gray-300 font-black text-sm text-[#003366]">
            <span>Saldo / Diferença: </span>
            <span className={saldoDiferenca >= 0 ? 'text-[#003366]' : 'text-red-600'}>{formatarMoeda(saldoDiferenca)}</span>
          </div>
        </div>

        {/* CAMPO DE OBSERVAÇÕES MANUSCRITAS */}
        <div className="border border-dashed border-gray-400 rounded-lg p-3 min-h-[50px]">
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
            Observações (Anotações manuais da tesouraria/caixa):
          </span>
        </div>

        {/* ASSINATURAS */}
        <div className="grid grid-cols-3 gap-8 pt-8 text-center text-[10px]">
          <div>
            <div className="border-t border-gray-800 w-full mb-1"></div>
            <p className="font-bold uppercase text-gray-800">Responsável Caixa Geral</p>
          </div>
          <div>
            <div className="border-t border-gray-800 w-full mb-1"></div>
            <p className="font-bold uppercase text-gray-800">Responsável Tesouraria</p>
          </div>
          <div>
            <div className="border-t border-gray-800 w-full mb-1"></div>
            <p className="font-bold uppercase text-gray-800">Responsável Depositante</p>
          </div>
        </div>

      </div>
    </div>
  );
}