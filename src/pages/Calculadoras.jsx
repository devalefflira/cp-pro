import { useState } from 'react';
import { Calculator, Calendar, Clock, Percent, Copy, Check } from 'lucide-react';
import { add, sub, differenceInDays, differenceInHours, differenceInMinutes, format, parseISO, startOfDay, isSameDay, getDay } from 'date-fns';

export default function Calculadoras() {
  const [abaAtiva, setAbaAtiva] = useState('datas'); // 'datas' ou 'porcentagem'

  return (
    <div className="space-y-6 pb-10">
      <h2 className="text-3xl font-bold text-primary">Calculadoras</h2>

      {/* --- NAVEGAÇÃO ENTRE ABAS --- */}
      <div className="flex gap-4 border-b border-gray-200">
        <button 
          onClick={() => setAbaAtiva('datas')}
          className={`flex items-center gap-2 pb-3 px-4 font-bold transition-colors border-b-4 ${
            abaAtiva === 'datas' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar size={20} /> Datas e Horas
        </button>
        <button 
          onClick={() => setAbaAtiva('porcentagem')}
          className={`flex items-center gap-2 pb-3 px-4 font-bold transition-colors border-b-4 ${
            abaAtiva === 'porcentagem' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Percent size={20} /> Porcentagem
        </button>
      </div>

      {/* --- CONTEÚDO --- */}
      {abaAtiva === 'datas' ? <CalculadoraDatas /> : <CalculadoraPorcentagem />}
    </div>
  );
}

// ==================================================================================
// SUB-COMPONENTE: CALCULADORA DE DATAS
// ==================================================================================
function CalculadoraDatas() {
  // 1. ADICIONAR OU SUBTRAIR
  const [dataRef, setDataRef] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [horaRef, setHoraRef] = useState('00:00');
  const [operacao, setOperacao] = useState('add');
  const [qtds, setQtds] = useState({ anos: 0, meses: 0, semanas: 0, dias: 0, horas: 0, minutos: 0 });
  const [resAddSub, setResAddSub] = useState(null);

  const calcularAddSub = () => {
    if (!dataRef) return;
    const dataBase = new Date(`${dataRef}T${horaRef}`);
    const duration = {
      years: Number(qtds.anos),
      months: Number(qtds.meses),
      weeks: Number(qtds.semanas),
      days: Number(qtds.dias),
      hours: Number(qtds.horas),
      minutes: Number(qtds.minutos),
    };

    const novaData = operacao === 'add' ? add(dataBase, duration) : sub(dataBase, duration);
    setResAddSub(format(novaData, "dd/MM/yyyy 'às' HH:mm"));
  };

  // 2. DIFERENÇA ENTRE DATAS
  const [diffInicio, setDiffInicio] = useState('');
  const [diffFim, setDiffFim] = useState('');
  const [resDiff, setResDiff] = useState(null);

  const calcularDiff = () => {
    if (!diffInicio || !diffFim) return;
    const d1 = new Date(diffInicio);
    const d2 = new Date(diffFim);

    const dias = differenceInDays(d2, d1);
    const horas = differenceInHours(d2, d1);
    const minutos = differenceInMinutes(d2, d1);

    setResDiff({ dias, horas, minutos });
  };

  // 3. DIAS DA SEMANA (Dias Úteis/Específicos)
  const [semInicio, setSemInicio] = useState('');
  const [semFim, setSemFim] = useState('');
  const [diasSelecionados, setDiasSelecionados] = useState([1,2,3,4,5]); // 1=Seg ... 5=Sex
  const [resSemana, setResSemana] = useState(null);

  const diasCheckbox = [
    { id: 1, label: 'Segunda' }, { id: 2, label: 'Terça' }, { id: 3, label: 'Quarta' },
    { id: 4, label: 'Quinta' }, { id: 5, label: 'Sexta' }, { id: 6, label: 'Sábado' }, { id: 0, label: 'Domingo' }
  ];

  const toggleDia = (id) => {
    if (diasSelecionados.includes(id)) setDiasSelecionados(diasSelecionados.filter(d => d !== id));
    else setDiasSelecionados([...diasSelecionados, id]);
  };

  const calcularDiasSemana = () => {
    if (!semInicio || !semFim) return;
    let atual = startOfDay(parseISO(semInicio));
    const fim = startOfDay(parseISO(semFim));
    let count = 0;

    // Loop simples dia a dia
    while (atual <= fim) {
      if (diasSelecionados.includes(getDay(atual))) {
        count++;
      }
      atual = add(atual, { days: 1 });
    }
    setResSemana(count);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      
      {/* CARD 1: ADICIONAR/SUBTRAIR */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">Adicionar ou Subtrair</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm text-gray-500">Data Referência</label>
            <input type="date" className="w-full p-2 border rounded" value={dataRef} onChange={e => setDataRef(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-gray-500">Hora</label>
            <input type="time" className="w-full p-2 border rounded" value={horaRef} onChange={e => setHoraRef(e.target.value)} />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm text-gray-500">Operação</label>
          <select className="w-full p-2 border rounded" value={operacao} onChange={e => setOperacao(e.target.value)}>
            <option value="add">Adicionar (+)</option>
            <option value="sub">Subtrair (-)</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {['Anos', 'Meses', 'Semanas', 'Dias', 'Horas', 'Minutos'].map((label) => (
            <div key={label}>
              <label className="text-xs text-gray-500">{label}</label>
              <input 
                type="number" className="w-full p-2 border rounded" placeholder="0"
                onChange={e => setQtds({...qtds, [label.toLowerCase()]: e.target.value})}
              />
            </div>
          ))}
        </div>

        <button onClick={calcularAddSub} className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 mb-4">Calcular</button>
        
        {resAddSub && (
          <div className="bg-blue-50 p-3 rounded text-center text-blue-800 font-bold border border-blue-200">
            Resultado: {resAddSub}
          </div>
        )}
      </div>

      {/* CARD 2: DIFERENÇA E DIAS DA SEMANA */}
      <div className="space-y-6">
        
        {/* DIFERENÇA */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">Diferença entre Datas</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input type="datetime-local" className="p-2 border rounded" value={diffInicio} onChange={e => setDiffInicio(e.target.value)} />
            <input type="datetime-local" className="p-2 border rounded" value={diffFim} onChange={e => setDiffFim(e.target.value)} />
          </div>
          <button onClick={calcularDiff} className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 mb-4">Calcular</button>
          
          {resDiff && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-100 p-2 rounded">
                <div className="font-bold text-xl text-gray-800">{resDiff.dias}</div>
                <div className="text-xs text-gray-500">Dias</div>
              </div>
              <div className="bg-gray-100 p-2 rounded">
                <div className="font-bold text-xl text-gray-800">{resDiff.horas}</div>
                <div className="text-xs text-gray-500">Horas</div>
              </div>
              <div className="bg-gray-100 p-2 rounded">
                <div className="font-bold text-xl text-gray-800">{resDiff.minutos}</div>
                <div className="text-xs text-gray-500">Minutos</div>
              </div>
            </div>
          )}
        </div>

        {/* DIAS DA SEMANA */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">Dias da semana entre Datas</h3>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {diasCheckbox.map(d => (
              <label key={d.id} className="flex items-center gap-1 text-xs cursor-pointer bg-gray-50 px-2 py-1 rounded border">
                <input 
                  type="checkbox" 
                  checked={diasSelecionados.includes(d.id)} 
                  onChange={() => toggleDia(d.id)}
                />
                {d.label}
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <input type="date" className="p-2 border rounded" value={semInicio} onChange={e => setSemInicio(e.target.value)} />
            <input type="date" className="p-2 border rounded" value={semFim} onChange={e => setSemFim(e.target.value)} />
          </div>
          <button onClick={calcularDiasSemana} className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 mb-4">Calcular</button>

          {resSemana !== null && (
            <div className="bg-green-50 p-3 rounded text-center text-green-800 font-bold border border-green-200">
              Total de dias encontrados: {resSemana}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ==================================================================================
// SUB-COMPONENTE: CALCULADORA DE PORCENTAGEM
// ==================================================================================
function CalculadoraPorcentagem() {

  // Componente de Linha de Cálculo (Para reutilizar o layout da imagem)
  const LinhaCalc = ({ label, inputs, onCalc, result }) => {
    const [vals, setVals] = useState(inputs.reduce((acc, key) => ({...acc, [key]: ''}), {}));
    const [res, setRes] = useState('');
    const [copied, setCopied] = useState(false);

    const handleCalc = () => {
      const v1 = parseFloat(vals[inputs[0]]);
      const v2 = parseFloat(vals[inputs[1]]);
      if (isNaN(v1) || isNaN(v2)) return;
      const r = onCalc(v1, v2);
      setRes(r);
    };

    const handleCopy = () => {
        if(!res) return;
        navigator.clipboard.writeText(res);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">{label}</p>
        <div className="flex flex-col md:flex-row gap-2 items-center">
          <input 
            type="number" placeholder={inputs[0]} 
            className="flex-1 p-2 border rounded w-full"
            onChange={e => { setVals({...vals, [inputs[0]]: e.target.value}); if(e.target.value && vals[inputs[1]]) handleCalc(); }}
            onBlur={handleCalc}
          />
          <span className="text-gray-500 font-bold">{inputs[2]}</span>
          <input 
            type="number" placeholder={inputs[1]} 
            className="flex-1 p-2 border rounded w-full"
            onChange={e => { setVals({...vals, [inputs[1]]: e.target.value}); if(e.target.value && vals[inputs[0]]) handleCalc(); }}
            onBlur={handleCalc}
          />
          <span className="text-gray-500 font-bold">=</span>
          <div className="flex-1 flex gap-2">
            <input type="text" readOnly value={res} className="w-full p-2 border rounded bg-white font-bold text-blue-600" placeholder="Resultado" />
            <button onClick={handleCopy} className="p-2 text-gray-500 hover:text-blue-600" title="Copiar">
                {copied ? <Check size={20} className="text-green-500"/> : <Copy size={20}/>}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      
      {/* 1. X % de Y = Z */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-bold text-gray-700 mb-6 border-b pb-2">x % de y = z</h3>
        
        {/* Encontra Z */}
        <LinhaCalc 
            label="Encontra z (Quanto é X% de Y?):" 
            inputs={['X (Porcentagem)', 'Y (Valor Total)', '% de']} 
            onCalc={(x, y) => ((x / 100) * y).toFixed(2)} 
        />
        {/* Encontra Y */}
        <LinhaCalc 
            label="Encontra y (Z é X% de quanto?):" 
            inputs={['Z (Parte)', 'X (Porcentagem)', 'é % de']} 
            onCalc={(z, x) => ((z / x) * 100).toFixed(2)} 
        />
        {/* Encontra X */}
        <LinhaCalc 
            label="Encontra x (Z é quantos % de Y?):" 
            inputs={['Z (Parte)', 'Y (Total)', 'é % de']} 
            onCalc={(z, y) => ((z / y) * 100).toFixed(2)} 
        />
      </div>

      {/* 2. PORCENTAGEM DE AUMENTO */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-bold text-gray-700 mb-6 border-b pb-2">Porcentagem de Aumento</h3>
        
        <LinhaCalc 
            label="Encontra a % de aumento:" 
            inputs={['Valor Inicial', 'Valor Final', 'para']} 
            onCalc={(ini, fim) => (((fim - ini) / ini) * 100).toFixed(2) + '%'} 
        />
        <LinhaCalc 
            label="Encontra valor final (com X% de aumento):" 
            inputs={['Valor Inicial', '% Aumento', '+ %']} 
            onCalc={(ini, porc) => (ini + (ini * (porc/100))).toFixed(2)} 
        />
         <LinhaCalc 
            label="Encontra valor inicial (sabendo final e %):" 
            inputs={['Valor Final', '% Aumento', 'com %']} 
            onCalc={(fim, porc) => (fim / (1 + (porc/100))).toFixed(2)} 
        />
      </div>

      {/* 3. PORCENTAGEM DE REDUÇÃO */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-bold text-gray-700 mb-6 border-b pb-2">Porcentagem de Redução</h3>
        
        <LinhaCalc 
            label="Encontra a % de redução:" 
            inputs={['Valor Inicial', 'Valor Final', 'para']} 
            onCalc={(ini, fim) => (((ini - fim) / ini) * 100).toFixed(2) + '%'} 
        />
        <LinhaCalc 
            label="Encontra valor final (com X% de desconto):" 
            inputs={['Valor Inicial', '% Desconto', '- %']} 
            onCalc={(ini, porc) => (ini - (ini * (porc/100))).toFixed(2)} 
        />
         <LinhaCalc 
            label="Encontra valor inicial (sabendo final e % desconto):" 
            inputs={['Valor Final', '% Desconto', 'com %']} 
            onCalc={(fim, porc) => (fim / (1 - (porc/100))).toFixed(2)} 
        />
      </div>

    </div>
  );
}