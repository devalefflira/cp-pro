import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Banknote, Printer, RotateCcw, User, Clock, FileCheck } from 'lucide-react';

export default function RetiradasTab() {
  const [responsavelNome, setResponsavelNome] = useState('');
  const [dataHoraAtual, setDataHoraAtual] = useState('');
  const [valor, setValor] = useState('');
  const [referente, setReferente] = useState('Movimento');
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    carregarUsuarioLogado();
    atualizarRelogio();
    const timer = setInterval(atualizarRelogio, 1000);
    return () => clearInterval(timer);
  }, []);

  const carregarUsuarioLogado = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome, email')
        .eq('id', session.user.id)
        .single();
      setResponsavelNome(profile?.nome || session.user.email);
    }
  };

  const atualizarRelogio = () => {
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR');
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setDataHoraAtual(`${dataFormatada}, ${horaFormatada}`);
  };

  const aplicarMascaraMoeda = (valorRaw) => {
    let raw = String(valorRaw).replace(/\D/g, '');
    if (!raw) return '';
    return (Number(raw) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handleImprimirCupom = (e) => {
    e.preventDefault();
    if (!valor || valor === '0,00') {
      return alert("Informe um valor válido para a retirada.");
    }
    window.print();
  };

  const handleLimpar = () => {
    setValor('');
    setReferente('Movimento');
    setObservacao('');
  };

  return (
    <div className="space-y-6">
      
      {/* ESTILOS ESPECÍFICOS PARA IMPRESSÃO TÉRMICA (ELGIN i9 / 80mm) */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0mm;
          }
          body * {
            visibility: hidden;
          }
          #cupom-elgin, #cupom-elgin * {
            visibility: visible;
          }
          #cupom-elgin {
            position: absolute;
            left: 0;
            top: 0;
            width: 72mm;
            padding: 3mm 4mm;
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            color: #000;
            background: #fff;
            line-height: 1.3;
          }
        }
      `}</style>

      {/* PAINEL PRINCIPAL EM TELA (NÃO IMPRIME) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
        
        {/* FORMULÁRIO DE ENTRADA */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border shadow-sm space-y-6">
          <div className="border-b pb-3">
            <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
              <Banknote className="text-emerald-600" size={20} /> Emissão de Comprovante de Retirada (Espécie)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Gere e imprima recibos térmicos instantâneos para sangrias e retiradas em dinheiro.
            </p>
          </div>

          <form onSubmit={handleImprimirCupom} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <User size={13} className="text-gray-400" /> Usuário Responsável
                </label>
                <input
                  type="text"
                  disabled
                  value={responsavelNome}
                  className="w-full p-2.5 border rounded-lg bg-gray-100 font-bold text-gray-800"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <Clock size={13} className="text-gray-400" /> Data / Hora
                </label>
                <input
                  type="text"
                  disabled
                  value={dataHoraAtual}
                  className="w-full p-2.5 border rounded-lg bg-gray-100 font-semibold text-gray-600"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Valor da Retirada (R$) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="0,00"
                  value={valor}
                  onChange={e => setValor(aplicarMascaraMoeda(e.target.value))}
                  className="w-full p-2.5 border-2 border-emerald-300 focus:border-emerald-600 rounded-lg bg-emerald-50/40 font-black text-gray-900 text-base outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Referente a *</label>
                <select
                  value={referente}
                  onChange={e => setReferente(e.target.value)}
                  className="w-full p-2.5 border rounded-lg bg-white font-bold text-gray-800"
                >
                  <option value="Movimento">Movimento</option>
                  <option value="AtualCard">AtualCard</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Tipo de Pagamento</label>
                <input
                  type="text"
                  disabled
                  value="Dinheiro (Espécie)"
                  className="w-full p-2.5 border rounded-lg bg-gray-100 font-bold text-emerald-800"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Observação / Motivo</label>
                <input
                  type="text"
                  placeholder="Ex: Pagamento avulso / Sangria"
                  value={observacao}
                  onChange={e => setObservacao(e.target.value)}
                  className="w-full p-2.5 border rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleLimpar}
                className="px-5 py-2.5 border rounded-lg text-gray-600 font-semibold hover:bg-gray-50 flex items-center gap-1.5"
              >
                <RotateCcw size={14} /> Limpar
              </button>

              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-7 rounded-lg shadow flex items-center gap-2"
              >
                <Printer size={16} /> Imprimir Cupom Elgin i9
              </button>
            </div>
          </form>
        </div>

        {/* PRÉVIA VISUAL DO RECIBO TÉRMICO */}
        <div className="lg:col-span-5 bg-gray-100 p-6 rounded-xl border border-gray-200 flex flex-col items-center justify-center">
          <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
            <FileCheck size={14} /> Pré-visualização do Cupom (80mm)
          </span>

          <div className="w-[280px] bg-white p-5 shadow-md border border-dashed border-gray-300 font-mono text-[11px] text-gray-900 leading-tight space-y-2 select-none">
            <div className="text-center border-b border-dashed border-gray-400 pb-2">
              <p className="font-bold text-sm">CP PRO</p>
              <p className="text-[10px] text-gray-600">COMPROVANTE DE RETIRADA</p>
              <p className="text-[9px] text-gray-400 mt-0.5">CONTROLE INTERNO DE CAIXA</p>
            </div>

            <div className="space-y-1 py-1 text-[10px]">
              <div className="flex justify-between">
                <span>DATA/HORA:</span>
                <span className="font-bold">{dataHoraAtual}</span>
              </div>
              <div className="flex justify-between">
                <span>OPERADOR:</span>
                <span className="font-bold truncate max-w-[150px]">{responsavelNome || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span>REFERENTE:</span>
                <span className="font-bold">{referente}</span>
              </div>
              <div className="flex justify-between">
                <span>TIPO:</span>
                <span className="font-bold">DINHEIRO</span>
              </div>
              {observacao && (
                <div className="border-t border-dashed border-gray-200 pt-1">
                  <span>OBS: {observacao}</span>
                </div>
              )}
            </div>

            <div className="border-t-2 border-b-2 border-dashed border-gray-800 py-2 my-2 text-center">
              <span className="text-[10px] uppercase font-bold block text-gray-600">VALOR RETIRADO</span>
              <p className="text-lg font-black text-gray-900">R$ {valor || '0,00'}</p>
            </div>

            <div className="pt-6 text-center space-y-1">
              <div className="border-t border-gray-400 w-44 mx-auto"></div>
              <p className="text-[9px] uppercase font-bold">Assinatura do Recebedor</p>
              <p className="text-[8px] text-gray-400">VIA DE CONTROLE DA TESOURARIA</p>
            </div>
          </div>
        </div>

      </div>

      {/* ELEMENTO RENDERIZADO EXCLUSIVAMENTE NA IMPRESSÃO TÉRMICA */}
      <div id="cupom-elgin" className="hidden print:block">
        <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '4px', marginBottom: '6px' }}>
          <strong style={{ fontSize: '13px', display: 'block' }}>CP PRO</strong>
          <span style={{ fontSize: '10px' }}>COMPROVANTE DE RETIRADA</span><br />
          <span style={{ fontSize: '9px' }}>CONTROLE INTERNO DE CAIXA</span>
        </div>

        <div style={{ fontSize: '10px', marginBottom: '6px' }}>
          <div>DATA/HORA: <strong>{dataHoraAtual}</strong></div>
          <div>OPERADOR: <strong>{responsavelNome || '-'}</strong></div>
          <div>REFERENTE: <strong>{referente}</strong></div>
          <div>TIPO: <strong>DINHEIRO (ESPÉCIE)</strong></div>
          {observacao && <div>OBS: {observacao}</div>}
        </div>

        <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '6px 0', margin: '6px 0', textAlign: 'center' }}>
          <div style={{ fontSize: '9px', textTransform: 'uppercase' }}>VALOR TOTAL RETIRADO</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>R$ {valor || '0,00'}</div>
        </div>

        <div style={{ marginTop: '22px', textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #000', width: '80%', margin: '0 auto 4px auto' }}></div>
          <div style={{ fontSize: '9px', fontWeight: 'bold' }}>ASSINATURA DO RECEBEDOR</div>
          <div style={{ fontSize: '8px', color: '#555' }}>VIA DE CONTROLE DA TESOURARIA</div>
        </div>
      </div>

    </div>
  );
}