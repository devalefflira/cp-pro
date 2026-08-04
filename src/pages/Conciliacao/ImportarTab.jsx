import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Upload, FileCode, FileSpreadsheet, History } from 'lucide-react';

export default function ImportarTab() {
  const [tipoImportacao, setTipoArquivo] = useState('OFX');
  const [bancoSelecionado, setBanco] = useState('Bradesco');
  const [loading, setLoading] = useState(false);
  const [historico, setHistorico] = useState([]);

  useEffect(() => {
    carregarHistorico();
  }, []);

  const carregarHistorico = async () => {
    const { data } = await supabase
      .from('importacoes_historico')
      .select('*')
      .order('data_importacao', { ascending: false });
    setHistorico(data || []);
  };

  // Parser para arquivos OFX (Money 2000 e superiores)
  const parseOFX = (text) => {
    const transacoes = [];
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;

    while ((match = stmtTrnRegex.exec(text)) !== null) {
      const block = match[1];
      const dtPosted = (block.match(/<DTPOSTED>(.*)/i) || [])[1]?.trim();
      const trnAmtRaw = (block.match(/<TRNAMT>(.*)/i) || [])[1]?.trim();
      const fitId = (block.match(/<FITID>(.*)/i) || [])[1]?.trim();
      const memo = (block.match(/<MEMO>(.*)/i) || [])[1]?.trim() || (block.match(/<NAME>(.*)/i) || [])[1]?.trim() || 'Transação OFX';

      if (dtPosted && trnAmtRaw) {
        const ano = dtPosted.substring(0, 4);
        const mes = dtPosted.substring(4, 6);
        const dia = dtPosted.substring(6, 8);

        // Trata moeda com vírgula ou ponto
        const trnAmtLimpo = trnAmtRaw.replace(/\./g, '').replace(',', '.');
        const val = parseFloat(trnAmtLimpo);

        if (!isNaN(val)) {
          transacoes.push({
            fitid: fitId || `OFX-${Date.now()}-${Math.random()}`,
            data_transacao: `${ano}-${mes}-${dia}`,
            valor: Math.abs(val),
            tipo_operacao: val < 0 ? 'Saída' : 'Entrada',
            descricao: memo,
            memo: memo
          });
        }
      }
    }
    return transacoes;
  };

  // Converte DD/MM/YYYY para YYYY-MM-DD
  const formatarDataIso = (strData) => {
    if (!strData) return null;
    const limpa = strData.trim();
    if (limpa.includes('/')) {
      const [d, m, y] = limpa.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return limpa;
  };

  // Trata corretamente moedas como "5.132,70" -> 5132.70
  const parseMoedaBR = (valStr) => {
    if (!valStr) return 0;
    let s = valStr.toString().trim();
    // Remove ponto de milhar e substitui vírgula decimal por ponto
    s = s.replace(/\./g, '').replace(',', '.');
    return parseFloat(s) || 0;
  };

  // Função para dividir a linha do CSV respeitando aspas
  const splitCSVLine = (line, separator) => {
    const result = [];
    let start = 0;
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === separator && !inQuotes) {
        let field = line.substring(start, i).trim();
        if (field.startsWith('"') && field.endsWith('"')) {
          field = field.substring(1, field.length - 1);
        }
        result.push(field);
        start = i + 1;
      }
    }
    let lastField = line.substring(start).trim();
    if (lastField.startsWith('"') && lastField.endsWith('"')) {
      lastField = lastField.substring(1, lastField.length - 1);
    }
    result.push(lastField);
    return result;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);

    try {
      const text = await file.text();
      const hoje = new Date();
      const mesAnoFormatado = `${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;

      if (tipoImportacao === 'OFX') {
        const transacoes = parseOFX(text);
        if (transacoes.length === 0) {
          alert("Nenhuma transação válida encontrada no arquivo OFX.");
          setLoading(false);
          return;
        }

        const { data: imp, error: errHist } = await supabase
          .from('importacoes_historico')
          .insert([{
            tipo_arquivo: 'OFX',
            banco: bancoSelecionado,
            periodo_importado: mesAnoFormatado,
            quantidade_registros: transacoes.length,
            nome_arquivo: file.name
          }])
          .select()
          .single();

        if (errHist) throw errHist;

        const payloadTrans = transacoes.map(t => ({
          ...t,
          importacao_id: imp.id,
          banco: bancoSelecionado
        }));

        const { error: errTrans } = await supabase.from('extrato_transacoes').insert(payloadTrans);
        if (errTrans) throw errTrans;

        alert(`Arquivo OFX importado com sucesso! ${transacoes.length} transações salvas.`);

      } else {
        // --- IMPORTAÇÃO TÍTULOS PAGOS (CSV) ---
        const linhas = text.split(/\r?\n/).filter(l => l.trim() !== '');
        if (linhas.length <= 1) {
          alert("O arquivo selecionado está vazio ou contém apenas o cabeçalho.");
          setLoading(false);
          return;
        }

        // Detecta delimitador (tab, vírgula ou ponto e vírgula)
        const cabecalho = linhas[0];
        let separador = ',';
        if (cabecalho.includes('\t')) separador = '\t';
        else if (cabecalho.includes(';')) separador = ';';

        const payloadTitulos = [];

        for (let i = 1; i < linhas.length; i++) {
          const col = splitCSVLine(linhas[i], separador);

          // Padrão do layout:
          // [0] Nota_Fiscal | [1] Parcela | [2] Data_Vencimento | [3] Fornecedor | [4] CNPJ
          // [5] Data_Pagamento | [6] Valor_Desconto | [7] Valor_Juros | [8] Valor_Pago | [9] Banco
          if (col.length >= 6) {
            const nomeBanco = col[9] ? col[9].trim() : bancoSelecionado;

            payloadTitulos.push({
              nota_fiscal: col[0] || null,
              parcela: col[1] || null,
              data_vencimento: formatarDataIso(col[2]),
              fornecedor: col[3] || 'Fornecedor Não Informado',
              cnpj: col[4] || null,
              data_pagamento: formatarDataIso(col[5]),
              valor_desconto: parseMoedaBR(col[6]),
              valor_juros: parseMoedaBR(col[7]),
              valor_pago: parseMoedaBR(col[8]),
              banco: nomeBanco
            });
          }
        }

        if (payloadTitulos.length === 0) {
          alert("Nenhum registro válido foi encontrado no CSV.");
          setLoading(false);
          return;
        }

        // 1. Registra Histórico
        const { data: imp, error: errHist } = await supabase
          .from('importacoes_historico')
          .insert([{
            tipo_arquivo: 'Títulos Pagos',
            periodo_importado: mesAnoFormatado,
            quantidade_registros: payloadTitulos.length,
            nome_arquivo: file.name
          }])
          .select()
          .single();

        if (errHist) throw errHist;

        // 2. Insere os Títulos Pagos
        const payloadFinal = payloadTitulos.map(t => ({
          ...t,
          importacao_id: imp.id
        }));

        const { error: errTit } = await supabase.from('titulos_pagos_importados').insert(payloadFinal);
        if (errTit) throw errTit;

        alert(`Títulos Pagos importados com sucesso! ${payloadTitulos.length} registros inseridos.`);
      }

      carregarHistorico();
    } catch (err) {
      alert("Erro na importação: " + err.message);
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* SELEÇÃO DO TIPO DE IMPORTAÇÃO */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
          <Upload className="text-primary" size={20} /> Nova Importação de Arquivo
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Importação</label>
            <select
              value={tipoImportacao}
              onChange={e => setTipoArquivo(e.target.value)}
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-sm font-semibold outline-none"
            >
              <option value="OFX">Extrato OFX (Money 2000+)</option>
              <option value="TITULOS">Títulos Pagos (Planilha/CSV)</option>
            </select>
          </div>

          {tipoImportacao === 'OFX' && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Banco Origem</label>
              <select
                value={bancoSelecionado}
                onChange={e => setBanco(e.target.value)}
                className="w-full p-2.5 border rounded-lg bg-gray-50 text-sm font-semibold outline-none"
              >
                <option value="Bradesco">Bradesco</option>
                <option value="Santander">Santander</option>
                <option value="Sicoob">Sicoob</option>
                <option value="Tribanco">Tribanco</option>
              </select>
            </div>
          )}

          <div className="flex items-end">
            <label className="w-full bg-primary hover:bg-blue-900 text-white font-bold py-2.5 px-4 rounded-lg cursor-pointer text-center text-sm shadow flex items-center justify-center gap-2 transition-transform hover:scale-105">
              {tipoImportacao === 'OFX' ? <FileCode size={18}/> : <FileSpreadsheet size={18}/>}
              {loading ? "Processando..." : "Selecionar Arquivo"}
              <input type="file" accept={tipoImportacao === 'OFX' ? '.ofx' : '.csv,.txt'} onChange={handleFileUpload} disabled={loading} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* HISTÓRICO DE IMPORTAÇÃO */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
          <History className="text-secondary" size={20} /> Histórico de Registros de Importação
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-500 uppercase font-bold">
                <th className="p-3">Data Importação</th>
                <th className="p-3">Tipo de Arquivo</th>
                <th className="p-3">Banco</th>
                <th className="p-3">Período Importado</th>
                <th className="p-3">Qtd Registros</th>
                <th className="p-3">Arquivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {historico.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="p-3 font-medium">{new Date(h.data_importacao).toLocaleString('pt-BR')}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${h.tipo_arquivo === 'OFX' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {h.tipo_arquivo}
                    </span>
                  </td>
                  <td className="p-3 font-semibold">{h.banco || '-'}</td>
                  <td className="p-3">{h.periodo_importado}</td>
                  <td className="p-3 font-bold">{h.quantidade_registros}</td>
                  <td className="p-3 text-gray-500 truncate max-w-xs">{h.nome_arquivo || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}