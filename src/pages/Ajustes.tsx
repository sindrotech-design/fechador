import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Settings {
  mercadoPagoAccessToken: string;
  mercadoPagoPublicKey: string;
  appsScriptUrl: string;
  storePixKey: string;
  deliveryFee: number;
  storeName: string;
  storeWhatsApp: string;
  storeCity: string;
  storeState: string;
  storeSite: string;
}

export function Ajustes() {
  const [settings, setSettings] = useState<Settings>({
    mercadoPagoAccessToken: '',
    mercadoPagoPublicKey: '',
    appsScriptUrl: '',
    storePixKey: 'sindrotech@gmail.com',
    deliveryFee: 6.99,
    storeName: 'SindroTech',
    storeWhatsApp: '5565981283108',
    storeCity: 'Cuiabá',
    storeState: 'MT',
    storeSite: 'https://www.sindrotech.com.br',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSheets, setTestingSheets] = useState(false);
  const [testingMP, setTestingMP] = useState(false);
  const [testResults, setTestResults] = useState<{ sheets?: string; mp?: string }>({});
  const [whatsappConnected, setWhatsAppConnected] = useState(false);
  const [showMPToken, setShowMPToken] = useState(false);

  useEffect(() => {
    loadSettings();
    checkWhatsAppStatus();
  }, []);

  async function loadSettings() {
    try {
      const data = await api.settings.get();
      setSettings(prev => ({ ...prev, ...data }));
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function checkWhatsAppStatus() {
    try {
      const { connected } = await api.whatsapp.getStatus();
      setWhatsAppConnected(connected);
    } catch (error) {
      setWhatsAppConnected(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.settings.update(settings);
      alert('Configurações salvas!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSheets() {
    setTestingSheets(true);
    setTestResults(prev => ({ ...prev, sheets: 'Testando...' }));
    try {
      const result = await api.settings.testSheets();
      setTestResults(prev => ({ 
        ...prev, 
        sheets: result.success ? '✅ Conexão OK!' : `❌ ${result.message}` 
      }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, sheets: '❌ Erro ao testar' }));
    } finally {
      setTestingSheets(false);
    }
  }

  async function handleTestMercadoPago() {
    setTestingMP(true);
    setTestResults(prev => ({ ...prev, mp: 'Testando...' }));
    try {
      const result = await api.settings.testMercadoPago();
      setTestResults(prev => ({ 
        ...prev, 
        mp: result.success ? '✅ Token válido!' : `❌ ${result.message}` 
      }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, mp: '❌ Erro ao testar' }));
    } finally {
      setTestingMP(false);
    }
  }

  async function handleReconnectWhatsApp() {
    try {
      await api.whatsapp.reconnect();
      setWhatsAppConnected(false);
      alert('Reconectando... Verifique o QR code no terminal do servidor.');
    } catch (error) {
      alert('Erro ao reconectar');
    }
  }

  const maskToken = (token: string) => {
    if (!token) return 'Não configurado';
    if (showMPToken) return token;
    return token.slice(0, 8) + '...' + token.slice(-8);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="h-full max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">⚙️ Ajustes</h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* WhatsApp Section */}
        <section className="bg-surface rounded-lg shadow border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            📱 WhatsApp da Lia
            <span className={`w-2 h-2 rounded-full ${whatsappConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-sm text-gray-500 ml-1">
              {whatsappConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            A Lia atende no número <strong>65 98128-3108</strong>. 
            Para conectar, rode o servidor e escaneie o QR code no terminal.
          </p>
          <button
            type="button"
            onClick={handleReconnectWhatsApp}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            🔄 Reconectar WhatsApp
          </button>
        </section>

        {/* Mercado Pago Section */}
        <section className="bg-surface rounded-lg shadow border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4">💳 Mercado Pago</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Access Token (Produção)</label>
              <div className="flex gap-2">
                <input
                  type={showMPToken ? 'text' : 'password'}
                  value={settings.mercadoPagoAccessToken}
                  onChange={e => setSettings({ ...settings, mercadoPagoAccessToken: e.target.value })}
                  placeholder="APP_USR-..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowMPToken(!showMPToken)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  {showMPToken ? '🙈' : '👁️'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Token atual: {maskToken(settings.mercadoPagoAccessToken)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Public Key</label>
              <input
                type="text"
                value={settings.mercadoPagoPublicKey}
                onChange={e => setSettings({ ...settings, mercadoPagoPublicKey: e.target.value })}
                placeholder="APP_USR-..."
                className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              type="button"
              onClick={handleTestMercadoPago}
              disabled={testingMP}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
            >
              {testingMP ? 'Testando...' : '🧪 Testar Conexão'}
            </button>
            {testResults.mp && <p className="text-sm">{testResults.mp}</p>}
          </div>
        </section>

        {/* Google Sheets Section */}
        <section className="bg-surface rounded-lg shadow border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4">📊 Google Sheets (SindroFinanceiro)</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">URL do Apps Script</label>
              <input
                type="url"
                value={settings.appsScriptUrl}
                onChange={e => setSettings({ ...settings, appsScriptUrl: e.target.value })}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Planilha ID: <code className="text-gray-700">1D4KLUIg9iQz0OPuaQTnGWVEs618W7AU11XOPx3A3BXE</code>
              </p>
            </div>
            <button
              type="button"
              onClick={handleTestSheets}
              disabled={testingSheets}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              {testingSheets ? 'Testando...' : '🧪 Testar Conexão'}
            </button>
            {testResults.sheets && <p className="text-sm">{testResults.sheets}</p>}
          </div>
        </section>

        {/* Store Settings Section */}
        <section className="bg-surface rounded-lg shadow border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4">🏪 Configurações da Loja</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome da loja</label>
              <input
                type="text"
                value={settings.storeName}
                onChange={e => setSettings({ ...settings, storeName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">WhatsApp da loja</label>
              <input
                type="text"
                value={settings.storeWhatsApp}
                onChange={e => setSettings({ ...settings, storeWhatsApp: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Chave Pix</label>
              <input
                type="text"
                value={settings.storePixKey}
                onChange={e => setSettings({ ...settings, storePixKey: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Taxa de entrega</label>
              <input
                type="number"
                step="0.01"
                value={settings.deliveryFee}
                onChange={e => setSettings({ ...settings, deliveryFee: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cidade</label>
              <input
                type="text"
                value={settings.storeCity}
                onChange={e => setSettings({ ...settings, storeCity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estado</label>
              <input
                type="text"
                value={settings.storeState}
                onChange={e => setSettings({ ...settings, storeState: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Site da loja</label>
              <input
                type="url"
                value={settings.storeSite}
                onChange={e => setSettings({ ...settings, storeSite: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </section>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : '💾 Salvar Todas as Configurações'}
          </button>
        </div>
      </form>
    </div>
  );
}