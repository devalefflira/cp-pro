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
import Planos from './pages/Planos';
import Despesas from './pages/Despesas';
import RelatorioDrePrint from './pages/RelatorioDrePrint';
import RelatorioDespesasCentroCustoPrint from './pages/RelatorioDespesasCentroCustoPrint';
import RelatorioDespesasFornecedorPrint from './pages/RelatorioDespesasFornecedorPrint';
import RelatorioEvolucaoContaPrint from './pages/RelatorioEvolucaoContaPrint';
import Conciliacao from './pages/Conciliacao';
import UsuariosAdmin from './pages/UsuariosAdmin';
import ContasPagar from './pages/ContasPagar';

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
        <Route path="/print/dre" element={<RelatorioDrePrint />} />
        <Route path="/print/despesas-cc" element={<RelatorioDespesasCentroCustoPrint />} />
        <Route path="/print/despesas-fornecedor" element={<RelatorioDespesasFornecedorPrint />} />
        <Route path="/print/evolucao-conta" element={<RelatorioEvolucaoContaPrint />} />

        {/* ROTAS DO SISTEMA (COM SIDEBAR) */}
        <Route path="/dashboard" element={<MainLayout><ContasPagar /></MainLayout>} />
        <Route path="/contas-a-pagar" element={<MainLayout><ContasPagar /></MainLayout>} />
        <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
        <Route path="/incluir" element={<MainLayout><IncluirLancamento /></MainLayout>} />
        <Route path="/listagem" element={<MainLayout><Listagem /></MainLayout>} />
        <Route path="/despesas" element={<MainLayout><Despesas /></MainLayout>} />
        <Route path="/conciliacao" element={<MainLayout><Conciliacao /></MainLayout>} />
        <Route path="/usuarios" element={<MainLayout><UsuariosAdmin /></MainLayout>} /> {/* 👈 ROTA CONFIGURADA */}
        <Route path="/relatorios" element={<MainLayout><Relatorios /></MainLayout>} />
        <Route path="/etiquetas" element={<MainLayout><Etiquetas /></MainLayout>} />
        <Route path="/tarefas" element={<MainLayout><Tarefas /></MainLayout>} />
        <Route path="/calculadoras" element={<MainLayout><Calculadoras /></MainLayout>} />
        <Route path="/grupos" element={<MainLayout><Grupos /></MainLayout>} />

        {/* ROTA DE PLANOS */}
        <Route path="/planos" element={<Planos />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;