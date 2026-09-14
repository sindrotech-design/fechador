import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { format } from '../utils/date';

interface Event {
  id: string;
  name: string;
  date: string;
  description: string;
  active: boolean;
}

export function Eventos() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
    active: true,
  });

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const data = await api.events.getAll();
      setEvents(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load events:', error);
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // In real app, call API to create/update
    console.log('Save event:', formData);
    setShowForm(false);
    setEditingEvent(null);
    resetForm();
  }

  function handleEdit(event: Event) {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      date: event.date,
      description: event.description,
      active: event.active,
    });
    setShowForm(true);
  }

  function handleDelete(id: string) {
    if (confirm('Excluir este evento?')) {
      // Call API
      console.log('Delete event:', id);
    }
  }

  function resetForm() {
    setFormData({ name: '', date: '', description: '', active: true });
  }

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">🎉 Eventos do Dia</h1>
          <p className="text-gray-500">Promoções e eventos para a Lia anunciar</p>
        </div>
        <button
          onClick={() => { setEditingEvent(null); resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-green-500 text-white rounded font-medium hover:bg-green-600"
        >
          + Novo Evento
        </button>
      </div>

      {/* Today's event banner */}
      <div className="mb-6 p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg">
        <h3 className="text-lg font-bold">Evento de hoje: {today}</h3>
        {events.filter(e => e.active && e.date === today).map(event => (
          <div key={event.id} className="mt-2">
            <p className="font-medium">📢 {event.name}</p>
            <p className="text-sm opacity-90">{event.description}</p>
          </div>
        ))}
        {events.filter(e => e.active && e.date === today).length === 0 && (
          <p className="mt-2 opacity-80">Nenhum evento ativo para hoje. Crie um acima!</p>
        )}
      </div>

      {/* Events list */}
      <div className="bg-surface rounded-lg shadow border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">📅</div>
            <p>Nenhum evento cadastrado</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Criar primeiro evento
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {events.map(event => (
              <div key={event.id} className="p-4 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">{event.name}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded ${event.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {event.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                  <p className="text-xs text-gray-400 mt-1">Data: {event.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(event)}
                    className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(event.id)}
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
            <h3 className="text-lg font-bold mb-4">{editingEvent ? 'Editar Evento' : 'Novo Evento'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome do evento</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Data</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={e => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-green-500 rounded"
                />
                <label htmlFor="active" className="text-sm">Evento ativo</label>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingEvent(null); }}
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