import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Plus, FolderTree, Folder, FileText, X } from 'lucide-react';

export default function EstruturaTab() {
  const [loading, setLoading] = useState(false);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [contas, setContas] = useState([]);

  const [modalCC, setModalCC] = useState(false);
  const [novoCC, setNovoCC] = useState({ codigo: '', sigla: '', descricao: '' });

  const [modalGrupo, setModalGrupo] = useState(false);
  const [novoGrupo, setNovoGrupo] = useState({ codigo: '', descricao: '', centro_custo_id: '' });

  const [modalConta, setModalConta] = useState(false);
  const [novaConta, setNovaConta] = useState({ codigo: '', descricao: '', grupo_id: '' });

  useEffect(() => {
    carregarEstrutura();
  }, []);

  const carregarEstrutura = async () => {
    const [resCC, resG, resC] = await Promise.all([
      supabase.from('centros_custo').select('*').order('codigo'),
      supabase.from('grupos_despesa').select('*').order('codigo'),
      supabase.from('contas_despesa').select('*').order('codigo')
    ]);
    setCentrosCusto(resCC.data || []); setGrupos(resG.data || []); setContas(resC.data || []);
  };

  const alertError = (context, err) => {
    console.error(err);
    alert(`Erro ao salvar ${context}:\n${err.message || 'Erro desconhecido. Verifique as permissões do banco (RLS).'}`);
  };

  const handleSalvarCC = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.from('centros_custo').insert([novoCC]).select();
    setLoading(false);
    if (error) alertError("Centro de Custo", error);
    else if (data) {
      setCentrosCusto([...centrosCusto, data[0]].sort((a,b)=>a.codigo.localeCompare(b.codigo)));
      setModalCC(false); setNovoCC({codigo:'',sigla:'',descricao:''});
    }
  };

  const handleSalvarGrupo = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.from('grupos_despesa').insert([novoGrupo]).select();
    setLoading(false);
    if (error) alertError("Grupo", error);
    else if (data) {
      setGrupos([...grupos, data[0]].sort((a,b)=>a.codigo.localeCompare(b.codigo)));
      setModalGrupo(false); setNovoGrupo({codigo:'',descricao:'',centro_custo_id:''});
    }
  };

  const handleSalvarConta = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.from('contas_despesa').insert([novaConta]).select();
    setLoading(false);
    if (error) alertError("Conta", error);
    else if (data) {
      setContas([...contas, data[0]].sort((a,b)=>a.codigo.localeCompare(b.codigo)));
      setModalConta(false); setNovaConta({codigo:'',descricao:'',grupo_id:''});
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200">
      <div className="flex flex-col md:flex-row justify-between items-center border-b pb-4 mb-6 gap-4">
        <h3 className="text-xl font-bold text-gray-800">Hierarquia de Despesas</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setModalCC(true)} className="bg-primary hover:bg-blue-800 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2"><Plus size={16}/> Centro de Custo</button>
          <button onClick={() => setModalGrupo(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2"><Plus size={16}/> Grupo</button>
          <button onClick={() => setModalConta(true)} className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2"><Plus size={16}/> Conta</button>
        </div>
      </div>

      <div className="space-y-4">
        {centrosCusto.length === 0 ? <p className="text-gray-500 text-center py-10">Nenhuma estrutura cadastrada ainda.</p> : 
          centrosCusto.map(cc => (
            <div key={cc.id} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-4 border-b flex items-center gap-2">
                <FolderTree className="text-primary" size={20} />
                <span className="font-bold text-gray-800 text-lg">{cc.codigo} - {cc.descricao}</span>
                <span className="bg-white border text-xs font-bold px-2 py-0.5 rounded text-gray-500 ml-2">{cc.sigla}</span>
              </div>
              <div className="p-4 space-y-4">
                {grupos.filter(g => g.centro_custo_id === cc.id).map(g => (
                  <div key={g.id} className="ml-4 border-l-2 border-indigo-100 pl-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Folder className="text-indigo-500" size={16} />
                      <span className="font-bold text-gray-700">{g.codigo} - {g.descricao}</span>
                    </div>
                    <div className="ml-5 space-y-2 mt-1">
                      {contas.filter(c => c.grupo_id === g.id).map(c => (
                        <div key={c.id} className="flex items-center gap-2 text-sm text-gray-600 bg-slate-50 p-2 rounded border w-fit">
                          <FileText className="text-slate-400" size={14} />
                          <span>{c.codigo} - {c.descricao}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        }
      </div>

      {/* MODAL CC */}
      {modalCC && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <form onSubmit={handleSalvarCC} className="bg-white p-6 rounded-xl w-full max-w-md relative">
            <button type="button" onClick={() => setModalCC(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500"><X size={24} /></button>
            <h3 className="text-xl font-bold text-primary mb-4">Novo Centro de Custo</h3>
            <div className="space-y-4">
              <input required type="text" placeholder="Código (Ex: 1.0.00) *" className="w-full p-2 border rounded" value={novoCC.codigo} onChange={e=>setNovoCC({...novoCC, codigo: e.target.value})} />
              <input required type="text" placeholder="Sigla (Ex: CC1000) *" className="w-full p-2 border rounded uppercase" value={novoCC.sigla} onChange={e=>setNovoCC({...novoCC, sigla: e.target.value.toUpperCase()})} />
              <input required type="text" placeholder="Descrição *" className="w-full p-2 border rounded" value={novoCC.descricao} onChange={e=>setNovoCC({...novoCC, descricao: e.target.value})} />
            </div>
            <button type="submit" disabled={loading} className="mt-6 w-full py-2 bg-primary text-white rounded font-bold">Salvar</button>
          </form>
        </div>
      )}

      {/* MODAL GRUPO */}
      {modalGrupo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <form onSubmit={handleSalvarGrupo} className="bg-white p-6 rounded-xl w-full max-w-md relative">
            <button type="button" onClick={() => setModalGrupo(false)} className="absolute top-4 right-4 text-gray-400"><X size={24} /></button>
            <h3 className="text-xl font-bold text-indigo-700 mb-4">Novo Grupo</h3>
            <div className="space-y-4">
              <select required className="w-full p-2 border rounded" value={novoGrupo.centro_custo_id} onChange={e=>setNovoGrupo({...novoGrupo, centro_custo_id: e.target.value})}>
                <option value="">Centro de Custo Pai...</option>
                {centrosCusto.map(cc => <option key={cc.id} value={cc.id}>{cc.codigo} - {cc.descricao}</option>)}
              </select>
              <input required type="text" placeholder="Código (Ex: 1.1.00) *" className="w-full p-2 border rounded" value={novoGrupo.codigo} onChange={e=>setNovoGrupo({...novoGrupo, codigo: e.target.value})} />
              <input required type="text" placeholder="Descrição *" className="w-full p-2 border rounded" value={novoGrupo.descricao} onChange={e=>setNovoGrupo({...novoGrupo, descricao: e.target.value})} />
            </div>
            <button type="submit" disabled={loading} className="mt-6 w-full py-2 bg-indigo-600 text-white rounded font-bold">Salvar</button>
          </form>
        </div>
      )}

      {/* MODAL CONTA */}
      {modalConta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <form onSubmit={handleSalvarConta} className="bg-white p-6 rounded-xl w-full max-w-md relative">
            <button type="button" onClick={() => setModalConta(false)} className="absolute top-4 right-4 text-gray-400"><X size={24} /></button>
            <h3 className="text-xl font-bold text-slate-700 mb-4">Nova Conta</h3>
            <div className="space-y-4">
              <select required className="w-full p-2 border rounded" value={novaConta.grupo_id} onChange={e=>setNovaConta({...novaConta, grupo_id: e.target.value})}>
                <option value="">Grupo Pai...</option>
                {grupos.map(g => <option key={g.id} value={g.id}>{centrosCusto.find(c=>c.id === g.centro_custo_id)?.sigla} {' > '} {g.codigo} - {g.descricao}</option>)}
              </select>
              <input required type="text" placeholder="Código (Ex: 1.1.01) *" className="w-full p-2 border rounded" value={novaConta.codigo} onChange={e=>setNovaConta({...novaConta, codigo: e.target.value})} />
              <input required type="text" placeholder="Descrição *" className="w-full p-2 border rounded" value={novaConta.descricao} onChange={e=>setNovaConta({...novaConta, descricao: e.target.value})} />
            </div>
            <button type="submit" disabled={loading} className="mt-6 w-full py-2 bg-slate-700 text-white rounded font-bold">Salvar</button>
          </form>
        </div>
      )}
    </div>
  );
}