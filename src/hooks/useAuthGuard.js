import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

export function useAuthGuard(allowedRoles = []) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let sessionSub;

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/');
        return;
      }

      // Busca dados do profile
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !userProfile) {
        setLoading(false);
        return;
      }

      // Armazena a versão inicial da sessão
      const localVersion = localStorage.getItem('cp_session_version');
      if (!localVersion) {
        localStorage.setItem('cp_session_version', userProfile.session_version || 1);
      } else if (Number(localVersion) < (userProfile.session_version || 1) && session.user.email !== 'admin@cppro.com') {
        // Sessão invalidada pelo Admin
        await supabase.auth.signOut();
        localStorage.removeItem('cp_session_version');
        alert("Sua sessão foi encerrada pelo Administrador do sistema.");
        navigate('/');
        return;
      }

      // Validação de papéis (RBAC)
      if (allowedRoles.length > 0 && !allowedRoles.includes(userProfile.role)) {
        alert("Acesso restrito: você não tem permissão para acessar esta área.");
        navigate('/dashboard');
        return;
      }

      setProfile(userProfile);
      setLoading(false);
    };

    checkAuth();

    return () => {
      if (sessionSub) sessionSub.unsubscribe();
    };
  }, [navigate]);

  return { profile, loading };
}