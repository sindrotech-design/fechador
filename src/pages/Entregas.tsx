import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatCurrency, format } from '../utils/date';

interface Delivery {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  items: Array<{ product: { name: string; price: number }; quantity: number }>;
  total: number;
  status: 'pending' | 'ready' | 'out_for_delivery' | 'delivered';
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  ready: 'Pronto',
  out_for_delivery: 'Saiu para entrega',
  delivered: 'Entregue',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  ready: 'bg-blue-100 text-blue-700',
  out_for_delivery: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
};

export function Entregas() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'ready' | 'out_for_delivery' | 'delivered'>('all');
  const filterOptions = ['all', 'pending', 'ready', 'out_for_delivery', 'delivered'] as const;
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadDeliveries();
  }, []);

  async function loadDeliveries() {
    try {
      const data = await api.deliveries.getAll();
      setDeliveries(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load deliveries:', error);
      setLoading(false);
    }
  }

  const filteredDeliveries = deliveries.filter(d => 
    filter === 'all' || d.status === filter
  );

  async function handleStatusChange(deliveryId: string, newStatus: Delivery['status']) {
    setUpdating(deliveryId);
    try {
      await api.deliveries.updateStatus(deliveryId, newStatus);
      setDeliveries(prev => prev.map(d => 
        d.id === deliveryId ? { ...d, status: newStatus, updatedAt: new Date().toISOString() } : d
      ));
    } catch (error) {
      console.error('Failed to update delivery:', error);
      alert('Erro ao atualizar status');
    } finally {
      setUpdating(null);
    }
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${format(date, 'dd/MM')} ${format(date, 'HH:mm')}`;
  };

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">📦 Fila de Entregas</h1>
          <p className="text-gray-500">Gerencie entregas e retiradas</p>
        </div>
        <div className="flex gap-2">
          {filterOptions.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                filter === f
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'Todas' : STATUS_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pendentes', count: deliveries.filter(d => d.status === 'pending').length, color: 'bg-yellow-100 text-yellow-700' },
          { label: 'Prontos', count: deliveries.filter(d => d.status === 'ready').length, color: 'bg-blue-100 text-blue-700' },
          { label: 'Em entrega', count: deliveries.filter(d => d.status === 'out_for_delivery').length, color: 'bg-purple-100 text-purple-700' },
          { label: 'Entregues', count: deliveries.filter(d => d.status === 'delivered').length, color: 'bg-green-100 text-green-700' },
        ].map(stat => (
          <div key={stat.label} className="p-4 bg-surface rounded-lg shadow border border-gray-100">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold {stat.color}">{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Deliveries list */}
      <div className="bg-surface rounded-lg shadow border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">📦</div>
            <p>Nenhuma entrega encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Cliente</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Pedido</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Itens</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Endereço</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Total</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDeliveries.map(delivery => (
                  <tr key={delivery.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono">{delivery.id}</td>
                    <td className="px-4 py-3 text-sm">
                      <p className="font-medium">{delivery.customerName}</p>
                      <p className="text-gray-500">{delivery.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">{delivery.orderId}</td>
                    <td className="px-4 py-3 text-sm">
                      {delivery.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <span>{item.product.name}</span>
                          <span className="text-gray-400">x{item.quantity}</span>
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {delivery.address === 'Retirada na loja' ? (
                        <span className="text-green-600 font-medium">🏪 Retirada</span>
                      ) : (
                        <span className="truncate block max-w-xs">{delivery.address}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{formatCurrency(delivery.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[delivery.status]}`}>
                        {STATUS_LABELS[delivery.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {delivery.status !== 'ready' && (
                          <button
                            onClick={() => handleStatusChange(delivery.id, 'ready')}
                            disabled={updating === delivery.id}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                          >
                            Pronto
                          </button>
                        )}
                        {delivery.status === 'ready' && (
                          <button
                            onClick={() => handleStatusChange(delivery.id, 'out_for_delivery')}
                            disabled={updating === delivery.id}
                            className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50"
                          >
                            Saiu
                          </button>
                        )}
                        {delivery.status === 'out_for_delivery' && (
                          <button
                            onClick={() => handleStatusChange(delivery.id, 'delivered')}
                            disabled={updating === delivery.id}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                          >
                            Entregue
                          </button>
                        )}
                        {delivery.status === 'delivered' && (
                          <span className="px-2 py-1 text-xs text-gray-400">✓</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}