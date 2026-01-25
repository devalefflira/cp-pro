import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Rocket } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Tenta logar no Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      alert('Erro ao entrar: ' + error.message);
      setLoading(false);
    } else {
      // 2. Se der certo, redireciona para o Dashboard
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-4">
      {/* Logo e Título */}
      <div className="flex items-center gap-3 mb-8 text-white">
        <Rocket size={48} />
        <h1 className="text-5xl font-bold tracking-wider">CP PRO</h1>
      </div>

      {/* Card de Login (Fundo Azul Claro) */}
      <div className="bg-[#D0E8F2] w-full max-w-md p-8 rounded-2xl shadow-2xl">
        <form onSubmit={handleLogin} className="space-y-6">
          
          {/* Campo Usuário (Email) */}
          <div>
            <label className="block text-primary font-bold text-lg mb-2">Usuário (Email)</label>
            <input 
              type="email"
              required
              className="w-full p-4 rounded-xl border-none outline-none focus:ring-2 focus:ring-secondary text-lg"
              placeholder="Digite seu email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Campo Senha */}
          <div>
            <label className="block text-primary font-bold text-lg mb-2">Senha</label>
            <input 
              type="password"
              required
              className="w-full p-4 rounded-xl border-none outline-none focus:ring-2 focus:ring-secondary text-lg"
              placeholder="Digite sua senha..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Botão Entrar */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#3B82F6] hover:bg-blue-600 text-white font-bold py-4 rounded-xl text-xl transition-colors shadow-lg mt-4 disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}