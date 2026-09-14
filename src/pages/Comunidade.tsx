import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface AffiliateLink {
  id: string;
  platform: 'mercadolivre' | 'aliexpress';
  productName: string;
  url: string;
  commission?: number;
}

export function Comunidade() {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLink, setEditingLink] = useState<AffiliateLink | null>(null);
  const [formData, setFormData] = useState({
    platform: 'mercadolivre' as 'mercadolivre' | 'aliexpress',
    productName: '',
    url: '',
    commission: '',
  });

  useEffect(() => {
    loadLinks();
  }, []);

  async function loadLinks() {
    try {
      const data = await api.community.getAffiliates();
      setLinks(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load affiliate links:', error);
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log('Save affiliate link:', formData);
    setShowForm(false);
    setEditingLink(null);
    resetForm();
  }

  function handleEdit(link: AffiliateLink) {
    setEditingLink(link);
    setFormData({
      platform: link.platform,
      productName: link.productName,
      url: link.url,
      commission: String(link.commission || ''),
    });
    setShowForm(true);
  }

  function handleDelete(id: string) {
    if (confirm('Excluir este link?')) {
      console.log('Delete link:', id);
    }
  }

  function resetForm() {
    setFormData({ platform: 'mercadolivre', productName: '', url: '', commission: '' });
  }

  const getPlatformIcon = (platform: string) => platform === 'mercadolivre' ? '🟡' : '🔴';
  const getPlatformName = (platform: string) => platform === 'mercadolivre' ? 'Mercado Livre' : 'AliExpress';

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">🤝 Links de Afiliado</h1>
          <p className="text-gray-500">Gerencie links para a comunidade (ML/AliExpress)</p>
        </div>
        <button
          onClick={() => { setEditingLink(null); resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-green-500 text-white rounded font-medium hover:bg-green-600"
        >
          + Novo Link
        </button>
      </div>

      {/* Info box */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">Como funciona:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Cliente da comunidade pede produto que não temos</li>
          <li>• Lia envia seu link de afiliado (ML ou AliExpress)</li>
          <li>• Cliente compra pelo link → você ganha comissão</li>
          <li>• Você NÃO precisa entregar o produto</li>
        </ul>
      </div>

      {/* Links list */}
      <div className="bg-surface rounded-lg shadow border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : links.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">🔗</div>
            <p>Nenhum link de afiliado cadastrado</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Adicionar primeiro link
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {links.map(link => (
              <div key={link.id} className="p-4 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className="text-2xl">{getPlatformIcon(link.platform)}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{link.productName}</h3>
                      <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">
                        {getPlatformName(link.platform)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-1">{link.url}</p>
                    {link.commission && (
                      <p className="text-sm text-green-600 mt-1">
                        Comissão: {link.commission.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Testar
                  </a>
                  <button
                    onClick={() => handleEdit(link)}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-surface rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">{editingLink ? 'Editar Link' : 'Novo Link de Afiliado'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Plataforma</label>
                <select
                  value={formData.platform}
                  onChange={e => setFormData({ ...formData, platform: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="mercadolivre">🟡 Mercado Livre</option>
                  <option value="aliexpress">🔴 AliExpress</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nome do produto</label>
                <input
                  type="text"
                  value={formData.productName}
                  onChange={e => setFormData({ ...formData, productName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">URL do afiliado</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={e => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Comissão estimada (opcional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.commission}
                  onChange={e => setFormData({ ...formData, commission: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ex: 5.00"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingLink(null); }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}