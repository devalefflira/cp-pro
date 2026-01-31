import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import jsPDF from 'jspdf';
import { FileDown, ArrowLeft } from 'lucide-react';

export default function EtiquetasPrint() {
  const [searchParams] = useSearchParams();
  const dataSelecionada = searchParams.get('data');
  const [etiquetas, setEtiquetas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formatação
  const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (d) => d ? d.split('-').reverse().join('/') : '-';

  useEffect(() => {
    if (dataSelecionada) buscarDados();
  }, [dataSelecionada]);

  const buscarDados = async () => {
    setLoading(true);
    
    // 1. Busca os lançamentos (incluindo a Razão agora)
    const { data, error } = await supabase
      .from('lancamentos')
      .select(`*, fornecedores(nome), tipos_documento(descricao), bancos(nome), razoes(nome)`)
      .eq('data_vencimento', dataSelecionada);

    if (error) {
      alert('Erro ao buscar dados: ' + error.message);
      setLoading(false);
      return;
    }

    // 2. Agrupamento (Data + Razão + Tipo)
    const grupos = {};

    data.forEach((item) => {
      // Chave única para o grupo
      const razaoNome = item.razoes?.nome || 'Sem Razão';
      const tipoDesc = item.tipos_documento?.descricao || 'Outros';
      const dataVenc = item.data_vencimento;
      
      const key = `${dataVenc}-${razaoNome}-${tipoDesc}`;

      if (!grupos[key]) {
        grupos[key] = {
          id: key,
          data_vencimento: dataVenc,
          razao: razaoNome,
          tipo: tipoDesc,
          valorTotal: 0,
          quantidade: 0
        };
      }

      // Soma os valores
      grupos[key].valorTotal += Number(item.valor);
      grupos[key].quantidade += 1;
    });

    // Converte o objeto de grupos em array para exibição
    const listaFinal = Object.values(grupos).sort((a, b) => {
        // Ordena por Razão alfabeticamente
        return a.razao.localeCompare(b.razao);
    });

    setEtiquetas(listaFinal);
    setLoading(false);
  };

  // --- GERAÇÃO DO PDF (LAYOUT DE ETIQUETAS) ---
  const gerarPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4'); // Retrato, milímetros, A4
    
    // Configurações da Etiqueta (Modelo A4 Padrão 3 colunas - Pimaco 6180 ou similar)
    const marginX = 7;
    const marginY = 12;
    const labelW = 63.5; // Largura etiqueta
    const labelH = 33.9; // Altura etiqueta
    const gapX = 2.5;    // Espaço horizontal
    const gapY = 0;      // Espaço vertical
    
    let col = 0;
    let row = 0;

    etiquetas.forEach((grupo) => {
        // Se encheu a página (3 colunas x 8 linhas = 24 etiquetas), nova página
        if (row >= 8) {
            doc.addPage();
            col = 0;
            row = 0;
        }

        const x = marginX + (col * (labelW + gapX));
        const y = marginY + (row * (labelH + gapY));

        // Desenha a borda (opcional, ajuda no corte)
        doc.setDrawColor(220); 
        doc.rect(x, y, labelW, labelH);

        // --- CONTEÚDO DA ETIQUETA ---
        
        // 1. RAZÃO (Destaque Principal)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(0);
        // Corta se for muito longo
        const razaoTexto = grupo.razao.length > 25 ? grupo.razao.substring(0, 25) + '...' : grupo.razao;
        doc.text(razaoTexto, x + labelW / 2, y + 8, { align: 'center' });

        // Linha divisória
        doc.setDrawColor(0);
        doc.setLineWidth(0.2);
        doc.line(x + 5, y + 10, x + labelW - 5, y + 10);

        // 2. TIPO
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(grupo.tipo, x + labelW / 2, y + 15, { align: 'center' });

        // 3. DATA VENCIMENTO
        doc.setFontSize(8);
        doc.text(`Venc: ${formatDate(grupo.data_vencimento)}`, x + labelW / 2, y + 20, { align: 'center' });

        // 4. VALOR TOTAL (Grande destaque)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(formatMoney(grupo.valorTotal), x + labelW / 2, y + 28, { align: 'center' });

        // Contadorzinho discreto (ex: "3 itens")
        doc.setFontSize(6);
        doc.setTextColor(100);
        doc.text(`(${grupo.quantidade} docs)`, x + labelW - 2, y + 32, { align: 'right' });


        // Controle de Coluna/Linha
        col++;
        if (col >= 3) {
            col = 0;
            row++;
        }
    });

    doc.save(`Etiquetas_Agrupadas_${dataSelecionada}.pdf`);
  };

  if (!dataSelecionada) return <div className="p-10 text-center">Data não informada.</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* HEADER FIXO */}
      <div className="max-w-6xl mx-auto bg-white p-4 rounded-lg shadow-md mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
         <div className="flex items-center gap-4">
             <h1 className="text-2xl font-bold text-primary">Etiquetas Agrupadas</h1>
             <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold border border-blue-200">
                {formatDate(dataSelecionada)}
             </span>
             <span className="text-gray-500 text-sm">
                ({etiquetas.length} grupos gerados)
             </span>
         </div>
         <div className="flex gap-4">
             <button onClick={() => window.close()} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded flex items-center gap-2">
                <ArrowLeft size={20}/> Fechar
             </button>
             <button onClick={gerarPDF} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-bold shadow flex items-center gap-2">
                <FileDown size={20}/> Exportar PDF
             </button>
         </div>
      </div>

      {/* ÁREA DE VISUALIZAÇÃO */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-2xl p-[10mm] min-h-[297mm]">
          {loading ? (
             <div className="text-center py-20 text-gray-500">Calculando agrupamentos...</div>
          ) : etiquetas.length === 0 ? (
             <div className="text-center py-20 text-gray-400">Nenhum lançamento encontrado para esta data.</div>
          ) : (
            <div className="grid grid-cols-3 gap-x-[2.5mm] gap-y-[0mm]">
                {etiquetas.map((grupo) => (
                    <div key={grupo.id} className="border border-gray-300 w-[63.5mm] h-[33.9mm] p-2 relative flex flex-col items-center justify-center bg-white hover:bg-blue-50 transition-colors text-center">
                        
                        {/* Razão */}
                        <div className="font-bold text-gray-900 text-sm w-full truncate border-b border-gray-200 pb-1 mb-1 px-2">
                            {grupo.razao}
                        </div>

                        {/* Tipo */}
                        <div className="text-xs text-gray-600 mb-1">
                            {grupo.tipo}
                        </div>

                        {/* Data */}
                        <div className="text-[10px] text-gray-500 mb-1">
                            Venc: {formatDate(grupo.data_vencimento)}
                        </div>

                        {/* Valor Total */}
                        <div className="font-bold text-lg text-black">
                            {formatMoney(grupo.valorTotal)}
                        </div>

                        {/* Qtd Docs */}
                        <div className="absolute bottom-1 right-2 text-[8px] text-gray-400">
                            {grupo.quantidade} docs
                        </div>
                    </div>
                ))}
            </div>
          )}
      </div>
    </div>
  );
}