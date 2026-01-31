import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Grupos from './pages/Grupos';
import IncluirLancamento from './pages/IncluirLancamento';
import Listagem from './pages/Listagem';
import Relatorios from './pages/Relatorios';
import Tarefas from './pages/Tarefas';
import Calculadoras from './pages/Calculadoras';
import RelatorioDiarioPrint from './pages/RelatorioDiarioPrint';
import Etiquetas from './pages/Etiquetas'; 
import EtiquetasPrint from './pages/EtiquetasPrint'; // <--- O IMPORT ESTAVA AQUI?

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* --- ROTAS DE IMPRESSÃO (SEM SIDEBAR) --- */}
        {/* Verifique se esta linha existe no seu arquivo: */}
        <Route path="/print/etiquetas" element={<EtiquetasPrint />} /> 
        <Route path="/print/diario" element={<RelatorioDiarioPrint />} /> 

        {/* --- ROTAS DO SISTEMA (COM SIDEBAR) --- */}
        <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
        <Route path="/incluir" element={<MainLayout><IncluirLancamento /></MainLayout>} />
        <Route path="/listagem" element={<MainLayout><Listagem /></MainLayout>} />
        <Route path="/relatorios" element={<MainLayout><Relatorios /></MainLayout>} />
        <Route path="/etiquetas" element={<MainLayout><Etiquetas /></MainLayout>} />
        <Route path="/tarefas" element={<MainLayout><Tarefas /></MainLayout>} />
        <Route path="/calculadoras" element={<MainLayout><Calculadoras /></MainLayout>} />
        <Route path="/grupos" element={<MainLayout><Grupos /></MainLayout>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;