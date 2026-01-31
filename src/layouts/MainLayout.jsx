import Sidebar from '../components/Sidebar';

export default function MainLayout({ children }) {
  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar Fixa */}
      <Sidebar />
      
      {/* Área de Conteúdo */}
      <div className="flex-1 bg-gray-100 flex flex-col">
        {/* Removemos paddings excessivos aqui (ex: p-8) */}
        <main className="flex-1 p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}