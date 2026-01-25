import Sidebar from '../components/Sidebar';

export default function MainLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Fixa */}
      <Sidebar />

      {/* Área de Conteúdo (com margem para não ficar embaixo da sidebar) */}
      <main className="flex-1 ml-64 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}