import { Check, Crown, Zap, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Planos() {
  const navigate = useNavigate();
  
  const CardPlano = ({ nome, preco, icone: Icone, features, destaque = false }) => (
    <div className={`bg-white rounded-2xl shadow-xl flex flex-col p-8 transition-transform hover:scale-105 relative ${destaque ? 'border-4 border-blue-600 scale-105 z-10' : 'border border-gray-100'}`}>
      {destaque && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-sm font-bold px-4 py-1 rounded-full shadow-lg">
          MAIS POPULAR
        </div>
      )}
      
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto ${destaque ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
        <Icone size={32} />
      </div>

      <h3 className="text-2xl font-bold text-center text-gray-800 mb-2">{nome}</h3>
      <div className="text-center mb-6">
        <span className="text-4xl font-extrabold text-gray-900">R$ {preco}</span>
        <span className="text-gray-500">/mês</span>
        <p className="text-xs text-gray-400 mt-1">Cartão, Boleto ou PIX</p>
      </div>

      <div className="border-t border-gray-100 my-6"></div>

      <ul className="space-y-4 mb-8 flex-1">
        {features.map((item, idx) => (
          <li key={idx} className="flex items-start gap-3 text-sm text-gray-700">
            <Check size={18} className="text-green-500 mt-0.5 shrink-0" />
            <span className="leading-tight">{item}</span>
          </li>
        ))}
      </ul>

      <button className={`w-full py-4 rounded-xl font-bold transition-colors shadow-lg ${destaque ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-800 hover:bg-gray-900 text-white'}`}>
        Assinar {nome}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-8 font-semibold transition-colors">
        <ArrowLeft size={20} /> Voltar
      </button>

      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-4xl font-bold text-primary mb-4">Escolha o plano ideal para o seu negócio</h2>
        <p className="text-xl text-gray-600">Potencialize sua gestão financeira com nossos recursos premium e suporte especializado.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto items-start">
        
        {/* PLANO START */}
        <CardPlano 
          nome="Start" 
          preco="397,00" 
          icone={Zap}
          features={[
            "Suporte WhatsApp (seg-sáb, 08h-20h)",
            "Correção de bugs inclusa",
            "Atualização de Relatórios: 3 por mês",
            "Atualização de Telas: 3 por mês",
            "Criação de novos relatórios: 1 por mês",
            "Criação de novas funcionalidades: 1 por mês",
            "Até 1.000 lançamentos/mês",
            "Excedente: R$ 0,05 por lançamento"
          ]}
        />

        {/* PLANO BOOST */}
        <CardPlano 
          nome="Boost" 
          preco="497,00" 
          destaque={true}
          icone={Crown}
          features={[
            "Suporte WhatsApp (seg-sáb, 08h-20h)",
            "Correção de bugs prioritária",
            "Atualização de Relatórios: 6 por mês",
            "Atualização de Telas: 6 por mês",
            "Criação de novos relatórios: 2 por mês",
            "Criação de novas funcionalidades: 2 por mês",
            "Até 2.000 lançamentos/mês",
            "Excedente: R$ 0,03 por lançamento"
          ]}
        />

      </div>
    </div>
  );
}