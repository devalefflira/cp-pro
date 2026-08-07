import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Plus, FolderTree, Folder, FileText, X, Info } from 'lucide-react';

export default function EstruturaTab() {
  const [podeEditar, setPodeEditar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [contas, setContas] = useState([]);

  // --- MODAIS E ESTADOS ---
  const [modalCC, setModalCC] = useState(false);
  const [novoCC, setNovoCC] = useState({ codigo: '', sigla: '', descricao: '', orientacao_uso: '' });

  const [modalGrupo, setModalGrupo] = useState(false);
  const [novoGrupo, setNovoGrupo] = useState({ codigo: '', descricao: '', centro_custo_id: '' });

  const [modalConta, setModalConta] = useState(false);
  const [novaConta, setNovaConta] = useState({ codigo: '', descricao: '', grupo_id: '' });

  useEffect(() => {
    verificarPermissaoEdicao();
    carregarEstrutura();
  }, []);

  const verificarPermissaoEdicao = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // 1. Admin Principal sempre pode editar
      if (session.user.email === 'admin@cppro.com') {
        setPodeEditar(true);
        return;
      }

      // 2. Consulta o perfil (role)
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (profile?.role === 'admin' || profile?.role === 'gestor') {
        setPodeEditar(true);
        return;
      }

      // 3. Consulta a permissão específica de inserção no banco para o submódulo despesas_estrutura
      const { data: perm } = await supabase
        .from('permissoes_usuario')
        .select('pode_inserir_editar')
        .eq('user_id', session.user.id)
        .eq('modulo', 'despesas_estrutura')
        .single();

      setPodeEditar(!!perm?.pode_inserir_editar);
    }
  };

  const carregarEstrutura = async () => {
    const [resCC, resG, resC] = await Promise.all([
      supabase.from('centros_custo').select('*').order('codigo'),
      supabase.from('grupos_despesa').select('*').order('codigo'),
      supabase.from('contas_despesa').select('*').order('codigo')
    ]);
    setCentrosCusto(resCC.data || []);
    setGrupos(resG.data || []);
    setContas(resC.data || []);
  };

  const alertError = (context, err) => {
    console.error(err);
    alert(`Erro ao salvar ${context}:\n${err.message || 'Erro desconhecido. Verifique as permissões do banco (RLS).'}`);
  };

  // --- SALVAMENTOS ---
  const handleSalvarCC = async (e) => {
    e.preventDefault();
    if (!podeEditar) return alert("Sua conta possui permissão apenas para visualização da estrutura.");
    setLoading(true);
    const { data, error } = await supabase.from('centros_custo').insert([novoCC]).select();
    setLoading(false);

    if (error) alertError("Centro de Custo", error);
    else if (data) {
      setCentrosCusto([...centrosCusto, data[0]].sort((a, b) => a.codigo.localeCompare(b.codigo)));
      setModalCC(false);
      setNovoCC({ codigo: '', sigla: '', descricao: '', orientacao_uso: '' });
    }
  };

  const handleSalvarGrupo = async (e) => {
    e.preventDefault();
    if (!podeEditar) return alert("Sua conta possui permissão apenas para visualização da estrutura.");
    setLoading(true);
    const { data, error } = await supabase.from('grupos_despesa').insert([novoGrupo]).select();
    setLoading(false);

    if (error) alertError("Grupo", error);
    else if (data) {
      setGrupos([...grupos, data[0]].sort((a, b) => a.codigo.localeCompare(b.codigo)));
      setModalGrupo(false);
      setNovoGrupo({ codigo: '', descricao: '', centro_custo_id: '' });
    }
  };

  const handleSalvarConta = async (e) => {
    e.preventDefault();
    if (!podeEditar) return alert("Sua conta possui permissão apenas para visualização da estrutura.");
    setLoading(true);
    const { data, error } = await supabase.from('contas_despesa').insert([novaConta]).select();
    setLoading(false);

    if (error) alertError("Conta", error);
    else if (data) {
      setContas([...contas, data[0]].sort((a, b) => a.codigo.localeCompare(b.codigo)));
      setModalConta(false);
      setNovaConta({ codigo: '', descricao: '', grupo_id: '' });
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200">

      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-center border-b pb-4 mb-6 gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Hierarquia de Despesas</h3>
          {!podeEditar && (
            <p className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1 border border-amber-200 inline-block font-semibold">
              Modo de Visualização (Apenas Leitura)
            </p>
          )}
        </div>

        {/* BOTOES DE ACAO EXIBIDOS APENAS SE PODE EDITAR */}
        {podeEditar && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setModalCC(true)} className="bg-primary hover:bg-blue-800 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors">
              <Plus size={16} /> Centro de Custo
            </button>
            <button onClick={() => setModalGrupo(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors">
              <Plus size={16} /> Grupo
            </button>
            <button onClick={() => setModalConta(true)} className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors">
              <Plus size={16} /> Conta
            </button>
          </div>
        )}
      </div>

      {/* ÁRVORE HIERÁRQUICA */}
      <div className="space-y-4">
        {centrosCusto.length === 0 ? <p className="text-gray-500 text-center py-10">Nenhuma estrutura cadastrada ainda.</p> :
          centrosCusto.map(cc => (
            <div key={cc.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center gap-2">
                <FolderTree className="text-primary" size={20} />
                <span className="font-bold text-gray-800 text-lg">{cc.codigo} - {cc.descricao}</span>
                <span className="bg-white border text-xs font-bold px-2 py-0.5 rounded text-gray-500 ml-2">{cc.sigla}</span>
              </div>

              {cc.orientacao_uso && (
                <div className="bg-blue-50/50 px-4 py-3 border-b border-blue-100 text-sm text-gray-600 flex items-start gap-2">
                  <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <p className="leading-relaxed"><strong>Orientação para lançamentos:</strong> {cc.orientacao_uso}</p>
                </div>
              )}

              <div className="p-4 space-y-4">
                {grupos.filter(g => g.centro_custo_id === cc.id).length === 0 && (
                  <p className="text-sm text-gray-400 italic">Nenhum grupo cadastrado neste centro de custo.</p>
                )}
                {grupos.filter(g => g.centro_custo_id === cc.id).map(g => (
                  <div key={g.id} className="ml-4 border-l-2 border-indigo-100 pl-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Folder className="text-indigo-500" size={16} />
                      <span className="font-bold text-gray-700">{g.codigo} - {g.descricao}</span>
                    </div>
                    <div className="ml-5 space-y-2 mt-1">
                      {contas.filter(c => c.grupo_id === g.id).length === 0 && (
                        <p className="text-xs text-gray-400 italic">Nenhuma conta cadastrada neste grupo.</p>
                      )}
                      {contas.filter(c => c.grupo_id === g.id).map(c => (
                        <div key={c.id} className="flex items-center gap-2 text-sm text-gray-600 bg-slate-50 p-2 rounded border border-slate-100 w-fit">
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

      {/* MODAL CENTRO DE CUSTO */}
      {modalCC && podeEditar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <form onSubmit={handleSalvarCC} className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md relative">
            <button type="button" onClick={() => setModalCC(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-xl font-bold text-primary mb-6 border-b pb-2">Novo Centro de Custo</h3>

            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-sm">Código (Ex: 1.0.00) *</label>
                <input required type="text" className="w-full p-2 border rounded bg-gray-50 outline-none focus:ring-2 focus:ring-primary" value={novoCC.codigo} onChange={e => setNovoCC({ ...novoCC, codigo: e.target.value })} autoFocus />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-sm">Sigla (Ex: CC1000) *</label>
                <input required type="text" className="w-full p-2 border rounded bg-gray-50 outline-none focus:ring-2 focus:ring-primary uppercase" value={novoCC.sigla} onChange={e => setNovoCC({ ...novoCC, sigla: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-sm">Nome do Centro de Custo *</label>
                <input required type="text" className="w-full p-2 border rounded bg-gray-50 outline-none focus:ring-2 focus:ring-primary" value={novoCC.descricao} onChange={e => setNovoCC({ ...novoCC, descricao: e.target.value })} />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-sm">Orientações de Uso para o Analista</label>
                <textarea
                  className="w-full p-2 border rounded bg-gray-50 outline-none focus:ring-2 focus:ring-primary text-sm leading-relaxed"
                  rows="3"
                  placeholder="Ex: Utilizar para despesas diretas da equipe de vendas externas e comissões."
                  value={novoCC.orientacao_uso}
                  onChange={e => setNovoCC({ ...novoCC, orientacao_uso: e.target.value })}
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button type="button" onClick={() => setModalCC(false)} className="px-5 py-2 border rounded text-gray-600 font-semibold hover:bg-gray-100 transition-colors">Cancelar</button>
              <button type="submit" disabled={loading} className="px-6 py-2 bg-primary text-white rounded font-bold shadow hover:bg-blue-800 transition-colors">
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL GRUPO */}
      {modalGrupo && podeEditar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <form onSubmit={handleSalvarGrupo} className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md relative">
            <button type="button" onClick={() => setModalGrupo(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-xl font-bold text-indigo-700 mb-6 border-b pb-2">Novo Grupo</h3>
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-sm">Centro de Custo Pai *</label>
                <select required className="w-full p-2 border rounded bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500" value={novoGrupo.centro_custo_id} onChange={e => setNovoGrupo({ ...novoGrupo, centro_custo_id: e.target.value })}>
                  <option value="">Selecione...</option>
                  {centrosCusto.map(cc => <option key={cc.id} value={cc.id}>{cc.codigo} - {cc.descricao}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-sm">Código (Ex: 1.1.00) *</label>
                <input required type="text" className="w-full p-2 border rounded bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500" value={novoGrupo.codigo} onChange={e => setNovoGrupo({ ...novoGrupo, codigo: e.target.value })} />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-sm">Descrição *</label>
                <input required type="text" className="w-full p-2 border rounded bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500" value={novoGrupo.descricao} onChange={e => setNovoGrupo({ ...novoGrupo, descricao: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button type="button" onClick={() => setModalGrupo(false)} className="px-5 py-2 border rounded text-gray-600 font-semibold hover:bg-gray-100 transition-colors">Cancelar</button>
              <button type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 text-white rounded font-bold shadow hover:bg-indigo-700 transition-colors">
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL CONTA */}
      {modalConta && podeEditar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <form onSubmit={handleSalvarConta} className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md relative">
            <button type="button" onClick={() => setModalConta(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-xl font-bold text-slate-700 mb-6 border-b pb-2">Nova Conta</h3>
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-sm">Grupo Pai *</label>
                <select required className="w-full p-2 border rounded bg-gray-50 outline-none focus:ring-2 focus:ring-slate-500" value={novaConta.grupo_id} onChange={e => setNovaConta({ ...novaConta, grupo_id: e.target.value })}>
                  <option value="">Selecione...</option>
                  {grupos.map(g => <option key={g.id} value={g.id}>{centrosCusto.find(c => c.id === g.centro_custo_id)?.sigla} {' > '} {g.codigo} - {g.descricao}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-sm">Código (Ex: 1.1.01) *</label>
                <input required type="text" className="w-full p-2 border rounded bg-gray-50 outline-none focus:ring-2 focus:ring-slate-500" value={novaConta.codigo} onChange={e => setNovaConta({ ...novaConta, codigo: e.target.value })} />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1 text-sm">Descrição *</label>
                <input required type="text" className="w-full p-2 border rounded bg-gray-50 outline-none focus:ring-2 focus:ring-slate-500" value={novaConta.descricao} onChange={e => setNovaConta({ ...novaConta, descricao: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button type="button" onClick={() => setModalConta(false)} className="px-5 py-2 border rounded text-gray-600 font-semibold hover:bg-gray-100 transition-colors">Cancelar</button>
              <button type="submit" disabled={loading} className="px-6 py-2 bg-slate-700 text-white rounded font-bold shadow hover:bg-slate-800 transition-colors">
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}