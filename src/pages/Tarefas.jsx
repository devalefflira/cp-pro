import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Plus, Trash2, CheckSquare, Square, Calendar, Flag, X, Save } from 'lucide-react';
import { addDays, format, isSameDay, isWithinInterval, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Tarefas() {
  const [tarefas, setTarefas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  
  // Filtro de Data
  const [filtroPeriodo, setFiltroPeriodo] = useState('hoje'); // Padrão: Hoje

  // Estado do Formulário
  const formInicial = { nome: '', descricao: '', data: '', prioridade: 'Média' };
  const [novaTarefa, setNovaTarefa] = useState(formInicial);

  // --- CARREGAR TAREFAS ---
  useEffect(() => {
    buscarTarefas();
  }, []);

  const buscarTarefas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tarefas')
      .select('*')
      .order('data', { ascending: true }); // Ordena por data de vencimento

    if (error) alert('Erro ao buscar tarefas');
    else setTarefas(data || []);
    setLoading(false);
  };

  // --- LÓGICA DE FILTRAGEM ---
  const filtrarTarefasPorPeriodo = (lista) => {
    const hoje = startOfDay(new Date());
    
    return lista.filter(t => {
      const dataTarefa = parseISO(t.data);
      // Ajuste de fuso horário simples para comparação de dia
      const dataTarefaAjustada = startOfDay(new Date(dataTarefa.valueOf() + dataTarefa.getTimezoneOffset() * 60000));

      switch (filtroPeriodo) {
        case 'hoje': return isSameDay(dataTarefaAjustada, hoje);
        case 'amanha': return isSameDay(dataTarefaAjustada, addDays(hoje, 1));
        case '3dias': return isWithinInterval(dataTarefaAjustada, { start: hoje, end: addDays(hoje, 3) });
        case '7dias': return isWithinInterval(dataTarefaAjustada, { start: hoje, end: addDays(hoje, 7) });
        case '15dias': return isWithinInterval(dataTarefaAjustada, { start: hoje, end: addDays(hoje, 15) });
        case '30dias': return isWithinInterval(dataTarefaAjustada, { start: hoje, end: addDays(hoje, 30) });
        case '60dias': return isWithinInterval(dataTarefaAjustada, { start: hoje, end: addDays(hoje, 60) });
        case '90dias': return isWithinInterval(dataTarefaAjustada, { start: hoje, end: addDays(hoje, 90) });
        default: return true;
      }
    });
  };

  const tarefasFiltradas = filtrarTarefasPorPeriodo(tarefas);
  const pendentes = tarefasFiltradas.filter(t => !t.concluida);
  const concluidas = tarefasFiltradas.filter(t => t.concluida);

  // --- AÇÕES ---
  const handleSalvar = async () => {
    if (!novaTarefa.nome || !novaTarefa.data) return alert("Preencha nome e data!");
    
    const { error } = await supabase.from('tarefas').insert([novaTarefa]);
    
    if (error) alert('Erro ao salvar: ' + error.message);
    else {
      setModalAberto(false);
      setNovaTarefa(formInicial);
      buscarTarefas();
    }
  };

  const toggleConcluida = async (tarefa) => {
    const { error } = await supabase
      .from('tarefas')
      .update({ concluida: !tarefa.concluida })
      .eq('id', tarefa.id);

    if (!error) buscarTarefas();
  };

  const excluirTarefa = async (id) => {
    if(!confirm("Excluir tarefa?")) return;
    const { error } = await supabase.from('tarefas').delete().eq('id', id);
    if (!error) buscarTarefas();
  };

  // --- HELPERS VISUAIS ---
  const getCorPrioridade = (p) => {
    switch(p) {
      case 'Urgente': return 'bg-red-500 text-white';
      case 'Alta': return 'bg-orange-500 text-white';
      case 'Média': return 'bg-yellow-400 text-gray-800';
      case 'Baixa': return 'bg-[#4ECDC4] text-white'; // Cyan/Teal da imagem
      default: return 'bg-gray-400 text-white';
    }
  };

  const formatarData = (d) => format(parseISO(d), 'dd/MM/yyyy');

  return (
    <div className="space-y-6">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-4xl font-bold text-[#0f3460]">Tarefas</h2>
        <button 
          onClick={() => setModalAberto(true)}
          className="bg-[#40bbf4] hover:bg-[#35aadd] text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
        >
           Adicionar Tarefa
        </button>
      </div>

      {/* FILTROS DE PERÍODO */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'hoje', label: 'Hoje' },
          { id: 'amanha', label: 'Amanhã' },
          { id: '3dias', label: 'Próx. 3 dias' },
          { id: '7dias', label: 'Próx. 7 dias' },
          { id: '15dias', label: 'Próx. 15 dias' },
          { id: '30dias', label: 'Próx. 30 dias' },
          { id: '60dias', label: 'Próx. 60 dias' },
          { id: '90dias', label: 'Próx. 90 dias' },
        ].map(btn => (
          <button
            key={btn.id}
            onClick={() => setFiltroPeriodo(btn.id)}
            className={`px-4 py-2 rounded-full font-bold text-sm transition-colors ${
              filtroPeriodo === btn.id 
              ? 'bg-[#6b7280] text-white' 
              : 'bg-[#8d8d8d] text-white hover:bg-gray-500'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* --- LISTA DE TAREFAS --- */}
      <div className="bg-white rounded-3xl p-6 shadow-sm min-h-[400px]">
        
        {/* CABEÇALHO DA TABELA (ESTILO VISUAL) */}
        <div className="grid grid-cols-12 bg-[#002B5B] text-white p-4 rounded-t-lg font-bold text-lg mb-4">
            <div className="col-span-4 pl-12">Tarefa</div>
            <div className="col-span-4">Descrição</div>
            <div className="col-span-2 text-center">Data</div>
            <div className="col-span-2 text-center">Prioridade</div>
        </div>

        {/* PENDENTES */}
        <h3 className="text-xl font-bold text-gray-400 mb-4 ml-2">Pendentes</h3>
        <div className="space-y-3 mb-8">
            {pendentes.length === 0 && <p className="text-gray-400 italic ml-4">Nenhuma tarefa pendente neste período.</p>}
            {pendentes.map(t => (
                <div key={t.id} className="grid grid-cols-12 items-center p-2 hover:bg-gray-50 rounded-lg group">
                    <div className="col-span-4 flex items-center gap-3">
                        <button onClick={() => toggleConcluida(t)} className="text-gray-400 hover:text-green-500">
                            <Square size={28} />
                        </button>
                        <span className="font-bold text-gray-800 text-lg">{t.nome}</span>
                    </div>
                    <div className="col-span-4 text-gray-600 font-medium truncate pr-4" title={t.descricao}>
                        {t.descricao}
                    </div>
                    <div className="col-span-2 text-center font-bold text-gray-800">
                        {formatarData(t.data)}
                    </div>
                    <div className="col-span-2 flex justify-center items-center gap-2">
                        <span className={`px-4 py-1 rounded-full text-sm font-bold shadow-sm ${getCorPrioridade(t.prioridade)}`}>
                            {t.prioridade}
                        </span>
                        <button onClick={() => excluirTarefa(t.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>
            ))}
        </div>

        {/* CONCLUÍDAS */}
        {concluidas.length > 0 && (
            <>
                <h3 className="text-xl font-bold text-gray-400 mb-4 ml-2 border-t pt-4">Concluídas</h3>
                <div className="space-y-3">
                    {concluidas.map(t => (
                        <div key={t.id} className="grid grid-cols-12 items-center p-2 hover:bg-gray-50 rounded-lg group opacity-60">
                            <div className="col-span-4 flex items-center gap-3">
                                <button onClick={() => toggleConcluida(t)} className="text-gray-500">
                                    <CheckSquare size={28} />
                                </button>
                                <span className="font-bold text-gray-800 text-lg line-through decoration-2 decoration-gray-800">{t.nome}</span>
                            </div>
                            <div className="col-span-4 text-gray-500 font-medium truncate line-through decoration-2 pr-4">
                                {t.descricao}
                            </div>
                            <div className="col-span-2 text-center font-bold text-gray-500 line-through decoration-2">
                                {formatarData(t.data)}
                            </div>
                            <div className="col-span-2 flex justify-center items-center gap-2">
                                <span className={`px-4 py-1 rounded-full text-sm font-bold shadow-sm opacity-70 ${getCorPrioridade(t.prioridade)}`}>
                                    {t.prioridade}
                                </span>
                                <button onClick={() => excluirTarefa(t.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        )}
      </div>

      {/* --- MODAL ADICIONAR TAREFA --- */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-[#D0E8F2] p-8 rounded-3xl shadow-2xl w-full max-w-2xl border-4 border-white relative">
                
                <h3 className="text-3xl font-bold text-[#002B5B] mb-8">Nova Tarefa</h3>

                <div className="space-y-6">
                    {/* Nome */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <label className="text-[#002B5B] font-bold text-xl text-right">Nome da Tarefa</label>
                        <div className="col-span-3">
                            <input 
                                type="text" 
                                className="w-full p-3 rounded-lg border-none shadow-sm text-lg outline-none"
                                value={novaTarefa.nome}
                                onChange={e => setNovaTarefa({...novaTarefa, nome: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* Descrição */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <label className="text-[#002B5B] font-bold text-xl text-right">Descrição da tarefa</label>
                        <div className="col-span-3">
                            <input 
                                type="text" 
                                className="w-full p-3 rounded-lg border-none shadow-sm text-lg outline-none"
                                value={novaTarefa.descricao}
                                onChange={e => setNovaTarefa({...novaTarefa, descricao: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* Data */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <label className="text-[#002B5B] font-bold text-xl text-right">Data</label>
                        <div className="col-span-3">
                            <input 
                                type="date" 
                                className="w-1/2 p-3 rounded-lg border-none shadow-sm text-lg outline-none text-gray-600"
                                value={novaTarefa.data}
                                onChange={e => setNovaTarefa({...novaTarefa, data: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* Prioridade (Botões) */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <label className="text-[#002B5B] font-bold text-xl text-right">Prioridade</label>
                        <div className="col-span-3 flex gap-3">
                            {['Urgente', 'Alta', 'Média', 'Baixa'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setNovaTarefa({...novaTarefa, prioridade: p})}
                                    className={`px-6 py-2 rounded-full font-bold text-white transition-transform hover:scale-105 ${
                                        novaTarefa.prioridade === p ? 'ring-4 ring-white shadow-lg scale-105' : 'opacity-70 hover:opacity-100'
                                    } ${getCorPrioridade(p)}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Botões do Modal */}
                <div className="flex justify-center gap-6 mt-10">
                    <button 
                        onClick={() => setModalAberto(false)}
                        className="bg-[#FF6B6B] hover:bg-red-500 text-white font-bold py-3 px-12 rounded-full shadow-lg text-lg"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSalvar}
                        className="bg-[#40bbf4] hover:bg-[#35aadd] text-white font-bold py-3 px-12 rounded-full shadow-lg text-lg"
                    >
                        Salvar
                    </button>
                </div>

            </div>
        </div>
      )}

    </div>
  );
}