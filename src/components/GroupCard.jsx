import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { PlusCircle, Trash2, Edit, X } from 'lucide-react';

// Props:
// title: O título visual (ex: "Fornecedor")
// table: O nome da tabela no Supabase (ex: "fornecedores")
// field: O nome da coluna de texto (algumas tabelas usam 'nome', outras 'descricao')
export default function GroupCard({ title, table, field = 'nome' }) {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Busca os dados ao carregar
  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    // Busca e ordena pelo campo de texto
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(field, { ascending: true });
    
    if (!error) setItems(data);
  };

  // 2. Adicionar Item
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    setLoading(true);
    const { error } = await supabase
      .from(table)
      .insert([{ [field]: newItem }]); // [field] usa o valor da variável como chave

    if (error) {
      alert('Erro ao salvar: ' + error.message);
    } else {
      setNewItem('');
      fetchItems(); // Recarrega a lista
    }
    setLoading(false);
  };

  // 3. Excluir Item
  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente excluir este item?')) return;

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) alert('Erro ao excluir: ' + error.message);
    else fetchItems();
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100 flex flex-col h-[400px]">
      <h3 className="text-primary font-bold text-lg mb-4 border-b pb-2">{title}</h3>

      {/* Input de Adicionar */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input 
          type="text"
          placeholder="Novo item..."
          className="flex-1 border rounded p-2 text-sm focus:outline-none focus:border-secondary"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          disabled={loading}
        />
        <button 
          type="submit" 
          disabled={loading}
          className="text-secondary hover:text-primary disabled:opacity-50"
        >
          <PlusCircle size={28} />
        </button>
      </form>

      {/* Lista de Itens com Scroll */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-2">
        {items.map(item => (
          <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded hover:bg-blue-50 transition-colors group">
            <span className="text-sm font-medium text-gray-700">{item[field]}</span>
            
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Botão Excluir */}
              <button 
                onClick={() => handleDelete(item.id)}
                className="text-red-400 hover:text-red-600 bg-white rounded-full p-1 shadow-sm"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-gray-400 text-center text-sm italic mt-10">Nenhum item cadastrado.</p>
        )}
      </div>
    </div>
  );
}