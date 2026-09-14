import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatCurrency } from '../utils/date';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl?: string;
  category: 'site' | 'internal';
  description?: string;
}

export function Estoque() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'site' | 'internal'>('all');
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [newStock, setNewStock] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const data = await api.products.getAll();
      setProducts(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load products:', error);
      setLoading(false);
    }
  }

  const filteredProducts = products.filter(p => 
    activeTab === 'all' || p.category === activeTab
  );

  async function handleStockUpdate(productId: string) {
    const quantity = parseInt(newStock, 10);
    if (isNaN(quantity) || quantity < 0) return;

    try {
      await api.products.updateStock(productId, quantity, 'subtract');
      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, stock: p.stock - quantity } : p
      ));
      setEditingStock(null);
      setNewStock('');
    } catch (error) {
      console.error('Failed to update stock:', error);
      alert('Erro ao atualizar estoque');
    }
  }

  async function handleStockAdd(productId: string) {
    const quantity = parseInt(newStock, 10);
    if (isNaN(quantity) || quantity < 0) return;

    try {
      await api.products.updateStock(productId, quantity, 'add');
      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, stock: p.stock + quantity } : p
      ));
      setEditingStock(null);
      setNewStock('');
    } catch (error) {
      console.error('Failed to add stock:', error);
      alert('Erro ao adicionar estoque');
    }
  }

  async function handleSyncStock() {
    setSyncing(true);
    try {
      await api.products.syncStock();
      await loadProducts();
      alert('Estoque sincronizado com a planilha!');
    } catch (error) {
      console.error('Failed to sync stock:', error);
      alert('Erro ao sincronizar estoque');
    } finally {
      setSyncing(false);
    }
  }

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Sem estoque', class: 'bg-red-100 text-red-700' };
    if (stock <= 3) return { label: 'Baixo', class: 'bg-yellow-100 text-yellow-700' };
    return { label: 'OK', class: 'bg-green-100 text-green-700' };
  };

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">📋 Estoque</h1>
          <p className="text-gray-500">Gerencie produtos e quantidades</p>
        </div>
        <button
          onClick={handleSyncStock}
          disabled={syncing}
          className="px-4 py-2 bg-blue-500 text-white rounded font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
        >
          {syncing ? 'Sincronizando...' : '🔄 Sincronizar Planilha'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {[
          { key: 'all', label: 'Todos', count: products.length },
          { key: 'site', label: 'Site 🌐', count: products.filter(p => p.category === 'site').length },
          { key: 'internal', label: 'Interno 📋', count: products.filter(p => p.category === 'internal').length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 border-b-2 font-medium text-sm transition ${
              activeTab === tab.key
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label} <span className="ml-2 text-xs text-gray-400">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Products grid */}
      <div className="bg-surface rounded-lg shadow border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">📦</div>
            <p>Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredProducts.map(product => {
              const status = getStockStatus(product.stock);
              const isEditing = editingStock === product.id;

              return (
                <div key={product.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Product info */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-16 h-16 rounded-lg object-cover bg-gray-100"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{product.name}</h3>
                          <span className={`px-2 py-0.5 text-xs rounded ${status.class}`}>
                            {status.label}
                          </span>
                          <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">
                            {product.category === 'site' ? '🌐 Site' : '📋 Interno'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate mt-1">{product.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="font-medium text-green-600">{formatCurrency(product.price)}</span>
                          <span className="text-gray-500">Estoque: <strong>{product.stock}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 sm:ml-auto">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={newStock}
                            onChange={e => setNewStock(e.target.value)}
                            placeholder="Qtd"
                            className="w-20 px-2 py-1 border border-gray-200 rounded text-sm"
                            min="0"
                          />
                          <button
                            onClick={() => handleStockUpdate(product.id)}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Baixar
                          </button>
                          <button
                            onClick={() => handleStockAdd(product.id)}
                            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Adicionar
                          </button>
                          <button
                            onClick={() => setEditingStock(null)}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingStock(product.id); setNewStock('1'); }}
                          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          📝 Ajustar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm">
        <h4 className="font-medium mb-2">Legenda de status:</h4>
        <div className="flex flex-wrap gap-4">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500"></span> OK (4+)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500"></span> Baixo (1-3)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"></span> Sem estoque (0)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500"></span> 🌐 No site</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-500"></span> 📋 Só interno</span>
        </div>
      </div>
    </div>
  );
}