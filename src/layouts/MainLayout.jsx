import { useState } from 'react';
import Sidebar from '../components/Sidebar';

export default function MainLayout({ children }) {
  // Começa aberto no PC e fechado (mini) no celular
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  return (
    <div className="flex min-h-screen bg-gray-100 relative">
      
      {/* Removemos o botão flutuante antigo daqui */}

      {/* --- SIDEBAR --- */}
      <Sidebar isOpen={isSidebarOpen} toggle={() => setIsSidebarOpen(!isSidebarOpen)} />

      {/* --- CONTEÚDO PRINCIPAL --- */}
      {/* Ajustamos a margem: ml-64 (Aberto) ou ml-20 (Fechado/Mini) */}
      <main 
        className={`flex-1 p-8 overflow-auto transition-all duration-300 ${
          isSidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        {children}
      </main>

    </div>
  );
}