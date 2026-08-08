import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Upload, FileCode, FileSpreadsheet, History, Trash2, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  parseOFXSicoob, 
  parseOFXSantander, 
  parseOFXBradesco, 
  parseOFXTribanco 
} from '../../services/ofxParsers';

export default function ImportarTab() {
  const [tipoImportacao, setTipoImportacao] = useState('OFX');
  const [bancoSelecionado, setBanco] = useState('Bradesco');
  const [loading, setLoading] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [mensagemSucesso, setMensagemSucesso] = useState('');

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

  // Helper para conversão de datas (trata Date do JS, ISO "YYYY-MM-DD" ou "DD/MM/YYYY")
  const formatarDataIso = (val) => {
    if (!val) return null;
    if (val instanceof Date) {
      return val.toISOString().split('T')[0];
    }
    const str = String(val).trim();
    if (str.includes('/')) {
      const [d, m, y] = str.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    if (str.includes('T')) return str.split('T')[0];
    if (str.includes(' ')) return str.split(' ')[0];
    return str;
  };

  // Helper para conversão de valores monetários
  const parseMoeda = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    let s = String(val).trim().replace(/\./g, '').replace(',', '.');
    return parseFloat(s) || 0;
  };

  // Normaliza o nome do banco vindo da coluna "Banco" da planilha
  const normalizarBanco = (bancoRaw) => {
    if (!bancoRaw) return 'Outros';
    const b = String(bancoRaw).trim().toLowerCase();
    if (b.includes('sicoob')) return 'Sicoob';
    if (b.includes('bradesco')) return 'Bradesco';
    if (b.includes('santander')) return 'Santander';
    if (b.includes('tribanco') || b.includes('triangulo')) return 'Tribanco';
    return String(bancoRaw).trim();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);

    try {
      const hoje = new Date();
      const mesAnoFormatado = `${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;

      if (tipoImportacao === 'OFX') {
        const text = await file.text();
        let transacoesParsed = [];

        if (bancoSelecionado === 'Sicoob') transacoesParsed = parseOFXSicoob(text);
        else if (bancoSelecionado === 'Santander') transacoesParsed = parseOFXSantander(text);
        else if (bancoSelecionado === 'Bradesco') transacoesParsed = parseOFXBradesco(text);
        else if (bancoSelecionado === 'Tribanco') transacoesParsed = parseOFXTribanco(text);

        if (transacoesParsed.length === 0) {
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
            quantidade_registros: transacoesParsed.length,
            nome_arquivo: file.name
          }])
          .select()
          .single();

        if (errHist) throw errHist;

        const payloadTrans = transacoesParsed.map(t => ({
          ...t,
          importacao_id: imp.id,
          banco: bancoSelecionado
        }));

        const { error: errTrans } = await supabase.from('extrato_transacoes').insert(payloadTrans);
        if (errTrans) throw errTrans;

        setMensagemSucesso(`Arquivo OFX do banco ${bancoSelecionado} importado com sucesso! ${transacoesParsed.length} transações salvas.`);

      } else {
        // --- PROCESSAMENTO MULTI-BANCO DE PLANILHA DE TÍTULOS PAGOS (.XLSX / .CSV) ---
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { cellDates: true });

        // Procura a aba 'import' ou pega a primeira aba da planilha
        const sheetName = workbook.SheetNames.find(s => s.toLowerCase() === 'import') || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rows.length === 0) {
          alert("A planilha selecionada está vazia.");
          setLoading(false);
          return;
        }

        const payloadTitulos = [];

        rows.forEach(r => {
          const findVal = (keys) => {
            const foundKey = Object.keys(r).find(k => 
              keys.includes(k.toLowerCase().replace(/[^a-z0-9]/g, ''))
            );
            return foundKey ? r[foundKey] : '';
          };

          const notaFiscal = findVal(['notafiscal', 'numnota', 'nf']);
          const parcela = findVal(['parcela', 'pr']) || '1';
          const dtVenc = formatarDataIso(findVal(['datavencimento', 'dtvencto', 'vencimento']));
          const fornecedor = findVal(['fornecedor', 'razaosocial']) || 'Fornecedor Não Informado';
          const cnpj = findVal(['cnpj', 'cpfcnpj']);
          const dtPago = formatarDataIso(findVal(['datapagamento', 'dtpago', 'datapago', 'pagamento']));
          const vDesc = parseMoeda(findVal(['valordesconto', 'vldesc']));
          const vJuros = parseMoeda(findVal(['valorjuros', 'vljuro']));
          const vPago = parseMoeda(findVal(['valorpago', 'vlpago', 'valor']));
          const bancoRaw = findVal(['banco', 'nomecxbco', 'bancoorigem']);

          if (fornecedor && vPago > 0) {
            payloadTitulos.push({
              nota_fiscal: String(notaFiscal).trim() || null,
              parcela: String(parcela).trim() || '1',
              data_vencimento: dtVenc,
              fornecedor: String(fornecedor).trim(),
              cnpj: String(cnpj).trim() || null,
              data_pagamento: dtPago,
              valor_desconto: vDesc,
              valor_juros: vJuros,
              valor_pago: vPago,
              banco: normalizarBanco(bancoRaw),
              conciliado: false
            });
          }
        });

        if (payloadTitulos.length === 0) {
          alert("Nenhum registro válido foi encontrado na planilha.");
          setLoading(false);
          return;
        }

        const { data: imp, error: errHist } = await supabase
          .from('importacoes_historico')
          .insert([{
            tipo_arquivo: 'Títulos Pagos',
            banco: 'Multi-Banco',
            periodo_importado: mesAnoFormatado,
            quantidade_registros: payloadTitulos.length,
            nome_arquivo: file.name
          }])
          .select()
          .single();

        if (errHist) throw errHist;

        const payloadFinal = payloadTitulos.map(t => ({
          ...t,
          importacao_id: imp.id
        }));

        const { error: errTit } = await supabase.from('titulos_pagos_importados').insert(payloadFinal);
        if (errTit) throw errTit;

        setMensagemSucesso(`Planilha de Títulos Pagos importada com sucesso! ${payloadTitulos.length} títulos distribuídos entre os bancos.`);
      }

      carregarHistorico();
    } catch (err) {
      alert("Erro na importação: " + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setMensagemSucesso(''), 5000);
      e.target.value = null;
    }
  };

  const handleExcluirImportacao = async (imp) => {
    if (!confirm(`Deseja excluir a importação "${imp.nome_arquivo || imp.tipo_arquivo}" e remover TODOS os seus lançamentos vinculados?`)) {
      return;
    }

    setLoading(true);

    try {
      if (imp.tipo_arquivo === 'OFX') {
        await supabase.from('extrato_transacoes').delete().eq('importacao_id', imp.id);
      } else {
        await supabase.from('titulos_pagos_importados').delete().eq('importacao_id', imp.id);
      }

      const { error } = await supabase.from('importacoes_historico').delete().eq('id', imp.id);
      if (error) throw error;

      setMensagemSucesso("Importação e lançamentos removidos com sucesso!");
      setTimeout(() => setMensagemSucesso(''), 4000);
      carregarHistorico();
    } catch (err) {
      alert("Erro ao excluir importação: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {mensagemSucesso && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
          <CheckCircle size={18} className="text-emerald-600"/> {mensagemSucesso}
        </div>
      )}

      {/* ÁREA DE NOVA IMPORTAÇÃO */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
          <Upload className="text-primary" size={20} /> Nova Importação de Arquivo
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Importação</label>
            <select
              value={tipoImportacao}
              onChange={e => setTipoImportacao(e.target.value)}
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
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
                className="w-full p-2.5 border rounded-lg bg-gray-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Bradesco">Bradesco</option>
                <option value="Santander">Santander</option>
                <option value="Sicoob">Sicoob</option>
                <option value="Tribanco">Tribanco</option>
              </select>
            </div>
          )}

          <div className={`flex items-end ${tipoImportacao === 'TITULOS' ? 'md:col-span-2' : ''}`}>
            <label className="w-full bg-primary hover:bg-blue-900 text-white font-bold py-2.5 px-4 rounded-lg cursor-pointer text-center text-sm shadow flex items-center justify-center gap-2 transition-transform hover:scale-[1.01]">
              {tipoImportacao === 'OFX' ? <FileCode size={18}/> : <FileSpreadsheet size={18}/>}
              {loading ? "Processando..." : "Selecionar Arquivo"}
              <input 
                type="file" 
                accept={tipoImportacao === 'OFX' ? '.ofx,.txt' : '.xlsx,.xls,.csv,.txt'} 
                onChange={handleFileUpload} 
                disabled={loading} 
                className="hidden" 
              />
            </label>
          </div>
        </div>
      </div>

      {/* HISTÓRICO DE IMPORTAÇÕES */}
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
                <th className="p-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {historico.length === 0 ? (
                <tr><td colSpan="7" className="p-6 text-center text-gray-400 italic">Nenhum arquivo importado até o momento.</td></tr>
              ) : (
                historico.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="p-3 font-medium">{new Date(h.data_importacao).toLocaleString('pt-BR')}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${h.tipo_arquivo === 'OFX' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {h.tipo_arquivo}
                      </span>
                    </td>
                    <td className="p-3 font-semibold">{h.banco || '-'}</td>
                    <td className="p-3">{h.periodo_importado}</td>
                    <td className="p-3 font-bold">{h.quantidade_registros}</td>
                    <td className="p-3 text-gray-500 truncate max-w-xs">{h.nome_arquivo || '-'}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleExcluirImportacao(h)}
                        title="Excluir arquivo e lançamentos"
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}