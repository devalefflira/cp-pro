import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Users, UserPlus, Shield, KeyRound, Trash2, Save, Eye, Edit, Trash, Lock } from 'lucide-react';

export default function UsuariosAdmin() {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentUserEmail, setCurrentUserEmail] = useState('');

    // Estados de Criação de Novo Usuário
    const [novoEmail, setNovoEmail] = useState('');
    const [novaSenha, setNovaSenha] = useState('');
    const [novoRole, setNovoRole] = useState('user');
    const [modalCriar, setModalCriar] = useState(false);

    // Estados de Gestão de Permissões Granulares
    const [usuarioEdicaoPermissao, setUsuarioEdicaoPermissao] = useState(null);
    const [permissoesLocais, setPermissoesLocais] = useState([]);

    const modulosSistema = [
        { id: 'dashboard', label: 'Visão Geral / Dashboard' },
        { id: 'incluir', label: 'Incluir Lançamentos' },
        { id: 'listagem', label: 'Listagem Principal' },
        { id: 'despesas', label: 'Módulo de Despesas' },
        { id: 'conciliacao', label: 'Conciliação Bancária' },
        { id: 'relatorios', label: 'Relatórios & DRE' },
        { id: 'etiquetas', label: 'Etiquetas' },
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
                alert("Acesso negado. Apenas o administrador principal (admin@cppro.com) pode acessar este módulo.");
                window.location.href = '/dashboard';
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

    // 1. CRIAR USUÁRIO VIA INTERFACE
    const handleCriarUsuario = async (e) => {
        e.preventDefault();
        if (!novoEmail || !novaSenha) return alert("Preencha o e-mail e a senha provisória.");

        setLoading(true);

        // 1. Cria a conta no Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: novoEmail,
            password: novaSenha,
        });

        if (authError) {
            alert("Erro ao criar usuário: " + authError.message);
            setLoading(false);
            return;
        }

        if (authData.user) {
            // 2. Registra perfil e papel na tabela profiles
            await supabase.from('profiles').upsert({
                id: authData.user.id,
                email: novoEmail,
                role: novoRole,
                plano: 'start',
                status_assinatura: 'active'
            });

            // 3. Popula a matriz inicial de permissões
            const permissoesIniciais = modulosSistema.map(m => ({
                user_id: authData.user.id,
                modulo: m.id,
                pode_visualizar: novoRole === 'admin' || novoRole === 'gestor',
                pode_inserir_editar: novoRole === 'admin',
                pode_excluir: novoRole === 'admin'
            }));

            await supabase.from('permissoes_usuario').insert(permissoesIniciais);

            alert(`Usuário ${novoEmail} criado com sucesso!`);
            setNovoEmail('');
            setNovaSenha('');
            setModalCriar(false);
            carregarUsuarios();
        }
        setLoading(false);
    };

    // 2. ABRIR GESTÃO DE PERMISSÕES DO USUÁRIO SELECIONADO
    const handleAbrirPermissoes = async (usuario) => {
        setUsuarioEdicaoPermissao(usuario);
        setLoading(true);

        const { data: permBanco } = await supabase
            .from('permissoes_usuario')
            .select('*')
            .eq('user_id', usuario.id);

        // Mapeia e preenche lacunas se houver novos módulos
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
        for (const perm of permissoesLocais) {
            await supabase.from('permissoes_usuario').upsert({
                user_id: usuarioEdicaoPermissao.id,
                modulo: perm.modulo,
                pode_visualizar: perm.pode_visualizar,
                pode_inserir_editar: perm.pode_inserir_editar,
                pode_excluir: perm.pode_excluir
            }, { onConflict: 'user_id,modulo' });
        }

        alert("Permissões salvas com sucesso!");
        setUsuarioEdicaoPermissao(null);
        setLoading(false);
    };

    const handleExcluirUsuario = async (u) => {
        if (u.email === 'admin@cppro.com') return alert("O usuário administrador principal não pode ser excluído.");
        if (!confirm(`Deseja remover o acesso de ${u.email}?`)) return;

        setLoading(true);
        await supabase.from('permissoes_usuario').delete().eq('user_id', u.id);
        await supabase.from('profiles').delete().eq('id', u.id);

        alert("Usuário removido da plataforma.");
        carregarUsuarios();
    };

    if (currentUserEmail !== 'admin@cppro.com') {
        return <div className="p-8 text-center text-gray-500">Verificando credenciais de administrador...</div>;
    }

    return (
        <div className="space-y-6">

            {/* CABEÇALHO */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
                        <Users size={24} /> Gestão de Usuários e Permissões Granulares
                    </h2>
                    <p className="text-xs text-gray-500">Cadastre usuários e configure permissões de visualização, inserção e exclusão por módulo.</p>
                </div>

                <button
                    onClick={() => setModalCriar(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-lg shadow flex items-center gap-2 text-xs transition-transform hover:scale-105"
                >
                    <UserPlus size={16} /> Novo Usuário
                </button>
            </div>

            {/* TABELA DE USUÁRIOS */}
            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-gray-50 border-b text-gray-500 uppercase font-bold">
                                <th className="p-3">E-mail do Usuário</th>
                                <th className="p-3">Perfil Geral (Role)</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-center">Permissões Específicas</th>
                                <th className="p-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {usuarios.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50">
                                    <td className="p-3 font-bold text-gray-800">{u.email}</td>
                                    <td className="p-3">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${u.role === 'admin' ? 'bg-purple-100 text-purple-900' : u.role === 'gestor' ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {u.role === 'admin' ? 'Administrador' : u.role === 'gestor' ? 'Gestor' : 'Usuário Comum'}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                                            Ativo
                                        </span>
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
                                            <button
                                                onClick={() => handleExcluirUsuario(u)}
                                                className="text-red-600 hover:text-red-800 font-bold p-1 rounded hover:bg-red-50"
                                                title="Remover Usuário"
                                            >
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

            {/* MODAL 1: CRIAR NOVO USUÁRIO */}
            {modalCriar && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl border">
                        <h3 className="font-bold text-lg text-gray-800 border-b pb-2 flex items-center gap-2">
                            <UserPlus className="text-emerald-600" /> Cadastrar Novo Usuário
                        </h3>

                        <form onSubmit={handleCriarUsuario} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">E-mail de Acesso *</label>
                                <input
                                    type="email"
                                    required
                                    value={novoEmail}
                                    onChange={e => setNovoEmail(e.target.value)}
                                    className="w-full p-2.5 border rounded-lg bg-gray-50 font-semibold"
                                    placeholder="usuario@empresa.com"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Senha Provisória *</label>
                                <input
                                    type="password"
                                    required
                                    value={novaSenha}
                                    onChange={e => setNovaSenha(e.target.value)}
                                    className="w-full p-2.5 border rounded-lg bg-gray-50 font-semibold"
                                    placeholder="******"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Papel Padrão (Role)</label>
                                <select
                                    value={novoRole}
                                    onChange={e => setNovoRole(e.target.value)}
                                    className="w-full p-2.5 border rounded-lg bg-white font-bold"
                                >
                                    <option value="user">Usuário Comum (Acesso Básico)</option>
                                    <option value="gestor">Gestor (Acesso Expandido)</option>
                                    <option value="admin">Administrador (Acesso Total)</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button type="button" onClick={() => setModalCriar(false)} className="px-4 py-2 border rounded-lg font-bold text-gray-600 hover:bg-gray-50">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={loading} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow">
                                    {loading ? "Cadastrando..." : "Criar Usuário"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: MATRIZ GRANULAR DE PERMISSÕES (VER, EDITAR, EXCLUIR) */}
            {usuarioEdicaoPermissao && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl border">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <Lock className="text-indigo-600" /> Matriz de Permissões: {usuarioEdicaoPermissao.email}
                            </h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-indigo-50/60 border-b text-indigo-950 uppercase font-bold">
                                        <th className="p-3">Módulo / Tela</th>
                                        <th className="p-3 text-center">
                                            <Eye size={14} className="inline mr-1" /> Visualizar
                                        </th>
                                        <th className="p-3 text-center">
                                            <Edit size={14} className="inline mr-1" /> Inserir / Editar
                                        </th>
                                        <th className="p-3 text-center">
                                            <Trash size={14} className="inline mr-1" /> Excluir
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {modulosSistema.map(m => {
                                        const perm = permissoesLocais.find(p => p.modulo === m.id) || {};
                                        return (
                                            <tr key={m.id} className="hover:bg-gray-50">
                                                <td className="p-3 font-bold text-gray-800">{m.label}</td>

                                                {/* Visualizar */}
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!perm.pode_visualizar}
                                                        onChange={() => handleTogglePermissao(m.id, 'pode_visualizar')}
                                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                </td>

                                                {/* Inserir/Editar */}
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!perm.pode_inserir_editar}
                                                        onChange={() => handleTogglePermissao(m.id, 'pode_inserir_editar')}
                                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                </td>

                                                {/* Excluir */}
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!perm.pode_excluir}
                                                        onChange={() => handleTogglePermissao(m.id, 'pode_excluir')}
                                                        className="w-4 h-4 text-red-600 rounded focus:ring-red-500 cursor-pointer"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <button type="button" onClick={() => setUsuarioEdicaoPermissao(null)} className="px-4 py-2 border rounded-lg font-bold text-gray-600 hover:bg-gray-50 text-xs">
                                Cancelar
                            </button>
                            <button type="button" onClick={handleSalvarPermissoes} disabled={loading} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow text-xs flex items-center gap-1.5">
                                <Save size={16} /> {loading ? "Salvando..." : "Salvar Matriz de Permissões"}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}