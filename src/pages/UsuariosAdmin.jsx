import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Users, UserPlus, Shield, Eye, Edit, Trash, Lock, Trash2, Check, User } from 'lucide-react';

export default function UsuariosAdmin() {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentUserEmail, setCurrentUserEmail] = useState('');

    const [novoNome, setNovoNome] = useState('');
    const [novoEmail, setNovoEmail] = useState('');
    const [novaSenha, setNovaSenha] = useState('');
    const [novoRole, setNovoRole] = useState('user');
    const [modalCriar, setModalCriar] = useState(false);

    const [usuarioEdicaoPermissao, setUsuarioEdicaoPermissao] = useState(null);
    const [permissoesLocais, setPermissoesLocais] = useState([]);
    const [salvandoNomeId, setSalvandoNomeId] = useState(null);

    const modulosSistema = [
        { id: 'cp_visao_geral', label: 'Contas a Pagar > Visão Geral' },
        { id: 'cp_incluir', label: 'Contas a Pagar > Incluir Lançamento' },
        { id: 'cp_listagem', label: 'Contas a Pagar > Listagem' },
        { id: 'cp_relatorios', label: 'Contas a Pagar > Relatórios' },
        { id: 'cp_etiquetas', label: 'Contas a Pagar > Etiquetas' },
        { id: 'movimento_caixa', label: 'Movimento Caixa Geral' },
        { id: 'despesas_dashboard', label: 'Despesas > Dashboard' },
        { id: 'despesas_listagem', label: 'Despesas > Listagem' },
        { id: 'despesas_nova', label: 'Despesas > Nova Despesa' },
        { id: 'despesas_relatorios', label: 'Despesas > Relatórios' },
        { id: 'despesas_estrutura', label: 'Despesas > Estrutura' },
        { id: 'conciliacao', label: 'Conciliação Bancária' },
        { id: 'usuarios', label: 'Gestão de Usuários' },
        { id: 'relatorios_gerenciais', label: 'Relatórios Gerenciais' },
        { id: 'tarefas', label: 'Tarefas' },
        { id: 'calculadoras', label: 'Calculadoras' },
        { id: 'grupos', label: 'Cadastros Auxiliares' }
    ];

    useEffect(() => {
        verificarAdmin();
    }, []);

    const verificarAdmin = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            setCurrentUserEmail(session.user.email);
            if (session.user.email !== 'admin@cppro.com') {
                alert("Acesso restrito ao Administrador.");
                window.location.href = '/contas-a-pagar';
                return;
            }
            carregarUsuarios();
        }
    };

    const carregarUsuarios = async () => {
        setLoading(true);
        const { data } = await supabase.from('profiles').select('*').order('email');
        setUsuarios(data || []);
        setLoading(false);
    };

    const handleAtualizarNome = async (userId, novoValorNome) => {
        setSalvandoNomeId(userId);
        const { error } = await supabase.from('profiles').update({ nome: novoValorNome }).eq('id', userId);
        if (error) {
            alert("Erro ao atualizar nome: " + error.message);
        } else {
            setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, nome: novoValorNome } : u));
        }
        setTimeout(() => setSalvandoNomeId(null), 1500);
    };

    const handleCriarUsuario = async (e) => {
        e.preventDefault();
        if (!novoEmail || !novaSenha) return alert("Preencha o e-mail e a senha.");

        setLoading(true);

        const { data: userId, error: rpcError } = await supabase.rpc('admin_criar_usuario', {
            p_email: novoEmail,
            p_senha: novaSenha,
            p_role: novoRole
        });

        if (rpcError) {
            alert("Erro ao criar usuário: " + rpcError.message);
            setLoading(false);
            return;
        }

        if (userId && novoNome) {
            await supabase.from('profiles').update({ nome: novoNome }).eq('id', userId);
        }

        const permissoesIniciais = modulosSistema.map(m => {
            let pVis = false, pEdit = false, pExc = false;

            if (novoRole === 'admin') {
                pVis = true; pEdit = true; pExc = true;
            } else if (novoRole === 'gestor') {
                if (!['conciliacao', 'usuarios'].includes(m.id)) {
                    pVis = true; pEdit = true; pExc = true;
                }
            } else if (novoRole === 'user') {
                const liberados = ['cp_incluir', 'cp_listagem', 'cp_etiquetas', 'movimento_caixa', 'despesas_listagem', 'despesas_nova', 'tarefas', 'calculadoras', 'grupos'];
                if (liberados.includes(m.id)) {
                    pVis = true; pEdit = true; pExc = true;
                } else if (m.id === 'despesas_estrutura') {
                    pVis = true;
                }
            }

            return {
                user_id: userId,
                modulo: m.id,
                pode_visualizar: pVis,
                pode_inserir_editar: pEdit,
                pode_excluir: pExc
            };
        });

        await supabase.from('permissoes_usuario').insert(permissoesIniciais);

        alert(`Usuário ${novoEmail} criado e ativado com sucesso!`);
        setNovoNome('');
        setNovoEmail('');
        setNovaSenha('');
        setModalCriar(false);
        carregarUsuarios();
        setLoading(false);
    };

    const handleAbrirPermissoes = async (usuario) => {
        setUsuarioEdicaoPermissao(usuario);
        setLoading(true);

        const { data: permBanco } = await supabase
            .from('permissoes_usuario')
            .select('*')
            .eq('user_id', usuario.id);

        const listaCompleta = modulosSistema.map(mod => {
            const existe = permBanco?.find(p => p.modulo === mod.id);
            return existe || {
                user_id: usuario.id,
                modulo: mod.id,
                pode_visualizar: usuario.role === 'admin',
                pode_inserir_editar: usuario.role === 'admin',
                pode_excluir: usuario.role === 'admin'
            };
        });

        setPermissoesLocais(listaCompleta);
        setLoading(false);
    };

    const handleTogglePermissao = (moduloId, campo) => {
        setPermissoesLocais(prev => prev.map(p => {
            if (p.modulo === moduloId) {
                return { ...p, [campo]: !p[campo] };
            }
            return p;
        }));
    };

    const handleSalvarPermissoes = async () => {
        setLoading(true);

        try {
            // 1. Remove as permissões antigas do usuário
            await supabase
                .from('permissoes_usuario')
                .delete()
                .eq('user_id', usuarioEdicaoPermissao.id);

            // 2. Insere todas as permissões atualizadas de uma só vez
            const payloadPermissoes = permissoesLocais.map(p => ({
                user_id: usuarioEdicaoPermissao.id,
                modulo: p.modulo,
                pode_visualizar: !!p.pode_visualizar,
                pode_inserir_editar: !!p.pode_inserir_editar,
                pode_excluir: !!p.pode_excluir
            }));

            const { error } = await supabase
                .from('permissoes_usuario')
                .insert(payloadPermissoes);

            if (error) throw error;

            alert("Permissões salvas com sucesso!");
            setUsuarioEdicaoPermissao(null);
        } catch (err) {
            alert("Erro ao salvar permissões: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExcluirUsuario = async (u) => {
        if (u.email === 'admin@cppro.com') return alert("O administrador principal não pode ser removido.");
        if (!confirm(`Remover acesso de ${u.email}?`)) return;

        setLoading(true);
        await supabase.from('permissoes_usuario').delete().eq('user_id', u.id);
        await supabase.from('profiles').delete().eq('id', u.id);

        alert("Usuário excluído.");
        carregarUsuarios();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
                        <Users size={24} /> Gestão de Usuários e Permissões Granulares
                    </h2>
                    <p className="text-xs text-gray-500">Controle o acesso de Administradores, Gestores e Usuários Comuns.</p>
                </div>

                <button
                    onClick={() => setModalCriar(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-lg shadow flex items-center gap-2 text-xs"
                >
                    <UserPlus size={16} /> Novo Usuário
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-gray-50 border-b text-gray-500 uppercase font-bold">
                                <th className="p-3">Nome do Usuário</th>
                                <th className="p-3">E-mail de Acesso</th>
                                <th className="p-3">Perfil Geral (Role)</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-center">Permissões Específicas</th>
                                <th className="p-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {usuarios.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50">
                                    <td className="p-3">
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="text"
                                                defaultValue={u.nome || ''}
                                                placeholder="Digite o nome..."
                                                onBlur={(e) => handleAtualizarNome(u.id, e.target.value)}
                                                className="p-1.5 border rounded bg-gray-50/70 hover:bg-white focus:bg-white text-xs font-bold text-gray-800 w-44 outline-none focus:ring-1 focus:ring-primary"
                                            />
                                            {salvandoNomeId === u.id && <Check size={14} className="text-emerald-600 animate-pulse" />}
                                        </div>
                                    </td>
                                    <td className="p-3 font-semibold text-gray-700">{u.email}</td>
                                    <td className="p-3">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${u.role === 'admin' ? 'bg-purple-100 text-purple-900' : u.role === 'gestor' ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-700'}`}>
                                            {u.role === 'admin' ? 'Administrador' : u.role === 'gestor' ? 'Gestor' : 'Usuário Comum'}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">Ativo</span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <button
                                            onClick={() => handleAbrirPermissoes(u)}
                                            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-bold transition-colors border border-indigo-200"
                                        >
                                            <Shield size={14} className="inline mr-1" /> Ajustar Matriz de Acesso
                                        </button>
                                    </td>
                                    <td className="p-3 text-center">
                                        {u.email !== 'admin@cppro.com' && (
                                            <button onClick={() => handleExcluirUsuario(u)} className="text-red-600 hover:text-red-800 font-bold p-1 rounded hover:bg-red-50">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL NOVO USUÁRIO */}
            {modalCriar && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl border">
                        <h3 className="font-bold text-lg text-gray-800 border-b pb-2 flex items-center gap-2">
                            <UserPlus className="text-emerald-600" /> Cadastrar Novo Usuário
                        </h3>

                        <form onSubmit={handleCriarUsuario} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Nome do Usuário *</label>
                                <input type="text" required value={novoNome} onChange={e => setNovoNome(e.target.value)} className="w-full p-2.5 border rounded-lg bg-gray-50 font-semibold" placeholder="Ex: Maria Silva" />
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">E-mail de Acesso *</label>
                                <input type="email" required value={novoEmail} onChange={e => setNovoEmail(e.target.value)} className="w-full p-2.5 border rounded-lg bg-gray-50 font-semibold" placeholder="usuario@empresa.com" />
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Senha Provisória *</label>
                                <input type="password" required value={novaSenha} onChange={e => setNovaSenha(e.target.value)} className="w-full p-2.5 border rounded-lg bg-gray-50 font-semibold" placeholder="******" />
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Papel Padrão (Role)</label>
                                <select value={novoRole} onChange={e => setNovoRole(e.target.value)} className="w-full p-2.5 border rounded-lg bg-white font-bold">
                                    <option value="user">Usuário Comum (Acesso Básico)</option>
                                    <option value="gestor">Gestor (Acesso Expandido)</option>
                                    <option value="admin">Administrador (Acesso Total)</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button type="button" onClick={() => setModalCriar(false)} className="px-4 py-2 border rounded-lg font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
                                <button type="submit" disabled={loading} className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-lg shadow">{loading ? "Cadastrando..." : "Criar Usuário"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL MATRIZ DE ACESSO */}
            {usuarioEdicaoPermissao && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl border">
                        <h3 className="font-bold text-lg text-gray-800 border-b pb-2 flex items-center gap-2">
                            <Lock className="text-indigo-600" /> Matriz de Permissões: {usuarioEdicaoPermissao.nome || usuarioEdicaoPermissao.email}
                        </h3>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-indigo-50/60 border-b text-indigo-950 uppercase font-bold">
                                        <th className="p-3">Módulo / Tela</th>
                                        <th className="p-3 text-center"><Eye size={14} className="inline mr-1" /> Visualizar</th>
                                        <th className="p-3 text-center"><Edit size={14} className="inline mr-1" /> Inserir / Editar</th>
                                        <th className="p-3 text-center"><Trash size={14} className="inline mr-1" /> Excluir</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {modulosSistema.map(m => {
                                        const perm = permissoesLocais.find(p => p.modulo === m.id) || {};
                                        return (
                                            <tr key={m.id} className="hover:bg-gray-50">
                                                <td className="p-3 font-bold text-gray-800">{m.label}</td>
                                                <td className="p-3 text-center">
                                                    <input type="checkbox" checked={!!perm.pode_visualizar} onChange={() => handleTogglePermissao(m.id, 'pode_visualizar')} className="w-4 h-4 text-indigo-600 cursor-pointer" />
                                                </td>
                                                <td className="p-3 text-center">
                                                    <input type="checkbox" checked={!!perm.pode_inserir_editar} onChange={() => handleTogglePermissao(m.id, 'pode_inserir_editar')} className="w-4 h-4 text-indigo-600 cursor-pointer" />
                                                </td>
                                                <td className="p-3 text-center">
                                                    <input type="checkbox" checked={!!perm.pode_excluir} onChange={() => handleTogglePermissao(m.id, 'pode_excluir')} className="w-4 h-4 text-red-600 cursor-pointer" />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <button type="button" onClick={() => setUsuarioEdicaoPermissao(null)} className="px-4 py-2 border rounded-lg font-bold text-gray-600">Cancelar</button>
                            <button type="button" onClick={handleSalvarPermissoes} disabled={loading} className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow">{loading ? "Salvando..." : "Salvar Permissões"}</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}