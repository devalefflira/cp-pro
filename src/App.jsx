import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Grupos from './pages/Grupos'; // Importando a página real
import IncluirLancamento from './pages/IncluirLancamento';
import Listagem from './pages/Listagem';
import Relatorios from './pages/Relatorios';
import Tarefas from './pages/Tarefas';
import Calculadoras from './pages/Calculadoras';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Rotas Protegidas */}
        <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
        <Route path="/incluir" element={<MainLayout><IncluirLancamento /></MainLayout>} />
        <Route path="/listagem" element={<MainLayout><Listagem /></MainLayout>} />
        <Route path="/relatorios" element={<MainLayout><Relatorios /></MainLayout>} />
        <Route path="/tarefas" element={<MainLayout><Tarefas /></MainLayout>} />
        <Route path="/calculadoras" element={<MainLayout><Calculadoras /></MainLayout>} />
        
        {/* Rota atualizada para usar o componente real */}
        <Route path="/grupos" element={<MainLayout><Grupos /></MainLayout>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;