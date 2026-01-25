import GroupCard from '../components/GroupCard';

export default function Grupos() {
  return (
    <div>
      <h2 className="text-3xl font-bold text-primary mb-6">Cadastrar Grupos</h2>
      
      {/* Grid Responsivo: 1 coluna no celular, 2 no tablet, 3 no PC grande */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Tabela de Fornecedores */}
        <GroupCard 
          title="Fornecedor" 
          table="fornecedores" 
          field="nome" 
        />

        {/* Tabela de Tipos de Documento (usa 'descricao' no banco) */}
        <GroupCard 
          title="Tipo de Documento" 
          table="tipos_documento" 
          field="descricao" 
        />

        {/* Tabela de Razão / Centro de Custo */}
        <GroupCard 
          title="Razão" 
          table="razoes" 
          field="nome" 
        />

        {/* Tabela de Bancos */}
        <GroupCard 
          title="Banco" 
          table="bancos" 
          field="nome" 
        />

        {/* Tabela de Parcelas (usa 'descricao' no banco) */}
        <GroupCard 
          title="Parcelas" 
          table="parcelas" 
          field="descricao" 
        />

      </div>
    </div>
  );
}