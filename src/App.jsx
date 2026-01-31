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
import EtiquetasPrint from './pages/EtiquetasPrint'; 
import RelatorioPeriodoPrint from './pages/RelatorioPeriodoPrint';
import RelatorioFornecedorPrint from './pages/RelatorioFornecedorPrint';
import Planos from './pages/Planos'; // <--- IMPORTAÇÃO

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* ROTAS DE IMPRESSÃO */}
        <Route path="/print/etiquetas" element={<EtiquetasPrint />} /> 
        <Route path="/print/diario" element={<RelatorioDiarioPrint />} /> 
        <Route path="/print/periodo" element={<RelatorioPeriodoPrint />} /> 
        <Route path="/print/fornecedor" element={<RelatorioFornecedorPrint />} />

        {/* ROTAS DO SISTEMA (COM SIDEBAR) */}
        <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
        <Route path="/incluir" element={<MainLayout><IncluirLancamento /></MainLayout>} />
        <Route path="/listagem" element={<MainLayout><Listagem /></MainLayout>} />
        <Route path="/relatorios" element={<MainLayout><Relatorios /></MainLayout>} />
        <Route path="/etiquetas" element={<MainLayout><Etiquetas /></MainLayout>} />
        <Route path="/tarefas" element={<MainLayout><Tarefas /></MainLayout>} />
        <Route path="/calculadoras" element={<MainLayout><Calculadoras /></MainLayout>} />
        <Route path="/grupos" element={<MainLayout><Grupos /></MainLayout>} />
        
        {/* ROTA DE PLANOS (Pode ficar fora ou dentro do layout, coloquei fora para dar destaque total) */}
        <Route path="/planos" element={<Planos />} /> 
      </Routes>
    </BrowserRouter>
  );
}

export default App;